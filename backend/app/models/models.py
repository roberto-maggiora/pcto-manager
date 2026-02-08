from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, Enum as SAEnum
from sqlmodel import Field, SQLModel


class UserRole(str, Enum):
    platform_admin = "platform_admin"
    school_admin = "school_admin"
    tutor_school = "tutor_school"
    tutor_provider = "tutor_provider"
    student = "student"


class ProjectStatus(str, Enum):
    draft = "draft"
    active = "active"
    closed = "closed"


class AttendanceStatus(str, Enum):
    present = "present"
    absent = "absent"


class SessionStatus(str, Enum):
    scheduled = "scheduled"
    done = "done"


class School(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    legal_name: Optional[str] = None
    address: str
    city: str
    province: str
    email: str
    phone: str
    logo_file_id: Optional[UUID] = Field(default=None, foreign_key="file.id")


class File(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    school_id: UUID = Field(foreign_key="school.id")
    name: str
    content_type: Optional[str] = None
    url: Optional[str] = None


class SchoolBranding(SQLModel, table=True):
    school_id: UUID = Field(foreign_key="school.id", primary_key=True)
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    primary_color: Optional[str] = None
    logo_file_id: Optional[UUID] = Field(default=None, foreign_key="file.id")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Export(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    school_id: UUID = Field(foreign_key="school.id")
    kind: str
    file_path: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    school_id: Optional[UUID] = Field(default=None, foreign_key="school.id")
    role: UserRole = Field(sa_column=Column(SAEnum(UserRole), nullable=False))
    email: str = Field(index=True, unique=True)
    password_hash: str


class ClassRoom(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    school_id: UUID = Field(foreign_key="school.id")
    name: str
    year: int
    section: str


class Student(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    school_id: UUID = Field(foreign_key="school.id")
    class_id: UUID = Field(foreign_key="classroom.id")
    first_name: str
    last_name: str
    pcto_required_hours: int = 150


class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    school_id: UUID = Field(foreign_key="school.id")
    class_id: UUID = Field(foreign_key="classroom.id")
    template_id: Optional[UUID] = None
    provider_id: Optional[UUID] = None
    title: str
    status: ProjectStatus = Field(
        sa_column=Column(SAEnum(ProjectStatus), nullable=False)
    )
    start_date: date
    end_date: date
    description: Optional[str] = None
    school_tutor_name: Optional[str] = None
    provider_expert_name: Optional[str] = None
    total_hours: Optional[float] = None


class Session(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    school_id: UUID = Field(foreign_key="school.id")
    project_id: UUID = Field(foreign_key="project.id")
    start: datetime
    end: datetime
    planned_hours: float
    topic: Optional[str] = None
    status: SessionStatus = Field(
        default=SessionStatus.scheduled,
        sa_column=Column(SAEnum(SessionStatus), nullable=False),
    )


class Attendance(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    school_id: UUID = Field(foreign_key="school.id")
    session_id: UUID = Field(foreign_key="session.id")
    student_id: UUID = Field(foreign_key="student.id")
    status: AttendanceStatus = Field(
        sa_column=Column(SAEnum(AttendanceStatus), nullable=False)
    )
    hours: float
    approved_by_provider: bool = False
    approved_by_school: bool = False
