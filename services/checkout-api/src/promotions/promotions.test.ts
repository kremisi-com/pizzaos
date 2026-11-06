import { describe, expect, it } from "vitest";
import { createPromotionsOrderingServices } from "./index";
import { cart, coupon, customer, fixture, operator, otherCustomer, outsider, rider, root } from "./promotions.test-fixture";

describe("programma e configurazione coupon", () => {
  it("espone il programma iniziale attivo senza coupon né utilizzi", async () => {
    const f = await fixture();
    const config = await f.promotions.configuration(operator, "store-a");
    expect(config).toMatchObject({ program: { enabled: true, pointsPerEuro: 1, rewardPoints: 100, rewardCents: 500 }, coupons: [], usage: [] });
    expect(Number.isInteger(config.program.revision)).toBe(true);
    expect(config.program.revision).toBeGreaterThanOrEqual(0);
  });

  it.each([null, customer, outsider, rider])("nega configurazione a guest, cliente e ruoli senza appartenenza", async actor => {
    const f = await fixture();
    const code = actor ? "forbidden" : "unauthorized";
    await expect(f.promotions.configuration(actor, "store-a")).rejects.toMatchObject({ code });
    await expect(f.promotions.saveProgram(actor, "store-a", { enabled: true, pointsPerEuro: 1, rewardPoints: 100, rewardCents: 500, revision: 0 })).rejects.toMatchObject({ code });
    await expect(f.promotions.saveCoupon(actor, "store-a", coupon())).rejects.toMatchObject({ code });
  });

  it("aggiorna solo con revisione corrente e preserva configurazione rifiutata", async () => {
    const f = await fixture();
    const initial = (await f.promotions.configuration(root, "store-a")).program;
    const updated = await f.promotions.saveProgram(operator, "store-a", { ...initial, pointsPerEuro: 3 });
    expect(updated.revision).toBeGreaterThan(initial.revision);
    await expect(f.promotions.saveProgram(operator, "store-a", { ...initial, pointsPerEuro: 9 })).rejects.toMatchObject({ code: "revision_conflict" });
    expect((await f.promotions.configuration(operator, "store-a")).program).toEqual(updated);
  });

  it("normalizza codice, rifiuta duplicati e revisioni obsolete e consente disattivazione", async () => {
    const f = await fixture();
    const created = await f.promotions.saveCoupon(operator, "store-a", coupon({ code: "  pizza_10  " }));
    expect(created.code).toBe("PIZZA_10");
    await expect(f.promotions.saveCoupon(operator, "store-a", coupon({ code: "pizza_10" }))).rejects.toMatchObject({ code: "invalid_input" });
    const updated = await f.promotions.saveCoupon(operator, "store-a", { ...created, active: false });
    await expect(f.promotions.saveCoupon(operator, "store-a", { ...created, value: 900 })).rejects.toMatchObject({ code: "revision_conflict" });
    expect((await f.promotions.configuration(operator, "store-a")).coupons).toEqual([updated]);
  });

  it.each([
    { kind: "percent" as const, value: 10001 }, { value: 0 }, { value: 1.5 }, { minimumCents: -1 }, { globalLimit: 0 },
    { perCustomerLimit: -1 }, { productIds: ["missing"] }, { productIds: ["a", "a"] }, { code: "non valido" },
    { startsAt: "2030-01-02T00:00:00.000Z", endsAt: "2030-01-01T00:00:00.000Z" },
  ])("rifiuta coupon invalido senza crearlo: %j", async invalid => {
    const f = await fixture();
    await expect(f.promotions.saveCoupon(operator, "store-a", coupon(invalid))).rejects.toMatchObject({ code: "invalid_input" });
    expect((await f.promotions.configuration(operator, "store-a")).coupons).toEqual([]);
  });

  it("wallet personale isolato per sede", async () => {
    const f = await fixture();
    await f.earn();
    expect(await f.promotions.wallet(customer, "store-a")).toMatchObject({ balancePoints: 100, heldPoints: 0, availablePoints: 100 });
    expect(await f.promotions.wallet(otherCustomer, "store-a")).toMatchObject({ balancePoints: 0, movements: [] });
    expect(await f.promotions.wallet(customer, "store-b")).toMatchObject({ balancePoints: 0, movements: [] });
    await expect(Promise.resolve().then(() => f.promotions.wallet(null, "store-a"))).rejects.toMatchObject({ code: "unauthorized" });
  });
});

