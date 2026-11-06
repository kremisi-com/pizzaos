import { afterEach, describe, expect, it, vi } from "vitest";
import type { IndividualQuote, PromotionsApi } from "@pizzaos/domain";
import { cleanupDom, renderDom, domScreen as screen, domFireEvent as fireEvent, domWaitFor as waitFor } from "@pizzaos/testing";
import { PromotionSelectionPanel, PromotionSummary } from "../features/promotions";

const program = { enabled: true, pointsPerEuro: 1, rewardPoints: 100, rewardCents: 500, revision: 1 };
function api(): PromotionsApi {
  return {
    configuration: vi.fn().mockResolvedValue({ program, coupons: [], usage: [] }),
    saveProgram: vi.fn().mockResolvedValue(program), saveCoupon: vi.fn(),
    wallet: vi.fn().mockResolvedValue({ storeId: "store-a", program, balancePoints: 150, heldPoints: 100, availablePoints: 50, movements: [] }),
  };
}
afterEach(cleanupDom);

describe("selezione promozioni cliente", () => {
  it("mostra saldo e punti disponibili forniti dal server", async () => {
    const service = api();
    renderDom(<PromotionSelectionPanel api={service} storeId="store-a" onChange={vi.fn()} />);
    await screen.findByText(/Saldo punti/);
    expect(screen.getByText(/Punti disponibili/)).toBeTruthy();
    expect(document.body.textContent).toContain("150");
    expect(document.body.textContent).toContain("50");
    expect(service.wallet).toHaveBeenCalledWith("store-a");
  });

  it("trasmette codici in sequenza e selezione premio senza calcolare importi", async () => {
    const changed = vi.fn();
    renderDom(<PromotionSelectionPanel api={api()} storeId="store-a" onChange={changed} />);
    await screen.findByLabelText("Codici coupon");
    fireEvent.change(screen.getByLabelText("Codici coupon"), { target: { value: " venti , dieci, fisso " } });
    fireEvent.click(screen.getByRole("button", { name: "Applica coupon" }));
    expect(changed).toHaveBeenLastCalledWith({ couponCodes: ["VENTI", "DIECI", "FISSO"], redeemReward: false });
  });

  it("rilegge wallet al refresh e segnala al checkout condizioni mutate", async () => {
    const service = api();
    const terms = vi.fn();
    const mounted = renderDom(<PromotionSelectionPanel api={service} storeId="store-a" refreshVersion={0} onChange={vi.fn()} onTermsChange={terms} />);
    await screen.findByText(/Saldo punti/);
    vi.mocked(service.wallet).mockResolvedValue({ storeId: "store-a", program, balancePoints: 200, heldPoints: 0, availablePoints: 200, movements: [] });
    mounted.rerender(<PromotionSelectionPanel api={service} storeId="store-a" refreshVersion={1} onChange={vi.fn()} onTermsChange={terms} />);
    await waitFor(() => expect(service.wallet).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(terms).toHaveBeenCalled());
  });

  it("riepiloga lordo, coupon, premio e consegna dai valori server", () => {
    const quote: IndividualQuote = { fingerprint: "server", subtotalCents: 440, deliveryCents: 200, totalCents: 640, slotId: "slot", slotStartsAt: "2030-01-01T12:30:00.000Z", lines: [], promotions: { originalSubtotalCents: 2000, discountCents: 1560, netSubtotalCents: 440, rewardDiscountCents: 500, redeemedPoints: 100, pointsPerEuro: 1, coupons: [{ id: "a", code: "DIECI", discountCents: 200 }, { id: "b", code: "VENTI", discountCents: 360 }, { id: "c", code: "FISSO", discountCents: 500 }], lines: [] } };
    renderDom(<PromotionSummary quote={quote} />);
    for (const label of ["Prodotti prima degli sconti", "Sconti coupon", "Premio fedeltà", "Prodotti netti", "Consegna"]) expect(screen.getByText(label)).toBeTruthy();
    for (const amount of ["20,00", "4,40", "6,40"]) expect(document.body.textContent).toContain(amount);
  });
});

  it("il controllo premio emette soltanto la selezione commerciale", async () => {
    const service = api();
    vi.mocked(service.wallet).mockResolvedValue({ storeId: "store-a", program, balancePoints: 150, heldPoints: 0, availablePoints: 150, movements: [] });
    const changed = vi.fn();
    renderDom(<PromotionSelectionPanel api={service} storeId="store-a" selection={{ couponCodes: ["PIZZA"], redeemReward: false }} onChange={changed} />);
    fireEvent.click(await screen.findByLabelText("Usa premio fedeltà"));
    expect(changed).toHaveBeenLastCalledWith({ couponCodes: ["PIZZA"], redeemReward: true });
  });
