# Clinic Cloud + Patient List and Search

Phase 17 implements the personnel patient-list route:

`/patients`

Patient detail content remains a separate following phase.

## Authorization

The page starts from the trusted current Web user.

PATIENT identities are redirected to:

`/dashboard`

before patient-list projection is created.

The projection itself also uses:

- `getAuthorizedPatients(user)`
- `searchAuthorizedPatients(user, query)`

so direct data access remains protected independently from the route redirect.

### Personnel scope

OWNER, STAFF, and NURSE receive the clinic patient scope allowed by the MVP matrix.

DOCTOR receives only relevant patients derived by the existing doctor authorization boundary.

## Search

Search is server-rendered through:

`/patients?q=<query>`

No extra client-side search state or data copy is introduced.

Supported search identifiers remain those provided by the shared authorized data access:

- patient ID
- HN
- first name
- last name
- full name
- phone

Whitespace is trimmed before searching.

Missing matches return an empty result set. The page never fabricates a fallback patient.

## Search-First Layout

The top workflow prioritizes:

1. clear page/role context
2. Find a patient search surface
3. authorized result count
4. patient results
5. Open patient action

The result summary states both:

- current search result count
- number of patients in the authenticated user's scope

For DOCTOR, the page title becomes:

`Relevant patients`

and explicitly describes assigned/relevant scope.

## Responsive Results

### Mobile / Tablet

Below the large desktop breakpoint, results are stacked patient rows/cards with:

- patient name
- HN
- patient ID
- phone
- gender
- date of birth
- explicit Open patient action

### Desktop

At the large breakpoint, results use the official shadcn `Table` component.

Columns:

- HN
- Patient
- Phone
- Date of birth
- Gender
- Action

The table is not used as the narrow-screen layout, avoiding a forced horizontal-scroll workflow on mobile.

## Patient Detail Link

Every result links to:

`/patients/[patientId]`

Example:

`/patients/PAT-001`

Phase 17 only establishes the links. Patient Detail implementation belongs to Phase 18.

## States

### Loading

`app/(protected)/patients/loading.tsx`

uses the shared bounded LoadingState.

### No Results

The page uses shared EmptyState and explains that no **authorized** patient matched the search.

When a query is active, Clear search returns to:

`/patients`

### Error

`app/(protected)/patients/error.tsx`

provides:

- clear failure context
- role/data-scope safety wording
- explicit Try again action

## Data Boundary

Files under the patient-list feature do not import:

- private Base JSON directly
- unrestricted private data-access functions directly

The feature consumes the authorization layer instead.

## Tests

`tests/patients/patient-list.test.tsx` verifies:

- OWNER/STAFF full clinic scope
- DOCTOR relevant scope
- name/HN/patient-ID/phone search
- trimmed search
- no fabricated records
- PATIENT authorization rejection
- search-first UI
- Patient Detail links
- doctor-specific wording
- no-result/reset behavior

`tests/patients/patients-route.test.ts` verifies that direct PATIENT access redirects before patient-list data is loaded.

## Phase Boundary

Phase 17 does not implement:

- Patient Detail
- patient history rendering inside Patient Detail
- appointment creation
- appointment mutation

Those are implemented in following focused phases.
