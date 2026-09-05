from fastapi.testclient import TestClient


def test_task_lifecycle_with_file_and_admin_comment(
    client: TestClient,
    admin_headers: dict[str, str],
    student_headers: dict[str, str],
):
    group_id = client.get("/api/groups", headers=admin_headers).json()[0]["id"]
    created = client.post(
        "/api/tasks",
        json={
            "group_id": group_id,
            "title": "Практическая работа № 1",
            "description": "Выполнить консольный ввод-вывод",
            "subject": "Программирование",
            "due_at": "2026-08-20T18:00:00Z",
            "priority": "medium",
        },
        headers=admin_headers,
    )
    assert created.status_code == 201, created.text
    task_id = created.json()["id"]
    assert created.json()["submissions_total"] == 1

    listed = client.get("/api/tasks", headers=student_headers)
    assert listed.status_code == 200
    assert listed.json()[0]["my_submission"]["status"] == "assigned"

    started = client.post(f"/api/tasks/{task_id}/start", headers=student_headers)
    assert started.status_code == 200, started.text
    assert started.json()["status"] == "in_progress"

    uploaded = client.post(
        f"/api/tasks/{task_id}/submission-files",
        files={"file": ("answer.txt", b"completed work", "text/plain")},
        headers=student_headers,
    )
    assert uploaded.status_code == 201, uploaded.text

    submitted = client.post(f"/api/tasks/{task_id}/submit", headers=student_headers)
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status"] == "submitted"
    submission_id = submitted.json()["id"]

    comment = client.post(
        f"/api/tasks/submissions/{submission_id}/comments",
        json={"text": "Работа проверена, замечаний нет."},
        headers=admin_headers,
    )
    assert comment.status_code == 201, comment.text

    completed = client.post(
        f"/api/tasks/submissions/{submission_id}/complete",
        headers=admin_headers,
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["status"] == "completed"
    assert completed.json()["comments"][0]["text"] == "Работа проверена, замечаний нет."
