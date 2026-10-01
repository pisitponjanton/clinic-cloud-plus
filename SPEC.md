# Clinic Cloud + — Mockup MVP Specification

> Status: Draft — Phase 1 complete scope only  
> Project type: Mockup MVP / experiment prototype  
> Deployment target: Vercel  
> Source of truth: This `SPEC.md`

## 1. Objective

Clinic Cloud + is a mobile-friendly clinic management Mockup MVP designed to demonstrate and test two ways of accessing the same clinic information and workflow:

1. The normal Web application.
2. AI clients such as ChatGPT or Claude through MCP.

The Web remains the Core System. MCP is an AI-facing interface that exposes approved data and actions. The MVP is intended for demonstration, usability testing, and timed workflow comparison. It is not a production HIS/EMR.

## 2. Core Product Principle

```text
Web App = Core System

AI Client
   ↓
MCP
   ↓
Application / Permission Boundary
   ↓
Mock Dataset / Mock Action
```

The AI must not be treated as the database or as a replacement for the Web application.

For clinic data, the AI must be grounded in the MCP/tool result. It must not invent patient, appointment, queue, service, doctor, price, promotion, or other mock records that are not present in the dataset.

## 3. MVP Scope

The MVP must provide:

- A responsive/mobile-friendly Web interface.
- Mock clinic data stored as static JSON in the repository.
- Browser-local mutable changes using `localStorage`.
- A real demo login/session flow for predefined users.
- A signup page for product completeness, while account creation does not need to persist in this MVP.
- Role/permission boundaries.
- A Staff MCP endpoint for internal/personnel use.
- A Public MCP endpoint for patient/general public use.
- Deployment of the Web app and MCP endpoints on Vercel.

Detailed authentication, route, role, permission, dataset, tool, and user-flow contracts are defined in later phases of this specification.

## 4. Technology Direction

Preferred MVP stack:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui

Static JSON
Browser localStorage

MCP SDK / compatible Next.js MCP handler

Vercel
```

The implementation should stay inside a single Next.js project unless a later validated requirement proves separation is necessary.

## 5. Deployment Boundary

The complete MVP must be deployable on Vercel.

Expected deployment shape:

```text
Git Repository
      ↓
    Vercel
      │
      ├── Web application
      ├── Authentication/session routes
      ├── Staff MCP endpoint
      └── Public MCP endpoint
```

No separately deployed application backend is required for the MVP.

## 6. Explicitly Excluded Infrastructure

The MVP must not depend on:

- Supabase
- PostgreSQL
- MySQL
- MongoDB
- Prisma
- Redis
- Firebase database
- External persistent application database
- Separate external backend service
- Vercel runtime filesystem writes as durable storage

The architecture must remain usable without external persistence.

## 7. Data Strategy

### 7.1 Base Demo Dataset

Static JSON files committed to the repository are the Base Demo Dataset.

Conceptual examples:

```text
src/data/
├── public/
│   ├── clinic.json
│   ├── services.json
│   ├── prices.json
│   ├── promotions.json
│   └── doctors-public.json
│
└── private/
    ├── users.json
    ├── patients.json
    ├── appointments.json
    ├── queue.json
    └── histories.json
```

The exact schemas and minimum seed dataset are defined in a later phase.

The Base Demo Dataset is treated as read-only at runtime after deployment.

### 7.2 Web Mutable Overlay

Changes created through the Web application are stored in browser `localStorage`.

Conceptually:

```text
Base JSON
   +
localStorage overlay
   ↓
Merged Web State
```

Examples of Web-side changes include:

- Creating a demo appointment.
- Editing a demo appointment.
- Other explicitly supported mock write actions.

A reset function must allow the browser to discard local changes and return to the Base Demo Dataset.

### 7.3 localStorage Limitation

`localStorage` is browser-local.

Therefore:

- Changes are not synchronized across browsers.
- Changes are not synchronized across devices.
- Server-side Vercel MCP functions cannot directly read a user's browser `localStorage`.
- MCP results can always use the deployed Base JSON.
- Any MCP write workflow that needs to affect Web state must use an explicit mock/prepare/confirmation handoff rather than pretend that server persistence exists.

This limitation is intentional and acceptable for the Mockup MVP.

## 8. Vercel Runtime Persistence Rule

The application must not use code such as runtime `fs.writeFile(...)` against deployed JSON files as a persistence mechanism.

The rule is:

```text
Repository JSON
= deployed read-only base data

Browser localStorage
= mutable Web demo data

Vercel function runtime
= request processing, not durable storage
```

Any feature that requires durable shared persistence across users/devices is outside the current MVP and would require a future architecture change.

## 9. Web / MCP Data Consistency

Web and MCP must share the same Base Demo Dataset definitions wherever the same record is exposed.

Example:

```text
patients.json
      │
      ├── Web data access
      └── Staff MCP data access
```

This is required so that initial mock data shown on the Web and returned through MCP does not disagree.

The Web may additionally show browser-local changes because of its `localStorage` overlay. MCP must not claim to see those browser-local changes unless a later handoff mechanism explicitly provides them.

## 10. Application Boundary

Pages and MCP handlers should not scatter direct JSON access throughout the project.

The intended boundary is:

```text
Web Page / MCP Tool
        ↓
Application / Data Access Layer
        ↓
Permission Boundary where required
        ↓
Base JSON / Web local overlay
```

This keeps Web and MCP behavior consistent and makes it possible to replace the mock storage later without rewriting all UI and MCP tools.

## 11. AI Grounding Rule

For general non-clinic questions, an AI client may answer normally using its own capabilities.

For questions about the Clinic Cloud + Mockup Dataset:

1. The appropriate MCP tool must be used.
2. Tool results are the source of truth.
3. Missing records must not be invented.
4. If data is unavailable, the response must state that the information is not available in the mock dataset.
5. Public/private boundaries must be respected.

Detailed Staff MCP and Public MCP contracts are defined in a later phase.

## 12. Write-Action Principle

Write actions in the MVP must not imply shared durable persistence when none exists.

The target interaction pattern is:

```text
User request
→ MCP/Web prepares change
→ Preview current/new state
→ User confirms
→ Web applies supported demo change
→ Browser localStorage stores the mutable overlay
```

For MCP-originated actions, the MVP may return a prepared/mock action or send the user to a Web confirmation flow.

Detailed action contracts are defined later.

## 13. Responsive Requirement

The Web UI must work for:

- Desktop
- Tablet
- Mobile

The experiment should not depend on desktop-only interaction because the product hypothesis includes reducing workflow friction during active clinic work.

## 14. Security / Privacy Boundary for the MVP

Even though all records are mock data:

- Public and private datasets must remain structurally separated.
- Private patient data must not accidentally be exposed by Public MCP tools.
- Internal MCP capabilities must be behind authentication/authorization.
- Role/permission checks must not be implemented as UI hiding only.
- No real patient data should be included in the repository or demo deployment.

Authentication and permission details are specified in Phase 2.

## 15. Non-Goals

The current MVP does not include:

- Production HIS/EMR replacement.
- Multi-hospital architecture.
- Real medical records integration.
- Production-grade shared persistence.
- Real patient data.
- AI diagnosis.
- AI-generated clinical decisions.
- Autonomous treatment actions.
- Medical advice automation.
- Production billing/payment.
- Full signup/account provisioning.
- Email verification.
- Password reset infrastructure.
- Enterprise SSO.
- Cross-device synchronization of local demo writes.

## 16. Project Structure Direction

The final structure should follow this shape:

```text
clinic-cloud-plus/
├── app/
│   ├── auth/web routes
│   ├── clinic web routes
│   └── mcp endpoints
│
├── src/
│   ├── data/
│   │   ├── public/
│   │   └── private/
│   ├── data-access/
│   ├── storage/
│   ├── auth/
│   ├── permissions/
│   ├── mcp/
│   │   ├── public/
│   │   ├── staff/
│   │   └── shared/
│   ├── components/
│   ├── types/
│   └── lib/
│
├── tests/
├── public/
├── .env.example
├── next.config.ts
├── package.json
└── SPEC.md
```

Exact routes, tools, files, schemas, and permission contracts are refined in later phases.

## 17. Phase 1 Acceptance Checklist

Phase 1 is complete when this specification establishes all of the following:

- Clinic Cloud + is explicitly a Mockup MVP.
- Web is explicitly the Core System.
- The project is designed for Vercel deployment.
- The project has no external database dependency.
- Repository JSON is defined as the Base Demo Dataset.
- Browser `localStorage` is defined as the mutable Web overlay.
- The localStorage/MCP synchronization limitation is explicitly documented.
- Vercel runtime filesystem writes are explicitly excluded as persistence.
- Web and MCP share the same Base JSON where their data overlaps.
- AI clinic-data answers must be grounded in MCP results.
- Public/private dataset boundaries are acknowledged.
- Write actions follow prepare/confirm/mock-local-persist principles.
- Production clinical features are explicitly out of scope.

---

## 18. Authentication Scope

Authentication is real at the Mockup MVP level.

The Web application must require a valid demo account for protected areas. The user list is predefined in the repository and is not created dynamically during the MVP.

Authentication must provide:

- Login with predefined demo account.
- Password verification.
- Signed server-side session represented through an HttpOnly cookie.
- Logout.
- Route protection.
- Current-user resolution.
- Role-aware authorization.

Authentication must not rely on `localStorage` for identity.

Conceptual flow:

```text
/login
  ↓
