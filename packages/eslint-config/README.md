# @pizzaos/eslint-config

## Purpose

Owns shared lint configuration presets for monorepo consistency.

## Ownership

This package owns exported ESLint preset files and package export mapping.

## Public API

Entry points:

- `@pizzaos/eslint-config/base`
- `@pizzaos/eslint-config/next`

## Import Rules

- This package should stay dependency-light and config-only.
- Apps and packages should consume only exported preset entry points.
