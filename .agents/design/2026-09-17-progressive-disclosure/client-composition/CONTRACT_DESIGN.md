# Public contracts

```ts
/** Returns the local adapter implementing the client API contract. */
export declare function createLocalClientApi(options?: LocalClientApiOptions): ClientApiContract;
/** Loads the client's persisted demo state, recovering to a seed when needed. */
export declare function loadClientDemoState(storage?: DemoStorage): ClientSeed;
/** Restores the curated client seed. */
export declare function resetClientDemoState(storage?: DemoStorage): ClientSeed;
```

Precondition: optional storage implements `DemoStorage`. Postcondition: responses and storage keys are unchanged. Errors and unavailable storage follow existing behavior. Example: an empty storage returns the curated client seed.
