"""school branding and export

Revision ID: 0002_school_branding_export
Revises: 0001_initial
Create Date: 2026-02-07
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_school_branding_export"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "schoolbranding",
        sa.Column("school_id", sa.Uuid(), primary_key=True),
        sa.Column("header_text", sa.String(), nullable=True),
        sa.Column("footer_text", sa.String(), nullable=True),
        sa.Column("primary_color", sa.String(), nullable=True),
        sa.Column("logo_file_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["school.id"]),
        sa.ForeignKeyConstraint(["logo_file_id"], ["file.id"]),
    )

    op.create_table(
        "export",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("school_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["school.id"]),
    )


def downgrade() -> None:
    op.drop_table("export")
    op.drop_table("schoolbranding")
