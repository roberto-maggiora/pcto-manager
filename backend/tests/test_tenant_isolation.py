from sqlmodel import Session

from app.db import get_engine
from tests.utils import create_school_with_admin


def _login(client, email: str, password: str) -> str:
    response = client.post(
        "/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_cross_tenant_project_access_returns_404(client):
    engine = get_engine()
    with Session(engine) as session:
        school_a, admin_a = create_school_with_admin(session, "A")
        school_b, admin_b = create_school_with_admin(session, "B")

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")

    class_resp = client.post(
        "/v1/classes",
        json={"year": 4, "section": "A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert class_resp.status_code == 200
    create_response = client.post(
        "/v1/projects",
        json={
            "title": "Project A",
            "status": "active",
            "start_date": "2026-02-01",
            "end_date": "2026-03-01",
            "class_id": class_resp.json()["id"],
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert create_response.status_code == 200
    project_id = create_response.json()["id"]

    get_response = client.get(
        f"/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_response.status_code == 404
