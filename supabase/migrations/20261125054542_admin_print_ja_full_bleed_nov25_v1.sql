begin;
create table private.overlay_admin_print_ja_full_bleed_nov25_v1 (
 reference_id text primary key check (reference_id in ('m6a-ja-025','m6a-ja-037','m6a-ja-039')),
 image_webp bytea not null check (octet_length(image_webp) between 64 and 2800000
  and substring(image_webp from 1 for 4)=decode('52494646','hex')
  and substring(image_webp from 9 for 4)=decode('57454250','hex')),
 source_image_sha256 text not null check (source_image_sha256 ~ '^[a-f0-9]{64}$'),
 asset_sha256 text not null check (asset_sha256=encode(sha256(image_webp),'hex')),
 active boolean not null default false
);
alter table private.overlay_admin_print_ja_full_bleed_nov25_v1 enable row level security;
revoke all on private.overlay_admin_print_ja_full_bleed_nov25_v1 from public,anon,authenticated,service_role;
create table private.overlay_admin_print_ja_full_bleed_nov25_chunks (
 reference_id text not null check (reference_id in ('m6a-ja-025','m6a-ja-037','m6a-ja-039')),
 chunk_index smallint not null check (chunk_index between 0 and 11),
 payload bytea not null check(octet_length(payload) between 1 and 480000),
 primary key(reference_id,chunk_index)
);
alter table private.overlay_admin_print_ja_full_bleed_nov25_chunks enable row level security;
revoke all on private.overlay_admin_print_ja_full_bleed_nov25_chunks from public,anon,authenticated,service_role;
create function public.admin_pikachu_ja_full_bleed_nov25_v1(p_reference_id text,p_image boolean)
returns table(reference_id text,image_webp_base64 text)
language sql stable security definer set search_path='' as $$
 select w.reference_id,case when p_image is true then pg_catalog.replace(pg_catalog.encode(w.image_webp,'base64'),pg_catalog.chr(10),'') else null end
 from private.overlay_admin_print_ja_full_bleed_nov25_v1 w
 where w.active and w.reference_id=p_reference_id
$$;
revoke all on function public.admin_pikachu_ja_full_bleed_nov25_v1(text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.admin_pikachu_ja_full_bleed_nov25_v1(text,boolean) to service_role;
commit;
