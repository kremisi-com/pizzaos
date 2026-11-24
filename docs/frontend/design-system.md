# PizzaOS design system

PizzaOS has one shared brand core with controlled surface expressions.

## Shared foundation

Use public contracts from `@pizzaos/brand` for surface theme selection and shared tokens. Use `@pizzaos/ui` for reusable presentational primitives. App-specific layout, copy, and workflow composition remain in the owning app.

## Surface expressions

- `landing` — editorial premium food: storytelling, strong hero hierarchy, authentic imagery, and conversion-oriented CTAs.
- `client` — warm tech premium: approachable mobile ordering, clear availability and pricing, guided customization, and low-friction checkout.
- `admin` — bold operational SaaS: desktop-first clarity, useful density, fast navigation, store switching, analytics, and operational insight.

These expressions are variants of one system. Do not create isolated brand primitives or make the surfaces visually unrelated.

## Official identity in admin and client

The official kit uses sand `#DDB785`, orange `#CF5430` and navy `#0A384F`. Actions with white normal-size text use the accessible orange shade `#B74424`; the original SVG paths retain their supplied colors. Brand color is separate from success, warning, error and information semantics. Both apps load local Poppins 400–800 with system fallbacks, and ship the official browser icon.

Use `BRAND_ASSETS` from the public brand entry and `BrandLogo` from the public UI entry. Place the color wordmark on a navy support so the sand lettering remains readable; do not reconstruct it as text. The original repeating pattern is decorative and restrained. Client keeps restaurant data prominent, food photography and warm surfaces; admin keeps compact operational hierarchy and navy structure. Ordinary login, demo login and rider share the official identity. Real and demo workflows retain their existing behavior.

The original kit and regeneration command belong to [brand](../../packages/brand/README.md); implementation requirements and local verification belong to the [SDD](../../.agents/design/2026-11-24-brand-alignment/design.md). Online evidence is recorded separately and does not follow from a local restyle.
