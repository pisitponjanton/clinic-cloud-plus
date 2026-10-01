# Clinic Cloud + Patient Profile and Appointments

Phase 25 implements:

- `/me/profile`
- `/me/appointments`

Both routes are patient-facing and resolve data from the authenticated PATIENT identity only.

## Identity Boundary

The patient portal requires:

- role = `PATIENT`
- a non-null `linkedPatientId`

The portal projection resolves:

`authenticated user → linkedPatientId → authorized patient record`

It does not accept a patient ID from:

- query params
- path params
- form input
- client-controlled role data

Personnel identities are redirected from the `/me/*` routes to:

`/dashboard`

before patient portal projections run.

## Data Access

`src/patient-portal/projection.ts`

uses only existing authorization helpers:

- `getAuthorizedPatientById()`
- `getAuthorizedAppointments()`

The feature does not import private Base JSON or unrestricted private data access directly.

## My Profile

`/me/profile` displays the linked synthetic patient record only.

Visible fields:

- full name
- HN
- Patient ID
- clinic ID
- phone
- date of birth
- gender

The page is read-only in the MVP.

No other patient record is listed or searchable from this route.

## My Appointments

The Server Page first supplies only Base appointments already authorized for the current PATIENT identity.

For the seeded `PAT-001` demo identity, Base records are:

- APT-001
- APT-002
- APT-003
- APT-021

### Browser-local merge

The patient appointments view may read the existing browser appointment overlay through the shared client adapter.

The server does not claim visibility into localStorage.

The client performs:

`authorized own Base appointments + browser overlay → merged browser appointments`

and then applies an explicit ownership filter:

`appointment.patientId === linkedPatientId`

before rendering.

This means:

- own Base patches can be reflected in My Appointments
- own locally created appointments can be reflected if present in the browser overlay
- local appointments for another patient are not rendered
- other-patient overlay records do not become visible through the patient UI

The feature does not access `window.localStorage` directly.

## Appointment Sections

### Upcoming appointments

Includes own appointments where:

- date >= demo date `2026-10-01`
- status is not CANCELLED

Sorted by date/time ascending.

### Previous & cancelled

Includes own appointments where:

- date is before demo date, or
- status is CANCELLED

Sorted newest first.

Each appointment card displays:

- Appointment ID
- date
- time
- status
- service
- doctor
- note

Doctor and Service display values are resolved only from public-safe Base data.

## Internal Route Separation

The patient portal intentionally does not link to personnel routes such as:

- `/patients/[patientId]`
- `/appointments/[appointmentId]`
- `/queue`

Patient navigation remains within the patient-facing route family.

Appointment update/cancel remains a personnel workflow.

## States

Both routes include bounded Loading states.

Both routes include retryable Error states.

My Appointments provides independent Empty states for:

- no upcoming appointments
- no previous/cancelled appointments

If browser-local data is malformed/recovered, a warning is shown while valid own appointments remain available.

## Tests

Phase 25 adds:

- `tests/patient-portal/profile-appointments.test.tsx`
- `tests/patient-portal/patient-portal-routes.test.ts`

Verified behavior includes:

- PAT-001 profile resolution from authenticated linked identity
- only PAT-001 Base appointments returned
- personnel identities rejected by patient portal projections
- personnel redirected from `/me/profile`
- personnel redirected from `/me/appointments`
- authenticated PATIENT is passed directly to the projection
- profile renders only linked identity
- own appointments are grouped correctly
- own browser-local update is reflected
- another patient's local-created appointment is filtered and not rendered
- loading/error/retry states

Focused Phase 25 tests:

- 10 passing

Full project suite after Phase 25:

- 234 passing

## Static Boundary Checks

Verified:

- no internal personnel workflow links from the Phase 25 patient UI
- no direct private-data access bypass
- no direct localStorage API use
- semantic design-token/style usage

## Phase Boundary

Phase 25 does not implement:

- My Queue
- My History

Those are implemented in Phase 26.
