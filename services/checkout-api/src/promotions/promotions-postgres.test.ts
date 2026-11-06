// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createPostgresOrderingRepository } from "../postgres-repository";
import { createPromotionsOrderingServices } from "./index";
import { cart, coupon, customer, fixture, otherCustomer, root } from "./promotions.test-fixture";

const configured = process.env.PIZZAOS_TEST_DATABASE_URL;
const safeDatabase = configured && new URL(configured).pathname === "/pizzaos_individual_test";
const pools: Pool[] = [];
afterEach(async () => { await Promise.all(pools.splice(0).map(pool => pool.end())); });

describe.skipIf(!safeDatabase)("promozioni PostgreSQL reale con due pool indipendenti", () => {
  it("salva programma/coupon/wallet e serializza ultimo uso tra connessioni", async () => {
    const firstPool = new Pool({ connectionString: configured, max: 2 });
    const secondPool = new Pool({ connectionString: configured, max: 2 });
    pools.push(firstPool, secondPool);
    await firstPool.query("DELETE FROM individual_ordering_state");
    const f = await fixture(createPostgresOrderingRepository(firstPool));
    // Il fixture PostgreSQL parte senza le appartenenze del repository in memoria.
    await f.service.invite(root, "store-a", "operator@example.test");
    await f.earn();
    await f.promotions.saveCoupon(root, "store-a", coupon({ globalLimit: 1 }));
    const selected = cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: false } });
    const first = await f.checkoutInput(selected, "card", customer);
    const second = await f.checkoutInput(selected, "card", otherCustomer);
    const restarted = createPromotionsOrderingServices({ ...f.options, repository: createPostgresOrderingRepository(secondPool) });
    expect((await restarted.promotions.wallet(customer, "store-a")).balancePoints).toBe(100);
    expect((await restarted.promotions.configuration(root, "store-a")).coupons[0]?.code).toBe("SCONTO");
    const outcomes = await Promise.allSettled([f.service.checkout(customer, first), restarted.service.checkout(otherCustomer, second)]);
    expect(outcomes.filter(outcome => outcome.status === "fulfilled")).toHaveLength(1);
    const usage = (await restarted.promotions.configuration(root, "store-a")).usage;
    expect(usage).toMatchObject([{ reserved: 1, consumed: 0 }]);
    const order = outcomes.find(outcome => outcome.status === "fulfilled");
    if (order?.status !== "fulfilled") throw new Error("Manca checkout vincitore");
    const owner = order.value.order.customerId === customer.id ? customer : otherCustomer;
    f.payments.settle(order.value.order.providerIntentId!, "paid");
    await restarted.service.reconcile(owner, order.value.order.id);
    await restarted.service.action(owner, order.value.order.id, { action: "cancel" });
    expect((await f.promotions.configuration(root, "store-a")).usage).toMatchObject([{ reserved: 0, consumed: 0 }]);
    expect((await f.promotions.wallet(customer, "store-a")).balancePoints).toBe(100);
  });

  it("serializza l'ultimo premio dello stesso cliente e sopravvive al cambio pool", async () => {
    const firstPool = new Pool({ connectionString: configured, max: 2 });
    const secondPool = new Pool({ connectionString: configured, max: 2 });
    pools.push(firstPool, secondPool);
    await firstPool.query("DELETE FROM individual_ordering_state");
    const f = await fixture(createPostgresOrderingRepository(firstPool));
    await f.service.invite(root, "store-a", "operator@example.test");
    await f.earn();
    const restarted = createPromotionsOrderingServices({ ...f.options, repository: createPostgresOrderingRepository(secondPool) });
    const selected = cart({ benefits: { couponCodes: [], redeemReward: true } });
    const first = await f.checkoutInput(selected, "card");
    const second = await f.checkoutInput(selected, "card");
    const outcomes = await Promise.allSettled([f.service.checkout(customer, first), restarted.service.checkout(customer, second)]);
    expect(outcomes.filter(outcome => outcome.status === "fulfilled")).toHaveLength(1);
    const wallet = await restarted.promotions.wallet(customer, "store-a");
    expect(wallet).toMatchObject({ balancePoints: 100, heldPoints: 100, availablePoints: 0 });
    expect(wallet.movements.filter(movement => movement.kind === "reward")).toHaveLength(1);
  });
});
