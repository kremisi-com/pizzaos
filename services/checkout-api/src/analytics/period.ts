import type { PilotAnalyticsQuery, PilotAnalyticsRange } from "@pizzaos/domain";
import { PilotAnalyticsError } from "./error";

const DAY_MS = 86_400_000;

function invalidPeriod(): never {
  throw new PilotAnalyticsError("invalid_input", "Intervallo delle statistiche non valido.");
}

function validateDate(value: string | undefined): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return invalidPeriod();
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value.startsWith("0000")) return invalidPeriod();
  return value;
}

function addDays(date: string, days: number): string {
  const shifted = new Date(Date.parse(`${date}T00:00:00.000Z`) + days * DAY_MS);
  const result = shifted.toISOString().split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) return invalidPeriod();
  return result;
}

/** Calendar boundaries, never a fixed 24-hour offset from a local midnight. */
export function analyticsRange(query: PilotAnalyticsQuery, timeZone: string, now: Date): PilotAnalyticsRange {
  if (!Number.isFinite(now.getTime())) return invalidPeriod();
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone, calendar: "gregory", numberingSystem: "latn", year: "numeric", month: "2-digit", day: "2-digit"
    });
  } catch {
    throw new PilotAnalyticsError("invalid_input", "Fuso orario della sede non valido.");
  }
  const localDate = (instant: number): string => {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
  };
  let fromDate: string;
  let throughDate: string;
  if (query.period === "custom") {
    fromDate = validateDate(query.fromDate);
    throughDate = validateDate(query.throughDate);
    if (fromDate > throughDate) return invalidPeriod();
  } else {
    const days = { today: 1, last_7_days: 7, last_30_days: 30 };
    if (!Object.hasOwn(days, query.period)) return invalidPeriod();
    throughDate = localDate(now.getTime());
    fromDate = addDays(throughDate, -(days[query.period] - 1));
  }
  const boundary = (date: string): string => {
    const approximate = Date.parse(`${date}T00:00:00.000Z`);
    let low = approximate - DAY_MS * 1.5;
    let high = approximate + DAY_MS * 1.5;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (localDate(middle) < date) low = middle + 1;
      else high = middle;
    }
    return new Date(low).toISOString();
  };
  return { timeZone, fromDate, throughDate, startsAt: boundary(fromDate), endsAt: boundary(addDays(throughDate, 1)) };
}