describe("calcolo autorevole e fingerprint", () => {
  it("quote senza selezione o vuota conserva fingerprint e non crea ordine", async () => {
    const f = await fixture();
    const plain = await f.service.quote(cart());
    expect(await f.service.quote(cart({ benefits: { couponCodes: [], redeemReward: false } }))).toEqual(plain);
    expect((await f.promotions.configuration(operator, "store-a")).usage).toEqual([]);
    expect(await f.service.orders(customer)).toEqual([]);
  });

  it("compone percentuali, fissi e premio: 2000 → 1800 → 1440 → 940 → 440 più consegna", async () => {
    const f = await fixture();
    await f.earn();
    for (const input of [coupon({ code: "DIECI", kind: "percent", value: 1000 }), coupon({ code: "VENTI", kind: "percent", value: 2000 }), coupon({ code: "FISSO" })]) await f.promotions.saveCoupon(operator, "store-a", input);
    const selected = cart({ mode: "delivery", address: { text: "Via Roma 1", latitude: 45, longitude: 9 }, benefits: { couponCodes: ["FISSO", "DIECI", "VENTI"], redeemReward: true } });
    const quote = await f.service.quote(selected, customer);
    expect(quote).toMatchObject({ subtotalCents: 440, deliveryCents: 200, totalCents: 640, promotions: {
      originalSubtotalCents: 2000, discountCents: 1560, netSubtotalCents: 440, rewardDiscountCents: 500, redeemedPoints: 100,
      coupons: [{ code: "DIECI", discountCents: 200 }, { code: "VENTI", discountCents: 360 }, { code: "FISSO", discountCents: 500 }],
      lines: [{ productId: "a", grossCents: 2000, discountCents: 1560, netCents: 440 }],
    } });
    expect(await f.promotions.wallet(customer, "store-a")).toMatchObject({ availablePoints: 100, heldPoints: 0 });
    await f.complete((await f.submit(selected)).order);
    expect(await f.promotions.wallet(customer, "store-a")).toMatchObject({ balancePoints: 4, availablePoints: 4 });
  });

  it("arrotonda per difetto senza scontare righe escluse e include opzioni ammesse", async () => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ kind: "percent", value: 1000, productIds: ["a", "cent"] }));
    await expect(f.service.quote(cart({ lines: [{ productId: "cent", quantity: 1, optionIds: [], notes: "" }], benefits: { couponCodes: ["SCONTO"], redeemReward: false } }), customer)).rejects.toMatchObject({ code: "coupon_unavailable" });
    const selected = cart({ lines: [{ productId: "a", quantity: 1, optionIds: ["extra"], notes: "" }, { productId: "b", quantity: 1, optionIds: [], notes: "" }], benefits: { couponCodes: ["SCONTO"], redeemReward: false } });
    const quote = await f.service.quote(selected, customer);
    expect(quote.totalCents).toBe(2690);
    expect(quote.promotions?.lines).toEqual([{ productId: "a", grossCents: 2100, discountCents: 210, netCents: 1890 }, { productId: "b", grossCents: 800, discountCents: 0, netCents: 800 }]);
  });

  it.each([{ active: false }, { minimumCents: 2001 }, { startsAt: "2030-01-01T12:00:00.001Z" }, { endsAt: "2030-01-01T12:00:00.000Z" }])("rifiuta coupon non applicabile: %j", async terms => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon(terms));
    await expect(f.service.quote(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: false } }), customer)).rejects.toMatchObject({ code: "coupon_unavailable" });
  });

  it("inizio incluso e minimo sul lordo prima degli sconti", async () => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ code: "UNO", value: 1000 }));
    await f.promotions.saveCoupon(operator, "store-a", coupon({ code: "DUE", startsAt: "2030-01-01T12:00:00.000Z", minimumCents: 2000 }));
    expect((await f.service.quote(cart({ benefits: { couponCodes: ["UNO", "DUE"], redeemReward: false } }), customer)).totalCents).toBe(500);
  });

  it("richiede identità e codici distinti dopo normalizzazione, al massimo dieci", async () => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon());
    await expect(f.service.quote(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: false } }))).rejects.toMatchObject({ code: "unauthorized" });
    for (const codes of [["SCONTO", " sconto "], Array.from({ length: 11 }, (_, i) => `C${i}`)]) await expect(f.service.quote(cart({ benefits: { couponCodes: codes, redeemReward: false } }), customer)).rejects.toMatchObject({ code: "invalid_input" });
    await expect(f.service.quote(cart({ storeId: "store-b", benefits: { couponCodes: ["SCONTO"], redeemReward: false } }), customer)).rejects.toMatchObject({ code: "coupon_unavailable" });
  });

  it("condizioni mutate invalidano conferma prima di provider e ordine", async () => {
    const f = await fixture();
    const saved = await f.promotions.saveCoupon(operator, "store-a", coupon());
    const input = await f.checkoutInput(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: false } }), "card");
    await f.promotions.saveCoupon(operator, "store-a", { ...saved, value: 600 });
    await expect(f.service.checkout(customer, input)).rejects.toMatchObject({ code: "price_changed" });
    expect(f.payments.creates).toEqual([]);
    expect(await f.service.orders(customer)).toEqual([]);
  });

  it("premio limitato al residuo mantiene costo punti; residuo zero è indisponibile", async () => {
    const f = await fixture();
    await f.earn();
    const saved = await f.promotions.saveCoupon(operator, "store-a", coupon({ value: 1800 }));
    const selected = cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: true } });
    expect((await f.service.quote(selected, customer)).promotions).toMatchObject({ rewardDiscountCents: 200, redeemedPoints: 100, netSubtotalCents: 0 });
    await f.promotions.saveCoupon(operator, "store-a", { ...saved, value: 2000 });
    await expect(f.service.quote(selected, customer)).rejects.toMatchObject({ code: "loyalty_unavailable" });
    expect((await f.promotions.wallet(customer, "store-a")).availablePoints).toBe(100);
  });
});

