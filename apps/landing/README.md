# @pizzaos/landing

## Purpose

Landing app for PizzaOS product storytelling and primary demo entry.

## Ownership

This app owns:

- route structure under `app/`
- landing-specific page composition
- landing feature modules under `src/features`

This app does not own shared tokens, domain contracts, or reusable cross-app primitives.

## Feature Map

- `app/layout.tsx`: root metadata and layout shell
- `app/google-tag.tsx`: Google tag bootstrap for the landing marketing surface
- `app/seo.ts`: canonical SEO metadata, viewport settings, manifest, sitemap, and robots contracts
- `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts`: App Router metadata routes for discoverability
- `app/page.tsx`: landing route entry
- `src/features/home`: landing shell composition, including the hero, challenge grid, complete-platform visual section, feature-difference section, margin comparison section, analytics-growth section, intelligent order-management section, pricing section, product story sections, differentiation, FAQ, and final CTA
- `public/favicon`: favicon and app icon assets cropped from the PizzaOS logo mark

## Shared Dependencies

- `@pizzaos/brand`
- `@pizzaos/mock-data`
- `@pizzaos/ui`

## Commands

From repository root:

- `pnpm --filter @pizzaos/landing dev`
- `pnpm --filter @pizzaos/landing build`
- `pnpm --filter @pizzaos/landing lint`
- `pnpm --filter @pizzaos/landing typecheck`
- `pnpm --filter @pizzaos/landing test`

## Environment

- `KREMISI_MAIL_ENDPOINT`: optional server-only endpoint for demo request submissions. Defaults to `https://api.kremisi.com/pizzaos-mail.php`.
- `LINK_CLIENT`: optional client demo URL shown after the demo request form succeeds. Defaults to `/client`.
- `LINK_ADMIN`: optional admin demo URL shown after the demo request form succeeds. Defaults to `/admin`.
- `NEXT_PUBLIC_SITE_URL`: optional canonical public URL used for SEO metadata, sitemap, and robots. Defaults to `https://pizzaos.it`.
- Google tag measurement ID is currently configured as `G-6SN8XE5KY1` in `app/google-tag.tsx`.

## Vercel

- Create a dedicated Vercel project for this app.
- Set `Root Directory` to `apps/landing`.
- Keep install and build aligned with the app-level `vercel.json`.
