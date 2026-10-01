# Clinic Cloud + Appointment localStorage Overlay

Phase 20 implements the browser-local appointment overlay engine required by the MVP.

It does **not** connect appointment create/edit/cancel forms yet.

## Runtime Boundary

The implementation is intentionally split into two modules.

### Pure engine

`src/local-data/appointment-overlay.ts`

Contains:

- versioned overlay types
- runtime validation
- safe parsing/recovery
- Base + Overlay merge
- immutable create/update/delete helpers
- serialization

This module does not access `window`, `localStorage`, authentication, or filesystem APIs.

### Browser adapter

`src/local-data/browser-appointment-overlay.ts`

Marked as client-only and contains the only browser-storage access for this feature.

It provides:

- read
- write
- reset/remove
- merged browser appointment convenience helper

Server Components, route handlers, auth, data access, and future MCP code must not import this browser adapter.

## Storage Key

The implemented key follows SPEC exactly:

`clinic-cloud-plus:CLINIC-001:data:v1`

Constants:

- schemaVersion: `1`
- clinicId: `CLINIC-001`

## Stored Shape

Phase 20 keeps only the mutable collection required by the current MVP:

```json
{
  "schemaVersion": 1,
  "clinicId": "CLINIC-001",
  "updatedAt": "2026-10-01T06:00:00.000Z",
  "collections": {
    "appointments": {
      "created": [],
      "updated": {},
      "deletedIds": []
    }
  }
}
```

Queue mutation is intentionally not added because the SPEC allows read-only queue behavior for the first MVP.

## Appointment Overlay Rules

### Created

Browser-created appointments must:

- be valid Appointment records
- use clinic `CLINIC-001`
- use an ID beginning with `APT-LOCAL-`

Duplicate local-created IDs are rejected/ignored during validation.

### Updated

Base appointment updates are stored as patches:

```text
collections.appointments.updated[appointmentId]
```

Supported mutable fields:

- patientId
- doctorId
- serviceId
- date
- time
- status
- note

The overlay cannot patch:

- id
- clinicId

When updating a locally created appointment, the engine updates that record inside `created` rather than creating a Base-record patch.

### Deleted IDs

The engine supports `deletedIds` because it is part of the SPEC merge contract.

For a Base appointment:

- the ID is added to `deletedIds`
- any local update patch for that ID is removed

For a locally created appointment:

- deletion removes the item from `created`

Appointment cancellation should still use:

`status = CANCELLED`

instead of deletion in the later mutation flow.

## Merge Order

`mergeAppointments()` follows SPEC order:

1. clone Base appointments
2. apply local update patches by ID
3. remove IDs in `deletedIds`
4. append valid local-created appointments
5. validate resulting records
6. return a new merged array

The Base array and Base records are never mutated.

## Validation and Recovery

The parser validates:

- JSON syntax
- root object
- schemaVersion
- clinicId
- updatedAt
- appointment collection shape
- local created appointments
- update patch fields/values
- deleted appointment IDs

### Incompatible schema

A schema version other than `1` is not reinterpreted.

The parser returns:

- an empty compatible overlay
- `state = recovered`
- an `INCOMPATIBLE_SCHEMA_VERSION` diagnostic

### Wrong clinic

An overlay for another clinic is rejected and falls back to an empty Clinic Cloud + overlay.

### Partially malformed collection

When the root/version/clinic are compatible, malformed individual records are ignored while valid records are retained.

Diagnostics identify what was ignored.

This implements the SPEC rule to ignore/quarantine malformed local records rather than crash the application.

## Browser Storage Failures

The browser adapter fails safely.

Read result exposes:

- `storageAvailable`
- `state`
- parsed/recovered overlay
- validation issues
- `storageError` when storage access itself fails

Write returns:

- `ok: true`, or
- `STORAGE_UNAVAILABLE`
- `WRITE_FAILED`

Reset returns:

- `ok: true`, or
- `STORAGE_UNAVAILABLE`
- `REMOVE_FAILED`

No browser storage failure causes Base JSON to be rewritten.

## Reset

`resetBrowserLocalData()` removes only:

`clinic-cloud-plus:CLINIC-001:data:v1`

It does not:

- alter Base JSON
- alter demo accounts
- clear the auth session
- call logout

The OWNER Demo Settings UI that invokes reset is implemented later.

## Current Read Views

Phase 19 appointment pages remain server-rendered Base-data read views.

Phase 20 intentionally does not wire browser merged state into those pages yet because form/mutation integration belongs to the following local-state phases.

## Tests

`tests/local-data/overlay-engine-smoke.test.ts` provides Phase 20 implementation smoke coverage for:

- exact versioned storage contract
- Base update + deletion + local creation merge
- Base immutability
- browser write/read/reset round trip
- locally created appointment update semantics

Phase 21 is the dedicated exhaustive behavior phase and adds coverage for:

- Base-only behavior
- local create
- Base patch/update
- CANCELLED merge
- corrupted JSON
- wrong schema version
- malformed collection/records
- logout retention
- no runtime repository JSON writes
