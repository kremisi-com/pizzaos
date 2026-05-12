import { describe, expect, it } from "vitest";
import { buildOrderTrendSeries, buildSimulatedAiTypingText } from "@/features/analytics/analytics-ai-utils";

describe("analytics ai utils", () => {
  it("builds deterministic trend points from analytics snapshot", () => {
    const series = buildOrderTrendSeries({ ordersToday: 42, cancellationRate: 0.05 });

    expect(series).toHaveLength(6);
    expect(series[0]?.value).toBeGreaterThan(0);
    expect(series[5]?.value).toBeGreaterThanOrEqual(series[0]?.value ?? 0);
  });

  it("builds ai typing text from local order events", () => {
    const text = buildSimulatedAiTypingText({
      ordersToday: 42,
      preparingOrdersCount: 6,
      outForDeliveryOrdersCount: 4,
      cancellationRate: 0.05
    });

    expect(text).toContain("42 ordini");
    expect(text).toContain("in preparazione");
    expect(text).toContain("in consegna");
  });
});
