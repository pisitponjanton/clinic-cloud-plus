# Clinic Cloud + Production Build & Performance Validation

Phase 37 validates the implemented MVP against the frontend baseline and the project-local `senior-frontend` guidance.

## Baseline

From `docs/FRONTEND_BASELINE.md`:

- primary profile: mobile browser on typical 4G
- LCP target: <= 2000 ms at p75
- INP target: <= 200 ms at p75
- CLS target: <= 0.1 at p75
- per-route JavaScript budget: <= 150 KB gzip where practical
- Lighthouse accessibility target: >= 95
- Lighthouse performance target: >= 90
- App Router / React Server Components by default
- authenticated application is auth-walled

## Production build

Validated with:

`npm run build`

Environment:

- Next.js 16.3.8
- Turbopack production build

Final result:

- production compilation: pass
- production TypeScript validation: pass
- static page generation: pass
- route optimization: pass

Observed production route classification:

Static:

- `/`
- `/login`
- `/signup`
- framework not-found page

Dynamic / server-rendered on demand:

- protected application routes
- auth route handlers
- handoff route
- Public MCP
- Staff MCP
- OAuth / well-known endpoints

This matches the current architecture: public entry surfaces can be static while authenticated/private/MCP surfaces remain runtime-resolved.

## Type / lint / regression gates

Final Phase 37 checks:

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm test`: pass
- test files: 44 / 44
- tests: 327 / 327
- `npm run build`: pass

## Client JavaScript budget

Route JavaScript was measured from the final Turbopack `client-reference-manifest` entry chunks.

The measurement is a conservative per-route estimate:

1. collect unique `entryJSFiles` referenced by each page manifest
2. read final production chunk bytes
3. gzip each unique chunk at level 9
4. sum gzip sizes per route

Budget:

`<= 150 KB gzip / route where practical`

Results:

| Route | Approx. gzip JS |
| --- | ---: |
| `/appointments/[appointmentId]` | 102.0 KB |
| `/appointments/new` | 101.5 KB |
| `/appointments` | 89.9 KB |
| `/queue` | 89.9 KB |
| `/settings/demo` | 73.9 KB |
| `/me/appointments` | 71.3 KB |
| `/handoff/appointment` | 67.9 KB |
| `/patients/[patientId]` | 67.1 KB |
| `/patients` | 63.9 KB |
| `/dashboard` | 63.3 KB |
| `/me/profile` | 63.3 KB |
| `/me/queue` | 63.3 KB |
| `/me/history` | 63.3 KB |
| `/settings` | 63.3 KB |
| `/login` | 60.5 KB |
| `/signup` | 59.6 KB |
| `/` | 12.2 KB |

Summary:

- maximum measured page JS: approximately 102.0 KB gzip
- routes over 150 KB budget: 0
- largest routes remain approximately 48 KB below the 150 KB budget

No dynamic-import refactor is required for the current MVP based on this budget.

## CSS

Final production CSS:

- raw: approximately 77.0 KB
- gzip: approximately 14.3 KB

No CSS-size blocker was found.

## Server / Client boundary review

Detected explicit Client Components: 30.

The count includes:

- App Router error boundaries, which must be Client Components
- application shell interaction
- login/signup interaction
- localStorage appointment flows
- prepared-action confirmation
- shadcn/Base UI interactive primitives

Large/important interactive Client Components are intentional:

- `components/app-shell/app-shell.tsx`
  - uses pathname state and mobile Sheet interaction
- `components/appointments/create-appointment-form.tsx`
  - interactive validation + browser-local persistence
- `components/appointments/appointment-mutation-panel.tsx`
  - edit/cancel/confirmation + browser-local persistence
- `components/handoff/appointment-handoff-confirmation.tsx`
  - Web confirmation and localStorage write
- patient appointment/settings mutable views
  - require browser-local overlay access

Direct Client Component boundary scan found no imports of:

- `src/data-access/private`
- private JSON modules
- server authorization-data facade
- server current-user/protected helpers

No Client Component directly imports private Base Dataset JSON.

## Client bundle leakage review

Production static JavaScript was scanned for representative server/private markers.

Not present:

- `@modelcontextprotocol/server` marker
- handoff test secret
- patient HN `HN000001`
- patient name `สมชาย ใจดี`

Present:

- `owner@cliniccloud.demo`

This is expected and intentional because the Login screen contains the explicit Demo Account role/email helper required for MVP usability.

The demo password is also intentionally visible on the public demo UI and is not treated as a production credential.

## Dependency review

No client imports were found for the heavy dependency examples called out by the project-local frontend skill:

- moment
- lodash
- axios
- jquery
- @mui/material

The MCP SDK remains server-side and was not detected in production static client JavaScript.

No new bundle-analysis dependency was added.

## Runtime choice

No route explicitly opts into Edge Runtime.

The application therefore uses the default Node-compatible runtime where required, which is consistent with existing Node crypto use for:

- session/token operations
- encrypted appointment handoff tokens
- MCP/OAuth server behavior

This avoids introducing an Edge/Node compatibility blocker before Vercel validation.

## Handoff token blocker discovered during Phase 37

The first full-suite run exposed a flaky token-tamper test.

Root cause:

- the token uses unpadded Base64URL segments
- for some final characters, changing unused Base64 padding bits can produce a different text representation that decodes to the same bytes
- the previous decoder accepted those non-canonical aliases

This did not bypass AES-256-GCM authentication bytes, but it meant a textually modified token could occasionally remain equivalent after Base64URL decoding.

Phase 37 hardened the verifier:

- Base64URL segments must use the allowed URL-safe alphabet
- decoded bytes are re-encoded
- input must exactly match the canonical re-encoding
- non-canonical aliases are rejected before decryption

Tests now cover:

- ciphertext byte tampering
- expiry
- non-canonical Base64URL alias rejection even when decoded bytes are identical
- Web identity mismatch and revalidation behavior

Focused handoff tests:

- 10 / 10 pass

Full suite after hardening:

- 327 / 327 pass

## Lighthouse / Web Vitals limitation

This workspace currently does not have:

- a Chrome/Chromium executable
- Lighthouse installed locally

Therefore Phase 37 does **not** claim measured Lighthouse, LCP, INP, or CLS values.

Static production evidence confirms:

- route JS budget is met
- CSS payload is bounded
- RSC/server-client boundaries are reasonable for the MVP
- no identified heavy client dependency blocker exists

Actual runtime/deployed behavior remains to be validated against the deployed application environment.

## Phase conclusion

Production build, TypeScript, lint, regression tests, client/server boundary review, client-bundle leakage checks, CSS payload, and per-route JavaScript budget all pass for the current MVP.

No bundle blocker or Server/Client architecture blocker remains in Phase 37.

Phase 38 is responsible for deployed Vercel behavior and real MCP client connection validation.
