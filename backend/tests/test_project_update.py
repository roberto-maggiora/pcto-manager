from datetime import date

from sqlmodel import Session

from app.db import get_engine
from tests.utils import create_school_with_admin


def _login(client, email: str, password: str) -> str:
    response = client.post(
        "/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_project_fields_create_and_patch(client):
    engine = get_engine()
    with Session(engine) as session:
        _, admin = create_school_with_admin(session, "A")

    token = _login(client, admin["email"], "admin123!")

    class_resp = client.post(
        "/v1/classes",
        json={"year": 4, "section": "A"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert class_resp.status_code == 200
    class_id = class_resp.json()["id"]

    create_resp = client.post(
        "/v1/projects",
        json={
            "title": "Project A",
            "status": "draft",
            "start_date": "2026-02-01",
            "end_date": "2026-03-01",
            "class_id": class_id,
            "description": "Desc",
            "school_tutor_name": "Tutor A",
            "provider_expert_name": "Expert A",
            "total_hours": 120.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 200
    project_id = create_resp.json()["id"]
    assert create_resp.json()["class_id"] == class_id

    get_resp = client.get(
        f"/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_resp.status_code == 200
    body = get_resp.json()
    assert body["description"] == "Desc"
    assert body["school_tutor_name"] == "Tutor A"
    assert body["provider_expert_name"] == "Expert A"
    assert body["total_hours"] == 120.0

    patch_resp = client.patch(
        f"/v1/projects/{project_id}",
        json={
            "status": "active",
            "description": "Updated",
            "title": "Project A Updated",
            "total_hours": 140.5,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_resp.status_code == 200

    patch_trailing = client.patch(
        f"/v1/projects/{project_id}/",
        json={"title": "Project A Updated 2"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_trailing.status_code == 200

    get_resp = client.get(
        f"/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_resp.status_code == 200
    body = get_resp.json()
    assert body["status"] == "active"
    assert body["description"] == "Updated"
    assert body["title"] == "Project A Updated 2"
    assert body["total_hours"] == 140.5


def test_project_patch_cross_tenant_404(client):
    engine = get_engine()
    with Session(engine) as session:
        _, admin_a = create_school_with_admin(session, "A")
        _, admin_b = create_school_with_admin(session, "B")

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")

    class_a = client.post(
        "/v1/classes",
        json={"year": 4, "section": "A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert class_a.status_code == 200

    class_b = client.post(
        "/v1/classes",
        json={"year": 4, "section": "A"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert class_b.status_code == 200

    create_resp = client.post(
        "/v1/projects",
        json={
            "title": "Project A",
            "status": "draft",
            "start_date": str(date(2026, 2, 1)),
            "end_date": str(date(2026, 3, 1)),
            "class_id": class_a.json()["id"],
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert create_resp.status_code == 200
    project_id = create_resp.json()["id"]

    patch_resp = client.patch(
        f"/v1/projects/{project_id}",
        json={"status": "active"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert patch_resp.status_code == 404

    patch_class = client.patch(
        f"/v1/projects/{project_id}",
        json={"class_id": class_b.json()["id"]},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert patch_class.status_code == 404


def test_project_requires_class_id(client):
    engine = get_engine()
    with Session(engine) as session:
        _, admin = create_school_with_admin(session, "A")

    token = _login(client, admin["email"], "admin123!")
    create_resp = client.post(
        "/v1/projects",
        json={
            "title": "Project A",
            "status": "draft",
            "start_date": "2026-02-01",
            "end_date": "2026-03-01",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 422


def test_project_create_with_other_tenant_class_returns_404(client):
    engine = get_engine()
    with Session(engine) as session:
        _, admin_a = create_school_with_admin(session, "A")
        _, admin_b = create_school_with_admin(session, "B")

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")

    class_b = client.post(
        "/v1/classes",
        json={"year": 4, "section": "A"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert class_b.status_code == 200

    create_resp = client.post(
        "/v1/projects",
        json={
            "title": "Project A",
            "status": "draft",
            "start_date": "2026-02-01",
            "end_date": "2026-03-01",
            "class_id": class_b.json()["id"],
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert create_resp.status_code == 404
