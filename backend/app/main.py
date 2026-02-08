from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import (
    Depends,
    FastAPI,
    File as UploadFileField,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import delete, func
from sqlmodel import Session, select

from app.core.config import settings
from app.core.deps import get_current_user, require_school
from app.core.security import create_access_token, verify_password
from app.db import get_session
from app.models import (
    Attendance,
    AttendanceStatus,
    ClassRoom,
    Export,
    File,
    Project,
    ProjectStatus,
    School,
    SchoolBranding,
    Session as ProjectSession,
    SessionStatus,
    Student,
    User,
)
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


app = FastAPI(title="School PCTO API")

if settings.environment != "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/v1/auth/login")
def login(
    payload: LoginRequest, session: Session = Depends(get_session)
) -> dict:
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    token = create_access_token(user.id, user.role, user.school_id)
    return {"access_token": token, "token_type": "bearer"}


class ProjectCreate(BaseModel):
    title: str
    status: ProjectStatus
    start_date: date
    end_date: date
    class_id: UUID
    description: str | None = None
    school_tutor_name: str | None = None
    provider_expert_name: str | None = None
    total_hours: float | None = None


class ProjectUpdate(BaseModel):
    title: str | None = None
    status: ProjectStatus | None = None
    start_date: date | None = None
    end_date: date | None = None
    class_id: UUID | None = None
    description: str | None = None
    school_tutor_name: str | None = None
    provider_expert_name: str | None = None
    total_hours: float | None = None


class BrandingResponse(BaseModel):
    header_text: str | None = None
    footer_text: str | None = None
    primary_color: str | None = None
    logo_file_id: UUID | None = None
    updated_at: datetime | None = None


class BrandingUpdate(BaseModel):
    header_text: str | None = None
    footer_text: str | None = None
    primary_color: str | None = None
    logo_file_id: UUID | None = None


class SessionCreate(BaseModel):
    start: datetime
    end: datetime
    planned_hours: float
    topic: str | None = None
    status: SessionStatus | None = None


class SessionUpdate(BaseModel):
    start: datetime | None = None
    end: datetime | None = None
    planned_hours: float | None = None
    topic: str | None = None
    status: SessionStatus | None = None


class AttendanceUpsertItem(BaseModel):
    student_id: UUID
    status: AttendanceStatus
    hours: float


class AttendanceRead(BaseModel):
    student_id: UUID
    status: AttendanceStatus
    hours: float


class ClassCreate(BaseModel):
    year: int
    section: str


class ClassUpdate(BaseModel):
    year: int | None = None
    section: str | None = None
    name: str | None = None


class StudentCreate(BaseModel):
    class_id: UUID
    first_name: str
    last_name: str
    pcto_required_hours: int | None = None


class StudentUpdate(BaseModel):
    class_id: UUID | None = None
    first_name: str | None = None
    last_name: str | None = None
    pcto_required_hours: int | None = None


class StudentMetric(BaseModel):
    student_id: UUID
    completed_hours: float


class StudentProjectSummary(BaseModel):
    project_id: UUID
    title: str
    status: ProjectStatus
    completed_hours: float
    last_session_end: datetime | None


