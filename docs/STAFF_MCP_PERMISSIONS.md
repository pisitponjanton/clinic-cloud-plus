# Clinic Cloud + Staff MCP Permissions

Phase 32 validates Staff MCP authorization and data isolation.

## Dedicated permission tests

Added:

`tests/mcp/staff-mcp-permissions.test.ts`

Coverage includes:

- unauthenticated Staff MCP rejection
- PATIENT cannot mint a Staff MCP access token
- strict tool input schemas
- no role/user/clinic identity arguments
- role-elevation attempts via extra arguments are rejected
- exact Base JSON grounding for patient search, appointments, history, date reads, queue, and doctor schedule
- DOCTOR patient relevance filtering
- DOCTOR unrelated patient access returns FORBIDDEN
- DOCTOR date/queue reads remain linked-doctor scoped
- DOCTOR cannot request another doctor's queue/schedule
- OWNER, STAFF, and NURSE keep normal personnel patient scope
- password hashes, signing secrets, and bearer tokens do not appear in tool results

## DOCTOR relevance

For the seeded DOC-001 identity, the authorization layer derives relevant patients from Base appointments, queue entries, and history.

The permission tests confirm that search results are limited to that derived relevance set.

Unrelated patient IDs are rejected by:

- get_patient_summary
- get_patient_history
- get_patient_appointments

The rejection is authorization-based, not UI-based.

## Role elevation resistance

Published tool schemas are inspected through MCP `tools/list`.

Every tool must use a strict object schema.

No tool publishes:

- role
- userId
- clinicId

The suite also sends an unexpected `role` argument to every Staff read tool.

Each attempt must be rejected by MCP input validation before it can affect authorization.

## Exact Base grounding

For broad personnel scope, Staff MCP results are compared directly with repository Base JSON.

Verified exact grounding for:

- patient search projection
- patient appointments
- patient history
- appointments by date
- queue filtered by date/doctor
- doctor schedule

No browser-local Appointment overlay is used.

## Secret and token non-disclosure

Responses across all eight read tools are serialized and checked against:

- password hash field names
- the seeded user's password hash
- the Staff MCP signing secret
- the current bearer token

None may appear in tool output.

## Verification results

Dedicated Phase 32 suite:

- 13 / 13 passing

Staff MCP auth + read + permission focused set:

- 34 / 34 passing

Full project regression:

- 40 test files passing
- 303 / 303 tests passing

Additional checks:

- TypeScript: pass
- ESLint: pass
- production build: pass
- `/mcp/staff`: dynamic production route

Static boundary checks:

- registered Staff read tools = 8
- no role input schema
- no browser localStorage/sessionStorage dependency
- no secret/token structured-result pattern

## Phase boundary

Phase 32 adds permission/security tests only.

Prepared appointment actions begin in Phase 33.
