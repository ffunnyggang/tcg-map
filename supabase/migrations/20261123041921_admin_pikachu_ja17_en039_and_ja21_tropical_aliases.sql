begin;
create table private.overlay_admin_print_ja17_en039_alias_v1 (
  reference_id text primary key check (reference_id='m6a-ja-033'),
  import_id uuid not null references private.overlay_admin_print_import_wide_v1(import_id) on delete restrict
    check (import_id='22f9939a-57e1-5976-98cb-f20b96b70833'::uuid),
  source_sha256 text not null check (source_sha256='b5fb540dc553e90ba3c6a499d5ca643748cdd4474ba5fe6964b7796fece5a477'),
  active boolean not null default false
);
alter table private.overlay_admin_print_ja17_en039_alias_v1 enable row level security;
revoke all on private.overlay_admin_print_ja17_en039_alias_v1 from public,anon,authenticated,service_role;
create function public.admin_pikachu_ja_en039_original_window_v1(p_reference_id text,p_image boolean)
returns table(reference_id text,image_webp_base64 text)
language sql stable security definer set search_path='' as $$
 select a.reference_id, case when p_image is true then pg_catalog.replace(pg_catalog.encode(w.image_webp,'base64'),pg_catalog.chr(10),'') end
 from private.overlay_admin_print_ja17_en039_alias_v1 a
 join private.overlay_admin_print_import_wide_v1 w on w.import_id=a.import_id and w.reference_id='30th-en-039'
   and w.active and w.filled_window and w.asset_sha256=a.source_sha256
 join public.overlay_admin_print_imports i on i.id=a.import_id and i.reference_id=w.reference_id and i.active
 where a.active and a.reference_id=p_reference_id
$$;
revoke all on function public.admin_pikachu_ja_en039_original_window_v1(text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.admin_pikachu_ja_en039_original_window_v1(text,boolean) to service_role;
create table private.overlay_admin_print_ja21_tropical_alias_v1 (
  reference_id text primary key check (reference_id='m6a-ja-037'),
  source_reference_id text not null references private.overlay_admin_print_ja_submitted_original_window_tropical_v1(reference_id) on delete restrict
    check (source_reference_id='m6a-ja-043'),
  source_sha256 text not null check (source_sha256='6bd3b180d529f8530f6c78c147522f0a05d2fb1a8af62a32781f9b9782ad0f58'),
  active boolean not null default false
);
alter table private.overlay_admin_print_ja21_tropical_alias_v1 enable row level security;
revoke all on private.overlay_admin_print_ja21_tropical_alias_v1 from public,anon,authenticated,service_role;
create function public.admin_pikachu_ja_tropical_window_move_v1(p_reference_id text,p_image boolean)
returns table(reference_id text,image_webp_base64 text)
language sql stable security definer set search_path='' as $$
 select a.reference_id, case when p_image is true then pg_catalog.replace(pg_catalog.encode(t.image_webp,'base64'),pg_catalog.chr(10),'') end
 from private.overlay_admin_print_ja21_tropical_alias_v1 a
 join private.overlay_admin_print_ja_submitted_original_window_tropical_v1 t
   on t.reference_id=a.source_reference_id and t.active and t.asset_sha256=a.source_sha256
 where a.active and a.reference_id=p_reference_id
$$;
revoke all on function public.admin_pikachu_ja_tropical_window_move_v1(text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.admin_pikachu_ja_tropical_window_move_v1(text,boolean) to service_role;
commit;
