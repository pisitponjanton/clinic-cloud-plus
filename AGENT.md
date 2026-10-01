# Clinic Cloud + — Agent Guide

This file defines how an AI coding agent should work inside this repository.

The project source of truth is:

```text
SPEC.md
```

If this file and `SPEC.md` disagree, follow `SPEC.md`.

---

## 1. Project Purpose

Clinic Cloud + is a Mockup MVP / experiment prototype for clinic workflows.

The product compares two ways to complete the same clinic tasks:

1. Normal Web application.
2. AI clients such as ChatGPT or Claude through MCP.

Core principle:

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

Do not turn MCP or AI into the database or the main application.

This is not a production HIS/EMR.

---

## 2. Required Reading Before Work

Before changing implementation, read:

1. `SPEC.md`
2. The relevant skill files under `skills/`

Available project-local skills:

```text
skills/anthropic-frontend-design.md
skills/alirezarezvani-ui-design-system.md
skills/alirezarezvani-senior-frontend.md
skills/shadcn-ui-shadcn.md
skills/microsoft-frontend-design-review.md
```

For UX/UI work, use the skills in this order when relevant:

```text
frontend-design
→ ui-design-system
→ senior-frontend
→ shadcn
→ frontend-design-review
```

Do not blindly apply a skill when it conflicts with `SPEC.md`.

---

## 3. Work Style

Work phase by phase.

Expected workflow:

```text
Understand requirement
→ inspect current code
→ create/update plan
→ implement one focused phase
→ run tests/checks
→ review result
→ update docs when needed
→ stop at phase boundary
```

Rules:

- Do not combine many unrelated changes into one phase.
- Keep each phase small enough to review safely.
- Do not silently continue into the next phase.
- Do not mark a phase complete until relevant checks pass.
- If a problem is discovered during review, fix it before closing the phase.
- Prefer working software over placeholder code.
- Avoid temporary mock behavior that contradicts the defined MVP architecture.

---

## 4. Planning Rules

Before substantial implementation:

- Inspect the current repository state.
- Check for an existing workspace plan.
- If a plan exists, continue the current phase instead of creating a competing plan.
- If no plan exists and the task is substantial, create a phased plan.
- Plan by concern, not by individual file.
- Keep UI, data, auth, MCP, and tests separated enough to review.

A normal implementation sequence is:

```text
Foundation
→ Data
→ Auth / Permission
→ Web UI
→ Web Write Flow
→ Public MCP
→ Staff MCP
→ Integration Tests
→ UX/UI Review
→ Final Diff Review
```

Do not start coding if the requested task is explicitly plan-only.

---

## 5. Technology Constraints

Target stack:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Static JSON
Browser localStorage
Remote MCP
Vercel
```

The complete MVP should remain inside one Next.js project unless a validated requirement requires otherwise.

Do not introduce:

- Supabase
- PostgreSQL
- MySQL
- MongoDB
- Prisma
- Redis
- Firebase database
- External persistent application database
- Separate external backend service
- Runtime filesystem writes as persistence

Do not add infrastructure merely because it is common in production systems.

This project intentionally has no shared persistent database.

---

## 6. Data Architecture

Base data lives in repository JSON.

Target shape:

```text
src/data/
├── public/
│   ├── clinic.json
│   ├── doctors.json
│   ├── services.json
│   └── promotions.json
└── private/
    ├── users.json
    ├── patients.json
    ├── appointments.json
    ├── queue.json
    └── histories.json
```

Rules:

- Base JSON is read-only at runtime.
- Use stable string IDs.
- Relationships use IDs, not display names.
- Validate referential integrity.
- Never use real patient data.
- Public files must not contain private patient information.
- Avoid duplicating the same record into conflicting public/private forms.

---

## 7. Web Mutable State

Mutable demo changes belong in browser `localStorage`.

Concept:

```text
Base JSON
   +
localStorage overlay
   ↓
