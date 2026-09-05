from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_db, require_admin
from app.core.config import settings
from app.models.group import StudyGroup
from app.models.task import (
    SubmissionFile,
    Task,
    TaskAttachment,
    TaskComment,
    TaskStatus,
    TaskSubmission,
)
from app.models.user import User, UserRole
from app.schemas.task import (
    CommentCreate,
    CommentRead,
    FileRead,
    SubmissionRead,
    TaskCreate,
    TaskDetail,
    TaskRead,
    TaskUpdate,
)

router = APIRouter(prefix="/tasks", tags=["Задания"])

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".zip", ".rar", ".7z", ".png", ".jpg", ".jpeg",
}


def task_query():
    return select(Task).options(
        selectinload(Task.group),
        selectinload(Task.created_by),
        selectinload(Task.attachments),
        selectinload(Task.submissions).selectinload(TaskSubmission.student),
        selectinload(Task.submissions).selectinload(TaskSubmission.files),
        selectinload(Task.submissions).selectinload(TaskSubmission.comments).selectinload(TaskComment.author),
    )


def attachment_to_schema(item: TaskAttachment) -> FileRead:
    return FileRead(
        id=item.id,
        original_name=item.original_name,
        content_type=item.content_type,
        size_bytes=item.size_bytes,
        created_at=item.created_at,
        download_url=f"{settings.api_prefix}/tasks/attachments/{item.id}/download",
    )


def submission_file_to_schema(item: SubmissionFile) -> FileRead:
    return FileRead(
        id=item.id,
        original_name=item.original_name,
        content_type=item.content_type,
        size_bytes=item.size_bytes,
        created_at=item.created_at,
        download_url=f"{settings.api_prefix}/tasks/submission-files/{item.id}/download",
    )


def comment_to_schema(item: TaskComment) -> CommentRead:
    return CommentRead(
        id=item.id,
        author_id=item.author_id,
        author_name=item.author.full_name if item.author else "Администратор",
        text=item.text,
        created_at=item.created_at,
    )


def submission_to_schema(item: TaskSubmission) -> SubmissionRead:
    return SubmissionRead(
        id=item.id,
        task_id=item.task_id,
        student_id=item.student_id,
        student_name=item.student.full_name,
        student_email=item.student.email,
        status=item.status,
        score=item.score,
        started_at=item.started_at,
        submitted_at=item.submitted_at,
        completed_at=item.completed_at,
        updated_at=item.updated_at,
        files=[submission_file_to_schema(file) for file in sorted(item.files, key=lambda x: x.created_at)],
        comments=[comment_to_schema(comment) for comment in sorted(item.comments, key=lambda x: x.created_at)],
    )


def task_to_schema(task: Task, current_user: User, include_submissions: bool = False) -> TaskRead | TaskDetail:
    own = None
    if current_user.role == UserRole.student:
        own = next((item for item in task.submissions if item.student_id == current_user.id), None)
    base = dict(
        id=task.id,
        group_id=task.group_id,
        group_code=task.group.code,
        title=task.title,
        max_score=task.max_score,
        description=task.description,
        subject=task.subject,
        due_at=task.due_at,
        priority=task.priority,
        created_by_id=task.created_by_id,
        created_by_name=task.created_by.full_name,
        created_at=task.created_at,
        updated_at=task.updated_at,
        attachments=[attachment_to_schema(item) for item in sorted(task.attachments, key=lambda x: x.created_at)],
        my_submission=submission_to_schema(own) if own else None,
        submissions_total=len(task.submissions),
        submitted_count=sum(item.status == TaskStatus.submitted for item in task.submissions),
        completed_count=sum(item.status == TaskStatus.completed for item in task.submissions),
    )
    if include_submissions:
        return TaskDetail(
            **base,
            submissions=[submission_to_schema(item) for item in sorted(task.submissions, key=lambda x: x.student.full_name)],
        )
    return TaskRead(**base)


def load_task(db: Session, task_id: int) -> Task:
    task = db.scalar(task_query().where(Task.id == task_id))
    if task is None:
        raise HTTPException(status_code=404, detail="Задание не найдено")
    return task


def ensure_task_access(task: Task, user: User) -> None:
    if user.role == UserRole.student and task.group_id != user.group_id:
        raise HTTPException(status_code=403, detail="Задание относится к другой группе")


def get_or_create_submission(db: Session, task: Task, student: User) -> TaskSubmission:
    submission = db.scalar(
        select(TaskSubmission).where(
            TaskSubmission.task_id == task.id,
            TaskSubmission.student_id == student.id,
        )
    )
    if submission is None:
        submission = TaskSubmission(task_id=task.id, student_id=student.id, status=TaskStatus.assigned)
        db.add(submission)
        db.commit()
        db.refresh(submission)
    return submission


