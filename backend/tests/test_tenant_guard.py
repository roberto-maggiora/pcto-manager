from sqlmodel import Session

from app.db import get_engine
from app.models import School, User, UserRole


def test_tenant_guard_blocks_cross_school(client):
    from app.core.security import create_access_token

    engine = get_engine()
    with Session(engine) as session:
        school_a = School(
            name="School A",
            legal_name="School A SRL",
            address="Via A 1",
            city="Roma",
            province="RM",
            email="a@demo.it",
            phone="+39-111-111111",
        )
        school_b = School(
            name="School B",
            legal_name="School B SRL",
            address="Via B 1",
            city="Milano",
            province="MI",
            email="b@demo.it",
            phone="+39-222-222222",
        )
        session.add(school_a)
        session.add(school_b)
        session.flush()

        user = User(
            school_id=school_a.id,
            role=UserRole.school_admin,
            email="user@a.it",
            password_hash="not-used",
        )
        session.add(user)
        session.commit()

        user_id = user.id
        user_role = user.role
        user_school_id = user.school_id
        school_b_id = school_b.id

    token = create_access_token(user_id, user_role, user_school_id)
    response = client.get(
        f"/v1/schools/{school_b_id}/guarded",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
