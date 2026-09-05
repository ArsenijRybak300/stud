from fastapi.testclient import TestClient


def test_register_login_and_me(client: TestClient):
    register = client.post(
        "/api/auth/register",
        json={
            "email": "Arseniy@example.com",
            "full_name": "Арсений Рыбак",
            "password": "password123",
            "group_code": "нмт-333901",
        },
    )
    assert register.status_code == 201, register.text
    assert register.json()["user"]["email"] == "arseniy@example.com"
    assert register.json()["user"]["role"] == "student"
    assert register.json()["user"]["group_code"] == "НМТ-333901"

    login = client.post(
        "/api/auth/login",
        data={"username": "arseniy@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "Арсений Рыбак"


def test_registration_requires_existing_group(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "student2@example.com",
            "full_name": "Второй Студент",
            "password": "password123",
            "group_code": "НЕ-СУЩЕСТВУЕТ",
        },
    )
    assert response.status_code == 422


def test_student_cannot_open_admin_users(client: TestClient, student_headers: dict[str, str]):
    response = client.get("/api/users", headers=student_headers)
    assert response.status_code == 403
