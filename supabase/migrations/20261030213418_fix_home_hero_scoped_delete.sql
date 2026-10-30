CREATE OR REPLACE FUNCTION public.admin_save_home_hero(p_revision bigint, p_interval numeric, p_banners jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_revision bigint; x jsonb; n integer:=0;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 if p_interval is null or p_interval not between 2 and 30 or jsonb_typeof(p_banners) is distinct from 'array' then raise exception 'INVALID_HERO_CONFIG';end if;
 if jsonb_array_length(p_banners)>5 then raise exception 'HERO_LIMIT_5';end if;
 select revision into v_revision from public.home_hero_settings where id='default' for update;
 if p_revision is distinct from v_revision then raise exception 'HERO_VERSION_CONFLICT' using errcode='40001';end if;
 delete from public.home_hero_banners where slot between 1 and 5;
 for x in select value from jsonb_array_elements(p_banners) loop
  n:=n+1;
  if jsonb_typeof(x->'is_active') is distinct from 'boolean' then raise exception 'INVALID_HERO_ACTIVE';end if;
  insert into public.home_hero_banners(slot,title,image_url,target_url,link_mode,inapp_presentation,is_active,starts_at,ends_at)
  values(n,btrim(x->>'title'),x->>'image_url',x->>'target_url',x->>'link_mode',x->>'inapp_presentation',(x->>'is_active')::boolean,nullif(x->>'starts_at','')::timestamptz,nullif(x->>'ends_at','')::timestamptz);
 end loop;
 update public.home_hero_settings set interval_seconds=p_interval,revision=revision+1,updated_at=now() where id='default' returning revision into v_revision;
 return v_revision;
end $function$
