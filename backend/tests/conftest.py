import os
from datetime import date

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "test_secret_key_that_is_long_enough_123456"
os.environ["APP_TIMEZONE"] = "UTC"
os.environ["UPLOADS_DIR"] = "/tmp/studentplan_test_uploads"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.base import Base
from app.main import app
from app.models.group import StudyGroup
from app.models.semester import Semester
from app.models.user import User, UserRole
from app import models  # noqa: F401

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_database(tmp_path):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as db:
        group = StudyGroup(code="НМТ-333901", name="Тестовая группа")
        semester = Semester(
            name="Осенний семестр 2026/2027",
            starts_on=date(2026, 8, 1),
            ends_on=date(2027, 1, 25),
            is_active=True,
        )
        admin = User(
            email="admin@studentplan.ru",
            full_name="Администратор",
            hashed_password=hash_password("Admin12345"),
            role=UserRole.admin,
            is_active=True,
        )
        db.add_all([group, semester, admin])
        db.commit()
    yield


@pytest.fixture
def client():
    # TestClient без контекстного менеджера не запускает production-lifespan,
    # поэтому тесты работают только с изолированной in-memory БД.
    test_client = TestClient(app)
    yield test_client
    test_client.close()


@pytest.fixture
def admin_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        data={"username": "admin@studentplan.ru", "password": "Admin12345"},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def student_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/register",
        json={
            "email": "student@example.com",
            "full_name": "Тестовый Студент",
            "password": "strong-password",
            "group_code": "НМТ-333901",
        },
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
