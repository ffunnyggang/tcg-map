-- Preserve discovered spawn selection while requiring the live position within the capture radius.
CREATE OR REPLACE FUNCTION public.funy_mon_evergreen_capture_at_origin(p_lat double precision, p_lng double precision, p_origin_lat double precision, p_origin_lng double precision, p_shop_id text, p_monster_id text, p_anonymous_id uuid)
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
 if p_anonymous_id is null or p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_origin_lat is null or p_origin_lng is null or p_origin_lat not between -90 and 90 or p_origin_lng not between -180 and 180
   or p_shop_id is null or p_monster_id is null then
   return jsonb_build_object('error','invalid_payload');
 end if;
 select * into v_cfg from public.funy_mon_evergreen_settings where id=true and is_enabled=true;
 if not found then return jsonb_build_object('error','event_unavailable'); end if;
 -- Reuse precisely the same deterministic spawn selection as map discovery.
 v_spawn := public.funy_mon_evergreen_nearby(p_origin_lat,p_origin_lng);
 select elem into v_row from jsonb_array_elements(v_spawn) elem
  where elem->>'shop_id'=p_shop_id and elem->>'monster_id'=p_monster_id limit 1;
 if v_row is null then return jsonb_build_object('error','monster_unavailable'); end if;
 v_shop_name := v_row->>'shop_name';
 v_distance := round(6371000*2*asin(sqrt(least(1.,
 power(sin(radians(((v_row->>'latitude')::float8-p_lat)/2)),2)
 +cos(radians(p_lat))*cos(radians((v_row->>'latitude')::float8))
 *power(sin(radians(((v_row->>'longitude')::float8-p_lng)/2)),2)
 ))))::integer;
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
;
revoke all on function public.funy_mon_evergreen_capture_at_origin(double precision,double precision,double precision,double precision,text,text,uuid) from public, anon;
grant execute on function public.funy_mon_evergreen_capture_at_origin(double precision,double precision,double precision,double precision,text,text,uuid) to authenticated;
