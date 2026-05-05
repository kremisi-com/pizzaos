interface TrendInput {
  ordersToday: number;
  cancellationRate: number;
}

interface TypingInput {
  ordersToday: number;
  preparingOrdersCount: number;
  outForDeliveryOrdersCount: number;
  cancellationRate: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

const TREND_LABELS = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"] as const;

export function buildOrderTrendSeries(input: TrendInput): TrendPoint[] {
  const baseline = Math.max(8, Math.round(input.ordersToday / TREND_LABELS.length));
  const cancellationImpact = Math.max(0, Math.round(input.cancellationRate * 10));

  return TREND_LABELS.map((label, index) => {
    const peakBoost = index >= 4 ? 3 : 0;
    const variance = (index % 3) - 1;
    const value = Math.max(1, baseline + index + peakBoost + variance - cancellationImpact);
    return { label, value };
  });
}

export function buildSimulatedAiTypingText(input: TypingInput): string {
  const cancellationPercent = Math.round(input.cancellationRate * 1000) / 10;

  return [
    `Monitoraggio live completato: ${input.ordersToday} ordini processati oggi.`,
    `${input.preparingOrdersCount} ordini in preparazione e ${input.outForDeliveryOrdersCount} in consegna.`,
    `Tasso cancellazione stabile al ${cancellationPercent}%.`,
    "Suggerimento AI: anticipare impasto premium e rinforzare la fascia 19:00-20:00."
  ].join(" ");
}
