-- Ensure unlock_module_with_credit can write to module_unlocks/subscription_credit_ledger under RLS
-- by executing with definer privileges.

alter function public.unlock_module_with_credit(bigint, date)
  security definer
  set search_path = public;

revoke all on function public.unlock_module_with_credit(bigint, date) from public;
grant execute on function public.unlock_module_with_credit(bigint, date) to authenticated;
