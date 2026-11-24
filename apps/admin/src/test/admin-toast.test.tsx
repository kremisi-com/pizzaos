import { afterEach, describe, expect, it } from "vitest";
import { cleanupDom, renderDom, domScreen as screen, domFireEvent as fireEvent } from "@pizzaos/testing";
import { AdminToastProvider, useAdminToast } from "../composition/admin-toast";

function ToastActions() {
  const showToast = useAdminToast();
  return <>
    <button type="button" onClick={() => showToast("Salvataggio fallito.", "error")}>Mostra errore</button>
    <button type="button" onClick={() => showToast("Modifiche salvate.", "success")}>Mostra successo</button>
  </>;
}

afterEach(cleanupDom);

describe("notifiche admin", () => {
  it("annuncia l'errore e consente di chiudere il toast", () => {
    renderDom(<AdminToastProvider><ToastActions /></AdminToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Mostra errore" }));
    const toast = screen.getByRole("alert");
    expect(toast.textContent).toContain("Salvataggio fallito.");
    fireEvent.click(screen.getByRole("button", { name: "Chiudi notifica" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("annuncia il successo come messaggio informativo", () => {
    renderDom(<AdminToastProvider><ToastActions /></AdminToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Mostra successo" }));
    expect(screen.getByRole("status").textContent).toContain("Modifiche salvate.");
  });
});
