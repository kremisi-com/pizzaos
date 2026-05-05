import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProfileManager } from "@/features/profile/components/profile-manager";

afterEach(() => {
  cleanup();
});

describe("ProfileManager", () => {
  it("renders active plan and billing overview", () => {
    render(<ProfileManager storeId="store-roma-centro" storeName="Roma Centro" />);

    expect(screen.getByText("Profilo Ristoratore")).toBeDefined();
    expect(screen.getByText("Piano attivo")).toBeDefined();
    expect(screen.getByText("Rinnovo prossimo")).toBeDefined();
    expect(screen.getByText("Fatturazione")).toBeDefined();
  });

  it("supports simulated plan upgrade and downgrade", () => {
    render(<ProfileManager storeId="store-roma-centro" storeName="Roma Centro" />);

    expect(screen.getAllByText("Growth").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Upgrade a Scale" }));
    expect(screen.getAllByText("Scale").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Downgrade a Growth" }));
    fireEvent.click(screen.getByRole("button", { name: "Downgrade a Core" }));
    expect(screen.getAllByText("Core").length).toBeGreaterThan(0);
  });
});
