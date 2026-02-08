from pathlib import Path
from uuid import uuid4

import importlib.util
import sqlalchemy as sa


def test_classroom_dedup_migration():
    engine = sa.create_engine("sqlite:///:memory:")
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                """
                CREATE TABLE classroom (
                    id TEXT PRIMARY KEY,
                    school_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    year INTEGER NOT NULL,
                    section TEXT NOT NULL
                )
                """
            )
        )
        school_id = str(uuid4())
        rows = [
            (str(uuid4()), school_id, "4A", 4, "A"),
            (str(uuid4()), school_id, "4A", 4, "A"),
            (str(uuid4()), school_id, "4B", 4, "B"),
        ]
        conn.execute(
            sa.text(
                "INSERT INTO classroom (id, school_id, name, year, section) "
                "VALUES (:id, :school_id, :name, :year, :section)"
            ),
            [
                {
                    "id": row[0],
                    "school_id": row[1],
                    "name": row[2],
                    "year": row[3],
                    "section": row[4],
                }
                for row in rows
            ],
        )

        migration_path = (
            Path(__file__).resolve().parents[1]
            / "alembic"
            / "versions"
            / "0007_classroom_unique_dedup.py"
        )
        spec = importlib.util.spec_from_file_location(
            "classroom_dedup_migration", migration_path
        )
        assert spec and spec.loader
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        migration._dedup_classrooms(conn)

        results = conn.execute(
            sa.text(
                "SELECT school_id, year, section FROM classroom"
            )
        ).fetchall()

    assert len(results) == 3
    assert len(set(results)) == 3
    assert {row[2] for row in results} == {"A", "B", "C"}
