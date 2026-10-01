# shadcn/ui Project Context

This file records the shadcn/ui baseline established for Clinic Cloud +.

## Project Context

- Framework: Next.js 16 App Router
- React Server Components: enabled
- TypeScript: enabled
- Tailwind CSS: v4
- Tailwind CSS entry: `app/globals.css`
- shadcn style: `base-nova`
- Primitive base: Base UI
- Icon library: Lucide
- CSS variables: enabled
- RTL: disabled

## Aliases

- Components: `@/components`
- UI components: `@/components/ui`
- Utils: `@/lib/utils`
- Lib: `@/lib`
- Hooks: `@/hooks`

## Installed Baseline Components

- `button`
- `input`
- `field`
- `card`

Dependency components installed automatically:

- `label`
- `separator`

## Registry Policy

Use the official `@shadcn` registry for the baseline components in this project.

Do not add community-registry components unless a later requirement explicitly selects that registry.

## Implementation Rules

Before adding or changing a shadcn component:

1. Run `npx shadcn@latest info --json`.
2. Run `npx shadcn@latest docs <component>`.
3. Preview additions/updates with `--dry-run` and `--diff` when applicable.
4. Read generated files after adding them.
5. Do not use `--overwrite` without explicit approval.
6. Follow the Base UI APIs reported by the project context.
7. Keep semantic theme values in `app/globals.css`; visual direction and final Clinic Cloud + tokens are defined in later phases.

For forms, compose with `FieldGroup` + `Field`, and apply `data-invalid` / `aria-invalid` semantics rather than hand-rolled validation markup.

For links that visually resemble buttons, use the generated `buttonVariants` helper with a semantic link instead of forcing Base UI Button semantics onto an anchor.
