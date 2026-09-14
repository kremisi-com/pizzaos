create table if not exists checkout_orders (
  id text primary key, customer_id text not null, status text not null,
  total_cents integer not null, currency text not null default 'EUR', payload jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists payment_attempts (
  id text primary key, order_id text not null references checkout_orders(id),
  idempotency_key text not null, provider text not null, provider_intent_id text,
  status text not null, summary jsonb not null, failure_message text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (order_id, idempotency_key)
);
create table if not exists checkout_idempotency (
  customer_id text not null, idempotency_key text not null, response jsonb not null,
  created_at timestamptz not null default now(), primary key (customer_id, idempotency_key)
);
