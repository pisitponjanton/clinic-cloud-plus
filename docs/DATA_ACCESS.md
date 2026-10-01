# Clinic Cloud + Base Data Access

The Base Dataset access boundary lives in:

- `src/data-access/public.ts`
- `src/data-access/private.ts`

Application pages and MCP implementations should reuse this layer instead of importing/searching JSON files independently.

## Public Access

`src/data-access/public.ts` imports public-safe JSON only.

Available functions:

- `getClinic()`
- `getDoctors()`
- `getDoctorById(doctorId)`
- `getServices()`
- `getServiceById(serviceId)`
- `searchServices(query)`
- `getPromotions()`
- `getPromotionById(promotionId)`

This module must remain safe for the later Public MCP implementation.

## Private Access

`src/data-access/private.ts` owns reads from internal mock records.

Available functions:

- `getUsers()`
- `getUserById(userId)`
- `getUserByEmail(email)`
- `getPatients()`
- `getPatientById(patientId)`
- `searchPatients(query)`
- `getAppointments()`
- `getAppointmentById(appointmentId)`
- `getAppointmentsByPatient(patientId)`
- `getAppointmentsByDoctor(doctorId)`
- `getAppointmentContextById(appointmentId)`
- `getQueue()`
- `getQueueByPatient(patientId)`
- `getQueueContext(entryId)`
- `getPatientHistory(patientId)`
- `getPatientHistoryContext(historyId)`

## Relationship Resolution

The context functions resolve relationships through the same Base Dataset:

- appointment → patient / doctor / service
- queue → patient / appointment / doctor
- history → patient / appointment / doctor

Callers should not reimplement these joins by importing JSON directly.

## Read-only Behavior

All collection and record reads return defensive copies.

A caller can modify a returned object in memory without mutating the module's loaded Base Dataset.

No function in this layer writes JSON or browser storage.

## Missing Records

Single-record lookups return `null` when a record is absent.

Search/filter functions return an empty array when there are no matches.

The layer must not fabricate fallback records.

## Search Behavior

Patient search currently matches:

- internal patient ID
- HN
- first name
- last name
- full name
- phone

Service search currently matches:

- service ID
- name
- description

Search is trimmed and case-insensitive where casing applies.

## Permission Boundary

This phase intentionally does not implement role authorization.

The later permission layer must apply role/patient/doctor scope before private records are exposed to a user or Staff MCP result.

The Public MCP must use the public access module and must never switch to private access based on tool arguments.

## Web Overlay Boundary

These functions return repository Base Data only.

The later Web storage layer will merge localStorage appointment mutations over the results of the Base appointment access functions.

MCP server-side reads remain Base-only unless the explicit prepared-action handoff says otherwise.
