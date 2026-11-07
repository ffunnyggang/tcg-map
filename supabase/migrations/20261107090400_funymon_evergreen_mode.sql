-- FUNY MON evergreen mode (standalone from prize events)
-- The production settings are initially inserted disabled; release toggle is a separate audited action.
create table if not exists public.funy_mon_evergreen_settings (
 id boolean primary key default true check(id),
 is_enabled boolean not null default false,
 search_radius_m integer not null default 1500 check(search_radius_m between 100 and 10000),
 max_shops integer not null default 2 check(max_shops between 1 and 5),
 shop_rotation_minutes integer not null default 360 check(shop_rotation_minutes between 30 and 1440),
 monster_rotation_minutes integer not null default 30 check(monster_rotation_minutes between 5 and 360),
 catch_radius_m integer not null default 100 check(catch_radius_m between 10 and 500),
 capture_success_bp integer not null default 8000 check(capture_success_bp between 0 and 10000),
 daily_attempt_limit integer not null default 3 check(daily_attempt_limit between 1 and 20),
 repeat_delay_minutes integer not null default 30 check(repeat_delay_minutes between 1 and 1440),
 updated_at timestamptz not null default now()
);
insert into public.funy_mon_evergreen_settings(id) values(true) on conflict do nothing;
alter table public.funy_mon_evergreen_settings enable row level security;
revoke all on public.funy_mon_evergreen_settings from public, anon, authenticated;
grant select on public.funy_mon_evergreen_settings to anon, authenticated;
drop policy if exists evergreen_read on public.funy_mon_evergreen_settings;
create policy evergreen_read on public.funy_mon_evergreen_settings for select to anon, authenticated using(true);

CREATE OR REPLACE FUNCTION public.funy_mon_evergreen_nearby(p_lat double precision, p_lng double precision)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with settings as (
  select * from public.funy_mon_evergreen_settings where id=true and is_enabled=true
 ), base as (
  select sh.id, sh.name, sh.latitude, sh.longitude, cfg.max_shops,
   floor(extract(epoch from now()) / (cfg.shop_rotation_minutes * 60))::bigint as rotation,
   floor(extract(epoch from now()) / (cfg.monster_rotation_minutes * 60))::bigint as mon_rotation,
   (6371000 * 2 * asin(sqrt(least(1.0,
      power(sin(radians((sh.latitude - p_lat)/2)),2)
      + cos(radians(p_lat))*cos(radians(sh.latitude))
      * power(sin(radians((sh.longitude-p_lng)/2)),2)
   ))))::numeric as distance_m
  from public.shops sh cross join settings cfg
  where sh.country_code='KR' and sh.is_active=true
    and sh.latitude between -90 and 90 and sh.longitude between -180 and 180
    and sh.status !~* '폐업|영업종료|closed'
    and not exists (
      select 1 from public.funy_mon_events ev
      where ev.shop_id=sh.id and ev.target_type='shop'
       and ev.is_archived=false and ev.is_force_paused=false
       and now() between ev.starts_at and ev.ends_at
    )
 ), eligible as (
  select b.*, get_byte(decode(md5(b.id || ':' || b.mon_rotation::text),'hex'),0)%5 as monster_index
  from base b cross join settings cfg
  where b.distance_m <= cfg.search_radius_m
  order by md5(b.id || ':' || b.rotation::text), b.id
  limit (select max_shops from settings)
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'shop_id',id,'shop_name',name,'latitude',latitude,'longitude',longitude,
  'distance_m',round(distance_m)::integer,
  'monster_id',(array['ponanyang','bubblelong','hatring','bulgi','namumong'])[monster_index+1],
  'rotation',rotation,'monster_rotation',mon_rotation
 ) order by id),'[]'::jsonb)
 from eligible
 where p_lat between -90 and 90 and p_lng between -180 and 180
$function$


revoke all on function public.funy_mon_evergreen_nearby(double precision,double precision) from public;
grant execute on function public.funy_mon_evergreen_nearby(double precision,double precision) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.funy_mon_evergreen_capture(p_lat double precision, p_lng double precision, p_shop_id text, p_monster_id text, p_anonymous_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid := (select auth.uid());
 v_cfg public.funy_mon_evergreen_settings%rowtype;
 v_spawn jsonb;
 v_row jsonb;
 v_shop_name text;
 v_distance integer;
 v_today date := (now() at time zone 'Asia/Seoul')::date;
 v_attempts integer;
 v_latest timestamptz;
 v_success boolean;
 v_caught record;
begin
 if v_uid is null then return jsonb_build_object('error','login_required'); end if;
 if p_anonymous_id is null or p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180
   or p_shop_id is null or p_monster_id is null then
   return jsonb_build_object('error','invalid_payload');
 end if;
 select * into v_cfg from public.funy_mon_evergreen_settings where id=true and is_enabled=true;
 if not found then return jsonb_build_object('error','event_unavailable'); end if;
 -- Reuse precisely the same deterministic spawn selection as map discovery.
 v_spawn := public.funy_mon_evergreen_nearby(p_lat,p_lng);
 select elem into v_row from jsonb_array_elements(v_spawn) elem
  where elem->>'shop_id'=p_shop_id and elem->>'monster_id'=p_monster_id limit 1;
 if v_row is null then return jsonb_build_object('error','monster_unavailable'); end if;
 v_shop_name := v_row->>'shop_name';
 v_distance := (v_row->>'distance_m')::integer;
 if v_distance > v_cfg.catch_radius_m then
  return jsonb_build_object('error','too_far','distance_m',v_distance,'required_m',v_cfg.catch_radius_m);
 end if;
 -- Avoid concurrent attempts bypassing the per-user limit.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('funymon-evergreen:' || v_uid::text));
 select count(*),max(caught_at) filter(where shop_id=p_shop_id and monster_id=p_monster_id)
 into v_attempts,v_latest
 from public.funy_mon_catches
 where user_id=v_uid and event_title_snapshot='퍼니몬 상시 운영'
   and catch_date_kst=v_today;
 if v_attempts >= v_cfg.daily_attempt_limit then
  return jsonb_build_object('error','daily_catch_limit','limit',v_cfg.daily_attempt_limit,'used',v_attempts);
 end if;
 if v_latest > now() - make_interval(mins=>v_cfg.repeat_delay_minutes) then
  return jsonb_build_object('error','retry_later','minutes',v_cfg.repeat_delay_minutes);
 end if;
 v_success := pg_catalog.random() * 10000 < v_cfg.capture_success_bp;
 insert into public.funy_mon_catches
  (anonymous_id,user_id,shop_id,monster_id,distance_m,result,catch_date_kst,
   event_id,reward_id,claim_code,reward_type_snapshot,event_title_snapshot,shop_name_snapshot)
 values
  (p_anonymous_id,v_uid,p_shop_id,p_monster_id,v_distance,case when v_success then 'caught' else 'failed' end,v_today,
   null,null,null,case when v_success then 'none' else 'fail' end,'퍼니몬 상시 운영',v_shop_name)
 returning id,caught_at into v_caught;
 return jsonb_build_object('ok',true,'result',case when v_success then 'caught' else 'failed' end,
   'catch_id',v_caught.id,'caught_at',v_caught.caught_at,'shop_id',p_shop_id,'shop_name',v_shop_name,
   'monster_id',p_monster_id,'distance_m',v_distance,'reward',null,'evergreen',true);
end;
$function$


revoke all on function public.funy_mon_evergreen_capture(double precision,double precision,text,text,uuid) from public,anon;
grant execute on function public.funy_mon_evergreen_capture(double precision,double precision,text,text,uuid) to authenticated;
