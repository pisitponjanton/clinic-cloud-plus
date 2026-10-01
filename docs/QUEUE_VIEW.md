# Clinic Cloud + Queue View

Phase 24 implements the internal read-focused Queue route:

`/queue`

This phase intentionally does not add queue mutation.

## Source of Truth

Queue data comes from the private Base Dataset:

`src/data/private/queue.json`

The route uses the existing application authorization boundary before projection or filtering.

It does not read browser localStorage.

## Route Boundary

The route requires the existing Web session.

PATIENT identities are redirected to:

`/dashboard`

before the internal Queue projection is prepared.

Patient-facing Queue access remains separate at:

`/me/queue`

and is implemented in Phase 26.

## Role Scope

### OWNER / STAFF / NURSE

May read authorized clinic Base Queue entries.

### DOCTOR

May read only Queue entries whose:

`doctorId === authenticated linkedDoctorId`

The queue projection does not accept a role or doctor identity from URL arguments.

## Queue Projection

`src/queue/read-projection.ts`

maps authorized Queue entries into UI-safe read items containing:

- Queue ID
- Queue number
- Status
- Date
- Patient ID
- Patient HN
- Patient display name
- Doctor ID/name
- linked Appointment ID

References are resolved against the same Base Dataset/data-access boundary used elsewhere.

Missing referenced Patient, Doctor, or Appointment records cause projection failure rather than fabricated display data.

## Statuses

The view supports the SPEC Queue statuses:

- WAITING
- CALLED
- IN_SERVICE
- COMPLETED
- CANCELLED

Status counts are calculated from the already-authorized role scope.

They are informational only.

## Filters

The Queue route supports:

- status
- date

Filtering occurs after authorization.

Unknown status values are treated as no status filter and cannot broaden the authenticated Queue scope.

The UI includes a Demo Day shortcut for:

`2026-10-01`

## Responsive UI

### Mobile / Tablet

Queue entries are displayed as bounded cards with:

- Queue number
- Patient context
- HN / Queue ID
- Date
- Doctor
- linked Appointment
- Status
- Patient and Appointment navigation

### Desktop

Queue entries are displayed in a table with the same core context.

No nested scrolling region is introduced by the Queue feature.

## Read-Only Semantics

The page explicitly labels itself:

`Read-only Base Queue`

This phase does not expose controls for:

- calling the next queue
- changing Queue status
- completing Queue
- cancelling Queue
- creating Queue entries

The SPEC defines queue mutation as optional for the MVP, while Appointment remains the required mutable workflow.

## Appointment Overlay Separation

The Queue view stays Base-only.

Appointment browser-local create/update/cancel state is not represented as Queue mutation.

This avoids implying that browser-local Appointment changes automatically modify server-side/Base Queue data.

## States

### Loading

`app/(protected)/queue/loading.tsx`

provides a bounded loading state.

### Empty

Filtered or empty authorized Queue results show a clear empty state and filter reset when applicable.

### Error

`app/(protected)/queue/error.tsx`

shows a retryable generic error without exposing private implementation details.

## Tests

Phase 24 adds:

- `tests/queue/queue-view.test.tsx`
- `tests/queue/queue-route.test.ts`

Verified behavior includes:

- STAFF full Base Queue scope
- expected status counts
- DOCTOR relevant Queue isolation
- status/date filtering after authorization
- unknown status does not broaden scope
- PATIENT redirected before internal Queue data access
- responsive Queue context and workflow links
- read-only label
- no Queue mutation controls
- empty state
- loading state
- retryable error state

Focused Phase 24 tests:

- 11 passing

Full project suite after Phase 24:

- 224 passing

## Static Boundary Checks

Verified:

- no Queue mutation implementation
- no Queue localStorage access
- no runtime filesystem write
- semantic design-token/style usage

## Phase Boundary

Phase 24 does not implement:

- Patient My Queue
- Queue mutation
- locally-created Queue records

Patient profile and appointments are implemented next in Phase 25.
