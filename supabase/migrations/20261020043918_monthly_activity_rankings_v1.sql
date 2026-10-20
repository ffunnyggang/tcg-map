-- Monthly FUNY PIN ranking (original primary metrics)
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
 if not public.is_my_feature_tester() then return jsonb_build_object('ok',false,'error','test_access_denied'); end if;
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
   'avatar_url',avatar_url,'value',value,'secondary',secondary,
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
