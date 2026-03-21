-- 1-op-1 fan popup meldingen met anti-spam (max 1 per 5 minuten per zender).

create table if not exists public.fan_popup_direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid not null references auth.users (id) on delete cascade,
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.fan_popup_direct_messages enable row level security;

drop policy if exists "fan_popup_direct_messages_participant_read" on public.fan_popup_direct_messages;
create policy "fan_popup_direct_messages_participant_read"
on public.fan_popup_direct_messages
for select
using (
  auth.uid() = sender_id
  or auth.uid() = target_user_id
  or public.current_user_is_admin()
);

drop policy if exists "fan_popup_direct_messages_sender_insert" on public.fan_popup_direct_messages;
create policy "fan_popup_direct_messages_sender_insert"
on public.fan_popup_direct_messages
for insert
with check (auth.uid() = sender_id);

create or replace function public.search_popup_users(
  p_query text,
  p_limit int default 20
)
returns table (
  user_id uuid,
  display_name text,
  username text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := lower(trim(coalesce(p_query, '')));
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;

  return query
  select
    p.id as user_id,
    coalesce(p.display_name, '') as display_name,
    coalesce(p.username, '') as username
  from public.profiles p
  where
    p.id <> auth.uid()
    and (
      v_query = ''
      or lower(coalesce(p.display_name, '')) like ('%' || v_query || '%')
      or lower(coalesce(p.username, '')) like ('%' || v_query || '%')
    )
  order by coalesce(p.display_name, ''), coalesce(p.username, '')
  limit v_limit;
end;
$$;

grant execute on function public.search_popup_users(text, int) to authenticated;

create or replace function public.send_direct_popup_message(
  p_target_user uuid,
  p_sender_name text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_sender_name text := trim(coalesce(p_sender_name, ''));
  v_message text := trim(coalesce(p_message, ''));
  v_last_created_at timestamptz;
  v_wait_seconds int;
begin
  if v_sender_id is null then
    raise exception 'Niet ingelogd.';
  end if;

  if p_target_user is null then
    raise exception 'Doelgebruiker ontbreekt.';
  end if;

  if p_target_user = v_sender_id then
    raise exception 'Je kunt jezelf geen popup sturen.';
  end if;

  if not exists(select 1 from public.profiles where id = p_target_user) then
    raise exception 'Doelgebruiker bestaat niet.';
  end if;

  if v_sender_name = '' then
    raise exception 'Naam is verplicht.';
  end if;

  if v_message = '' then
    raise exception 'Bericht is verplicht.';
  end if;

  if char_length(v_sender_name) > 60 then
    raise exception 'Naam is te lang (max 60 tekens).';
  end if;

  if char_length(v_message) > 240 then
    raise exception 'Bericht is te lang (max 240 tekens).';
  end if;

  select max(created_at)
  into v_last_created_at
  from (
    select created_at from public.fan_popup_broadcasts where sender_id = v_sender_id
    union all
    select created_at from public.fan_popup_direct_messages where sender_id = v_sender_id
  ) q;

  if v_last_created_at is not null and now() < v_last_created_at + interval '5 minutes' then
    v_wait_seconds := greatest(1, ceil(extract(epoch from ((v_last_created_at + interval '5 minutes') - now())))::int);
    raise exception 'Wacht nog % seconden voor een nieuwe popup.', v_wait_seconds;
  end if;

  insert into public.fan_popup_direct_messages (sender_id, target_user_id, sender_name, message)
  values (v_sender_id, p_target_user, v_sender_name, v_message);

  insert into public.notifications (user_id, type, title, body, is_read)
  values (p_target_user, 'fan_popup', 'Supporters melding', format('%s: %s', v_sender_name, v_message), false);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.send_direct_popup_message(uuid, text, text) to authenticated;
