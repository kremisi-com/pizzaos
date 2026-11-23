/** Formats a calendar window in the venue's local time, or a legacy point in time. */
export function formatOrderWindow(startsAt: string, endsAt?: string, timeZone?: string, dateStyle: "short" | "long" = "short") {
  const start = new Date(startsAt);
  const date = new Intl.DateTimeFormat("it-IT", { dateStyle, timeStyle: "short", timeZone }).format(start);
  if (!endsAt) return date;
  const end = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(new Date(endsAt));
  return `${date}–${end}`;
}
