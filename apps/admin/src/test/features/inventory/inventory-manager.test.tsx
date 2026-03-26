import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InventoryManager } from "@/features/inventory/components/inventory-manager";
import type { InventoryItem, Product } from "@pizzaos/domain";

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Pizza Margherita",
    description: "Classic",
    basePrice: { amountCents: 900, currencyCode: "EUR" },
    status: "available",
    tags: ["best-seller"],
    allergens: [],
    sku: "SKU1"
  }
];

const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: "i1",
    storeId: "s1",
    sku: "SKU1",
    productId: "p1",
    availableUnits: 10,
    reorderThreshold: 5,
    status: "in_stock"
  }
];

describe("InventoryManager", () => {
  it("renders inventory table and products", () => {
    render(
      <InventoryManager
        inventory={MOCK_INVENTORY}
        products={MOCK_PRODUCTS}
        isDynamicPricingEnabled={false}
        onToggleDynamicPricing={vi.fn()}
        onUpdateInventoryItem={vi.fn()}
      />
    );

    expect(screen.getByText("Pizza Margherita")).toBeDefined();
    expect(screen.getByText("SKU1")).toBeDefined();
    expect(screen.getByText("In Stock")).toBeDefined();
  });

  it("renders the toggle button", () => {
    render(
      <InventoryManager
        inventory={MOCK_INVENTORY}
        products={MOCK_PRODUCTS}
        isDynamicPricingEnabled={false}
        onToggleDynamicPricing={vi.fn()}
        onUpdateInventoryItem={vi.fn()}
      />
    );

    const toggleButtons = screen.getAllByText(/Abilita Prezzi Dinamici/i);
    expect(toggleButtons.length).toBeGreaterThan(0);
  });

  it("shows low stock alert", () => {
    const lowStockInventory: InventoryItem[] = [
      {
        ...MOCK_INVENTORY[0],
        status: "low_stock",
        availableUnits: 3
      }
    ];

    render(
      <InventoryManager
        inventory={lowStockInventory}
        products={MOCK_PRODUCTS}
        isDynamicPricingEnabled={false}
        onToggleDynamicPricing={vi.fn()}
        onUpdateInventoryItem={vi.fn()}
      />
    );

    expect(screen.getByText("Scorte Basse")).toBeDefined();
    expect(screen.getByText("Solo 3 unità rimaste")).toBeDefined();
  });

  it("calls onUpdateInventoryItem with random units when 'Ripristina' is clicked", () => {
    const outOfStockInventory: InventoryItem[] = [
      {
        ...MOCK_INVENTORY[0],
        status: "out_of_stock",
        availableUnits: 0
      }
    ];
    const onUpdateInventoryItem = vi.fn();
    render(
      <InventoryManager
        inventory={outOfStockInventory}
        products={MOCK_PRODUCTS}
        isDynamicPricingEnabled={false}
        onToggleDynamicPricing={vi.fn()}
        onUpdateInventoryItem={onUpdateInventoryItem}
      />
    );

    const targetButton = screen.getAllByRole("button", { name: "Ripristina" })[0];
    fireEvent.click(targetButton);
    expect(onUpdateInventoryItem).toHaveBeenCalledWith("i1", "in_stock", expect.any(Number));
    const calls = onUpdateInventoryItem.mock.calls;
    expect(calls[0][2]).toBeGreaterThan(0);
  });
});
