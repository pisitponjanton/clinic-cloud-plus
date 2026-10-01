# Clinic Cloud + Visual Direction

This document defines the visual and interaction direction for Clinic Cloud + before the design-token and component phases.

It is derived from `SPEC.md`, `AGENT.md`, and the project-local frontend/design skills.

If this document conflicts with `SPEC.md`, follow `SPEC.md`.

---

## 1. Direction Name

**Calm Clinical Workspace**

Clinic Cloud + should feel like a focused clinical operations workspace: calm, precise, quick to scan, and safe to act in.

It should not look like:

- a generic SaaS analytics dashboard,
- a futuristic AI interface,
- a consumer wellness app,
- a hospital marketing website,
- or a dense production EMR.

The memorable quality should come from **clear patient-context framing and disciplined operational hierarchy**, not decorative effects.

---

## 2. Purpose and Audience

The Web app is the core system for a clinic workflow experiment.

Primary users:

- OWNER
- STAFF
- NURSE
- DOCTOR
- PATIENT

The interface must support active clinic work on desktop, tablet, and mobile.

The main design problem is not “show more data.” It is:

> Help the current user understand the current context, the next safe action, and the result of that action with minimal friction.

---

## 3. Core Experience Principles

### 3.1 Context before metrics

Clinical workflow pages should lead with the current object: patient, appointment, queue item, or current user.

Do not lead with decorative KPI cards when the user is trying to complete a workflow.

### 3.2 One obvious next action

Each view should normally have one primary action, or at most two when both are genuinely primary.

Examples: Search patient, Create appointment, Save changes, Confirm appointment, Reset demo data.

Secondary actions should be visually quieter.

### 3.3 Confirm risky or mutable actions

The UI must make the write-action sequence visually explicit:

```text
Current state
→ Proposed change
→ Confirmation
→ Applied browser-local demo state
```

The user must understand what will change before confirming.

### 3.4 Errors must be actionable

Errors should state what failed and what the user can do next. Avoid vague errors such as “Something went wrong.”

### 3.5 Empty states should point forward

An empty state should help the user continue rather than act as decoration.

### 3.6 Role differences are structural, not cosmetic

OWNER, STAFF, NURSE, DOCTOR, and PATIENT should differ through navigation, available actions, data scope, wording, and workflow context. Do not communicate role differences only with color.

---

## 4. Visual Tone

Target tone:

- calm
- clinical
- operational
- trustworthy
- modern
- human
- restrained

Avoid:

- neon medical-tech styling
- heavy gradients
- glossy glassmorphism
- oversized marketing typography inside workflow screens
- excessive shadows
- rounded-card-everything layouts
- “AI assistant” visual tropes
- decorative pulse/heartbeat motifs
- constant animation
- dense enterprise table styling without hierarchy

The interface should feel intentionally designed for a clinic, not assembled from dashboard defaults.

---

## 5. Color Direction

Phase 4 will convert these direction colors into semantic CSS/OKLCH tokens and verify WCAG contrast.

| Name | Hex | Intended use |
| --- | --- | --- |
| Clinic Ink | `#173B3A` | Primary text, strong navigation, high-emphasis surfaces |
| Clinical Teal | `#0F766E` | Primary actions, active states, key workflow emphasis |
| Care Mint | `#DDF4EE` | Low-emphasis context surfaces, selected/supporting states |
| Mist | `#F5F8F7` | Main application background / quiet surfaces |
| Warm Signal | `#B76A16` | Attention states that are not errors |
| Clinical Red | `#B42318` | Destructive/error states only |

Color rules:

- Teal is the primary interaction color, not a decorative wash.
- Mint is a supporting context color, not a background for every card.
- Warm Signal is reserved for attention, pending, or caution.
- Red is reserved for destructive/error meaning.
- Neutral/ink values carry most information.
- Status meaning must always include text/iconography, not color alone.
- No page-specific raw colors after Phase 4; use semantic tokens.

---

## 6. Typography Direction

Preferred direction: **IBM Plex Sans Thai** as the main UI family, with weight/size hierarchy rather than a decorative display font.

Reasoning:

- supports Thai-first UI needs
- remains highly legible in operational screens
- has enough character to avoid a generic Inter/Arial dashboard look
- works for mixed Thai/English interface content
- supports dense data without feeling mechanical

Typography behavior:

- Sentence case for UI labels.
- Page titles should be strong but compact.
- Body text should prioritize clinical readability.
- Metadata can be smaller but never cryptic.
- Avoid tracked ALL-CAPS eyebrow labels.
- Avoid monospace for routine labels or IDs unless fixed-width display genuinely helps.
- Do not use oversized hero typography inside authenticated workflow screens.

Phase 4 will define exact scale, line heights, and weights.

