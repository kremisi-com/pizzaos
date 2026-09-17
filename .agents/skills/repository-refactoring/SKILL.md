---
name: repository-refactoring
description: Define and review repository architecture, ownership boundaries, dependency rules, README hierarchy, and incremental structural refactors.
metadata:
  short-description: Repository architecture and refactoring guidance
---

# Repository Refactoring & Progressive Disclosure

When refactoring or reviewing the repository, preserve clear ownership, controlled dependencies, and progressive disclosure. An agent should be able to understand and modify a module by loading only the smallest amount of context necessary.

## Repository structure

The folder hierarchy should represent conceptual ownership and lifecycle, not call direction or UI structure.

A module should be nested under another module only when it conceptually belongs to it and would not make sense independently. A module should instead remain autonomous when it has its own lifecycle, meaningful state, public contract, or multiple consumers.

Do not create folders only to classify files. Before moving code, inspect the repository tree, imports, public interfaces, shared code, and existing README files, then define the target structure.

If a module is difficult to describe with a single clear responsibility, treat it as a possible architectural smell.

## Dependency boundaries

Modules must communicate through explicit public contracts. Internal implementation details must never be imported across domain boundaries.

Sibling modules should not depend directly on one another. When multiple siblings or domains need to collaborate, coordination should happen at their lowest meaningful common owner or through an application-level orchestrator.

Prefer passing required information explicitly to child modules instead of making them inspect the internals of their parent.

Circular dependencies are not allowed.

Cross-domain workflows may depend on several public contracts, but individual domains should remain unaware of each other's private implementation.

## Shared and platform code

Technical infrastructure such as databases, queues, HTTP clients, logging, and observability belongs to platform-level modules.

Shared modules should contain only domain-agnostic primitives that have no knowledge of PizzaOS business concepts, such as `Money`, `Result`, `DateRange`, or pagination structures.

Do not use folders such as `shared`, `common`, `helpers`, or `utils` as containers for logic whose real owner has not been identified. If shared code keeps growing, first reconsider whether that logic belongs to a specific domain.

## README hierarchy

Create a `README.md` only at meaningful conceptual boundaries, not in every physical directory.

Each README describes only the module it belongs to and should explain its responsibility, public surface, boundaries, relevant children, and any architectural constraints.

Do not use README files to document implementation details, individual files, task history, or responsibilities owned by sibling modules.

Children should be described by their parent only when their purpose or relationship is not already clear from the structure and naming. Avoid repeating information that is more naturally owned by a descendant README.

The README hierarchy represents the current architecture of the repository, not the history of how it was implemented.

## Progressive disclosure

When working on a change, begin from the module most directly related to the request and read its nearest README.

Move upward only when broader ownership or architectural context is necessary. Move downward only into children involved in the change. Do not automatically inspect siblings or read the entire ancestor chain.

Always prefer the smallest sufficient context.

Historical design documents should not be read by default to understand the current system. They should be consulted only when the reason behind an architectural decision is relevant.

## Refactoring process

Before changing the structure, identify the current owner of each affected responsibility and define the intended target ownership.

Produce a target tree before performing large structural moves. Refactor incrementally by coherent architectural boundary rather than rewriting the repository in one pass.

Unless explicitly requested otherwise, structural refactoring must preserve observable behavior.

After each coherent refactoring unit, run the relevant tests and verify that dependency rules still hold.

Documentation should be updated bottom-up. An ancestor README should be changed only when the refactoring alters information that is relevant at that ancestor's abstraction level. Pure implementation changes must not propagate unnecessary documentation updates.

## Architectural review

After refactoring, re-scan the affected repository area for circular dependencies, cross-domain internal imports, sibling coupling, misplaced domain logic, and unclear ownership.

Verify that every conceptual module has one clear responsibility, that public contracts match the intended boundaries, and that README files describe the resulting architecture rather than the previous one.

Any intentional exception to the dependency rules must be explicit and documented together with its rationale.

The final review should summarize the resulting structure, unresolved architectural smells, remaining trade-offs, documented exceptions, and README files that were created or updated.
