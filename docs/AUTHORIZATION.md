# Clinic Cloud + Web Authorization

Phase 12 adds the application/data authorization boundary used by later Web routes and workflows.

Authentication answers **who the current user is**.

Authorization answers **which records/actions that trusted identity may access**.

## Modules

- `src/authorization/permissions.ts`
  - role/capability matrix
  - resource-scope helpers
  - appointment action checks
  - `AuthorizationError`
- `src/authorization/data.ts`
  - authorized patient reads/search
  - authorized appointment reads
  - authorized queue reads
  - authorized patient history reads
  - create/update/cancel action assertions

UI hiding is not the authorization boundary.

Later pages should use the authorized data facade instead of importing unrestricted private data access for user-facing records.

## Role Policy

### OWNER

Broad clinic demo access:

- patient list/search/detail/history
- all appointments
- all queue entries
- appointment create/update/cancel
- settings
- demo reset

### STAFF

Clinic workflow access:

- patient list/search/detail/history
- all appointments
- all queue entries
- appointment create/update/cancel

No Demo Settings/reset permission.

### NURSE

Clinic workflow access aligned with the MVP matrix:

- patient list/search/detail/history
- all appointments
- all queue entries
- appointment create/update/cancel

No Demo Settings/reset permission.

### DOCTOR

Doctor data is scoped by the seeded `linkedDoctorId`.

The Web layer exposes:

- relevant patients
- appointments assigned to that doctor
- queue entries assigned to that doctor
- appointment create for the demo
- update/cancel only for relevant assigned appointments

Relevant patients are derived from doctor-linked appointments, queue entries, or history.

This intentionally applies the SPEC's “relevant/assigned” principle instead of representing unrestricted production clinical access.

### PATIENT

Patient scope is derived only from authenticated `linkedPatientId`.

PATIENT:

- cannot list/search all patients
- can read only the linked patient profile
- can read only linked patient history
- can read only linked patient appointments
- can read only linked patient queue entries
- cannot create/update/cancel appointments in the Web MVP
- cannot access clinic settings/demo reset

Changing a URL or passing a different patient ID must not broaden this scope.

## Settings Policy

The SPEC permits limited/no settings access for non-owner roles.

This implementation intentionally tightens that ambiguity:

- OWNER: settings + Demo Settings
- STAFF: no general settings capability
- DOCTOR: no general settings capability
- NURSE: no general settings capability
- PATIENT: personal profile is handled through `/me/profile`, not clinic settings

## Authorization Failures

Forbidden access throws `AuthorizationError` with code:

`FORBIDDEN`

Later route/UI layers may map this to an Access Denied view or safe redirect.

Missing resources remain distinct:

- permitted lookup + missing ID → `null` or `[]`
- existing resource outside scope → `AuthorizationError`

This prevents the application from silently returning protected data.

## Raw Data Access

`src/data-access/private.ts` remains the repository Base Dataset reader.

It is not itself a user permission boundary.

User-facing Web/MCP code should compose through authorization before returning private data.

## Future Staff MCP

Staff MCP has a separate authenticated token boundary, but it should reuse these resource-scope principles where the Web/MCP permission matrices overlap.

PATIENT is never a Staff MCP role.