---

## 7. Layout Concept

The main layout grammar is **Context → Work → Confirmation**.

### 7.1 Internal clinic workspace

Desktop concept:

```text
┌───────────────┬──────────────────────────────────────────┐
│ Role-aware    │ Page title / context                    │
│ navigation    │ concise secondary context              │
│               ├──────────────────────────────────────────┤
│               │ Current patient / appointment context   │
│               │                                          │
│               │ Main task surface                       │
│               │                                          │
│               │ Supporting detail / recent history      │
│               └──────────────────────────────────────────┘
└───────────────┴──────────────────────────────────────────┘
```

The content area should be predominantly left aligned. Important patient/appointment identity should remain easy to locate while the user works.

### 7.2 Tablet

- Navigation may collapse into a compact rail/sheet.
- Primary context stays above task controls.
- Do not shrink desktop tables until unreadable; switch to structured rows/cards when needed.

### 7.3 Mobile

```text
┌──────────────────────────┐
│ Page / patient context   │
├──────────────────────────┤
│ Primary action           │
├──────────────────────────┤
│ Main information         │
│ as stacked sections      │
├──────────────────────────┤
│ Supporting details       │
└──────────────────────────┘
```

Mobile should be a real workflow layout, not a scaled-down desktop page.

Avoid horizontal overflow, nested scrolling, hover-only actions, awkward multi-column forms, and fixed controls that cover content.

---

## 8. Surface Hierarchy

Use a small number of surface levels:

- **Level 0 — App background:** quiet Mist/neutral background.
- **Level 1 — Primary work surface:** white or near-white surface for the active task.
- **Level 2 — Context surface:** subtle tinted/outlined surface for current patient, appointment summary, queue context, or proposed change.
- **Level 3 — Overlay:** dialog/sheet only when interruption is justified, such as destructive confirmation or a short focused selection.

Do not put ordinary navigation or long forms inside nested modal stacks.

---

## 9. Distinctive Pattern: Clinical Context Rail

The product-specific visual pattern is a **Clinical Context Rail**.

It is not necessarily a literal sidebar on every breakpoint. Its purpose is to keep compact identity/context information near the working area:

```text
Patient
Somchai Demo
PAT-001

Today
10:30 Appointment

Status
Confirmed
```

The context rail should answer:

- Who/what am I working on?
- What is the current state?
- What is the next relevant event/action?

On mobile, the same information becomes a compact top context block.

---

## 10. Navigation Direction

Navigation must reflect the role matrix in `SPEC.md`.

Internal roles use a restrained application shell and prioritize Dashboard, Patients, Appointments, Queue, and Settings where permitted.

PATIENT uses a clearly personal area: My Dashboard, My Profile, My Appointments, My Queue, My History.

Navigation behavior:

- Current location is always obvious.
- Back/cancel is available on deep flows.
- Do not overload primary navigation with secondary settings.
- Mobile navigation must not depend on hover.
- Role identity may be displayed, but permissions are enforced in application logic.

---

## 11. Screen Direction

### 11.1 Landing

Explain Clinic Cloud + briefly, provide a clear path to login, and keep the page concise. Do not turn it into a long marketing site.

### 11.2 Login

Primary hierarchy:

```text
Clinic Cloud +
Sign in
Email
Password
[Sign in]

Demo account helper
Signup link
```

Demo credentials may be visible because records are mock. Errors must appear near the form and explain the failure clearly.

### 11.3 Dashboard

Dashboard should answer: What needs attention? What can I do now? What is relevant to my role? Prefer actionable summaries over decorative analytics.

### 11.4 Patients

Optimize for `Search → identify correct patient → open patient context`. Search should dominate the top of the workflow; the patient list is supporting evidence, not the visual hero.

### 11.5 Patient Detail

Recommended hierarchy:

```text
Patient identity + key context
→ Primary action
→ Appointment context
→ Relevant history
```

Current operational information and historical records should be visually distinct.

### 11.6 Appointments

Optimize for date/time, patient, doctor/service, status, and next action. Avoid table density that hides status or action hierarchy.

### 11.7 Create / Update Appointment

Use a clear reading order without turning the form into a wizard unless multiple steps are genuinely required:

```text
Patient
→ Service / doctor
→ Date / time
→ Review
→ Confirm
```

Editing should show old/new state before confirmation.

### 11.8 Queue

Prioritize current position/status, patient/context, and service/doctor relevance where allowed. Status must remain readable without color alone.

### 11.9 Settings / Demo Reset

Settings should be quieter than operational screens. Demo Reset must explain exactly what is cleared, what remains, and require explicit confirmation.

### 11.10 Patient-facing pages

