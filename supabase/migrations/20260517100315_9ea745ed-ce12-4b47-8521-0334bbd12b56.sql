
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

alter table public.capsules
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists capsules_share_token_idx on public.capsules(share_token);

create table if not exists public.capsule_reviews (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null,
  user_id uuid not null,
  rating int not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (capsule_id, user_id)
);

alter table public.capsule_reviews enable row level security;

create policy "reviews_select_all" on public.capsule_reviews for select using (true);
create policy "reviews_insert_own" on public.capsule_reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update_own" on public.capsule_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_delete_own" on public.capsule_reviews for delete using (auth.uid() = user_id);

drop trigger if exists capsule_reviews_updated on public.capsule_reviews;
create trigger capsule_reviews_updated
  before update on public.capsule_reviews
  for each row execute function public.update_updated_at_column();

create or replace function public.get_shared_capsule(p_id uuid, p_token uuid)
returns setof public.capsules
language sql stable security definer set search_path = public as $$
  select * from public.capsules where id = p_id and share_token = p_token
$$;

create or replace function public.get_shared_capsule_files(p_id uuid, p_token uuid)
returns setof public.capsule_files
language sql stable security definer set search_path = public as $$
  select f.* from public.capsule_files f
  join public.capsules c on c.id = f.capsule_id
  where c.id = p_id and c.share_token = p_token and c.unlock_time <= now()
$$;

grant execute on function public.get_shared_capsule(uuid, uuid) to anon, authenticated;
grant execute on function public.get_shared_capsule_files(uuid, uuid) to anon, authenticated;
