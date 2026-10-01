# Clinic Cloud + Shared UI Primitives

Shared application patterns live in `components/shared/`.

These components sit above official shadcn primitives and should be reused before creating page-specific equivalents.

## Components

### PageHeader

Use for the top of major workflow pages.

Provides:

- one semantic `h1`
- optional concise description
- optional contextual eyebrow
- responsive action area

### ContextPanel

Implements the Clinic Cloud + Clinical Context Rail pattern.

Use for compact patient, appointment, queue, or current-user context.

On narrow layouts it can sit above the main task; on wider layouts it may occupy a side/context region.

### SectionCard

Use for a bounded content section that genuinely needs a surface.

Tones:

- `default`
- `context`
- `subtle`

Do not use a card for every small fact.

### StatusBadge

Use for appointment and queue statuses.

Supported status keys:

- `SCHEDULED`
- `CONFIRMED`
- `CHECKED_IN`
- `WAITING`
- `CALLED`
- `IN_SERVICE`
- `COMPLETED`
- `CANCELLED`

The component always renders a readable text label in addition to semantic color.

### TextField

Use for standard text-like form controls that need:

- label
- optional description
- required state
- field-level error
- `aria-invalid`
- `aria-describedby`

It composes shadcn `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, and `Input`.

Use more specialized shadcn controls directly for select, checkbox, radio, date/time, etc., while preserving the same Field semantics.

### FeedbackAlert

Use for actionable feedback.

Tones:

- `info`
- `success`
- `attention`
- `error`

Errors should explain what failed and the next action when possible.

### EmptyState

Use when a list/result/context is legitimately empty.

Provide a specific title, helpful description, and an action only when there is a meaningful next step.

### LoadingState

Use for bounded loading areas.

Provides:

- accessible live status text
- spinner
- skeleton rows

Do not block the whole page when only one section is loading.

### ConfirmationDialog

Use for explicit confirmation of meaningful or destructive changes.

Supports:

- normal confirmation
- destructive confirmation
- explicit title and description
- cancel action
- confirm action
- keyboard focus management through shadcn/Base UI Alert Dialog

For MCP prepared actions, the copy must still state that the change is not persisted until the Web confirmation flow completes.

## Implementation Rules

- Prefer these shared patterns before creating page-local alternatives.
- Prefer semantic token utilities; do not introduce raw page colors.
- Use `gap-*` instead of `space-x-*` / `space-y-*`.
- Keep critical action labels explicit.
- Do not hide validation errors only in toast/notification surfaces.
- Avoid nested modal forms.
- Preserve keyboard focus and visible focus styles.
- Status meaning must never depend on color alone.

## Tests

Shared UI behavior is covered by:

`tests/foundation/shared-ui.test.tsx`

The test suite verifies:

- page-heading semantics
- context surface labelling
- every status label mapping
- field label/help/error associations
- alert/empty/loading semantics
- confirmation dialog focus entry
- Escape-to-close behavior
- focus restoration to the trigger
