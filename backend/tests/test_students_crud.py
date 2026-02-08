from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Session, select

from app.db import get_engine
from app.models import (
    Attendance,
    AttendanceStatus,
    ClassRoom,
    Project,
    ProjectStatus,
    Session as ProjectSession,
    Student,
)
from tests.utils import create_school_with_admin


def _login(client, email: str, password: str) -> str:
    response = client.post(
        "/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_student_default_hours_and_patch(client):
    engine = get_engine()
    with Session(engine) as session:
        school, admin = create_school_with_admin(session, "A")
        classroom = ClassRoom(school_id=school.id, name="3A", year=3, section="A")
        session.add(classroom)
        session.commit()
        class_id = classroom.id

    token = _login(client, admin["email"], "admin123!")
    create_resp = client.post(
        "/v1/students",
        json={"class_id": str(class_id), "first_name": "Luca", "last_name": "Rossi"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 200
    student_id = create_resp.json()["id"]
    assert create_resp.json()["pcto_required_hours"] == 150

    patch_resp = client.patch(
        f"/v1/students/{student_id}",
        json={"pcto_required_hours": 200},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["pcto_required_hours"] == 200


def test_student_delete_removes_attendance_and_metrics(client):
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
        project = Project(
            school_id=school.id,
            class_id=classroom.id,
            title="PCTO",
            status=ProjectStatus.active,
            start_date=datetime(2026, 2, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2026, 2, 28, tzinfo=timezone.utc).date(),
        )
        session.add(project)
        session.flush()
        project_session = ProjectSession(
            school_id=school.id,
            project_id=project.id,
            start=datetime(2026, 2, 7, 10, 0, tzinfo=timezone.utc),
            end=datetime(2026, 2, 7, 12, 0, tzinfo=timezone.utc),
            planned_hours=2.0,
        )
        session.add(project_session)
        session.flush()
        attendance = Attendance(
            school_id=school.id,
            session_id=project_session.id,
            student_id=student.id,
            status=AttendanceStatus.present,
            hours=2.0,
        )
        session.add(attendance)
        session.commit()
        student_id = student.id

    token = _login(client, admin["email"], "admin123!")

    metrics = client.get(
        "/v1/students/metrics",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert metrics.status_code == 200
    metrics_map = {row["student_id"]: row["completed_hours"] for row in metrics.json()}
    assert metrics_map[str(student_id)] == 2.0

    delete_resp = client.delete(
        f"/v1/students/{student_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_resp.status_code == 200
    assert delete_resp.json() == {"deleted": True}

    with Session(engine) as session:
        attendance_rows = session.exec(
            select(Attendance).where(Attendance.student_id == UUID(str(student_id)))
        ).all()
        assert attendance_rows == []
        student_row = session.exec(
            select(Student).where(Student.id == UUID(str(student_id)))
        ).first()
        assert student_row is None


def test_student_cross_tenant_patch_delete(client):
    engine = get_engine()
    with Session(engine) as session:
        school_a, admin_a = create_school_with_admin(session, "A")
        school_b, admin_b = create_school_with_admin(session, "B")
        classroom = ClassRoom(school_id=school_a.id, name="3A", year=3, section="A")
        session.add(classroom)
        session.flush()
        student = Student(
            school_id=school_a.id,
            class_id=classroom.id,
            first_name="Luca",
            last_name="Rossi",
        )
        session.add(student)
        session.commit()
        student_id = student.id

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")

    patch_resp = client.patch(
        f"/v1/students/{student_id}",
        json={"pcto_required_hours": 160},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert patch_resp.status_code == 404

    delete_resp = client.delete(
        f"/v1/students/{student_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert delete_resp.status_code == 404


def test_student_summary(client):
    engine = get_engine()
    with Session(engine) as session:
        school_a, admin_a = create_school_with_admin(session, "A")
        school_b, admin_b = create_school_with_admin(session, "B")
        classroom = ClassRoom(school_id=school_a.id, name="3A", year=3, section="A")
        session.add(classroom)
        session.flush()
        student = Student(
            school_id=school_a.id,
            class_id=classroom.id,
            first_name="Luca",
            last_name="Rossi",
            pcto_required_hours=150,
        )
        session.add(student)
        project = Project(
            school_id=school_a.id,
            class_id=classroom.id,
            title="PCTO",
            status=ProjectStatus.active,
            start_date=datetime(2026, 2, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2026, 2, 28, tzinfo=timezone.utc).date(),
        )
        session.add(project)
        session.flush()
        project_session = ProjectSession(
            school_id=school_a.id,
            project_id=project.id,
            start=datetime(2026, 2, 7, 10, 0, tzinfo=timezone.utc),
            end=datetime(2026, 2, 7, 12, 0, tzinfo=timezone.utc),
            planned_hours=2.0,
        )
        session.add(project_session)
        session.flush()
        attendance = Attendance(
            school_id=school_a.id,
            session_id=project_session.id,
            student_id=student.id,
            status=AttendanceStatus.present,
            hours=2.0,
        )
        session.add(attendance)
        session.commit()
        student_id = student.id

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")

    summary = client.get(
        f"/v1/students/{student_id}/summary",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert summary.status_code == 200
    body = summary.json()
    assert body["completed_hours_total"] == 2.0
    assert body["class_year"] == 3
    assert body["class_section"] == "A"
    assert len(body["by_project"]) == 1
    assert body["by_project"][0]["completed_hours"] == 2.0
    assert body["by_project"][0]["title"] == "PCTO"

    summary_cross = client.get(
        f"/v1/students/{student_id}/summary",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert summary_cross.status_code == 404
