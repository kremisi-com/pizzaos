import cors from "@fastify/cors";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import Stripe from "stripe";

const databaseUrl = process.env.DATABASE_URL;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!databaseUrl || !stripeKey) throw new Error("DATABASE_URL e STRIPE_SECRET_KEY sono obbligatori.");

const db = new Pool({ connectionString: databaseUrl });
const stripe = new Stripe(stripeKey);
const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.CLIENT_ORIGIN ?? false });

interface CreateCheckoutBody {
  readonly customerId: string;
  readonly totalCents: number;
  readonly currency: "EUR";
  readonly payment: { readonly method: "card"; readonly paymentMethodId: string } | { readonly method: "cash" };
  readonly orderPayload: Record<string, unknown>;
}

app.post<{ Body: CreateCheckoutBody }>("/v1/checkouts", async (request, reply) => {
  const key = request.headers["idempotency-key"];
  if (typeof key !== "string" || !key) return reply.code(400).send({ message: "Idempotency-Key obbligatoria." });
  const body = request.body;
  const client = await db.connect();
  try {
    await client.query("begin");
    const previous = await client.query("select response from checkout_idempotency where customer_id = $1 and idempotency_key = $2", [body.customerId, key]);
    if (previous.rowCount) { await client.query("commit"); return previous.rows[0].response; }
    const orderId = randomUUID();
    const paymentId = randomUUID();
    const now = new Date().toISOString();
    let intent: Stripe.PaymentIntent | undefined;
    if (body.payment.method === "card") {
      intent = await stripe.paymentIntents.create({ amount: body.totalCents, currency: body.currency.toLowerCase(), payment_method: body.payment.paymentMethodId, confirmation_method: "manual", confirm: false }, { idempotencyKey: key });
    }
    const paymentStatus = body.payment.method === "cash" ? "cash_due" : "processing";
    const orderStatus = body.payment.method === "cash" ? "confirmed" : "pending_payment";
    const response = { order: { id: orderId, status: orderStatus, ...body.orderPayload }, payment: { id: paymentId, orderId, idempotencyKey: key, provider: body.payment.method === "cash" ? "cash" : "stripe", providerPaymentIntentId: intent?.id, status: paymentStatus, summary: { method: body.payment.method }, createdAtIso: now, updatedAtIso: now }, paymentClientSecret: intent?.client_secret };
    await client.query("insert into checkout_orders (id, customer_id, status, total_cents, payload) values ($1,$2,$3,$4,$5)", [orderId, body.customerId, orderStatus, body.totalCents, JSON.stringify(body.orderPayload)]);
    await client.query("insert into payment_attempts (id, order_id, idempotency_key, provider, provider_intent_id, status, summary) values ($1,$2,$3,$4,$5,$6,$7)", [paymentId, orderId, key, body.payment.method === "cash" ? "cash" : "stripe", intent?.id, paymentStatus, JSON.stringify({ method: body.payment.method })]);
    await client.query("insert into checkout_idempotency (customer_id, idempotency_key, response) values ($1,$2,$3)", [body.customerId, key, JSON.stringify(response)]);
    await client.query("commit");
    return response;
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.get<{ Params: { orderId: string } }>("/v1/checkouts/:orderId", async (request, reply) => {
  const result = await db.query("select o.*, p.id as payment_id, p.status as payment_status, p.provider, p.provider_intent_id, p.summary from checkout_orders o join payment_attempts p on p.order_id = o.id where o.id = $1 order by p.created_at desc limit 1", [request.params.orderId]);
  if (!result.rowCount) return reply.code(404).send({ message: "Checkout non trovato." });
  const row = result.rows[0];
  if (row.provider === "stripe" && row.provider_intent_id) {
    const intent = await stripe.paymentIntents.retrieve(row.provider_intent_id);
    if (intent.status === "succeeded" && row.status !== "confirmed") await db.query("update checkout_orders set status = 'confirmed', updated_at = now() where id = $1", [row.id]);
  }
  return { order: { id: row.id, status: row.status, ...row.payload }, payment: { id: row.payment_id, orderId: row.id, provider: row.provider, providerPaymentIntentId: row.provider_intent_id, status: row.payment_status, summary: row.summary } };
});

/** Called after Stripe.js has completed a 3DS challenge; server retrieval remains authoritative. */
app.post<{ Params: { orderId: string } }>("/v1/checkouts/:orderId/reconcile", async (request, reply) => {
  const result = await db.query("select p.id, p.provider_intent_id from payment_attempts p where p.order_id = $1 order by p.created_at desc limit 1", [request.params.orderId]);
  if (!result.rowCount) return reply.code(404).send({ message: "Tentativo non trovato." });
  const payment = result.rows[0];
  if (!payment.provider_intent_id) return { status: "cash_due" };
  const intent = await stripe.paymentIntents.retrieve(payment.provider_intent_id);
  const status = intent.status === "succeeded" ? "succeeded" : intent.status === "requires_action" ? "requires_action" : intent.status === "requires_payment_method" ? "failed" : "processing";
  await db.query("update payment_attempts set status = $1, updated_at = now() where id = $2", [status, payment.id]);
  if (status === "succeeded") await db.query("update checkout_orders set status = 'confirmed', updated_at = now() where id = $1", [request.params.orderId]);
  return { status };
});

await app.listen({ port: Number(process.env.PORT ?? 3004), host: "127.0.0.1" });
