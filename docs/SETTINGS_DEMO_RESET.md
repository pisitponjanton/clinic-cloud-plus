# Clinic Cloud + Settings and Demo Reset

Phase 27 implements:

- `/settings`
- `/settings/demo`

Both routes are OWNER-only in the current MVP.

## Authorization

The existing Web capability matrix defines:

- `VIEW_SETTINGS` → OWNER
- `DEMO_RESET` → OWNER

Each route performs an early direct-role redirect for non-OWNER identities:

`/dashboard`

The server-side settings projection independently calls the authorization capability boundary.

The Demo Settings route also calls:

`assertCanResetDemo(user)`

before reset controls are rendered.

This keeps authorization out of UI-only logic.

## Settings

`/settings` is a read-only settings overview.

It displays:

- Clinic ID
- Clinic name
- Description
- Phone
- Address
- Opening-day count
- Base Patients count
- Base Appointments count
- Browser-local persistence model
- localStorage overlay key
- schema version

The Base counts are resolved on the server from repository JSON through the normal data-access layer.

Current Base counts:

- Patients: 20
- Appointments: 30

## Demo Settings

`/settings/demo` implements the SPEC recovery flow:

`Demo Settings → Reset Demo Data → Confirmation → Remove Clinic Cloud + overlay key → Recompute local counts → Success`

The page shows the required debug/demo counts:

- Base Patients
- Base Appointments
- Local Created Appointments
- Local Updated Appointments
- Local Deleted Records

Base counts are server-provided.

Local counts are read in the browser from the validated overlay adapter.

## Reset Scope

Reset removes only:

`clinic-cloud-plus:CLINIC-001:data:v1`

It does not:

- rewrite repository JSON
- modify Base Patients
- modify Base Appointments
- modify demo login accounts
- expire the auth session
- call Logout
- clear unrelated browser-storage keys

The reset action is explicitly separate from Logout.

## Confirmation

Reset uses the shared destructive ConfirmationDialog.

Before the final confirmation it shows:

- local created count
- local updated count
- local deleted-ID count

No browser data is removed merely by opening the dialog.

Only the final:

`Reset demo data`

action calls the browser reset adapter.

## Post-reset Behavior

After a successful reset:

- the Clinic Cloud + overlay key is absent
- local Created count becomes 0
- local Updated count becomes 0
- local Deleted count becomes 0
- local overlay state becomes Base-only/empty
- a success message confirms that the user remains signed in

Subsequent browser-local appointment reads therefore start from the repository Base Dataset again.

## Error Recovery

If local data is malformed or incompatible, Demo Settings can show a visible recovery warning.

If browser storage removal fails:

- a reset error is shown
- success is not claimed
- Base data and auth session remain unchanged

This provides the recovery path required by the localStorage error-handling section of the SPEC.

## Runtime Boundary

The settings UI does not call `window.localStorage` directly.

It uses:

- `readBrowserLocalData()`
- `resetBrowserLocalData()`

The server settings projection imports only the pure local-data constants, not the browser adapter.

Verified static boundaries:

- no direct localStorage API in settings feature
- no logout/session mutation coupling
- no runtime filesystem/repository JSON write
- semantic design-token usage

## Routes and States

Both settings routes include bounded Loading states and retryable Error states.

Production build includes:

- `/settings` as dynamic protected route
- `/settings/demo` as dynamic protected route

## Tests

Phase 27 adds:

- `tests/settings/settings-demo-reset.test.tsx`
- `tests/settings/settings-routes.test.ts`

Focused Phase 27 coverage verifies:

- OWNER settings projection
- Base counts and exact versioned overlay key
- non-OWNER settings authorization rejection
- non-OWNER reset authorization rejection
- read-only settings UI
- Demo Settings navigation
- local debug counts
- zero removals before confirmation
- removal only after explicit confirmation
- unrelated storage key retention
- success state and zeroed local counts
- reset failure does not claim success
- loading/error/retry states
- STAFF direct-route redirect before settings projection
- STAFF direct-route redirect before reset checks
- OWNER route uses authorization projection
- OWNER Demo Settings checks DEMO_RESET

Focused tests:

- 10 passing

Because the all-at-once Vitest invocation was unstable in the bdxa command transport, the complete regression suite was executed in feature groups with equivalent coverage.

Grouped regression totals:

- Auth + Authorization: 50
- Appointments + Patients: 60
- Data + local-data: 60
- Foundation + Navigation + Dashboard + Queue: 54
- Patient portal + Settings: 30

Total:

- 254 passing tests

Additional checks:

- typecheck passed
- lint passed
- production build passed
- settings storage boundary passed
- settings auth/reset separation passed
- runtime JSON-write scan passed
- semantic style scan passed

## Phase Boundary

Phase 27 completes the required Web routes before MCP implementation begins.

Public MCP starts in Phase 28.
