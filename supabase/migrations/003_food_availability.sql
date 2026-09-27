create table if not exists public.food_availability (
  id              uuid default gen_random_uuid() primary key,
  food_id         integer not null unique,
  food_name       text not null,
  is_available    boolean default true,
  unavailable_until timestamptz,
  updated_at      timestamptz default now()
);
alter table public.food_availability enable row level security;
drop policy if exists "Anyone can view food availability" on public.food_availability;
create policy "Anyone can view food availability" on public.food_availability for select using (true);
