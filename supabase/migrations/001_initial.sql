-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run: uses IF NOT EXISTS and DROP IF EXISTS guards

-- ── Profiles table ───────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id   uuid references auth.users(id) on delete cascade primary key,
  name text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── Orders table ─────────────────────────────────────────────────────────────
create table if not exists public.orders (
  order_id           text primary key,
  reference          text unique,
  user_id            text,
  email              text,
  contact            text,
  customer_name      text,
  customer_phone     text,
  amount             numeric not null,
  items              jsonb not null default '[]',
  delivery_location  text,
  delivery_distance_km numeric,
  delivery_fee       numeric,
  status             text default 'Order Received',
  payment_verified   boolean default false,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists orders_reference_idx on public.orders(reference);
create index if not exists orders_user_id_idx on public.orders(user_id);

alter table public.orders enable row level security;

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid()::text = user_id);

-- ── Auto-create profile on signup ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