describe("journal atomico e lifecycle", () => {
  it("istanze concorrenti assegnano l'ultimo uso globale una volta", async () => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ globalLimit: 1 }));
    const selected = cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: false } });
    const first = await f.checkoutInput(selected, "card", customer);
    const second = await f.checkoutInput(selected, "card", otherCustomer);
    const restarted = createPromotionsOrderingServices(f.options);
    const results = await Promise.allSettled([f.service.checkout(customer, first), restarted.service.checkout(otherCustomer, second)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect((await f.promotions.configuration(operator, "store-a")).usage).toMatchObject([{ reserved: 1, consumed: 0 }]);
    expect(f.payments.creates).toHaveLength(1);
  });

  it("limite per cliente lascia libero l'uso a un altro cliente", async () => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ perCustomerLimit: 1 }));
    const selected = cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: false } });
    await f.submit(selected);
    await expect(f.service.quote(selected, customer)).rejects.toMatchObject({ code: "coupon_limit_reached" });
    expect((await f.service.quote(selected, otherCustomer)).totalCents).toBe(1500);
  });

  it("pending carta impegna ultimo premio e retry/restart non duplicano debit", async () => {
    const f = await fixture();
    await f.earn();
    const selected = cart({ benefits: { couponCodes: [], redeemReward: true } });
    const input = await f.checkoutInput(selected, "card");
    const competing = await f.checkoutInput(selected, "card");
    const pending = await f.service.checkout(customer, input);
    expect(await f.promotions.wallet(customer, "store-a")).toMatchObject({ balancePoints: 100, heldPoints: 100, availablePoints: 0 });
    await expect(f.service.checkout(customer, competing)).rejects.toHaveProperty("code", expect.stringMatching(/^(loyalty_insufficient|payment_unresolved)$/));
    const restarted = createPromotionsOrderingServices(f.options);
    expect((await restarted.service.checkout(customer, input)).order.id).toBe(pending.order.id);
    expect((await restarted.promotions.wallet(customer, "store-a")).movements.filter(m => m.orderId === pending.order.id && m.kind === "reward")).toHaveLength(1);
    f.payments.settle(pending.order.providerIntentId!, "paid");
    await restarted.service.reconcile(customer, pending.order.id);
    expect(await restarted.promotions.wallet(customer, "store-a")).toMatchObject({ balancePoints: 0, heldPoints: 0, availablePoints: 0 });
  });

  it("errore provider incerto conserva holds durante scadenza fino all'esito definitivo", async () => {
    const f = await fixture();
    await f.earn();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ globalLimit: 1 }));
    f.payments.failCreate = true;
    const input = await f.checkoutInput(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: true } }), "card");
    await f.service.checkout(customer, input).catch(() => undefined);
    expect((await f.promotions.wallet(customer, "store-a")).heldPoints).toBe(100);
    f.advance(120_000);
    f.payments.failRead = true;
    await f.service.tick();
    expect((await f.promotions.wallet(customer, "store-a")).heldPoints).toBe(100);
    expect((await f.promotions.configuration(operator, "store-a")).usage[0]).toMatchObject({ reserved: 1, consumed: 0 });
    f.payments.failCreate = false;
    f.payments.failRead = false;
    await f.service.tick();
    await f.service.tick();
    expect(await f.promotions.wallet(customer, "store-a")).toMatchObject({ availablePoints: 100, heldPoints: 0 });
    expect((await f.promotions.configuration(operator, "store-a")).usage[0]).toMatchObject({ reserved: 0, consumed: 0 });
  });

  it("annullamento ripristina una volta mentre rimborso fallisce e viene ritentato", async () => {
    const f = await fixture();
    await f.earn();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ globalLimit: 1 }));
    f.payments.createStatus = "paid";
    f.payments.refundStatus = "failed";
    const selected = cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: true } });
    const order = (await f.submit(selected, "card")).order;
    await f.service.action(customer, order.id, { action: "cancel" });
    expect(await f.promotions.wallet(customer, "store-a")).toMatchObject({ availablePoints: 100, heldPoints: 0 });
    f.payments.refundStatus = "succeeded";
    await f.service.action(operator, order.id, { action: "retry_refund" });
    await f.service.tick();
    const restarted = createPromotionsOrderingServices(f.options);
    await restarted.service.tick();
    const wallet = await restarted.promotions.wallet(customer, "store-a");
    expect(wallet.balancePoints).toBe(100);
    expect(wallet.movements.filter(m => m.orderId === order.id && m.kind === "reward")).toMatchObject([{ status: "released" }]);
    expect((await restarted.promotions.configuration(operator, "store-a")).usage[0]).toMatchObject({ reserved: 0, consumed: 0 });
  });

  it("scadenza accettazione restituisce premio e usi senza credito", async () => {
    const f = await fixture();
    await f.earn();
    await f.promotions.saveCoupon(operator, "store-a", coupon());
    const order = (await f.submit(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: true } }))).order;
    f.advance(16 * 60_000);
    await f.service.tick();
    const wallet = await f.promotions.wallet(customer, "store-a");
    expect(wallet.availablePoints).toBe(100);
    expect(wallet.movements.filter(m => m.orderId === order.id && m.kind === "earn")).toEqual([]);
  });

  it("completamento congela tasso/enabled e accredita una volta anche dopo restart", async () => {
    const f = await fixture();
    const order = (await f.submit()).order;
    expect((await f.promotions.wallet(customer, "store-a")).balancePoints).toBe(0);
    const program = (await f.promotions.configuration(operator, "store-a")).program;
    await f.promotions.saveProgram(operator, "store-a", { ...program, enabled: false, pointsPerEuro: 9 });
    await f.complete(order);
    const restarted = createPromotionsOrderingServices(f.options);
    await restarted.service.action(operator, order.id, { action: "complete" }).catch(() => undefined);
    await restarted.service.tick();
    expect(await restarted.promotions.wallet(customer, "store-a")).toMatchObject({ balancePoints: 20, movements: [{ orderId: order.id, kind: "earn", points: 20, status: "posted" }] });
    await f.complete((await f.submit()).order);
    expect((await f.promotions.wallet(customer, "store-a")).balancePoints).toBe(20);
  });

  it("aggiunta preserva sconti/premio, paga delta e accredita netto finale", async () => {
    const f = await fixture();
    await f.earn();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ globalLimit: 1 }));
    const order = (await f.submit(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: true } }))).order;
    const lines = [{ productId: "b", quantity: 1, optionIds: [], notes: "" }];
    const quote = await f.service.additionQuote(customer, order.id, lines);
    expect(quote).toMatchObject({ deltaCents: 800, quote: { subtotalCents: 1800, totalCents: 1800, promotions: { discountCents: 1000, rewardDiscountCents: 500 } } });
    const changed = await f.service.additions(customer, order.id, { lines, fingerprint: quote.fingerprint, idempotencyKey: "addition" });
    await f.complete(changed.order);
    expect((await f.promotions.wallet(customer, "store-a")).balancePoints).toBe(18);
    expect((await f.promotions.configuration(operator, "store-a")).usage[0]).toMatchObject({ reserved: 0, consumed: 1 });
  });

  it.each(["cash", "card"] as const)("totale zero con %s non crea intento né rimborso senza addebito", async method => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ value: 99999 }));
    const result = await f.submit(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: false } }), method);
    expect(result.order).toMatchObject({ status: "awaiting_acceptance", quote: { totalCents: 0 } });
    expect(f.payments.creates).toEqual([]);
    const cancelled = await f.service.action(customer, result.order.id, { action: "cancel" });
    expect(cancelled.status).toBe("cancelled");
    expect(["refund_pending", "refund_failed"]).not.toContain(cancelled.payment);
  });
});



