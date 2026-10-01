# Phase 38 — Vercel and MCP Client Verification

Status: **completed under revised Phase 38 acceptance**

Production URL:

`https://clinic-cloud-plus.vercel.app`

This document records only verification that was actually performed. It does not treat a client flow as passed unless that client was connected successfully.

## Vercel

Verified:

- Production deployment reaches `Ready`.
- The production alias resolves to the latest deployment.
- Vercel Deployment Protection / SSO protection is disabled so remote MCP clients can reach the endpoints.
- `CLINIC_CLOUD_SESSION_SECRET`, `CLINIC_CLOUD_STAFF_MCP_SECRET`, and `CLINIC_CLOUD_HANDOFF_SECRET` are configured as Vercel Secret values.
- `/login` is reachable.
- An unauthenticated request to `/dashboard` redirects to `/login`.

## Public MCP

Verified against the deployed URL:

- `/mcp/public` connects without Clinic Cloud authentication.
- `tools/list` exposes the seven required public tools.
- A deployed `get_service_detail` call returns the seeded Base JSON result for `SVC-001`.
- The official MCP Inspector connects with modern HTTP transport.
- MCP Inspector `tools/list --strict` reports no schema portability error.

## Staff MCP authorization boundary

Verified against the deployed URL:

- Unauthenticated `/mcp/staff` returns HTTP 401.
- The 401 response advertises OAuth protected-resource metadata.
- Authorization-server metadata and protected-resource metadata are reachable.
- Dynamic Client Registration returns a public PKCE client.
- MCP Inspector discovers the authorization server, dynamically registers, creates an S256 PKCE challenge, and reaches the deployed `/oauth/authorize` URL.
- The remaining step in the Inspector flow requires a human to complete the demo personnel login in a browser.

## Refresh-token compatibility

Phase 38 extends the no-database OAuth MVP with optional stateless refresh tokens for remote clients that request long-lived access.

Implemented:

- `offline_access` optional authorization scope.
- `refresh_token` grant advertised by authorization-server metadata.
- 30-day signed refresh-token lifetime.
- Refresh tokens are bound to the trusted personnel identity and OAuth client.
- Refresh exchange revalidates the current Base user and role.
- A refreshed access token keeps the same trusted Staff MCP permission boundary.
- Refresh responses return a newly generated signed refresh token.
- Authorization responses include `iss`.
- Dynamic registration supports `web` and `native` application types.

Production probe verified:

- Native loopback client registration returns HTTP 201.
- Returned grants include `authorization_code` and `refresh_token`.
- Authorization with `staff:mcp offline_access` returns the login page and preserves the requested scope.

Advanced server-side revocation remains outside the no-persistent-database MVP scope.

## Local regression

Current checks:

- TypeScript: pass.
- ESLint: pass.
- Unit/integration tests: **44 files, 328 tests passing**.
- Next.js production build: pass.

The suite covers the Staff MCP authentication, permissions, read tools, prepared actions, Public MCP isolation, localStorage behavior, Web handoff, and the primary Web versus AI workflow.

## External client acceptance still open

The following SPEC acceptance items have **not** been marked as passed:

- Complete Staff MCP connection through the actual ChatGPT client UI.
- Complete Staff MCP connection through the actual Claude client UI.
- Invoke the required Staff MCP flow from each of those clients after human authorization.

The deployed server is public and reaches the OAuth authorization step from a standard MCP client, but these product-specific UI/account steps require an eligible signed-in external client session and human OAuth completion.

Project acceptance was explicitly revised on 2026-10-01: ChatGPT/Claude product-UI connect/authorize verification is a manual follow-up owned by the user and is not a Phase 38 blocker. Deployed protocol/readiness checks remain required and passed.

## Actual client UI / account checks

Checked on 2026-10-01.

### ChatGPT

The signed-in ChatGPT account for this session is a Plus account.

Current OpenAI Help Center guidance states that full MCP custom apps, including write/modify actions, are available to Business and Enterprise/Edu workspaces. Pro can use a more limited read/fetch custom-app path, while the Plus account used for this project does not expose the full Staff MCP developer-mode flow required by SPEC section 78.

Result:

- The deployed Clinic Cloud + server is ready for the ChatGPT Remote MCP flow.
- The required Staff MCP flow cannot be completed from this signed-in ChatGPT account because the necessary custom-app entitlement is not available.
- This is an external account/plan blocker, not a deployed MCP protocol failure.

Reference checked during Phase 38:

- OpenAI Help Center: "Developer mode and MCP apps in ChatGPT"

### Claude

The signed-in Claude browser session was inspected through the current UI:

- Account plan shown by Claude: Free.
- Customize -> Connectors is available.
- "Add custom connector" exists.
- Claude shows: "Free plan allows 1 custom connector. Upgrade for more."
- The add action is disabled because the one custom-connector slot is already used by the existing connected custom connector named `bdxa`.

