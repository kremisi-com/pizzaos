import type { IndividualOrder } from "@pizzaos/domain";
import styles from "./operational-order-timeline.module.css";

const progress: Record<IndividualOrder["status"], number> = {
  pending_payment: -1,
  awaiting_acceptance: 0,
  awaiting_customer: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  out_for_delivery: 4,
  completed: 5,
  cancelled: -1
};

export function OrderTimeline({ status, mode }: { status: IndividualOrder["status"]; mode: IndividualOrder["cart"]["mode"] }) {
  if (status === "cancelled" || status === "pending_payment") return null;
  const phases = [
    { index: 0, label: "Inviato" },
    { index: 1, label: "Accettato" },
    { index: 2, label: "In preparazione" },
    { index: 3, label: "Pronto" },
    ...(mode === "delivery" ? [{ index: 4, label: "In consegna" }] : []),
    { index: 5, label: "Completato" }
  ];
  return <ol className={styles.timeline} aria-label="Avanzamento ordine">
    {phases.map(({ index, label }) => <li key={index} aria-current={index === progress[status] ? "step" : undefined}
      data-complete={index < progress[status] ? "" : undefined}>
      <span className={styles.dot} aria-hidden="true">{index < progress[status] ? "✓" : ""}</span>{label}
    </li>)}
  </ol>;
}
