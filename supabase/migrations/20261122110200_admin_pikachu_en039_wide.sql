begin;
create schema if not exists private;
create table private.overlay_admin_print_import_wide_v1 (
  import_id uuid primary key references public.overlay_admin_print_imports(id) on delete restrict,
  reference_id text not null unique check (reference_id = '30th-en-039'),
  image_webp bytea not null check (
    octet_length(image_webp) between 64 and 12000000
    and substring(image_webp from 1 for 4) = decode('52494646','hex')
    and substring(image_webp from 9 for 4) = decode('57454250','hex')
  ),
  asset_sha256 text not null check (asset_sha256 = encode(sha256(image_webp),'hex')),
  filled_window boolean generated always as (
    reference_id = '30th-en-039'
  ) stored,
  active boolean not null default false
);
alter table private.overlay_admin_print_import_wide_v1 enable row level security;
revoke all on private.overlay_admin_print_import_wide_v1 from public, anon, authenticated, service_role;
create function public.admin_pikachu_wide_import_v1(p_import_id uuid, p_reference_id text)
returns table (image_webp_base64 text, filled_window boolean)
language sql stable security definer set search_path = '' as $$
  select replace(pg_catalog.encode(w.image_webp,'base64'),chr(10),''),w.filled_window
  from private.overlay_admin_print_import_wide_v1 w
  join public.overlay_admin_print_imports i on i.id=w.import_id and i.reference_id=w.reference_id
  where w.active and i.active and w.import_id=p_import_id and w.reference_id=p_reference_id
$$;
revoke all on function public.admin_pikachu_wide_import_v1(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_pikachu_wide_import_v1(uuid,text) to service_role;
create table private.overlay_admin_print_en039_upload (
  chunk_no integer primary key check (chunk_no between 0 and 15),
  chunk_data text not null check (length(chunk_data) between 1 and 1200000)
);
alter table private.overlay_admin_print_en039_upload enable row level security;
revoke all on private.overlay_admin_print_en039_upload from public, anon, authenticated, service_role;
commit;
