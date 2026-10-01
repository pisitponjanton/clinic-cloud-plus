# Clinic Cloud + Public Seed Dataset

The public Base Dataset lives under:

`src/data/public/`

Files:

- `clinic.json`
- `doctors.json`
- `services.json`
- `promotions.json`

These files are repository-owned Base Data and are read-only at runtime.

## Seed Volume

| Entity | Count |
| --- | ---: |
| Clinic | 1 |
| Doctors | 4 |
| Services | 8 |
| Promotions | 3 |

This matches the public minimum targets in `SPEC.md`.

## Public Boundary

The public dataset may contain:

- clinic name and description
- public phone/address
- opening hours
- service names/descriptions/prices/durations
- promotion records
- public-safe doctor profiles

It must not contain:

- patient records or HN
- patient search fields
- appointments
- private queue entries
- histories
- password/authentication records
- linked patient identity
- internal doctor schedules
- internal staff identity

## Doctor Projection

`doctors.json` is intentionally a public-safe projection.

Allowed fields are defined by `PUBLIC_DOCTOR_FIELDS` in:

`src/types/public-data.ts`

The public doctor projection currently includes:

- `id`
- `clinicId`
- `displayName`
- `specialty`
- `publicBio`
- `active`

Do not add appointment, patient, internal schedule, or user-auth fields to this file.

## Service Prices

Price is stored directly on each service as required by the SPEC.

No separate public price dataset is needed.

All values are synthetic demonstration values in Thai baht.

## Promotions

Promotion text is the source of truth for the offer represented by that mock record.

The public MCP must not infer or invent a discount that is absent from these records.

An inactive or out-of-range promotion may remain in Base JSON, but active-result filtering belongs to the later data-access/Public MCP implementation.

## Validation

Focused Phase 6 checks live in:

`tests/data/public-data.test.ts`

The later full dataset-integrity phase will additionally validate public/private cross-record relationships together.
