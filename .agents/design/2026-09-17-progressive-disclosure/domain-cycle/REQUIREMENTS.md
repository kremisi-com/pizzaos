# Observable requirements

- Every existing `@pizzaos/domain` import resolves to the same public value or type.
- The domain package and its consumers typecheck and tests pass.
- The domain source graph has no cycle between its public entry and client API contracts.
