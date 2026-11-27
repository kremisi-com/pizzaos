"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./order-action-dock.module.css";

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

/** A viewport action above the navigation, with measured space to keep final content reachable. */
export function OrderActionDock({ label, amount, message, children, testId, breakdown }: {
  label: string; amount: number | null; message?: ReactNode; children: ReactNode; testId?: string; breakdown?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const id = useId();
  const [height, setHeight] = useState(180);
  useEffect(() => {
    const dock = ref.current;
    if (!dock || typeof ResizeObserver === "undefined") return;
    const measure = () => setHeight(dock.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);
  return <>
    <div aria-hidden="true" style={{ height: height + 24 }} />
    <aside ref={ref} className={styles.dock} aria-label="Riepilogo ordine" aria-describedby={message ? id : undefined} data-testid={testId}>
      {breakdown && <div className={styles.breakdown}>{breakdown}</div>}
      <div className={styles.totalRow}><span>{label}</span><strong>{amount === null ? "—" : money(amount)}</strong></div>
      {message && <div id={id} className={styles.nextStep} role="status">{message}</div>}
      <div className={styles.action}>{children}</div>
    </aside>
  </>;
}
