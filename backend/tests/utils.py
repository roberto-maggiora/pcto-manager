from sqlmodel import Session

from app.core.security import hash_password
from app.models import School, User, UserRole


def create_school_with_admin(session: Session, suffix: str) -> tuple[School, dict]:
    school = School(
        name=f"School {suffix}",
        legal_name=f"School {suffix} SRL",
        address=f"Via {suffix} 1",
        city="Roma",
        province="RM",
        email=f"{suffix.lower()}@demo.it",
        phone="+39-000-000000",
    )
    session.add(school)
    session.flush()

    admin = User(
        school_id=school.id,
        role=UserRole.school_admin,
        email=f"admin-{suffix.lower()}@demo.it",
        password_hash=hash_password("admin123!"),
    )
    session.add(admin)
    session.commit()
    admin_info = {
        "id": admin.id,
        "email": admin.email,
        "role": admin.role,
        "school_id": admin.school_id,
    }
    return school, admin_info
