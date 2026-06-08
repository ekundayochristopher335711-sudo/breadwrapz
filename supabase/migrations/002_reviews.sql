-- Reviews table — run in Supabase Dashboard → SQL Editor

create table if not exists public.reviews (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  user_name   text not null,
  rating      integer not null check (rating >= 1 and rating <= 5),
  comment     text not null,
  approved    boolean default false,
  created_at  timestamptz default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Anyone can view approved reviews" on public.reviews;
create policy "Anyone can view approved reviews"
  on public.reviews for select
  using (approved = true);

drop policy if exists "Users can view own reviews" on public.reviews;
create policy "Users can view own reviews"
  on public.reviews for select
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can insert reviews" on public.reviews;
create policy "Authenticated users can insert reviews"
  on public.reviews for insert
  to authenticated
  with check (auth.uid() = user_id);
