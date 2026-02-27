-- Subscription + credits system (Stripe-independent phase)

create table if not exists public.subscription_tiers (
  tier text primary key check (tier in ('low', 'mid', 'top')),
  modules_per_month integer not null check (modules_per_month > 0),
  monthly_price_cents integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.subscription_tiers (tier, modules_per_month, monthly_price_cents)
values
  ('low', 2, null),
  ('mid', 4, null),
  ('top', 8, null)
on conflict (tier) do update set
  modules_per_month = excluded.modules_per_month,
  monthly_price_cents = excluded.monthly_price_cents,
  is_active = true,
  updated_at = now();

create table if not exists public.parent_subscriptions (
  parent_id uuid primary key references auth.users(id) on delete cascade,
  tier text references public.subscription_tiers(tier),
  status text not null default 'inactive' check (status in ('inactive', 'active', 'past_due', 'canceled', 'paused', 'trialing')),
  current_period_start date,
  current_period_end date,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_credit_ledger (
  id bigserial primary key,
  parent_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  entry_type text not null check (entry_type in ('grant', 'adjustment', 'spend', 'refund', 'expire')),
  credits_delta integer not null,
  module_id uuid references public.modules(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists idx_subscription_credit_ledger_parent_period
  on public.subscription_credit_ledger(parent_id, period_start, period_end);

create table if not exists public.module_unlocks (
  id bigserial primary key,
  parent_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  unlock_source text not null default 'subscription_credit' check (unlock_source in ('subscription_credit', 'manual_admin', 'legacy_purchase')),
  credits_spent integer not null default 1 check (credits_spent >= 0),
  period_start date,
  period_end date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(parent_id, module_id, period_start, period_end)
);

create index if not exists idx_module_unlocks_parent_active
  on public.module_unlocks(parent_id, is_active, period_end);

-- Keep updated_at maintained for mutable tables
create or replace function public.set_updated_at_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_subscription_tiers_updated_at on public.subscription_tiers;
create trigger tr_subscription_tiers_updated_at
before update on public.subscription_tiers
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists tr_parent_subscriptions_updated_at on public.parent_subscriptions;
create trigger tr_parent_subscriptions_updated_at
before update on public.parent_subscriptions
for each row execute function public.set_updated_at_timestamp();

-- Enable RLS
alter table public.subscription_tiers enable row level security;
alter table public.parent_subscriptions enable row level security;
alter table public.subscription_credit_ledger enable row level security;
alter table public.module_unlocks enable row level security;

-- Policies: users can read their own subscription + ledger + unlocks
-- Note: CREATE POLICY does not support IF NOT EXISTS on all Postgres versions,
-- so we drop/recreate for idempotency.

drop policy if exists "Users can view active tiers" on public.subscription_tiers;
create policy "Users can view active tiers"
  on public.subscription_tiers
  for select
  using (is_active = true);

drop policy if exists "Users can view own subscription" on public.parent_subscriptions;
create policy "Users can view own subscription"
  on public.parent_subscriptions
  for select
  using (auth.uid() = parent_id);

drop policy if exists "Users can upsert own subscription (testing)" on public.parent_subscriptions;
create policy "Users can upsert own subscription (testing)"
  on public.parent_subscriptions
  for insert
  with check (auth.uid() = parent_id);

drop policy if exists "Users can update own subscription (testing)" on public.parent_subscriptions;
create policy "Users can update own subscription (testing)"
  on public.parent_subscriptions
  for update
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

drop policy if exists "Users can view own credit ledger" on public.subscription_credit_ledger;
create policy "Users can view own credit ledger"
  on public.subscription_credit_ledger
  for select
  using (auth.uid() = parent_id);

drop policy if exists "Users can view own module unlocks" on public.module_unlocks;
create policy "Users can view own module unlocks"
  on public.module_unlocks
  for select
  using (auth.uid() = parent_id);

-- Manual testing support: users can add positive credits for themselves.
drop policy if exists "Users can insert self credit adjustments" on public.subscription_credit_ledger;
create policy "Users can insert self credit adjustments"
  on public.subscription_credit_ledger
  for insert
  with check (
    auth.uid() = parent_id
    and entry_type in ('grant', 'adjustment', 'refund')
    and credits_delta > 0
  );

-- Credits summary per parent/period
create or replace view public.v_parent_credit_summary as
select
  l.parent_id,
  l.period_start,
  l.period_end,
  coalesce(sum(case when l.credits_delta > 0 then l.credits_delta else 0 end), 0) as credits_granted,
  abs(coalesce(sum(case when l.credits_delta < 0 then l.credits_delta else 0 end), 0)) as credits_used,
  coalesce(sum(l.credits_delta), 0) as credits_available
from public.subscription_credit_ledger l
group by l.parent_id, l.period_start, l.period_end;

grant select on public.v_parent_credit_summary to authenticated;

-- RPC: unlock a module with one credit for the active period
create or replace function public.unlock_module_with_credit(
  p_module_id uuid,
  p_period_start date default date_trunc('month', now())::date
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_parent_id uuid := auth.uid();
  v_period_start date := p_period_start;
  v_period_end date := (p_period_start + interval '1 month' - interval '1 day')::date;
  v_available integer;
  v_unlock_id bigint;
begin
  if v_parent_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1
    from public.module_unlocks mu
    where mu.parent_id = v_parent_id
      and mu.module_id = p_module_id
      and mu.is_active = true
      and mu.period_start = v_period_start
      and mu.period_end = v_period_end
  ) then
    return jsonb_build_object(
      'ok', true,
      'already_unlocked', true,
      'module_id', p_module_id,
      'period_start', v_period_start,
      'period_end', v_period_end
    );
  end if;

  select coalesce(sum(credits_delta), 0)
    into v_available
  from public.subscription_credit_ledger
  where parent_id = v_parent_id
    and period_start = v_period_start
    and period_end = v_period_end;

  if v_available < 1 then
    raise exception 'Not enough credits available for this period';
  end if;

  insert into public.module_unlocks (
    parent_id,
    module_id,
    unlock_source,
    credits_spent,
    period_start,
    period_end,
    is_active
  ) values (
    v_parent_id,
    p_module_id,
    'subscription_credit',
    1,
    v_period_start,
    v_period_end,
    true
  ) returning id into v_unlock_id;

  insert into public.subscription_credit_ledger (
    parent_id,
    period_start,
    period_end,
    entry_type,
    credits_delta,
    module_id,
    notes,
    created_by
  ) values (
    v_parent_id,
    v_period_start,
    v_period_end,
    'spend',
    -1,
    p_module_id,
    'Module unlock via credit spend',
    v_parent_id
  );

  return jsonb_build_object(
    'ok', true,
    'already_unlocked', false,
    'unlock_id', v_unlock_id,
    'module_id', p_module_id,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
end;