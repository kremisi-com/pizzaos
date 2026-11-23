# PizzaOS Agent Guidelines

## Mission

Build and evolve PizzaOS as a maintainable monorepo composed of three independently owned product surfaces:

- `landing`: product storytelling and marketing
- `client`: customer ordering
- `admin`: restaurant operations and insights

The three surfaces belong to one ecosystem while retaining distinct responsibilities, navigation, and visual expression.

## Context loading

Use progressive disclosure.

1. Identify the module that owns the requested change.
2. Read its nearest `README.md`.
3. Read its local `AGENTS.md` when present.
4. Load child documentation only when directly relevant.
5. Move upward only when broader architectural context is required.

Do not automatically read unrelated sibling modules, historical documents, or the complete documentation tree.

README files describe the current architecture. Historical documents should only be consulted when the reason behind an existing decision matters.

## Ownership

Repository structure represents conceptual ownership.

- `apps/` owns routing, page composition, and app-specific UX.
- `packages/` owns reusable capabilities and public contracts.
- `services/` owns server-side capabilities, persistence, and external integrations.

Modules communicate through public contracts.

Apps must not import from other apps. Packages must not depend on applications or service implementations. Sibling modules must not depend on each other's private implementation. Business logic must always have a clear owner.

Read the relevant directory README before making cross-module changes:

- [`apps/README.md`](apps/README.md)
- [`packages/README.md`](packages/README.md)
- [`services/README.md`](services/README.md)

## Global product constraints

Product-facing UI and content must use Italian.

PizzaOS uses one shared brand system with controlled surface-specific expressions. Do not flatten the applications into one generic visual language or turn them into unrelated design systems.

Do not introduce direct app-to-app runtime coupling. Backend behavior, persistence, payments, and integrations must belong to an explicit service or module owner.

Do not reference the restaurant brand from the UX foundation source document in product code, copy, documentation, or mocks.

## Engineering principles

Implement the smallest complete increment that respects current public behavior and architecture.

Keep TypeScript, tests, and linting clean. Do not suppress errors using `any`, `@ts-ignore`, disabled lint rules, or equivalent shortcuts.

Prefer public package entry points and avoid deep imports into package or service internals.

## Workflow

1. Identify the owning module.
2. Read its nearest README and local instructions.
3. Load only the context required by the task.
4. Use the appropriate repository skill when the task requires it.
5. Implement the smallest complete change.
6. Add or update relevant tests.
7. Run the relevant checks.
8. Update documentation when public behavior, ownership, structure, or commands change.
9. Review the final diff and repository status.
10. Commit and push the completed change as described below.

### Commit and push during development

During development, automatically commit and push every completed repository change, including code, tests, documentation, and configuration. Include only the changes made for the current task. Push to the working branch's remote counterpart unless the user specifies a different destination. Verify that the commit reached the remote before reporting completion.

### Documentation alignment

For changes to user or operational behavior, follow the [documentation maintenance workflow](.agents/product-definition/README.md#manutenzione-nella-stessa-modifica). Update the owning flow and its edge cases with the implementation and relevant tests; update the flow inventory or roadmap only when coverage, status, or remaining gaps change. Keep approved behavior, implementation, local verification, and online evidence distinct. Dated SDD reviews remain evidence for their recorded version, not current product indexes.

## Definition of done

A change is complete when:

- the implementation works;
- relevant tests and checks pass;
- public behavior and documentation are consistent;
- ownership boundaries remain respected;
- only expected files changed.

Any intentional architectural deviation must be explicit and documented.
