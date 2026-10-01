# Clinic Cloud + Appointment Update and Cancel

Phase 23 adds browser-local update and cancellation to the internal Appointment Detail route:

`/appointments/[appointmentId]`

## Effective Browser State

Appointment Detail now separates:

- read-only Base Dataset
- browser-local Appointment overlay
- effective merged Appointment state

The server still authorizes and resolves the Base appointment.

The client mutation panel then reads the browser overlay and computes:

`Base + Overlay → Effective Appointment`

After a successful update or cancellation, the panel recomputes the merged state and immediately refreshes the visible appointment details.

The server never claims direct visibility into localStorage.

## Authorization

The existing protected route still rejects PATIENT identities.

The mutation boundary additionally calls:

- `assertCanUpdateAppointment`
- `assertCanCancelAppointment`

before mutation options are delivered to the browser.

### OWNER / STAFF / NURSE

May update/cancel authorized clinic appointments.

### DOCTOR

May mutate only appointments assigned to the authenticated user's linked doctor identity.

Doctor selection remains limited to that same linked doctor.

An unrelated Doctor appointment is rejected at the data/action authorization boundary.

## Supported Update Fields

The Phase 23 editor supports:

- Doctor
- Service
- Date
- Time
- Note

Patient identity is intentionally fixed after appointment creation in this UI.

Status is not freely editable from the update form.

Cancellation is the explicit status transition implemented in this phase.

## Update Flow

The implemented flow follows SPEC:

`Open appointment → Edit → Current vs new values → Confirm → Store patch → Recompute merged state`

### Validation

Before preview, the browser validates:

- selected Doctor against the server-authorized Doctor option set
- selected Service against the active authorized Service option set
- valid Date
- valid Time
- at least one actual field change

Unknown Doctor/Service references are rejected.

A no-op update does not open confirmation.

### Preview

The Update Preview lists only fields that changed.

For each changed field it shows:

- current value
- new value

### Persistence

Reviewing changes does not write browser storage.

Opening the confirmation dialog does not write browser storage.

Only the final:

`Update appointment`

confirmation writes the patch through the browser local-data adapter.

After write:

- merged state is recomputed
- the updated Appointment is re-read from that merged state
- visible Appointment Detail changes immediately
- success is shown only after merged-state verification

Storage failure shows an error and does not claim success.

## Cancel Flow

Cancellation follows SPEC:

`Open appointment → Cancel action → Confirmation → status=CANCELLED → Recompute merged state`

The cancellation dialog explicitly shows:

- Appointment ID
- current status
- new status = CANCELLED

Cancellation stores:

```json
{
  "status": "CANCELLED"
}
```

inside the local Appointment update patch.

It does not:

- remove the Appointment from Base JSON
- use `deletedIds`
- delete a local file
- mutate Queue data

After successful cancellation:

- merged state is recomputed
- the visible status becomes Cancelled
- Edit is disabled
- Cancel changes to a disabled Already cancelled action

## Shared Confirmation Dialog Fix

Phase 23 exposed a real shared-component issue:

`AlertDialogAction`

was a normal Button and did not close the Base UI alert dialog after confirmation.

It now renders through the Base UI AlertDialog Close primitive while keeping the Button presentation.

This restores expected confirmation behavior:

- confirm action runs
- dialog closes
- background becomes interactive again
- existing Escape/Cancel behavior remains intact

Shared UI regression tests continue to pass.

## Browser Storage Boundary

Appointment mutation UI does not call `window.localStorage` directly.

It uses:

- `readBrowserLocalData()`
- `withAppointmentUpdate()`
- `writeBrowserLocalData()`
- `getMergedBrowserAppointments()`

No repository/private JSON write API is used.

## Queue Boundary

Phase 23 intentionally does not add queue mutation.

Cancelling an Appointment only changes the Appointment overlay status.

Queue remains read-focused until its own phase.

## Tests

Phase 23 adds:

`tests/appointments/appointment-mutation.test.tsx`

Coverage includes:

- changed-field patch generation
- current vs new preview values
- no-op rejection
- invalid/out-of-scope Doctor/Service rejection
- DOCTOR linked-doctor option scope
- unrelated DOCTOR appointment rejection
- PATIENT mutation rejection
- zero writes before update confirmation
- update persistence after explicit confirmation
- merged-state refresh after update
- zero writes before cancel confirmation
- cancellation stored as `status=CANCELLED`
- merged-state refresh after cancellation
- already-cancelled controls disabled
- write failure does not claim success

Existing Appointment read/route tests were updated for the mutation boundary.

Focused Phase 23 + shared-dialog verification:

- 37 passing tests

Full project suite after Phase 23:

- 213 passing tests

## Phase Boundary

Phase 23 does not implement Queue mutation.

Appointment List remains the server-authorized Base read view from Phase 19; Appointment Detail is the first view that reflects effective Base + browser-overlay mutation state directly.

Queue UI is implemented next in Phase 24.
