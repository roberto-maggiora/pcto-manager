"""add student pcto required hours

Revision ID: 0008_student_pcto_required_hours
Revises: 0007_classroom_unique_dedup
Create Date: 2026-02-08 13:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0008_student_pcto_required_hours"
down_revision = "0007_classroom_unique_dedup"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "student",
        sa.Column("pcto_required_hours", sa.Integer(), nullable=False, server_default="150"),
    )


def downgrade() -> None:
    op.drop_column("student", "pcto_required_hours")
