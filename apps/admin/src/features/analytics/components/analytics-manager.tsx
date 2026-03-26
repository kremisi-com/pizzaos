"use client";

import type { AnalyticsSnapshot, AiInsight, Product } from "@pizzaos/domain";
import { Card } from "@pizzaos/ui";
import { type ReactElement } from "react";
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
  const topProducts = analytics.topProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);

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
          <h3 className={styles.sectionTitle}>PizzaOS AI Insights</h3>
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