Email + Password
  ↓
POST /api/auth/login
  ↓
Validate predefined user
  ↓
Create signed session
  ↓
HttpOnly Cookie
  ↓
Protected Web route
```

Invalid credentials must return a clear login error and must not create a session.

## 19. Demo Users

The MVP must seed at least one account for each role below.

| Role | Demo email | Password |
| --- | --- | --- |
| OWNER | `owner@cliniccloud.demo` | `12345678` |
| STAFF | `staff@cliniccloud.demo` | `12345678` |
| DOCTOR | `doctor@cliniccloud.demo` | `12345678` |
| NURSE | `nurse@cliniccloud.demo` | `12345678` |
| PATIENT | `patient@cliniccloud.demo` | `12345678` |

All demo accounts intentionally use the same password:

```text
12345678
```

The accounts are demo-only. No real identities or patient credentials may be used.

Implementation may store a password hash instead of plaintext in source, but the credential entered by the tester remains `12345678`.

## 20. Session Contract

The Web session should use a signed server-managed token or equivalent signed session value stored in an HttpOnly cookie.

Expected cookie properties:

- HttpOnly.
- Secure in deployed production mode.
- SameSite=Lax or stricter if compatible with the final auth flow.
- Contains or resolves the minimum identity context required by the Web.
- Must not trust a client-supplied role without signature/validation.

Conceptual session identity:

```json
{
  "userId": "USR-STAFF-001",
  "clinicId": "CLINIC-001",
  "role": "STAFF"
}
```

The exact signing library may be selected during implementation.

## 21. Signup Contract

The MVP must expose a real `/signup` page as part of the product experience.

The signup UI should include, at minimum:

- First name.
- Last name.
- Email.
- Phone.
- Password.
- Confirm password.
- Link back to Login.

For the current MVP, signup does not need to create or persist a new account.

Expected submit behavior:

```text
User completes signup form
        ↓
Submit
        ↓
Show Demo MVP notice
        ↓
Explain that account creation is not enabled
        ↓
Offer Go to Login
```

The UI must not falsely claim that an account was created.

## 22. Logout Contract

Logout must:

1. Invalidate or remove the Web session cookie.
2. Clear only authentication state.
3. Redirect the user to `/login`.

Logout must not automatically erase clinic demo changes stored in `localStorage`, because local demo state belongs to the browser-level clinic demo, not to a single login session.

## 23. Role Model

The current Web roles are:

```text
OWNER
STAFF
DOCTOR
NURSE
PATIENT
```

Their purpose in the MVP is to demonstrate that the same application and data source can expose different capabilities depending on authenticated identity.

## 24. Web Permission Matrix

Minimum expected Web permissions:

| Capability | OWNER | STAFF | DOCTOR | NURSE | PATIENT |
| --- | --- | --- | --- | --- | --- |
| View clinic dashboard | Yes | Yes | Yes | Yes | Own/patient view |
| View patient list | Yes | Yes | Yes | Yes | No |
| Search patients | Yes | Yes | Yes | Yes | No |
| View patient detail | Yes | Yes | Yes | Yes | Own data only |
| View patient history | Yes | Yes | Yes | Yes | Own history only |
| View appointments | Yes | Yes | Assigned/relevant | Yes | Own only |
| Create appointment | Yes | Yes | Allowed for demo | Yes | Not required in Web MVP |
| View queue | Yes | Yes | Relevant queue | Yes | Own queue only |
| View settings | Yes | Limited/No | Limited/No | Limited/No | Profile-level only |
| Demo reset/settings | Yes | Optional | No | No | No |

The implementation may tighten permissions further, but must never broaden PATIENT access to other patients.

UI hiding alone is insufficient. Protected data access/actions must also check authorization in the application boundary.

## 25. Protected Route Rules

Public Web routes:

```text
/
/login
/signup
```

Authenticated internal clinic routes:

```text
/dashboard
/patients
/patients/[patientId]
/appointments
/appointments/new
/appointments/[appointmentId]
/queue
/settings
/settings/demo
```

Authenticated patient-facing routes:

```text
/dashboard
/me/profile
/me/appointments
/me/queue
/me/history
```

PATIENT must be authorized only for the patient-facing data belonging to the current demo patient identity. Internal routes such as `/patients` must not expose all-patient data to PATIENT.

The implementation may use route groups, but the user-visible URLs should remain simple.

Expected behavior:

```text
Unauthenticated request
→ protected route
→ redirect /login
```

If an authenticated user requests a resource outside their permission:

```text
Authenticated
→ authorization check fails
→ show Access Denied / redirect to safe page
```

Do not silently expose the data and merely hide buttons.

## 26. Role-Aware Navigation

The application navigation must be role-aware.

### OWNER

Primary navigation:

- Dashboard
- Patients
- Appointments
- Queue
- Settings
- Demo Settings

### STAFF

Primary navigation:

- Dashboard
- Patients
- Appointments
- Queue

### NURSE

Primary navigation:

- Dashboard
- Patients
- Appointments
- Queue

### DOCTOR

Primary navigation:

- Dashboard
- Patients
- Appointments
- Queue

Doctor views should prefer relevant/assigned clinical context rather than representing unrestricted production-level access.

### PATIENT

Patient-facing navigation:

- My Dashboard
- My Profile
- My Appointments
- My Queue
- My History

The Patient experience must not show the internal all-patients navigation.

## 27. Web User Flows

### 27.1 OWNER Flow

```text
Login
→ Dashboard
→ Clinic overview
→ Patients / Appointments / Queue
→ Settings or Demo Settings
→ Logout
```

Owner is primarily the broad demo administration role.

### 27.2 STAFF Flow

```text
Login
→ Dashboard
→ Search patient
→ Open Patient Detail
→ Inspect history / latest appointment
→ Create or manage appointment
→ Confirm supported write action
→ View appointment / queue
→ Logout
```

This is one of the primary experiment flows.

### 27.3 NURSE Flow

```text
Login
→ Dashboard
→ Patient / appointment lookup
→ Open patient context
→ Review queue / relevant history
→ Create or update supported appointment workflow
→ Logout
```

For the MVP, Nurse and Staff may share several UI components while retaining separate role identity.

### 27.4 DOCTOR Flow

```text
Login
→ Dashboard
→ View relevant patients / appointments
→ Open Patient Context
→ Review history
→ Review appointment / queue context
→ Logout
```

The MVP does not include autonomous AI clinical decisions or diagnosis.

### 27.5 PATIENT Flow

```text
Login
→ My Dashboard
→ My Profile
→ My Appointments
→ My Queue
→ My History
→ Logout
```

PATIENT must only resolve records belonging to the authenticated demo patient identity.

## 28. Login Page UX Requirements

The login page should include:

- Clinic Cloud + identity/branding.
- Email field.
- Password field.
- Sign in action.
- Link to Signup.
- Clear error state.

For demo usability, the page may display the predefined demo accounts and may include a convenience action such as `Use demo account`.

If demo credentials are displayed, the page may explicitly state:

```text
Password for all demo accounts: 12345678
```

because these accounts contain mock data only.

## 29. Phase 2 Acceptance Checklist

Phase 2 is complete when the specification clearly defines:

- OWNER, STAFF, DOCTOR, NURSE, and PATIENT.
- At least one predefined demo account for each role.
- Password `12345678` for every demo account.
- Login credential validation.
- Signed/validated HttpOnly-cookie session behavior.
- Logout.
- Route protection.
- Authorization beyond UI hiding.
- Signup page with non-persistent/demo-only submit behavior.
- Public vs protected Web routes.
- Role-aware navigation.
- Owner Web flow.
- Staff Web flow.
- Nurse Web flow.
- Doctor Web flow.
- Patient Web flow.
- Patient isolation from other patient records.
- Local demo data is not erased merely because a user logs out.

---

## 30. Base Dataset Structure

The repository must contain a deterministic mock dataset that can be used by both Web data access and MCP data access.

Recommended structure:

```text
src/data/
├── public/
│   ├── clinic.json
│   ├── services.json
│   ├── promotions.json
│   └── doctors.json
│
└── private/
    ├── users.json
    ├── patients.json
    ├── appointments.json
    ├── queue.json
    └── histories.json
