# Clinic Cloud + Private Seed Dataset

The private Base Dataset lives under:

`src/data/private/`

Files:

- `users.json`
- `patients.json`
- `appointments.json`
- `queue.json`
- `histories.json`

These records are synthetic Mockup MVP data and must not be exposed through Public MCP.

## Seed Volume

| Entity | Count |
| --- | ---: |
| Demo users | 5 |
| Patients | 20 |
| Appointments | 30 |
| Queue entries | 8 |
| Patient history entries | 30 |

## Demo Accounts

The dataset contains one active user for each required role:

- OWNER — `owner@cliniccloud.demo`
- STAFF — `staff@cliniccloud.demo`
- DOCTOR — `doctor@cliniccloud.demo`
- NURSE — `nurse@cliniccloud.demo`
- PATIENT — `patient@cliniccloud.demo`

The tester credential remains `12345678`.

The JSON stores a deterministic SHA-256 representation of that demo-only password rather than plaintext. This is an implementation convenience for the Mockup MVP and is not a production password-storage design.

The later authentication phase owns actual credential verification and signed session behavior.

## Identity Links

- `USR-DOCTOR-001` links to `DOC-001`.
- `USR-PATIENT-001` links to `PAT-001`.
- OWNER, STAFF, and NURSE do not carry patient/doctor links.

## A/B Experiment Scenario

`PAT-001` is the deterministic primary scenario.

It includes:

- searchable name: สมชาย ใจดี
- HN: `HN000001`
- a completed appointment on 2026-09-15
- a current/check-in appointment on 2026-10-01
- a future confirmed appointment on 2026-10-05
- a queue entry on 2026-10-01
- a linked synthetic history entry
- resolvable doctor/service IDs

This scenario is intended to be reused later by the Web and Staff MCP experiment flows.

## Privacy Rules

Private JSON may contain patient and authentication-related mock fields because it is application-internal Base Data.

It must never be:

- imported into Public MCP tool handlers,
- returned by Public MCP,
- shipped wholesale to unauthenticated client code,
- treated as real clinical data.

All names, phone numbers, histories, and credentials are synthetic/demo-only.

## History Content

History summaries intentionally remain generic and explicitly identify themselves as synthetic.

Do not add realistic sensitive diagnoses or unnecessary clinical detail merely to make the demo look more authentic.

## Validation Boundary

Phase 7 performs focused checks for:

- minimum counts,
- exact demo roles/emails,
- hashed demo credential representation,
- required patient/doctor demo links,
- PAT-001 experiment scenario,
- status vocabulary,
- explicitly synthetic history text.

Full unique-ID and cross-file referential-integrity validation is intentionally handled in the next dataset-integrity phase.
