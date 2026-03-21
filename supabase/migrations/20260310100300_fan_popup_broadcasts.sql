-- Fan popup-berichten naar alle andere gebruikers met anti-spam limiet (1 per 5 minuten).

create table if not exists public.fan_popup_broadcasts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.fan_popup_broadcasts enable row level security;

drop policy if exists "fan_popup_broadcasts_self_read" on public.fan_popup_broadcasts;
create policy "fan_popup_broadcasts_self_read"
on public.fan_popup_broadcasts
for select
using (auth.uid() = sender_id or public.current_user_is_admin());

drop policy if exists "fan_popup_broadcasts_self_insert" on public.fan_popup_broadcasts;
create policy "fan_popup_broadcasts_self_insert"
on public.fan_popup_broadcasts
for insert
with check (auth.uid() = sender_id);

create or replace function public.send_fan_popup_message(
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
  v_sent_count int := 0;
begin
  if v_sender_id is null then
    raise exception 'Niet ingelogd.';
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

  select created_at
  into v_last_created_at
  from public.fan_popup_broadcasts
  where sender_id = v_sender_id
  order by created_at desc
  limit 1;

  if v_last_created_at is not null and now() < v_last_created_at + interval '5 minutes' then
    v_wait_seconds := greatest(1, ceil(extract(epoch from ((v_last_created_at + interval '5 minutes') - now())))::int);
    raise exception 'Wacht nog % seconden voor een nieuwe popup.', v_wait_seconds;
  end if;

  insert into public.fan_popup_broadcasts (sender_id, sender_name, message)
  values (v_sender_id, v_sender_name, v_message);

  insert into public.notifications (user_id, type, title, body, is_read)
  select
    p.id,
    'fan_popup',
    'Supporters melding',
    format('%s: %s', v_sender_name, v_message),
    false
  from public.profiles p
  where p.id <> v_sender_id;

  get diagnostics v_sent_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'sent_count', v_sent_count
  );
end;
$$;

grant execute on function public.send_fan_popup_message(text, text) to authenticated;
