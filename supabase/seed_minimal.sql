-- ALL-INN AJAX minimal seed
-- Doel: alleen ontbrekende basisdata toevoegen zonder bestaande pricing/launch-config te overschrijven.
--
-- Gebruik:
--   supabase db push
--   psql "<JOUW_SUPABASE_DB_URL>" -f supabase/seed_minimal.sql

begin;

-- Zorg dat singleton rows bestaan, maar wijzig niets als ze al bestaan.
insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

insert into public.app_content (id) values (1)
on conflict (id) do nothing;

-- Vul alleen lege/null contentvelden met defaults.
update public.app_content
set
  welcome_title = coalesce(nullif(welcome_title, ''), 'Welkom bij ALL-INN AJAX'),
  welcome_text = coalesce(
    nullif(welcome_text, ''),
    'Het ultieme platform voor Ajax supporters. Nieuws, marktplaats, fan chat en wedstrijden op een plek.'
  ),
  welcome_info_link_url = coalesce(nullif(welcome_info_link_url, ''), ''),
  lottery_winner_name = coalesce(nullif(lottery_winner_name, ''), ''),
  lottery_winner_interview = coalesce(nullif(lottery_winner_interview, ''), ''),
  lottery_winner_photo_url = coalesce(nullif(lottery_winner_photo_url, ''), lottery_winner_photo_url),
  lottery_winner_video_url = coalesce(nullif(lottery_winner_video_url, ''), lottery_winner_video_url),
  terms_version = coalesce(nullif(terms_version, ''), 'v1.0.0'),
  terms_text = coalesce(
    nullif(terms_text, ''),
    'Door een account aan te maken ga je akkoord met de gebruiksvoorwaarden van ALL-INN AJAX en ALL-INN MEDIA.'
  ),
  webshop_fside_url = coalesce(nullif(webshop_fside_url, ''), 'https://f-side.nl/'),
  webshop_afca_url = coalesce(nullif(webshop_afca_url, ''), 'https://www.afca.nl/'),
  webshop_ajax_url = coalesce(nullif(webshop_ajax_url, ''), 'https://shop.ajax.nl/'),
  tune_in_url = coalesce(nullif(tune_in_url, ''), 'https://tunein.com/search/?query=ajax'),
  arena_map_url = coalesce(
    nullif(arena_map_url, ''),
    'https://maps.google.com/?q=Johan+Cruijff+ArenA'
  ),
  cafes_map_url = coalesce(
    nullif(cafes_map_url, ''),
    'https://maps.google.com/?q=cafes+near+Johan+Cruijff+ArenA'
  ),
  restaurants_map_url = coalesce(
    nullif(restaurants_map_url, ''),
    'https://maps.google.com/?q=restaurants+near+Johan+Cruijff+ArenA'
  ),
  stadium_route_url = coalesce(
    nullif(stadium_route_url, ''),
    'https://maps.google.com/?daddr=Johan+Cruijff+ArenA'
  ),
  updated_at = now()
where id = 1;

-- Plans alleen toevoegen als code nog niet bestaat (geen update).
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
  ('PREMIUM_MONTH', 'Premium maand', 1.49, 1, 0, false, true),
  ('PREMIUM_6M', 'Premium 6 maanden', 7.60, 6, 15, false, true),
  ('PREMIUM_12M', 'Premium 12 maanden', 14.30, 12, 20, false, true),
  ('PREMIUM_LIFETIME', 'Premium lifetime', 99.00, null, 30, true, true)
on conflict (code) do nothing;

-- Legal doc alleen toevoegen als versie nog niet bestaat.
insert into public.legal_documents (version, body, is_active)
values (
  'v1.0.0',
  'Je gebruikt ALL-INN AJAX op eigen verantwoordelijkheid. Beledigend gedrag, spam en misbruik zijn niet toegestaan. Berichten kunnen worden gemodereerd, geblokkeerd of verwijderd. Bij overtreding kunnen accounts worden beperkt of geblokkeerd. Door registratie ga je akkoord met verwerking van account- en gebruiksgegevens voor werking van de app.',
  true
)
on conflict (version) do nothing;

-- Basis scheldwoorden toevoegen als ze ontbreken.
insert into public.profanity_words (word, is_active)
values
  ('kanker', true),
  ('tering', true),
  ('tyfus', true),
  ('hoer', true),
  ('kut', true),
  ('lul', true),
  ('mongool', true)
on conflict (word) do nothing;

-- Baseline loterij milestone alleen toevoegen als nog niet aanwezig.
insert into public.lottery_milestones (target_paid_members, is_reached)
select 1000, false
where not exists (
  select 1
  from public.lottery_milestones
  where target_paid_members = 1000
);

commit;
