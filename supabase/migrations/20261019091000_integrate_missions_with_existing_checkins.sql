begin;

alter table public.mission_items drop constraint if exists mission_items_mission_type_check;
alter table public.mission_items add constraint mission_items_mission_type_check check (mission_type in (
  'daily_checkin','profile_complete','community_post_create','market_listing_create',
  'shop_favorite_add','market_favorite_add','shop_visit_checkin','funymon_capture','event_entry'
));

create or replace function public.mission_trigger_daily_checkin()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform public.mission_apply_event_for_user(
    new.user_id,'daily_checkin','daily_checkin',new.id::text,1,
    'daily_checkin:'||new.user_id::text||':'||new.checkin_date_kst::text,
    jsonb_build_object('checkin_date_kst',new.checkin_date_kst,'source',new.source),
    coalesce(new.checked_in_at,clock_timestamp())
  );
  return new;
end;
$$;

drop trigger if exists trg_mission_daily_checkin on public.daily_checkins;
create trigger trg_mission_daily_checkin after insert on public.daily_checkins for each row execute function public.mission_trigger_daily_checkin();

create or replace function public.mission_trigger_shop_visit_checkin()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform public.mission_apply_event_for_user(
    new.user_id,'shop_visit_checkin','shop_visit_checkin',new.id::text,1,
    'shop_visit_checkin:'||new.id::text,
    jsonb_build_object(
      'shop_id',new.shop_id,'visit_date_kst',new.visit_date_kst,
      'distance_m',new.distance_m,'accuracy_m',new.accuracy_m,'method',new.method
    ),
    coalesce(new.verified_at,clock_timestamp())
  );
  return new;
end;
$$;

drop trigger if exists trg_mission_shop_visit_checkin on public.shop_visit_checkins;
create trigger trg_mission_shop_visit_checkin after insert on public.shop_visit_checkins for each row execute function public.mission_trigger_shop_visit_checkin();

create or replace function public.mission_checkin()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_today date:=(clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_inserted integer:=0;
  v_balance_before bigint:=0;
  v_balance_after bigint:=0;
  v_total integer:=0;
  v_month integer:=0;
  v_streak integer:=0;
  v_day date;
  v_settings public.mission_feature_settings%rowtype;
begin
  if v_user is null then return jsonb_build_object('ok',false,'error','login_required'); end if;
  select * into v_settings from public.mission_feature_settings where id=true;
  if not coalesce(v_settings.public_enabled,false) and not public.is_my_feature_tester_user(v_user) then
    return jsonb_build_object('ok',false,'error','feature_hidden');
  end if;

  insert into public.funy_coin_wallets(user_id,balance,version) values(v_user,0,0) on conflict(user_id) do nothing;
  select balance into v_balance_before from public.funy_coin_wallets where user_id=v_user;

  insert into public.daily_checkins(user_id,checkin_date_kst,checked_in_at,source)
  values(v_user,v_today,clock_timestamp(),'mission')
  on conflict(user_id,checkin_date_kst) do nothing;
  get diagnostics v_inserted=row_count;

  select balance into v_balance_after from public.funy_coin_wallets where user_id=v_user;
  select count(*)::integer into v_total from public.daily_checkins where user_id=v_user;
  select count(*)::integer into v_month from public.daily_checkins where user_id=v_user and checkin_date_kst>=date_trunc('month',clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_day:=v_today;
  loop
    exit when not exists(select 1 from public.daily_checkins where user_id=v_user and checkin_date_kst=v_day);
    v_streak:=v_streak+1;v_day:=v_day-1;
  end loop;

  return jsonb_build_object(
    'ok',true,'new',v_inserted>0,'date',v_today,'total',v_total,'month',v_month,'streak',v_streak,
    'rewarded_coin',greatest(0,v_balance_after-v_balance_before),'balance',v_balance_after
  );
end;
$$;

revoke all on function public.mission_checkin() from public,anon,authenticated;
grant execute on function public.mission_checkin() to authenticated;

insert into public.mission_items(
  campaign_id,mission_type,title,description,target_count,reward_coin,
  cta_type,cta_label,cta_target,sort_order,is_active
)
select c.id,'shop_visit_checkin','카드샵 방문 인증','가까운 카드샵에서 방문 인증을 완료해보세요',1,10,
       'route','방문 인증','/ranking.html',45,true
from public.mission_campaigns c
where c.title='오늘의 미션' and c.visibility='test' and c.status='active'
  and not exists(select 1 from public.mission_items i where i.campaign_id=c.id and i.mission_type='shop_visit_checkin');

commit;
