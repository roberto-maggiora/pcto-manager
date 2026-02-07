from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings


def get_engine():
    connect_args = {}
    if settings.database_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    return create_engine(settings.database_url, connect_args=connect_args)


def get_session():
    engine = get_engine()
    with Session(engine) as session:
        yield session


def run_migrations() -> None:
    base_dir = Path(__file__).resolve().parents[1]
    alembic_ini = base_dir / "alembic.ini"
    config = Config(str(alembic_ini))
    config.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(config, "head")


def create_all() -> None:
    engine = get_engine()
    SQLModel.metadata.create_all(engine)
