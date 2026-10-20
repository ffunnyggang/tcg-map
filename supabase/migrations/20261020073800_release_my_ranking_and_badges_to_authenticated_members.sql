-- FUNY PIN: open ranking and badge features to every authenticated user.
-- Keep auth.uid() checks, existing ranking visibility opt-in, and security-definer RLS boundaries.
-- Do NOT alter shared is_my_feature_tester(), which gates unrelated in-development features.

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

CREATE OR REPLACE FUNCTION public.get_monthly_activity_rankings(p_month text DEFAULT NULL::text, p_category text DEFAULT 'attendance'::text, p_shop_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_user uuid:=auth.uid();
 v_month date;
 v_prev date;
 v_end date;
 v_rows jsonb;
 v_my jsonb;
 v_shops jsonb;
 v_public boolean;
 v_population integer;
begin
 if v_user is null then return jsonb_build_object('ok',false,'error','login_required'); end if;

 if p_category not in ('attendance','visit','funymon') then return jsonb_build_object('ok',false,'error','invalid_category'); end if;
 begin
 v_month:=coalesce(to_date(p_month||'-01','YYYY-MM-DD'),date_trunc('month',now() at time zone 'Asia/Seoul')::date);
 exception when others then return jsonb_build_object('ok',false,'error','invalid_month'); end;
 if v_month < date '2026-10-01' or v_month>date_trunc('month',now() at time zone 'Asia/Seoul')::date
 or v_month<>date_trunc('month',v_month)::date then return jsonb_build_object('ok',false,'error','invalid_month'); end if;
 v_prev:=(v_month-interval '1 month')::date;
 v_end:=(v_month+interval '1 month')::date;
 select coalesce(is_public,false) into v_public from public.ranking_preferences where user_id=v_user;
 v_public:=coalesce(v_public,false);
 select coalesce(jsonb_agg(jsonb_build_object('id',q.shop_id,'name',coalesce(s.name,q.shop_id)) order by coalesce(s.name,q.shop_id)),'[]'::jsonb)
 into v_shops
 from (select distinct shop_id from public.shop_visit_checkins where visit_date_kst>=v_month and visit_date_kst<v_end) q
 left join public.shops s on s.id=q.shop_id;

 with events as (
  select d.user_id,d.checkin_date_kst as day,null::text as shop_id,null::text as monster_id
  from public.daily_checkins d where p_category='attendance' and d.checkin_date_kst>=v_prev and d.checkin_date_kst<v_end
  union all
  select v.user_id,v.visit_date_kst,v.shop_id,null::text
  from public.shop_visit_checkins v where p_category='visit' and v.visit_date_kst>=v_prev and v.visit_date_kst<v_end
   and (nullif(p_shop_id,'') is null or v.shop_id=p_shop_id)
  union all
  select f.user_id,(f.caught_at at time zone 'Asia/Seoul')::date,null::text,f.monster_id
  from public.funy_mon_catches f where p_category='funymon' and coalesce(f.result,'')<>'failed'
   and (f.caught_at at time zone 'Asia/Seoul')::date>=v_prev and (f.caught_at at time zone 'Asia/Seoul')::date<v_end
 ),
 monthly as (
  select e.user_id,
    count(*) filter(where e.day>=v_month)::bigint as value,
    count(distinct case when e.day>=v_month then case when p_category='visit' then e.shop_id when p_category='funymon' then e.monster_id else null end end)::bigint as secondary,
    count(*) filter(where e.day<v_month)::bigint as prev_value
  from events e group by e.user_id
 ),
 attendance_streak as (
  select user_id,coalesce(max(streak),0)::bigint as streak from (
    select user_id,count(*)::bigint as streak
    from (
      select user_id,checkin_date_kst,
        checkin_date_kst-(row_number() over(partition by user_id order by checkin_date_kst))::int as grp
      from public.daily_checkins
      where p_category='attendance' and checkin_date_kst>=v_month and checkin_date_kst<v_end
    ) a group by user_id,grp
  ) b group by user_id
 ),
 scores as (
  select rp.user_id,p.nickname,p.avatar_url,coalesce(m.value,0) as value,
   case when p_category='attendance' then coalesce(st.streak,0) else coalesce(m.secondary,0) end as secondary,
   coalesce(m.prev_value,0) as prev_value
  from public.ranking_preferences rp
  left join public.profiles p on p.user_id=rp.user_id
  left join monthly m on m.user_id=rp.user_id
  left join attendance_streak st on st.user_id=rp.user_id
  where rp.is_public=true
 ),
 ranked as (
  select *,rank() over(order by value desc) as rn from scores where value>0
 ),
 prev_ranked as (
  select user_id,rank() over(order by prev_value desc) as prev_rn from scores where prev_value>0
 ),
 combined as (
  select r.*,pr.prev_rn from ranked r left join prev_ranked pr on pr.user_id=r.user_id
 ),
 selected as (
  select * from combined order by rn,user_id limit 100
 )
 select
  coalesce((select jsonb_agg(jsonb_build_object(
   'rank',rn,'nickname',coalesce(nullif(nickname,''),'FUNY 회원'),
   'avatar_url',avatar_url,'value',value,'secondary',secondary,'previous_value',prev_value,
   'previous_rank',prev_rn,'rank_change',case when prev_rn is null then null else prev_rn-rn end
  ) order by rn,user_id) from selected),'[]'::jsonb),
  (select jsonb_build_object('rank',rn,'value',value,'secondary',secondary) from combined where user_id=v_user limit 1),
  (select count(*) from combined)
 into v_rows,v_my,v_population;

 if v_my is null then
  with e as (
   select d.checkin_date_kst as day,null::text as shop_id,null::text as monster_id
   from public.daily_checkins d where p_category='attendance' and d.user_id=v_user and d.checkin_date_kst>=v_month and d.checkin_date_kst<v_end
   union all
   select v.visit_date_kst,v.shop_id,null::text from public.shop_visit_checkins v where p_category='visit' and v.user_id=v_user and v.visit_date_kst>=v_month and v.visit_date_kst<v_end and (nullif(p_shop_id,'') is null or v.shop_id=p_shop_id)
   union all
   select (f.caught_at at time zone 'Asia/Seoul')::date,null::text,f.monster_id from public.funy_mon_catches f where p_category='funymon' and f.user_id=v_user and coalesce(f.result,'')<>'failed' and (f.caught_at at time zone 'Asia/Seoul')::date>=v_month and (f.caught_at at time zone 'Asia/Seoul')::date<v_end
  )
  select jsonb_build_object('rank',null,'value',count(*),'secondary',count(distinct case when p_category='visit' then shop_id when p_category='funymon' then monster_id else null end)) into v_my from e;
 end if;
 return jsonb_build_object('ok',true,'month',to_char(v_month,'YYYY-MM'),'category',p_category,
 'rows',v_rows,'my',v_my,'public',v_public,'population',v_population,'shops',v_shops);
end;
$function$
;
REVOKE ALL ON FUNCTION public.get_monthly_activity_rankings(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_activity_rankings(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_my_badges_test()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid := auth.uid(); r record; v_current integer;
begin
  if v_user is null then return jsonb_build_object('ok',false,'error','login_required'); end if;

  for r in select id,condition_type,threshold from public.badge_definitions where is_active=true order by sort_order,id loop
    v_current:=0;
    case r.condition_type
      when 'post_count' then select count(*)::integer into v_current from public.community_posts where user_id=v_user and status='published';
      when 'comment_count' then select count(*)::integer into v_current from public.community_comments where user_id=v_user and status='published';
      when 'market_listing_count' then select count(*)::integer into v_current from public.market_listings where seller_user_id=v_user and listing_status<>'deleted';
      when 'attendance_count' then select count(*)::integer into v_current from public.daily_checkins where user_id=v_user;
      when 'shop_unique_count' then select count(distinct shop_id)::integer into v_current from public.shop_visit_checkins where user_id=v_user;
      when 'funymon_catch_count' then select count(*)::integer into v_current from public.funy_mon_catches where user_id=v_user and coalesce(result,'')<>'failed';
      when 'funymon_unique_count' then select count(distinct monster_id)::integer into v_current from public.funy_mon_catches where user_id=v_user and coalesce(result,'')<>'failed';
      when 'event_catch_count' then select count(*)::integer into v_current from public.funy_mon_catches where user_id=v_user and event_id is not null and coalesce(result,'')<>'failed';
      else v_current:=0;
    end case;
    if v_current>=r.threshold then
      insert into public.user_badges(user_id,badge_id,source_type,metadata)
      values(v_user,r.id,'auto_test',jsonb_build_object('condition_type',r.condition_type,'value',v_current))
      on conflict(user_id,badge_id) do nothing;
    end if;
  end loop;
  return jsonb_build_object('ok',true,'badges',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',d.id,'name',d.name,'description',d.description,'icon',d.icon,'category',d.category,
      'threshold',d.threshold,'condition_type',d.condition_type,'earned',(ub.id is not null),'awarded_at',ub.awarded_at,
      'current',case d.condition_type
        when 'post_count' then (select count(*) from public.community_posts x where x.user_id=v_user and x.status='published')
        when 'comment_count' then (select count(*) from public.community_comments x where x.user_id=v_user and x.status='published')
        when 'market_listing_count' then (select count(*) from public.market_listings x where x.seller_user_id=v_user and x.listing_status<>'deleted')
        when 'attendance_count' then (select count(*) from public.daily_checkins x where x.user_id=v_user)
        when 'shop_unique_count' then (select count(distinct x.shop_id) from public.shop_visit_checkins x where x.user_id=v_user)
        when 'funymon_catch_count' then (select count(*) from public.funy_mon_catches x where x.user_id=v_user and coalesce(x.result,'')<>'failed')
        when 'funymon_unique_count' then (select count(distinct x.monster_id) from public.funy_mon_catches x where x.user_id=v_user and coalesce(x.result,'')<>'failed')
        when 'event_catch_count' then (select count(*) from public.funy_mon_catches x where x.user_id=v_user and x.event_id is not null and coalesce(x.result,'')<>'failed')
        else 0 end
    ) order by d.sort_order,d.id)
    from public.badge_definitions d left join public.user_badges ub on ub.badge_id=d.id and ub.user_id=v_user where d.is_active=true
  ),'[]'::jsonb));
end;
$function$
;
REVOKE ALL ON FUNCTION public.sync_my_badges_test() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_my_badges_test() TO authenticated;

