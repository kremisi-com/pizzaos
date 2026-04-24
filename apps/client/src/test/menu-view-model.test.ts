import { createClientSeed } from "@pizzaos/mock-data";
import { describe, expect, it } from "vitest";
import {
  deriveMenuSections,
  deriveProductAvailability,
  deriveSlotAvailability,
  formatSlotLabel
} from "../features/menu/menu-view-model";

describe("menu view model helpers", () =>
{
  it("derives menu sections preserving product order and availability summary", () =>
  {
    const seed = createClientSeed();

    const sections = deriveMenuSections(seed.menu, seed.products);

    expect(sections.map((section) => section.id)).toEqual([
      "section-pizze-classiche",
      "section-speciali",
      "section-forno",
      "section-creare-pizza"
    ]);
    expect(sections[0].products.map((product) => product.id)).toEqual([
      "product-marinara",
      "product-margherita",
      "product-diavola",
      "product-capricciosa"
    ]);
    expect(sections[1].products.map((product) => product.id)).toEqual([
      "product-vegetariana",
      "product-4-formaggi",
      "product-tonno-cipolla"
    ]);
    expect(sections[1].summary).toBe("3 disponibili");
  });

  it("derives product availability states for available and sold out products", () =>
  {
    const seed = createClientSeed();
    const availableProduct = seed.products.find((product) => product.id === "product-margherita");
    const soldOutProduct = seed.products.find((product) => product.id === "product-calzone");

    expect(availableProduct).toBeDefined();
    expect(soldOutProduct).toBeDefined();
    expect(deriveProductAvailability(availableProduct!)).toEqual({
      isOrderable: true,
      label: "Disponibile",
      tone: "success"
    });
    expect(deriveProductAvailability(soldOutProduct!)).toEqual({
      isOrderable: false,
      label: "Esaurita ora",
      tone: "critical"
    });
  });

  it("formats slot labels and derives slot state metadata", () =>
  {
    const seed = createClientSeed();
    const limitedSlot = seed.slots[1];
    const soldOutSlot = seed.slots[2];

    expect(formatSlotLabel(limitedSlot)).toBe("Oggi, 19:30 · 40 min");
    expect(deriveSlotAvailability(limitedSlot)).toEqual({
      isSelectable: true,
      label: "Quasi pieno",
      meta: "Oggi, 19:30 · 40 min",
      tone: "warning"
    });
    expect(deriveSlotAvailability(soldOutSlot).isSelectable).toBe(false);
  });
});
