-- Zet de vaste ALL-INN AJAX prijs naar EUR 1,49.
update public.app_settings
set monthly_price_eur = 1.49,
    updated_at = now()
where id = 1;

update public.subscription_plans
set price_eur = 1.49,
    updated_at = now()
where code = 'PREMIUM_MONTH';

update public.subscription_plans
set price_eur = 7.60,
    updated_at = now()
where code = 'PREMIUM_6M';

update public.subscription_plans
set price_eur = 14.30,
    updated_at = now()
where code = 'PREMIUM_12M';