Use plain language and personal framing such as “My appointments”, “My queue”, and “My history”. Avoid internal clinic terminology that is not meaningful to a patient.

---

## 12. Action Hierarchy

- **Primary:** the main action that advances the current workflow.
- **Secondary:** valid alternatives that do not advance the primary path.
- **Destructive:** only genuine destructive/reset/cancel operations.

Destructive styling must not compete with the primary action until the relevant confirmation context.

---

## 13. Forms

Rules:

- One clear label per field.
- Helper text only when it reduces ambiguity.
- Inline errors tied to the field.
- Preserve values after validation failure.
- Required state must be clear.
- Group related fields; do not put every field in its own decorative card.
- Use `FieldGroup` + `Field` according to the shadcn project skill.
- Use `data-invalid` and `aria-invalid` for validation state.
- Long forms should use section hierarchy before considering a modal.

---

## 14. Data Density

Target moderate information density: more compact than a consumer app, less dense than a production EMR, with strong grouping and readable whitespace.

Use borders, spacing, type weight, and alignment before adding shadows or extra cards.

Tables are appropriate on desktop when row comparison matters. Cards/structured rows are preferred on narrow screens when a table would require horizontal scrolling.

---

## 15. Status Language

Status must have a plain-text label, semantic visual treatment, and predictable placement.

Appointment status vocabulary must remain: Scheduled, Confirmed, Checked in, Completed, Cancelled.

Queue status vocabulary must remain: Waiting, Called, In service, Completed, Cancelled.

Do not invent extra status names that diverge from the data contract.

---

## 16. Motion

Allowed motion: dialog/sheet transition, menu open/close, confirmation state change, short loading transition, and one restrained public-page entrance if useful.

Avoid animated counters, floating medical icons, repeated section fade-ins, parallax, continuous pulsing, or motion that slows clinic work. Respect reduced-motion preference.

---

## 17. Copy Direction

Use plain language, active voice, sentence case, and action-specific verbs.

Prefer “Save changes”, “Create appointment”, “Cancel appointment”, “Search patients”. Avoid generic verbs such as “Submit”, “Proceed”, or “Execute”.

The result message should use the same vocabulary as the action.

---

## 18. AI / MCP Transparency

The Web UI must not imply that AI or MCP persisted browser-local data before Web confirmation.

Use wording such as:

- “Review proposed appointment”
- “This change has not been saved yet.”
- “Confirm to apply this change in this browser.”

Avoid claiming an appointment was saved before Web confirmation.

---

## 19. Accessibility Direction

Target: WCAG 2.1 AA for primary workflows.

Required design behavior:

- visible keyboard focus
- no color-only status meaning
- sufficient contrast
- practical touch targets
- dialog title/description semantics
- field-level error association
- clear selected/active states
- reduced-motion support
- readable mobile type
- no information hidden exclusively on hover

---

## 20. Responsive Direction

Design from the mobile workflow upward, then use additional width to expose context rather than merely enlarge components.

### Mobile

- single-column primary task
- compact context block
- full-width critical form controls
- primary action easy to reach

### Tablet

- two-region layouts allowed where they improve context
- navigation can become a rail or sheet

### Desktop

- role navigation + main work area
- optional context rail or split detail where it reduces back-and-forth
- avoid excessive maximum-width restriction on data-heavy screens

---

## 21. What Makes This Direction Specific to Clinic Cloud +

1. Clinical Context Rail instead of KPI-first card grids.
2. Context → Work → Confirmation as the core page grammar.
3. Teal/ink palette used for operational clarity, not decorative wellness branding.
4. Moderate clinic information density without production-EMR complexity.
5. Role-specific structure that visibly separates internal clinic work from patient self-service.
6. Browser-local write transparency built directly into confirmation UX.
7. Historical data visually separated from current operational context.

---

## 22. Explicit Anti-Patterns

Do not build:

- four KPI cards across the top of every page
- gradient hero cards inside authenticated workflows
- one rounded card per small fact
- glass panels
- hidden errors inside toasts only
- nested modal forms
- scroll-inside-scroll patient/history layouts
- floating action buttons without a strong mobile reason
- hover-only menus/actions
- ambiguous icon-only critical actions
- “AI-powered” decorative badges across normal clinic screens
- large blank marketing whitespace in active workflow screens

---

## 23. Phase 4 Handoff

Phase 4 should convert this direction into actual semantic design tokens for:

- foreground/background/surface colors
- primary/secondary/accent/destructive/attention states
- typography family and scale
- spacing
- radii
- borders
- focus ring
- status tokens
- responsive spacing/breakpoints
- reduced-motion behavior

Before Phase 4 is complete, contrast must be checked for primary text/actions and semantic states.

The implementation should use semantic tokens rather than page-specific raw color values.