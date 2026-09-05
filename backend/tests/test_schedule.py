from fastapi.testclient import TestClient


def ids(client: TestClient, admin_headers: dict[str, str]) -> tuple[int, int]:
    group_id = client.get("/api/groups", headers=admin_headers).json()[0]["id"]
    semester_id = client.get("/api/semesters", headers=admin_headers).json()[0]["id"]
    return group_id, semester_id


def test_group_schedule_and_single_date_cancellation(
    client: TestClient,
    admin_headers: dict[str, str],
    student_headers: dict[str, str],
):
    group_id, semester_id = ids(client, admin_headers)
    lesson = client.post(
        "/api/lessons",
        json={
            "group_id": group_id,
            "semester_id": semester_id,
            "subject": "Базы данных",
            "teacher": "Иванов И.И.",
            "room": "А-101",
            "lesson_type": "Лекция",
            "weekday": 0,
            "start_time": "09:00:00",
            "end_time": "10:30:00",
            "week_type": "every",
            "notes": None,
        },
        headers=admin_headers,
    )
    assert lesson.status_code == 201, lesson.text
    lesson_id = lesson.json()["id"]

    schedule = client.get("/api/schedule/week?date=2026-08-03", headers=student_headers)
    assert schedule.status_code == 200, schedule.text
    monday = schedule.json()["days"][0]
    assert monday["date"] == "2026-08-03"
    assert monday["lessons"][0]["lesson"]["subject"] == "Базы данных"
    assert monday["lessons"][0]["cancelled"] is False

    cancelled = client.post(
        f"/api/lessons/{lesson_id}/cancellations",
        json={"lesson_date": "2026-08-03", "reason": "Аудитория занята"},
        headers=admin_headers,
    )
    assert cancelled.status_code == 201, cancelled.text

    schedule = client.get("/api/schedule/week?date=2026-08-03", headers=student_headers)
    occurrence = schedule.json()["days"][0]["lessons"][0]
    assert occurrence["cancelled"] is True
    assert occurrence["cancellation_reason"] == "Аудитория занята"


def test_copy_schedule_to_new_semester(client: TestClient, admin_headers: dict[str, str]):
    group_id, source_semester_id = ids(client, admin_headers)
    client.post(
        "/api/lessons",
        json={
            "group_id": group_id,
            "semester_id": source_semester_id,
            "subject": "Информационные системы",
            "weekday": 2,
            "start_time": "12:00:00",
            "end_time": "13:30:00",
            "week_type": "odd",
        },
        headers=admin_headers,
    )
    target = client.post(
        "/api/semesters",
        json={
            "name": "Весенний семестр 2026/2027",
            "starts_on": "2027-02-01",
            "ends_on": "2027-06-30",
        },
        headers=admin_headers,
    )
    assert target.status_code == 201
    copied = client.post(
        f"/api/semesters/{source_semester_id}/copy-schedule",
        json={"target_semester_id": target.json()["id"], "group_id": group_id},
        headers=admin_headers,
    )
    assert copied.status_code == 201, copied.text
    assert copied.json()["created"] == 1
