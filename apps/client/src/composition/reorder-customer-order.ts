import type { IndividualApi, IndividualOrder } from "@pizzaos/domain";
import { readCheckoutAttempt, writeIndividualDraft } from "../features/individual-ordering";

/** Recreate a composition only after ruling out an existing uncertain checkout. */
export async function reorderCustomerOrder(api: Pick<IndividualApi, "orders">, storage: Pick<Storage, "getItem" | "setItem">, order: IndividualOrder): Promise<void> {
  if (readCheckoutAttempt(storage)) throw new Error("Recupera il tentativo esistente prima di riordinare.");
  const current = await api.orders();
  if (current.some(item => item.status === "pending_payment" && ["requires_action", "processing"].includes(item.payment)
    || item.additions?.some(addition => !addition.applied && ["requires_action", "processing"].includes(addition.payment)))) {
    throw new Error("Hai un pagamento da verificare. Recupera il tentativo esistente prima di riordinare.");
  }
  // Recheck after the asynchronous read, so another tab cannot replace an uncertain attempt.
  if (readCheckoutAttempt(storage)) throw new Error("Recupera il tentativo esistente prima di riordinare.");
  const lines = order.cart.lines.filter(line => !order.unavailableProductIds.includes(line.productId));
  if (!lines.length) throw new Error("I prodotti di questo ordine non sono disponibili. Scegli dal menu.");
  writeIndividualDraft(storage, { ...order.cart, slotId: null, notes: order.notes, benefits: undefined, lines });
}
