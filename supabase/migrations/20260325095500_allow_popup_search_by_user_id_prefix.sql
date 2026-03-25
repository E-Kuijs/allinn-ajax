-- Maak popup-zoekfunctie robuuster: ook zoeken op (deel van) user-id.

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
  v_query_no_at text := replace(v_query, '@', '');
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
      or replace(lower(coalesce(p.username, '')), '@', '') like ('%' || v_query_no_at || '%')
      or lower(p.id::text) like (v_query || '%')
    )
  order by coalesce(p.display_name, ''), coalesce(p.username, '')
  limit v_limit;
end;
$$;

grant execute on function public.search_popup_users(text, int) to authenticated;

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
  v_query_no_at text := replace(v_query, '@', '');
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
    or replace(lower(coalesce(p.username, '')), '@', '') like ('%' || v_query_no_at || '%')
    or lower(coalesce(u.email, '')) like ('%' || v_query || '%')
    or lower(p.id::text) like (v_query || '%')
  order by coalesce(p.display_name, ''), coalesce(p.username, ''), coalesce(u.email, '')
  limit v_limit;
end;
$$;

grant execute on function public.admin_find_popup_users(text, int) to authenticated;
