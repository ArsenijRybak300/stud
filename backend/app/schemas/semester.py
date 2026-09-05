from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SemesterCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    starts_on: date
    ends_on: date

    @model_validator(mode="after")
    def validate_dates(self):
        if self.ends_on < self.starts_on:
            raise ValueError("Дата окончания семестра не может быть раньше даты начала")
        return self


class SemesterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    starts_on: date | None = None
    ends_on: date | None = None
    is_active: bool | None = None


class SemesterRead(BaseModel):
    id: int
    name: str
    starts_on: date
    ends_on: date
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CopyScheduleRequest(BaseModel):
    target_semester_id: int
    group_id: int
