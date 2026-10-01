# Clinic Cloud + Role-Aware Application Shell

Phase 15 introduces the protected application shell and role-aware navigation.

## Protected Layout

Protected routes live under the App Router route group:

`app/(protected)/`

The route group does not change user-visible URLs.

`app/(protected)/layout.tsx` calls:

`requireCurrentUser()`

before rendering the application shell.

Unauthenticated requests are redirected to:

`/login`

The authenticated shell receives the trusted `AuthUser` resolved from the signed Web session.

## Current Protected Entry

`/dashboard`

now exists as a protected route and renders inside the shell.

The page currently contains a focused shell-readiness placeholder only. Role-aware dashboard data/content belongs to Phase 16.

## Navigation Matrix

Navigation data lives in:

`src/navigation/app-navigation.ts`

### OWNER

- Dashboard
- Patients
- Appointments
- Queue
- Settings
- Demo Settings

### STAFF

- Dashboard
- Patients
- Appointments
- Queue

### NURSE

- Dashboard
- Patients
- Appointments
- Queue

### DOCTOR

- Dashboard
- Patients
- Appointments
- Queue

Doctor resource filtering remains enforced by the authorization/data layer.

### PATIENT

- My Dashboard
- My Profile
- My Appointments
- My Queue
- My History

PATIENT navigation does not contain the internal all-patient, internal appointment, queue, or settings URLs.

Navigation visibility remains a UX layer only. Data authorization continues to be enforced separately.

## Active State

The active navigation helper uses the most specific matching path.

For example:

`/settings/demo`

activates only Demo Settings rather than both Settings and Demo Settings.

Deep routes such as:

`/patients/PAT-001`

resolve the parent Patients navigation item.

## Responsive Shell

### Desktop

Desktop uses a persistent sidebar with:

- Clinic Cloud + identity
- primary navigation
- current user identity
- current role badge
- Logout action

The sidebar is sticky while the page itself remains the main scroll container.

### Mobile / Tablet

Compact layouts use a sticky top bar and official shadcn/Base UI `Sheet`.

The mobile Sheet includes:

- an accessible Open navigation button
- explicit Sheet title and description
- the same role-aware navigation data as desktop
- current user identity
- Logout action
- focus-managed Close control

No hover interaction is required.

## Logout

Logout is a standard POST form to:

`/api/auth/logout`

The existing auth route expires only the Web session cookie and redirects to `/login`.

It does not clear Clinic Cloud + browser local demo data.

## Tests

`tests/navigation/app-shell.test.tsx` verifies:

- exact OWNER navigation
- STAFF/NURSE/DOCTOR navigation
- PATIENT-only personal navigation
- PATIENT internal-navigation isolation
- most-specific active state
- role/user identity rendering
- Logout presence
- mobile Sheet open/close behavior

`tests/auth/protected-route.test.ts` verifies:

- authenticated user is returned
- unauthenticated user is redirected to `/login`

## Phase Boundary

Phase 15 does not implement actual dashboard data, patient list pages, appointment pages, queue pages, settings pages, or patient-facing content pages.

Those routes/content are implemented in the following focused phases.
