import type { ReactElement } from "react";
import type { IndividualApi, IndividualCart } from "@pizzaos/domain";
/** UI consumes the public port through app composition. */
export declare function IndividualOrderingScreen(props: { api: IndividualApi; refreshVersion?: number; connection?: string }): ReactElement;
export declare function IndividualOperationsScreen(props: { api: IndividualApi; refreshVersion?: number; connection?: string; onStoreChange?: (id: string) => void }): ReactElement;
/** Expiry >=7 days or malformed data returns null without refreshing timestamp. */
export declare function readIndividualDraft(storage: Pick<Storage, "getItem" | "removeItem">, now?: Date): IndividualCart | null;
/** Writes only browser-owned cart context. */
export declare function writeIndividualDraft(storage: Pick<Storage, "setItem">, cart: IndividualCart, now?: Date): void;