Merged Web State
```

Expected key:

```text
clinic-cloud-plus:CLINIC-001:data:v1
```

Primary mutable entity:

```text
Appointment
```

Required appointment behavior:

- Create
- Update
- Cancel

Preferred cancellation behavior:

```text
status = CANCELLED
```

Do not hard-delete Base JSON records during runtime.

---

## 8. localStorage Limitations

The agent must preserve these constraints:

- localStorage is browser-local.
- It does not sync across devices.
- It does not sync across browsers.
- Server-side MCP cannot read browser localStorage directly.
- Vercel runtime cannot be used to fake persistence.
- Logging out must not erase local demo changes.
- Reset Demo Data clears only the Clinic Cloud + demo overlay.

Do not claim a browser-local change is globally persisted.

---

## 9. Authentication

Web authentication is real at the Mockup MVP level.

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| OWNER | `owner@cliniccloud.demo` | `12345678` |
| STAFF | `staff@cliniccloud.demo` | `12345678` |
| DOCTOR | `doctor@cliniccloud.demo` | `12345678` |
| NURSE | `nurse@cliniccloud.demo` | `12345678` |
| PATIENT | `patient@cliniccloud.demo` | `12345678` |

Web auth requirements:

- Validate predefined users.
- Verify password.
- Use signed server-managed session state.
- Store session in HttpOnly cookie.
- Secure cookie in deployed production mode.
- Protect authenticated routes.
- Resolve current user from trusted session state.
- Do not trust role from client input.
- Do not use localStorage as authentication authority.

Signup:

- The `/signup` page exists.
- It does not need to create a persisted account.
- It must not falsely claim account creation succeeded.

---

## 10. Roles and Permissions

Roles:

```text
OWNER
STAFF
DOCTOR
NURSE
PATIENT
```

Permission enforcement must happen at the application/data boundary.

UI hiding alone is not authorization.

Critical rule:

```text
PATIENT must never gain access to another patient's private records.
```

Patient routes should resolve only the authenticated patient's linked record.

Internal patient list/search must not be exposed to PATIENT.

---

## 11. Web Routes

Public:

```text
/
/login
/signup
```

Internal clinic:

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

Patient-facing:

```text
/dashboard
/me/profile
/me/appointments
/me/queue
/me/history
```

Keep user-visible URLs simple even if route groups are used internally.

---

## 12. Web UX/UI Direction

The product is a clinic workflow tool.

Design priorities:

1. Fast scanning.
2. Clear hierarchy.
3. Low interaction friction.
4. Safe confirmation before changes.
5. Strong error visibility.
6. Clear current state.
7. Mobile/tablet usability.
8. Consistency across roles.

Avoid:

- Generic AI-dashboard styling.
- Excessive decorative gradients.
- Dense modal nesting.
- Scroll-within-scroll unless unavoidable.
- Hidden critical errors.
- Ambiguous primary actions.
- Tiny click targets.
- Overly compact medical workflow screens.
- UI that depends on hover.
- Role differences communicated only by color.

For clinical workflow screens, prioritize task completion over visual novelty.

---

## 13. Design System Rules

Use reusable tokens/components rather than page-specific styling.

Define and reuse:

- Typography scale.
- Spacing scale.
- Radius.
- Surface hierarchy.
- Border treatment.
- Form states.
- Button hierarchy.
- Status badges.
- Table/list patterns.
- Empty states.
- Loading states.
- Error states.
- Confirmation dialogs.
- Responsive breakpoints.

Use shadcn/ui where it improves consistency.

Do not install large UI libraries that duplicate shadcn without a strong reason.

---

## 14. Responsive Rules

The Web must support:

- Desktop
- Tablet
- Mobile

Every major page must be checked on at least:

```text
desktop width
tablet width
mobile width
```

Do not make the experiment depend on desktop-only interaction.

On mobile:

- Avoid horizontal overflow.
- Keep primary actions reachable.
- Tables may switch to cards/list rows when necessary.
- Dialogs must fit viewport height.
- Avoid nested internal scrolling when a full-page flow is clearer.

---

## 15. Accessibility

At minimum:

- Proper labels for inputs.
- Keyboard navigation.
- Visible focus state.
- Sufficient text contrast.
- Meaningful button labels.
- Accessible dialog semantics.
- Errors linked to the relevant field where practical.
- Do not rely only on color to communicate state.
- Respect reduced motion where motion is used.

Accessibility regressions should block phase completion when they affect primary workflows.

---

## 16. MCP Architecture

Expose two separate MCP endpoints:

```text
/mcp/staff
/mcp/public
```

They are different trust boundaries.

Do not merge them into one endpoint with a hidden mode switch.

---

## 17. Staff MCP

`/mcp/staff` requires authentication.

Allowed staff identities:

```text
OWNER
STAFF
DOCTOR
NURSE
```

PATIENT is not a Staff MCP personnel identity.

Target behavior:

```text
AI Client
→ Staff MCP
→ Auth
→ Identity
→ Role
→ Permission
→ Tool
```

Identity and role must come from trusted authorization context.

Never accept a tool argument such as:

```json
{
  "role": "OWNER"
}
```

as permission authority.

---

## 18. Staff MCP Tools

Expected read tools:

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

Expected prepared-write tools:

```text
prepare_create_appointment
prepare_update_appointment
prepare_cancel_appointment
```

Prepared-write tools must not claim the change is already persisted.

---

## 19. Public MCP

`/mcp/public` requires no Clinic Cloud + login.

Allowed data:

- Clinic information.
- Contact information.
- Opening hours.
- Services.
- Prices.
- Promotions.
- Public doctor information.

Expected tools:

```text
get_clinic_info
get_opening_hours
get_services
get_service_detail
search_services
get_promotions
get_doctors_public
```

Public MCP must not expose:

- Patient list.
- Patient search.
- HN lookup.
- Patient profile.
- Patient history.
- Patient appointments.
- Private queue.
- Internal staff identity.
- Internal operational data not marked public.

Do not create a hidden argument that upgrades a public tool into a private tool.

---

## 20. AI Grounding

For normal non-clinic questions, the AI may answer normally.

For Clinic Cloud + dataset questions:

```text
Use relevant MCP tool
→ Treat tool result as source of truth
→ Answer only from returned mock data
```

Never invent:

- Patients
- Appointments
- Queues
- Histories
- Services
- Prices
- Promotions
- Doctors
- Clinic records

If the tool returns no record, say the data is not available in the mock dataset.

Do not fill gaps with plausible clinic data.

---

## 21. MCP Write Flow

MCP does not directly persist appointment writes.

Required pattern:

```text
User asks AI
→ MCP validates and prepares action
→ AI shows intended change
→ Web receives prepared action
→ Web validates again
→ Web shows confirmation
→ User confirms
→ Web writes localStorage overlay
```

Expected prepared action metadata:

```json
{
  "confirmationRequired": true,
  "persistence": "web-localStorage"
}
```

Never tell the user that the appointment was saved before the Web confirmation completes.

---

## 22. Demo Reset

Owner should be able to reset demo state.

Expected flow:

```text
/settings/demo
→ Reset Demo Data
→ Confirmation
→ remove Clinic Cloud + localStorage overlay
→ reload Base JSON state
```

Reset must not:

- Rewrite repository JSON.
- Remove demo users.
- Automatically log out the current user.

---

## 23. Testing Rules

Do not close a phase without testing the part that changed.

Minimum test areas:

### Authentication

- Valid demo users can log in.
- Invalid credentials fail.
- Protected routes require session.
- Logout clears auth only.
- Signup does not falsely create an account.

### Permissions

- PATIENT cannot access another patient's data.
- PATIENT cannot access all-patient list/search.
- Role restrictions are enforced server/application-side.
- DOCTOR filtering works where specified.

### Dataset

- JSON parses.
- IDs are unique.
- References resolve.
- Minimum seed counts are satisfied.
- Public data contains no private patient fields.

### localStorage

- Base-only state works.
- Create works.
- Update works.
- Cancel works.
- Reset works.
- Corrupt overlay does not crash app.

### Staff MCP

- Unauthenticated requests fail.
- Personnel auth works.
- PATIENT cannot authenticate as Staff MCP personnel.
- Permission checks work.
- Missing records do not hallucinate.
- Prepared write does not claim persistence.

### Public MCP

- Connects without login.
- Public results match public JSON.
- Patient-private data cannot be retrieved.
- Patient name/HN/phone cannot be used to bypass auth.

### Build

Before final completion:

```text
TypeScript
Lint
Tests
Next.js production build
Vercel deploy
ChatGPT MCP test
Claude MCP test
```

---

## 24. UX/UI Review Before Completion

For frontend phases, review against:

- Visual hierarchy.
- Task completion friction.
- Responsive behavior.
- Accessibility.
- Error states.
- Empty states.
- Loading states.
- Confirmation clarity.
- Role-aware navigation.
- Design-system consistency.

Use:

```text
skills/microsoft-frontend-design-review.md
```

as the final frontend review guide.

Fix meaningful issues before considering the phase complete.

---

## 25. A/B Experiment Integrity

The experiment compares:

### Web

```text
Login
→ Search patient
→ Patient detail
→ Inspect appointment/context
→ Create appointment
→ Confirm
```

### AI + Staff MCP

```text
Staff MCP already connected/authenticated
→ Ask AI to find patient
→ MCP search
→ Inspect appointment/context
→ Prepare appointment
→ Web confirmation
```

Use the same seeded patient scenario.

Track:

- Completion time.
- User interaction count.
- Task success.
- Errors.
- Hesitation.
- Need for help.
- Trust.
- Understanding before confirmation.

Do not accidentally change one path in a way that makes the comparison unfair.

---

## 26. Git and Change Management

Before editing:

- Inspect `git status`.
- Understand existing uncommitted changes.
- Do not overwrite unrelated work.

During implementation:

- Keep changes scoped to the active task/phase.
- Avoid formatting unrelated files.
- Avoid large dependency changes without need.
- Keep docs aligned with implementation.

Before commit:

- Review the diff.
- Run relevant tests.
- Confirm no secrets are included.
- Confirm no real patient data exists.

Do not commit unless the user explicitly asks for a commit.

Do not push unless the user explicitly asks for a push.

---

## 27. Documentation Rules

Update documentation when implementation changes a contract described in `SPEC.md`.

Do not silently change product behavior without updating the specification.

If implementation reveals a real contradiction in `SPEC.md`:

1. Stop that portion of implementation.
2. Explain the contradiction.
3. Propose the smallest correction.
4. Update the spec only when the change is accepted or clearly required by the existing task.

---

## 28. Scope Control

Do not add features outside the MVP without an explicit requirement.

Out of scope includes:

- Production HIS/EMR.
- Real patient integrations.
- Real billing/payment.
- AI diagnosis.
- AI treatment decisions.
- Autonomous clinical actions.
- Real signup/account provisioning.
- Email verification.
- Password reset infrastructure.
- Enterprise SSO.
- Multi-hospital architecture.
- Cross-device synchronization.
- Shared production persistence.

Do not "future-proof" the project by adding unnecessary infrastructure.

---

## 29. Security Rules

Even with mock data:

- Keep public/private data structurally separated.
- Never return password hashes or tokens to clients/MCP tools.
- Do not trust client-supplied roles.
- Validate prepared-action payloads again in Web.
- Avoid exposing private collections through Public MCP.
- Avoid leaking private data in error messages.
- Keep auth/session secrets in environment variables.
- Never include real patient information in the repository.

---

## 30. Definition of Done

A task is not complete merely because code compiles.

A phase is complete when:

```text
Requirement implemented
+ relevant tests pass
+ UX/UI checked when applicable
+ permission boundary checked
+ no scope drift
+ docs remain consistent
+ diff reviewed
```

A feature that visually works but violates auth, data, MCP, or persistence rules is not done.

---

## 31. Agent Decision Priority

When deciding what to do, use this priority order:

```text
1. User's explicit current instruction
2. SPEC.md
3. Active workspace plan
4. agent.md
5. Relevant project-local skill file
6. Existing implementation patterns
7. General best practices
```

Do not use general best practices to override a deliberate MVP constraint.

---

## 32. Final Reminder

Clinic Cloud + intentionally optimizes for:

```text
clear demo behavior
+ measurable workflow comparison
+ safe mock permissions
+ simple Vercel deployment
+ grounded AI responses
```

It does not optimize for production-scale persistence or clinical deployment.

Keep the implementation simple, testable, role-aware, and faithful to the MVP experiment.
