-- Verhoog premium prijs met EUR 0,25 per maand.
-- Van 2,99 naar 3,24. Doorwerking in 6m/12m plannen.

begin;

update public.app_settings
set
  monthly_price_eur = 3.24,
  updated_at = now()
where id = 1;

update public.subscription_plans
set price_eur = 3.24
where code = 'PREMIUM_MONTH';

update public.subscription_plans
set price_eur = 19.44
where code = 'PREMIUM_6M';

update public.subscription_plans
set price_eur = 38.88
where code = 'PREMIUM_12M';

commit;
