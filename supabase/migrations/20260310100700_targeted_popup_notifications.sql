-- Gerichte popup-meldingen door developer/admin naar 1 specifieke gebruiker.

create or replace function public.current_user_is_developer_or_admin()
returns boolean
language sql
stable
as $$
  select
    public.current_user_is_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'all.inn.media.contact@gmail.com',
      'edwin3771@gmail.com'
    );
$$;

grant execute on function public.current_user_is_developer_or_admin() to authenticated;

create or replace function public.admin_find_popup_users(
  p_query text,
  p_limit int default 20
)
returns table (
  user_id uuid,
  display_name text,
  username text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := lower(trim(coalesce(p_query, '')));
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if not public.current_user_is_developer_or_admin() then
    raise exception 'Niet toegestaan om gebruikers te zoeken.';
  end if;

  return query
  select
    p.id as user_id,
    coalesce(p.display_name, '') as display_name,
    coalesce(p.username, '') as username,
    coalesce(u.email, '') as email
  from public.profiles p
  join auth.users u on u.id = p.id
  where
    v_query = ''
    or lower(coalesce(p.display_name, '')) like ('%' || v_query || '%')
    or lower(coalesce(p.username, '')) like ('%' || v_query || '%')
    or lower(coalesce(u.email, '')) like ('%' || v_query || '%')
  order by coalesce(p.display_name, ''), coalesce(p.username, ''), coalesce(u.email, '')
  limit v_limit;
end;
$$;

grant execute on function public.admin_find_popup_users(text, int) to authenticated;

create or replace function public.admin_send_popup_notification(
  p_target_user uuid,
  p_title text,
  p_body text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_body text := trim(coalesce(p_body, ''));
begin
  if not public.current_user_is_developer_or_admin() then
    raise exception 'Niet toegestaan om popup te versturen.';
  end if;

  if p_target_user is null then
    raise exception 'Doelgebruiker ontbreekt.';
  end if;

  if v_title = '' then
    raise exception 'Titel is verplicht.';
  end if;

  insert into public.notifications (user_id, type, title, body, is_read)
  values (p_target_user, 'admin_popup', v_title, nullif(v_body, ''), false)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

grant execute on function public.admin_send_popup_notification(uuid, text, text) to authenticated;
