-- Security Advisor fixes:
-- 1. Enable RLS on internal runtime state table.
-- 2. Add a restrictive policy so the table is not policy-less under RLS.
-- 3. Pin search_path on functions flagged as mutable.

alter table public.push_runtime_state enable row level security;

drop policy if exists "push_runtime_state_admin_read" on public.push_runtime_state;

create policy "push_runtime_state_admin_read"
on public.push_runtime_state
for select
using (public.current_user_is_admin());

create or replace function public.touch_user_push_tokens_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select p.is_admin
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;
