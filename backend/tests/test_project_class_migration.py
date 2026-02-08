import importlib.util
from pathlib import Path
from uuid import uuid4

import sqlalchemy as sa


def _load_migration():
    path = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "0009_project_class_id.py"
    spec = importlib.util.spec_from_file_location("migration_0009_project_class_id", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_backfill_project_class_id_creates_default_class():
    engine = sa.create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                "CREATE TABLE project (id TEXT PRIMARY KEY, school_id TEXT, class_id TEXT)"
            )
        )
        conn.execute(
            sa.text(
                "CREATE TABLE classroom (id TEXT PRIMARY KEY, school_id TEXT, name TEXT, year INTEGER, section TEXT)"
            )
        )
        school_id = str(uuid4())
        project_id = str(uuid4())
        conn.execute(
            sa.text("INSERT INTO project (id, school_id, class_id) VALUES (:id, :school_id, NULL)"),
            {"id": project_id, "school_id": school_id},
        )

        migration = _load_migration()
        migration._backfill_project_class_id(conn)

        class_row = conn.execute(
            sa.text("SELECT id, name, year, section FROM classroom WHERE school_id = :school_id"),
            {"school_id": school_id},
        ).fetchone()
        assert class_row is not None
        assert class_row[1] == "4A"
        assert class_row[2] == 4
        assert class_row[3] == "A"

        project_row = conn.execute(
            sa.text("SELECT class_id FROM project WHERE id = :id"),
            {"id": project_id},
        ).fetchone()
        assert project_row[0] == class_row[0]
