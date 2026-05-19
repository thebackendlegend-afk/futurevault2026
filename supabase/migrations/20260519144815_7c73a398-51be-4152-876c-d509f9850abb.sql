
-- USERNAME on profiles
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_unique on public.profiles (lower(username)) where username is not null;

-- DIRECT MESSAGES
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  recipient_id uuid not null,
  content text not null check (length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint dm_no_self check (sender_id <> recipient_id)
);

create index if not exists dm_pair_idx on public.direct_messages (least(sender_id,recipient_id), greatest(sender_id,recipient_id), created_at desc);
create index if not exists dm_recipient_idx on public.direct_messages (recipient_id, created_at desc);

alter table public.direct_messages enable row level security;

create policy "dm_select_participants" on public.direct_messages
for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "dm_insert_sender" on public.direct_messages
for insert with check (auth.uid() = sender_id);

create policy "dm_update_recipient_read" on public.direct_messages
for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create policy "dm_delete_sender" on public.direct_messages
for delete using (auth.uid() = sender_id);

alter publication supabase_realtime add table public.direct_messages;
