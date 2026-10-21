-- Card-shop detail FUNY MON event settings
alter table public.shops
  add column if not exists detail_funymon_event_enabled boolean not null default false,
  add column if not exists detail_funymon_event_title text,
  add column if not exists detail_funymon_event_start_date date,
  add column if not exists detail_funymon_event_end_date date,
  add column if not exists detail_funymon_event_url text,
  add column if not exists detail_funymon_event_link_mode text not null default 'inapp_page';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='shops_detail_funymon_event_link_mode_check'
      and conrelid='public.shops'::regclass
  ) then
    alter table public.shops
      add constraint shops_detail_funymon_event_link_mode_check
      check (detail_funymon_event_link_mode in ('inapp_page','inapp_bottom_sheet','external'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='shops_detail_funymon_event_period_check'
      and conrelid='public.shops'::regclass
  ) then
    alter table public.shops
      add constraint shops_detail_funymon_event_period_check
      check (
        detail_funymon_event_start_date is null
        or detail_funymon_event_end_date is null
        or detail_funymon_event_end_date >= detail_funymon_event_start_date
      );
  end if;
end $$;

create or replace view public.v_app_shops
with (security_invoker=true)
as
select
  id,country_code,region_code,city,area,name,name_en,address,phone,website_url,instagram_url,
  naver_map_url,google_map_url,nearest_station,walk_minutes,parking_status,hours_display,
  closed_display,latitude,longitude,status,verified_at,other_tcg_note,is_active,created_at,updated_at,
  instagram_feed_enabled,event_highlight_enabled,event_start_at,event_end_at,
  coalesce((
    select jsonb_object_agg(t.code,jsonb_build_object('status',st.status,'detail',st.detail))
    from public.shop_tcg st
    join public.tcg_types t on t.id=st.tcg_id and t.is_active=true
    where st.shop_id=s.id
  ),'{}'::jsonb) as tcg,
  coalesce((
    select jsonb_object_agg(f.code,jsonb_build_object('value',sf.value,'detail',sf.detail))
    from public.shop_features sf
    join public.features f on f.id=sf.feature_id and f.is_active=true
    where sf.shop_id=s.id
  ),'{}'::jsonb) as features,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id',i.id,'type',i.image_type,'source_path',i.source_path,'storage_path',i.storage_path,
        'alt_text',i.alt_text,'sort_order',i.sort_order,'is_primary',i.is_primary
      )
      order by i.sort_order,i.created_at
    )
    from public.shop_images i
    where i.shop_id=s.id and i.is_active=true
  ),'[]'::jsonb) as images,
  city_en,area_en,address_en,nearest_station_en,
  detail_event_enabled,detail_event_title,detail_event_url,
  detail_funymon_event_enabled,detail_funymon_event_title,
  detail_funymon_event_start_date,detail_funymon_event_end_date,
  detail_funymon_event_url,detail_funymon_event_link_mode
from public.shops s
where is_active=true;

create or replace function public.admin_save_shop_full(
  p_shop jsonb,p_tcg jsonb,p_features jsonb,p_images jsonb,p_review jsonb,p_contents jsonb
)
returns text
language plpgsql
security definer
set search_path=''
as $function$
declare v_id text;
begin
  if not public.is_funypin_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;

  v_id:=public.admin_save_shop(p_shop,p_tcg,p_features,p_images);
  if p_review is not null then perform public.admin_save_shop_review(v_id,p_review); end if;
  if p_contents is not null then perform public.admin_replace_shop_contents(v_id,p_contents); end if;

  update public.shops set
    address_en_source=case
      when p_shop ? 'address_en'
        and nullif(btrim(p_shop->>'address_en'),'') is distinct from address_en
      then case when nullif(btrim(p_shop->>'address_en'),'') is null then null else 'manual' end
      else address_en_source
    end,
    address_en=case when p_shop ? 'address_en' then nullif(btrim(p_shop->>'address_en'),'') else address_en end,
    nearest_station_en=case when p_shop ? 'nearest_station_en' then nullif(btrim(p_shop->>'nearest_station_en'),'') else nearest_station_en end,
    city_en=case when p_shop ? 'city_en' then nullif(btrim(p_shop->>'city_en'),'') else city_en end,
    area_en=case when p_shop ? 'area_en' then nullif(btrim(p_shop->>'area_en'),'') else area_en end,
    detail_funymon_event_enabled=case
      when p_shop ? 'detail_funymon_event_enabled'
      then coalesce((p_shop->>'detail_funymon_event_enabled')::boolean,false)
      else detail_funymon_event_enabled
    end,
    detail_funymon_event_title=case
      when p_shop ? 'detail_funymon_event_title'
      then nullif(btrim(p_shop->>'detail_funymon_event_title'),'')
      else detail_funymon_event_title
    end,
    detail_funymon_event_start_date=case
      when p_shop ? 'detail_funymon_event_start_date'
      then nullif(p_shop->>'detail_funymon_event_start_date','')::date
      else detail_funymon_event_start_date
    end,
    detail_funymon_event_end_date=case
      when p_shop ? 'detail_funymon_event_end_date'
      then nullif(p_shop->>'detail_funymon_event_end_date','')::date
      else detail_funymon_event_end_date
    end,
    detail_funymon_event_url=case
      when p_shop ? 'detail_funymon_event_url'
      then nullif(btrim(p_shop->>'detail_funymon_event_url'),'')
      else detail_funymon_event_url
    end,
    detail_funymon_event_link_mode=case
      when p_shop ? 'detail_funymon_event_link_mode'
      then coalesce(nullif(p_shop->>'detail_funymon_event_link_mode',''),'inapp_page')
      else detail_funymon_event_link_mode
    end
  where id=v_id;

  return v_id;
end;
$function$;


-- Preserve currently configured shop-detail FUNY MON events during the transition.
with latest_funymon as (
  select
    e.*,
    row_number() over(partition by e.shop_id order by e.starts_at desc) as rn
  from public.funy_mon_events e
  where e.shop_id is not null
    and e.is_archived=false
)
update public.shops s
set
  detail_funymon_event_enabled=true,
  detail_funymon_event_title=coalesce(
    nullif(btrim(s.detail_event_title),''),
    nullif(btrim(e.title),''),
    'FUNY MON 이벤트'
  ),
  detail_funymon_event_start_date=(e.starts_at at time zone 'Asia/Seoul')::date,
  detail_funymon_event_end_date=(e.ends_at at time zone 'Asia/Seoul')::date,
  detail_funymon_event_url=coalesce(
    nullif(btrim(e.event_url),''),
    nullif(btrim(s.detail_event_url),'')
  ),
  detail_funymon_event_link_mode='inapp_bottom_sheet',
  detail_event_enabled=case
    when s.detail_event_enabled
      and nullif(btrim(s.detail_event_url),'') is not distinct from nullif(btrim(e.event_url),'')
    then false
    else s.detail_event_enabled
  end
from latest_funymon e
where e.rn=1
  and s.id=e.shop_id
  and s.detail_funymon_event_enabled=false
  and coalesce(nullif(btrim(e.event_url),''),nullif(btrim(s.detail_event_url),'')) is not null;
