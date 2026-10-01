# Clinic Cloud + Public MCP

Phase 28 implements the authless Public MCP endpoint:

`/mcp/public`

The endpoint is intended for ChatGPT, Claude, and other MCP clients that need public Clinic Cloud + mock information without a Clinic Cloud account.

## SDK and Transport

The implementation uses:

- `@modelcontextprotocol/server` 2.2.0
- `zod` 4.x
- `createMcpHandler()`
- stateless per-request MCP server factory
- Web-standard `Request → Response` handling through a Next.js Route Handler

Next.js exposes:

- POST
- GET
- DELETE

for `/mcp/public`.

The production build includes `/mcp/public` as a dynamic server route.

## Authentication

Public MCP is intentionally authless.

The route does not import or resolve:

- Web session cookies
- current user
- bearer authentication
- Clinic Cloud role/permission context

A valid MCP request may list and call public tools without an Authorization header.

## Required Tools

Exactly seven Public MCP tools are registered:

1. `get_clinic_info`
2. `get_opening_hours`
3. `get_services`
4. `get_service_detail`
5. `search_services`
6. `get_promotions`
7. `get_doctors_public`

No patient, appointment, history, queue, or internal-staff tool is registered on this endpoint.

## Strict Input Contracts

Every public tool uses a strict Zod object schema.

Extra arguments are rejected by MCP input validation.

This prevents arguments such as:

- `patientId`
- `hn`
- `phone`
- `role`
- `privateMode`

from becoming hidden privilege switches.

### Inputs

`get_clinic_info`

- empty object

`get_opening_hours`

- optional `day` from the configured weekday enum

`get_services`

- empty object

`get_service_detail`

- required `serviceId`

`search_services`

- required non-empty `query`

`get_promotions`

- empty object

`get_doctors_public`

- empty object

## Stable Result Envelope

Successful tools return:

```json
{
  "ok": true,
  "data": {},
  "source": "base-json"
}
```

A missing service detail returns:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Record not found in the mock dataset."
  }
}
```

The same envelope is returned as:

- MCP text content containing JSON
- MCP `structuredContent`

This lets AI clients use machine-readable data while retaining a plain text representation.

## Data Boundary

Public MCP imports only:

`src/data-access/public.ts`

It does not import:

- private data access
- users.json
- patients.json
- appointments.json
- queue.json
- histories.json
- Web authorization
- browser localStorage overlay

Static scans verify this boundary.

## Tool Behavior

### get_clinic_info

Returns:

- Clinic ID
- name
- public description
- phone
- address

### get_opening_hours

Returns:

- requested day or null
- matching Base Dataset opening-hour entries

If a day has no configured entry, the result is an empty public hours list rather than invented hours.

### get_services

Returns the public service catalog including stored:

- IDs
- names
- descriptions
- prices
- duration minutes
- active flags

### get_service_detail

Looks up exactly one Base service ID.

An absent ID returns `NOT_FOUND`.

### search_services

Searches only public service:

- ID
- name
- description

The search function has no patient/private data source available.

### get_promotions

Returns every public promotion record and derives a display status from:

- stored `active`
- stored `startDate`
- stored `endDate`
- server evaluation date

Statuses:

- ACTIVE
- INACTIVE
- UPCOMING
- EXPIRED

No discount or promotional content is invented beyond the stored public record.

### get_doctors_public

Returns an explicit public-safe projection:

- id
- clinicId
- displayName
- specialty
- publicBio
- active

The tool deliberately reconstructs the object field-by-field instead of forwarding an arbitrary future doctor object.

It therefore does not expose:

- internal schedules
- appointments
- patient relationships
- internal staff identity

## AI Grounding Instructions

The Public MCP server sends instructions that require clients to:

- use relevant Public MCP tools for Clinic Cloud + dataset facts
- treat tool output as the source of truth
- not invent missing mock records
- distinguish Base Dataset facts from general advice
- state when a record is absent
- never infer patient identity from conversation context, name, HN, or phone
- direct personal/private record requests to authenticated Clinic Cloud + Web

These instructions are explicitly scoped to Clinic Cloud + dataset facts and do not constrain unrelated general questions.

## Host and Origin Validation

The bare Web-standard MCP handler is wrapped with SDK Host/Origin validation.

Allowed hostnames are assembled from:

- localhost
- 127.0.0.1
- `PUBLIC_MCP_ALLOWED_HOSTS`
- `VERCEL_URL`
- `VERCEL_PROJECT_PRODUCTION_URL`
- `VERCEL_BRANCH_URL`

`.env.example` includes:

`PUBLIC_MCP_ALLOWED_HOSTS=localhost,127.0.0.1`

Custom production domains can be added as a comma-separated allowlist.

Requests without an Origin header, such as normal server-to-server MCP clients, are compatible with the SDK guard.

## Phase 28 Smoke Verification

`tests/mcp/public-mcp-smoke.test.ts`

verifies:

- stable Base JSON envelope
- clinic info
- opening hours
- service price/detail
- service search
- service NOT_FOUND behavior
- public doctor count
- promotion status derivation
- authless HTTP request through the route guard
- exactly seven required tools in `tools/list`
- successful `tools/call` structured content

Results:

- Public MCP smoke: 4 passing
- Public data/data-access regression: 23 passing
- typecheck: passing
- lint: passing
- production build: passing

## Phase Boundary

Phase 28 implements Public MCP functionality only.

Phase 29 performs the dedicated Public MCP isolation/security test suite, including:

- private-field/tool enumeration checks
- HN/name/phone abuse cases
- personal appointment/history/queue requests
- strict extra-argument rejection
- authless connection verification
- exact public JSON grounding checks