```

Public files contain information that may be exposed without authentication.

Private files contain authentication records, patient records, appointments, queues, histories, and other internal clinic context.

The same base record must not be duplicated into conflicting public/private versions unless the public file is intentionally a safe projection.

## 31. Minimum Seed Dataset

The initial MVP dataset should contain enough records to make search, filtering, appointment lookup, queue display, role filtering, and MCP queries meaningful.

Minimum target volume:

| Entity | Minimum target |
| --- | ---: |
| Clinic | 1 |
| Demo users | 5 |
| Doctors | 4 |
| Patients | 20 |
| Appointments | 30 |
| Queue entries | 8 |
| Patient history entries | 30 |
| Services | 8 |
| Promotions | 3 |

The dataset may contain more records, but all records must remain synthetic/mock data.

The dataset must include enough linked examples for the primary experiment, including at least one patient who has:

- A searchable name and HN.
- Previous appointment history.
- At least one patient-history record.
- A current or future appointment.
- A queue scenario where appropriate.
- A doctor relationship that can be resolved from IDs.

## 32. ID and Reference Convention

All base records must have stable string IDs.

Recommended prefixes:

```text
CLINIC-001
USR-OWNER-001
USR-STAFF-001
USR-DOCTOR-001
USR-NURSE-001
USR-PATIENT-001

DOC-001
PAT-001
APT-001
QUEUE-001
HIST-001
SVC-001
PROMO-001
```

Rules:

- IDs must be unique within their entity type.
- Cross-record relationships must use IDs, not display names.
- Display names may change without breaking references.
- HN is a domain/display identifier and must not replace the internal patient ID.
- Base IDs must stay stable across normal code changes so the Web and MCP can reference the same mock records.
- Browser-created records must not collide with Base JSON IDs.

Recommended local record IDs:

```text
APT-LOCAL-<uuid>
QUEUE-LOCAL-<uuid>
```

The implementation may use `crypto.randomUUID()` for the UUID portion.

## 33. Core JSON Schemas

These are logical schemas for the MVP. Implementation may formalize them with TypeScript and Zod, but the field meaning must remain consistent.

### 33.1 Clinic

```json
{
  "id": "CLINIC-001",
  "name": "Clinic Cloud + Demo Clinic",
  "description": "Demo clinic for Clinic Cloud + MVP",
  "phone": "02-000-0000",
  "address": "Bangkok, Thailand",
  "openingHours": [
    {
      "day": "MONDAY",
      "open": "09:00",
      "close": "18:00"
    }
  ]
}
```

### 33.2 User

```json
{
  "id": "USR-STAFF-001",
  "clinicId": "CLINIC-001",
  "email": "staff@cliniccloud.demo",
  "displayName": "Demo Staff",
  "role": "STAFF",
  "passwordHash": "<demo hash or implementation-defined credential representation>",
  "linkedPatientId": null,
  "linkedDoctorId": null,
  "active": true
}
```

Rules:

- PATIENT user must have `linkedPatientId`.
- DOCTOR user should have `linkedDoctorId`.
- Staff/Nurse/Owner may leave both links null.
- Every demo login still accepts password `12345678`.

### 33.3 Patient

```json
{
  "id": "PAT-001",
  "clinicId": "CLINIC-001",
  "hn": "HN000001",
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "phone": "0812345678",
  "dateOfBirth": "1995-04-12",
  "gender": "MALE"
}
```

Only synthetic names and contact details may be used.

### 33.4 Doctor

```json
{
  "id": "DOC-001",
  "clinicId": "CLINIC-001",
  "displayName": "นพ. ตัวอย่าง หนึ่ง",
  "specialty": "General Practice",
  "publicBio": "แพทย์เวชปฏิบัติทั่วไป",
  "active": true
}
```

The public doctor dataset must contain public-safe profile information only.

### 33.5 Service

```json
{
  "id": "SVC-001",
  "clinicId": "CLINIC-001",
  "name": "ตรวจทั่วไป",
  "description": "บริการตรวจสุขภาพทั่วไป",
  "price": 500,
  "durationMinutes": 30,
  "active": true
}
```

### 33.6 Promotion

```json
{
  "id": "PROMO-001",
  "clinicId": "CLINIC-001",
  "title": "Demo Promotion",
  "description": "Promotion for MVP demonstration",
  "serviceIds": ["SVC-001"],
  "startDate": "2026-09-01",
  "endDate": "2026-12-31",
  "active": true
}
```

### 33.7 Appointment

```json
{
  "id": "APT-001",
  "clinicId": "CLINIC-001",
  "patientId": "PAT-001",
  "doctorId": "DOC-001",
  "serviceId": "SVC-001",
  "date": "2026-10-05",
  "time": "10:00",
  "status": "CONFIRMED",
  "note": "Mock appointment"
}
```

Recommended appointment statuses:

```text
SCHEDULED
CONFIRMED
CHECKED_IN
COMPLETED
CANCELLED
```

### 33.8 Queue Entry

```json
{
  "id": "QUEUE-001",
  "clinicId": "CLINIC-001",
  "patientId": "PAT-001",
  "appointmentId": "APT-001",
  "doctorId": "DOC-001",
  "queueNumber": "A005",
  "status": "WAITING",
  "date": "2026-09-30"
}
```

Recommended queue statuses:

```text
WAITING
CALLED
IN_SERVICE
COMPLETED
CANCELLED
```

### 33.9 Patient History

```json
{
  "id": "HIST-001",
  "clinicId": "CLINIC-001",
  "patientId": "PAT-001",
  "doctorId": "DOC-001",
  "appointmentId": "APT-001",
  "date": "2026-09-01",
  "summary": "Synthetic demo clinical history entry"
}
```

History content must remain clearly synthetic and should avoid unnecessary sensitive detail.

## 34. Referential Integrity Rules

Base JSON must satisfy these checks:

- Every `clinicId` resolves to the seeded clinic.
- Every appointment `patientId` resolves to a patient.
- Every non-null appointment `doctorId` resolves to a doctor.
- Every non-null appointment `serviceId` resolves to a service.
- Every queue `patientId` resolves to a patient.
- Every queue `appointmentId` resolves to an appointment when present.
- Every history `patientId` resolves to a patient.
- Every linked Patient demo user resolves to exactly one patient.
- Every linked Doctor demo user resolves to exactly one doctor.
- Promotion `serviceIds` resolve to known services.

Invalid references should fail development tests instead of being silently ignored.

## 35. Data Access Boundary

UI components and MCP tools must not freely import and search arbitrary JSON files throughout the codebase.

Recommended Web/application functions include:

```text
getClinic()
getServices()
getPromotions()
getDoctors()

