from sqlmodel import Session, select

from app.core.security import hash_password
from app.db import get_engine
from app.models import School, User, UserRole


def seed() -> None:
    engine = get_engine()
    with Session(engine) as session:
        existing = session.exec(
            select(User).where(User.email == "admin@demo.it")
        ).first()
        if existing:
            return

        school = School(
            name="Demo School",
            legal_name="Demo School SRL",
            address="Via Roma 1",
            city="Roma",
            province="RM",
            email="info@demo.it",
            phone="+39-000-000000",
        )
        session.add(school)
        session.flush()

        admin = User(
            school_id=school.id,
            role=UserRole.school_admin,
            email="admin@demo.it",
            password_hash=hash_password("admin123!"),
        )
        session.add(admin)
        session.commit()


if __name__ == "__main__":
    seed()
