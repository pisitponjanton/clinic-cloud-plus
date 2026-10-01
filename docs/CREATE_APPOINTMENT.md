# Clinic Cloud + Create Appointment Flow

Phase 22 implements the browser-local appointment creation flow at:

`/appointments/new`

The flow follows the SPEC requirement:

`Select → Validate → Review → Confirm → Write localStorage → Recompute merged state → Success`

## Route and Authorization

The route is protected by the existing Web session boundary.

PATIENT identities are redirected to:

`/dashboard`

before create options are prepared.

Server-side create options are built from trusted authorization/data helpers.

### OWNER / STAFF / NURSE

May choose from:

- authorized clinic patient scope
- active public doctors
- active public services

### DOCTOR

May choose only:

- patients already relevant to that doctor according to the authorization layer
- the authenticated user's linked doctor identity as the doctor option
- active public services

The URL query:

`?patientId=PAT-001`

can prefill a patient only when that ID exists in the authorized option set.

An arbitrary/out-of-scope patient ID in the URL is ignored.

## Form

The create form contains:

- Patient
- Doctor
- Service
- Date
- Time
- optional synthetic demo Note

Patient, Date, and Time are required.

Doctor and Service may remain unassigned because the Appointment schema permits null values and the SPEC states they are selected “as applicable.”

## Validation

Validation occurs before confirmation.

The client validates references against the exact option set delivered by the authorized Server Page.

It rejects:

- unknown/out-of-scope patient ID
- unknown doctor ID
- unknown service ID
- invalid/missing date
- invalid/missing time

The create contract normalizes whitespace before preview.

## Two-Step Confirmation

Submitting the form with:

`Review appointment`

does **not** write browser storage.

It only creates a confirmation preview.

The preview shows at minimum:

- Patient
- Doctor when selected
- Service when selected
- Date
- Time

The shared `ConfirmationDialog` was extended with an optional `details` region so the exact preview is repeated inside the confirmation dialog.

Browser persistence happens only after:

`Confirm & create → Create appointment`

## Local Appointment Record

Confirmed records are created as:

`APT-LOCAL-<uuid>`

with:

- clinicId = `CLINIC-001`
- status = `SCHEDULED`
- selected patient
- selected doctor or null
- selected service or null
- selected date/time
- optional note

The pure overlay engine validates the resulting record before adding it to the local `created` collection.

## Persistence

The client form does not call `window.localStorage` directly.

It uses:

- `readBrowserLocalData()`
- `withAppointmentCreated()`
- `writeBrowserLocalData()`
- `getMergedBrowserAppointments()`

After a successful write, the flow recomputes the merged appointment state and verifies that the new local ID exists before showing success.

If the write fails:

- the UI shows a clear error
- the UI does not claim that persistence succeeded

If existing compatible local demo data required recovery, the flow may show a recovery warning after successful creation.

## Success State

After confirmed persistence, the page shows:

- local Appointment ID
- confirmation that the record was saved in this browser's Clinic Cloud + demo overlay
- merged appointment count
- Create another action
- Back to appointments action

The server-rendered Appointment List remains a Base Dataset read view at this phase; update/cancel and broader merged-read integration continue in following phases.

## Entry Points

Phase 22 adds Create Appointment entry points from:

### Appointment List

`/appointments → /appointments/new`

### Patient Detail

`/patients/[patientId] → /appointments/new?patientId=[patientId]`

The Patient Detail entry preserves authorization because the create route checks the query ID against its authorized option set.

## States

### Loading

`/appointments/new/loading.tsx`

provides a bounded loading state while authorized options are prepared.

### Error

`/appointments/new/error.tsx`

provides a retry action if server-side option preparation fails.

### Validation

Field errors are visible inline and use shared Field semantics.

### Persistence Failure

Browser storage failure is shown as an error and never converted into a fake success state.

## Tests

Phase 22 adds:

- `tests/appointments/create-appointment.test.tsx`
- `tests/appointments/create-appointment-options.test.ts`
- `tests/appointments/create-appointment-route.test.ts`

Verified behavior includes:

- valid create preview normalization
- invalid/out-of-scope reference rejection
- optional doctor/service behavior
- Review causes zero storage writes
- opening confirmation causes zero storage writes
- explicit Confirm writes exactly once
- resulting record is `SCHEDULED`
- resulting ID uses `APT-LOCAL-`
- storage write failure does not claim success
- STAFF clinic option scope
- DOCTOR relevant patient scope
- DOCTOR doctor option restricted to linked identity
- PATIENT server option rejection
- PATIENT direct route redirect
- authorized `patientId` URL prefill
- unauthorized `patientId` query ignored

Focused Phase 22 tests:

- 12 passing

Full project suite after Phase 22:

- 206 passing

## Phase Boundary

Phase 22 does not implement:

- appointment edit/update UI
- appointment cancellation UI
- Base appointment mutation
- queue mutation

Those remain in Phase 23 and later phases.
