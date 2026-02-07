from datetime import date, datetime, timezone

from sqlmodel import Session as DbSession

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


def test_get_session_attendance_tenant_scoped(client):
    from app.core.security import create_access_token
    engine = get_engine()
    with DbSession(engine) as session:
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
        session.flush()

        project = Project(
            school_id=school_a.id,
            title="PCTO",
            status=ProjectStatus.active,
            start_date=date(2026, 2, 1),
            end_date=date(2026, 2, 28),
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

        attendance_1 = Attendance(
            school_id=school_a.id,
            session_id=project_session.id,
            student_id=student_1.id,
            status=AttendanceStatus.present,
            hours=2.0,
        )
        attendance_2 = Attendance(
            school_id=school_a.id,
            session_id=project_session.id,
            student_id=student_2.id,
            status=AttendanceStatus.absent,
            hours=0.0,
        )
        session.add(attendance_1)
        session.add(attendance_2)
        session.commit()

        token_a = create_access_token(admin_a["id"], admin_a["role"], admin_a["school_id"])
        token_b = create_access_token(admin_b["id"], admin_b["role"], admin_b["school_id"])
        session_id = project_session.id
        attendance_1_student_id = attendance_1.student_id
        attendance_2_student_id = attendance_2.student_id

    response = client.get(
        f"/v1/sessions/{session_id}/attendance",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 200
    body = sorted(response.json(), key=lambda row: row["student_id"])
    assert body == sorted(
        [
            {
                "student_id": str(attendance_1_student_id),
                "status": AttendanceStatus.present.value,
                "hours": 2.0,
            },
            {
                "student_id": str(attendance_2_student_id),
                "status": AttendanceStatus.absent.value,
                "hours": 0.0,
            },
        ],
        key=lambda row: row["student_id"],
    )

    response_cross = client.get(
        f"/v1/sessions/{session_id}/attendance",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response_cross.status_code == 404
