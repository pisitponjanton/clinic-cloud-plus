# Clinic Cloud + Patient Queue and History

Phase 26 implements:

- `/me/queue`
- `/me/history`

Both routes are patient-facing, read-only, and resolve data from the authenticated PATIENT identity only.

## Identity Boundary

The patient queue/history projection requires:

- role = `PATIENT`
- non-null `linkedPatientId`

The route does not accept patient identity from:

- query params
- path params
- form fields
- client-provided role data

Personnel users are redirected to:

`/dashboard`

before patient projections run.

## Data Access Boundary

The feature uses only authorized application helpers:

- `getAuthorizedPatientById()`
- `getAuthorizedQueue()`
- `getAuthorizedPatientHistory()`

It does not import:

- private JSON directly
- unrestricted private data access
- browser localStorage

The projections also apply an explicit:

`record.patientId === linkedPatientId`

filter before rendering.

## My Queue

`/me/queue` renders Base Queue records for the current patient identity only.

For seeded PAT-001:

- Queue ID: QUEUE-001
- Queue Number: A001
- Status: WAITING
- Date: 2026-10-01
- Appointment: APT-001
- Doctor: DOC-001 public display name

Visible context includes:

- Queue number
- Queue ID
- status
- date
- doctor
- linked Appointment ID

The patient Queue UI does not expose internal Queue controls such as:

- Call next
- Change Queue status
- Complete Queue
- Cancel Queue

Queue remains read-only.

## My History

`/me/history` renders only history records linked to the current patient identity.

For seeded PAT-001:

- HIST-021
- HIST-001

Records are sorted newest first.

Visible context includes:

- History ID
- date
- exact synthetic summary from Base Data
- doctor public display name
- linked Appointment ID

The UI does not invent diagnoses, treatment, or clinical details beyond the synthetic Base Dataset summary.

The page explicitly communicates that these records are synthetic demo data.

## Internal Workflow Isolation

Phase 26 patient views intentionally do not link to:

- `/patients/*`
- `/appointments/*`
- internal `/queue`

There are no personnel workflow controls on either page.

## States

### Loading

Both routes provide bounded LoadingState UI:

- Loading my queue
- Loading my history

### Empty

Each view has its own empty state:

- No queue entries
- No history available

### Error

Both routes provide:

- patient-safe generic error copy
- Try again action
- no private implementation detail leakage

## Tests

Phase 26 adds:

- `tests/patient-portal/queue-history.test.tsx`
- `tests/patient-portal/queue-history-routes.test.ts`

Verified behavior includes:

- PAT-001 Queue ownership
- PAT-001 History ownership
- history newest-first ordering
- synthetic history rendering
- personnel rejected from patient projections
- personnel redirected from `/me/queue`
- personnel redirected from `/me/history`
- authenticated PATIENT identity passed directly into both projections
- no Queue mutation controls
- no internal workflow links
- independent empty states
- loading/error/retry states

Focused Phase 26 tests:

- 10 passing

Full project suite after Phase 26:

- 244 passing

## Static Boundary Checks

Verified:

- no internal personnel route links
- no direct private data-access bypass
- no localStorage access
- no Queue/History mutation
- no filesystem write
- semantic design-token usage

## Phase Boundary

Phase 26 completes the patient-facing route set:

- My Profile
- My Appointments
- My Queue
- My History

Settings and Demo Reset begin in Phase 27.
