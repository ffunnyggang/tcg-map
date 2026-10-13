alter table public.cms_contents add column if not exists title_en text;
alter table public.cms_blocks add column if not exists title_en text;
alter table public.shops add column if not exists address_en_source text;
comment on column public.cms_contents.title_en is 'Optional English content title; original title is the fallback.';
comment on column public.cms_blocks.title_en is 'Optional English block title; original title is the fallback.';
comment on column public.shops.address_en_source is 'Provenance of English display address: official, estimated, or manual.';
CREATE OR REPLACE FUNCTION public.admin_save_shop_full(p_shop jsonb, p_tcg jsonb, p_features jsonb, p_images jsonb, p_review jsonb, p_contents jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id text;
begin
  if not public.is_funypin_admin() then raise exception 'admin access required' using errcode='42501'; end if;
  v_id:=public.admin_save_shop(p_shop,p_tcg,p_features,p_images);
  if p_review is not null then perform public.admin_save_shop_review(v_id,p_review); end if;
  if p_contents is not null then perform public.admin_replace_shop_contents(v_id,p_contents); end if;

  -- Optional English location fields: preserve values sent by older clients.
  update public.shops set
    address_en_source=case when p_shop ? 'address_en' and nullif(btrim(p_shop->>'address_en'),'') is distinct from address_en then case when nullif(btrim(p_shop->>'address_en'),'') is null then null else 'manual' end else address_en_source end,
    address_en=case when p_shop ? 'address_en' then nullif(btrim(p_shop->>'address_en'),'') else address_en end,
    nearest_station_en=case when p_shop ? 'nearest_station_en' then nullif(btrim(p_shop->>'nearest_station_en'),'') else nearest_station_en end,
    city_en=case when p_shop ? 'city_en' then nullif(btrim(p_shop->>'city_en'),'') else city_en end,
    area_en=case when p_shop ? 'area_en' then nullif(btrim(p_shop->>'area_en'),'') else area_en end
  where id=v_id;
  return v_id;
end;
$function$
