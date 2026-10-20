-- Preserve personal monthly metrics when public ranking participation is OFF.
-- A WITH/CTE only exists for the statement it prefixes; never query its counts
-- CTE from a separate PL/pgSQL SELECT in an opt-out fallback branch.
CREATE OR REPLACE FUNCTION public.get_monthly_activity_metric_rankings(p_month text, p_category text, p_shop_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid:=auth.uid();v_month date;v_end date;v_prev date;v_rows jsonb;v_my jsonb;v_pop integer;v_public boolean;v_own_value bigint:=0;
begin
 if v_uid is null then return jsonb_build_object('ok',false,'error','login_required');end if;
 if not public.is_my_feature_tester() then return jsonb_build_object('ok',false,'error','test_access_denied');end if;
 if p_category not in ('attendance','attendance_secondary','visit','visit_secondary','funymon','funymon_secondary') then return jsonb_build_object('ok',false,'error','invalid_category');end if;
 if p_month !~ '^[0-9]{4}-[0-9]{2}$' then return jsonb_build_object('ok',false,'error','invalid_month');end if;
 v_month:=to_date(p_month||'-01','YYYY-MM-DD');v_end:=(v_month+interval '1 month')::date;v_prev:=(v_month-interval '1 month')::date;
 if to_char(v_month,'YYYY-MM')<>p_month or v_month<date '2026-10-01' or v_month>date_trunc('month',now() at time zone 'Asia/Seoul')::date then return jsonb_build_object('ok',false,'error','invalid_month');end if;
 select coalesce(is_public,false) into v_public from public.ranking_preferences where user_id=v_uid;
 with events as (
 select user_id,checkin_date_kst as event_day,null::text as shop_id,null::text as monster_id
 from public.daily_checkins where p_category like 'attendance%' and checkin_date_kst>=v_prev and checkin_date_kst<v_end
 union all
 select user_id,visit_date_kst,shop_id,null::text
 from public.shop_visit_checkins where p_category like 'visit%' and visit_date_kst>=v_prev and visit_date_kst<v_end and (nullif(p_shop_id,'') is null or shop_id=p_shop_id)
 union all
 select user_id,(caught_at at time zone 'Asia/Seoul')::date,null::text,monster_id
 from public.funy_mon_catches where p_category like 'funymon%' and coalesce(result,'')<>'failed' and (caught_at at time zone 'Asia/Seoul')::date>=v_prev and (caught_at at time zone 'Asia/Seoul')::date<v_end
 ),
 daily as (select distinct user_id,event_day from events where p_category='attendance_secondary'),
 streaks as (
 select user_id,event_day,date_trunc('month',event_day)::date as segment_month,event_day-(row_number() over(partition by user_id,date_trunc('month',event_day) order by event_day))::int as grp from daily
 ),
 streak_values as (
 select user_id,
 coalesce(max(n) filter(where start_day>=v_month and start_day<v_end),0)::bigint as value,
 coalesce(max(n) filter(where end_day<v_month),0)::bigint as previous_value
 from (select user_id,segment_month,grp,count(*) as n,min(event_day) as start_day,max(event_day) as end_day from streaks group by user_id,segment_month,grp) a group by user_id
 ),
 counts as (
 select e.user_id,
 (case when p_category='attendance_secondary' then (select sv.value from streak_values sv where sv.user_id=e.user_id)
 when p_category='visit_secondary' then count(distinct e.shop_id) filter(where e.event_day>=v_month)
 when p_category='funymon_secondary' then count(distinct e.monster_id) filter(where e.event_day>=v_month)
 else count(*) filter(where e.event_day>=v_month) end)::bigint as value,
 (case when p_category='attendance_secondary' then (select sv.previous_value from streak_values sv where sv.user_id=e.user_id)
 when p_category='visit_secondary' then count(distinct e.shop_id) filter(where e.event_day<v_month)
 when p_category='funymon_secondary' then count(distinct e.monster_id) filter(where e.event_day<v_month)
 else count(*) filter(where e.event_day<v_month) end)::bigint as previous_value
 from events e group by e.user_id
 ),
 scores as (
 select rp.user_id,p.nickname,p.avatar_url,coalesce(c.value,0) as value,coalesce(c.previous_value,0) as previous_value
 from public.ranking_preferences rp left join public.profiles p on p.user_id=rp.user_id
 left join counts c on c.user_id=rp.user_id where rp.is_public=true
 ),
 ranks as (select *,rank() over(order by value desc) as rn from scores where value>0),
 prev as (select user_id,rank() over(order by previous_value desc) as prev_rn from scores where previous_value>0),
 combined as (select r.*,p.prev_rn from ranks r left join prev p on p.user_id=r.user_id)
 select
 (select coalesce(jsonb_agg(jsonb_build_object('rank',rn,'nickname',coalesce(nullif(nickname,''),'FUNY 회원'),'avatar_url',avatar_url,'value',value,'previous_value',previous_value,'previous_rank',prev_rn,'rank_change',case when prev_rn is null then null else prev_rn-rn end) order by rn,user_id),'[]'::jsonb) from (select * from combined order by rn,user_id limit 100) z),
 (select jsonb_build_object('rank',rn,'value',value) from combined where user_id=v_uid limit 1),
 (select count(*) from combined)
 into v_rows,v_my,v_pop;
 if v_my is null then
   -- Compute private personal statistics without referencing a previous CTE.
   -- This branch applies when the user opts out of the public ranking.
   if p_category='attendance_secondary' then
     select coalesce(max(g.streak),0)::bigint into v_own_value from (
       select count(*)::bigint as streak from (
         select d.checkin_date_kst - (row_number() over(order by d.checkin_date_kst))::int as grp
         from (select distinct checkin_date_kst from public.daily_checkins
               where user_id=v_uid and checkin_date_kst>=v_month and checkin_date_kst<v_end) d
       ) seq group by seq.grp
     ) g;
   elsif p_category='visit_secondary' then
     select count(distinct s.shop_id)::bigint into v_own_value from public.shop_visit_checkins s
     where s.user_id=v_uid and s.visit_date_kst>=v_month and s.visit_date_kst<v_end
       and (nullif(p_shop_id,'') is null or s.shop_id=p_shop_id);
   elsif p_category='funymon_secondary' then
     select count(distinct f.monster_id)::bigint into v_own_value from public.funy_mon_catches f
     where f.user_id=v_uid and coalesce(f.result,'')<>'failed'
       and (f.caught_at at time zone 'Asia/Seoul')::date>=v_month
       and (f.caught_at at time zone 'Asia/Seoul')::date<v_end;
   elsif p_category='attendance' then
     select count(*)::bigint into v_own_value from public.daily_checkins d
     where d.user_id=v_uid and d.checkin_date_kst>=v_month and d.checkin_date_kst<v_end;
   elsif p_category='visit' then
     select count(*)::bigint into v_own_value from public.shop_visit_checkins s
     where s.user_id=v_uid and s.visit_date_kst>=v_month and s.visit_date_kst<v_end
       and (nullif(p_shop_id,'') is null or s.shop_id=p_shop_id);
   elsif p_category='funymon' then
     select count(*)::bigint into v_own_value from public.funy_mon_catches f
     where f.user_id=v_uid and coalesce(f.result,'')<>'failed'
       and (f.caught_at at time zone 'Asia/Seoul')::date>=v_month
       and (f.caught_at at time zone 'Asia/Seoul')::date<v_end;
   end if;
   v_my:=jsonb_build_object('rank',null,'value',coalesce(v_own_value,0));
 end if;
 return jsonb_build_object('ok',true,'rows',v_rows,'my',coalesce(v_my,jsonb_build_object('rank',null,'value',0)),'population',v_pop,'public',coalesce(v_public,false));
end;$function$
;
REVOKE ALL ON FUNCTION public.get_monthly_activity_metric_rankings(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_activity_metric_rankings(text,text,text) TO authenticated;
