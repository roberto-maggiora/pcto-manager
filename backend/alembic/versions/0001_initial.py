"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2026-02-07
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "school",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("legal_name", sa.String(), nullable=True),
        sa.Column("address", sa.String(), nullable=False),
        sa.Column("city", sa.String(), nullable=False),
        sa.Column("province", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("logo_file_id", sa.Uuid(), nullable=True),
    )

    op.create_table(
        "file",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("school_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["school.id"]),
    )

    op.create_table(
        "user",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("school_id", sa.Uuid(), nullable=True),
        sa.Column(
            "role",
            sa.Enum(
                "platform_admin",
                "school_admin",
                "tutor_school",
                "tutor_provider",
                "student",
                name="userrole",
            ),
            nullable=False,
        ),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["school.id"]),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_user_email", "user", ["email"])

    op.create_table(
        "classroom",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("school_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["school.id"]),
    )

    op.create_table(
        "student",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("school_id", sa.Uuid(), nullable=False),
        sa.Column("class_id", sa.Uuid(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["school.id"]),
        sa.ForeignKeyConstraint(["class_id"], ["classroom.id"]),
    )

    op.create_table(
        "project",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("school_id", sa.Uuid(), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=True),
        sa.Column("provider_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("draft", "active", "closed", name="projectstatus"),
            nullable=False,
        ),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["school.id"]),
    )

    op.create_table(
        "session",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("school_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("start", sa.DateTime(), nullable=False),
        sa.Column("end", sa.DateTime(), nullable=False),
        sa.Column("planned_hours", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["school.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
    )

    op.create_table(
        "attendance",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("school_id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("present", "absent", name="attendancestatus"),
            nullable=False,
        ),
        sa.Column("hours", sa.Float(), nullable=False),
        sa.Column("approved_by_provider", sa.Boolean(), nullable=False),
        sa.Column("approved_by_school", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["school.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["session.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["student.id"]),
    )

def downgrade() -> None:
    op.drop_table("attendance")
    op.drop_table("session")
    op.drop_table("project")
    op.drop_table("student")
    op.drop_table("classroom")
    op.drop_index("ix_user_email", table_name="user")
    op.drop_table("user")
    op.drop_table("file")
    op.drop_table("school")
    op.execute("DROP TYPE IF EXISTS attendancestatus")
    op.execute("DROP TYPE IF EXISTS projectstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
