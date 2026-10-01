# Clinic Cloud + Staff MCP Read Tools

Phase 31 implements the authenticated Staff MCP read surface.

Endpoint:

`/mcp/staff`

Authentication remains the Phase 30 Bearer/OAuth-compatible flow.

## Registered tools

Exactly eight read tools are registered:

1. `get_staff_context`
2. `search_patient`
3. `get_patient_summary`
4. `get_patient_history`
5. `get_patient_appointments`
6. `get_today_appointments`
7. `get_queue`
8. `get_doctor_schedule`

No prepared-write tool is registered in this phase.

## Trusted identity

The MCP server factory resolves the authenticated user from the trusted `authInfo` produced by Phase 30.

The identity is re-resolved against the current Base user record and requires:

- active user
- matching user ID
- matching clinic ID
- matching role
- personnel role only

The tools never accept `role` as input.

## Data and authorization boundary

Read tools reuse the existing Web authorization/data boundary:

- `searchAuthorizedPatients()`
- `getAuthorizedPatientById()`
- `getAuthorizedPatientHistory()`
- `getAuthorizedAppointments()`
- `getAuthorizedQueue()`

This keeps Staff MCP permissions aligned with the Web role model.

Doctor-specific schedule access has one Staff MCP rule:

- DOCTOR may request only the schedule for its authenticated `linkedDoctorId`
- OWNER / STAFF / NURSE may request another Base doctor schedule

## Result envelope

Successful read tools return:

```json
{
  "ok": true,
  "data": {},
  "source": "base-json"
}
```

Expected application-level failures use:

- `NOT_FOUND`
- `FORBIDDEN`
- `INVALID_REQUEST`

Failed tool results are marked as MCP tool errors while keeping structured content.

## Tool behavior

### get_staff_context

Returns trusted personnel context:

- userId
- displayName
- role
- clinicId
- linkedDoctorId

It does not return credentials, hashes, secrets, or bearer-token material.

### search_patient

Searches the authorized Base patient scope.

Supported matching comes from the shared Base data-access layer.

The output is deliberately minimal:

- id
- HN
- first name
- last name

DOCTOR results are limited to relevant patients by the authorization layer.

No match returns an empty array.

### get_patient_summary

Resolves by stable patient ID.

Returns authorized Base context:

- patient record
- latest appointment
- next non-cancelled appointment
- queue entries
- up to three recent stored history records
- relevant public doctor record where available

Missing patient returns `NOT_FOUND`.

### get_patient_history

Returns only stored Base history records for an authorized patient.

- sorted newest first
- default limit: 10
- max limit: 50
- stored summary returned unchanged
- no generated diagnosis or medical interpretation

### get_patient_appointments

Returns authorized Base appointment records for one patient.

For DOCTOR, the existing appointment authorization keeps only relevant/assigned appointments.

Browser-local Web appointment changes are explicitly outside this server-side read.

### get_today_appointments

Requires an explicit `YYYY-MM-DD` date for deterministic demo usage.

Returns authorized Base appointments for that date.

DOCTOR is automatically limited to assigned/relevant appointments.

### get_queue

Optional filters:

- date
- doctorId

Filters are applied after the authenticated authorization scope.

A DOCTOR cannot request another doctor's queue scope.

### get_doctor_schedule

Requires:

- doctorId
- date

Returns:

- public doctor record
- requested date
- Base appointments in the authenticated scope

Missing doctor returns `NOT_FOUND`.

DOCTOR requesting another doctor's schedule returns `FORBIDDEN`.

## MCP schemas

All tool inputs use strict Zod object schemas.

There is no `role` input.

Every tool is annotated read-only:

- `readOnlyHint: true`
- `destructiveHint: false`
- `openWorldHint: false`

## Phase 31 tests

Added:

`tests/mcp/staff-mcp-read.test.ts`

Focused verification includes:

- exactly eight required read tools
- no prepared-write tools
- trusted Staff context
- no credential/token material in Staff context
- patient search projection
- patient summary
- explicit NOT_FOUND semantics
- stored history with limit
- patient appointment reads
- explicit-date appointment reads
- Queue filters
- doctor schedule
- DOCTOR own-schedule restriction

Focused Staff MCP auth + read tests:

- 21 / 21 passing

Full project regression:

- 39 test files passing
- 290 / 290 tests passing

Additional checks:

- TypeScript: pass
- ESLint: pass
- production build: pass
- `/mcp/staff`: dynamic production route

Static verification:

- Staff read tool count = 8
- no `prepare_*` registered
- no role argument schema
- no localStorage/sessionStorage dependency
- no runtime filesystem write in Staff read path

## Phase boundary

Phase 31 implements read tools only.

Phase 32 performs the dedicated Staff MCP permission/isolation and exact Base grounding test suite.

Prepared appointment actions remain deferred to Phase 33.