class StudentSummary(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    class_id: UUID
    class_year: int
    class_section: str
    pcto_required_hours: int
    completed_hours_total: float
    by_project: list[StudentProjectSummary]


@app.post("/v1/projects", response_model=Project)
def create_project(
    payload: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Project:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    if payload.total_hours is not None and payload.total_hours < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="total_hours must be >= 0",
        )
    classroom = session.exec(
        select(ClassRoom).where(
            ClassRoom.id == payload.class_id,
            ClassRoom.school_id == current_user.school_id,
        )
    ).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    project = Project(
        school_id=current_user.school_id,
        class_id=payload.class_id,
        title=payload.title,
        status=payload.status,
        start_date=payload.start_date,
        end_date=payload.end_date,
        description=payload.description,
        school_tutor_name=payload.school_tutor_name,
        provider_expert_name=payload.provider_expert_name,
        total_hours=payload.total_hours,
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@app.get("/v1/projects", response_model=list[Project])
def list_projects(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[Project]:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    return list(
        session.exec(
            select(Project).where(Project.school_id == current_user.school_id)
        ).all()
    )


@app.post("/v1/classes", response_model=ClassRoom)
def create_class(
    payload: ClassCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ClassRoom:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    exists = session.exec(
        select(ClassRoom).where(
            ClassRoom.school_id == current_user.school_id,
            ClassRoom.year == payload.year,
            ClassRoom.section == payload.section,
        )
    ).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Classe già esistente")

    class_name = f"{payload.year}{payload.section}"
    class_row = ClassRoom(
        school_id=current_user.school_id,
        name=class_name,
        year=payload.year,
        section=payload.section,
    )
    session.add(class_row)
    session.commit()
    session.refresh(class_row)
    return class_row


@app.patch("/v1/classes/{class_id}", response_model=ClassRoom)
def update_class(
    class_id: UUID,
    payload: ClassUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ClassRoom:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    class_row = session.exec(
        select(ClassRoom).where(
            ClassRoom.id == class_id,
            ClassRoom.school_id == current_user.school_id,
        )
    ).first()
    if not class_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    data = payload.model_dump(exclude_unset=True)
    next_year = data.get("year", class_row.year)
    next_section = data.get("section", class_row.section)
    if (
        next_year != class_row.year
        or next_section != class_row.section
    ):
        exists = session.exec(
            select(ClassRoom).where(
                ClassRoom.school_id == current_user.school_id,
                ClassRoom.year == next_year,
                ClassRoom.section == next_section,
                ClassRoom.id != class_id,
            )
        ).first()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Classe già esistente"
            )

    if "name" not in data:
        data["name"] = f"{next_year}{next_section}"

    for key, value in data.items():
        setattr(class_row, key, value)
    session.commit()
    session.refresh(class_row)
    return class_row


@app.delete("/v1/classes/{class_id}")
def delete_class(
    class_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    class_row = session.exec(
        select(ClassRoom).where(
            ClassRoom.id == class_id,
            ClassRoom.school_id == current_user.school_id,
        )
    ).first()
    if not class_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    has_students = session.exec(
        select(Student.id).where(
            Student.class_id == class_id,
            Student.school_id == current_user.school_id,
        )
    ).first()
    if has_students:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossibile eliminare: la classe ha studenti",
        )

    session.delete(class_row)
    session.commit()
    return {"deleted": True}


@app.get("/v1/classes", response_model=list[ClassRoom])
def list_classes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[ClassRoom]:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    return list(
        session.exec(
            select(ClassRoom).where(ClassRoom.school_id == current_user.school_id)
        ).all()
    )


@app.post("/v1/students", response_model=Student)
def create_student(
    payload: StudentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Student:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    classroom = session.exec(
        select(ClassRoom).where(
            ClassRoom.id == payload.class_id,
            ClassRoom.school_id == current_user.school_id,
        )
    ).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if payload.pcto_required_hours is not None and payload.pcto_required_hours < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="pcto_required_hours must be >= 0",
        )
    student = Student(
        school_id=current_user.school_id,
        class_id=payload.class_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        pcto_required_hours=payload.pcto_required_hours or 150,
    )
    session.add(student)
    session.commit()
    session.refresh(student)
    return student


@app.get("/v1/students", response_model=list[Student])
def list_students(
    class_id: UUID | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[Student]:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    query = select(Student).where(Student.school_id == current_user.school_id)
    if class_id:
        classroom = session.exec(
            select(ClassRoom).where(
                ClassRoom.id == class_id,
                ClassRoom.school_id == current_user.school_id,
            )
        ).first()
        if not classroom:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        query = query.where(Student.class_id == class_id)
    return list(session.exec(query).all())


@app.patch("/v1/students/{student_id}", response_model=Student)
def update_student(
    student_id: UUID,
    payload: StudentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Student:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    student = session.exec(
        select(Student).where(
            Student.id == student_id,
            Student.school_id == current_user.school_id,
        )
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    data = payload.model_dump(exclude_unset=True)
    if "class_id" in data:
        classroom = session.exec(
            select(ClassRoom).where(
                ClassRoom.id == data["class_id"],
                ClassRoom.school_id == current_user.school_id,
            )
        ).first()
        if not classroom:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if "pcto_required_hours" in data and data["pcto_required_hours"] is not None:
        if data["pcto_required_hours"] < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pcto_required_hours must be >= 0",
            )

    for key, value in data.items():
        setattr(student, key, value)
    session.commit()
    session.refresh(student)
    return student


@app.delete("/v1/students/{student_id}")
def delete_student(
    student_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    student = session.exec(
        select(Student).where(
            Student.id == student_id,
            Student.school_id == current_user.school_id,
        )
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    session.exec(
        delete(Attendance).where(
            Attendance.student_id == student_id,
            Attendance.school_id == current_user.school_id,
        )
    )
    session.delete(student)
    session.commit()
    return {"deleted": True}


@app.get("/v1/students/metrics", response_model=list[StudentMetric])
def list_student_metrics(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[StudentMetric]:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    rows = session.exec(
        select(
            Student.id,
            func.coalesce(func.sum(Attendance.hours), 0.0),
        )
        .outerjoin(
            Attendance,
            (Attendance.student_id == Student.id)
            & (Attendance.school_id == current_user.school_id),
        )
        .where(Student.school_id == current_user.school_id)
        .group_by(Student.id)
    ).all()
    return [
        StudentMetric(student_id=row[0], completed_hours=float(row[1] or 0.0))
        for row in rows
    ]


@app.get("/v1/students/{student_id}/summary", response_model=StudentSummary)
def get_student_summary(
    student_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> StudentSummary:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    row = session.exec(
        select(Student, ClassRoom).where(
            Student.id == student_id,
            Student.school_id == current_user.school_id,
            ClassRoom.id == Student.class_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    student, classroom = row

    total_hours = session.exec(
        select(func.coalesce(func.sum(Attendance.hours), 0.0)).where(
            Attendance.student_id == student_id,
            Attendance.school_id == current_user.school_id,
        )
    ).one()

    project_rows = session.exec(
        select(
            Project.id,
            Project.title,
            Project.status,
            func.coalesce(func.sum(Attendance.hours), 0.0),
            func.max(ProjectSession.end),
        )
        .join(ProjectSession, ProjectSession.project_id == Project.id)
        .join(Attendance, Attendance.session_id == ProjectSession.id)
        .where(
            Attendance.student_id == student_id,
            Attendance.school_id == current_user.school_id,
            Project.school_id == current_user.school_id,
            ProjectSession.school_id == current_user.school_id,
        )
        .group_by(Project.id)
        .order_by(Project.title)
    ).all()

    return StudentSummary(
        id=student.id,
        first_name=student.first_name,
        last_name=student.last_name,
        class_id=student.class_id,
        class_year=classroom.year,
        class_section=classroom.section,
        pcto_required_hours=student.pcto_required_hours,
        completed_hours_total=float(total_hours or 0.0),
        by_project=[
            StudentProjectSummary(
                project_id=row[0],
                title=row[1],
                status=row[2],
                completed_hours=float(row[3] or 0.0),
                last_session_end=row[4],
            )
            for row in project_rows
        ],
    )


@app.get("/v1/projects/{project_id}", response_model=Project)
def get_project(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Project:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    project = session.exec(
        select(Project).where(
            Project.id == project_id, Project.school_id == current_user.school_id
        )
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return project


@app.patch("/v1/projects/{project_id}", response_model=Project)
@app.patch("/v1/projects/{project_id}/", response_model=Project)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Project:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    project = session.exec(
        select(Project).where(
            Project.id == project_id, Project.school_id == current_user.school_id
        )
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    data = payload.model_dump(exclude_unset=True)
    if "total_hours" in data and data["total_hours"] is not None:
        if data["total_hours"] < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="total_hours must be >= 0",
            )
    if "class_id" in data:
        classroom = session.exec(
            select(ClassRoom).where(
                ClassRoom.id == data["class_id"],
                ClassRoom.school_id == current_user.school_id,
            )
        ).first()
        if not classroom:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    for key, value in data.items():
        setattr(project, key, value)
    session.commit()
    session.refresh(project)
    return project


@app.delete("/v1/projects/{project_id}")
def delete_project(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    project = session.exec(
        select(Project).where(
            Project.id == project_id, Project.school_id == current_user.school_id
        )
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    session_ids = list(
        session.exec(
            select(ProjectSession.id).where(
                ProjectSession.project_id == project_id,
                ProjectSession.school_id == current_user.school_id,
            )
        ).all()
    )
    if session_ids:
        session.exec(
            delete(Attendance).where(
                Attendance.session_id.in_(session_ids),
                Attendance.school_id == current_user.school_id,
            )
        )
    session.exec(
        delete(ProjectSession).where(
            ProjectSession.project_id == project_id,
            ProjectSession.school_id == current_user.school_id,
        )
    )
    session.delete(project)
    session.commit()
    return {"deleted": True}


@app.post("/v1/projects/{project_id}/sessions", response_model=ProjectSession)
def create_session(
    project_id: UUID,
    payload: SessionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ProjectSession:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    project = session.exec(
        select(Project).where(
            Project.id == project_id, Project.school_id == current_user.school_id
        )
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if payload.end <= payload.start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="End must be after start"
        )
    if payload.planned_hours < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="planned_hours must be >= 0",
        )
    new_session = ProjectSession(
        school_id=current_user.school_id,
        project_id=project.id,
        start=payload.start,
        end=payload.end,
        planned_hours=payload.planned_hours,
        topic=payload.topic,
        status=payload.status or SessionStatus.scheduled,
    )
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    return new_session


@app.get("/v1/projects/{project_id}/sessions", response_model=list[ProjectSession])
def list_sessions(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[ProjectSession]:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    project = session.exec(
        select(Project).where(
            Project.id == project_id, Project.school_id == current_user.school_id
        )
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return list(
        session.exec(
            select(ProjectSession).where(
                ProjectSession.project_id == project_id,
                ProjectSession.school_id == current_user.school_id,
            )
        ).all()
    )


@app.patch("/v1/sessions/{session_id}", response_model=ProjectSession)
def update_session(
    session_id: UUID,
    payload: SessionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ProjectSession:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    project_session = session.exec(
        select(ProjectSession).where(
            ProjectSession.id == session_id,
            ProjectSession.school_id == current_user.school_id,
        )
    ).first()
    if not project_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    data = payload.model_dump(exclude_unset=True)
    next_start = data.get("start", project_session.start)
    next_end = data.get("end", project_session.end)
    if next_end <= next_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="End must be after start"
        )
    if payload.planned_hours is not None and payload.planned_hours < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="planned_hours must be >= 0",
        )

    for key, value in data.items():
        setattr(project_session, key, value)
    session.commit()
    session.refresh(project_session)
    return project_session


@app.delete("/v1/sessions/{session_id}")
def delete_session(
    session_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    project_session = session.exec(
        select(ProjectSession).where(
            ProjectSession.id == session_id,
            ProjectSession.school_id == current_user.school_id,
        )
    ).first()
    if not project_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    session.exec(
        delete(Attendance).where(
            Attendance.session_id == session_id,
            Attendance.school_id == current_user.school_id,
        )
    )
    session.delete(project_session)
    session.commit()
    return {"deleted": True}


@app.post("/v1/sessions/{session_id}/attendance")
def upsert_attendance(
    session_id: UUID,
    items: list[AttendanceUpsertItem],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no school",
        )
    project_session = session.exec(
        select(ProjectSession).where(
            ProjectSession.id == session_id,
            ProjectSession.school_id == current_user.school_id,
        )
    ).first()
    if not project_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    student_ids = [item.student_id for item in items]
    if not student_ids:
        return {"updated": 0}

    students = list(
        session.exec(
            select(Student).where(
                Student.school_id == current_user.school_id,
                Student.id.in_(student_ids),
            )
        ).all()
    )
    if len(students) != len(set(student_ids)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    existing = {
        (row.student_id): row
        for row in session.exec(
            select(Attendance).where(
                Attendance.session_id == session_id,
                Attendance.school_id == current_user.school_id,
                Attendance.student_id.in_(student_ids),
            )
        ).all()
    }

    for item in items:
        row = existing.get(item.student_id)
        if row:
            row.status = item.status
            row.hours = item.hours
        else:
            session.add(
                Attendance(
                    school_id=current_user.school_id,
                    session_id=session_id,
                    student_id=item.student_id,
                    status=item.status,
                    hours=item.hours,
                )
            )
    session.commit()
    return {"updated": len(items)}


@app.get("/v1/sessions/{session_id}/attendance", response_model=list[AttendanceRead])
def get_attendance(
    session_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[AttendanceRead]:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User has no school"
        )
    project_session = session.exec(
        select(ProjectSession).where(
            ProjectSession.id == session_id,
            ProjectSession.school_id == current_user.school_id,
        )
    ).first()
    if not project_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    rows = session.exec(
        select(Attendance).where(
            Attendance.session_id == session_id,
            Attendance.school_id == current_user.school_id,
        )
    ).all()
    return [
        AttendanceRead(student_id=row.student_id, status=row.status, hours=row.hours)
        for row in rows
    ]


@app.post("/v1/attendance/{attendance_id}/approve/provider")
def approve_attendance_provider(
    attendance_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User has no school"
        )
    row = session.exec(
        select(Attendance).where(
            Attendance.id == attendance_id,
            Attendance.school_id == current_user.school_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    row.approved_by_provider = True
    session.commit()
    return {"status": "ok"}


@app.post("/v1/attendance/{attendance_id}/approve/school")
def approve_attendance_school(
    attendance_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User has no school"
        )
    row = session.exec(
        select(Attendance).where(
            Attendance.id == attendance_id,
            Attendance.school_id == current_user.school_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    row.approved_by_school = True
    session.commit()
    return {"status": "ok"}


def _get_storage_base() -> Path:
    base = Path(settings.storage_dir)
    return base if base.is_absolute() else (Path.cwd() / base)


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _draw_school_header(
    c: canvas.Canvas,
    school: School,
    branding: SchoolBranding | None,
    logo: File | None,
    page_width: float,
    page_height: float,
) -> float:
    text_y = page_height - 80
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, text_y, school.name)
    c.setFont("Helvetica", 10)
    c.drawString(72, text_y - 16, f"{school.address}, {school.city} ({school.province})")
    c.drawString(72, text_y - 32, f"{school.email} | {school.phone}")

    if branding and branding.header_text:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(72, text_y - 56, branding.header_text)

    if logo and logo.url and logo.url.lower().endswith((".png", ".jpg", ".jpeg")):
        try:
            image = ImageReader(logo.url)
            c.drawImage(image, page_width - 160, page_height - 120, width=80, height=80, mask="auto")
        except Exception:
            pass

    return text_y - 72


def _format_dt(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%d/%m/%Y %H:%M")


@app.get("/v1/school/branding", response_model=BrandingResponse)
def get_branding(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> BrandingResponse:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User has no school"
        )
    branding = session.exec(
        select(SchoolBranding).where(SchoolBranding.school_id == current_user.school_id)
    ).first()
    if not branding:
        return BrandingResponse()
    return BrandingResponse(
        header_text=branding.header_text,
        footer_text=branding.footer_text,
        primary_color=branding.primary_color,
        logo_file_id=branding.logo_file_id,
        updated_at=branding.updated_at,
    )


@app.patch("/v1/school/branding", response_model=BrandingResponse)
def update_branding(
    payload: BrandingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> BrandingResponse:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User has no school"
        )
    branding = session.exec(
        select(SchoolBranding).where(SchoolBranding.school_id == current_user.school_id)
    ).first()
    if not branding:
        branding = SchoolBranding(school_id=current_user.school_id)
        session.add(branding)

    data = payload.model_dump(exclude_unset=True)
    if "logo_file_id" in data and data["logo_file_id"]:
        logo = session.exec(
            select(File).where(
                File.id == data["logo_file_id"],
                File.school_id == current_user.school_id,
            )
        ).first()
        if not logo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    for key, value in data.items():
        setattr(branding, key, value)
    branding.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(branding)
    return BrandingResponse(
        header_text=branding.header_text,
        footer_text=branding.footer_text,
        primary_color=branding.primary_color,
        logo_file_id=branding.logo_file_id,
        updated_at=branding.updated_at,
    )


@app.post("/v1/files/upload-logo")
def upload_logo(
    upload: UploadFile = UploadFileField(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User has no school"
        )
    content_type = (upload.content_type or "").lower()
    allowed = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/svg+xml": "svg",
    }
    if content_type not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")

    file_id = uuid4()
    ext = allowed[content_type]
    base = _get_storage_base()
    target_dir = base / str(current_user.school_id) / "logos"
    _ensure_dir(target_dir)
    file_path = target_dir / f"{file_id}.{ext}"
    with file_path.open("wb") as handle:
        handle.write(upload.file.read())

    file_row = File(
        id=file_id,
        school_id=current_user.school_id,
        name=upload.filename or f"logo.{ext}",
        content_type=content_type,
        url=str(file_path),
    )
    session.add(file_row)
    session.commit()
    return {"file_id": str(file_id)}


@app.post("/v1/exports/school-header")
def export_school_header(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User has no school"
        )
    school = session.exec(
        select(School).where(School.id == current_user.school_id)
    ).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    branding = session.exec(
        select(SchoolBranding).where(SchoolBranding.school_id == current_user.school_id)
    ).first()

    base = _get_storage_base()
    export_dir = base / str(current_user.school_id) / "exports"
    _ensure_dir(export_dir)
    export_id = uuid4()
    pdf_path = export_dir / f"{export_id}.pdf"

    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    width, height = letter

    logo = None
    if branding and branding.logo_file_id:
        logo = session.exec(
            select(File).where(
                File.id == branding.logo_file_id,
                File.school_id == current_user.school_id,
            )
        ).first()

    _draw_school_header(c, school, branding, logo, width, height)

    if branding and branding.footer_text:
        c.setFont("Helvetica", 10)
        c.drawString(72, 40, branding.footer_text)

    c.showPage()
    c.save()

    export_row = Export(
        id=export_id,
        school_id=current_user.school_id,
        kind="school_header",
        file_path=str(pdf_path),
    )
    session.add(export_row)
    session.commit()

    return {"export_id": str(export_id)}


@app.post("/v1/exports/projects/{project_id}/attendance-register")
def export_attendance_register(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User has no school"
        )
    project = session.exec(
        select(Project).where(
            Project.id == project_id, Project.school_id == current_user.school_id
        )
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    school = session.exec(
        select(School).where(School.id == current_user.school_id)
    ).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    branding = session.exec(
        select(SchoolBranding).where(SchoolBranding.school_id == current_user.school_id)
    ).first()

    sessions_list = list(
        session.exec(
            select(ProjectSession).where(
                ProjectSession.project_id == project_id,
                ProjectSession.school_id == current_user.school_id,
            )
        ).all()
    )
    if sessions_list:
        attendance_rows = list(
            session.exec(
                select(Attendance).where(
                    Attendance.school_id == current_user.school_id,
                    Attendance.session_id.in_([s.id for s in sessions_list]),
                )
            ).all()
        )
    else:
        attendance_rows = []

    student_ids = {row.student_id for row in attendance_rows}
    if student_ids:
        students = {
            student.id: student
            for student in session.exec(
                select(Student).where(
                    Student.school_id == current_user.school_id,
                    Student.id.in_(student_ids),
                )
            ).all()
        }
    else:
        students = {}

    totals: dict[UUID, float] = {}
    approvals: dict[UUID, tuple[bool, bool]] = {}
    for row in attendance_rows:
        totals[row.student_id] = totals.get(row.student_id, 0.0) + row.hours
        approvals[row.student_id] = (
            approvals.get(row.student_id, (True, True))[0] and row.approved_by_provider,
            approvals.get(row.student_id, (True, True))[1] and row.approved_by_school,
        )

    base = _get_storage_base()
    export_dir = base / str(current_user.school_id) / "exports"
    _ensure_dir(export_dir)
    export_id = uuid4()
    pdf_path = export_dir / f"{export_id}.pdf"

    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    width, height = letter

    logo = None
    if branding and branding.logo_file_id:
        logo = session.exec(
            select(File).where(
                File.id == branding.logo_file_id,
                File.school_id == current_user.school_id,
            )
        ).first()

    cursor_y = _draw_school_header(c, school, branding, logo, width, height)

    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, cursor_y - 12, "Registro Presenze PCTO")
    c.setFont("Helvetica", 10)
    c.drawString(
        72, cursor_y - 28, f"Progetto: {project.title} ({project.status})"
    )

    cursor_y -= 52
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, cursor_y, "Sessioni")
    c.setFont("Helvetica", 9)
    for sess in sessions_list:
        cursor_y -= 12
        c.drawString(
            84,
            cursor_y,
            f"{_format_dt(sess.start)} - {_format_dt(sess.end)} ({sess.planned_hours}h)",
        )

    cursor_y -= 20
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, cursor_y, "Totale ore studenti")
    c.setFont("Helvetica", 9)
    for student_id, total_hours in totals.items():
        student = students.get(student_id)
        if not student:
            continue
        provider_ok, school_ok = approvals.get(student_id, (False, False))
        cursor_y -= 12
        provider_label = "approvato" if provider_ok else "in attesa"
        school_label = "approvato" if school_ok else "in attesa"
        c.drawString(
            84,
            cursor_y,
            f"{student.last_name} {student.first_name} - {total_hours}h "
            f"(tutor aziendale: {provider_label}, "
            f"tutor scolastico: {school_label})",
        )

    if branding and branding.footer_text:
        c.setFont("Helvetica", 10)
        c.drawString(72, 40, branding.footer_text)

    c.showPage()
    c.save()

    export_row = Export(
        id=export_id,
        school_id=current_user.school_id,
        kind="attendance_register",
        file_path=str(pdf_path),
    )
    session.add(export_row)
    session.commit()
    return {"export_id": str(export_id)}


@app.get("/v1/exports/{export_id}/download")
def download_export(
    export_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    export_row = session.exec(
        select(Export).where(
            Export.id == export_id, Export.school_id == current_user.school_id
        )
    ).first()
    if not export_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return FileResponse(export_row.file_path, media_type="application/pdf")


@app.get("/v1/schools/{school_id}/guarded")
def guarded_route(
    school_id: UUID,
    _current_user: User = Depends(require_school),
) -> dict:
    return {"school_id": str(school_id)}