describe("coupon con sconto effettivo nullo", () => {
  it("prodotto ammesso assente non brucia l'ultimo uso", async () => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ productIds: ["b"], globalLimit: 1 }));
    await expect(f.service.quote(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: false } }), customer)).rejects.toMatchObject({ code: "coupon_unavailable" });
    expect((await f.promotions.configuration(operator, "store-a")).usage.every(u => u.reserved === 0 && u.consumed === 0)).toBe(true);
  });
  it("un precedente cento per cento lascia il coupon seguente indisponibile senza consumi", async () => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ code: "TUTTO", kind: "percent", value: 10000 }));
    await f.promotions.saveCoupon(operator, "store-a", coupon({ globalLimit: 1 }));
    await expect(f.service.quote(cart({ benefits: { couponCodes: ["TUTTO", "SCONTO"], redeemReward: false } }), customer)).rejects.toMatchObject({ code: "coupon_unavailable" });
    expect((await f.promotions.configuration(operator, "store-a")).usage.every(u => u.reserved === 0 && u.consumed === 0)).toBe(true);
  });
});

 describe("stesso journal per gruppo e rider", () => {
  it("il gruppo usa soltanto wallet host e preserva attribuzione e ripristino", async () => {
    const f = await fixture();
    await f.earn();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ globalLimit: 1 }));
    const { createGroupOrderingService } = await import("../group/group-service");
    const groupService = createGroupOrderingService({ repository: f.repository, ordering: f.service, now: f.options.now, id: f.options.id, token: () => "a".repeat(64) });
    const hostAccess = { actor: customer };
    const group = await groupService.create(customer, { storeId: "store-a", name: "Organizzatore", deadline: "2030-01-01T12:20:00.000Z" });
    const host = group.participants.find(participant => participant.host);
    if (!host || !group.inviteToken) throw new Error("Gruppo senza host o invito");
    const joined = await groupService.join({ actor: null }, group.id, { inviteToken: group.inviteToken, name: "Ospite" });
    const guestAccess = { actor: null, capability: joined.capability };
    const changed = await groupService.replaceLines(hostAccess, group.id, { participantId: host.id, revision: joined.group.revision, lines: cart().lines });
    const guestSnapshot = await groupService.read(guestAccess, group.id);
    expect(JSON.stringify(guestSnapshot)).not.toMatch(/balancePoints|availablePoints|couponCodes|inviteToken/);
    const closed = await groupService.close(hostAccess, group.id, { revision: changed.revision });
    const fulfillment = { mode: "pickup" as const, slotId: "slot", notes: "", benefits: { couponCodes: ["SCONTO"], redeemReward: true } };
    await expect(groupService.quote(guestAccess, group.id, { revision: closed.revision, fulfillment })).rejects.toMatchObject({ code: "unauthorized" });
    const quote = await groupService.quote(hostAccess, group.id, { revision: closed.revision, fulfillment });
    expect(quote.quote).toMatchObject({ subtotalCents: 1000, promotions: { rewardDiscountCents: 500, redeemedPoints: 100 } });
    const order = (await groupService.checkout(hostAccess, group.id, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: "+393331234567", method: "cash", idempotencyKey: "group-promotion" })).order;
    expect(order.customerId).toBe(customer.id);
    expect(order.cart.lines[0]?.notes).toContain(host.name);
    expect((await f.promotions.wallet(customer, "store-a")).balancePoints).toBe(0);
    expect((await f.promotions.wallet(otherCustomer, "store-a")).movements).toEqual([]);
    await f.service.action(customer, order.id, { action: "cancel" });
    expect((await f.promotions.wallet(customer, "store-a")).availablePoints).toBe(100);
    expect((await f.promotions.configuration(operator, "store-a")).usage[0]).toMatchObject({ reserved: 0, consumed: 0 });
  });

  it("completamento del rider assegnato accredita sullo stesso journal una volta", async () => {
    const f = await fixture();
    const order = (await f.submit(cart({ mode: "delivery", address: { text: "Via Roma 1", latitude: 45, longitude: 9 } }))).order;
    for (const action of ["accept", "prepare", "ready"] as const) await f.service.action(operator, order.id, { action });
    const assigned = await f.delivery.inviteRider(operator, "store-a", rider.email, rider.name);
    await f.delivery.assign(operator, order.id, assigned.id);
    await f.delivery.dispatch(rider, order.id);
    await f.delivery.complete(rider, order.id);
    await f.delivery.complete(rider, order.id).catch(() => undefined);
    await f.service.tick();
    const wallet = await f.promotions.wallet(customer, "store-a");
    expect(wallet.balancePoints).toBe(20);
    expect(wallet.movements.filter(m => m.orderId === order.id && m.kind === "earn")).toHaveLength(1);
  });
});


