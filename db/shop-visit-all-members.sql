CREATE OR REPLACE FUNCTION public.my_shop_visit_checkin_test(p_shop_id text, p_lat double precision, p_lng double precision, p_accuracy double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_shop record; v_distance double precision; v_inserted integer := 0; v_total integer := 0; v_unique integer := 0;
begin
  if v_user is null then return jsonb_build_object('ok',false,'error','login_required'); end if;
  if coalesce(trim(p_shop_id),'')='' or p_lat is null or p_lng is null then return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then return jsonb_build_object('ok',false,'error','invalid_location'); end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 50 or p_accuracy::text in ('NaN','Infinity','-Infinity') then return jsonb_build_object('ok',false,'error','low_accuracy','accuracy_m',case when p_accuracy between 0 and 100000 then round(p_accuracy)::integer else null end); end if;
  select id,name,latitude,longitude into v_shop from public.shops where id=p_shop_id and is_active=true limit 1;
  if not found or v_shop.latitude is null or v_shop.longitude is null then return jsonb_build_object('ok',false,'error','shop_not_found'); end if;
  v_distance := 6371000 * 2 * asin(sqrt(
    power(sin(radians(p_lat-v_shop.latitude)/2),2) +
    cos(radians(v_shop.latitude))*cos(radians(p_lat))*power(sin(radians(p_lng-v_shop.longitude)/2),2)
  ));
  if v_distance > 50 then return jsonb_build_object('ok',false,'error','too_far','distance_m',round(v_distance)::integer,'shop_name',v_shop.name); end if;
  insert into public.shop_visit_checkins(user_id,shop_id,visit_date_kst,verified_at,distance_m,accuracy_m,method)
  values(v_user,v_shop.id,v_today,now(),round(v_distance)::integer,case when p_accuracy is null then null else round(p_accuracy)::integer end,'gps')
  on conflict(user_id,shop_id,visit_date_kst) do nothing;
  get diagnostics v_inserted = row_count;
  select count(*)::integer,count(distinct shop_id)::integer into v_total,v_unique from public.shop_visit_checkins where user_id=v_user;
  return jsonb_build_object('ok',true,'new',v_inserted>0,'shop_id',v_shop.id,'shop_name',v_shop.name,'distance_m',round(v_distance)::integer,'total',v_total,'unique_shops',v_unique);
end;
$function$
