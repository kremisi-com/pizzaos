# @pizzaos/brand

## Purpose

Owns shared PizzaOS visual contracts and app-surface theme helpers.

## Ownership

This package owns:

- cross-app brand-level theme contracts
- surface theme selection helpers

This package does not own app-specific layout or feature composition.

## Design system role

PizzaOS has one shared brand core with three controlled surface expressions:

- `landing`: editorial premium food
- `client`: warm tech premium
- `admin`: bold operational SaaS

The package owns the shared theme contracts and token mapping. Surface-specific layout, copy, UX priorities, and composition remain owned by the corresponding application. See [`docs/frontend/design-system.md`](../../docs/frontend/design-system.md) for the cross-surface design model.

## Public API

Entry point: `@pizzaos/brand`

Current exports from `src/index.ts`:

- `SURFACE_THEME_CLASS`
- `SURFACE_THEME_TOKENS`
- `getThemeClass(surface: AppSurface): string`
- `getSurfaceThemeTokens(surface: AppSurface): SurfaceThemeTokens`
- `getThemeStyleVariables(surface: AppSurface): Record<\`--pizzaos-${string}\`, string>`

## Import Rules

- Allowed to import from `@pizzaos/domain` public API.
- Must not import from any `apps/*` path.
- Consumers must import from `@pizzaos/brand` only, never `@pizzaos/brand/src/*`.

## Kit ufficiale e temi applicativi

`BRAND_PALETTE` espone sabbia `#DDB785`, arancio `#CF5430`, blu `#0A384F` e arancio azione `#B74424` per testo bianco leggibile. I temi admin/client usano Poppins, supporti chiari e token semantici condivisi; raggi e densità restano propri della superficie. Il tema landing mantiene i suoi valori pubblici.

`BRAND_ASSETS` distribuisce data URL SVG autosufficienti: `logo`, `logoWhite`, `logoBlack`, `vertical`, `verticalWhite`, `verticalBlack`, `wordmark`, `wordmarkWhite`, `wordmarkBlack`, `mark`, `markWhite`, `markBlack`, `icon`, `pattern`. Gli originali sono in `assets/`; `node scripts/generate-brand-assets.mjs` dalla root rigenera il modulo pubblico. Non servono accessi a external a runtime. Le variazioni `#CE4D26` contenute nei tracciati originali sono preservate; la UI usa l'arancio canonico della presentazione.

`getThemeStyleVariables` espone anche `--pizzaos-brand-{sand,orange,navy,pattern}`, colori primari hover/soft, focus, superficie attenuata e toni success/warning/critical/info con sfondo attenuato e foreground. Il pattern è decorativo. Logo colore su blu; su bianco preferire variante nera per piccolo testo o supporto blu. Non ridisegnare il wordmark con font.

Admin/client distribuiscono localmente Poppins 400/500/600/700/800 con licenza OFL e l'icona originale del browser. Font indisponibile: fallback di sistema. [Requisiti e verifiche](../../.agents/design/2026-11-24-brand-alignment/design.md).