describe("congelamento e rilascio benefici", () => {
  it("coupon disattivato e programma modificato non alterano ordine già inviato", async () => {
    const f = await fixture();
    await f.earn();
    const saved = await f.promotions.saveCoupon(operator, "store-a", coupon());
    const order = (await f.submit(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: true } }))).order;
    await f.promotions.saveCoupon(operator, "store-a", { ...saved, active: false, value: 1900 });
    const program = (await f.promotions.configuration(operator, "store-a")).program;
    await f.promotions.saveProgram(operator, "store-a", { ...program, pointsPerEuro: 100, rewardPoints: 1, rewardCents: 2000 });
    const completed = await f.complete(order);
    expect(completed.quote).toEqual(order.quote);
    expect((await f.promotions.wallet(customer, "store-a")).balancePoints).toBe(10);
  });

  it("pagamento definitivamente fallito libera premio e coupon senza accredito", async () => {
    const f = await fixture();
    await f.earn();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ globalLimit: 1 }));
    const pending = (await f.submit(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: true } }), "card")).order;
    f.payments.settle(pending.providerIntentId!, "failed");
    await f.service.reconcile(customer, pending.id);
    await f.service.tick();
    const wallet = await f.promotions.wallet(customer, "store-a");
    expect(wallet).toMatchObject({ balancePoints: 100, heldPoints: 0, availablePoints: 100 });
    expect(wallet.movements.filter(m => m.orderId === pending.id && m.kind === "earn")).toEqual([]);
    expect((await f.promotions.configuration(operator, "store-a")).usage[0]).toMatchObject({ reserved: 0, consumed: 0 });
  });

  it("residuo negativo è impossibile con fissi superiori ai prodotti, consegna resta intera", async () => {
    const f = await fixture();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ value: 999999 }));
    const quote = await f.service.quote(cart({ mode: "delivery", address: { text: "Via Roma 1", latitude: 45, longitude: 9 }, benefits: { couponCodes: ["SCONTO"], redeemReward: false } }), customer);
    expect(quote).toMatchObject({ subtotalCents: 0, deliveryCents: 200, totalCents: 200 });
    expect(quote.promotions?.lines.every(line => Number.isInteger(line.netCents) && line.netCents >= 0)).toBe(true);
  });
});

