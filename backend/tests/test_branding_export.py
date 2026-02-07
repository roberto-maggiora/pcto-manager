from pathlib import Path
import os

from sqlmodel import Session
from app.db import get_engine
from tests.utils import create_school_with_admin


PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc`\x00"
    b"\x00\x00\x02\x00\x01\xe2!\xbc3\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _login(client, email: str, password: str) -> str:
    response = client.post(
        "/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_branding_logo_export_and_cross_tenant_download(client):
    engine = get_engine()
    with Session(engine) as session:
        school_a, admin_a = create_school_with_admin(session, "A")
        school_b, admin_b = create_school_with_admin(session, "B")

    token_a = _login(client, admin_a["email"], "admin123!")
    token_b = _login(client, admin_b["email"], "admin123!")

    upload_response = client.post(
        "/v1/files/upload-logo",
        files={"upload": ("logo.png", PNG_BYTES, "image/png")},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert upload_response.status_code == 200
    file_id = upload_response.json()["file_id"]

    patch_response = client.patch(
        "/v1/school/branding",
        json={
            "header_text": "Header",
            "footer_text": "Footer",
            "primary_color": "#112233",
            "logo_file_id": file_id,
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert patch_response.status_code == 200

    export_response = client.post(
        "/v1/exports/school-header",
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