getPatients()
searchPatients(query)
getPatientById(patientId)

getAppointments()
getAppointmentById(appointmentId)
getAppointmentsByPatient(patientId)
getAppointmentsByDoctor(doctorId)

getQueue()
getQueueByPatient(patientId)

getPatientHistory(patientId)
```

The data-access layer is responsible for:

- Loading Base JSON.
- Resolving relationships.
- Applying role/permission filtering where required.
- Returning stable typed results.
- Allowing the Web storage layer to apply local overlays.

The MCP layer will reuse base data-access functions but must not import browser storage code.

## 36. Browser localStorage Contract

Web-created mutable demo data must be stored under a namespaced, versioned key.

Recommended key:

```text
clinic-cloud-plus:CLINIC-001:data:v1
```

Recommended shape:

```json
{
  "schemaVersion": 1,
  "clinicId": "CLINIC-001",
  "updatedAt": "2026-09-30T12:00:00.000Z",
  "collections": {
    "appointments": {
      "created": [],
      "updated": {},
      "deletedIds": []
    },
    "queue": {
      "created": [],
      "updated": {},
      "deletedIds": []
    }
  }
}
```

The first MVP only needs mutable collections required by implemented Web actions. Read-only entities do not need empty mutation systems merely for completeness.

## 37. Base + Overlay Merge Rules

For mutable Web collections, the rendered state is computed from Base JSON plus the local overlay.

Merge order:

```text
1. Load Base JSON
2. Apply local updates by ID
3. Remove local deleted IDs
4. Append local created records
5. Validate/normalize
6. Return merged Web state
```

A base record must never be modified in memory and then written back to the repository.

Example:

```text
Base appointments
APT-001
APT-002

localStorage
updated APT-001
deleted APT-002
created APT-LOCAL-abc

Merged Web state
APT-001 (local updated version)
APT-LOCAL-abc
```

MCP server-side reads still see the deployed Base JSON only unless Phase 4 defines an explicit action handoff.

## 38. Mutable MVP Actions

The primary mutable Web entity for the experiment is Appointment.

Required MVP write support:

- Create appointment.
- Update supported appointment fields.
- Cancel appointment by changing status to `CANCELLED`.

Optional only if needed by the final demo:

- Queue status update.
- Locally created queue entry.

Patient identity, patient history, clinic configuration, doctor profile, service catalog, and promotion data may remain read-only in the first MVP.

This keeps the local overlay focused on the workflow being tested.

## 39. Create Appointment Flow

Web flow:

```text
User selects Create Appointment
→ Choose patient
→ Choose doctor/service as applicable
→ Choose date/time
→ Validate references and required fields
→ Show confirmation preview
→ User confirms
→ Create APT-LOCAL-<uuid>
→ Save to localStorage overlay
→ Recompute merged appointments
→ Show success state
```

The confirmation preview must show enough information for the user to understand what will be created.

Minimum preview:

- Patient.
- Doctor if selected.
- Service if selected.
- Date.
- Time.

## 40. Update / Cancel Appointment Flow

Update:

```text
Open appointment
→ Edit supported fields
→ Show current vs new values
→ Confirm
→ Store patch under collections.appointments.updated[appointmentId]
→ Recompute merged state
```

Cancel:

```text
Open appointment
→ Cancel action
→ Confirmation
→ Store status = CANCELLED as local update
→ Recompute merged state
```

Deleting a base appointment physically from JSON is not supported at runtime.

## 41. Local Record Deletion Rule

If deletion is introduced for a browser-created record:

- A locally created record may be removed from the local `created` list.
- A Base JSON record must not be physically deleted.
- If the UI concept requires hiding a base record, its ID may be recorded in `deletedIds`.
- Appointment cancellation should prefer status `CANCELLED` over hard deletion.

## 42. Demo Reset

A Demo Settings action must allow authorized demo users, primarily OWNER, to reset the browser to the initial dataset.

Flow:

```text
/settings/demo
→ Reset Demo Data
→ Confirmation
→ Remove Clinic Cloud + localStorage overlay key
→ Reload/recompute state from Base JSON
→ Show reset success message
```

Reset must not:

- Rewrite repository JSON.
- Change demo login accounts.
- Delete the current auth session unless explicitly requested by a separate logout action.

The page should show useful debug/demo counts such as:

```text
Base Patients
Base Appointments
Local Created Appointments
Local Updated Appointments
Local Deleted Records
```

## 43. localStorage Error Handling

The Web must handle malformed or outdated local demo data safely.

Expected behavior:

- Validate `schemaVersion`.
- Validate collection structure.
- Ignore or quarantine malformed local records rather than crashing the entire application.
- Provide Reset Demo Data as a recovery path.
- Do not silently reinterpret incompatible future schemas.

For the MVP, falling back to Base JSON with a visible demo-data warning is acceptable.

## 44. Server / Browser Separation

Code must explicitly acknowledge the runtime boundary:

```text
Server / Vercel
├── Base JSON
├── Auth/session
└── MCP

Browser
├── Base data delivered by app
├── localStorage overlay
└── Merged Web state
```

Server components, route handlers, and MCP tools must not call browser `localStorage`.

Client storage modules must not be used as authentication authority.

## 45. Prepared Action Handoff

An MCP-originated write must not claim to have changed shared clinic data merely because it generated an action.

The storage-compatible MVP pattern is:

```text
AI / MCP
→ prepare action payload
→ user opens/continues in Clinic Cloud + Web
→ Web validates payload
→ show confirmation
→ user confirms
→ Web saves localStorage overlay
```

A prepared action should include only the fields required for the intended Web action and must be validated again by the Web before confirmation.

Detailed MCP tool contracts and the exact handoff mechanism are defined in Phase 4.

## 46. Dataset Consistency for AI Answers

For any Base Dataset record exposed on both Web and MCP:

```text
Same ID
+ Same source JSON
+ Same base field values
= expected initial consistency
```

The known exception is Web-local mutation state.

Therefore the product must not promise:

```text
"Every browser-local change is automatically visible to ChatGPT/Claude."
```

without adding a future shared persistence layer.

## 47. Phase 3 Acceptance Checklist

Phase 3 is complete when the specification defines:

- Public/private JSON file structure.
- Minimum demo dataset volume.
- Stable entity ID conventions.
- Core schemas for Clinic, User, Patient, Doctor, Service, Promotion, Appointment, Queue, and History.
- Referential integrity rules.
- Central data-access boundary.
- Versioned localStorage namespace.
- Base + overlay merge order.
- Appointment create/update/cancel behavior.
- Local deletion behavior.
- Demo reset behavior.
- localStorage validation/recovery.
- Browser/server runtime separation.
- Prepared-action handoff principle.
- Explicit statement that MCP does not automatically see browser-local mutations.

---
## 48. MCP Endpoint Split

The MVP exposes two separate Remote MCP endpoints.

```text
/mcp/staff
/mcp/public
```

They serve different trust boundaries and must not be treated as aliases of the same unrestricted tool server.

```text
Staff MCP
→ authenticated
→ internal clinic tools
→ role/permission aware

