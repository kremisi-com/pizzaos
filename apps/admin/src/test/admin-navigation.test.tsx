import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ADMIN_PATHS, adminHref, getAdminTab } from "../composition/admin-navigation";
import { AdminFrame } from "../composition/admin-frame";
import { useAdminNavigation } from "../composition/use-admin-navigation";
import { readActiveStore, rememberActiveStore, resolveActiveStore } from "../composition/active-store";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
});

function Navigation({ demo = false }: { demo?: boolean }) {
  const [tab, navigate] = useAdminNavigation(demo);
  return <AdminFrame activeTab={tab} onTabChange={navigate} storeSelector={null} demo={demo}>
    <output data-testid="section">{tab}</output>
  </AdminFrame>;
}

describe("admin sidebar URLs", () => {
  for (const demo of [false, true]) {
    it(`restores every section from its URL, including remounts (demo=${demo})`, () => {
      for (const [tab, section] of Object.entries(ADMIN_PATHS)) {
        window.history.replaceState(null, "", `${demo ? "/poc" : "/operazioni"}/${section}`);
        const view = render(<Navigation demo={demo} />);
        expect(screen.getByTestId("section").textContent).toBe(tab);
        expect(document.querySelector('[aria-current="page"]')?.getAttribute("href")).toBe(window.location.pathname);
        view.unmount();
      }
    });
  }

  it("updates the URL on sidebar clicks and restores browser history changes", () => {
    render(<Navigation />);
    fireEvent.click(screen.getByRole("link", { name: "Ordini" }));
    expect(window.location.pathname).toBe("/operazioni/ordini");
    fireEvent.click(screen.getByRole("link", { name: "Menu" }));
    expect(window.location.pathname).toBe("/operazioni/menu");
    act(() => {
      window.history.replaceState(null, "", "/operazioni/ordini");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByTestId("section").textContent).toBe("orders");
  });

  it("uses the same URLs for dashboard shortcuts", () => {
    const { result } = renderHook(() => useAdminNavigation());
    act(() => result.current[1]("inventory"));
    expect(window.location.pathname).toBe(adminHref("inventory"));
    expect(result.current[0]).toBe("inventory");
    expect(getAdminTab("inesistente")).toBeUndefined();
  });
});

describe("active operational store", () => {
  const stores = [{ id: "first" }, { id: "second" }];
  it("restores the selected store and prioritizes the current selection on refresh", () => {
    rememberActiveStore("second");
    expect(resolveActiveStore(stores, "")).toBe("second");
    expect(resolveActiveStore(stores, "first")).toBe("first");
  });
  it("falls back when the saved store is no longer authorized and clears an empty selection", () => {
    rememberActiveStore("revoked");
    expect(resolveActiveStore(stores, "")).toBe("first");
    expect(resolveActiveStore([], "")).toBe("");
    rememberActiveStore("");
    expect(readActiveStore()).toBe("");
  });
  it("continues when browser storage is blocked", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new Error("Blocked"); });
    expect(resolveActiveStore(stores, "")).toBe("first");
    expect(() => rememberActiveStore("second")).not.toThrow();
  });
});
