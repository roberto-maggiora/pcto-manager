from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Session, select

from app.db import get_engine
from app.models import Attendance, ClassRoom, Session as ProjectSession, Student
from tests.utils import create_school_with_admin


def _login(client, email: str, password: str) -> str:
    response = client.post(
        "/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _create_project(client, token: str) -> str:
    response = client.post(
        "/v1/projects",
        json={
            "title": "Project A",
            "status": "active",
            "start_date": "2026-02-01",
            "end_date": "2026-03-01",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_session_create_list_and_patch_topic(client):
    engine = get_engine()
    with Session(engine) as session:
        _, admin = create_school_with_admin(session, "A")

    token = _login(client, admin["email"], "admin123!")
    project_id = _create_project(client, token)

    session_response = client.post(
        f"/v1/projects/{project_id}/sessions",
        json={
            "start": datetime(2026, 2, 10, 9, 0, tzinfo=timezone.utc).isoformat(),
            "end": datetime(2026, 2, 10, 12, 0, tzinfo=timezone.utc).isoformat(),
            "planned_hours": 3.0,
            "topic": "Introduzione",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]
    assert session_response.json()["status"] == "scheduled"

    list_response = client.get(
        f"/v1/projects/{project_id}/sessions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.status_code == 200
    items = list_response.json()
    assert items[0]["topic"] == "Introduzione"

    patch_response = client.patch(
        f"/v1/sessions/{session_id}",
        json={"topic": "Aggiornato", "status": "done"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_response.status_code == 200

    list_response = client.get(
        f"/v1/projects/{project_id}/sessions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.status_code == 200
    items = list_response.json()
    assert items[0]["topic"] == "Aggiornato"
    assert items[0]["status"] == "done"


def test_session_delete_removes_attendance(client):
    engine = get_engine()
    with Session(engine) as session:
        school, admin = create_school_with_admin(session, "A")
        classroom = ClassRoom(school_id=school.id, name="3A", year=3, section="A")
        session.add(classroom)
        session.flush()
        student = Student(
            school_id=school.id,
            class_id=classroom.id,
            first_name="Luca",
            last_name="Rossi",
        )
        session.add(student)
        session.commit()
        student_id = student.id

    token = _login(client, admin["email"], "admin123!")
    project_id = _create_project(client, token)

    session_response = client.post(
        f"/v1/projects/{project_id}/sessions",
        json={
            "start": datetime(2026, 2, 10, 9, 0, tzinfo=timezone.utc).isoformat(),
            "end": datetime(2026, 2, 10, 12, 0, tzinfo=timezone.utc).isoformat(),
            "planned_hours": 3.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    attendance_response = client.post(
        f"/v1/sessions/{session_id}/attendance",
        json=[{"student_id": str(student_id), "status": "present", "hours": 3.0}],
        headers={"Authorization": f"Bearer {token}"},
    )
    assert attendance_response.status_code == 200

    delete_response = client.delete(
        f"/v1/sessions/{session_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert delete_response.status_code == 200
    assert delete_response.json() == {"deleted": True}

    with Session(engine) as session:
        attendance_rows = session.exec(
            select(Attendance).where(Attendance.session_id == UUID(session_id))
        ).all()
        assert attendance_rows == []
        session_row = session.exec(
            select(ProjectSession).where(ProjectSession.id == UUID(session_id))
        ).first()
        assert session_row is None


def test_project_delete_removes_sessions_and_attendance(client):
    engine = get_engine()
    with Session(engine) as session:
        school, admin = create_school_with_admin(session, "A")
        classroom = ClassRoom(school_id=school.id, name="3A", year=3, section="A")
        session.add(classroom)
        session.flush()
        student = Student(
            school_id=school.id,
            class_id=classroom.id,
            first_name="Luca",
            last_name="Rossi",
        )
        session.add(student)
        session.commit()
        student_id = student.id

    token = _login(client, admin["email"], "admin123!")
    project_id = _create_project(client, token)

    session_response = client.post(
        f"/v1/projects/{project_id}/sessions",
        json={
            "start": datetime(2026, 2, 10, 9, 0, tzinfo=timezone.utc).isoformat(),
            "end": datetime(2026, 2, 10, 12, 0, tzinfo=timezone.utc).isoformat(),
            "planned_hours": 3.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    attendance_response = client.post(
        f"/v1/sessions/{session_id}/attendance",
        json=[{"student_id": str(student_id), "status": "present", "hours": 3.0}],
        headers={"Authorization": f"Bearer {token}"},
    )
    assert attendance_response.status_code == 200

    delete_response = client.delete(
        f"/v1/projects/{project_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert delete_response.status_code == 200
    assert delete_response.json() == {"deleted": True}

    with Session(engine) as session:
        session_rows = session.exec(
            select(ProjectSession).where(ProjectSession.project_id == UUID(project_id))
        ).all()
        assert session_rows == []
        attendance_rows = session.exec(
            select(Attendance).where(Attendance.session_id == UUID(session_id))
        ).all()
        assert attendance_rows == []


def test_session_patch_and_delete_cross_tenant_404(client):
    engine = get_engine()
    with Session(engine) as session:
        _, admin_a = create_school_with_admin(session, "A")
        _, admin_b = create_school_with_admin(session, "B")

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")
    project_id = _create_project(client, token_a)

    session_response = client.post(
        f"/v1/projects/{project_id}/sessions",
        json={
            "start": datetime(2026, 2, 10, 9, 0, tzinfo=timezone.utc).isoformat(),
            "end": datetime(2026, 2, 10, 12, 0, tzinfo=timezone.utc).isoformat(),
            "planned_hours": 3.0,
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    patch_response = client.patch(
        f"/v1/sessions/{session_id}",
        json={"topic": "Nope"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert patch_response.status_code == 404

    delete_session_response = client.delete(
        f"/v1/sessions/{session_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert delete_session_response.status_code == 404

    delete_project_response = client.delete(
        f"/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert delete_project_response.status_code == 404
