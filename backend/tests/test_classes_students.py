from sqlmodel import Session

from app.db import get_engine
from tests.utils import create_school_with_admin
from app.models import ClassRoom, Student


def _login(client, email: str, password: str) -> str:
    response = client.post(
        "/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_classes_students_tenant_scoped(client):
    engine = get_engine()
    with Session(engine) as session:
        school_a, admin_a = create_school_with_admin(session, "A")
        school_b, admin_b = create_school_with_admin(session, "B")

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")

    class_response = client.post(
        "/v1/classes",
        json={"year": 3, "section": "A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert class_response.status_code == 200
    class_id = class_response.json()["id"]

    student_1 = client.post(
        "/v1/students",
        json={"class_id": class_id, "first_name": "Luca", "last_name": "Rossi"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert student_1.status_code == 200

    student_2 = client.post(
        "/v1/students",
        json={"class_id": class_id, "first_name": "Giulia", "last_name": "Bianchi"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert student_2.status_code == 200

    list_classes = client.get(
        "/v1/classes", headers={"Authorization": f"Bearer {token_a}"}
    )
    assert list_classes.status_code == 200
    assert len(list_classes.json()) == 1

    list_students = client.get(
        "/v1/students", headers={"Authorization": f"Bearer {token_a}"}
    )
    assert list_students.status_code == 200
    assert len(list_students.json()) == 2

    list_classes_b = client.get(
        "/v1/classes", headers={"Authorization": f"Bearer {token_b}"}
    )
    assert list_classes_b.status_code == 200
    assert list_classes_b.json() == []

    list_students_b = client.get(
        "/v1/students", headers={"Authorization": f"Bearer {token_b}"}
    )
    assert list_students_b.status_code == 200
    assert list_students_b.json() == []

    cross_student = client.post(
        "/v1/students",
        json={"class_id": class_id, "first_name": "Eve", "last_name": "Cross"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert cross_student.status_code == 404


def test_class_duplicate_create_and_patch(client):
    engine = get_engine()
    with Session(engine) as session:
        _, admin = create_school_with_admin(session, "A")

    token = _login(client, admin["email"], "admin123!")

    create_resp = client.post(
        "/v1/classes",
        json={"year": 4, "section": "A"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 200
    class_id = create_resp.json()["id"]

    dup_resp = client.post(
        "/v1/classes",
        json={"year": 4, "section": "A"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dup_resp.status_code == 409

    other_resp = client.post(
        "/v1/classes",
        json={"year": 4, "section": "B"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert other_resp.status_code == 200
    other_id = other_resp.json()["id"]

    patch_dup = client.patch(
        f"/v1/classes/{other_id}",
        json={"year": 4, "section": "A"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_dup.status_code == 409

    patch_ok = client.patch(
        f"/v1/classes/{class_id}",
        json={"year": 5, "section": "A"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_ok.status_code == 200


def test_class_delete_with_students_and_cross_tenant(client):
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
        class_id = classroom.id

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")

    delete_with_students = client.delete(
        f"/v1/classes/{class_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert delete_with_students.status_code == 409

    delete_cross = client.delete(
        f"/v1/classes/{class_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert delete_cross.status_code == 404

    patch_cross = client.patch(
        f"/v1/classes/{class_id}",
        json={"year": 4, "section": "B"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert patch_cross.status_code == 404
