# Clinic Cloud + Public Auth Screens

Phase 14 implements the public Web entry surfaces:

- `/`
- `/login`
- `/signup`

These screens use the shared Clinic Cloud + design system and do not implement the protected application shell.

## Landing

The landing page is intentionally concise.

It provides:

- Clinic Cloud + identity
- short Mockup MVP explanation
- synthetic-data disclosure
- direct Sign in action
- secondary Signup demo action
- current public clinic/demo context

It avoids a long marketing layout and does not expose private patient data.

## Login

`/login` uses the real Web authentication endpoint:

`POST /api/auth/login`

Behavior:

- Email and Password fields
- inline required-field validation
- clear server/API error state
- preserves entered values when authentication fails
- loading/disabled submit state while request is pending
- redirects to `/dashboard` after successful authentication
- links to Signup
- displays all five predefined demo roles

Demo account helper buttons fill:

- the selected seeded email
- shared demo password `12345678`

The password is visible here because the repository contains mock data only, as allowed by `SPEC.md`.

## Signup

`/signup` is intentionally non-persistent.

The form does not call an API and does not create a user.

After valid browser form submission it shows exactly:

`Demo MVP — การสมัครสมาชิกยังไม่เปิดใช้งาน กรุณาใช้ Demo Account เพื่อทดลองระบบ`

The interface also states before submission that the page is a demo flow and does not create a real account.

## Auth Layout

`components/auth/auth-frame.tsx` provides the shared public auth presentation.

It communicates:

- Clinic Cloud + branding
- Mockup MVP context
- synthetic-data boundary
- focused form surface

It is intentionally separate from the role-aware authenticated application shell implemented later.

## Tests

`tests/auth/auth-screens.test.tsx` verifies:

- public landing entry links
- demo-account credential prefill
- inline login validation
- successful login API request and dashboard navigation
- authentication error rendering and value preservation
- Signup exact Demo MVP notice
- Signup does not call `fetch` or claim account creation

## Phase Boundary

Protected layouts, protected-route redirect behavior, authenticated navigation, and Dashboard UI are not part of Phase 14.

Those belong to the following application-shell/dashboard phases.
