---
name: spec-driven-development
description: Plan complex changes with observable requirements, public contracts, internal design, and test-first implementation in the project's SDD workflow.
metadata:
    short-description: Spec-driven design and implementation workflow
---

# Spec-Driven Development

Do not read specialized SDD references unless their trigger applies to the current task.

When implementing a complex new feature or change, use a rigid TDD approach where the agent implementing the tests does not know the implementation details of the feature. The test agent should have access only to `REQUIREMENTS.md` and `CONTRACT_DESIGN.md`; the implementation agent may also use `INTERNAL_DESIGN.md`.

## Overall design document

Reason about the requested feature or change, exploring approaches and trade-offs and using sub-agents when useful. Then create a design document at `.agents/design/${date}-${feature-name}/design.md`.

## Subtasks

When the overall design document is complete, break the work into subtasks that are neither too small nor too broad. If a task has nothing to test afterward, it is probably too small. If one task is enough because the design is difficult but implementation is simple, create one task.

Create `TASKS.md` at `.agents/design/${date}-${feature-name}/` with one checkbox per subtask. Each task must use this format:

```text
- [ ] **<folder_name>**: <description>
```

For each subtask, create a folder at `.agents/design/${date}-${feature-name}/${task-name}/`.

## Requirements

For each subtask, create `REQUIREMENTS.md` containing observable behaviors with concrete input-to-output examples. Include all information needed to implement the subtask. Requirements must not contain implementation details.

## Contract design

For each subtask, create `CONTRACT_DESIGN.md` with:

1. Public interfaces only; internals are not part of the contract.
2. Stub files containing public types and method signatures without bodies, plus docstrings describing expected input-to-output behavior.
3. Preconditions, postconditions, invariants, errors or exceptions, and concrete examples.
4. Behavioral names rather than mechanical names, such as `getResult` instead of `getCachedResult`.

A useful test is: if the implementation were replaced with a different valid implementation, would this statement remain true? If yes, it belongs in the contract; otherwise it is an implementation detail.

## Internal design

For each subtask, create `INTERNAL_DESIGN.md` containing only implementation details:

1. Algorithms, data structures, private methods, internal fields, control flow, and intermediate state.
2. A final checklist covering every requirement that the internal design must satisfy.

## Architectural refactoring

When SDD is used for an architectural refactoring, first read [references/architectural-refactoring.md](references/architectural-refactoring.md) and follow the repository architecture/refactoring process before creating the overall design.
