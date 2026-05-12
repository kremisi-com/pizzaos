"use client";

import type { AnalyticsSnapshot, AiInsight, Product } from "@pizzaos/domain";
import { Card } from "@pizzaos/ui";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { buildOrderTrendSeries, buildSimulatedAiTypingText } from "../analytics-ai-utils";
import styles from "./analytics-manager.module.css";

interface AnalyticsManagerProps {
  analytics: AnalyticsSnapshot;
  insights: readonly AiInsight[];
  products: readonly Product[];
}

export function AnalyticsManager({
  analytics,
  insights,
  products
}: AnalyticsManagerProps): ReactElement {
  const [typingVisibleChars, setTypingVisibleChars] = useState(0);

  const topProducts = analytics.topProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);

  const trendSeries = useMemo(() => {
    return buildOrderTrendSeries({
      ordersToday: analytics.ordersToday,
      cancellationRate: analytics.cancellationRate
    });
  }, [analytics.cancellationRate, analytics.ordersToday]);

  const preparingOrdersCount = Math.max(1, Math.round(analytics.ordersToday * 0.15));
  const outForDeliveryOrdersCount = Math.max(1, Math.round(analytics.ordersToday * 0.1));

  const aiTypingText = useMemo(() => {
    return buildSimulatedAiTypingText({
      ordersToday: analytics.ordersToday,
      preparingOrdersCount,
      outForDeliveryOrdersCount,
      cancellationRate: analytics.cancellationRate
    });
  }, [analytics.cancellationRate, analytics.ordersToday, outForDeliveryOrdersCount, preparingOrdersCount]);

  useEffect(() => {
    setTypingVisibleChars(0);

    const typingInterval = window.setInterval(() => {
      setTypingVisibleChars((current) => {
        if (current >= aiTypingText.length) {
          window.clearInterval(typingInterval);
          return current;
        }

        return current + 3;
      });
    }, 35);

    return () => window.clearInterval(typingInterval);
  }, [aiTypingText]);

  function formatMoney(amountCents: number, currencyCode: string): string {
    const validCurrency = currencyCode && /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : "EUR";
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: validCurrency
    }).format(amountCents / 100);
  }

  return (
    <div className={styles.container}>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Ordini Oggi</span>
          <span className={styles.kpiValue}>{analytics.ordersToday}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Ricavi Oggi</span>
          <span className={styles.kpiValue}>
            {formatMoney(analytics.revenueToday.amountCents, analytics.revenueToday.currencyCode)}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Valore Medio Ordine</span>
          <span className={styles.kpiValue}>
            {formatMoney(analytics.averageOrderValue.amountCents, analytics.averageOrderValue.currencyCode)}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Tasso Cancellazione</span>
          <span className={styles.kpiValue}>
            {(analytics.cancellationRate * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <section>
          <h3 className={styles.sectionTitle}>Heatmap Popolarità (Zone Store)</h3>
          <div className={styles.heatmapContainer}>
            <div className={styles.heatmapBackground} />
            {/* Simulated heatmap blobs */}
            <div
              className={styles.heatmapBlob}
              style={{
                width: "150px",
                height: "150px",
                background: "#ff4d4d",
                top: "20%",
                left: "30%"
              }}
            />
            <div
              className={styles.heatmapBlob}
              style={{
                width: "100px",
                height: "100px",
                background: "#ff9900",
                top: "50%",
                left: "60%"
              }}
            />
            <div
              className={styles.heatmapBlob}
              style={{
                width: "80px",
                height: "80px",
                background: "#ffd633",
                top: "10%",
                left: "70%"
              }}
            />
            <span style={{ position: "relative", zIndex: 1, fontWeight: 600, color: "#666" }}>
              Visualizzazione Densità Ordini Real-time
            </span>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <h3 className={styles.sectionTitle}>Prodotti più Venduti</h3>
            <Card>
              <div className={styles.topProducts}>
                {topProducts.map((product, index) => (
                  <div key={product.id} className={styles.productRow}>
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>{product.name}</span>
                      <span className={styles.productSku}>{product.sku}</span>
                    </div>
                    <span className={styles.productRank}>#{index + 1}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section>
          <h3 className={styles.sectionTitle}>Analytics and AI</h3>
          <Card>
            <div className={styles.chartHeader}>Trend ordini ultime 6 ore</div>
            <div className={styles.trendChart}>
              {trendSeries.map((point) => (
                <div key={point.label} className={styles.chartColumn}>
                  <div
                    className={styles.chartBar}
                    style={{ height: `${Math.max(10, point.value * 4)}px` }}
                    title={`${point.label}: ${point.value} ordini`}
                  />
                  <span className={styles.chartLabel}>{point.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className={styles.liveEventTitle}>Evento ordine locale</div>
            <p className={styles.liveEventSummary}>
              Ultimo update simulazione: coda stabile con {preparingOrdersCount} ordini in preparazione e{" "}
              {outForDeliveryOrdersCount} in consegna.
            </p>
          </Card>

          <Card>
            <div className={styles.typingTitle}>Assistente AI operativo</div>
            <p className={styles.typingText}>{aiTypingText.slice(0, typingVisibleChars)}</p>
          </Card>

          <div className={styles.insightList}>
            {insights.map((insight) => (
              <div key={insight.id} className={styles.insightCard}>
                <div className={styles.insightTitle}>{insight.title}</div>
                <div className={styles.insightSummary}>{insight.summary}</div>
                <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "#888" }}>
                  Confidenza: {(insight.confidenceScore * 100).toFixed(0)}% •{" "}
                  {new Date(insight.generatedAtIso).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </div>
            ))}
            {insights.length === 0 && (
              <p style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic" }}>
                Nessun insight AI disponibile al momento.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
