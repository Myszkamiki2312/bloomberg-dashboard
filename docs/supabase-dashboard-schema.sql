-- Bloomberg Dashboard cloud sync schema.
-- Run in the selected Supabase project's SQL Editor.

create table if not exists public.dashboard_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_states enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.dashboard_states to authenticated;

drop policy if exists "dashboard_states_select_own" on public.dashboard_states;
drop policy if exists "dashboard_states_insert_own" on public.dashboard_states;
drop policy if exists "dashboard_states_update_own" on public.dashboard_states;

create policy "dashboard_states_select_own"
  on public.dashboard_states for select
  to authenticated
  using (auth.uid() = user_id);

create policy "dashboard_states_insert_own"
  on public.dashboard_states for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "dashboard_states_update_own"
  on public.dashboard_states for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
