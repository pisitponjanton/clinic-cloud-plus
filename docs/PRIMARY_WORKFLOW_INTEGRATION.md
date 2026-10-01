# Clinic Cloud + Primary Workflow Integration

Phase 35 validates the primary Web-only and AI + Staff MCP appointment workflows against the same seeded scenario.

## Objective

Both paths implement the same SPEC objective:

`Find patient → inspect appointment/context → prepare/create next appointment → confirm`

This phase validates functional equivalence and trust boundaries.

It does not measure real human completion time, hesitation, or interaction counts. Those are experiment measurements to record during an actual A/B session, not values that should be fabricated by automated tests.

## Standardized scenario

Seeded patient:

- patient ID: `PAT-001`
- HN: `HN000001`
- name: `สมชาย ใจดี`

Equivalent target appointment used by both paths:

- patient: `PAT-001`
- doctor: `DOC-001`
- service: `SVC-001`
- date: `2026-10-08`
- time: `14:00`
- note: `A/B primary workflow`
- expected new status: `SCHEDULED`

Both flows begin from a valid seeded STAFF identity after standardized authentication setup.

## Web-only path

The integration test performs:

1. Resolve a signed Web session for the seeded STAFF user.
2. Search `HN000001` through the Web patient projection.
3. Resolve `PAT-001` patient detail context.
4. Verify linked appointment and history context exists.
5. Load role-authorized appointment creation options.
6. Render the real `CreateAppointmentForm`.
7. Review the prepared appointment.
8. Verify no localStorage write occurs during review.
9. Open the explicit confirmation dialog.
10. Confirm creation.
11. Verify exactly one browser-local overlay write.
12. Read the resulting local appointment.

## AI + Staff MCP path

The integration test performs:

1. Mint a valid Staff MCP access token for the same seeded STAFF identity.
2. Call `search_patient` with `HN000001`.
3. Verify the result resolves exactly to `PAT-001`.
4. Call `get_patient_summary`.
5. Verify MCP patient context refers to the same Web/Base patient.
6. Call `prepare_create_appointment` with the same target appointment data.
7. Verify the result remains pending:
   - `confirmationRequired: true`
   - `persistence: web-localStorage`
   - `Prepared only. Not yet saved.`
8. Verify no localStorage write occurs from Staff MCP.
9. Extract the protected Web handoff token.
10. Resolve the handoff with the same authenticated Web identity.
11. Render the real Web confirmation component.
12. Verify no localStorage write occurs while reviewing.
13. Explicitly confirm.
14. Verify exactly one browser-local overlay write.
15. Read the resulting local appointment.

## Equivalence assertion

The Web-only appointment and AI + Staff MCP appointment must match on business fields:

- patientId
- doctorId
- serviceId
- date
- time
- note
- status

Local IDs are intentionally different:

- Web-only test uses a deterministic Web local ID.
- Staff MCP handoff uses `APT-LOCAL-handoff-<handoffId>`.

ID differences do not invalidate the A/B comparison because both paths produce the same intended appointment data.

## Base and localStorage boundary

The test snapshots the repository Base appointments before either flow.

After both confirmed browser-local writes:

- `getAppointments()` still equals the original Base snapshot.
- No Base JSON appointment is changed.
- Staff MCP `get_patient_appointments` still returns Base appointment IDs only.
- Staff MCP does not expose either Web-created `APT-LOCAL-*` record.

This confirms the intentional MVP boundary:

`Base JSON = server/MCP source of truth`

`browser localStorage overlay = Web-only mutable demo state`

## Authentication and permission coverage

The integration suite verifies:

- valid seeded STAFF Web session resolution
- valid seeded STAFF MCP bearer usage
- same clinic scenario across Web and MCP
- PATIENT cannot use the all-patient Web search boundary
- PATIENT cannot mint a Staff MCP personnel access token

Detailed per-role permission tests remain covered by the dedicated authorization and Staff MCP suites.

## No-hallucination integration cases

The integration suite verifies:

### Missing patient search

Web search:

`definitely-not-a-real-patient → []`

Staff MCP search:

`definitely-not-a-real-patient → []`

### Missing patient detail

Staff MCP:

`PAT-NOT-FOUND → NOT_FOUND`

No patient record is invented.

### Missing appointment mutation

Staff MCP:

`prepare_update_appointment(APT-NOT-FOUND) → NOT_FOUND`

No appointment is invented and no prepared success/handoff is claimed.

## Existing context grounding

The Staff MCP patient summary and Web patient detail both resolve the same seeded patient.

When Staff MCP returns a next appointment, the integration test checks that the same appointment ID/date/time exists in the Web/Base patient context.

This confirms Web and Staff MCP are grounded in the same repository Base Dataset.

## Added test

`tests/integration/primary-workflows.test.tsx`

Primary integration cases:

1. Equivalent Web-only and AI + Staff MCP create flows.
2. Missing-record/no-hallucination behavior.
3. PATIENT isolation across Web and Staff MCP identity boundaries.

## Verification results

Focused primary workflow + handoff set:

- 3 test files passing
- 12 / 12 tests passing

Full project regression:

- 44 test files passing
- 324 / 324 tests passing

Additional checks:

- TypeScript: pass
- ESLint: pass
- Next.js production build: pass
- `/mcp/public`: production route present
- `/mcp/staff`: production route present
- `/handoff/appointment`: production route present

Static scenario checks confirm:

- `PAT-001 / HN000001`
- `DOC-001`
- `SVC-001`
- `2026-10-08 14:00`
- Base immutability assertion
- MCP browser-local invisibility assertion
- missing patient assertion
- missing appointment assertion

## Phase boundary

Phase 35 adds integration tests and documentation only.

It does not change product behavior.

Phase 36 performs the dedicated frontend UX, responsive, and accessibility review using the project-local frontend review/design skills.
