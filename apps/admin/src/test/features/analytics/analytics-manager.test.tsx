import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AnalyticsManager } from "@/features/analytics/components/analytics-manager";
import type { AnalyticsSnapshot, AiInsight, Product } from "@pizzaos/domain";

const MOCK_ANALYTICS: AnalyticsSnapshot = {
  storeId: "store-1",
  generatedAtIso: new Date().toISOString(),
  ordersToday: 42,
  revenueToday: { amountCents: 84000, currencyCode: "EUR" },
  averageOrderValue: { amountCents: 2000, currencyCode: "EUR" },
  topProductIds: ["p1", "p2"],
  cancellationRate: 0.05
};

const MOCK_INSIGHTS: AiInsight[] = [
  {
    id: "insight-1",
    storeId: "store-1",
    title: "Picco previsto",
    summary: "Previsto picco di ordini tra le 19:00 e le 20:00.",
    confidenceScore: 0.92,
    status: "new",
    generatedAtIso: new Date().toISOString()
  }
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Margherita",
    sku: "PIZ-001",
    description: "Classic",
    price: { amountCents: 800, currencyCode: "EUR" },
    status: "available",
    category: "pizza",
    image: "",
    tags: [],
    allergens: []
  },
  {
    id: "p2",
    name: "Diavola",
    sku: "PIZ-002",
    description: "Spicy",
    price: { amountCents: 1000, currencyCode: "EUR" },
    status: "available",
    category: "pizza",
    image: "",
    tags: [],
    allergens: []
  }
];

describe("AnalyticsManager", () => {
  it("renders KPI cards with correct data", () => {
    const markup = renderToString(
      createElement(AnalyticsManager, {
        analytics: MOCK_ANALYTICS,
        insights: MOCK_INSIGHTS,
        products: MOCK_PRODUCTS
      })
    );

    expect(markup).toContain("Ordini Oggi");
    expect(markup).toContain("42");
    expect(markup).toContain("Ricavi Oggi");
    expect(markup).toContain("840,00");
    expect(markup).toContain("Tasso Cancellazione");
    expect(markup).toContain("5.0");
    expect(markup).toContain("%");
  });

  it("renders top products", () => {
    const markup = renderToString(
      createElement(AnalyticsManager, {
        analytics: MOCK_ANALYTICS,
        insights: MOCK_INSIGHTS,
        products: MOCK_PRODUCTS
      })
    );

    expect(markup).toContain("Margherita");
    expect(markup).toContain("PIZ-001");
    expect(markup).toContain("Diavola");
    expect(markup).toContain("PIZ-002");
  });

  it("renders AI insights", () => {
    const markup = renderToString(
      createElement(AnalyticsManager, {
        analytics: MOCK_ANALYTICS,
        insights: MOCK_INSIGHTS,
        products: MOCK_PRODUCTS
      })
    );

    expect(markup).toContain("PizzaOS AI Insights");
    expect(markup).toContain("Picco previsto");
    expect(markup).toContain("Previsto picco di ordini");
    expect(markup).toContain("92");
    expect(markup).toContain("%");
  });

  it("renders heatmap placeholder", () => {
    const markup = renderToString(
      createElement(AnalyticsManager, {
        analytics: MOCK_ANALYTICS,
        insights: MOCK_INSIGHTS,
        products: MOCK_PRODUCTS
      })
    );

    expect(markup).toContain("Heatmap Popolarità");
    expect(markup).toContain("Visualizzazione Densità Ordini Real-time");
  });
});
