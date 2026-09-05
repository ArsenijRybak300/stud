from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_db, require_admin
from app.models.group import StudyGroup
from app.models.lesson import Lesson, LessonCancellation
from app.models.semester import Semester
from app.models.user import User, UserRole
from app.schemas.lesson import (
    CancellationCreate,
    CancellationRead,
    LessonCreate,
    LessonRead,
    LessonUpdate,
)

router = APIRouter(prefix="/lessons", tags=["Расписание"])


def serialize_lesson(lesson: Lesson) -> LessonRead:
    return LessonRead(
        id=lesson.id,
        group_id=lesson.group_id,
        semester_id=lesson.semester_id,
        subject=lesson.subject,
        teacher=lesson.teacher,
        room=lesson.room,
        lesson_type=lesson.lesson_type,
        weekday=lesson.weekday,
        start_time=lesson.start_time,
        end_time=lesson.end_time,
        week_type=lesson.week_type,
        notes=lesson.notes,
        is_active=lesson.is_active,
        created_by_id=lesson.created_by_id,
        created_at=lesson.created_at,
        group_code=lesson.group.code if lesson.group else None,
        semester_name=lesson.semester.name if lesson.semester else None,
    )


def lesson_stmt():
    return select(Lesson).options(selectinload(Lesson.group), selectinload(Lesson.semester))


def validate_refs(db: Session, group_id: int, semester_id: int) -> None:
    if db.get(StudyGroup, group_id) is None:
        raise HTTPException(status_code=422, detail="Учебная группа не найдена")
    if db.get(Semester, semester_id) is None:
        raise HTTPException(status_code=422, detail="Семестр не найден")


@router.get("", response_model=list[LessonRead])
def list_lessons(
    group_id: int | None = Query(default=None),
    semester_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.student:
        if current_user.group_id is None:
            return []
        group_id = current_user.group_id
    stmt = lesson_stmt().where(Lesson.is_active.is_(True))
    if group_id is not None:
        stmt = stmt.where(Lesson.group_id == group_id)
    if semester_id is not None:
        stmt = stmt.where(Lesson.semester_id == semester_id)
    stmt = stmt.order_by(Lesson.weekday, Lesson.start_time)
    return [serialize_lesson(item) for item in db.scalars(stmt).all()]


@router.post("", response_model=LessonRead, status_code=status.HTTP_201_CREATED)
def create_lesson(payload: LessonCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    validate_refs(db, payload.group_id, payload.semester_id)
    lesson = Lesson(**payload.model_dump(), created_by_id=admin.id)
    db.add(lesson)
    db.commit()
    lesson = db.scalar(lesson_stmt().where(Lesson.id == lesson.id))
    assert lesson is not None
    return serialize_lesson(lesson)


@router.patch("/{lesson_id}", response_model=LessonRead)
def update_lesson(lesson_id: int, payload: LessonUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    data = payload.model_dump(exclude_unset=True)
    group_id = data.get("group_id", lesson.group_id)
    semester_id = data.get("semester_id", lesson.semester_id)
    validate_refs(db, group_id, semester_id)
    start = data.get("start_time", lesson.start_time)
    end = data.get("end_time", lesson.end_time)
    if end <= start:
        raise HTTPException(status_code=422, detail="Время окончания должно быть позже начала")
    for field, value in data.items():
        setattr(lesson, field, value)
    db.commit()
    lesson = db.scalar(lesson_stmt().where(Lesson.id == lesson.id))
    assert lesson is not None
    return serialize_lesson(lesson)


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    db.delete(lesson)
    db.commit()


@router.post("/{lesson_id}/cancellations", response_model=CancellationRead, status_code=status.HTTP_201_CREATED)
def cancel_lesson_occurrence(
    lesson_id: int,
    payload: CancellationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Занятие не найдено")
    if payload.lesson_date.weekday() != lesson.weekday:
        raise HTTPException(status_code=422, detail="Дата отмены не соответствует дню недели занятия")
    existing = db.scalar(
        select(LessonCancellation).where(
            LessonCancellation.lesson_id == lesson_id,
            LessonCancellation.lesson_date == payload.lesson_date,
        )
    )
    if existing:
        existing.reason = payload.reason.strip()
        existing.created_by_id = admin.id
        db.commit()
        db.refresh(existing)
        return existing
    cancellation = LessonCancellation(
        lesson_id=lesson_id,
        lesson_date=payload.lesson_date,
        reason=payload.reason.strip(),
        created_by_id=admin.id,
    )
    db.add(cancellation)
    db.commit()
    db.refresh(cancellation)
    return cancellation


@router.delete("/cancellations/{cancellation_id}", status_code=status.HTTP_204_NO_CONTENT)
def restore_lesson_occurrence(cancellation_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    cancellation = db.get(LessonCancellation, cancellation_id)
    if cancellation is None:
        raise HTTPException(status_code=404, detail="Отмена не найдена")
    db.delete(cancellation)
    db.commit()
