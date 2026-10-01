# Clinic Cloud + localStorage Overlay Verification

Phase 21 verifies the appointment overlay behavior introduced in Phase 20.

## Covered Base + Overlay Scenarios

The focused tests verify:

- Base-only state when no overlay key exists
- locally created appointment appended to merged state
- Base appointment field patch by ID
- cancellation represented as `status = CANCELLED`
- Base record hiding through `deletedIds`
- Base JSON/data-access output remains unchanged
- reset removes only the Clinic Cloud + overlay key and restores Base-only state

## Corrupted and Incompatible Data

Verified recovery behavior includes:

- malformed JSON
- incompatible future `schemaVersion`
- wrong clinic ID
- malformed created appointments
- duplicate local-created appointment IDs
- malformed update patches
- malformed/duplicate deleted IDs
- browser storage read failure
- browser storage write failure
- browser storage remove failure

An incompatible future schema is never reinterpreted as version 1 data.

Compatible overlays may salvage valid records while reporting diagnostics for ignored malformed records.

## Logout Retention

The real:

`POST /api/auth/logout`

route is tested while a local appointment overlay exists.

Verified behavior:

- auth cookie is expired
- response redirects to `/login`
- Clinic Cloud + local overlay remains unchanged
- merged local appointment state is still readable afterward

This keeps Logout separate from Reset Demo Data as required by SPEC.

## Runtime Boundaries

Static and behavioral checks verify:

- `window.localStorage` access exists only in the client browser adapter
- the pure overlay engine has no browser global dependency
- logout does not import or call reset/local-storage helpers
- no filesystem write APIs exist in the local-data runtime implementation
- no code writes repository private JSON files

## Test Files

- `tests/local-data/overlay-engine-smoke.test.ts`
- `tests/local-data/overlay-behavior.test.ts`

Focused local-data total after Phase 21:

- 19 tests

Full project suite after Phase 21:

- 194 tests

## Phase Boundary

Phase 21 does not add appointment mutation UI.

The next phase connects appointment creation to this tested browser-local overlay only after preview/confirmation.
