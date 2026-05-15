
-- Avatars bucket
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars_user_insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_user_update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_user_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Public profile read (name + avatar)
create policy "profiles_select_public" on public.profiles for select using (true);
drop policy if exists "profiles_select_own" on public.profiles;

-- Likes
create table public.capsule_likes (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (capsule_id, user_id)
);
create index idx_capsule_likes_capsule on public.capsule_likes(capsule_id);
alter table public.capsule_likes enable row level security;

create policy "likes_select_public" on public.capsule_likes for select
  using (exists (select 1 from public.capsules c where c.id = capsule_id and (c.is_public = true or c.user_id = auth.uid())));
create policy "likes_insert_own" on public.capsule_likes for insert
  with check (auth.uid() = user_id and exists (select 1 from public.capsules c where c.id = capsule_id and c.is_public = true));
create policy "likes_delete_own" on public.capsule_likes for delete using (auth.uid() = user_id);

-- Comments
create table public.capsule_comments (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  user_id uuid not null,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_capsule_comments_capsule on public.capsule_comments(capsule_id, created_at desc);
alter table public.capsule_comments enable row level security;

create policy "comments_select_public" on public.capsule_comments for select
  using (exists (select 1 from public.capsules c where c.id = capsule_id and ((c.is_public = true and c.unlock_time <= now()) or c.user_id = auth.uid())));
create policy "comments_insert_own" on public.capsule_comments for insert
  with check (auth.uid() = user_id and exists (select 1 from public.capsules c where c.id = capsule_id and c.is_public = true and c.unlock_time <= now()));
create policy "comments_update_own" on public.capsule_comments for update using (auth.uid() = user_id);
create policy "comments_delete_own_or_owner" on public.capsule_comments for delete
  using (auth.uid() = user_id or exists (select 1 from public.capsules c where c.id = capsule_id and c.user_id = auth.uid()));

-- Follows
create table public.user_follows (
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index idx_follows_following on public.user_follows(following_id);
alter table public.user_follows enable row level security;

create policy "follows_select_public" on public.user_follows for select using (true);
create policy "follows_insert_own" on public.user_follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on public.user_follows for delete using (auth.uid() = follower_id);
