## Architectural refactoring

When SDD is used for an architectural refactoring, first run the repository architecture/refactoring process to determine the current structure, target structure, ownership boundaries, and migration constraints.

The resulting target architecture becomes an input to the overall design document.

Refactoring subtasks should be organized by coherent architectural migration units rather than arbitrary groups of files.

Unless explicitly requested otherwise, existing observable behavior must be treated as a requirement and preserved throughout the migration.

Temporary boundary violations introduced during migration should be avoided. If unavoidable, they must be explicitly documented in the design together with the subtask that removes them.
