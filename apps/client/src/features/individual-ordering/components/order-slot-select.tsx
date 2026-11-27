"use client";

import { formatOrderWindow } from "@pizzaos/domain";
import type { IndividualStore } from "@pizzaos/domain";
import { useEffect, useId, useState } from "react";

export function OrderSlotSelect({ store, value, onChange, onFocus, detailed = false }: {
  store: IndividualStore | null;
  value: string | null;
  onChange: (value: string | null) => void;
  onFocus?: () => void;
  detailed?: boolean;
}) {
  const id = useId();
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
  const firstAvailable = upcoming.filter(slot => slot.capacity > 0).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  const groups = new Map<string, typeof upcoming>();
  if (detailed) for (const slot of upcoming) {
    const day = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: slot.timeZone ?? store?.timeZone ?? "Europe/Rome" }).format(new Date(slot.startsAt));
    groups.set(day, [...(groups.get(day) ?? []), slot]);
  }
  const option = (slot: (typeof upcoming)[number]) => <option key={slot.id} value={slot.id} disabled={!acceptingOrders || slot.capacity === 0}>
    {formatOrderWindow(slot.startsAt, slot.endsAt, slot.timeZone ?? (slot.endsAt ? store?.timeZone : undefined))}{slot.capacity === 0 ? " · Al completo" : ""}
  </option>;
  return <><label>Quando?<select aria-label="Quando?" value={value ?? ""} onFocus={onFocus} aria-describedby={detailed && !value ? `${id}-preview` : undefined}
    onChange={event => onChange(event.target.value || null)}>
    <option value="" disabled={!acceptingOrders || !upcoming.some(slot => slot.capacity > 0)}>Appena possibile</option>
    {value && !upcoming.some(slot => slot.id === value) && <option value={value} disabled>Fascia non più disponibile</option>}
    {detailed ? [...groups].map(([day, slots]) => <optgroup key={day} label={day}>{slots.map(option)}</optgroup>) : upcoming.map(option)}
  </select></label>{detailed && !value && <p id={`${id}-preview`} style={{ fontSize: ".82rem", lineHeight: 1.5, color: "var(--pizzaos-color-foreground-muted)" }}>
    {acceptingOrders && firstAvailable ? <>Prima fascia disponibile: {formatOrderWindow(firstAvailable.startsAt, firstAvailable.endsAt, firstAvailable.timeZone ?? store?.timeZone ?? "Europe/Rome")}. L&apos;orario sarà confermato nella verifica del totale.</>
      : "Non ci sono fasce disponibili. Aggiorna la disponibilità prima di confermare."}
  </p>}</>;
}
