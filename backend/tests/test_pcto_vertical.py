from datetime import datetime, timezone
from pathlib import Path
import os
from uuid import UUID

from sqlmodel import Session, select

from app.db import get_engine
from app.models import Attendance, ClassRoom, Student
from tests.utils import create_school_with_admin


def _login(client, email: str, password: str) -> str:
    response = client.post(
        "/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_pcto_vertical_slice_and_export(client):
    engine = get_engine()
    with Session(engine) as session:
        school_a, admin_a = create_school_with_admin(session, "A")
        school_b, admin_b = create_school_with_admin(session, "B")

        classroom = ClassRoom(
            school_id=school_a.id, name="3A", year=3, section="A"
        )
        session.add(classroom)
        session.flush()

        student_1 = Student(
            school_id=school_a.id,
            class_id=classroom.id,
            first_name="Luca",
            last_name="Rossi",
        )
        student_2 = Student(
            school_id=school_a.id,
            class_id=classroom.id,
            first_name="Giulia",
            last_name="Bianchi",
        )
        session.add(student_1)
        session.add(student_2)
        session.commit()
        student_1_id = student_1.id
        student_2_id = student_2.id

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")

    project_response = client.post(
        "/v1/projects",
        json={
            "title": "PCTO Project",
            "status": "active",
            "start_date": "2026-02-01",
            "end_date": "2026-03-01",
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert project_response.status_code == 200
    project_id = project_response.json()["id"]

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

    attendance_response = client.post(
        f"/v1/sessions/{session_id}/attendance",
        json=[
            {"student_id": str(student_1_id), "status": "present", "hours": 3.0},
            {"student_id": str(student_2_id), "status": "present", "hours": 2.5},
        ],
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert attendance_response.status_code == 200

    with Session(engine) as session:
        attendance_rows = session.exec(
            select(Attendance).where(Attendance.session_id == UUID(session_id))
        ).all()
        attendance_ids = [row.id for row in attendance_rows]

    for attendance_id in attendance_ids:
        provider_response = client.post(
            f"/v1/attendance/{attendance_id}/approve/provider",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert provider_response.status_code == 200

        school_response = client.post(
            f"/v1/attendance/{attendance_id}/approve/school",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert school_response.status_code == 200

    export_response = client.post(
        f"/v1/exports/projects/{project_id}/attendance-register",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert export_response.status_code == 200
    export_id = export_response.json()["export_id"]

    download_b = client.get(
        f"/v1/exports/{export_id}/download",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert download_b.status_code == 404

    download_a = client.get(
        f"/v1/exports/{export_id}/download",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert download_a.status_code == 200

    export_path = (
        Path(os.environ["STORAGE_DIR"])
        / str(admin_a["school_id"])
        / "exports"
        / f"{export_id}.pdf"
    )
    assert export_path.exists()
