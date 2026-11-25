"use client";

import { formatOrderWindow } from "@pizzaos/domain";
import type { IndividualStore } from "@pizzaos/domain";
import { useEffect, useState } from "react";

export function OrderSlotSelect({ store, value, onChange, onFocus }: {
  store: IndividualStore | null;
  value: string | null;
  onChange: (value: string | null) => void;
  onFocus?: () => void;
}) {
  const [clock, setClock] = useState(Date.now);
  const slots = store?.slots ?? [];
  useEffect(() => {
    if (!store) return;
    const now = Date.now();
    const nextClosing = Math.min(...store.slots.map(slot => Date.parse(slot.endsAt ?? slot.startsAt)).filter(end => end > now));
    if (!Number.isFinite(nextClosing)) return;
    // Browsers and Node clamp overflowing delays to 1ms; distant windows must not spin.
    const timer = setTimeout(() => setClock(Date.now()), Math.min(nextClosing - now + 1, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [store, clock]);

  const upcoming = slots.filter(slot => Date.parse(slot.endsAt ?? slot.startsAt) > Math.max(clock, Date.now()));
  const acceptingOrders = Boolean(store?.acceptingOrders);
  return <label>Quando?<select aria-label="Quando?" value={value ?? ""} onFocus={onFocus}
    onChange={event => onChange(event.target.value || null)}>
    <option value="" disabled={!acceptingOrders || !upcoming.some(slot => slot.capacity > 0)}>Appena possibile</option>
    {value && !upcoming.some(slot => slot.id === value) && <option value={value} disabled>Fascia non più disponibile</option>}
    {upcoming.map(slot => <option key={slot.id} value={slot.id} disabled={!acceptingOrders || slot.capacity === 0}>
      {formatOrderWindow(slot.startsAt, slot.endsAt, slot.timeZone ?? (slot.endsAt ? store?.timeZone : undefined))}{slot.capacity === 0 ? " · Al completo" : ""}
    </option>)}
  </select></label>;
}
