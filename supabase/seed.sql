-- ALL-INN AJAX v1 seed defaults
-- Run after migrations:
--   supabase db push
--   psql "$SUPABASE_DB_URL" -f supabase/seed.sql

begin;

insert into public.app_settings (
  id,
  launch_date,
  launch_window_days,
  monthly_price_eur,
  discount_6m_pct,
  discount_12m_pct,
  discount_lifetime_pct,
  first_paid_member_limit,
  free_daily_chat_limit,
  score_popup_premium_only,
  marketplace_read_only_for_free
)
values (
  1,
  date '2026-03-06',
  14,
  3.24,
  15,
  20,
  30,
  500,
  5,
  true,
  true
)
on conflict (id) do update
set
  launch_date = excluded.launch_date,
  launch_window_days = excluded.launch_window_days,
  monthly_price_eur = excluded.monthly_price_eur,
  discount_6m_pct = excluded.discount_6m_pct,
  discount_12m_pct = excluded.discount_12m_pct,
  discount_lifetime_pct = excluded.discount_lifetime_pct,
  first_paid_member_limit = excluded.first_paid_member_limit,
  free_daily_chat_limit = excluded.free_daily_chat_limit,
  score_popup_premium_only = excluded.score_popup_premium_only,
  marketplace_read_only_for_free = excluded.marketplace_read_only_for_free,
  updated_at = now();

insert into public.app_content (
  id,
  welcome_title,
  welcome_text,
  welcome_banner_url,
  welcome_corner_image_url,
  terms_version,
  terms_text,
  webshop_fside_url,
  webshop_afca_url,
  webshop_ajax_url,
  tune_in_url,
  arena_map_url,
  cafes_map_url,
  restaurants_map_url,
  stadium_route_url
)
values (
  1,
  'Welkom bij ALL-INN AJAX',
  'Het ultieme platform voor Ajax supporters. Nieuws, marktplaats, fan chat en wedstrijden op een plek.',
  null,
  null,
  'v1.0.0',
  'Door een account aan te maken ga je akkoord met de gebruiksvoorwaarden van ALL-INN AJAX en ALL-INN MEDIA.',
  'https://f-side.nl/',
  'https://www.afca.nl/',
  'https://shop.ajax.nl/',
  'https://tunein.com/search/?query=ajax',
  'https://maps.google.com/?q=Johan+Cruijff+ArenA',
  'https://maps.google.com/?q=cafes+near+Johan+Cruijff+ArenA',
  'https://maps.google.com/?q=restaurants+near+Johan+Cruijff+ArenA',
  'https://maps.google.com/?daddr=Johan+Cruijff+ArenA'
)
on conflict (id) do update
set
  welcome_title = excluded.welcome_title,
  welcome_text = excluded.welcome_text,
  welcome_banner_url = excluded.welcome_banner_url,
  welcome_corner_image_url = excluded.welcome_corner_image_url,
  terms_version = excluded.terms_version,
  terms_text = excluded.terms_text,
  webshop_fside_url = excluded.webshop_fside_url,
  webshop_afca_url = excluded.webshop_afca_url,
  webshop_ajax_url = excluded.webshop_ajax_url,
  tune_in_url = excluded.tune_in_url,
  arena_map_url = excluded.arena_map_url,
  cafes_map_url = excluded.cafes_map_url,
  restaurants_map_url = excluded.restaurants_map_url,
  stadium_route_url = excluded.stadium_route_url,
  updated_at = now();

insert into public.subscription_plans (
  code,
  title,
  price_eur,
  duration_months,
  discount_pct,
  is_lifetime,
  is_active
)
values
  ('PREMIUM_MONTH', 'Premium maand', 3.24, 1, 0, false, true),
  ('PREMIUM_6M', 'Premium 6 maanden', 19.44, 6, 15, false, true),
  ('PREMIUM_12M', 'Premium 12 maanden', 38.88, 12, 20, false, true),
  ('PREMIUM_LIFETIME', 'Premium lifetime', 99.00, null, 30, true, true)
on conflict (code) do update
set
  title = excluded.title,
  price_eur = excluded.price_eur,
  duration_months = excluded.duration_months,
  discount_pct = excluded.discount_pct,
  is_lifetime = excluded.is_lifetime,
  is_active = excluded.is_active;

insert into public.legal_documents (
  version,
  body,
  is_active
)
values (
  'v1.0.0',
  'Je gebruikt ALL-INN AJAX op eigen verantwoordelijkheid. Beledigend gedrag, spam en misbruik zijn niet toegestaan. Berichten kunnen worden gemodereerd, geblokkeerd of verwijderd. Bij overtreding kunnen accounts worden beperkt of geblokkeerd. Door registratie ga je akkoord met verwerking van account- en gebruiksgegevens voor werking van de app.',
  true
)
on conflict (version) do update
set
  body = excluded.body,
  is_active = excluded.is_active;

insert into public.profanity_words (word, is_active)
values
  ('kanker', true),
  ('tering', true),
  ('tyfus', true),
  ('hoer', true),
  ('kut', true),
  ('lul', true),
  ('mongool', true)
on conflict (word) do update
set is_active = excluded.is_active;

insert into public.lottery_milestones (
  target_paid_members,
  is_reached
)
values (1000, false)
on conflict do nothing;

commit;
