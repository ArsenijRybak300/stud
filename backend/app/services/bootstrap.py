from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.group import StudyGroup
from app.models.semester import Semester
from app.models.user import User, UserRole


def ensure_initial_data(db: Session) -> None:
    group = db.scalar(select(StudyGroup).where(StudyGroup.code == settings.initial_group_code))
    if group is None:
        group = StudyGroup(code=settings.initial_group_code, name="Учебная группа")
        db.add(group)
        db.flush()

    admin = db.scalar(select(User).where(User.email == settings.initial_admin_email.lower()))
    if admin is None:
        admin = User(
            email=settings.initial_admin_email.lower(),
            full_name=settings.initial_admin_name,
            hashed_password=hash_password(settings.initial_admin_password),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
    else:
        # Обновляем данные стартового администратора, чтобы вход работал
        # после повторного запуска с существующим Docker volume.
        admin.role = UserRole.admin
        admin.is_active = True
        admin.hashed_password = hash_password(settings.initial_admin_password)

    # Тестовый студент для демонстрации роли student
    student_email = "student@studentplan.ru"
    student_password = "Student12345"
    student = db.scalar(select(User).where(User.email == student_email))
    if student is None:
        student = User(
            email=student_email,
            full_name="Студент StudentPlan",
            hashed_password=hash_password(student_password),
            role=UserRole.student,
            group_id=group.id,
            is_active=True,
        )
        db.add(student)
    else:
        student.role = UserRole.student
        student.group_id = group.id
        student.is_active = True
        student.hashed_password = hash_password(student_password)

    semester = db.scalar(select(Semester).limit(1))
    if semester is None:
        semester = Semester(
            name="Осенний семестр 2026/2027",
            starts_on=date(2026, 7, 1),
            ends_on=date(2027, 1, 25),
            is_active=True,
        )
        db.add(semester)

    db.commit()
