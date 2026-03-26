"use client";

import type { StoreProfile } from "@pizzaos/domain";
import type { ReactElement } from "react";

export interface StoreSwitcherProps
{
  readonly stores: readonly StoreProfile[];
  readonly activeStoreId: string;
  readonly onStoreChange: (storeId: string) => void;
}

export function StoreSwitcher(props: StoreSwitcherProps): ReactElement
{
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <label
        htmlFor="store-switcher"
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--pizzaos-color-foreground-muted)"
        }}
      >
        Negozio Attivo
      </label>
      <select
        id="store-switcher"
        value={props.activeStoreId}
        onChange={(e) => props.onStoreChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: "var(--pizzaos-radius-control)",
          border: "1px solid var(--pizzaos-color-border)",
          backgroundColor: "var(--pizzaos-color-background)",
          color: "var(--pizzaos-color-foreground)",
          fontWeight: 600,
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23415062' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          backgroundSize: "16px"
        }}
      >
        {props.stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
