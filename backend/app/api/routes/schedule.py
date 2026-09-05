from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.group import StudyGroup
from app.models.user import User, UserRole
from app.schemas.schedule import NextLesson, WeekSchedule
from app.services.schedule import build_week_schedule, next_lesson_datetime, semester_for_date, serialize_lesson

router = APIRouter(prefix="/schedule", tags=["Расписание по неделям"])


def resolve_group(db: Session, current_user: User, group_id: int | None) -> StudyGroup:
    resolved_id = current_user.group_id if current_user.role == UserRole.student else group_id
    if resolved_id is None:
        raise HTTPException(status_code=422, detail="Необходимо выбрать учебную группу")
    group = db.get(StudyGroup, resolved_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Учебная группа не найдена")
    return group


@router.get("/week", response_model=WeekSchedule)
def week_schedule(
    date_value: date = Query(alias="date"),
    group_id: int | None = Query(default=None),
    semester_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = resolve_group(db, current_user, group_id)
    semester = semester_for_date(db, date_value, semester_id)
    if semester is None:
        raise HTTPException(status_code=404, detail="Для выбранной даты семестр не найден")
    return build_week_schedule(db, group, date_value, semester)


@router.get("/next", response_model=NextLesson | None)
def next_lesson(
    group_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = resolve_group(db, current_user, group_id)
    now = datetime.now(ZoneInfo(settings.app_timezone))
    result = next_lesson_datetime(db, group, now)
    if result is None:
        return None
    lesson, starts_at = result
    return NextLesson(
        lesson=serialize_lesson(lesson),
        starts_at=starts_at,
        minutes_until=max(0, int((starts_at - now).total_seconds() // 60)),
    )
