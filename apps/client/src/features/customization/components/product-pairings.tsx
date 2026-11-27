"use client";

import type { IndividualProduct, IndividualStore } from "@pizzaos/domain";
import { useId, useState } from "react";
import styles from "./product-detail-screen.module.css";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function ProductPairings({ store, product, disabled, onChoose, simpleOnly = false }: {
  store: IndividualStore; product: IndividualProduct; disabled: boolean;
  onChoose?: (product: IndividualProduct) => void; simpleOnly?: boolean;
}) {
  const titleId = useId();
  const [message, setMessage] = useState("");
  const pairings = store.products.filter(item => item.available && product.pairingProductIds?.includes(item.id)
    && (!simpleOnly || !item.groups?.length && !item.pizza && item.productType !== "meal"));
  if (!onChoose || pairings.length === 0) return null;
  return <section className={styles.pairingsSection} aria-labelledby={titleId}>
    <h2 id={titleId} className={styles.pairingsTitle}>Abbinamenti consigliati</h2>
    <div className={styles.pairingsList}>{pairings.map(item => <div key={item.id} className={styles.pairingCard}>
      <div className={styles.pairingInfo}><p className={styles.pairingName}>{item.name}</p>
        <p className={styles.pairingDescription}>{item.description}</p></div>
      <div className={styles.pairingPriceGroup}><span className={styles.pairingPrice}>{euro.format(item.priceCents / 100)}</span>
        <button type="button" className={styles.pairingAddButton} disabled={disabled}
          aria-label={`Aggiungi ${item.name} al carrello`} onClick={() => {
            onChoose(item);
            if (!item.groups?.length && !item.pizza && item.productType !== "meal") setMessage(`${item.name} aggiunto al carrello`);
          }}>＋</button>
      </div>
    </div>)}</div>
    {message && <p role="status">{message}</p>}
  </section>;
}
