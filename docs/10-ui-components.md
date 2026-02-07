# UI Components & States (MVP)

## Layout
- AppShell
  - SidebarNav
  - Topbar (SchoolBadge + Search + UserMenu)
  - Content container

## Navigation
- SidebarItem (icon + label)
- Breadcrumbs (optional)

## Data display
- CardMetric (numero + label + trend optional)
- DataTable
  - sorting basic
  - empty state
  - row actions (kebab menu)
- BadgeStatus
  - draft / active / closed (color mapping)
- Tabs
- ProgressBar (per checklist/percentuali; optional MVP)

## Forms
- TextInput
- NumberInput
- DateInput / DateRange
- DateTimeInput
- Select (single/multi)
- SearchInput
- TextArea
- FileUpload
  - must support multipart field name "upload" for logo endpoint
  - client-side validation: png/jpg preferred; svg allowed but warn “potrebbe non apparire nel PDF”

## Feedback
- Toast (success/error)
- InlineError
- Skeleton loader
- ConfirmModal (delete, close project, overwrite attendance)

## Page patterns
- PageHeader
  - title
  - subtitle
  - primary CTA
  - secondary CTA
- FiltersBar (dropdown + search + date)

## States & Rules
- Loading: skeleton (table rows)
- Empty: call-to-action
- Validation:
  - Project: title required, status required (UI default “draft”), end_date >= start_date
  - Session: end > start, planned_hours >= 0
  - Attendance: hours >= 0; status ∈ {present, absent}
- Permissions (RBAC - MVP)
  - school_admin: full
  - tutor_school: view projects + manage attendance + export
  - tutor_provider (future): manage attendance provider approval only

## Italian microcopy (default)
- “Nuovo progetto”, “Crea sessione”, “Salva presenze”
- “Esporta Registro Presenze (PDF)”
- Status:
  - present = “Presente”
  - absent = “Assente”
  - draft = “Bozza”
  - active = “Attivo”
  - closed = “Chiuso”
