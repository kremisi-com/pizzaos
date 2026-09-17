# Internal design

Move the home shell, local API adapter, provider, and demo state module under `src/composition`. Rebase relative imports and update consumers. Keep shell, adapter, and persistence logic unchanged. The provider remains the app port mounted by the root layout.

Checklist: routes preserved; storage key preserved; API responses preserved; tests and typecheck pass.