async def save_upload(file: UploadFile, directory: str) -> tuple[str, str, int, str | None]:
    original = Path(file.filename or "file").name
    extension = Path(original).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail="Этот тип файла не поддерживается")
    data = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if not data:
        raise HTTPException(status_code=422, detail="Файл пуст")
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Размер файла превышает {settings.max_upload_size_mb} МБ")
    target_dir = settings.uploads_path / directory
    target_dir.mkdir(parents=True, exist_ok=True)
    stored = f"{uuid4().hex}{extension}"
    (target_dir / stored).write_bytes(data)
    return original, f"{directory}/{stored}", len(data), file.content_type


def delete_stored_file(stored_name: str) -> None:
    path = settings.uploads_path / stored_name
    if path.exists() and path.is_file():
        path.unlink()


@router.get("", response_model=list[TaskRead])
def list_tasks(
    group_id: int | None = Query(default=None),
    task_status: TaskStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = task_query().order_by(Task.due_at.asc().nullslast(), Task.created_at.desc())
    if current_user.role == UserRole.student:
        if current_user.group_id is None:
            return []
        stmt = stmt.where(Task.group_id == current_user.group_id)
    elif group_id is not None:
        stmt = stmt.where(Task.group_id == group_id)
    tasks = list(db.scalars(stmt).unique().all())
    if current_user.role == UserRole.student:
        changed = False
        for task in tasks:
            if not any(item.student_id == current_user.id for item in task.submissions):
                db.add(TaskSubmission(task_id=task.id, student_id=current_user.id, status=TaskStatus.assigned))
                changed = True
        if changed:
            db.commit()
            tasks = list(db.scalars(stmt).unique().all())
        if task_status is not None:
            tasks = [
                task for task in tasks
                if any(item.student_id == current_user.id and item.status == task_status for item in task.submissions)
            ]
    return [task_to_schema(task, current_user) for task in tasks]


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    group = db.get(StudyGroup, payload.group_id)
    if group is None:
        raise HTTPException(status_code=422, detail="Учебная группа не найдена")
    task = Task(**payload.model_dump(), created_by_id=admin.id)
    db.add(task)
    db.flush()
    students = list(
        db.scalars(
            select(User).where(
                User.group_id == group.id,
                User.role == UserRole.student,
                User.is_active.is_(True),
            )
        ).all()
    )
    for student in students:
        db.add(TaskSubmission(task_id=task.id, student_id=student.id, status=TaskStatus.assigned))
    db.commit()
    return task_to_schema(load_task(db, task.id), admin)


@router.get("/{task_id}", response_model=TaskDetail)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = load_task(db, task_id)
    ensure_task_access(task, current_user)
    if current_user.role == UserRole.student:
        get_or_create_submission(db, task, current_user)
        task = load_task(db, task_id)
    return task_to_schema(task, current_user, include_submissions=current_user.role == UserRole.admin)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    task = load_task(db, task_id)
    data = payload.model_dump(exclude_unset=True)
    if "group_id" in data and db.get(StudyGroup, data["group_id"]) is None:
        raise HTTPException(status_code=422, detail="Учебная группа не найдена")
    for field, value in data.items():
        setattr(task, field, value)
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    return task_to_schema(load_task(db, task.id), admin)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    task = load_task(db, task_id)
    for attachment in task.attachments:
        delete_stored_file(attachment.stored_name)
    for submission in task.submissions:
        for file in submission.files:
            delete_stored_file(file.stored_name)
    db.delete(task)
    db.commit()


@router.post("/{task_id}/attachments", response_model=FileRead, status_code=status.HTTP_201_CREATED)
async def upload_task_attachment(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    task = load_task(db, task_id)
    original, stored, size, content_type = await save_upload(file, "task_materials")
    attachment = TaskAttachment(
        task_id=task.id,
        original_name=original,
        stored_name=stored,
        content_type=content_type,
        size_bytes=size,
        uploaded_by_id=admin.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment_to_schema(attachment)


@router.post("/{task_id}/start", response_model=SubmissionRead)
def start_task(task_id: int, db: Session = Depends(get_db), student: User = Depends(get_current_user)):
    if student.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Действие доступно только студенту")
    task = load_task(db, task_id)
    ensure_task_access(task, student)
    submission = get_or_create_submission(db, task, student)
    if submission.status == TaskStatus.completed:
        raise HTTPException(status_code=409, detail="Задание уже выполнено")
    if submission.status == TaskStatus.submitted:
        raise HTTPException(status_code=409, detail="Задание уже отправлено на проверку")
    submission.status = TaskStatus.in_progress
    submission.started_at = submission.started_at or datetime.now(timezone.utc)
    db.commit()
    return submission_to_schema(load_task(db, task_id).submissions[[x.student_id for x in load_task(db, task_id).submissions].index(student.id)])


@router.post("/{task_id}/submission-files", response_model=FileRead, status_code=status.HTTP_201_CREATED)
async def upload_submission_file(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    student: User = Depends(get_current_user),
):
    if student.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Действие доступно только студенту")
    task = load_task(db, task_id)
    ensure_task_access(task, student)
    submission = get_or_create_submission(db, task, student)
    if submission.status in {TaskStatus.submitted, TaskStatus.completed}:
        raise HTTPException(status_code=409, detail="После отправки изменять файлы нельзя")
    original, stored, size, content_type = await save_upload(file, "submissions")
    item = SubmissionFile(
        submission_id=submission.id,
        original_name=original,
        stored_name=stored,
        content_type=content_type,
        size_bytes=size,
        uploaded_by_id=student.id,
    )
    submission.status = TaskStatus.in_progress
    submission.started_at = submission.started_at or datetime.now(timezone.utc)
    db.add(item)
    db.commit()
    db.refresh(item)
    return submission_file_to_schema(item)


@router.post("/{task_id}/submit", response_model=SubmissionRead)
def submit_task(task_id: int, db: Session = Depends(get_db), student: User = Depends(get_current_user)):
    if student.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Действие доступно только студенту")
    task = load_task(db, task_id)
    ensure_task_access(task, student)
    submission = get_or_create_submission(db, task, student)
    file_count = db.scalar(select(func.count(SubmissionFile.id)).where(SubmissionFile.submission_id == submission.id)) or 0
    if file_count == 0:
        raise HTTPException(status_code=422, detail="Сначала прикрепите файл с выполненным заданием")
    if submission.status == TaskStatus.completed:
        raise HTTPException(status_code=409, detail="Задание уже выполнено")
    submission.status = TaskStatus.submitted
    submission.submitted_at = datetime.now(timezone.utc)
    db.commit()
    refreshed = load_task(db, task_id)
    own = next(item for item in refreshed.submissions if item.student_id == student.id)
    return submission_to_schema(own)


@router.post("/submissions/{submission_id}/complete", response_model=SubmissionRead)
def complete_submission(submission_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    submission = db.get(TaskSubmission, submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Ответ студента не найден")
    if submission.status != TaskStatus.submitted:
        raise HTTPException(status_code=409, detail="Сначала студент должен отправить работу")
    submission.status = TaskStatus.completed
    submission.completed_at = datetime.now(timezone.utc)
    db.commit()
    task = load_task(db, submission.task_id)
    refreshed = next(item for item in task.submissions if item.id == submission_id)
    return submission_to_schema(refreshed)


@router.post("/submissions/{submission_id}/score", response_model=SubmissionRead)
def set_score(submission_id: int, score: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    submission = db.get(TaskSubmission, submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Ответ студента не найден")
    task = db.get(Task, submission.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задание не найдено")
    if score < 0 or score > task.max_score:
        raise HTTPException(status_code=422, detail=f"Оценка должна быть от 0 до {task.max_score}")
    submission.score = score
    db.commit()
    db.refresh(submission)
    return submission_to_schema(submission)


@router.post("/submissions/{submission_id}/reopen", response_model=SubmissionRead)
def reopen_submission(submission_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    submission = db.get(TaskSubmission, submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Ответ студента не найден")
    submission.status = TaskStatus.in_progress
    submission.completed_at = None
    submission.submitted_at = None
    submission.started_at = submission.started_at or datetime.now(timezone.utc)
    db.commit()
    task = load_task(db, submission.task_id)
    refreshed = next(item for item in task.submissions if item.id == submission_id)
    return submission_to_schema(refreshed)


@router.post("/submissions/{submission_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def add_comment(
    submission_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    submission = db.get(TaskSubmission, submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Ответ студента не найден")
    comment = TaskComment(submission_id=submission.id, author_id=admin.id, text=payload.text.strip())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    comment.author = admin
    return comment_to_schema(comment)


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.get(TaskAttachment, attachment_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Файл не найден")
    task = db.get(Task, item.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задание не найдено")
    ensure_task_access(task, current_user)
    path = settings.uploads_path / item.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Файл отсутствует на диске")
    return FileResponse(path, filename=item.original_name, media_type=item.content_type)


@router.get("/submission-files/{file_id}/download")
def download_submission_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.get(SubmissionFile, file_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Файл не найден")
    submission = db.get(TaskSubmission, item.submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Ответ не найден")
    if current_user.role == UserRole.student and submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому файлу")
    path = settings.uploads_path / item.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Файл отсутствует на диске")
    return FileResponse(path, filename=item.original_name, media_type=item.content_type)