describe("regressioni economiche addizionali", () => {
  it("non retroaccredita ordini completati dal servizio precedente", async () => {
    const f = await fixture();
    const { createOrderingService } = await import("../ordering-service");
    const previous = createOrderingService(f.options);
    const selected = cart();
    const quoted = await previous.quote(selected);
    const order = (await previous.checkout(customer, { cart: selected, fingerprint: quoted.fingerprint, phone: "+393331234567", method: "cash", idempotencyKey: "historical" })).order;
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await previous.action(operator, order.id, { action });
    expect(await f.promotions.wallet(customer, "store-a")).toMatchObject({ balancePoints: 0, movements: [] });
    await f.service.tick();
    expect((await f.promotions.wallet(customer, "store-a")).movements).toEqual([]);
  });

  it("impegna coupon e punti prima della chiamata al provider", async () => {
    const f = await fixture();
    await f.earn();
    await f.promotions.saveCoupon(operator, "store-a", coupon({ globalLimit: 1 }));
    let inspected = false;
    f.payments.onCreate = async () => {
      inspected = true;
      expect(await f.promotions.wallet(customer, "store-a")).toMatchObject({ heldPoints: 100, availablePoints: 0 });
      expect((await f.promotions.configuration(operator, "store-a")).usage).toMatchObject([{ reserved: 1, consumed: 0 }]);
    };
    await f.submit(cart({ benefits: { couponCodes: ["SCONTO"], redeemReward: true } }), "card");
    expect(inspected).toBe(true);
  });

  it("preserva l'ordine relativo percentuale anche quando gli arrotondamenti cambiano il netto", async () => {
    const f = await fixture();
    const catalog = await f.service.catalog("store-a", operator);
    await f.service.saveStore(operator, { ...catalog, products: catalog.products.map(product => product.id === "a" ? { ...product, priceCents: 11 } : product) });
    await f.promotions.saveCoupon(operator, "store-a", coupon({ code: "TERZO", kind: "percent", value: 3333 }));
    await f.promotions.saveCoupon(operator, "store-a", coupon({ code: "META", kind: "percent", value: 5000 }));
    const first = await f.service.quote(cart({ benefits: { couponCodes: ["TERZO", "META"], redeemReward: false } }), customer);
    const second = await f.service.quote(cart({ benefits: { couponCodes: ["META", "TERZO"], redeemReward: false } }), customer);
    expect(first.totalCents).toBe(4);
    expect(second.totalCents).toBe(5);
    expect(first.fingerprint).not.toBe(second.fingerprint);
    expect((await f.service.quote(cart({ benefits: { couponCodes: ["TERZO", "META"], redeemReward: false } }), customer)).promotions).toEqual(first.promotions);
  });

  it("premio richiede saldo sufficiente e programma abilitato senza creare movimenti", async () => {
    const f = await fixture();
    const selected = cart({ benefits: { couponCodes: [], redeemReward: true } });
    await expect(f.service.quote(selected, customer)).rejects.toMatchObject({ code: "loyalty_insufficient" });
    await f.earn();
    const initial = await f.promotions.wallet(customer, "store-a");
    await f.promotions.saveProgram(operator, "store-a", { ...initial.program, enabled: false });
    await expect(f.service.quote(selected, customer)).rejects.toMatchObject({ code: "loyalty_unavailable" });
    const wallet = await f.promotions.wallet(customer, "store-a");
    expect(wallet.movements).toEqual(initial.movements);
    expect(wallet.availablePoints).toBe(100);
  });
});
