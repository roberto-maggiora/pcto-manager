"""dedup classrooms and add unique index

Revision ID: 0007_classroom_unique_dedup
Revises: 0006_project_total_hours_session_status
Create Date: 2026-02-08 12:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0007_classroom_unique_dedup"
down_revision = "0006_project_total_hours_session_status"
branch_labels = None
depends_on = None


def _next_free_section(used: set[str]) -> str:
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        if letter not in used:
            return letter
    raise RuntimeError("No free section letters available")


def _dedup_classrooms(conn: sa.Connection) -> None:
    groups = conn.execute(
        sa.text(
            """
            SELECT school_id, year, section, COUNT(*) as cnt
            FROM classroom
            GROUP BY school_id, year, section
            HAVING cnt > 1
            """
        )
    ).fetchall()

    for school_id, year, section, _ in groups:
        rows = conn.execute(
            sa.text(
                """
                SELECT id, section
                FROM classroom
                WHERE school_id = :school_id AND year = :year AND section = :section
                ORDER BY id
                """
            ),
            {"school_id": school_id, "year": year, "section": section},
        ).fetchall()

        if len(rows) <= 1:
            continue

        used_sections = {
            str(row[0]).upper()
            for row in conn.execute(
                sa.text(
                    """
                    SELECT DISTINCT section
                    FROM classroom
                    WHERE school_id = :school_id AND year = :year
                    """
                ),
                {"school_id": school_id, "year": year},
            ).fetchall()
        }

        for row_id, _ in rows[1:]:
            next_section = _next_free_section(used_sections)
            used_sections.add(next_section)
            conn.execute(
                sa.text(
                    """
                    UPDATE classroom
                    SET section = :section, name = :name
                    WHERE id = :id
                    """
                ),
                {"section": next_section, "name": f"{year}{next_section}", "id": row_id},
            )


def upgrade() -> None:
    conn = op.get_bind()
    _dedup_classrooms(conn)
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_classroom_school_year_section "
        "ON classroom (school_id, year, section)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_classroom_school_year_section")
