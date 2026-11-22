begin;
create table private.overlay_print_common_releases_v1 (
  release_id text primary key check (release_id ~ '^[a-z0-9-]{1,64}$'),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  active boolean not null default false
);
create unique index overlay_print_common_one_active_v1 on private.overlay_print_common_releases_v1(active) where active;
create table private.overlay_print_common_items_v1 (
  release_id text not null references private.overlay_print_common_releases_v1(release_id),
  reference_id text not null check (reference_id ~ '^m6a-ja-0(1[7-9]|[234][0-9])$' and reference_id <= 'm6a-ja-046'),
  placement jsonb not null,
  storage_object_id uuid,
  object_version text,
  object_etag text,
  object_size integer,
  image_webp bytea,
  asset_sha256 text,
  primary key(release_id,reference_id),
  check (placement->>'referenceId'=reference_id),
  check (
    (storage_object_id is not null and object_version is not null and object_etag is not null and object_size between 64 and 20971520 and image_webp is null and asset_sha256 is null)
    or
    (storage_object_id is null and object_version is null and object_etag is null and object_size is null and image_webp is not null and octet_length(image_webp) between 64 and 1500000 and asset_sha256 is not null and asset_sha256=encode(sha256(image_webp),'hex'))
  )
);
alter table private.overlay_print_common_releases_v1 enable row level security;
alter table private.overlay_print_common_items_v1 enable row level security;
revoke all on private.overlay_print_common_releases_v1,private.overlay_print_common_items_v1 from public,anon,authenticated,service_role;
create function public.overlay_print_common_asset_v1(p_reference_id text)
returns table(placement jsonb,storage_path text,object_etag text,image_webp_base64 text)
language sql stable security definer set search_path='' as $$
 select i.placement, o.name, i.object_etag,
  case when i.image_webp is not null then pg_catalog.replace(pg_catalog.encode(i.image_webp,'base64'),pg_catalog.chr(10),'') end
 from private.overlay_print_common_items_v1 i
 join private.overlay_print_common_releases_v1 r on r.release_id=i.release_id and r.active
 left join storage.objects o on o.id=i.storage_object_id and o.bucket_id='overlay-generated-images'
    and o.version=i.object_version and o.metadata->>'eTag'=i.object_etag
    and o.metadata->>'size'=i.object_size::text
 where i.reference_id=p_reference_id
$$;
revoke all on function public.overlay_print_common_asset_v1(text) from public,anon,authenticated,service_role;
grant execute on function public.overlay_print_common_asset_v1(text) to service_role;
commit;
