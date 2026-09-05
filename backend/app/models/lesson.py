from datetime import date, datetime, time, timezone
from enum import Enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WeekType(str, Enum):
    every = "every"
    odd = "odd"
    even = "even"


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint("weekday >= 0 AND weekday <= 6", name="ck_lessons_weekday"),
        CheckConstraint("end_time > start_time", name="ck_lessons_time_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(
        ForeignKey("study_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    semester_id: Mapped[int] = mapped_column(
        ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    teacher: Mapped[str | None] = mapped_column(String(160), index=True)
    room: Mapped[str | None] = mapped_column(String(80), index=True)
    lesson_type: Mapped[str | None] = mapped_column(String(80))
    weekday: Mapped[int] = mapped_column(nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    week_type: Mapped[WeekType] = mapped_column(
        SqlEnum(WeekType, name="week_type"), default=WeekType.every, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    group = relationship("StudyGroup", back_populates="lessons")
    semester = relationship("Semester", back_populates="lessons")
    created_by = relationship("User", back_populates="created_lessons", foreign_keys=[created_by_id])
    cancellations = relationship("LessonCancellation", back_populates="lesson", cascade="all, delete-orphan")


class LessonCancellation(Base):
    __tablename__ = "lesson_cancellations"
    __table_args__ = (UniqueConstraint("lesson_id", "lesson_date", name="uq_lesson_cancellation_date"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lesson_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    lesson = relationship("Lesson", back_populates="cancellations")
    created_by = relationship("User", foreign_keys=[created_by_id])
