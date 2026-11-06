-- Durable pilot state. Existing POC tables retained for migration safety.
create table if not exists individual_ordering_state (
  id integer primary key check (id = 1), snapshot jsonb not null,
  updated_at timestamptz not null default now()
);
-- Auth.js PostgreSQL adapter; identity persistence belongs to this service.
create table if not exists users (
  id serial primary key, name varchar(255), email varchar(255) unique,
  "emailVerified" timestamptz, image text
);
create unique index if not exists users_normalized_email on users (lower(email));
create table if not exists accounts (
  id serial primary key, "userId" integer not null references users(id) on delete cascade,
  type varchar(255) not null, provider varchar(255) not null,
  "providerAccountId" varchar(255) not null, refresh_token text, access_token text,
  expires_at bigint, id_token text, scope text, session_state text, token_type text,
  unique(provider, "providerAccountId")
);
create table if not exists sessions (
  id serial primary key, "userId" integer not null references users(id) on delete cascade,
  expires timestamptz not null, "sessionToken" varchar(255) not null unique
);
create table if not exists verification_token (
  identifier text not null, expires timestamptz not null, token text not null,
  primary key(identifier, token)
);
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