Public MCP
→ no login required
→ public-safe clinic tools only
→ no patient-private data
```

## 49. Staff MCP Contract

Endpoint:

```text
https://<deployment-domain>/mcp/staff
```

The Staff MCP is intended for OWNER, STAFF, DOCTOR, and NURSE. PATIENT is not an internal Staff MCP role.

The Staff MCP must require authentication before private tools or private resources can be used.

## 50. Staff MCP Authentication

The Staff MCP must use an OAuth-compatible Remote MCP authorization flow suitable for clients such as ChatGPT and Claude.

Conceptual flow:

```text
AI Client
→ Connect Staff MCP
→ authorization required
→ Clinic Cloud + authorization/login page
→ user enters demo email + password
→ validate users.json
→ verify role is OWNER / STAFF / DOCTOR / NURSE
→ user grants access
→ issue signed authorization/access token
→ AI Client calls /mcp/staff
→ resolve authenticated identity
→ enforce role/permission
→ execute tool
```

Demo credentials remain the same as Web login:

```text
owner@cliniccloud.demo
staff@cliniccloud.demo
doctor@cliniccloud.demo
nurse@cliniccloud.demo

Password: 12345678
```

The Staff MCP authentication flow may reuse the same user records as Web authentication, but the AI Client connection must not assume it can reuse the Web browser's HttpOnly login cookie.

## 51. Staff MCP Token Principle

For the MVP, the MCP authorization system may use signed stateless tokens because no persistent database is available.

Tokens must resolve at least:

```json
{
  "sub": "USR-STAFF-001",
  "clinicId": "CLINIC-001",
  "role": "STAFF",
  "aud": "clinic-cloud-plus-staff-mcp"
}
```

Rules:

- Tokens must be signed.
- Expired tokens must be rejected.
- Role must be resolved from trusted token/user data, not arbitrary MCP tool input.
- A caller must not be able to pass `role: OWNER` in tool arguments to gain permissions.
- Token signing secrets must be environment variables on Vercel.
- The MVP may use stateless refresh/access-token behavior if required by the selected MCP client integration.
- The final implementation must be tested against the actual ChatGPT and Claude Remote MCP connection flows.

Because the MVP has no persistent auth database, advanced revocation/session management is outside scope.

## 52. Staff MCP Authorization Failure

Unauthenticated:

```text
request /mcp/staff
→ no valid authorization
→ authentication required / unauthorized
→ no private result returned
```

Authenticated but forbidden:

```text
valid identity
→ tool permission check
→ permission denied
→ no private result returned
```

Errors should identify the category without leaking unrelated private records.

## 53. Staff MCP Permission Matrix

| MCP capability | OWNER | STAFF | DOCTOR | NURSE |
| --- | --- | --- | --- | --- |
| Clinic internal summary | Yes | Limited | Limited | Limited |
| Search patient | Yes | Yes | Yes | Yes |
| Get patient summary | Yes | Yes | Yes | Yes |
| Get patient history | Yes | Yes | Yes | Yes |
| Get patient appointments | Yes | Yes | Relevant/assigned | Yes |
| Get today's appointments | Yes | Yes | Relevant/assigned | Yes |
| Get queue | Yes | Yes | Relevant | Yes |
| Get doctor schedule | Yes | Yes | Own/relevant | Yes |
| Prepare create appointment | Yes | Yes | Allowed for demo | Yes |
| Prepare update appointment | Yes | Yes | Allowed for relevant appointments | Yes |
| Revenue/internal business summary | Optional | No by default | No | No |

This is an MVP permission model, not a production clinical authorization model.

## 54. Staff MCP Tools

Required read tools:

```text
get_staff_context
search_patient
get_patient_summary
get_patient_history
get_patient_appointments
get_today_appointments
get_queue
get_doctor_schedule
```

Required write-preparation tools:

```text
prepare_create_appointment
prepare_update_appointment
prepare_cancel_appointment
```

Optional tools may be added only when required by the final experiment/demo and must respect the same authorization boundary.

## 55. get_staff_context

Purpose: return the authenticated demo identity and permitted high-level context without exposing credentials.

Input:

```json
{}
```

Example output:

```json
{
  "ok": true,
  "data": {
    "userId": "USR-STAFF-001",
    "displayName": "Demo Staff",
    "role": "STAFF",
    "clinicId": "CLINIC-001"
  }
}
```

The tool must never return password/hash/token secrets.

## 56. search_patient

Purpose: search private mock patients by allowed identifiers.

Input:

```json
{
  "query": "สมชาย"
}
```

Supported query matching may include first name, last name, full name, HN, and exact mock phone when explicitly provided.

Example output:

```json
{
  "ok": true,
  "data": [
    {
      "id": "PAT-001",
      "hn": "HN000001",
      "firstName": "สมชาย",
      "lastName": "ใจดี"
    }
  ],
  "source": "base-json"
}
```

If no patient exists, return an empty result rather than inventing a match.

## 57. get_patient_summary

Input:

```json
{
  "patientId": "PAT-001"
}
```

Expected summary may include basic patient identity, latest/next appointment, queue state, recent history summary, and relevant doctor where available.

The tool must resolve by stable ID after search when possible.

## 58. get_patient_history

Input:

```json
{
  "patientId": "PAT-001",
  "limit": 10
}
```

Output must contain only Base Dataset mock history records permitted to the authenticated role.

The tool must not generate medical interpretation beyond stored mock summaries.

## 59. get_patient_appointments

Input:

```json
{
  "patientId": "PAT-001"
}
```

Output contains Base appointment records for that patient and stable appointment IDs.

Known limitation: browser-local Web appointments are not automatically visible to this server-side tool.

## 60. get_today_appointments

Input:

```json
{
  "date": "2026-09-30"
}
```

The date may be optional if implementation safely uses request date, but explicit date input is preferred for deterministic demo testing.

Role filtering must be applied when needed, especially for DOCTOR.

## 61. get_queue

Input may include:

```json
{
  "date": "2026-09-30",
  "doctorId": "DOC-001"
}
```

Fields may be optional where appropriate. Output must not include records outside the authenticated user's permitted view.

## 62. get_doctor_schedule

Input:

```json
{
  "doctorId": "DOC-001",
  "date": "2026-09-30"
}
```

For a DOCTOR identity, requesting another doctor's private schedule may be denied or limited according to role policy.

## 63. Prepared Appointment Actions

The Staff MCP does not directly persist appointment writes into deployed JSON. Instead it prepares a validated action.

Example input:

```json
{
  "patientId": "PAT-001",
  "doctorId": "DOC-001",
  "serviceId": "SVC-001",
  "date": "2026-10-05",
  "time": "10:00"
}
```

Example output:

```json
{
  "ok": true,
  "action": {
    "type": "CREATE_APPOINTMENT",
    "patientId": "PAT-001",
    "doctorId": "DOC-001",
    "serviceId": "SVC-001",
    "date": "2026-10-05",
    "time": "10:00"
  },
  "confirmationRequired": true,
  "persistence": "web-localStorage",
  "message": "Prepared only. Not yet saved."
}
```

The AI must describe this as prepared/pending confirmation, not as already persisted.

## 64. Prepared Action Web Handoff

Target flow:

```text
User asks AI to create/update/cancel appointment
→ Staff MCP validates references
→ Staff MCP returns prepared action
→ AI presents intended change
→ User continues to Clinic Cloud + Web confirmation
→ Web validates action again
→ Web shows current/new state
→ User confirms
→ Web writes localStorage overlay
→ Web shows success
```

Implementation may encode the prepared action into a signed/validated short-lived handoff payload or another safe MVP mechanism.

The handoff must not trust arbitrary query-string values without validation.

## 65. Public MCP Contract

Endpoint:

```text
https://<deployment-domain>/mcp/public
```

Public MCP is intentionally authless.

Expected connection:

```text
ChatGPT / Claude / MCP client
→ add /mcp/public
→ no Clinic Cloud + login required
→ public tools available immediately
```

The Public MCP may be used by patients, prospective patients, general public, and demo users who only need public clinic information.

## 66. Public MCP Data Boundary

Allowed categories:

- Clinic information.
- Address/contact.
- Opening hours.
- Services.
- Prices.
- Promotions.
- Public doctor information.
- Other explicitly public mock content.

Forbidden categories:

- Patient list.
- Patient search.
- HN lookup.
- Patient profile.
- Patient history.
- Patient appointment records.
- Private queue records.
- Internal staff identity.
- Internal clinic operational data not marked public.
- Staff MCP tools.

There must be no hidden argument that switches a Public MCP tool into private mode.

## 67. Public MCP Tools

Required tools:

```text
get_clinic_info
get_opening_hours
get_services
get_service_detail
search_services
get_promotions
get_doctors_public
```

Price information may be returned as part of service data instead of a separate `get_prices` tool.

## 68. get_clinic_info

Input is empty. Output may include clinic name, public description, phone, address, and other public contact information. No authenticated user context is required.

## 69. get_opening_hours

Input may optionally specify a day.

```json
{
  "day": "MONDAY"
}
```

If omitted, the tool may return the weekly schedule.

## 70. Public Service Tools

`get_services`, `get_service_detail`, and `search_services` operate only on the public service catalog.

Supported questions include:

```text
มีบริการอะไรบ้าง?
ตรวจทั่วไปกี่บาท?
มีบริการที่เกี่ยวกับ...ไหม?
บริการนี้ใช้เวลาประมาณเท่าไร?
```

Responses must reflect JSON fields actually present.

## 71. get_promotions

Returns promotions from the public promotion dataset.

If a promotion is inactive or outside the configured date range, implementation should omit it from active results or clearly label status.

The AI must not invent discounts beyond stored promotion records.

## 72. get_doctors_public

Returns only public-safe doctor fields such as display name, specialty, public bio, and public availability when explicitly included.

It must not return internal schedule/appointment/patient relationships unless those fields are explicitly public-safe.

## 73. Public MCP Personal-Data Questions

If the user asks:

```text
นัดของฉันวันไหน?
ตอนนี้คิวของฉันเท่าไร?
ขอดูประวัติของฉัน
ค้นผู้ป่วยชื่อสมชาย
```

Public MCP must not attempt to infer identity.

Expected meaning:

```text
No authenticated patient identity is available.
Personal/private patient data cannot be accessed through Public MCP.
Use the Clinic Cloud + Web login for personal records.
```

Public MCP must not accept HN, phone, or name as a substitute for authentication to expose private records.

## 74. Common MCP Result Envelope

Success:

```json
{
  "ok": true,
  "data": {},
  "source": "base-json"
}
```

Not found:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Record not found in the mock dataset."
  }
}
```

