# Observable requirements

- Customer routes, menu, cart, customization, checkout, group ordering, loyalty, and order timeline work as before.
- Seed loading, reset, and persistence retain the same local storage keys and data shape. Example: `getClientDemoStateStorageKey()` returns the same key before and after migration.
- `ClientApiContract` calls return the same responses for the same seed, storage, and clock.
