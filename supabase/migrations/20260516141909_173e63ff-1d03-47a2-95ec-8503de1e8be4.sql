
drop policy if exists "capsules_select_public_unlocked" on public.capsules;
create policy "capsules_select_public" on public.capsules
  for select using (is_public = true);
