# Clinic Cloud + Staff MCP Authentication

Phase 30 implements the authentication foundation for:

`/mcp/staff`

This phase intentionally registers no Staff MCP tools yet.

## Trust boundary

Staff MCP accepts only authenticated personnel identities:

- OWNER
- STAFF
- DOCTOR
- NURSE

PATIENT cannot become a Staff MCP identity.

Identity and role are derived from:

- signed authorization/access tokens
- the current Base user record

Role is never accepted from MCP tool input.

The Staff MCP flow does not reuse the Web application's HttpOnly session cookie.

## OAuth-compatible flow

Implemented flow:

`Dynamic Client Registration → Authorization Code + PKCE S256 → Bearer Access Token → /mcp/staff`

Routes:

- `/.well-known/oauth-authorization-server`
- `/.well-known/oauth-protected-resource/mcp/staff`
- `/oauth/register`
- `/oauth/authorize`
- `/oauth/token`
- `/mcp/staff`

The authorization page validates the same seeded demo accounts used by Web login, but accepts only personnel roles.

## Stateless design

No authentication database was added.

The following are signed stateless artifacts:

- registered client ID
- authorization code
- Staff MCP access token

The MVP uses HMAC SHA-256 signatures and short expirations.

Authorization code lifetime:

- 2 minutes

Access token lifetime:

- 1 hour

Registered client ID lifetime:

- 1 year

Advanced persistent revocation/session management remains outside the no-database MVP scope.

## PKCE

Only public clients are supported:

`token_endpoint_auth_method = none`

Authorization requires:

- response_type = code
- PKCE method = S256
- a valid code challenge
- exact registered redirect URI
- scope = `staff:mcp`

Token exchange revalidates:

- signed registered client
- signed authorization code
- client ID
- redirect URI
- PKCE verifier
- current Base user identity
- current Base user role
- personnel-role membership

## Access token contract

Signed access tokens contain trusted claims including:

- subject user ID
- clinic ID
- role
- audience = `clinic-cloud-plus-staff-mcp`
- client ID
- scope = `staff:mcp`
- issued-at time
- expiration time

Bearer verification reloads the Base user and requires:

- user still exists
- user is active
- clinic ID matches
- role matches
- role remains personnel

A token whose role payload is modified without a valid signature is rejected.

Expired tokens are rejected.

## MCP resource server

`/mcp/staff` uses the official MCP SDK bearer-auth gate.

Unauthenticated requests receive:

- HTTP 401
- `WWW-Authenticate: Bearer ...`
- RFC 9728 protected-resource metadata reference

A valid bearer token is passed into the MCP handler as trusted `authInfo`.

The trusted auth context includes only the identity fields needed for later authorization:

- userId
- clinicId
- role
- linkedDoctorId

No password, password hash, signing secret, or bearer token is serialized as a Staff tool result.

## Discovery metadata

Authorization-server metadata advertises:

- issuer
- authorization endpoint
- token endpoint
- dynamic registration endpoint
- scope `staff:mcp`
- authorization_code grant
- response type code
- PKCE S256
- public client token auth method none

Protected-resource metadata identifies:

`/mcp/staff`

and the same authorization server.

## Host / Origin protection

Staff MCP uses Host and Origin validation.

Allowed hosts come from:

- localhost
- 127.0.0.1
- `STAFF_MCP_ALLOWED_HOSTS`
- Vercel deployment host environment variables

## Environment

Added:

`CLINIC_CLOUD_STAFF_MCP_SECRET`

This value must contain at least 32 characters.

Added:

`STAFF_MCP_ALLOWED_HOSTS`

Runtime signing material is loaded only from environment configuration.

The repository contains only a placeholder in `.env.example`.

## Phase 30 tests

Added:

`tests/mcp/staff-mcp-auth.test.ts`

Verified:

- OAuth and protected-resource metadata
- stateless dynamic client registration
- authorization login page
- seeded OWNER authorization
- seeded STAFF authorization
- seeded DOCTOR authorization
- seeded NURSE authorization
- PATIENT authorization rejection
- signed-role tampering rejection
- expired-token rejection
- wrong PKCE verifier rejection
- unauthenticated Staff MCP 401 challenge
- valid Bearer Staff MCP access without Web session cookie

Focused tests:

- 12 / 12 passing

Full regression:

- 38 test files passing
- 281 / 281 tests passing

Additional checks:

- TypeScript: pass
- ESLint: pass
- production build: pass

Production routes include:

- `/.well-known/oauth-authorization-server`
- `/.well-known/oauth-protected-resource/mcp/staff`
- `/oauth/register`
- `/oauth/authorize`
- `/oauth/token`
- `/mcp/staff`

## Boundary scans

Verified:

- no Web session-cookie dependency
- no browser localStorage dependency
- runtime signing secret is environment-only
- Staff MCP registered-tool count remains 0 in Phase 30

## Phase boundary

Phase 30 implements authentication only.

Phase 31 registers the required Staff MCP read tools and derives their permissions from this trusted bearer-token identity.

## Phase 38 remote-client compatibility update

Phase 38 keeps the Phase 30 trust boundary unchanged and extends only the OAuth transport behavior needed by current remote MCP clients.

Current authorization-server behavior additionally supports:

- optional `offline_access` alongside `staff:mcp`
- `refresh_token` grant
- signed stateless refresh tokens with a 30-day lifetime
- refresh-token/client binding and current Base-user revalidation
- a fresh signed refresh token on successful refresh exchange
- OAuth authorization response `iss`
- Dynamic Client Registration `application_type` values `web` and `native`

The authorization-code flow remains PKCE S256 and still derives role and identity only from trusted signed artifacts plus the current Base user record. Requesting `offline_access` does not broaden Staff MCP permissions; it only permits refreshing the same `staff:mcp` authorization.

Because the MVP intentionally has no persistent authentication database, server-side refresh-token revocation/history is outside scope. Token expiry, signature validation, client binding, and current personnel-role validation remain enforced.

Phase 38 verification details are recorded in `docs/PHASE_38_VERIFICATION.md`.
