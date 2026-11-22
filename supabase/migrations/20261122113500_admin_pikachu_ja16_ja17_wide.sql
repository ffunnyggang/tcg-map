begin;
create table private.overlay_admin_print_ja_wide_v1 (
  reference_id text primary key check (reference_id in ('m6a-ja-032','m6a-ja-033')),
  image_webp bytea not null check (octet_length(image_webp) between 64 and 12000000
   and substring(image_webp from 1 for 4)=decode('52494646','hex')
   and substring(image_webp from 9 for 4)=decode('57454250','hex')),
  asset_sha256 text not null check (asset_sha256=encode(sha256(image_webp),'hex')),
  active boolean not null default false
);
alter table private.overlay_admin_print_ja_wide_v1 enable row level security;
revoke all on private.overlay_admin_print_ja_wide_v1 from public, anon, authenticated, service_role;
create table private.overlay_admin_print_ja_wide_upload (
  reference_id text not null check (reference_id in ('m6a-ja-032','m6a-ja-033')),
  chunk_no integer not null check (chunk_no between 0 and 15),
  chunk_data text not null check (length(chunk_data) between 1 and 1200000),
  primary key(reference_id,chunk_no)
);
alter table private.overlay_admin_print_ja_wide_upload enable row level security;
revoke all on private.overlay_admin_print_ja_wide_upload from public, anon, authenticated, service_role;
create function public.admin_pikachu_ja_wide_v1(p_reference_id text,p_image boolean)
returns table(reference_id text,image_webp_base64 text)
language sql stable security definer set search_path='' as $$
 select w.reference_id, case when p_image is true then replace(pg_catalog.encode(w.image_webp,'base64'),chr(10),'') else null end
 from private.overlay_admin_print_ja_wide_v1 w
 where w.active and w.reference_id=p_reference_id
$$;
revoke all on function public.admin_pikachu_ja_wide_v1(text,boolean) from public, anon, authenticated;
grant execute on function public.admin_pikachu_ja_wide_v1(text,boolean) to service_role;
commit;
