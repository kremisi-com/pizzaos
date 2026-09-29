# Landing Agent Guidelines

## Product role

`landing` owns PizzaOS product storytelling, acquisition flows, and marketing presentation.

## Visual direction

Use an editorial premium food expression within the shared PizzaOS brand system.

Prioritize storytelling, a strong hero hierarchy, conversion-oriented CTAs, authentic food imagery, and a premium but warm presentation.

## Visual invariants

- Keep the surface clean, premium, modern, and high-trust with generous spacing.
- Use generous rounding for cards and buttons, soft realistic shadows, and 1px light borders.
- Prefer the shared red, dark text, muted text, soft background, and white tokens from `@pizzaos/brand` instead of ad hoc colors.
- Keep headlines strong and high-impact; body copy must remain highly legible.
- Avoid heavy shadows, noisy gradients, kitsch animation, excessive colors, tiny text, and complex UI.

## Local constraints

- Product-facing copy remains Italian, direct, concrete, and business-oriented.
- Design mobile-first with clear hierarchy, high contrast, generous spacing, and one primary CTA per section.
- Use public `@pizzaos/brand` and `@pizzaos/ui` APIs. Do not move landing-specific styling or composition into shared packages unless it is genuinely reusable.
- Keep the landing surface independent from `client` and `admin` implementation details.

## Required verification

From the repository root, run the relevant `@pizzaos/landing` lint, typecheck, test, and build commands. Run `pnpm architecture:check` when imports, package usage, or composition boundaries change.
