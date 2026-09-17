import type { ClientApiContract } from "@pizzaos/domain";
import type { ClientSeed, DemoStorage } from "@pizzaos/mock-data";

export interface LocalClientApiOptions {
  readonly storage?: DemoStorage;
  readonly now?: () => Date;
}

/** Returns the deterministic local implementation of the client API. */
export declare function createLocalClientApi(options?: LocalClientApiOptions): ClientApiContract;

/** Returns persisted client state or the curated seed. */
export declare function loadClientDemoState(storage?: DemoStorage): ClientSeed;

/** Restores the curated client seed. */
export declare function resetClientDemoState(storage?: DemoStorage): ClientSeed;
