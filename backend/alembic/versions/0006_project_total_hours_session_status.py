"""add project total_hours and session status

Revision ID: 0006_project_total_hours_session_status
Revises: 0005_session_topic
Create Date: 2026-02-08 11:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0006_project_total_hours_session_status"
down_revision = "0005_session_topic"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project", sa.Column("total_hours", sa.Float(), nullable=True))
    op.add_column(
        "session",
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="scheduled",
        ),
    )


def downgrade() -> None:
    op.drop_column("session", "status")
    op.drop_column("project", "total_hours")
