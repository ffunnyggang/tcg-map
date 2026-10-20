-- August/October 2026 FUNY PIN monthly ranking: expose previous-month raw metric values.
-- Preserve the existing authenticated/test-access checks and public-only ranking.
do $update_rankings$
declare v_primary text;v_secondary text;
begin
select pg_get_functiondef('public.get_monthly_activity_rankings(text,text,text)'::regprocedure) into v_primary;
if position('''value'',value,''secondary'',secondary,' in v_primary)=0 then raise exception 'Primary ranking signature changed';end if;
v_primary:=replace(v_primary,'''value'',value,''secondary'',secondary,','''value'',value,''secondary'',secondary,''previous_value'',prev_value,');
execute v_primary;
select pg_get_functiondef('public.get_monthly_activity_metric_rankings(text,text,text)'::regprocedure) into v_secondary;
if position('''value'',value,''previous_rank'',prev_rn' in v_secondary)=0 then raise exception 'Secondary ranking row signature changed';end if;
v_secondary:=replace(v_secondary,'''value'',value,''previous_rank'',prev_rn','''value'',value,''previous_value'',previous_value,''previous_rank'',prev_rn');
if position('over(partition by user_id order by event_day)' in v_secondary)=0 then raise exception 'Attendance streak expression changed';end if;
v_secondary:=replace(v_secondary,'select user_id,event_day,event_day-(row_number() over(partition by user_id order by event_day))::int as grp from daily','select user_id,event_day,date_trunc(''month'',event_day)::date as segment_month,event_day-(row_number() over(partition by user_id,date_trunc(''month'',event_day) order by event_day))::int as grp from daily');
v_secondary:=replace(v_secondary,'coalesce(max(n) filter(where end_day>=v_month and start_day<v_end),0)::bigint as value','coalesce(max(n) filter(where start_day>=v_month and start_day<v_end),0)::bigint as value');
v_secondary:=replace(v_secondary,'from (select user_id,grp,count(*) as n,min(event_day) as start_day,max(event_day) as end_day from streaks group by user_id,grp) a group by user_id','from (select user_id,segment_month,grp,count(*) as n,min(event_day) as start_day,max(event_day) as end_day from streaks group by user_id,segment_month,grp) a group by user_id');
execute v_secondary;
end;$update_rankings$;