Forbidden:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "This account is not permitted to access this resource."
  }
}
```

Prepared action:

```json
{
  "ok": true,
  "action": {},
  "confirmationRequired": true,
  "persistence": "web-localStorage"
}
```

Tool errors should be machine-readable enough for AI clients to explain the result correctly.

## 75. AI Grounding Instructions

Both MCP servers must communicate clear behavioral instructions to the AI client.

```text
For Clinic Cloud + mock data:
- use the relevant MCP tool;
- treat tool output as source of truth;
- never invent missing records;
- never silently substitute general knowledge for clinic dataset facts;
- distinguish Base Dataset facts from general advice;
- if a record is absent, say it is not available in the mock dataset.
```

Example internal query:

```text
"สมชายมีนัดวันไหน?"
→ search_patient
→ resolve patient ID
→ get_patient_appointments
→ answer from tool result
```

Guessing an appointment date from conversation context is not acceptable.

## 76. General Questions

The MCP instructions should not unnecessarily constrain normal AI behavior outside Clinic Cloud + data.

```text
User: appointment แปลว่าอะไร?
AI: may answer normally.

User: Clinic Cloud + มีนัดวันนี้กี่รายการ?
AI: must use the appropriate MCP tool.
```

## 77. No-Hallucination Rule

When MCP returns no record such as an empty list, `NOT_FOUND`, or `null`, the AI must not convert that into a plausible-looking clinic record.

Preferred user-facing meaning:

```text
ไม่พบข้อมูลนี้ใน Mock Dataset ของ Clinic Cloud +
```

The AI may ask the user to clarify a search term if ambiguity is the issue, but must not manufacture data.

## 78. ChatGPT Connection Flow — Staff MCP

Target user experience:

```text
Add Clinic Cloud + Staff MCP
→ enter /mcp/staff endpoint
→ ChatGPT detects authentication requirement
→ Connect / authorize
→ Clinic Cloud + login
→ choose/use demo personnel account
→ password 12345678
→ authorization completes
→ tools become available according to role
→ user asks clinic-data question
→ ChatGPT invokes Staff MCP tool
```

Implementation must be tested with the currently supported ChatGPT Remote MCP/app connection flow before the MVP is considered deployable.

## 79. Claude Connection Flow — Staff MCP

Target user experience:

```text
Add custom connector / remote MCP
→ enter /mcp/staff endpoint
→ Connect
→ Clinic Cloud + authorization/login
→ demo personnel account
→ password 12345678
→ authorization completes
→ Staff MCP tools available
```

Implementation must be tested with the currently supported Claude Remote MCP/custom connector flow.

## 80. ChatGPT / Claude Connection Flow — Public MCP

```text
Add Public MCP endpoint
→ /mcp/public
→ no Clinic Cloud + login
→ scan/load public tools
→ ask public clinic question
→ AI uses Public MCP
→ answer from public JSON
```

Public MCP must remain usable without a Clinic Cloud + account.

## 81. Staff MCP User Flow

```text
Connect + authenticate Staff MCP
→ "ค้นผู้ป่วยชื่อสมชาย"
→ search_patient
→ resolve PAT-001
→ ask latest/next appointment
→ get_patient_appointments / get_patient_summary
→ ask to create next appointment
→ prepare_create_appointment
→ AI shows prepared change
→ user confirms intent
→ continue to Web confirmation
→ Web saves localStorage
```

This flow is intentionally comparable to the Web-only flow.

## 82. Public MCP User Flow

```text
Connect /mcp/public
→ no login
→ ask "คลินิกเปิดกี่โมง?"
→ get_opening_hours
→ answer from JSON
→ ask "มีบริการอะไรบ้าง?"
→ get_services
→ answer from JSON
→ ask "นัดของฉันวันไหน?"
→ private lookup unavailable through Public MCP
→ direct user to Web login
```

## 83. A/B Experiment Flow

The primary experiment compares the same task objective.

### A — Web Workflow

```text
Login
→ Patients
→ Search patient
→ Open patient detail
→ Inspect appointment/context
→ Create appointment
→ Review confirmation
→ Confirm
→ localStorage write
```

### B — AI + Staff MCP Workflow

```text
Staff MCP already connected/authenticated
→ ask AI to find patient
→ MCP search
→ ask latest/next appointment
→ MCP lookup
→ ask AI to create next appointment
→ MCP prepares action
→ user reviews
→ Web confirmation
→ localStorage write
```

Measure:

- Completion time.
- Number of user interactions/steps.
- Task success.
- Search/error rate.
- Hesitation.
- Need for help.
- Trust in the information.
- Understanding of confirmation before write.

The experiment must not count the one-time MCP connection/setup flow as part of every repeated task unless the study explicitly intends to measure onboarding.

## 84. MCP Security Rules

The implementation must satisfy:

- `/mcp/staff` private tools reject unauthenticated calls.
- Staff identity is derived from trusted authorization context.
- Public tools never import/return private patient collections.
- Tool descriptions must not instruct the model to bypass permission checks.
- Write-preparation tools do not claim persistence.
- Handoff payloads are validated before Web writes.
- Secrets, tokens, and password hashes are never returned in MCP results.
- Errors avoid leaking unrelated private records.
- All data remains synthetic.

## 85. MCP Folder Direction

```text
app/
└── mcp/
    ├── staff/
    │   └── route.ts
    └── public/
        └── route.ts

