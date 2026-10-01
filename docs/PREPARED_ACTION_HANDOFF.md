# Clinic Cloud + Prepared Action Web Handoff

Phase 34 implements the Web handoff boundary between Staff MCP prepared appointment actions and browser-local persistence.

## Flow

`Staff MCP prepare tool → short-lived protected handoff URL → authenticated Web validation → browser-state validation → explicit confirmation → localStorage write`

Staff MCP still never writes appointment state.

## Handoff token

Prepared Staff MCP success results now include:

```json
{
  "handoff": {
    "url": "https://<host>/handoff/appointment?token=<opaque-token>",
    "expiresAt": "<ISO timestamp>"
  }
}
```

The existing prepared contract remains unchanged:

- `confirmationRequired: true`
- `persistence: "web-localStorage"`
- `message: "Prepared only. Not yet saved."`

## Token security

The handoff token is:

- opaque
- AES-256-GCM authenticated/encrypted
- short-lived
- schema validated before issue and after decrypt
- bound to Staff MCP identity
- bound to clinic
- bound to role
- bound to the exact prepared action
- assigned a random `handoffId`

TTL:

- 5 minutes

Environment:

`CLINIC_CLOUD_HANDOFF_SECRET`

The secret must contain at least 32 characters and is loaded only on the server.

## Token payload

Authenticated payload contains:

- version
- audience
- handoffId
- userId
- clinicId
- personnel role
- appointment action
- issuedAt
- expiresAt

PATIENT cannot receive a valid appointment handoff identity.

Invalid authentication tags, malformed payloads, future timestamps, and expired tokens are rejected.

## Web identity binding

The Web page requires the normal signed Web session.

The current Web user must match the Staff MCP identity that prepared the action:

- same user ID
- same clinic ID
- same role

Signing in as another personnel account does not authorize the handoff.

This prevents passing a prepared action from one authenticated MCP identity to a different Web identity.

## Server-side Web revalidation

Route:

`/handoff/appointment`

Before confirmation UI is rendered, the server:

1. verifies/decrypts the handoff token
2. verifies expiry
3. compares current Web identity
4. re-runs the same prepared-action validators
5. re-runs current role/permission checks
6. resolves current Base options/appointments

The server does not trust patient, doctor, service, appointment, or role values from independent query parameters.

The only handoff query input is the protected token.

## Browser-state revalidation

The browser confirmation component then reads the current Clinic Cloud + localStorage overlay and merges it with Base appointments.

This is required because Staff MCP intentionally cannot see browser-local appointment mutations.

The browser validates again:

### Create

- patient remains selectable
- doctor remains allowed
- service remains active/allowed
- date/time remain valid
- the same handoff has not already created its deterministic local appointment

### Update

- the effective browser appointment still exists
- the prepared target values are applied to the latest effective browser state
- Web update validation still passes
- no-op/already-applied actions do not write again

### Cancel

- the effective browser appointment still exists
- it is not already CANCELLED

## Explicit confirmation

No localStorage write occurs while merely opening or reviewing the handoff page.

The user must open the confirmation dialog and confirm.

Immediately before the write, the current browser state is recomputed again.

Persistence uses the existing overlay APIs:

- `withAppointmentCreated()`
- `withAppointmentUpdate()`
- `writeBrowserLocalData()`

Success is displayed only after the browser write reports success.

A failed write never claims that the action was saved.

## Create replay protection

Each token contains a random `handoffId`.

Create confirmation derives a stable local appointment ID:

`APT-LOCAL-handoff-<handoffId>`

Reopening and confirming the same create handoff in the same browser therefore cannot silently create a second appointment with another ID.

The UI reports that no additional write is required.

## URL hygiene

The handoff page declares:

- `robots: noindex, nofollow`
- `referrer: no-referrer`

After client hydration, the token query string is removed from the visible browser URL using `history.replaceState()`.

## Source boundaries

Staff MCP prepared code remains write-free.

Static checks confirm no Staff MCP use of:

- `writeBrowserLocalData`
- `localStorage`
- `sessionStorage`
- `withAppointmentCreated`
- `withAppointmentUpdate`

Browser-local writes exist only in the Web confirmation component.

## Tests

Added:

- `tests/handoff/appointment-handoff.test.ts`
- `tests/handoff/appointment-handoff-ui.test.tsx`

Updated:

- `tests/mcp/staff-mcp-prepared.test.ts`

Verified:

- opaque prepared-action URL
- 5-minute expiry
- tamper rejection
- expired-token rejection
- exact identity binding
- Web permission revalidation
- malformed action rejection before token issue
- prepared MCP result contains handoff URL
- create writes nothing before confirmation
- create writes after explicit confirmation
- create replay does not create a duplicate
- update writes only after confirmation
- cancel requires destructive confirmation
- local CANCELLED state is written only after confirmation

Focused Phase 34 tests:

- 18 / 18 passing

Full project regression:

- 43 test files passing
- 321 / 321 tests passing

Additional checks:

- TypeScript: pass
- ESLint: pass
- production build: pass
- `/handoff/appointment`: dynamic production route
- handoff query boundary: token only
- MCP prepare-only persistence scan: pass
- server revalidation scan: pass
- URL token hygiene scan: pass

## Phase boundary

Phase 34 completes the prepared-action handoff and persistence boundary.

Phase 35 performs the primary Web-only and AI + Staff MCP workflow integration tests against the same seeded scenario.
