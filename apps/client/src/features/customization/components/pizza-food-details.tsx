"use client";

import { menuAllergenKey, type MENU_ALLERGENS, type MenuComposition } from "@pizzaos/domain";
import { useEffect, useState } from "react";
import styles from "./pizza-food-details.module.css";

const icons: Record<typeof MENU_ALLERGENS[number], string> = {
  Glutine: "🌾", Crostacei: "🦐", Uova: "🥚", Pesce: "🐟", Arachidi: "🥜",
  Soia: "🫘", Latte: "🥛", "Frutta a guscio": "🌰", Sedano: "🥬", Senape: "🌼",
  Sesamo: "🌱", Solfiti: "🍷", Lupini: "🫘", Molluschi: "🦪", Lattosio: "🥛"
};
const iconByKey = new Map(Object.entries(icons).map(([label, icon]) => [menuAllergenKey(label), icon]));

export function PizzaFoodDetails({ composition, kitchenNotice }: {
  composition: Pick<MenuComposition, "ingredients" | "contains" | "mayContain">;
  kitchenNotice?: string;
}) {
  const [toast, setToast] = useState<{ message: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function allergenIcon(label: string) {
    const icon = iconByKey.get(menuAllergenKey(label)) ?? "❓";
    return <button key={label} type="button" className={styles.icon} aria-label={label}
      onClick={() => setToast({ message: `${icon} ${label}` })}>
      <span aria-hidden="true">{icon}</span>
    </button>;
  }

  return <div className={styles.details}>
    <p>{composition.ingredients.join(", ") || "Componi la tua pizza"}</p>
    {composition.contains.length > 0 && <div className={styles.icons} role="group" aria-label="Allergeni attivi">
      {composition.contains.map(allergenIcon)}
    </div>}
    {composition.mayContain.length > 0 && <div className={styles.icons} role="group" aria-label="Può contenere">
      <span>Può contenere:</span>{composition.mayContain.map(allergenIcon)}
    </div>}
    {kitchenNotice && <p>{kitchenNotice}</p>}
    <div role="status" aria-live="polite" aria-atomic="true">
      {toast && <div className={styles.toast}>{toast.message}</div>}
    </div>
  </div>;
}
