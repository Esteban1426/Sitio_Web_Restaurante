-- Esquema base para "Restaurante DB"
-- Ejecuta este SQL en Supabase (SQL editor) una sola vez.

create extension if not exists pgcrypto;

-- ───────────────────────────────────────────────────────────────
-- Secuencias y helpers para numeración legible (PR-0001, FAC-0001…)
-- ───────────────────────────────────────────────────────────────

create sequence if not exists public.order_seq start 1;
create sequence if not exists public.invoice_seq start 1;
create sequence if not exists public.reservation_seq start 1;

create or replace function public.next_order_number()
returns text
language sql
as $$
  select 'PR-' || lpad(nextval('public.order_seq')::text, 4, '0');
$$;

create or replace function public.next_invoice_number()
returns text
language sql
as $$
  select 'FAC-' || lpad(nextval('public.invoice_seq')::text, 4, '0');
$$;

create or replace function public.next_reservation_number()
returns text
language sql
as $$
  select 'RES-' || lpad(nextval('public.reservation_seq')::text, 3, '0');
$$;

-- ───────────────────────────────────────────────────────────────
-- Tablas
-- ───────────────────────────────────────────────────────────────

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric not null check (price >= 0),
  category text not null default 'otros',
  image_url text not null default '',
  weight text,
  origin text,
  rating numeric not null default 0 check (rating >= 0 and rating <= 5),
  in_stock boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_featured_idx on public.products (featured) where featured = true;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  customer jsonb not null,
  items jsonb not null,
  subtotal numeric not null check (subtotal >= 0),
  tax numeric not null check (tax >= 0),
  delivery_fee numeric not null check (delivery_fee >= 0),
  total numeric not null check (total >= 0),
  status text not null default 'pendiente',
  delivery_method text not null,
  payment_method text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  tracking_id uuid,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_number text not null,
  customer jsonb not null,
  items jsonb not null,
  subtotal numeric not null check (subtotal >= 0),
  tax numeric not null check (tax >= 0),
  delivery_fee numeric not null check (delivery_fee >= 0),
  total numeric not null check (total >= 0),
  payment_method text not null,
  created_at timestamptz not null default now()
);

create index if not exists invoices_created_at_idx on public.invoices (created_at desc);
create index if not exists invoices_order_id_idx on public.invoices (order_id);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text unique,
  name text not null,
  email text not null,
  phone text not null,
  date text not null,
  time text not null,
  guests int not null check (guests > 0),
  occasion text not null default '',
  notes text not null default '',
  status text not null default 'confirmada',
  created_at timestamptz not null default now()
);

create index if not exists reservations_date_time_idx on public.reservations (date, time);

-- ───────────────────────────────────────────────────────────────
-- Triggers: order_number / invoice_number / reservation_number + updated_at
-- ───────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.orders_set_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.next_order_number();
  end if;
  if new.updated_at is null then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_number_trg on public.orders;
create trigger orders_set_number_trg
before insert on public.orders
for each row execute function public.orders_set_number();

create or replace function public.invoices_set_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := public.next_invoice_number();
  end if;
  if new.tracking_id is null then
    new.tracking_id := new.order_id;
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_set_number_trg on public.invoices;
create trigger invoices_set_number_trg
before insert on public.invoices
for each row execute function public.invoices_set_number();

create or replace function public.reservations_set_number()
returns trigger
language plpgsql
as $$
begin
  if new.reservation_number is null or new.reservation_number = '' then
    new.reservation_number := public.next_reservation_number();
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_set_number_trg on public.reservations;
create trigger reservations_set_number_trg
before insert on public.reservations
for each row execute function public.reservations_set_number();

-- ───────────────────────────────────────────────────────────────
-- RLS (mínimo viable)
-- Nota: ajusta políticas según tu caso (admin vs público).
-- ───────────────────────────────────────────────────────────────

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.invoices enable row level security;
alter table public.reservations enable row level security;

-- Público: ver productos
drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
on public.products for select
to anon, authenticated
using (true);

-- Solo autenticados: mutar productos
drop policy if exists "products_mutate_auth" on public.products;
create policy "products_mutate_auth"
on public.products for all
to authenticated
using (true)
with check (true);

-- Público: crear pedidos / reservas (cliente)
drop policy if exists "orders_insert_public" on public.orders;
create policy "orders_insert_public"
on public.orders for insert
to anon, authenticated
with check (true);

drop policy if exists "reservations_insert_public" on public.reservations;
create policy "reservations_insert_public"
on public.reservations for insert
to anon, authenticated
with check (true);

-- Público: ver pedidos por tracking (el ID es un UUID difícil de adivinar).
-- Si necesitas privacidad estricta, reemplaza esto por un esquema de tracking con token.
drop policy if exists "orders_select_public" on public.orders;
create policy "orders_select_public"
on public.orders for select
to anon, authenticated
using (true);

drop policy if exists "orders_update_auth" on public.orders;
create policy "orders_update_auth"
on public.orders for update
to authenticated
using (true)
with check (true);

drop policy if exists "invoices_select_auth" on public.invoices;
create policy "invoices_select_auth"
on public.invoices for select
to authenticated
using (true);

drop policy if exists "invoices_insert_auth" on public.invoices;
create policy "invoices_insert_auth"
on public.invoices for insert
to authenticated
with check (true);

drop policy if exists "reservations_select_auth" on public.reservations;
create policy "reservations_select_auth"
on public.reservations for select
to authenticated
using (true);

drop policy if exists "reservations_update_auth" on public.reservations;
create policy "reservations_update_auth"
on public.reservations for update
to authenticated
using (true)
with check (true);

