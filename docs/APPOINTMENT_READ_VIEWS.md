# Clinic Cloud + Appointment Read Views

Phase 19 implements read-only internal appointment views:

- `/appointments`
- `/appointments/[appointmentId]`

Appointment mutation was intentionally out of scope in Phase 19. Phase 23 now adds browser-local update/cancel behavior on Appointment Detail; see docs/APPOINTMENT_MUTATIONS.md.

## Authorization

Both routes begin from the trusted current Web user.

PATIENT identities are redirected to:

`/dashboard`

before internal appointment data is loaded.

Read projections use:

- `getAuthorizedAppointments(user)`
- `getAuthorizedAppointmentById(user, appointmentId)`
- `getAuthorizedPatientById(user, patientId)`

The feature does not import private Base JSON or unrestricted private data access directly.

### DOCTOR

DOCTOR appointment collections and direct appointment lookup remain restricted to appointments assigned to the authenticated user's `linkedDoctorId`.

For the seeded DOC-001 identity, the current Base Dataset exposes 8 of 30 appointments.

### Missing vs forbidden detail

Missing appointment IDs and existing appointments outside the user's role scope both resolve to the same generic not-found experience.

This prevents direct URL probing from exposing whether an appointment record exists.

## Appointment List

`/appointments` displays the authorized role scope.

### Filters

Server query-string filters:

- `status`
- `date`

Examples:

`/appointments?status=CONFIRMED`

`/appointments?date=2026-10-01`

`/appointments?status=CONFIRMED&date=2026-10-01`

Status filtering uses only the supported appointment statuses:

- SCHEDULED
- CONFIRMED
- CHECKED_IN
- COMPLETED
- CANCELLED

Unknown status values are treated as no status filter and never create/fabricate records.

Date filtering is applied after authorization.

A Demo day shortcut uses:

`2026-10-01`

### Responsive results

Mobile/tablet uses stacked appointment cards.

Desktop uses the official shadcn Table.

Each row/card contains:

- date/time
- patient name
- HN
- Appointment ID
- service
- doctor
- status
- Open appointment action

Status meaning uses the shared StatusBadge and never relies only on color.

## Appointment Detail

`/appointments/[appointmentId]` is read-only in Phase 19.

It shows:

- Appointment ID
- status
- date/time
- patient context
- patient HN
- service
- doctor
- existing synthetic appointment note

The Clinical Context Rail pattern is reused for patient identity.

The page provides workflow links to:

- related Patient Detail
- Queue
- Appointment list

Phase 19 exposed no create/edit/cancel controls. Create was added in Phase 22 and Appointment Detail update/cancel controls were added in Phase 23.

## shadcn Select

Phase 19 adds the official:

`components/ui/select.tsx`

after reviewing shadcn Select docs and dry-run output.

The Status filter uses Base UI Select with a form `name`, and `itemToStringLabel` ensures values such as:

`CHECKED_IN`

are presented to users as:

`CHECKED IN`

while the submitted value remains the stable status code.

## States

### Loading

Both list and detail routes provide bounded LoadingState UI.

### Empty list

Filtered lists with no authorized records show a specific EmptyState and Clear filters action.

### Not found

Appointment detail uses a generic unavailable state for both missing and outside-scope IDs.

### Error

List and detail error boundaries provide:

- clear error context
- authorization-safe wording
- explicit Try again action

## Read-Only Boundary

Phase 19 contains no browser-storage API usage.

It does not:

- create appointments
- update appointments
- cancel appointments
- write Base JSON
- write local demo state

The appointment detail explicitly communicates that editing is enabled only in a later phase.

## Tests

`tests/appointments/appointment-read.test.tsx` verifies:

- STAFF 30-record Base scope
- status/date filtering
- unknown-filter safety
- DOC-001 8-record assigned scope
- appointment detail authorization
- missing appointment null semantics
- list filters
- patient/status/detail-link rendering
- doctor-specific wording
- no-result state
- read-only detail UI
- loading/not-found/error states
- no fake rows in an explicit empty projection

`tests/appointments/appointment-routes.test.ts` verifies:

- PATIENT internal list redirect before data loading
- server query-param normalization
- PATIENT internal detail redirect before data loading
- missing appointment generic not-found
- authorization failure maps to the same not-found boundary

## Phase Boundary

Phase 19 does not implement:

- localStorage appointment overlay
- create appointment
- update appointment
- cancel appointment
- patient-facing My Appointments
- queue page implementation

Those remain in following focused phases.
