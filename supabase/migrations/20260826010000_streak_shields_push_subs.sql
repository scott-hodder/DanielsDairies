-- Streak Shields: a star-shop item that protects a login streak for one
-- missed day (consumed automatically by the client streak logic).
alter table public.login_streaks
  add column if not exists shields integer not null default 0;

-- Web push subscriptions for the reminder loop (browser + installed PWA).
-- One row per browser endpoint; child_id records which child the reminder
-- copy should be about.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);

alter table public.push_subscriptions enable row level security;

create policy "push_subs_own" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated, service_role;
