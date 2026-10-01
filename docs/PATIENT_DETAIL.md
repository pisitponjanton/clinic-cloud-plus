# Clinic Cloud + Patient Detail

Phase 18 implements the authorized personnel patient-detail route:

`/patients/[patientId]`

## Purpose

The page supports the core personnel workflow:

`Search patient → Open Patient Detail → Inspect appointment context/history`

It intentionally does not implement appointment mutation.

## Authorization

The route begins from the trusted Web session.

PATIENT identities are redirected to:

`/dashboard`

before internal patient-detail data is loaded.

Patient detail projection is built through:

- `getAuthorizedPatientById(user, patientId)`
- `getAuthorizedAppointments(user)`
- `getAuthorizedPatientHistory(user, patientId)`

No private JSON or unrestricted private data-access module is imported by the patient-detail feature.

### Missing vs forbidden patient

A missing patient and an existing patient outside the current role scope both resolve to the same generic not-found experience.

This avoids exposing patient-record existence through direct URL probing.

## Layout

The page follows the Clinic Cloud +:

`Context → Work → Continuation`

pattern.

### Clinical Context Rail

Patient identity is shown in a dedicated context panel containing:

- full name
- HN
- Patient ID
- phone
- date of birth
- gender

At wide layouts the context rail remains alongside the workflow content.

### Appointment Context

Authorized appointments for the selected patient are shown with:

- Appointment ID
- date/time
- status
- service
- doctor
- existing synthetic note

Records are ordered newest context first.

For DOCTOR, appointment context remains constrained by the linked-doctor authorization boundary.

For the seeded `PAT-001` scenario, DOC-001 sees only appointments assigned to DOC-001.

The appointment context is an explicitly labelled accessible region.

### Patient History

Authorized synthetic history records are displayed newest first.

Each entry may show:

- history ID
- date
- exact synthetic summary from Base Data
- doctor public display name
- linked Appointment ID when present

The UI does not invent diagnosis or additional clinical information.

History is a separate accessible region from appointment context so linked appointment IDs inside history cannot be confused with appointment-list visibility.

## Navigation

The page provides:

- Back to patients → `/patients`
- View appointments → `/appointments`
- Continue to queue → `/queue`

The appointment and queue destination pages are implemented in later phases.

## States

### Loading

`loading.tsx` uses the shared bounded LoadingState.

### Empty

Appointment context and Patient History each provide independent EmptyState behavior.

### Not Found / Outside Scope

`not-found.tsx` uses generic wording:

the patient was not found **or** is unavailable in the current role scope.

### Error

`error.tsx` provides:

- clear failure context
- authorization-safe wording
- explicit Try again action

## Responsive Behavior

Mobile/tablet:

- patient context appears before work content
- appointment contexts stack naturally
- history entries use a compact vertical structure

Wide screens:

- Clinical Context Rail occupies a fixed context column
- appointment/history workflow remains the primary content column
- no nested scrolling is introduced

## Tests

`tests/patients/patient-detail.test.tsx` verifies:

- seeded PAT-001 STAFF context
- Base appointment ordering including APT-021
- DOCTOR assigned appointment scope
- unauthorized DOCTOR patient rejection
- missing patient returns null rather than fake data
- patient summary rendering
- appointment/history rendering
- navigation
- doctor-specific scope copy
- independent empty states
- loading/not-found/error states

`tests/patients/patient-detail-route.test.ts` verifies:

- PATIENT direct URL redirect before private detail loading
- missing patient maps to generic not-found
- authorization failure maps to the same generic not-found boundary

## Phase Boundary

Phase 18 does not implement:

- full `/appointments` list/detail views
- create appointment
- update appointment
- cancel appointment
- queue page implementation

Those remain in following focused phases.