Result:

- Claude's current product UI does support the required remote/custom connector concept.
- Clinic Cloud + cannot be added without removing/replacing the existing `bdxa` connector or changing the Claude plan.
- Phase 38 did not delete, replace, or modify `bdxa` because that would be destructive to another existing workflow.

### Official MCP Inspector end-to-end attempt

A separate official MCP Inspector CLI run was started against:

`https://clinic-cloud-plus.vercel.app/mcp/staff`

It successfully completed:

- protected-resource discovery
- authorization-server discovery
- Dynamic Client Registration
- PKCE S256 setup
- generation of the deployed Clinic Cloud + `/oauth/authorize` URL

A temporary isolated Chrome profile was created only for this test. Automatic submission of demo login credentials was blocked by the execution safety layer, so the credential step was not bypassed. The Inspector process, temporary browser profile, logs, and dedicated Chrome windows were then cleaned up.

This leaves the same final human-gated step as the real ChatGPT/Claude product flows: personnel credential authorization in an eligible client/account.

### Claude connector replacement safety check

A reversible temporary swap was investigated without changing the existing connector.

Observed for the existing custom connector `bdxa`:

- Server URL: `https://bdxa.buildifyx.com/mcp`
- Status: Connected
- Connector detail UI exposes `Refresh tools list` and `Remove` only.
- There is no Edit action for changing the server URL in place.

Therefore, testing Clinic Cloud + through this Claude Free account would require removing the existing `bdxa` connector first. That action was not performed because it could destroy an existing authenticated connector configuration and its per-tool permission setup. Phase 38 treats this as an external account/quota blocker rather than modifying another workflow destructively.

### ChatGPT plugin fallback check

The current ChatGPT plugin/app directory was searched for a generic arbitrary remote/custom MCP connector that could accept the Clinic Cloud + endpoint on the signed-in Plus account. No such generic connector was available. Available MCP-backed apps are provider-specific and do not provide the SPEC-required custom Staff MCP registration flow.

### Claude Public MCP end-to-end result

Completed successfully on 2026-10-01 using the signed-in Claude Free account after the user explicitly authorized permanent removal of the previous `bdxa` custom connector.

Observed flow:

- Removed the existing `bdxa` connector permanently.
- Added `Clinic Cloud + Public MCP` with:
  - `https://clinic-cloud-plus.vercel.app/mcp/public`
- Claude detected **No sign-in** automatically.
- Connected successfully without Clinic Cloud + authentication.
- Claude loaded all **7 public tools**:
  - Get clinic information
  - Get public doctors
  - Get opening hours
  - Get public promotions
  - Get service detail
  - Get public services
  - Search public services
- Started a real Claude chat and asked:
  - `คลินิกเปิดกี่โมง? ใช้ Clinic Cloud + Public MCP เท่านั้น และบอกว่าคุณใช้ tool อะไร`
- Claude invoked **Get opening hours / get_opening_hours** from Clinic Cloud + Public MCP.
- Claude completed the response using the MCP result and identified the tool it used.

This confirms the deployed Public MCP works through Claude's actual custom-connector UI and runtime, not only through curl or MCP Inspector.

### Claude Staff MCP live-client progress

Before switching to the Public MCP test, Claude also successfully detected the deployed Staff MCP configuration:

- Endpoint: `https://clinic-cloud-plus.vercel.app/mcp/staff`
- Authentication: **Sign in now — Detected**
- OAuth client mode: **Register automatically — Detected**
- Claude generated a real authorization request containing:
  - authorization code flow
  - PKCE S256
  - `scope=staff:mcp offline_access`
  - `resource=https://clinic-cloud-plus.vercel.app/mcp/staff`
  - Claude callback URL
- The flow reached the deployed Clinic Cloud + `/oauth/authorize` page successfully.

Automatic entry of the demo password was blocked by the execution safety layer, so the human credential submission step was not bypassed.

After the Public MCP test, Arc browser automation became unstable when targeting tabs/windows, so no destructive or blind browser operations were attempted merely to restore the Staff connector. The verified server-side Staff OAuth flow remains ready; completing the live Claude Staff flow still requires the human authorization step.


## Phase 38 completion decision

Phase 38 is complete under the revised project acceptance agreed with the user.

Completion evidence:

- TypeScript: pass.
- ESLint: pass.
- Vitest: 44 files / 328 tests pass.
- Next.js production build: pass.
- Production /login: HTTP 200.
- Unauthenticated /dashboard: redirects to /login.
- Production /mcp/public tools/list: HTTP 200.
- Production /mcp/staff without bearer token: HTTP 401 with protected-resource metadata.
- OAuth authorization-server metadata: HTTP 200.
- Public MCP was additionally exercised end-to-end through Claude and invoked get_opening_hours successfully.
- ChatGPT/Claude product-UI connection and final human OAuth authorization are retained as manual follow-up and do not block completion.
