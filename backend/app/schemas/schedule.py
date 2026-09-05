from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.lesson import LessonRead


class ScheduleLesson(BaseModel):
    lesson: LessonRead
    date: date
    cancelled: bool = False
    cancellation_id: int | None = None
    cancellation_reason: str | None = None


class ScheduleDay(BaseModel):
    date: date
    weekday: int
    lessons: list[ScheduleLesson]


class WeekSchedule(BaseModel):
    week_start: date
    week_end: date
    group_id: int
    group_code: str
    semester_id: int
    semester_name: str
    days: list[ScheduleDay]


class NextLesson(BaseModel):
    lesson: LessonRead
    starts_at: datetime
    minutes_until: int
