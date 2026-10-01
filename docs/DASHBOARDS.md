# Clinic Cloud + Dashboards

Phase 16 implements role-aware dashboard experiences at:

`/dashboard`

The protected application shell remains responsible for authentication and navigation. Dashboard content is derived from the trusted authenticated user and the authorization/data boundary.

## Deterministic Demo Day

Dashboard operational context uses:

`2026-10-01`

as the seeded demo day.

This date matches the deterministic appointment/queue scenario in the Base Dataset and prevents experiment output from changing because of Vercel/server timezone or the real calendar date.

The dashboard labels this explicitly as the Demo day.

## Dashboard Projection

Role-specific dashboard data is prepared in:

`src/dashboard/projection.ts`

The projection layer does not import private JSON or unrestricted private data access directly.

It composes through:

- `getAuthorizedPatients`
- `getAuthorizedAppointments`
- `getAuthorizedQueue`
- `getAuthorizedPatientById`
- `getAuthorizedPatientHistory`

Public doctor/service/clinic labels are resolved through the public Base data-access module.

## Internal Roles

OWNER, STAFF, NURSE, and DOCTOR use the internal dashboard pattern.

The hierarchy is task-first:

1. role/workspace context
2. Demo day operational summary
3. today's appointments
4. queue needing attention
5. next workflow actions

The dashboard does not use a generic four-card SaaS KPI header. Counts are presented inside one shared operational context surface.

### OWNER

Title:

`Clinic overview`

Includes:

- clinic-wide patient scope
- today's appointments
- active queue
- attention count
- Demo Settings entry
- Clinic Settings action

### STAFF

Title:

`Today’s clinic work`

Includes clinic-wide workflow scope and directs the user toward:

- Find a patient
- Review appointments
- Review queue

### NURSE

Title:

`Care workflow`

Uses the same authorized clinic scope as the MVP role matrix while retaining NURSE role identity.

### DOCTOR

Title:

`Assigned clinical work`

DOCTOR projection remains filtered by the linked doctor identity.

Dashboard appointment and queue content therefore shows only relevant/assigned records.

## PATIENT Dashboard

PATIENT uses a separate personal dashboard component.

The projection requires:

- authenticated PATIENT role
- non-null `linkedPatientId`

It resolves only the linked patient record.

The dashboard includes:

- patient context / HN
- nearest non-cancelled appointment
- active personal queue
- recent personal history
- personal shortcut links

It does not expose internal clinic list/search navigation or another patient's identity.

## States

### Loading

`app/(protected)/dashboard/loading.tsx`

renders a bounded accessible loading state using the shared `LoadingState`.

### Empty

Appointment, queue, and history sections use shared `EmptyState` where their authorized collection is empty.

### Error

`app/(protected)/dashboard/error.tsx`

renders:

- clear dashboard failure context
- actionable error message
- explicit Try again control using the Next.js error-boundary reset callback

## Responsive Layout

Internal dashboard:

- single-column mobile flow
- appointment/workflow sections stack naturally
- wider screens use a primary work column plus secondary queue/actions column

PATIENT dashboard:

- patient context remains full-width
- appointment and queue surfaces become a two-column layout at larger widths
- personal shortcuts use a responsive grid

No nested scroll area is introduced.

## Tests

`tests/dashboard/dashboard.test.tsx` verifies:

- deterministic demo date
- OWNER/STAFF clinic scope
- DOCTOR assigned scope
- PATIENT linked identity only
- task-first internal UI
- OWNER-only Demo Settings dashboard action
- no other patient identity in PATIENT dashboard
- loading state semantics
- actionable error retry

## Phase Boundary

Phase 16 does not implement the destination pages behind:

- Patients
- Appointments
- Queue
- Settings
- My Profile
- My Appointments
- My Queue
- My History

Those focused views are implemented in the following phases.
