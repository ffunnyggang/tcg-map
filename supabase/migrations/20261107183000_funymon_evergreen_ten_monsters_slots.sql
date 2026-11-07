-- Released server-selected evergreen spawns: 10 common monsters, 1-2 per shop.
CREATE OR REPLACE FUNCTION public.funy_mon_evergreen_nearby(p_lat double precision, p_lng double precision)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with settings as (
 select * from public.funy_mon_evergreen_settings where id=true and is_enabled=true
), shops_near as (
 select sh.id,sh.name,sh.latitude,sh.longitude,
 floor(extract(epoch from now())/(cfg.shop_rotation_minutes*60))::bigint as shop_rotation,
 floor(extract(epoch from now())/(cfg.monster_rotation_minutes*60))::bigint as mon_rotation,
 (6371000 * 2 * asin(sqrt(least(1.,
   power(sin(radians((sh.latitude-p_lat)/2)),2)
   +cos(radians(p_lat))*cos(radians(sh.latitude))
   *power(sin(radians((sh.longitude-p_lng)/2)),2)
 ))))::numeric as distance_m
 from public.shops sh cross join settings cfg
 where p_lat between -90 and 90 and p_lng between -180 and 180
 and sh.country_code='KR' and sh.is_active=true
 and sh.latitude between -90 and 90 and sh.longitude between -180 and 180
 and sh.status !~* '폐업|영업종료|closed'
 and not exists (
   select 1 from public.funy_mon_events ev
   where ev.shop_id=sh.id and ev.target_type='shop'
   and ev.is_archived=false and ev.is_force_paused=false
   and now() between ev.starts_at and ev.ends_at
 )
), selected_shops as (
 select * from shops_near
 where distance_m<=(select search_radius_m from settings)
 order by md5(id || ':' || shop_rotation::text),id
 limit (select max_shops from settings)
), slots as (
 select ss.*,g.slot,
   get_byte(decode(md5(ss.id || ':' || ss.mon_rotation::text),'hex'),0)%10 as seed,
   get_byte(decode(md5(ss.id || ':' || ss.mon_rotation::text),'hex'),1)%9+1 as step
 from selected_shops ss cross join lateral generate_series(1,
   1+get_byte(decode(md5(ss.id || ':' || ss.mon_rotation::text),'hex'),2)%2
 ) as g(slot)
), results as (
 select *,
 (array['ponanyang','bubblelong','hatring','bulgi','namumong',
 'ggomagureum','bawidong','grimjamong','beonjjeogi','neon'])
 [((seed + (slot-1)*step)%10)+1] as monster_id
 from slots
)
select coalesce(jsonb_agg(jsonb_build_object(
 'shop_id',id,'shop_name',name,'latitude',latitude,'longitude',longitude,
 'distance_m',round(distance_m)::integer,'monster_id',monster_id,
 'slot',slot,'rotation',shop_rotation,'monster_rotation',mon_rotation
) order by id,slot),'[]'::jsonb)
from results
$function$

