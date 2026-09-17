# Public contract

The `@pizzaos/domain` package export list and runtime behavior are unchanged. For example, `ORDER_STATUS`, `Product`, and `ClientApiContract` remain importable from the package root.

Precondition: consumer imports `@pizzaos/domain`. Postcondition: existing names resolve unchanged. Invalid imports retain ordinary TypeScript module errors.
