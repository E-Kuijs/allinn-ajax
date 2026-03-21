begin;

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
  v_next_milestone_id uuid;
  v_next_target int;
  v_remaining int;
begin
  select count(*)::int
  into v_paid_count
  from (
    select distinct m.user_id
    from public.memberships m
    where m.status in ('active', 'trial')
      and m.tier in ('PREMIUM_MONTH', 'PREMIUM_6M', 'PREMIUM_12M', 'PREMIUM_LIFETIME')
  ) paid_users;

  -- Geef premium leden direct een lotnummer voor de eerstvolgende (nog niet bereikte) mijlpaal.
  select lm.id, lm.target_paid_members
  into v_next_milestone_id, v_next_target
  from public.lottery_milestones lm
  where coalesce(lm.is_reached, false) = false
  order by lm.target_paid_members asc
  limit 1;

  if v_next_milestone_id is not null then
    insert into public.lottery_entries (user_id, milestone_id)
    select distinct m.user_id, v_next_milestone_id
    from public.memberships m
    where m.status in ('active', 'trial')
      and m.tier in ('PREMIUM_MONTH', 'PREMIUM_6M', 'PREMIUM_12M', 'PREMIUM_LIFETIME')
    on conflict (user_id, milestone_id) do nothing;

    perform public.assign_lottery_ticket_numbers(v_next_milestone_id);
    v_remaining := greatest(coalesce(v_next_target, 0) - v_paid_count, 0);
  else
    v_remaining := 0;
  end if;

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

    perform public.assign_lottery_ticket_numbers(v_milestone.id);

    select count(*)::int
    into v_participants
    from public.lottery_entries le
    where le.milestone_id = v_milestone.id;

    if v_participants > 0 then
      select le.user_id, le.ticket_number
      into v_winner, v_ticket
      from public.lottery_entries le
      where le.milestone_id = v_milestone.id
      order by random()
      limit 1;

      if v_winner is not null and v_ticket is not null then
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
    'new_draws', v_drawn_count,
    'next_target_paid_members', v_next_target,
    'remaining_to_next_target', v_remaining
  );
end;
$$;

grant execute on function public.refresh_lottery_milestones_and_draw() to authenticated;

commit;

