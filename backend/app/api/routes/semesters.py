from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.group import StudyGroup
from app.models.lesson import Lesson
from app.models.semester import Semester
from app.models.user import User
from app.schemas.semester import CopyScheduleRequest, SemesterCreate, SemesterRead, SemesterUpdate

router = APIRouter(prefix="/semesters", tags=["Семестры"])


@router.get("", response_model=list[SemesterRead])
def list_semesters(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return list(db.scalars(select(Semester).order_by(Semester.starts_on.desc())).all())


@router.post("", response_model=SemesterRead, status_code=status.HTTP_201_CREATED)
def create_semester(payload: SemesterCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    semester = Semester(**payload.model_dump())
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester


@router.patch("/{semester_id}", response_model=SemesterRead)
def update_semester(semester_id: int, payload: SemesterUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    semester = db.get(Semester, semester_id)
    if semester is None:
        raise HTTPException(status_code=404, detail="Семестр не найден")
    data = payload.model_dump(exclude_unset=True)
    starts = data.get("starts_on", semester.starts_on)
    ends = data.get("ends_on", semester.ends_on)
    if ends < starts:
        raise HTTPException(status_code=422, detail="Дата окончания раньше даты начала")
    for field, value in data.items():
        setattr(semester, field, value)
    db.commit()
    db.refresh(semester)
    return semester


@router.post("/{source_semester_id}/copy-schedule", status_code=status.HTTP_201_CREATED)
def copy_schedule(
    source_semester_id: int,
    payload: CopyScheduleRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    source = db.get(Semester, source_semester_id)
    target = db.get(Semester, payload.target_semester_id)
    group = db.get(StudyGroup, payload.group_id)
    if source is None or target is None or group is None:
        raise HTTPException(status_code=404, detail="Семестр или группа не найдены")
    lessons = list(db.scalars(select(Lesson).where(Lesson.semester_id == source.id, Lesson.group_id == group.id)).all())
    created = 0
    for item in lessons:
        duplicate = db.scalar(
            select(Lesson).where(
                Lesson.semester_id == target.id,
                Lesson.group_id == group.id,
                Lesson.weekday == item.weekday,
                Lesson.start_time == item.start_time,
                Lesson.subject == item.subject,
            )
        )
        if duplicate:
            continue
        db.add(
            Lesson(
                group_id=group.id,
                semester_id=target.id,
                subject=item.subject,
                teacher=item.teacher,
                room=item.room,
                lesson_type=item.lesson_type,
                weekday=item.weekday,
                start_time=item.start_time,
                end_time=item.end_time,
                week_type=item.week_type,
                notes=item.notes,
                is_active=item.is_active,
                created_by_id=admin.id,
            )
        )
        created += 1
    db.commit()
    return {"created": created}
