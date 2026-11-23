import { createDefaultWeeklyOrderSchedule } from "@pizzaos/domain";
import type { IndividualOrder, IndividualSlot, IndividualStore, WeeklyOrderSchedule } from "@pizzaos/domain";
import type { OrderingState } from "./ordering-contract";

const dayMs = 86_400_000;
const minuteMs = 60_000;

function orderDateFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
}

function wallTime(instant: number, formatter: Intl.DateTimeFormat) {
  const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00.000Z`;
}

function localDay(instant: number, formatter: Intl.DateTimeFormat) {
  return wallTime(instant, formatter).slice(0, 10);
}

function dateKey(day: number) {
  return new Date(day).toISOString().slice(0, 10);
}

function midnight(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function weekday(day: number) {
  return new Date(day).getUTCDay() || 7;
}

export function normalizeOrderSchedule(value: WeeklyOrderSchedule): WeeklyOrderSchedule | undefined {
  if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.days) || value.days.length !== 7) return;
  const days = [...value.days].sort((a, b) => (a?.weekday ?? 0) - (b?.weekday ?? 0));
  const normalized = [];
  for (const [index, day] of days.entries()) {
    if (!day || day.weekday !== index + 1 || !Array.isArray(day.windows) || day.windows.length > 1440) return;
    const windows = [...day.windows].sort((a, b) => (a?.startMinute ?? -1) - (b?.startMinute ?? -1));
    let previousEnd = 0;
    for (const window of windows) {
      if (!window || !Number.isInteger(window.startMinute) || !Number.isInteger(window.endMinute) ||
        !Number.isInteger(window.capacity) || window.startMinute < previousEnd || window.endMinute <= window.startMinute ||
        window.endMinute > 1440 || window.capacity < 0 || window.capacity > 10000) return;
      previousEnd = window.endMinute;
    }
    normalized.push({ weekday: day.weekday, windows: windows.map(({ startMinute, endMinute, capacity }) => ({ startMinute, endMinute, capacity })) });
  }
  return { revision: value.revision, days: normalized };
}

function daySlots(schedule: WeeklyOrderSchedule, day: number, formatter: Intl.DateTimeFormat): IndividualSlot[] {
  const windows = schedule.days[weekday(day) - 1]?.windows ?? [];
  if (windows.length === 0) return [];
  // Candidate offsets span both sides of a local clock change, even outside Europe.
  const offsets = [...new Set([day - dayMs, day, day + dayMs, day + 2 * dayMs]
    .map(sample => Date.parse(wallTime(sample, formatter)) - sample))];
  const timeZone = formatter.resolvedOptions().timeZone;
  const bounds = new Map<number, string | undefined>();
  function resolve(minute: number) {
    if (!bounds.has(minute)) {
      const local = day + minute * minuteMs;
      const iso = new Date(local).toISOString();
      const match = offsets.map(offset => local - offset)
        .filter(instant => wallTime(instant, formatter) === iso).sort((a, b) => a - b)[0];
      bounds.set(minute, match === undefined ? undefined : new Date(match).toISOString());
    }
    return bounds.get(minute);
  }
  return windows.flatMap(window => {
    const startsAt = resolve(window.startMinute);
    const endsAt = resolve(window.endMinute);
    if (!startsAt || !endsAt || endsAt <= startsAt) return [];
    return [{ id: `weekly-${startsAt}-${endsAt}`, startsAt, endsAt, timeZone, capacity: window.capacity }];
  });
}

export function activateOrderCalendar(state: OrderingState, store: IndividualStore, instant: number, occupied: IndividualOrder[]) {
  if (store.orderSchedule) return;
  const formatter = orderDateFormatter(store.timeZone ?? "Europe/Rome");
  const today = localDay(instant, formatter);
  const booked = new Set(occupied.map(order => localDay(Date.parse(order.quote.slotStartsAt), formatter)));
  const protectedDates: Record<string, IndividualSlot[]> = {};
  for (const slot of store.slots) {
    const date = localDay(Date.parse(slot.startsAt), formatter);
    if (date >= today && booked.has(date)) (protectedDates[date] ??= []).push(slot);
  }
  if (Object.keys(protectedDates).length) (state.protectedOrderCalendars ??= {})[store.id] = protectedDates;
  store.orderSchedule = createDefaultWeeklyOrderSchedule();
}

export function protectCalendarChanges(state: OrderingState, store: IndividualStore, next: IndividualStore, instant: number, occupied: IndividualOrder[]) {
  if (!store.orderSchedule || !next.orderSchedule) return;
  const zone = store.timeZone ?? "Europe/Rome";
  const formatter = orderDateFormatter(zone);
  const today = localDay(instant, formatter);
  const existing = state.protectedOrderCalendars?.[store.id] ?? {};
  const protectedDates = Object.fromEntries(Object.entries(existing).filter(([date]) => date >= today));
  const booked = new Set(occupied.map(order => localDay(Date.parse(order.quote.slotStartsAt), formatter)));
  for (const date of booked) {
    if (date < today || Object.hasOwn(protectedDates, date)) continue;
    const day = midnight(date);
    const index = weekday(day) - 1;
    if (zone === (next.timeZone ?? "Europe/Rome") &&
      JSON.stringify(store.orderSchedule.days[index]?.windows) === JSON.stringify(next.orderSchedule.days[index]?.windows)) continue;
    protectedDates[date] = daySlots(store.orderSchedule, day, formatter);
  }
  if (Object.keys(protectedDates).length) (state.protectedOrderCalendars ??= {})[store.id] = protectedDates;
  else if (state.protectedOrderCalendars) delete state.protectedOrderCalendars[store.id];
}

export function protectedOrderDates(state: OrderingState, store: IndividualStore, instant: number) {
  const today = localDay(instant, orderDateFormatter(store.timeZone ?? "Europe/Rome"));
  return Object.keys(state.protectedOrderCalendars?.[store.id] ?? {}).filter(date => date >= today).sort();
}

export function upcomingOrderSlots(state: OrderingState, store: IndividualStore, instant: number): IndividualSlot[] {
  const schedule = store.orderSchedule;
  let slots = store.slots;
  if (schedule) {
    const formatter = orderDateFormatter(store.timeZone ?? "Europe/Rome");
    const today = midnight(localDay(instant, formatter));
    const protectedDates = state.protectedOrderCalendars?.[store.id];
    slots = Array.from({ length: 14 }, (_, index) => {
      const day = today + index * dayMs;
      return protectedDates?.[dateKey(day)] ?? daySlots(schedule, day, formatter);
    }).flat();
  }
  return slots.filter(slot => Date.parse(slot.endsAt ?? slot.startsAt) > instant)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id));
}
