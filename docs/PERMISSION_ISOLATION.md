# Clinic Cloud + Web Permission Isolation Verification

Phase 13 verifies the Web authorization boundary implemented in Phase 12.

The checks intentionally call authorization/data functions directly rather than relying on hidden navigation or buttons.

## Verified PATIENT Isolation

The seeded PATIENT identity is linked to:

`PAT-001`

Verified behavior:

- all-patient list access is rejected
- all-patient search is rejected
- changing patient ID to another seeded patient is rejected
- another patient's history is rejected
- another patient's appointment ID is rejected
- returned appointment records belong only to `PAT-001`
- returned history records belong only to `PAT-001`
- returned queue records belong only to `PAT-001`

This means changing a future route parameter such as `/patients/PAT-002` cannot be treated as authorization by itself. The route must call the same authorized data boundary.

## Verified DOCTOR Relevance

The seeded DOCTOR identity links to:

`DOC-001`

Verified behavior:

- appointment collections contain only records assigned to `DOC-001`
- queue collections contain only records assigned to `DOC-001`
- direct lookup of another doctor's appointment is rejected
- relevant patient collection remains a strict subset of the clinic patient dataset

## STAFF / NURSE

Verified that both roles retain the intended clinic workflow access to:

- patient list
- appointments
- queue

This test prevents patient/doctor scope tightening from accidentally breaking STAFF/NURSE workflow access.

## OWNER

Verified that clinic settings and Demo Reset remain OWNER-only.

STAFF, DOCTOR, NURSE, and PATIENT cannot gain those capabilities from the authorization matrix.

## Role Escalation

A signed session token containing:

- PATIENT user ID
- OWNER role

is rejected during trusted session resolution because the token role does not match the seeded user role.

Authorization therefore starts from the server-resolved `AuthUser`, not a client-selected role parameter.

## UI Independence

Authorization modules do not import navigation/sidebar/component code.

The isolation tests invoke the data/action boundary directly and expect `AuthorizationError` for forbidden resources.

Later UI work may hide forbidden controls for usability, but the underlying rejection must remain in place.

## Remaining Route-Level Work

At this phase, protected page layouts/routes have not yet been created.

Unauthenticated protected-route redirect and Access Denied page/redirect behavior are therefore validated when the protected application shell/routes are implemented.

The data/resource isolation required underneath those routes is already covered here.
