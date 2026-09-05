from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models.group import StudyGroup
from app.models.lesson import Lesson, LessonCancellation, WeekType
from app.models.semester import Semester
from app.schemas.lesson import LessonRead
from app.schemas.schedule import ScheduleDay, ScheduleLesson, WeekSchedule


def semester_for_date(db: Session, value: date, semester_id: int | None = None) -> Semester | None:
    if semester_id is not None:
        return db.get(Semester, semester_id)
    return db.scalar(
        select(Semester)
        .where(Semester.starts_on <= value, Semester.ends_on >= value, Semester.is_active.is_(True))
        .order_by(Semester.starts_on.desc())
    )


def matches_week_type(week_type: WeekType, semester: Semester, lesson_date: date) -> bool:
    if week_type == WeekType.every:
        return True
    semester_monday = semester.starts_on - timedelta(days=semester.starts_on.weekday())
    current_monday = lesson_date - timedelta(days=lesson_date.weekday())
    academic_week = ((current_monday - semester_monday).days // 7) + 1
    return (week_type == WeekType.odd and academic_week % 2 == 1) or (
        week_type == WeekType.even and academic_week % 2 == 0
    )


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


def build_week_schedule(
    db: Session,
    group: StudyGroup,
    anchor: date,
    semester: Semester,
) -> WeekSchedule:
    week_start = anchor - timedelta(days=anchor.weekday())
    week_end = week_start + timedelta(days=6)
    lessons = list(
        db.scalars(
            select(Lesson)
            .options(selectinload(Lesson.group), selectinload(Lesson.semester))
            .where(
                Lesson.group_id == group.id,
                Lesson.semester_id == semester.id,
                Lesson.is_active.is_(True),
            )
            .order_by(Lesson.weekday, Lesson.start_time)
        ).all()
    )
    cancellations = list(
        db.scalars(
            select(LessonCancellation).where(
                LessonCancellation.lesson_date >= week_start,
                LessonCancellation.lesson_date <= week_end,
                LessonCancellation.lesson_id.in_([item.id for item in lessons] or [-1]),
            )
        ).all()
    )
    cancellation_map = {(item.lesson_id, item.lesson_date): item for item in cancellations}
    days: list[ScheduleDay] = []
    for weekday in range(7):
        current_date = week_start + timedelta(days=weekday)
        day_items: list[ScheduleLesson] = []
        if semester.starts_on <= current_date <= semester.ends_on:
            for lesson in lessons:
                if lesson.weekday != weekday or not matches_week_type(lesson.week_type, semester, current_date):
                    continue
                cancellation = cancellation_map.get((lesson.id, current_date))
                day_items.append(
                    ScheduleLesson(
                        lesson=serialize_lesson(lesson),
                        date=current_date,
                        cancelled=cancellation is not None,
                        cancellation_id=cancellation.id if cancellation else None,
                        cancellation_reason=cancellation.reason if cancellation else None,
                    )
                )
        days.append(ScheduleDay(date=current_date, weekday=weekday, lessons=day_items))
    return WeekSchedule(
        week_start=week_start,
        week_end=week_end,
        group_id=group.id,
        group_code=group.code,
        semester_id=semester.id,
        semester_name=semester.name,
        days=days,
    )


def next_lesson_datetime(db: Session, group: StudyGroup, now: datetime) -> tuple[Lesson, datetime] | None:
    local_now = now.astimezone(ZoneInfo(settings.app_timezone))
    for offset in range(0, 21):
        current_date = local_now.date() + timedelta(days=offset)
        semester = semester_for_date(db, current_date)
        if semester is None:
            continue
        schedule = build_week_schedule(db, group, current_date, semester)
        day = schedule.days[current_date.weekday()]
        for occurrence in day.lessons:
            if occurrence.cancelled:
                continue
            starts_at = datetime.combine(current_date, occurrence.lesson.start_time, tzinfo=ZoneInfo(settings.app_timezone))
            if starts_at > local_now:
                lesson = db.get(Lesson, occurrence.lesson.id)
                if lesson:
                    return lesson, starts_at
    return None
