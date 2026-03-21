
-- Gedeelde INFO TIFO / SUP HOME URL voor alle gebruikers
alter table public.app_content
add column if not exists welcome_info_link_url text;

update public.app_content
set welcome_info_link_url = coalesce(welcome_info_link_url, '')
where id = 1;

-- Sta developer-accounts toe om app_content te updaten (voor beheer-tab).
drop policy if exists "app_content_developer_write" on public.app_content;
create policy "app_content_developer_write"
on public.app_content
for update
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'all.inn.media.contact@gmail.com',
    'edwin3771@gmail.com'
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'all.inn.media.contact@gmail.com',
    'edwin3771@gmail.com'
  )
);
