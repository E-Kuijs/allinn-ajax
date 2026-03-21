begin;

create table if not exists public.lottery_draws (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null unique references public.lottery_milestones (id) on delete cascade,
  target_paid_members int not null,
  winner_user_id uuid not null references auth.users (id) on delete restrict,
  winner_ticket_number int not null,
  participants_count int not null,
  drawn_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_lottery_draws_drawn_at on public.lottery_draws (drawn_at desc);
create index if not exists idx_lottery_draws_winner on public.lottery_draws (winner_user_id);

alter table public.lottery_draws enable row level security;

drop policy if exists "lottery_draws_read" on public.lottery_draws;
create policy "lottery_draws_read"
on public.lottery_draws
for select
using (true);

drop policy if exists "lottery_draws_admin_write" on public.lottery_draws;
create policy "lottery_draws_admin_write"
on public.lottery_draws
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create or replace function public.refresh_lottery_milestones_and_draw()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid_count int := 0;
  v_drawn_count int := 0;
  v_participants int := 0;
  v_winner uuid;
  v_ticket int := 0;
  v_milestone record;
begin
  select count(*)::int
  into v_paid_count
  from (
    select distinct m.user_id
    from public.memberships m
    where m.status in ('active', 'trial')
      and m.tier in ('PREMIUM_MONTH', 'PREMIUM_6M', 'PREMIUM_12M', 'PREMIUM_LIFETIME')
  ) paid_users;

  for v_milestone in
    select lm.id, lm.target_paid_members
    from public.lottery_milestones lm
    where coalesce(lm.is_reached, false) = false
      and lm.target_paid_members <= v_paid_count
    order by lm.target_paid_members asc
  loop
    insert into public.lottery_entries (user_id, milestone_id)
    select distinct m.user_id, v_milestone.id
    from public.memberships m
    where m.status in ('active', 'trial')
      and m.tier in ('PREMIUM_MONTH', 'PREMIUM_6M', 'PREMIUM_12M', 'PREMIUM_LIFETIME')
    on conflict (user_id, milestone_id) do nothing;

    select count(*)::int
    into v_participants
    from public.lottery_entries le
    where le.milestone_id = v_milestone.id;

    if v_participants > 0 then
      with pick as (
        select
          le.user_id,
          row_number() over (order by random(), le.user_id) as ticket_number
        from public.lottery_entries le
        where le.milestone_id = v_milestone.id
      )
      select p.user_id, p.ticket_number
      into v_winner, v_ticket
      from pick p
      limit 1;

      if v_winner is not null then
        insert into public.lottery_draws (
          milestone_id,
          target_paid_members,
          winner_user_id,
          winner_ticket_number,
          participants_count
        )
        values (
          v_milestone.id,
          v_milestone.target_paid_members,
          v_winner,
          v_ticket,
          v_participants
        )
        on conflict (milestone_id) do nothing;

        if found then
          v_drawn_count := v_drawn_count + 1;

          insert into public.notifications (user_id, type, title, body)
          values (
            v_winner,
            'lottery_win',
            'Gefeliciteerd, je hebt de loterij gewonnen!',
            format(
              'Je bent automatisch gekozen bij %s premium leden. Ticketnummer: %s.',
              v_milestone.target_paid_members,
              v_ticket
            )
          );
        end if;
      end if;
    end if;

    update public.lottery_milestones
    set
      is_reached = true,
      reached_at = coalesce(reached_at, now())
    where id = v_milestone.id;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'paid_members', v_paid_count,
    'new_draws', v_drawn_count
  );
end;
$$;

create or replace function public.memberships_after_change_refresh_lottery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_lottery_milestones_and_draw();
  return null;
end;
$$;

drop trigger if exists trg_memberships_refresh_lottery on public.memberships;
create trigger trg_memberships_refresh_lottery
after insert or update of tier, status on public.memberships
for each statement
execute function public.memberships_after_change_refresh_lottery();

grant execute on function public.refresh_lottery_milestones_and_draw() to authenticated;

select public.refresh_lottery_milestones_and_draw();

commit;

