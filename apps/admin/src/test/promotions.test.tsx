import { afterEach, describe, expect, it, vi } from "vitest";
import type { IndividualProduct, PromotionsApi } from "@pizzaos/domain";
import { cleanupDom, renderDom, domScreen as screen, domFireEvent as fireEvent, domWaitFor as waitFor } from "@pizzaos/testing";
import { PromotionAdminPanel } from "../features/promotions";

const program = { enabled: true, pointsPerEuro: 1, rewardPoints: 100, rewardCents: 500, revision: 7 };
const products: IndividualProduct[] = [{ id: "a", name: "Pizza A", description: "", priceCents: 2000, available: true, allergens: [], ingredients: {}, options: [] }];
function api(): PromotionsApi {
  return { configuration: vi.fn().mockResolvedValue({ program, coupons: [], usage: [] }), saveProgram: vi.fn().mockResolvedValue({ ...program, revision: 8 }), saveCoupon: vi.fn().mockImplementation(async (_storeId, input) => ({ ...input, id: "coupon", revision: 1 })), wallet: vi.fn() };
}
afterEach(cleanupDom);

describe("configurazione promozioni amministratore", () => {
  it("carica il programma della sede e salva euro in centesimi con revisione corrente", async () => {
    const service = api();
    renderDom(<PromotionAdminPanel api={service} storeId="store-a" products={products} />);
    await screen.findByLabelText("Punti per euro");
    fireEvent.change(screen.getByLabelText("Punti per euro"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Valore premio (€)"), { target: { value: "7.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva programma" }));
    await waitFor(() => expect(service.saveProgram).toHaveBeenCalledWith("store-a", { ...program, pointsPerEuro: 3, rewardCents: 750 }));
  });

  it("crea coupon percentuale con basis point, minimo in cent e prodotti espliciti", async () => {
    const service = api();
    renderDom(<PromotionAdminPanel api={service} storeId="store-a" products={products} />);
    await screen.findByRole("button", { name: "Nuovo coupon" });
    fireEvent.click(screen.getByRole("button", { name: "Nuovo coupon" }));
    fireEvent.change(screen.getByLabelText("Codice coupon"), { target: { value: "PIZZA10" } });
    fireEvent.change(screen.getByLabelText("Tipo coupon"), { target: { value: "percent" } });
    fireEvent.change(screen.getByLabelText("Valore coupon"), { target: { value: "12.50" } });
    fireEvent.change(screen.getByLabelText("Spesa minima (€)"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Limite totale"), { target: { value: "5" } });
    fireEvent.click(screen.getByLabelText("Pizza A"));
    fireEvent.click(screen.getByRole("button", { name: "Salva coupon" }));
    await waitFor(() => expect(service.saveCoupon).toHaveBeenCalledWith("store-a", expect.objectContaining({ code: "PIZZA10", kind: "percent", value: 1250, minimumCents: 2000, productIds: ["a"], globalLimit: 5, perCustomerLimit: null })));
  });

  it("con revisione obsoleta ricarica la configurazione senza successo apparente", async () => {
    const service = api();
    vi.mocked(service.saveProgram).mockRejectedValue(Object.assign(new Error("Configurazione aggiornata da un altro operatore"), { code: "revision_conflict" }));
    renderDom(<PromotionAdminPanel api={service} storeId="store-a" products={products} />);
    await screen.findByLabelText("Punti per euro");
    fireEvent.click(screen.getByRole("button", { name: "Salva programma" }));
    await waitFor(() => expect(service.configuration).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/programma salvato/i)).toBeNull();
  });
});


  it("riapre e disattiva un coupon conservando identificativo e revisione", async () => {
    const service = api();
    const existing = { id: "coupon-existing", code: "ESISTENTE", active: true, kind: "fixed" as const, value: 350, startsAt: null, endsAt: null, minimumCents: 2000, productIds: ["a"], globalLimit: 8, perCustomerLimit: 2, revision: 4 };
    vi.mocked(service.configuration).mockResolvedValue({ program, coupons: [existing], usage: [{ couponId: existing.id, reserved: 1, consumed: 2 }] });
    renderDom(<PromotionAdminPanel api={service} storeId="store-a" products={products} />);
    fireEvent.click(await screen.findByRole("button", { name: "Modifica ESISTENTE" }));
    expect((screen.getByLabelText("Codice coupon") as HTMLInputElement).value).toBe("ESISTENTE");
    fireEvent.click(screen.getByLabelText("Coupon attivo"));
    fireEvent.click(screen.getByRole("button", { name: "Salva coupon" }));
    await waitFor(() => expect(service.saveCoupon).toHaveBeenCalledWith("store-a", { ...existing, active: false }));
  });