src/
└── mcp/
    ├── staff/
    │   ├── server.ts
    │   ├── auth.ts
    │   ├── permissions.ts
    │   └── tools/
    ├── public/
    │   ├── server.ts
    │   └── tools/
    └── shared/
        ├── result.ts
        ├── schemas.ts
        └── data-access.ts
```

Authentication/authorization implementation may additionally require OAuth discovery, authorization, and token routes outside `app/mcp/staff`.

## 86. Phase 4 Acceptance Checklist

Phase 4 is complete when the specification clearly defines:

- Separate `/mcp/staff` and `/mcp/public` endpoints.
- Staff MCP requires authentication.
- Staff MCP uses personnel demo identities only.
- Staff role/permission checks.
- Public MCP requires no login.
- Public MCP exposes public-safe data only.
- Public MCP cannot search or retrieve private patient records.
- Required Staff MCP read tools.
- Required Staff MCP prepared-write tools.
- Required Public MCP tools.
- Stable input/output/result-envelope direction.
- No-hallucination/data-grounding rules.
- Prepared write vs persisted write distinction.
- Web confirmation/localStorage handoff.
- ChatGPT Staff MCP flow.
- Claude Staff MCP flow.
- ChatGPT/Claude Public MCP flow.
- Staff MCP user flow.
- Public MCP user flow.
- A/B experiment flow.
- MCP security rules.

## 87. Phase 5 Validation Result

Validation result for the specification:

```text
SPECIFICATION READINESS: PASS
FINAL DIFF REVIEW: STILL PENDING
IMPLEMENTATION CODE: NOT STARTED
```

The specification is internally ready to proceed to final review. No requirement currently forces an external database or a second deployed backend.

## 88. Requirement Traceability

| Requirement | Status | Defined in |
| --- | --- | --- |
| Mockup MVP, not production HIS/EMR | PASS | Sections 1, 15 |
| Web remains Core System | PASS | Sections 2, 10 |
| Deploy Web + MCP on Vercel | PASS | Sections 4, 5 |
| No Supabase/database/external persistence | PASS | Sections 6, 8 |
| Base data stored as repository JSON | PASS | Sections 7, 30-34 |
| Web writes stored in browser localStorage | PASS | Sections 36-46 |
| Web login works with predefined users | PASS | Sections 18-20 |
| Password for all demo users = 12345678 | PASS | Section 19 |
| Signup page exists but account creation can be disabled | PASS | Section 21 |
| Role/permission checks are real, not UI-only | PASS | Sections 23-26 |
| Patient Web account sees own records only | PASS | Sections 24-27 |
| Staff MCP requires login/authentication | PASS | Sections 49-53 |
| Staff MCP identity controls tools/permissions | PASS | Sections 50-64 |
| Public MCP requires no login | PASS | Section 65 |
| Public MCP exposes public data only | PASS | Sections 66-73 |
| Public MCP cannot expose patient-private data | PASS | Sections 66, 73, 84 |
| AI may answer general questions normally | PASS | Section 76 |
| Clinic mock-data questions must be tool-grounded | PASS | Sections 75-77 |
| AI must not invent missing mock records | PASS | Sections 75-77 |
| Web and MCP share the same Base Dataset | PASS | Sections 9, 35, 46 |
| MCP does not pretend to see browser localStorage | PASS | Sections 37, 46, 59 |
| MCP write is prepare/confirm, not fake persistence | PASS | Sections 45, 63-64 |
| Web confirmation writes supported changes to localStorage | PASS | Sections 39-45 |
| Staff/Public MCP flows are separated | PASS | Sections 48-84 |
| Web vs AI/MCP A/B experiment is defined | PASS | Section 83 |
| Responsive/mobile-friendly requirement exists | PASS | Section 13 |
| Real patient data excluded | PASS | Sections 14, 31 |
| AI diagnosis/clinical autonomy excluded | PASS | Section 15 |

## 89. Vercel Constraint Validation

The proposed runtime model is compatible with the project requirement that Vercel hosts the complete MVP.

```text
Vercel Deployment
├── Next.js Web pages
├── Auth/session route handlers
├── OAuth-compatible Staff MCP authorization routes
├── /mcp/staff
└── /mcp/public
```

Persistent state assumptions:

```text
Repository JSON
→ bundled/deployed Base Dataset
→ read-only at runtime

HttpOnly signed session/token
→ authentication state
→ no database required

Browser localStorage
→ mutable Web demo overlay
→ device/browser local

