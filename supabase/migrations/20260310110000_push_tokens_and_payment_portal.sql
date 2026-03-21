-- Push tokens + payment portal URL for Welcome button

alter table public.app_content
  add column if not exists payment_portal_url text;

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null,
  device_key text not null,
  platform text not null default 'unknown',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_key)
);

create index if not exists user_push_tokens_user_id_idx on public.user_push_tokens (user_id);
create index if not exists user_push_tokens_enabled_idx on public.user_push_tokens (enabled);
create index if not exists user_push_tokens_token_idx on public.user_push_tokens (expo_push_token);

create table if not exists public.push_runtime_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_user_push_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_push_tokens_updated_at on public.user_push_tokens;
create trigger trg_user_push_tokens_updated_at
before update on public.user_push_tokens
for each row
execute function public.touch_user_push_tokens_updated_at();

alter table public.user_push_tokens enable row level security;

drop policy if exists "user_push_tokens_select_self" on public.user_push_tokens;
create policy "user_push_tokens_select_self"
on public.user_push_tokens
for select
using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "user_push_tokens_write_self" on public.user_push_tokens;
create policy "user_push_tokens_write_self"
on public.user_push_tokens
for all
using (auth.uid() = user_id or public.current_user_is_admin())
with check (auth.uid() = user_id or public.current_user_is_admin());

grant select, insert, update, delete on public.user_push_tokens to authenticated;

create or replace function public.upsert_push_token(
  p_expo_push_token text,
  p_device_key text,
  p_platform text default 'unknown',
  p_enabled boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := trim(coalesce(p_expo_push_token, ''));
  v_device_key text := trim(coalesce(p_device_key, ''));
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_token = '' then
    raise exception 'push_token_required';
  end if;

  if v_device_key = '' then
    v_device_key := v_token;
  end if;

  insert into public.user_push_tokens (user_id, expo_push_token, device_key, platform, enabled)
  values (v_user_id, v_token, v_device_key, coalesce(nullif(trim(p_platform), ''), 'unknown'), coalesce(p_enabled, true))
  on conflict (user_id, device_key)
  do update set
    expo_push_token = excluded.expo_push_token,
    platform = excluded.platform,
    enabled = excluded.enabled,
    updated_at = now();
end;
$$;

grant execute on function public.upsert_push_token(text, text, text, boolean) to authenticated;
