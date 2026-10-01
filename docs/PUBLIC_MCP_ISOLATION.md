# Public MCP Isolation — Phase 29

Phase 29 verifies that `/mcp/public` stays authless and restricted to the public Base Dataset.

## Dedicated tests

Added:

`tests/mcp/public-mcp-isolation.test.ts`

Coverage:

- exact clinic info vs public JSON
- exact weekly/day opening hours vs public JSON
- exact services and prices vs public JSON
- exact promotion records plus documented derived status
- exact public-safe doctor projection
- exactly seven tools from `tools/list`
- exact published input-key surface
- `additionalProperties = false` on every tool
- unexpected extra input rejected by MCP validation
- arbitrary non-service search text cannot leave the service catalog
- MCP instructions state that authenticated personal context is unavailable
- public implementation has no private-data, Web-auth, browser-storage, or Staff MCP dependency

## Published tool surface

Exactly seven tools:

- get_clinic_info
- get_opening_hours
- get_services
- get_service_detail
- search_services
- get_promotions
- get_doctors_public

Published input keys are limited to:

- `day`
- `serviceId`
- `query`

Tools with no arguments publish an empty strict object schema.

## Boundary result

Static verification:

- registerTool count = 7
- public-data boundary only
- no Web auth/session dependency
- no browser storage dependency
- no Staff MCP dependency

Result:

`PUBLIC_MCP_BOUNDARY_OK`

## Verification results

- Public MCP isolation tests: 11 / 11
- Public MCP smoke tests: 4 / 4
- Full project suite: 269 / 269
- TypeScript: pass
- ESLint: pass
- Production build: pass
- `/mcp/public`: dynamic production route

## Phase boundary

Phase 29 contains tests and verification only.

Staff MCP authentication begins in Phase 30.
