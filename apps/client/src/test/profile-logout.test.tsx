import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanupDom, domFireEvent, domScreen, domWaitFor, renderDom } from "@pizzaos/testing";
import { FoodProfileShell } from "../composition/food-profile-shell";

vi.mock("../features/menu", () => ({
  useMenuPreferences: () => ({}),
  FoodPreferenceEditor: () => <div>Preferenze alimentari</div>,
}));

afterEach(() => { cleanupDom(); vi.unstubAllGlobals(); });

describe("logout dalla pagina profilo", () => {
  it("offre il logout all’account autenticato e permette di riprovare dopo un errore", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ actor: { id: "alice", name: "Alice", email: "alice@example.test" }, superadmin: false, storeIds: [] })))
      .mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    renderDom(<FoodProfileShell />);
    const logout = await domScreen.findByRole<HTMLButtonElement>("button", { name: "Effettua il log out" });
    domFireEvent.click(logout);
    expect(await domScreen.findByRole("alert")).toHaveProperty("textContent", "Impossibile uscire. Riprova.");
    await domWaitFor(() => expect(logout.disabled).toBe(false));
    expect(fetcher).toHaveBeenLastCalledWith("/api/pilot/auth/demo", { cache: "no-store" });
  });

  it("invita l’ospite ad accedere senza mostrare il logout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ actor: null, superadmin: false, storeIds: [] }))));
    renderDom(<FoodProfileShell />);
    await domScreen.findByRole("link", { name: "Accedi per salvare le preferenze" });
    expect(domScreen.queryByRole("button", { name: "Effettua il log out" })).toBeNull();
  });
});
