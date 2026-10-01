# Frontend Baseline

This document records the frontend assumptions and verifiable performance/accessibility targets required before implementation scaffolding.

## Assumptions

- Primary device/network: mobile browser on a typical 4G connection.
- Secondary environments: tablet and desktop browsers.
- LCP target: <= 2000 ms at p75 on the primary mobile-4G profile.
- Rendering model: Next.js App Router, React Server Components by default, Client Components only where browser APIs or interaction require them.
- SEO model: public landing/auth entry pages may be indexable; authenticated clinic and patient application areas are auth-walled and are not SEO-dependent.
- Accessibility target: WCAG 2.1 AA for primary workflows.
- Accessibility owner: Clinic Cloud + Frontend Owner.

## Verifiable Targets

- LCP: <= 2000 ms at p75 on mobile 4G.
- INP: <= 200 ms at p75.
- CLS: <= 0.1 at p75.
- Per-route JavaScript budget: <= 150 KB gzip where practical; any deliberate exception must be documented during performance review.
- Lighthouse accessibility floor: >= 95 for representative primary pages.
- Lighthouse performance floor: >= 90 for representative public/primary pages under the agreed test profile.

## Implementation Rules

- Prefer Server Components for data/static presentation.
- Add "use client" only when required by state, event handlers, browser APIs, or interactive component libraries.
- Avoid large client-only page shells.
- Avoid duplicate UI libraries that overlap with shadcn/ui.
- Keep mobile interaction usable without hover.
- Re-check these targets during the dedicated production build/performance phase.

These targets support the MVP experiment and must not override functional or security requirements in `SPEC.md`.
