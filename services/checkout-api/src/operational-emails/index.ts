import { createHash, randomUUID } from "node:crypto";
import type { IndividualActor, IndividualOrder, OperationalEmailDelivery, OperationalEmailErrorCode, OperationalEmailEvent } from "@pizzaos/domain";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { OrderingRepository, OrderingServiceOptions, OrderingState } from "../ordering-contract";
import { OrderingError } from "../ordering-service";
import { createPromotionsOrderingServices } from "../promotions";
import { emailText, type RefundSnapshot } from "./snapshot";
import { validFrom, validRecipient } from "./validation";
import type { OperationalEmailOptions, OperationalEmailService } from "./contract";
export type { OperationalEmailMessage, OperationalEmailSender, OperationalEmailOptions, OperationalEmailService } from "./contract";
export { createSmtpOperationalEmailSender, readOperationalEmailConfiguration } from "./smtp";
interface RecordEntry extends OperationalEmailDelivery {
  storeId: string; key: string; sequence: number; subject: string; text: string; messageId: string;
  claim: string | null; leaseUntil: string | null;
}
interface State extends OrderingState {
  operationalEmails?: { messages: RecordEntry[]; revisions: Record<string, number>; sequence: number };
}
const titles: Record<OperationalEmailEvent, string> = {
  received: "Ordine ricevuto", accepted: "Ordine accettato", ready: "Ordine pronto", out_for_delivery: "Ordine in consegna",
  cancelled: "Ordine annullato", refund_succeeded: "Rimborso completato", refund_failed: "Rimborso da verificare"
};
const errorMessages: Record<OperationalEmailErrorCode, string> = {
  smtp_unavailable: "Invio email temporaneamente non disponibile. Verrà riprovato automaticamente.",
  not_configured: "Invio email non configurato. Contatta il responsabile della configurazione.",
  recipient_not_allowed: "Il destinatario non è autorizzato dalla configurazione email corrente."
};
function data(state: State) { return state.operationalEmails ??= { messages: [], revisions: {}, sequence: 0 }; }
function revision(state: State, storeId: string) { const values = data(state).revisions; return Object.hasOwn(values, storeId) ? values[storeId] : 0; }
function changed(state: State, record: RecordEntry, date: string) { record.updatedAt = date; data(state).revisions[record.storeId] = revision(state, record.storeId) + 1; }
function enqueue(state: State, order: IndividualOrder, event: OperationalEmailEvent, scope: string, date: string, refund?: RefundSnapshot) {
  const outbox = data(state); const key = JSON.stringify([order.id, event, scope]);
  if (outbox.messages.some(record => record.key === key)) return;
  const hash = createHash("sha256").update(key).digest("hex");
  const record: RecordEntry = { id: `email-${hash}`, key, storeId: order.storeId, orderId: order.id, event,
    recipient: order.contact.email.trim().toLowerCase(), subject: `${titles[event]} · ${order.id}`, text: emailText(order, titles[event], date, state.stores[order.storeId].timeZone ?? "Europe/Rome", refund), messageId: `<${hash}@pizzaos.invalid>`,
    sequence: ++outbox.sequence, status: "pending", attempts: 0, createdAt: date, updatedAt: date, sentAt: null, nextAttemptAt: null, lastError: null, claim: null, leaseUntil: null };
  outbox.messages.push(record); changed(state, record, date);
}
function journal(state: State, previous: Map<string, IndividualOrder>, date: string) {
  for (const order of Object.values(state.orders)) {
    const old = previous.get(order.id);
    if (order.submittedAt && !old?.submittedAt) enqueue(state, order, "received", "", date);
    if (old?.status !== order.status) {
      if (order.status === "accepted") enqueue(state, order, "accepted", "", date);
      if (order.status === "ready" && order.cart.mode === "pickup") enqueue(state, order, "ready", "", date);
      if (order.status === "out_for_delivery" && order.cart.mode === "delivery") enqueue(state, order, "out_for_delivery", "", date);
      if (order.status === "cancelled") enqueue(state, order, "cancelled", "", date);
    }
    const charge = (current: { payment: string; providerIntentId: string | null; refundAttempt: number }, before: { payment: string; refundAttempt: number } | undefined, amount: number, scope: string) => {
      if (!before || !current.providerIntentId || amount <= 0 || current.refundAttempt <= 0
        || (before.payment === current.payment && before.refundAttempt === current.refundAttempt)) return;
      if (current.payment === "refunded" || current.payment === "refund_failed") enqueue(state, order, current.payment === "refunded" ? "refund_succeeded" : "refund_failed", `${scope}:${current.refundAttempt}`, date, { amountCents: amount, scope: scope === "base" ? "Pagamento iniziale" : "Aggiunta" });
    };
    charge(order, old, order.quote.totalCents - (order.additions ?? []).reduce((total, addition) => total + (addition.applied ? addition.deltaCents : 0), 0), "base");
    for (const addition of order.additions ?? []) charge(addition, old?.additions?.find(item => item.id === addition.id), addition.deltaCents, `addition:${addition.id}`);
  }
}
function bounded(value: number | undefined, fallback: number, max: number, name: string) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`Configurazione email non valida: ${name}`);
  return value;
}
/** All consumers share an outbox decorator in the canonical transaction. */
export function createOperationalEmailServices(options: OrderingServiceOptions & { email: OperationalEmailOptions }) {
  const now = options.now ?? (() => new Date()); const email = options.email;
  if (email.mode !== undefined && email.mode !== "test" && email.mode !== "live") throw new Error("Configurazione email non valida: mode");
  if (email.environment !== undefined && email.environment !== "test" && email.environment !== "production") throw new Error("Configurazione email non valida: environment");
  if (email.mode === "live" && email.environment !== "production") throw new Error("Configurazione email non valida: environment");
  const lease = bounded(email.leaseMs, 60_000, 3_600_000, "leaseMs");
  const base = bounded(email.retryBaseMs, 5000, 86_400_000, "retryBaseMs");
  const max = bounded(email.maxRetryMs, 900_000, 86_400_000, "maxRetryMs");
  const batch = bounded(email.batchSize, 10, 100, "batchSize");
  const decorated: OrderingRepository = { transact: work => options.repository.transact(async state => {
    const previous = new Map(Object.values(state.orders).map(order => [order.id, structuredClone(order)]));
    const result = await work(state); journal(state, previous, now().toISOString()); return result;
  }) };
  const services = createPromotionsOrderingServices({ ...options, repository: decorated });
  const repository = services.repository;
  const emails: OperationalEmailService = {
    list: (actor, storeId) => repository.transact(state => {
      if (!actor) throw new OrderingError("unauthorized", "Accedi per continuare.");
      if (typeof storeId !== "string" || !storeId || storeId.length > 200 || ["__proto__", "constructor", "prototype"].includes(storeId)) throw new OrderingError("invalid_input", "Controlla la sede richiesta.");
      if (!Object.hasOwn(state.stores, storeId)) throw new OrderingError("not_found", "Sede non trovata.");
      const normalized = actor.email.trim().toLowerCase();
      if (!options.superadminEmails.some(item => item.trim().toLowerCase() === normalized) && !state.memberships.some(item => item.storeId === storeId && item.email.trim().toLowerCase() === normalized)) throw new OrderingError("forbidden", "Non hai accesso a questa sede.");
      return { revision: revision(state, storeId), messages: data(state).messages.filter(record => record.storeId === storeId).sort((a, b) => a.sequence - b.sequence).map(({ id, orderId, event, recipient, status, attempts, createdAt, updatedAt, sentAt, nextAttemptAt, lastError }) => structuredClone({ id, orderId, event, recipient, status, attempts, createdAt, updatedAt, sentAt, nextAttemptAt, lastError })) };
    }),
    async dispatch() {
      const counts = { sent: 0, failed: 0, blocked: 0 }; const attempted = new Set<string>();
      for (let index = 0; index < batch; index++) {
        const record = await repository.transact(state => {
          const instant = now(); const date = instant.toISOString(); const blockedOrders = new Set<string>();
          for (const candidate of data(state).messages) {
            if (candidate.status === "sent") continue;
            if (blockedOrders.has(candidate.orderId)) continue;
            blockedOrders.add(candidate.orderId);
            if (attempted.has(candidate.id) || (candidate.nextAttemptAt && Date.parse(candidate.nextAttemptAt) > instant.getTime()) || (candidate.leaseUntil && Date.parse(candidate.leaseUntil) > instant.getTime())) continue;
            candidate.claim = randomUUID(); candidate.leaseUntil = new Date(instant.getTime() + lease).toISOString(); candidate.status = "sending"; candidate.attempts++; changed(state, candidate, date);
            return structuredClone(candidate);
          }
          return null;
        });
        if (!record) break; attempted.add(record.id);
        let error: OperationalEmailErrorCode | null = null;
        const recipients = new Set((email.testRecipients ?? []).map(value => value.trim().toLowerCase()).filter(value => validRecipient(value) && !value.includes("*")));
        if (!email.sender || !email.from || !validFrom(email.from)) error = "not_configured";
        else if (!validRecipient(record.recipient) || ((email.mode ?? "test") === "test" && !recipients.has(record.recipient))) error = "recipient_not_allowed";
        else {
          try { await email.sender.send({ to: record.recipient, from: email.from, messageId: record.messageId, subject: record.subject, text: record.text }); }
          catch { error = "smtp_unavailable"; }
        }
        const finalized = await repository.transact(state => {
          const current = data(state).messages.find(item => item.id === record.id);
          if (!current || current.claim !== record.claim) return false;
          const instant = now(); const date = instant.toISOString(); current.claim = null; current.leaseUntil = null;
          if (error) {
            current.status = error === "smtp_unavailable" ? "retrying" : "blocked";
            current.lastError = { code: error, message: errorMessages[error] };
            current.nextAttemptAt = new Date(instant.getTime() + Math.min(max, base * 2 ** Math.min(current.attempts - 1, 30))).toISOString();
          } else { current.status = "sent"; current.sentAt = date; current.lastError = null; current.nextAttemptAt = null; }
          changed(state, current, date); return true;
        });
        if (finalized) { if (!error) counts.sent++; else if (error === "smtp_unavailable") counts.failed++; else counts.blocked++; }
      }
      return counts;
    }
  };
  return { ...services, emails };
}
export function registerOperationalEmailRoutes(app: FastifyInstance, options: { emails: OperationalEmailService; authenticate: (request: FastifyRequest) => Promise<IndividualActor | null> }): void {
  app.get<{ Params: { id: string } }>("/v1/pilot/stores/:id/emails", {
    preValidation: async request => {
      if (Object.keys(request.query as Record<string, unknown>).length || request.body !== undefined) throw new OrderingError("invalid_input", "La richiesta non ammette dati aggiuntivi.");
    }
  }, async (request, reply) => {
    reply.header("cache-control", "no-store"); return options.emails.list(await options.authenticate(request), request.params.id);
  });
}
