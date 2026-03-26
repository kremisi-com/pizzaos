import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { render, screen, fireEvent } from "@testing-library/react";
import { CatalogManager } from "@/features/catalog/components/catalog-manager";
import type { Menu, Product } from "@pizzaos/domain";

// Mock @pizzaos/ui to avoid styles-related issues in JSDOM if any
vi.mock("@pizzaos/ui", async () => {
  const actual = await vi.importActual("@pizzaos/ui");
  return {
    ...actual,
  };
});

const MOCK_PRODUCTS: Product[] = [
  {
    id: "product-1",
    sku: "SKU-1",
    name: "Pizza Margherita",
    description: "Classic pizza",
    basePrice: { amountCents: 1000, currencyCode: "EUR" },
    status: "available",
    tags: ["classic"],
    allergens: []
  }
];

const MOCK_MENUS: Menu[] = [
  {
    id: "menu-1",
    storeId: "store-1",
    name: "Standard Menu",
    status: "active",
    sections: [
      {
        id: "section-1",
        name: "Pizzas",
        productRefs: [{ productId: "product-1", isFeatured: true }]
      }
    ]
  }
];

describe("CatalogManager", () => {
  it("renders menus and products", () => {
    const markup = renderToString(
      createElement(CatalogManager, {
        menus: MOCK_MENUS,
        products: MOCK_PRODUCTS,
        onUpdateMenu: vi.fn(),
        onUpdateProduct: vi.fn(),
      })
    );

    expect(markup).toContain("Gestione Catalogo");
    expect(markup).toContain("Standard Menu");
    expect(markup).toContain("Pizza Margherita");
    expect(markup).toContain("Classic pizza");
    expect(markup).toContain("€");
    expect(markup).toContain("10.00");
  });

  it("renders menu status for active menu", () => {
     const markup = renderToString(
      createElement(CatalogManager, {
        menus: MOCK_MENUS,
        products: MOCK_PRODUCTS,
        onUpdateMenu: vi.fn(),
        onUpdateProduct: vi.fn(),
      })
    );
    // StatusIndicator with status="online" renders a role="status"
    expect(markup).toContain("role=\"status\"");
  });

  it("calls onUpdateMenu when menu settings are saved", () => {
    const onUpdateMenu = vi.fn();
    render(
      createElement(CatalogManager, {
        menus: MOCK_MENUS,
        products: MOCK_PRODUCTS,
        onUpdateMenu,
        onUpdateProduct: vi.fn(),
      })
    );

    // Click on "Impostazioni"
    fireEvent.click(screen.getByText("Impostazioni"));

    // Check if modal is open
    expect(screen.getByText("Impostazioni Menu")).toBeDefined();

    // Change menu name
    const input = screen.getByLabelText("Nome Menu");
    fireEvent.change(input, { target: { value: "Updated Menu Name" } });

    // Save
    fireEvent.click(screen.getByText("Salva Impostazioni"));

    expect(onUpdateMenu).toHaveBeenCalledWith(expect.objectContaining({
      id: "menu-1",
      name: "Updated Menu Name"
    }));
  });
});
