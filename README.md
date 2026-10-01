# Clinic Cloud +

Clinic Cloud + is a mock clinic workflow MVP that compares a normal Web workflow with AI access through MCP.

The product requirements and implementation rules live in:

- `SPEC.md` — product and system source of truth.
- `AGENT.md` — repository workflow and implementation guardrails.
- `skills/` — project-local frontend and UX/UI skill references.
- `docs/FRONTEND_BASELINE.md` — frontend performance and accessibility baseline.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui (initialized in a later implementation phase)
- Vitest + Testing Library
- Vercel

## Local Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Do not introduce an external persistent database or a separate backend unless the product specification is explicitly changed.