"""add project extra fields

Revision ID: 0004_project_fields
Revises: 0003_classroom_year_section
Create Date: 2026-02-07
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_project_fields"
down_revision = "0003_classroom_year_section"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project", sa.Column("description", sa.String(), nullable=True))
    op.add_column("project", sa.Column("school_tutor_name", sa.String(), nullable=True))
    op.add_column("project", sa.Column("provider_expert_name", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("project", "provider_expert_name")
    op.drop_column("project", "school_tutor_name")
    op.drop_column("project", "description")
