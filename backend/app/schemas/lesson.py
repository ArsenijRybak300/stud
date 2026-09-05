from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.lesson import WeekType


class LessonBase(BaseModel):
    group_id: int
    semester_id: int
    subject: str = Field(min_length=1, max_length=160)
    teacher: str | None = Field(default=None, max_length=160)
    room: str | None = Field(default=None, max_length=80)
    lesson_type: str | None = Field(default=None, max_length=80)
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    week_type: WeekType = WeekType.every
    notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_time(self):
        if self.end_time <= self.start_time:
            raise ValueError("Время окончания должно быть позже времени начала")
        return self


class LessonCreate(LessonBase):
    pass


class LessonUpdate(BaseModel):
    group_id: int | None = None
    semester_id: int | None = None
    subject: str | None = Field(default=None, min_length=1, max_length=160)
    teacher: str | None = Field(default=None, max_length=160)
    room: str | None = Field(default=None, max_length=80)
    lesson_type: str | None = Field(default=None, max_length=80)
    weekday: int | None = Field(default=None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    week_type: WeekType | None = None
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class LessonRead(LessonBase):
    id: int
    is_active: bool
    created_by_id: int
    created_at: datetime
    group_code: str | None = None
    semester_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CancellationCreate(BaseModel):
    lesson_date: date
    reason: str = Field(min_length=2, max_length=500)


class CancellationRead(BaseModel):
    id: int
    lesson_id: int
    lesson_date: date
    reason: str
    created_by_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
