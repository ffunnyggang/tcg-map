create table public.overlay_admin_card_references (
  id text primary key check (id ~ '^dogam-ko-[0-9A-HJKMNP-TV-Z]{26}$'),
  display_name text not null,
  card_number text not null,
  set_code text not null,
  set_name text,
  rarity text,
  variant text,
  illustrator text,
  source_language text not null check (source_language = 'ko'),
  source_url text not null unique,
  source_image_url text not null,
  image_path text not null unique,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz not null default now()
);

alter table public.overlay_admin_card_references enable row level security;
revoke all on public.overlay_admin_card_references from public, anon, authenticated;
grant select on public.overlay_admin_card_references to authenticated;
grant select, insert, update on public.overlay_admin_card_references to service_role;

create policy overlay_admin_card_references_select
  on public.overlay_admin_card_references for select to authenticated
  using ((select public.is_funypin_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('overlay-admin-card-references', 'overlay-admin-card-references', false, 5242880,
  array['image/png','image/webp','image/jpeg']);

create policy overlay_admin_card_reference_images_select
  on storage.objects for select to authenticated
  using (bucket_id = 'overlay-admin-card-references' and (select public.is_funypin_admin()));
