# Internal design

Move the existing domain model from `src/index.ts` to `src/model.ts`, leaving a public re-export entry. Make `client-api-contracts.ts` import model types directly. Keep declarations and function bodies unchanged.

Checklist: public exports unchanged; no cycle; package tests and consumer typechecks pass.
