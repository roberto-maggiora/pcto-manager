"""add session topic

Revision ID: 0005_session_topic
Revises: 0004_project_fields
Create Date: 2026-02-08 10:55:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0005_session_topic"
down_revision = "0004_project_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("session", sa.Column("topic", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("session", "topic")