Vercel runtime filesystem
→ NOT persistence
```

Validation conclusion:

- No feature in the current MVP requires server-side durable shared storage.
- Web-created changes intentionally remain browser-local.
- MCP reads intentionally use Base JSON.
- Staff MCP prepared writes intentionally hand off to Web instead of pretending to persist server state.

## 90. Known Intentional MVP Limitations

The following are not blockers; they are intentional consequences of the no-database architecture:

1. A local appointment created in Browser A does not automatically appear in Browser B.
2. A local appointment created through Web does not automatically appear in Staff MCP Base JSON queries.
3. Clearing browser storage resets local Web mutations.
4. Re-deploying the application may change Base JSON only when repository data changes.
5. Staff MCP authorization is demo-grade and does not provide production-grade token revocation/account management.
6. Signup does not create a real persisted account.
7. Patient personal data is available through authenticated Web only; Public MCP is intentionally not a patient account channel.

These limitations must not be hidden in the demo.

## 91. Implementation-Ready Project Structure

Validated target structure:

```text
clinic-cloud-plus/
├── app/
│   ├── page.tsx
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   │
│   ├── (clinic)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── patients/
│   │   │   ├── page.tsx
│   │   │   └── [patientId]/
│   │   │       └── page.tsx
│   │   ├── appointments/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [appointmentId]/
│   │   │       └── page.tsx
│   │   ├── queue/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── demo/
│   │           └── page.tsx
│   │
│   ├── me/
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── appointments/
│   │   │   └── page.tsx
│   │   ├── queue/
│   │   │   └── page.tsx
│   │   └── history/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   └── auth/
│   │       ├── login/
│   │       │   └── route.ts
│   │       ├── logout/
│   │       │   └── route.ts
│   │       └── session/
│   │           └── route.ts
│   │
│   ├── oauth/
│   │   ├── authorize/
│   │   └── token/
│   │
│   └── mcp/
│       ├── staff/
│       │   └── route.ts
│       └── public/
│           └── route.ts
│
├── src/
│   ├── data/
│   │   ├── public/
│   │   │   ├── clinic.json
│   │   │   ├── doctors.json
│   │   │   ├── services.json
│   │   │   └── promotions.json
│   │   └── private/
│   │       ├── users.json
│   │       ├── patients.json
│   │       ├── appointments.json
│   │       ├── queue.json
│   │       └── histories.json
│   │
│   ├── auth/
│   │   ├── authenticate.ts
│   │   ├── current-user.ts
│   │   ├── password.ts
│   │   └── session.ts
│   │
│   ├── permissions/
│   │   ├── authorize.ts
│   │   ├── roles.ts
│   │   └── permissions.ts
│   │
│   ├── data-access/
│   │   ├── clinic.ts
│   │   ├── users.ts
│   │   ├── patients.ts
│   │   ├── doctors.ts
│   │   ├── services.ts
│   │   ├── appointments.ts
│   │   ├── queue.ts
│   │   └── histories.ts
│   │
│   ├── storage/
│   │   ├── local-storage.ts
│   │   ├── overlay-schema.ts
│   │   ├── merge-data.ts
│   │   └── reset-demo.ts
│   │
│   ├── mcp/
│   │   ├── staff/
│   │   │   ├── server.ts
│   │   │   ├── auth.ts
│   │   │   ├── permissions.ts
│   │   │   └── tools/
│   │   ├── public/
│   │   │   ├── server.ts
│   │   │   └── tools/
│   │   └── shared/
│   │       ├── result.ts
│   │       ├── schemas.ts
│   │       └── data-access.ts
│   │
│   ├── components/
│   ├── types/
│   └── lib/
│
├── tests/
│   ├── auth/
│   ├── permissions/
│   ├── data/
│   ├── storage/
│   ├── mcp/
│   │   ├── staff/
│   │   └── public/
│   └── integration/
│
├── middleware.ts
├── public/
├── .env.example
├── next.config.ts
├── package.json
├── README.md
└── SPEC.md
```

OAuth route naming may change to match the selected library/protocol implementation, but the capability boundary must remain.

## 92. Verification Checklist — Authentication

Implementation must verify:

- Valid OWNER login succeeds.
- Valid STAFF login succeeds.
- Valid DOCTOR login succeeds.
- Valid NURSE login succeeds.
- Valid PATIENT login succeeds.
- Password `12345678` is accepted for every seeded demo account.
- Incorrect password is rejected.
- Unknown email is rejected.
- Inactive account is rejected if seeded.
- Successful login creates a valid HttpOnly session.
- Unauthenticated protected route redirects to Login.
- Logout removes auth state.
- Logout does not erase the clinic localStorage overlay.
- Signup submit does not claim successful account creation.

## 93. Verification Checklist — Web Permissions

Implementation must verify:

- PATIENT cannot open all-patient list data.
- PATIENT cannot request another patient by changing URL/ID.
- PATIENT can resolve only linked personal appointments/history/queue.
- STAFF/NURSE can use the intended clinic workflow.
- DOCTOR relevant/assigned filtering works where specified.
- OWNER can reach Demo Settings.
- Forbidden resource access is rejected at data/action boundary, not only hidden in navigation.

## 94. Verification Checklist — Dataset

Implementation must verify:

- Every JSON file parses.
- IDs are unique.
- All required foreign-key-like references resolve.
- Patient demo user links to a valid patient.
- Doctor demo user links to a valid doctor.
- Minimum seed counts are met.
- Public doctor/service/clinic data contains no private patient fields.
- Search test patient has enough linked history/appointment data for the A/B experiment.
- Web Base Data and MCP Base Data resolve the same IDs/values.

## 95. Verification Checklist — localStorage

Implementation must verify:

- Empty localStorage renders Base JSON.
- Creating an appointment adds only a local overlay record.
- Updating a Base appointment creates an overlay patch.
- Cancelling an appointment produces `CANCELLED` merged state.
- Base JSON is never runtime-written.
- Reset removes only the Clinic Cloud + demo overlay.
- Reset restores Base Data view.
- Malformed overlay does not crash the app.
- Wrong `schemaVersion` falls back safely or prompts reset.
- Logging out does not wipe local demo changes.

## 96. Verification Checklist — Staff MCP

Implementation must verify:

- Unauthenticated `/mcp/staff` cannot access private tools.
- Staff MCP login can authenticate seeded OWNER/STAFF/DOCTOR/NURSE.
- PATIENT account cannot become a Staff MCP personnel identity.
- Role cannot be elevated through tool input.
- `search_patient` returns the Base JSON record exactly.
- Missing patient does not produce invented data.
- Patient summary/history/appointments obey permissions.
- DOCTOR filtering works for relevant tools.
- Prepared appointment tools return `confirmationRequired: true`.
- Prepared write never claims it was persisted.
- Secrets/password hashes/access tokens never appear in tool results.
- ChatGPT can complete the Staff MCP authorization/connect flow.
- Claude can complete the Staff MCP authorization/connect flow.

## 97. Verification Checklist — Public MCP

Implementation must verify:

- `/mcp/public` connects without Clinic Cloud + login.
- Public clinic info matches JSON.
- Opening hours match JSON.
- Service names/prices match JSON.
- Promotions match JSON/status.
- Public doctor fields match safe public projection.
- No Public MCP tool exposes `patients.json`.
- No Public MCP tool can search by patient name/HN/phone.
- Personal appointment/history/queue requests do not reveal private data.
- ChatGPT can use Public MCP without login.
- Claude can use Public MCP without login.

## 98. Verification Checklist — AI Grounding

Using both supported AI clients where practical, verify:

- Existing patient question triggers Staff MCP rather than guessing.
- Missing patient returns a not-found explanation.
- Existing appointment date matches the Base Dataset exactly.
- Missing appointment is not invented.
- Public service price matches public JSON.
- General-language question can be answered without unnecessary Clinic tools.
- A Clinic Cloud + dataset question uses the appropriate MCP tool.
- Prepared action is described as pending confirmation, not completed.

## 99. Verification Checklist — Build / Vercel

Before the MVP is considered deployable:

- TypeScript check passes.
- Lint passes if configured.
- Unit tests pass.
- Permission tests pass.
- Dataset integrity tests pass.
- localStorage merge tests pass.
- Staff MCP tests pass.
- Public MCP isolation tests pass.
- Next.js production build passes.
- Vercel deployment succeeds.
- Web login works on deployed URL.
- Protected route/session works on deployed URL.
- `/mcp/public` works from deployed URL.
- `/mcp/staff` authorization works from deployed URL.
- ChatGPT connection is tested against deployed endpoints.
- Claude connection is tested against deployed endpoints.

## 100. A/B Experiment Validation

The two experiment paths operate on the same objective:

```text
Find patient
→ inspect appointment/context
→ prepare/create next appointment
→ confirm
```

Comparison validity requirements:

- Use the same seeded patient scenario.
- Use equivalent target appointment data.
- Start measurement after login/setup state has been standardized.
- For MCP repeated-task timing, do not include one-time connector installation unless measuring onboarding.
- Record completion time.
- Record user interaction count.
- Record success/failure.
- Record search mistakes.
- Record hesitation/help required.
- Record trust/confirmation behavior.

The specification therefore supports the planned timed behavior experiment without requiring production persistence.

## 101. Remaining Implementation Decisions

These are implementation decisions, not unresolved product requirements:

- Exact Next.js-compatible MCP handler/library.
- Exact OAuth helper/library and discovery route implementation.
- Exact signed session/token library.
- Exact UI visual design and component composition.
- Exact synthetic names/content for the seeded dataset.
- Whether queue mutation is included beyond appointment workflow.
- Exact short-lived prepared-action handoff encoding.

These decisions must not change the product boundaries defined in this specification.

## 102. Phase 5 Acceptance Checklist

Phase 5 validation passes because:

- Core MVP requirements have a corresponding specification section.
- No external database is required.
- Vercel runtime filesystem is not treated as persistence.
- Login/signup behavior is unambiguous.
- PATIENT isolation is explicitly defined.
- Base JSON/localStorage boundaries are explicit.
- Staff MCP authentication and authorization are explicit.
- Public MCP remains authless and public-only.
- AI grounding/no-hallucination rules are explicit.
- Write semantics clearly distinguish prepared vs persisted state.
- A/B experiment paths are comparable.
- An implementation-ready folder structure is defined.
- Auth, permission, data, storage, MCP, AI-grounding, build, and Vercel verification checklists are defined.
- Remaining choices are implementation details rather than missing requirements.

---

## Next Phase

Phase 6 is the required final diff review. It must review only the specification changes produced by this task for contradictions, scope drift, missing acceptance criteria, security/privacy mistakes, and implementation blockers before the plan can be completed.