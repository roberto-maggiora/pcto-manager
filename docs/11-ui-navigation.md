# Information Architecture & Routing (MVP)

## Routes
- /login

App (tenant = school)
- /app/dashboard
- /app/classes
- /app/students
- /app/projects
- /app/projects/new
- /app/projects/:projectId
  - tabs:
    - overview
    - sessions
    - attendance
    - exports
- /app/exports
- /app/settings/school

## Navigation rules
- After login, redirect to /app/dashboard
- Always show SchoolBadge in topbar
- If token missing/expired -> redirect /login
- If API returns 401 -> logout + redirect /login
- If API returns 404 on resource -> show NotFound view (do not reveal cross-tenant resources)

## RBAC (MVP)
- school_admin:
  - all routes
- tutor_school:
  - dashboard, students/classes read-only (optional), projects + sessions + attendance + exports
  - settings/school read-only or hidden
- tutor_provider (future):
  - only attendance and exports (if allowed)
- student (future):
  - dedicated portal out of scope

## API mapping (frontend reference)
Auth:
- POST /v1/auth/login -> access_token

Branding:
- GET  /v1/school/branding
- PATCH /v1/school/branding
- POST /v1/files/upload-logo (multipart field: "upload")
- POST /v1/exports/school-header
- GET  /v1/exports/{export_id}/download

Classi:
- POST /v1/classes
- GET  /v1/classes

Studenti:
- POST /v1/students
- GET  /v1/students?class_id=...

Progetti:
- POST /v1/projects (status required; UI sets default "draft")
- GET  /v1/projects
- GET  /v1/projects/{id}

Sessioni:
- POST /v1/projects/{id}/sessions
- GET  /v1/projects/{id}/sessions

Presenze:
- POST /v1/sessions/{session_id}/attendance
  Body: list of { student_id, status, hours }

Export registro presenze:
- POST /v1/exports/projects/{project_id}/attendance-register
- GET  /v1/exports/{export_id}/download

## Notes (implementation)
- Prefer server-side defaults later (e.g., status default "draft").
- Date formatting in UI: dd/mm/yyyy and dd/mm/yyyy HH:MM.
- Export downloads should open in new tab or trigger file download.
