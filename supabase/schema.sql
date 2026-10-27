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

create index if not exists idx_products_sync on products (business_id, updated_at);
create index if not exists idx_orders_sync on orders (business_id, updated_at);
create index if not exists idx_order_items_sync on order_items (business_id, updated_at);
create index if not exists idx_payments_sync on payments (business_id, updated_at);

alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;

create policy "own rows" on products for all using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "own rows" on orders for all using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "own rows" on order_items for all using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "own rows" on payments for all using (business_id = auth.uid()) with check (business_id = auth.uid());
