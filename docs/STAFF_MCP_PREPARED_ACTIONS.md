# Clinic Cloud + Staff MCP Prepared Appointment Actions

Phase 33 adds the three required Staff MCP write-preparation tools:

- `prepare_create_appointment`
- `prepare_update_appointment`
- `prepare_cancel_appointment`

These tools validate and preview intent only.

They do not persist any appointment change.

## Prepared contract

Every successful prepared result includes:

```json
{
  "ok": true,
  "confirmationRequired": true,
  "persistence": "web-localStorage",
  "message": "Prepared only. Not yet saved.",
  "source": "base-json"
}
```

The result also contains:

- `action` — machine-readable intended change
- `preview` — current/proposed or resolved display context

Staff MCP instructions explicitly state that a prepared result must never be described as already created, updated, cancelled, saved, or persisted.

The user must continue to Clinic Cloud + Web and explicitly confirm before browser localStorage changes.

## prepare_create_appointment

Required fields:

- patientId
- doctorId
- serviceId
- date
- time

Optional:

- note

Validation reuses the existing Web create contract and role-scoped option builder.

This means:

- patient must be inside the authenticated role's allowed patient options
- doctor must be active and allowed for the role
- service must be active
- date/time must be valid
- DOCTOR cannot select another doctor's identity through tool input

The prepared action does not allocate an `APT-LOCAL-*` ID.

Local ID generation remains a Web persistence concern after confirmation.

## prepare_update_appointment

Required:

- appointmentId
- at least one changed field

Optional changed fields:

- doctorId
- serviceId
- date
- time
- note

The tool:

1. loads the authorized Base appointment
2. reuses the Web mutation options
3. rebuilds the same update draft used by Web
4. reuses `validateUpdateAppointmentDraft()`
5. returns only the calculated patch and current/proposed preview

It returns:

- `NOT_FOUND` for an absent Base appointment
- `FORBIDDEN` for an appointment outside authenticated scope
- `INVALID_REQUEST` for invalid/no-op updates or a Base appointment already cancelled

Browser-local effective appointment state is intentionally not visible to MCP and is revalidated later by Web.

## prepare_cancel_appointment

Input:

- appointmentId

The tool:

- resolves the authorized Base appointment
- reuses cancel authorization
- rejects a Base record already in CANCELLED state
- previews:
  - current status
  - next status = CANCELLED

The appointment itself remains unchanged until Web confirmation writes the browser-local overlay.

## Tool annotations

Prepared actions are side-effect free at MCP execution time:

- `readOnlyHint: true`
- `destructiveHint: false`
- `idempotentHint: true`
- `openWorldHint: false`

The user intent may be a future mutation, but the MCP call itself only validates/prepares.

## Security boundary

All prepared tool schemas are strict.

No tool accepts:

- role
- userId
- clinicId

Role continues to come from trusted Staff MCP Bearer auth context.

Prepared actions reuse the same Web authorization/data contracts rather than defining a separate weaker permission model.

## No persistence in Phase 33

Static verification confirms the prepared path does not call:

- `writeBrowserLocalData`
- localStorage/sessionStorage
- `withAppointmentCreate`
- `withAppointmentUpdate`
- filesystem write APIs

Base JSON remains read-only.

The prepared path also does not create or sign a handoff token in this phase.

Signed/validated Web handoff begins in Phase 34.

## Tests

Added:

`tests/mcp/staff-mcp-prepared.test.ts`

Verified:

- Staff MCP exposes 8 read + 3 prepared tools
- create returns the required prepared contract
- create validates Base references
- successful create does not mutate Base appointments
- update returns patch plus current/proposed preview
- successful update does not mutate Base appointments
- no-op update is rejected
- DOCTOR foreign appointment update is FORBIDDEN
- cancel previews CANCELLED without changing Base state
- already-cancelled Base appointment is rejected
- prepared schemas reject role-elevation arguments

Existing Phase 31/32 tests were updated only to account for the intentional addition of three prepared tools while preserving their original read/permission assertions.

## Verification

Focused Staff MCP auth/read/permission/prepared:

- 43 / 43 passing

Full project regression:

- 41 test files passing
- 312 / 312 tests passing

Additional checks:

- TypeScript: pass
- ESLint: pass
- production build: pass
- Staff MCP total tools: 11
- prepared tool names: exactly 3
- no prepared persistence path
- no Phase 34 handoff token added

## Phase boundary

Phase 33 ends at validated prepared action output.

Phase 34 implements the signed/validated short-lived Web handoff, Web revalidation, confirmation UI, and browser-local persistence after explicit user confirmation.
