# Clinic Cloud + Design Tokens

This document is the developer handoff for the global token/theme foundation implemented in `app/globals.css`.

The visual rationale lives in `docs/VISUAL_DIRECTION.md`.

## Typography

Primary UI font:

- IBM Plex Sans Thai
- Weights: 400, 500, 600, 700
- Subsets: Latin and Thai
- Loaded with `next/font/google`
- `font-display: swap` behavior through Next.js

Semantic Tailwind typography tokens:

- `text-page-title`
- `text-section-title`
- `text-body`
- `text-meta`

`font-sans` and `font-heading` resolve to IBM Plex Sans Thai.
`font-mono` remains Geist Mono for cases where fixed-width content is genuinely useful.

## Core Color Tokens

The palette is implemented as OKLCH CSS variables.

Reference sRGB anchors:

| Purpose | Reference | Semantic token |
| --- | --- | --- |
| Clinic Ink | `#173B3A` | `foreground` |
| Clinical Teal | `#0F766E` | `primary`, `ring` |
| Care Mint | `#DDF4EE` | `secondary`, `surface-context` |
| Mist | `#F5F8F7` | `background`, `surface-subtle` |
| Clinical Red | `#B42318` | `destructive` |
| Attention foreground | `#A35D12` | `attention-foreground` |

The original Warm Signal direction color `#B76A16` is not used as normal-size text because it does not reach 4.5:1 on a white/light surface. The semantic foreground is intentionally darker while preserving the same warm amber direction.

## Semantic Feedback

### Attention

- `bg-attention`
- `text-attention-foreground`
- `border-attention-border`

Use for pending/caution states that are not destructive errors.

### Success

- `bg-success`
- `text-success-foreground`
- `border-success-border`

Use for successful completion/confirmed result messaging where green semantics are appropriate.

### Info

- `bg-info`
- `text-info-foreground`
- `border-info-border`

Use for neutral informational context.

### Destructive

Use shadcn semantic tokens:

- `bg-destructive`
- `text-destructive`
- `text-destructive-foreground`

Use only for destructive/error meaning.

## Status Tokens

Status surfaces are semantic, not raw colors.

- `status-scheduled` / `status-scheduled-foreground`
- `status-confirmed` / `status-confirmed-foreground`
- `status-active` / `status-active-foreground`
- `status-completed` / `status-completed-foreground`
- `status-cancelled` / `status-cancelled-foreground`

Mapping intent:

| Product state | Token family |
| --- | --- |
| Scheduled | scheduled |
| Confirmed | confirmed |
| Checked in / Waiting / Called / In service | active |
| Completed | completed |
| Cancelled | cancelled |

The UI must always render a text label in addition to color.

## Surfaces

- App background: `bg-background`
- Main work surface: `bg-card`
- Clinical context surface: `bg-surface-context`
- Quiet supporting surface: `bg-surface-subtle`
- Popovers/overlays: `bg-popover`

Do not create page-specific raw color utilities for ordinary product UI.

## Borders and Focus

- General divider/border: `border-border`
- Form-control boundary: `border-input`
- Keyboard focus: `ring-ring`

The form-control border is intentionally stronger than the general divider so controls remain identifiable without relying on shadows.

## Radius

Base radius:

- `--radius: 0.5rem`

The shadcn-derived radius scale remains available from `radius-sm` through `radius-4xl`.

Use larger radii only when the component hierarchy warrants it. Do not round every information fragment into a card.

## Spacing

Semantic layout spacing:

- `p-page` / `gap-page` derive from `--page-padding`
- `gap-section` derives from `--section-gap`
- `gap-control` derives from `--control-gap`

Responsive values:

| Width | Page padding | Section gap | Control gap |
| --- | ---: | ---: | ---: |
| Mobile | 16px | 24px | 12px |
| >= 640px | 24px | 32px | 16px |
| >= 1024px | 32px | 40px | 16px |

## Breakpoints

Tailwind v4 breakpoints are intentionally aligned to the project design-system plan:

- `sm`: 480px
- `md`: 640px
- `lg`: 768px
- `xl`: 1024px
- `2xl`: 1280px

These names should be used consistently rather than page-specific media-query values.

## Motion

Global motion timing variables:

- `--motion-fast: 120ms`
- `--motion-normal: 180ms`
- `--motion-slow: 240ms`
- `--ease-standard`

Reduced-motion preference collapses animation and transition durations to effectively instant.

## Shadow Direction

- `--shadow-surface`: restrained surface separation
- `--shadow-overlay`: dialogs/overlays only

Prefer borders and surface contrast before adding shadows.

## Contrast Verification

WCAG checks are encoded in `tests/foundation/design-system.test.ts`.

Verified normal-text reference pairs meet at least 4.5:1:

| Pair | Approx. ratio |
| --- | ---: |
| Clinic Ink / Mist | 11.41:1 |
| White / Clinical Teal | 5.47:1 |
| Muted foreground / white | 6.46:1 |
| Attention foreground / attention surface | 4.63:1 |
| Success foreground / success surface | 6.48:1 |
| Info foreground / info surface | 9.38:1 |
| Destructive foreground / cancelled surface | 5.75:1 |

Verified non-text/control boundaries meet at least 3:1:

- light input boundary against app background
- dark input boundary against dark card
- primary focus ring against app background

## Dark Theme

A coherent dark token set is provided so generated shadcn components do not fall back to unrelated neutral colors if a `.dark` root is introduced later.

The MVP does not currently require a user-facing theme switch.

## Usage Rules

1. Prefer semantic utilities such as `bg-primary`, `text-muted-foreground`, `border-input`.
2. Do not add raw hex/RGB/OKLCH values in page/component classes.
3. Do not use status color without a textual status label.
4. Keep form-control boundaries and focus rings visible.
5. Use `p-page` / semantic spacing for page-level layout before inventing per-page spacing.
6. Preserve reduced-motion behavior for any future animations.
