-- Ensure existing installations use the same free chat limit as app defaults.
alter table if exists public.app_settings
  alter column free_daily_chat_limit set default 15;

insert into public.app_settings (id, free_daily_chat_limit)
values (1, 8)
on conflict (id) do update
set free_daily_chat_limit = excluded.free_daily_chat_limit,
    updated_at = now();
