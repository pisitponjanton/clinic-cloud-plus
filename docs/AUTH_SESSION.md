# Clinic Cloud + Web Authentication and Session

This document describes the Web session implementation introduced in Phase 10.

It covers Web login/session only. Staff MCP OAuth/authentication is a separate trust boundary and is implemented later.

## Demo Identity Source

The predefined demo users remain in:

`src/data/private/users.json`

Credential lookup is performed through the private Base data-access layer.

All five seeded demo users continue to accept:

`12345678`

The repository stores a deterministic SHA-256 representation of this demo-only password. This is intentionally limited to the Mockup MVP and is not a production password-storage design.

## Authentication Modules

- `src/auth/password.ts` — demo password verification
- `src/auth/session-token.ts` — signed stateless session token
- `src/auth/user.ts` — credential authentication and trusted user resolution
- `src/auth/current-user.ts` — server-side current-user resolution from the Web cookie
- `src/auth/config.ts` — cookie/session configuration

## Session Token

The Web session token is signed with HMAC-SHA256.

The signed payload contains only the minimum identity context:

- token version
- user ID
- clinic ID
- role
- issued-at timestamp
- expiry timestamp

Default Web session lifetime:

- 8 hours

A valid signature alone is not enough to produce the current user.

After token verification, the resolver loads the seeded user again and requires:

- user still exists
- user is active
- clinic ID matches
- role matches

This prevents the application from trusting an arbitrary client-supplied role.

## Signing Secret

Required environment variable:

`CLINIC_CLOUD_SESSION_SECRET`

Requirements:

- must be set at runtime
- minimum 32 characters
- must be configured as a Vercel environment secret in deployment
- must not be committed to the repository

See `.env.example`.

There is intentionally no hardcoded development fallback secret.

## Cookie

Cookie name:

`clinic-cloud-plus.session`

Properties:

- `HttpOnly=true`
- `SameSite=Lax`
- `Path=/`
- `Secure=true` in production
- `Max-Age=8 hours`

Authentication does not use localStorage.

## Route Handlers

### POST /api/auth/login

Input:

```json
{
  "email": "staff@cliniccloud.demo",
  "password": "12345678"
}
```

Successful behavior:

1. normalize/lookup seeded email
2. require active demo user
3. verify password
4. create signed session token
5. set HttpOnly session cookie
6. return safe user identity without `passwordHash`

Invalid credentials return HTTP 401 and do not create a session.

Malformed/missing request fields return HTTP 400.

Missing/invalid server session-secret configuration returns HTTP 500 without exposing the secret.

### GET /api/auth/session

Resolves the signed cookie to the current trusted Base user.

Authenticated response returns safe user identity.

Missing, expired, tampered, or identity-mismatched sessions return HTTP 401.

Invalid sessions are expired from the response cookie.

### POST /api/auth/logout

Logout:

1. expires the Web session cookie
2. redirects to `/login` with HTTP 303
3. does not modify Clinic Cloud + localStorage demo state

## Route Protection

Phase 10 establishes authentication primitives and current-user resolution.

Protected route enforcement and role-aware data/action authorization are completed by the later permission/application-shell phases.

## Security Boundary

The browser cannot choose its trusted role.

The signed token is validated server-side and the current user is re-resolved from Base JSON.

The Web cookie is separate from future Staff MCP OAuth/access tokens. ChatGPT/Claude MCP clients must not assume access to the browser's HttpOnly Web cookie.
