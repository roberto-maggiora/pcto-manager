"""add classroom year section

Revision ID: 0003_classroom_year_section
Revises: 0002_school_branding_export
Create Date: 2026-02-07
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_classroom_year_section"
down_revision = "0002_school_branding_export"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("classroom", sa.Column("year", sa.Integer(), nullable=True))
    op.add_column("classroom", sa.Column("section", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("classroom", "section")
    op.drop_column("classroom", "year")
