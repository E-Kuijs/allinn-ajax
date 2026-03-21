begin;

-- Globale winnaarcontent in app_content (zichtbaar voor alle gebruikers)
alter table public.app_content
  add column if not exists lottery_winner_name text,
  add column if not exists lottery_winner_interview text,
  add column if not exists lottery_winner_photo_url text,
  add column if not exists lottery_winner_video_url text,
  add column if not exists lottery_winner_draw_id uuid references public.lottery_draws (id) on delete set null;

update public.app_content
set
  lottery_winner_name = coalesce(lottery_winner_name, ''),
  lottery_winner_interview = coalesce(lottery_winner_interview, ''),
  lottery_winner_photo_url = lottery_winner_photo_url,
  lottery_winner_video_url = lottery_winner_video_url,
  updated_at = now()
where id = 1;

-- Mailstatus op trekkingen, zodat elke trekking maximaal 1x gemaild wordt
alter table public.lottery_draws
  add column if not exists winner_email_sent_at timestamptz,
  add column if not exists winner_email_error text;

create or replace function public.sync_lottery_winner_to_app_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''))
  into v_name
  from public.profiles p
  where p.id = new.winner_user_id;

  if v_name is null then
    v_name := format('Gebruiker %s', left(new.winner_user_id::text, 8));
  end if;

  update public.app_content
  set
    lottery_winner_name = v_name,
    lottery_winner_draw_id = new.id,
    updated_at = now()
  where id = 1;

  return new;
end;
$$;

drop trigger if exists trg_sync_lottery_winner_to_app_content on public.lottery_draws;
create trigger trg_sync_lottery_winner_to_app_content
after insert on public.lottery_draws
for each row
execute function public.sync_lottery_winner_to_app_content();

-- Backfill met de laatste trekking (als die al bestaat)
with latest_draw as (
  select d.id, d.winner_user_id
  from public.lottery_draws d
  order by d.drawn_at desc
  limit 1
)
update public.app_content ac
set
  lottery_winner_name = coalesce(
    (
      select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''))
      from latest_draw ld
      left join public.profiles p on p.id = ld.winner_user_id
    ),
    ac.lottery_winner_name,
    ''
  ),
  lottery_winner_draw_id = (
    select ld.id
    from latest_draw ld
  ),
  updated_at = now()
where ac.id = 1
  and exists (select 1 from latest_draw);

commit;
