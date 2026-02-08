"""add project class_id

Revision ID: 0009_project_class_id
Revises: 0008_student_pcto_required_hours
Create Date: 2026-02-08 14:10:00.000000
"""

from __future__ import annotations

from uuid import uuid4

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0009_project_class_id"
down_revision = "0008_student_pcto_required_hours"
branch_labels = None
depends_on = None


def _backfill_project_class_id(conn: sa.Connection) -> None:
    school_ids = conn.execute(
        sa.text("SELECT DISTINCT school_id FROM project")
    ).fetchall()
    for (school_id,) in school_ids:
        classroom = conn.execute(
            sa.text(
                "SELECT id FROM classroom WHERE school_id = :school_id ORDER BY id LIMIT 1"
            ),
            {"school_id": school_id},
        ).fetchone()
        if classroom:
            class_id = classroom[0]
        else:
            class_id = str(uuid4())
            conn.execute(
                sa.text(
                    "INSERT INTO classroom (id, school_id, name, year, section) "
                    "VALUES (:id, :school_id, :name, :year, :section)"
                ),
                {
                    "id": class_id,
                    "school_id": school_id,
                    "name": "4A",
                    "year": 4,
                    "section": "A",
                },
            )
        conn.execute(
            sa.text(
                "UPDATE project SET class_id = :class_id "
                "WHERE school_id = :school_id AND class_id IS NULL"
            ),
            {"class_id": class_id, "school_id": school_id},
        )


def upgrade() -> None:
    op.add_column("project", sa.Column("class_id", sa.String(), nullable=True))
    conn = op.get_bind()
    _backfill_project_class_id(conn)


def downgrade() -> None:
    op.drop_column("project", "class_id")
