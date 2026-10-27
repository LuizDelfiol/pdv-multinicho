-- Espelho das tabelas locais (ver src/db/schema.ts) + RLS por dono (business_id = auth.uid()).
-- Rodar no SQL Editor do projeto Supabase (Dashboard > SQL Editor > New query).

create table if not exists products (
  id uuid primary key,
  business_id uuid not null references auth.users(id) on delete cascade,
  code text,
  name text not null,
  price_cents integer not null,
  stock numeric not null default 0,
  unit text not null default 'un',
  updated_at timestamptz not null,
  device_id text not null,
  deleted boolean not null default false
);

create table if not exists orders (
  id uuid primary key,
  business_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  total_cents integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  device_id text not null,
  deleted boolean not null default false
);
-- idempotente: roda sem erro mesmo se a tabela já existia antes desta coluna
alter table orders add column if not exists table_number text;
alter table orders add column if not exists staff_name text;

create table if not exists order_items (
  id uuid primary key,
  business_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null,
  product_id uuid not null,
  product_name text not null,
  quantity numeric not null,
  unit_price_cents integer not null,
  updated_at timestamptz not null,
  device_id text not null,
  deleted boolean not null default false
);

create table if not exists payments (
  id uuid primary key,
  business_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null,
  method text not null,
  amount_cents integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  device_id text not null,
  deleted boolean not null default false
);

create table if not exists cash_sessions (
  id uuid primary key,
  business_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  opening_amount_cents integer not null,
  counted_amount_cents integer,
  expected_amount_cents integer,
  opened_at timestamptz not null,
  closed_at timestamptz,
  updated_at timestamptz not null,
  device_id text not null,
  deleted boolean not null default false
);
alter table cash_sessions add column if not exists staff_name text;

create table if not exists cash_movements (
  id uuid primary key,
  business_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  type text not null,
  amount_cents integer not null,
  reason text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  device_id text not null,
  deleted boolean not null default false
);
alter table cash_movements add column if not exists staff_name text;

-- pin_hash NÃO entra aqui de propósito: PIN fica só local em cada terminal, nunca
-- sai pela rede. Um staff puxado via sync chega sem PIN nesse terminal até alguém
-- usar "Redefinir PIN" (ver src/features/config/ConfigPage.tsx, seção Equipe).
create table if not exists staff (
  id uuid primary key,
  business_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  updated_at timestamptz not null,
  device_id text not null,
  deleted boolean not null default false
);

create index if not exists idx_products_sync on products (business_id, updated_at);
create index if not exists idx_orders_sync on orders (business_id, updated_at);
create index if not exists idx_order_items_sync on order_items (business_id, updated_at);
create index if not exists idx_payments_sync on payments (business_id, updated_at);
create index if not exists idx_cash_sessions_sync on cash_sessions (business_id, updated_at);
create index if not exists idx_cash_movements_sync on cash_movements (business_id, updated_at);
create index if not exists idx_staff_sync on staff (business_id, updated_at);

alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table cash_sessions enable row level security;
alter table cash_movements enable row level security;
alter table staff enable row level security;

-- create policy não tem "if not exists" no Postgres — drop+create pra ser seguro rodar de novo
drop policy if exists "own rows" on products;
drop policy if exists "own rows" on orders;
drop policy if exists "own rows" on order_items;
drop policy if exists "own rows" on payments;
drop policy if exists "own rows" on cash_sessions;
drop policy if exists "own rows" on cash_movements;
drop policy if exists "own rows" on staff;

create policy "own rows" on products for all using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "own rows" on orders for all using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "own rows" on order_items for all using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "own rows" on payments for all using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "own rows" on cash_sessions for all using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "own rows" on cash_movements for all using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "own rows" on staff for all using (business_id = auth.uid()) with check (business_id = auth.uid());
