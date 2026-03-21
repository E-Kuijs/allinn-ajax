-- Align free daily chat limit to 5 for both defaults and current installations.
alter table if exists public.app_settings
  alter column free_daily_chat_limit set default 5;

insert into public.app_settings (id, free_daily_chat_limit)
values (1, 5)
on conflict (id) do update
set free_daily_chat_limit = excluded.free_daily_chat_limit,
    updated_at = now();
