-- ALL-INN AJAX v1 core schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Ajax Fan',
  username text not null default '@ajaxfan',
  about_me text not null default '',
  is_admin boolean not null default false,
  is_vip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tier text not null default 'FREE',
  status text not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  price_eur numeric(10, 2) not null,
  duration_months int,
  discount_pct int not null default 0,
  is_lifetime boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_code text not null,
  provider text not null default 'revenuecat',
  provider_event_id text,
  amount_eur numeric(10, 2) not null,
  currency text not null default 'EUR',
  purchased_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.vip_grants (
  id uuid primary key default gen_random_uuid(),
  granted_by uuid not null references auth.users (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  launch_date date not null default date '2026-03-06',
  launch_window_days int not null default 14,
  monthly_price_eur numeric(10, 2) not null default 2.99,
  discount_6m_pct int not null default 15,
  discount_12m_pct int not null default 20,
  discount_lifetime_pct int not null default 30,
  first_paid_member_limit int not null default 500,
  free_daily_chat_limit int not null default 15,
  score_popup_premium_only boolean not null default true,
  marketplace_read_only_for_free boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_content (
  id int primary key default 1 check (id = 1),
  welcome_title text not null default 'Welkom bij ALL-INN AJAX',
  welcome_text text not null default 'De plek voor echte Ajax fans.',
  welcome_banner_url text,
  welcome_corner_image_url text,
  terms_version text not null default 'v1.0.0',
  terms_text text not null default 'Door een account aan te maken ga je akkoord met de gebruiksvoorwaarden.',
  webshop_fside_url text not null default 'https://www.f-side.nl',
  webshop_afca_url text not null default 'https://www.afca.nl',
  webshop_ajax_url text not null default 'https://shop.ajax.nl',
  tune_in_url text not null default 'https://tunein.com',
  arena_map_url text not null default 'https://maps.google.com/?q=Johan+Cruijff+ArenA',
  cafes_map_url text not null default 'https://maps.google.com/?q=cafes+near+Johan+Cruijff+ArenA',
  restaurants_map_url text not null default 'https://maps.google.com/?q=restaurants+near+Johan+Cruijff+ArenA',
  stadium_route_url text not null default 'https://maps.google.com/?daddr=Johan+Cruijff+ArenA',
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  version text unique not null,
  body text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, terms_version)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id text not null default 'general',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  messages_sent int not null default 0,
  primary key (user_id, usage_date)
);

create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.profanity_words (
  id uuid primary key default gen_random_uuid(),
  word text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  price_eur numeric(10, 2) not null,
  category text,
  location text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.listing_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid references auth.users (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lottery_milestones (
  id uuid primary key default gen_random_uuid(),
  target_paid_members int not null default 1000,
  reached_at timestamptz,
  is_reached boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lottery_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  milestone_id uuid not null references public.lottery_milestones (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, milestone_id)
);

create table if not exists public.donation_ledger (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references public.purchases (id) on delete set null,
  amount_eur numeric(10, 2) not null,
  recipient text not null default 'F-SIDE SUPPORT',
  reason text,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.chat_send(p_group_id text, p_message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_message_id uuid;
  v_has_profanity boolean;
  v_is_vip boolean;
  v_tier text := 'FREE';
  v_launch_date date;
  v_window int;
  v_is_launch_window boolean;
  v_free_limit int;
  v_used int := 0;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select exists (
    select 1 from public.profanity_words w
    where w.is_active = true and lower(p_message) like '%' || lower(w.word) || '%'
  ) into v_has_profanity;

  if v_has_profanity then
    raise exception 'profanity_blocked';
  end if;

  select is_vip into v_is_vip from public.profiles where id = v_user;

  select coalesce(m.tier, 'FREE') into v_tier
  from public.memberships m
  where m.user_id = v_user and m.status in ('active', 'trial')
  order by m.created_at desc
  limit 1;

  select launch_date, launch_window_days, free_daily_chat_limit
  into v_launch_date, v_window, v_free_limit
  from public.app_settings
  where id = 1;

  v_is_launch_window := current_date >= v_launch_date and current_date < (v_launch_date + v_window);

  if not v_is_launch_window and coalesce(v_is_vip, false) = false and coalesce(v_tier, 'FREE') = 'FREE' then
    select coalesce(messages_sent, 0) into v_used
    from public.chat_daily_usage
    where user_id = v_user and usage_date = current_date;

    if v_used >= v_free_limit then
      raise exception 'free_chat_limit_reached';
    end if;

    insert into public.chat_daily_usage (user_id, usage_date, messages_sent)
    values (v_user, current_date, v_used + 1)
    on conflict (user_id, usage_date)
    do update set messages_sent = excluded.messages_sent;
  end if;

  insert into public.chat_messages (user_id, group_id, message)
  values (v_user, coalesce(nullif(p_group_id, ''), 'general'), p_message)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.listing_message_send(
  p_listing_id text,
  p_message text,
  p_recipient_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_message_id uuid;
  v_is_vip boolean;
  v_tier text := 'FREE';
  v_launch_date date;
  v_window int;
  v_marketplace_read_only boolean;
  v_is_launch_window boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select is_vip into v_is_vip from public.profiles where id = v_user;

  select coalesce(m.tier, 'FREE') into v_tier
  from public.memberships m
  where m.user_id = v_user and m.status in ('active', 'trial')
  order by m.created_at desc
  limit 1;

  select launch_date, launch_window_days, marketplace_read_only_for_free
  into v_launch_date, v_window, v_marketplace_read_only
  from public.app_settings
  where id = 1;

  v_is_launch_window := current_date >= v_launch_date and current_date < (v_launch_date + v_window);

  if not v_is_launch_window and coalesce(v_is_vip, false) = false and coalesce(v_tier, 'FREE') = 'FREE' and v_marketplace_read_only = true then
    raise exception 'marketplace_read_only_for_free';
  end if;

  insert into public.listing_messages (listing_id, sender_id, recipient_id, message)
  values (p_listing_id, v_user, p_recipient_id, p_message)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.admin_grant_vip(p_target_user uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.current_user_is_admin() then
    raise exception 'admin_only';
  end if;

  update public.profiles set is_vip = true where id = p_target_user;

  insert into public.memberships (user_id, tier, status, source)
  values (p_target_user, 'VIP', 'active', 'manual_admin_grant');

  insert into public.vip_grants (granted_by, user_id, note)
  values (v_actor, p_target_user, p_note);
end;
$$;

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.purchases enable row level security;
alter table public.vip_grants enable row level security;
alter table public.app_settings enable row level security;
alter table public.app_content enable row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_daily_usage enable row level security;
alter table public.blocked_users enable row level security;
alter table public.profanity_words enable row level security;
alter table public.listings enable row level security;
alter table public.listing_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.lottery_milestones enable row level security;
alter table public.lottery_entries enable row level security;
alter table public.donation_ledger enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id or public.current_user_is_admin());
drop policy if exists "profiles_self_upsert" on public.profiles;
create policy "profiles_self_upsert" on public.profiles for all using (auth.uid() = id or public.current_user_is_admin()) with check (auth.uid() = id or public.current_user_is_admin());

drop policy if exists "memberships_self_select" on public.memberships;
create policy "memberships_self_select" on public.memberships for select using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "memberships_admin_write" on public.memberships;
create policy "memberships_admin_write" on public.memberships for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "subscription_plans_read" on public.subscription_plans;
create policy "subscription_plans_read" on public.subscription_plans for select using (true);

drop policy if exists "subscription_plans_admin_write" on public.subscription_plans;
create policy "subscription_plans_admin_write" on public.subscription_plans for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "purchases_self_select" on public.purchases;
create policy "purchases_self_select" on public.purchases for select using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "purchases_admin_write" on public.purchases;
create policy "purchases_admin_write" on public.purchases for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "vip_grants_select" on public.vip_grants;
create policy "vip_grants_select" on public.vip_grants for select using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "vip_grants_admin_write" on public.vip_grants;
create policy "vip_grants_admin_write" on public.vip_grants for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "app_settings_read" on public.app_settings;
create policy "app_settings_read" on public.app_settings for select using (true);

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write" on public.app_settings for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "app_content_read" on public.app_content;
create policy "app_content_read" on public.app_content for select using (true);

drop policy if exists "app_content_admin_write" on public.app_content;
create policy "app_content_admin_write" on public.app_content for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "legal_documents_read" on public.legal_documents;
create policy "legal_documents_read" on public.legal_documents for select using (true);

drop policy if exists "legal_documents_admin_write" on public.legal_documents;
create policy "legal_documents_admin_write" on public.legal_documents for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "legal_acceptances_self" on public.legal_acceptances;
create policy "legal_acceptances_self" on public.legal_acceptances for all using (auth.uid() = user_id or public.current_user_is_admin()) with check (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "chat_messages_read" on public.chat_messages;
create policy "chat_messages_read" on public.chat_messages for select using (auth.role() = 'authenticated');

drop policy if exists "chat_messages_insert_via_auth" on public.chat_messages;
create policy "chat_messages_insert_via_auth" on public.chat_messages for insert with check (auth.uid() = user_id);

drop policy if exists "chat_daily_usage_self" on public.chat_daily_usage;
create policy "chat_daily_usage_self" on public.chat_daily_usage for all using (auth.uid() = user_id or public.current_user_is_admin()) with check (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "blocked_users_self" on public.blocked_users;
create policy "blocked_users_self" on public.blocked_users for all using (auth.uid() = blocker_id or public.current_user_is_admin()) with check (auth.uid() = blocker_id or public.current_user_is_admin());

drop policy if exists "profanity_words_read" on public.profanity_words;
create policy "profanity_words_read" on public.profanity_words for select using (true);

drop policy if exists "profanity_words_admin_write" on public.profanity_words;
create policy "profanity_words_admin_write" on public.profanity_words for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "listings_read" on public.listings;
create policy "listings_read" on public.listings for select using (true);

drop policy if exists "listings_owner_or_admin" on public.listings;
create policy "listings_owner_or_admin" on public.listings for all using (auth.uid() = owner_id or public.current_user_is_admin()) with check (auth.uid() = owner_id or public.current_user_is_admin());

drop policy if exists "listing_messages_participant" on public.listing_messages;
create policy "listing_messages_participant" on public.listing_messages for all using (auth.uid() = sender_id or auth.uid() = recipient_id or public.current_user_is_admin()) with check (auth.uid() = sender_id or public.current_user_is_admin());

drop policy if exists "notifications_self" on public.notifications;
create policy "notifications_self" on public.notifications for all using (auth.uid() = user_id or public.current_user_is_admin()) with check (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "lottery_milestones_read" on public.lottery_milestones;
create policy "lottery_milestones_read" on public.lottery_milestones for select using (true);

drop policy if exists "lottery_milestones_admin_write" on public.lottery_milestones;
create policy "lottery_milestones_admin_write" on public.lottery_milestones for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "lottery_entries_self_read" on public.lottery_entries;
create policy "lottery_entries_self_read" on public.lottery_entries for select using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "lottery_entries_admin_write" on public.lottery_entries;
create policy "lottery_entries_admin_write" on public.lottery_entries for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "donation_ledger_read_admin" on public.donation_ledger;
create policy "donation_ledger_read_admin" on public.donation_ledger for select using (public.current_user_is_admin());

drop policy if exists "donation_ledger_write_admin" on public.donation_ledger;
create policy "donation_ledger_write_admin" on public.donation_ledger for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

insert into public.app_settings (id) values (1) on conflict (id) do nothing;
insert into public.app_content (id) values (1) on conflict (id) do nothing;

insert into public.subscription_plans (code, title, price_eur, duration_months, discount_pct, is_lifetime)
values
  ('PREMIUM_MONTH', 'Premium Maand', 2.99, 1, 0, false),
  ('PREMIUM_6M', 'Premium 6 maanden', 2.99 * 6, 6, 15, false),
  ('PREMIUM_12M', 'Premium 12 maanden', 2.99 * 12, 12, 20, false),
  ('PREMIUM_LIFETIME', 'Premium Lifetime', 99.00, null, 30, true)
on conflict (code) do nothing;

insert into public.legal_documents (version, body, is_active)
values ('v1.0.0', 'Door een account aan te maken ga je akkoord met de gebruiksvoorwaarden.', true)
on conflict (version) do nothing;

insert into public.profanity_words (word)
values ('kanker'), ('tering'), ('tyfus'), ('hoer'), ('kut'), ('lul'), ('mongool')
on conflict (word) do nothing;

insert into public.lottery_milestones (target_paid_members, is_reached)
values (1000, false)
on conflict do nothing;
