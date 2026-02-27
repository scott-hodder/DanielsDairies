-- Ensure unlock_module_with_credit can write to module_unlocks/subscription_credit_ledger under RLS
-- by executing with definer privileges.

alter function public.unlock_module_with_credit(uuid, date)
  security definer
  set search_path = public;

revoke all on function public.unlock_module_with_credit(uuid, date) from public;
grant execute on function public.unlock_module_with_credit(uuid, date) to authenticated;

-- Add INSERT policy for module_unlocks so users can unlock modules for themselves
create policy if not exists "Users can insert own module unlocks"
  on public.module_unlocks
  for insert
  with check (auth.uid() = parent_id);

-- Add INSERT policy for subscription_credit_ledger for usage entries (negative credits)
create policy if not exists "Users can insert usage entries"
  on public.subscription_credit_ledger
  for insert
  with check (
    auth.uid() = parent_id
    and entry_type = 'usage'
    and credits_delta < 0
  );
