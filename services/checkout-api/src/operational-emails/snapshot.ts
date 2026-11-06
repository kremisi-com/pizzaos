import type { IndividualOrder } from "@pizzaos/domain";
const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
export interface RefundSnapshot { amountCents: number; scope: "Pagamento iniziale" | "Aggiunta"; }
export function emailText(order: IndividualOrder, title: string, date: string, timeZone: string, refund?: RefundSnapshot): string {
  const gross = order.quote.promotions?.originalSubtotalCents ?? order.quote.subtotalCents;
  const localDate = (value: string) => `${new Intl.DateTimeFormat("it-IT", { timeZone, dateStyle: "long", timeStyle: "short" }).format(new Date(value))} (${timeZone})`;
  const lines = [title, `Ordine ${order.id}`, `Data evento: ${localDate(date)}`, `Cliente: ${order.contact.name}`,
    `Modalità: ${order.cart.mode === "pickup" ? "Ritiro in sede" : "Consegna a domicilio"}`, `Orario: ${localDate(order.quote.slotStartsAt)}`,
    ...order.quote.lines.map(line => `${line.quantity} × ${line.name} — ${money(line.unitCents * line.quantity)}${line.notes ? `\nNote prodotto / partecipante: ${line.notes}` : ""}`),
    `Subtotale lordo prodotti: ${money(gross)}`];
  if (order.quote.promotions) {
    for (const coupon of order.quote.promotions.coupons) lines.push(`Coupon ${coupon.code}: −${money(coupon.discountCents)}`);
    if (order.quote.promotions.rewardDiscountCents) lines.push(`Premio fedeltà (${order.quote.promotions.redeemedPoints} punti): −${money(order.quote.promotions.rewardDiscountCents)}`);
    lines.push(`Sconti totali: ${money(order.quote.promotions.discountCents)}`);
  }
  lines.push(`Subtotale netto prodotti: ${money(order.quote.subtotalCents)}`, `Consegna: ${money(order.quote.deliveryCents)}`, `Totale netto: ${money(order.quote.totalCents)}`);
  if (refund) lines.push(`Importo rimborso — ${refund.scope}: ${money(refund.amountCents)}`);
  if (order.cart.address) lines.push(`Indirizzo: ${order.cart.address.text}`);
  if (order.notes) lines.push(`Note ordine: ${order.notes}`);
  if (order.status === "cancelled" || title.startsWith("Rimborso")) lines.push("Gli eventuali rimborsi seguono lo stato del pagamento: l'accredito non è immediato e dipende dai tempi del gestore.");
  lines.push("Consulta l'app PizzaOS per lo stato aggiornato del tuo ordine.");
  return lines.join("\n");
}
