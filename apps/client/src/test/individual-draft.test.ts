import { describe, expect, it } from "vitest";
import type { IndividualCart } from "@pizzaos/domain";
import { readIndividualDraft, writeIndividualDraft } from "../features/individual-ordering/draft";

const key = "pizzaos.individual-cart.v1";
const created = new Date("2026-11-05T18:00:00.000Z");
const sevenDays = 7 * 24 * 60 * 60 * 1000;
const cart: IndividualCart = { storeId: "roma", mode: "pickup", slotId: null, notes: "Citofono", lines: [{ productId: "pizza", quantity: 2, optionIds: ["extra"], notes: "Ben cotta" }] };
class StorageFake {
  values = new Map<string, string>();
  writes = 0;
  removals: string[] = [];
  getItem(name: string) { return this.values.get(name) ?? null; }
  setItem(name: string, value: string) { this.writes++; this.values.set(name, value); }
  removeItem(name: string) { this.removals.push(name); this.values.delete(name); }
}

describe("individual draft persistence", () => {
  it("saves a versioned device cart and preserves selections across login/reload", () => {
    const storage = new StorageFake();
    writeIndividualDraft(storage, cart, created);
    expect(JSON.parse(storage.values.get(key)!)).toEqual({ version: 1, updatedAt: created.toISOString(), cart });
    expect(readIndividualDraft(storage, new Date(created.getTime() + 1000))).toEqual(cart);
  });
  it("reading does not extend expiration; expires inclusively at seven days", () => {
    const storage = new StorageFake(); writeIndividualDraft(storage, cart, created);
    expect(readIndividualDraft(storage, new Date(created.getTime() + sevenDays - 1))).toEqual(cart);
    expect(storage.writes).toBe(1);
    expect(readIndividualDraft(storage, new Date(created.getTime() + sevenDays))).toBeNull();
    expect(storage.removals).toEqual([key]);
    expect(storage.values.has(key)).toBe(false);
  });
  it("refreshes updatedAt only when the cart is modified", () => {
    const storage = new StorageFake(); writeIndividualDraft(storage, cart, created);
    const modified = new Date(created.getTime() + sevenDays - 1000);
    writeIndividualDraft(storage, { ...cart, notes: "Nuova nota" }, modified);
    expect(readIndividualDraft(storage, new Date(created.getTime() + sevenDays))).toMatchObject({ notes: "Nuova nota" });
    expect(JSON.parse(storage.values.get(key)!).updatedAt).toBe(modified.toISOString());
  });
  it.each(["{", JSON.stringify({ version: 1, updatedAt: "not-a-date", cart }), JSON.stringify({ version: 2, updatedAt: created.toISOString(), cart }), JSON.stringify({ version: 1, updatedAt: created.toISOString(), cart: null })])("clears malformed and unsupported persisted drafts: %s", (value) => {
    const storage = new StorageFake(); storage.values.set(key, value);
    expect(readIndividualDraft(storage, created)).toBeNull();
    expect(storage.removals).toEqual([key]);
  });
  it("returns null for an absent draft without writing", () => {
    const storage = new StorageFake();
    expect(readIndividualDraft(storage, created)).toBeNull();
    expect(storage.writes).toBe(0);
  });
  it("persists cart fields without retaining payment, contact or credential extras", () => {
    const storage = new StorageFake();
    const untrusted = { ...cart, contact: { email: "private@example.it", phone: "123" }, clientSecret: "secret", token: "credential", payment: { number: "4242424242424242" } };
    writeIndividualDraft(storage, untrusted, created);
    expect(JSON.parse(storage.values.get(key)!).cart).toEqual(cart);
  });
});
