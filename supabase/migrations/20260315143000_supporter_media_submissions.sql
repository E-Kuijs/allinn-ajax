create table if not exists public.supporter_media_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default 'Ajax Fan',
  username text not null default '',
  contact_email text,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  note text,
  storage_bucket text not null default 'supporter-media-submissions',
  storage_path text not null unique,
  mime_type text,
  original_file_name text,
  file_size_bytes bigint,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists supporter_media_submissions_user_id_idx
  on public.supporter_media_submissions (user_id, created_at desc);

create index if not exists supporter_media_submissions_status_idx
  on public.supporter_media_submissions (status, created_at desc);

alter table public.supporter_media_submissions enable row level security;

drop policy if exists "supporter_media_submissions_self_select" on public.supporter_media_submissions;
create policy "supporter_media_submissions_self_select"
  on public.supporter_media_submissions
  for select
  using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "supporter_media_submissions_self_insert" on public.supporter_media_submissions;
create policy "supporter_media_submissions_self_insert"
  on public.supporter_media_submissions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "supporter_media_submissions_admin_update" on public.supporter_media_submissions;
create policy "supporter_media_submissions_admin_update"
  on public.supporter_media_submissions
  for update
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supporter-media-submissions',
  'supporter-media-submissions',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "supporter_media_storage_insert" on storage.objects;
create policy "supporter_media_storage_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'supporter-media-submissions'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "supporter_media_storage_select" on storage.objects;
create policy "supporter_media_storage_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'supporter-media-submissions'
    and (
      public.current_user_is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "supporter_media_storage_delete" on storage.objects;
create policy "supporter_media_storage_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'supporter-media-submissions'
    and (
      public.current_user_is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
