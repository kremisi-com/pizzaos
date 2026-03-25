# @pizzaos/typescript-config

## Purpose

Owns shared TypeScript config presets for apps and packages.

## Ownership

This package owns baseline and Next.js TypeScript configurations.

## Public API

Entry points:

- `@pizzaos/typescript-config/base`
- `@pizzaos/typescript-config/nextjs`

## Import Rules

- Keep this package config-only and free from app/package runtime logic.
- Apps and packages should consume only exported preset entry points.
