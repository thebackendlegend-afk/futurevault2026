
-- notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null check (type in ('like','comment','unlock')),
  capsule_id uuid not null,
  actor_id uuid,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create unique index notifications_unlock_unique on public.notifications (user_id, capsule_id) where type = 'unlock';

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_insert_any" on public.notifications
  for insert with check (true);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);

-- trigger: like -> notify capsule owner
create or replace function public.notify_on_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; ttl text;
begin
  select user_id, title into owner, ttl from public.capsules where id = new.capsule_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, type, capsule_id, actor_id, message)
    values (owner, 'like', new.capsule_id, new.user_id, 'liked "' || coalesce(ttl,'your capsule') || '"');
  end if;
  return new;
end $$;
create trigger trg_notify_on_like
after insert on public.capsule_likes
for each row execute function public.notify_on_like();

-- trigger: comment -> notify capsule owner
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; ttl text;
begin
  select user_id, title into owner, ttl from public.capsules where id = new.capsule_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, type, capsule_id, actor_id, message)
    values (owner, 'comment', new.capsule_id, new.user_id, 'commented on "' || coalesce(ttl,'your capsule') || '"');
  end if;
  return new;
end $$;
create trigger trg_notify_on_comment
after insert on public.capsule_comments
for each row execute function public.notify_on_comment();

-- allow comment authors to update their own comments
create policy "comments_update_own_author" on public.capsule_comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
