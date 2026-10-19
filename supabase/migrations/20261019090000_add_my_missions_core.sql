begin;

create table if not exists public.mission_feature_settings (
  id boolean primary key default true check (id = true),
  public_enabled boolean not null default false,
  reward_enabled boolean not null default true,
  release_locked boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.mission_feature_settings(id,public_enabled,reward_enabled,release_locked)
values(true,false,true,true)
on conflict (id) do nothing;

create table if not exists public.mission_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text,
  period_type text not null check (period_type in ('daily','weekly','monthly')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','ended')),
  visibility text not null default 'test' check (visibility in ('test','public')),
  priority integer not null default 100,
  is_visible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.mission_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.mission_campaigns(id) on delete cascade,
  mission_type text not null check (mission_type in (
    'daily_checkin','profile_complete','community_post_create','market_listing_create',
    'shop_favorite_add','market_favorite_add','funymon_capture','event_entry'
  )),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text,
  target_count integer not null default 1 check (target_count between 1 and 100000),
  reward_coin bigint not null default 0 check (reward_coin between 0 and 1000000),
  cta_type text not null default 'route' check (cta_type in ('checkin','route','web','none')),
  cta_label text,
  cta_target text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_mission_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.mission_items(id) on delete cascade,
  period_key text not null,
  progress_count integer not null default 0 check (progress_count >= 0),
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  completed_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,mission_id,period_key)
);

create table if not exists public.mission_event_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  source_type text,
  source_id text,
  delta integer not null default 1 check (delta > 0),
  idempotency_key text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);

create table if not exists public.mission_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mission_campaigns_active_idx on public.mission_campaigns(status,visibility,starts_at,ends_at,priority);
create index if not exists mission_items_campaign_idx on public.mission_items(campaign_id,is_active,sort_order);
create index if not exists mission_items_type_idx on public.mission_items(mission_type,is_active);
create index if not exists user_mission_progress_user_idx on public.user_mission_progress(user_id,updated_at desc);
create index if not exists mission_event_logs_user_idx on public.mission_event_logs(user_id,occurred_at desc);
create index if not exists mission_admin_audit_logs_created_idx on public.mission_admin_audit_logs(created_at desc);

alter table public.mission_feature_settings enable row level security;
alter table public.mission_campaigns enable row level security;
alter table public.mission_items enable row level security;
alter table public.user_mission_progress enable row level security;
alter table public.mission_event_logs enable row level security;
alter table public.mission_admin_audit_logs enable row level security;

create or replace function public.is_my_feature_tester_user(p_user_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path=''
as $$
declare
  v_email text;
begin
  if p_user_id is null then return false; end if;
  if exists(select 1 from public.my_feature_testers t where t.user_id=p_user_id and t.is_active=true) then return true; end if;
  if exists(select 1 from public.admin_users a where a.user_id=p_user_id) then return true; end if;
  select lower(email) into v_email from auth.users where id=p_user_id;
  if v_email is null then return false; end if;
  return exists(select 1 from public.admin_accounts a where lower(a.email)=v_email and a.is_active=true);
end;
$$;

create or replace function public.mission_period_key(p_period_type text,p_at timestamptz default clock_timestamp())
returns text
language sql
stable
set search_path=''
as $$
  select case p_period_type
    when 'daily' then to_char(p_at at time zone 'Asia/Seoul','YYYY-MM-DD')
    when 'weekly' then to_char(p_at at time zone 'Asia/Seoul','IYYY-"W"IW')
    when 'monthly' then to_char(p_at at time zone 'Asia/Seoul','YYYY-MM')
    else to_char(p_at at time zone 'Asia/Seoul','YYYY-MM-DD')
  end;
$$;

create or replace function public.mission_apply_event_for_user(
  p_user_id uuid,
  p_event_type text,
  p_source_type text,
  p_source_id text,
  p_delta integer,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_settings public.mission_feature_settings%rowtype;
  v_is_tester boolean := false;
  v_log_id uuid;
  v_item record;
  v_period_key text;
  v_progress public.user_mission_progress%rowtype;
  v_wallet_balance bigint;
  v_ledger_id uuid;
  v_affected integer := 0;
  v_completed integer := 0;
  v_rewarded integer := 0;
begin
  if p_user_id is null or p_event_type is null or p_idempotency_key is null or greatest(coalesce(p_delta,1),1) < 1 then
    return jsonb_build_object('ok',false,'error','invalid_request');
  end if;

  select * into v_settings from public.mission_feature_settings where id=true;
  v_is_tester := public.is_my_feature_tester_user(p_user_id);
  if not coalesce(v_settings.public_enabled,false) and not v_is_tester then
    return jsonb_build_object('ok',false,'error','feature_hidden');
  end if;

  if not exists(
    select 1
    from public.mission_items mi
    join public.mission_campaigns mc on mc.id=mi.campaign_id
    where mi.is_active=true
      and mi.mission_type=p_event_type
      and mc.is_visible=true
      and mc.status='active'
      and p_occurred_at>=mc.starts_at and p_occurred_at<mc.ends_at
      and (mc.visibility='public' or v_is_tester)
  ) then
    return jsonb_build_object('ok',true,'matched',0,'completed',0,'rewarded_coin',0);
  end if;

  insert into public.mission_event_logs(
    user_id,event_type,source_type,source_id,delta,idempotency_key,occurred_at,metadata
  ) values (
    p_user_id,p_event_type,p_source_type,p_source_id,greatest(coalesce(p_delta,1),1),p_idempotency_key,p_occurred_at,coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict(user_id,idempotency_key) do nothing
  returning id into v_log_id;

  if v_log_id is null then
    return jsonb_build_object('ok',true,'duplicate',true,'matched',0,'completed',0,'rewarded_coin',0);
  end if;

  for v_item in
    select mi.*,mc.period_type,mc.title as campaign_title
    from public.mission_items mi
    join public.mission_campaigns mc on mc.id=mi.campaign_id
    where mi.is_active=true
      and mi.mission_type=p_event_type
      and mc.is_visible=true
      and mc.status='active'
      and p_occurred_at>=mc.starts_at and p_occurred_at<mc.ends_at
      and (mc.visibility='public' or v_is_tester)
    order by mc.priority,mi.sort_order,mi.id
  loop
    v_period_key := public.mission_period_key(v_item.period_type,p_occurred_at);

    insert into public.user_mission_progress(
      user_id,mission_id,period_key,progress_count,status,completed_at,updated_at
    ) values (
      p_user_id,v_item.id,v_period_key,
      least(v_item.target_count,greatest(coalesce(p_delta,1),1)),
      case when greatest(coalesce(p_delta,1),1)>=v_item.target_count then 'completed' else 'in_progress' end,
      case when greatest(coalesce(p_delta,1),1)>=v_item.target_count then p_occurred_at else null end,
      clock_timestamp()
    )
    on conflict(user_id,mission_id,period_key) do update
      set progress_count=least(v_item.target_count,public.user_mission_progress.progress_count+greatest(coalesce(p_delta,1),1)),
          status=case when least(v_item.target_count,public.user_mission_progress.progress_count+greatest(coalesce(p_delta,1),1))>=v_item.target_count then 'completed' else 'in_progress' end,
          completed_at=case
            when public.user_mission_progress.completed_at is not null then public.user_mission_progress.completed_at
            when least(v_item.target_count,public.user_mission_progress.progress_count+greatest(coalesce(p_delta,1),1))>=v_item.target_count then p_occurred_at
            else null
          end,
          updated_at=clock_timestamp()
    returning * into v_progress;

    v_affected := v_affected+1;
    if v_progress.status='completed' then
      v_completed := v_completed+1;
      if v_progress.rewarded_at is null then
        update public.user_mission_progress
        set rewarded_at=clock_timestamp(),updated_at=clock_timestamp()
        where user_id=p_user_id and mission_id=v_item.id and period_key=v_period_key and rewarded_at is null
        returning * into v_progress;

        if found and v_item.reward_coin>0 and coalesce(v_settings.reward_enabled,true) then
          insert into public.funy_coin_wallets(user_id,balance,version)
          values(p_user_id,0,0)
          on conflict(user_id) do nothing;

          select balance into v_wallet_balance
          from public.funy_coin_wallets
          where user_id=p_user_id
          for update;

          insert into public.funy_coin_ledger(
            user_id,amount,balance_after,transaction_type,source_type,source_id,
            idempotency_key,description,metadata
          ) values (
            p_user_id,v_item.reward_coin,v_wallet_balance+v_item.reward_coin,'mission_reward',
            'mission',v_item.id::text,
            'mission_reward:'||v_item.id::text||':'||p_user_id::text||':'||v_period_key,
            v_item.title||' 완료',
            jsonb_build_object('mission_id',v_item.id,'campaign_id',v_item.campaign_id,'period_key',v_period_key,'campaign_title',v_item.campaign_title)
          )
          on conflict(user_id,idempotency_key) do nothing
          returning id into v_ledger_id;

          if v_ledger_id is not null then
            update public.funy_coin_wallets
            set balance=balance+v_item.reward_coin,version=version+1,updated_at=clock_timestamp()
            where user_id=p_user_id;
            v_rewarded := v_rewarded+v_item.reward_coin;
          end if;
        end if;
      end if;
    end if;
  end loop;

  return jsonb_build_object('ok',true,'duplicate',false,'matched',v_affected,'completed',v_completed,'rewarded_coin',v_rewarded);
end;
$$;

create or replace function public.mission_checkin()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_key text;
begin
  if v_user is null then return jsonb_build_object('ok',false,'error','login_required'); end if;
  v_key:='daily_checkin:'||v_user::text||':'||to_char(clock_timestamp() at time zone 'Asia/Seoul','YYYY-MM-DD');
  return public.mission_apply_event_for_user(v_user,'daily_checkin','mission_checkin',to_char(clock_timestamp() at time zone 'Asia/Seoul','YYYY-MM-DD'),1,v_key,'{}'::jsonb,clock_timestamp());
end;
$$;

create or replace function public.get_my_dashboard_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_now timestamptz:=clock_timestamp();
  v_is_tester boolean:=false;
  v_settings public.mission_feature_settings%rowtype;
  v_coin_settings public.funy_coin_settings%rowtype;
  v_profile jsonb;
  v_balance bigint:=0;
  v_post_count integer:=0;
  v_listing_count integer:=0;
  v_shop_favorite_count integer:=0;
  v_market_favorite_count integer:=0;
  v_missions jsonb:='[]'::jsonb;
begin
  if v_user is null then return jsonb_build_object('ok',false,'error','login_required'); end if;

  v_is_tester:=public.is_my_feature_tester_user(v_user);
  select * into v_settings from public.mission_feature_settings where id=true;
  select * into v_coin_settings from public.funy_coin_settings where id=true;

  select jsonb_build_object(
    'nickname',p.nickname,'avatar_url',p.avatar_url,'created_at',coalesce(p.created_at,u.created_at)
  ) into v_profile
  from auth.users u
  left join public.profiles p on p.user_id=u.id
  where u.id=v_user;

  select count(*) into v_post_count from public.community_posts where user_id=v_user and status='published';
  select count(*) into v_listing_count from public.market_listings where seller_user_id=v_user and listing_status='active';
  select count(*) into v_shop_favorite_count from public.shop_favorites where user_id=v_user;
  select count(*) into v_market_favorite_count from public.market_listing_favorites where user_id=v_user;

  insert into public.funy_coin_wallets(user_id,balance,version) values(v_user,0,0) on conflict(user_id) do nothing;
  select balance into v_balance from public.funy_coin_wallets where user_id=v_user;

  if coalesce(v_settings.public_enabled,false) or v_is_tester then
    select coalesce(jsonb_agg(campaign_obj order by priority,starts_at,id),'[]'::jsonb)
    into v_missions
    from (
      select mc.id,mc.priority,mc.starts_at,
        jsonb_build_object(
          'id',mc.id,'title',mc.title,'description',mc.description,'period_type',mc.period_type,
          'period_key',public.mission_period_key(mc.period_type,v_now),'starts_at',mc.starts_at,'ends_at',mc.ends_at,
          'completed_count',(
            select count(*) from public.mission_items mi
            left join public.user_mission_progress ump on ump.mission_id=mi.id and ump.user_id=v_user and ump.period_key=public.mission_period_key(mc.period_type,v_now)
            where mi.campaign_id=mc.id and mi.is_active=true and coalesce(ump.status,'in_progress')='completed'
          ),
          'total_count',(select count(*) from public.mission_items mi where mi.campaign_id=mc.id and mi.is_active=true),
          'missions',coalesce((
            select jsonb_agg(jsonb_build_object(
              'id',mi.id,'mission_type',mi.mission_type,'title',mi.title,'description',mi.description,
              'target_count',mi.target_count,'reward_coin',mi.reward_coin,'cta_type',mi.cta_type,
              'cta_label',mi.cta_label,'cta_target',mi.cta_target,'sort_order',mi.sort_order,
              'progress_count',least(mi.target_count,coalesce(ump.progress_count,0)),
              'status',coalesce(ump.status,'in_progress'),'completed_at',ump.completed_at,'rewarded_at',ump.rewarded_at
            ) order by mi.sort_order,mi.id)
            from public.mission_items mi
            left join public.user_mission_progress ump on ump.mission_id=mi.id and ump.user_id=v_user and ump.period_key=public.mission_period_key(mc.period_type,v_now)
            where mi.campaign_id=mc.id and mi.is_active=true
          ),'[]'::jsonb)
        ) as campaign_obj
      from public.mission_campaigns mc
      where mc.is_visible=true and mc.status='active' and v_now>=mc.starts_at and v_now<mc.ends_at
        and (mc.visibility='public' or v_is_tester)
        and exists(select 1 from public.mission_items mi where mi.campaign_id=mc.id and mi.is_active=true)
    ) q;
  end if;

  return jsonb_build_object(
    'ok',true,'is_tester',v_is_tester,'profile',coalesce(v_profile,'{}'::jsonb),
    'activity',jsonb_build_object('post_count',v_post_count,'listing_count',v_listing_count,'shop_favorite_count',v_shop_favorite_count,'market_favorite_count',v_market_favorite_count,'favorite_count',v_shop_favorite_count+v_market_favorite_count),
    'funy_coin',jsonb_build_object('visible',coalesce(v_coin_settings.system_enabled,false) or v_is_tester,'balance',v_balance,'url','https://funypin.kr/my-funy-coin.html'),
    'mission_features',jsonb_build_object('visible',coalesce(v_settings.public_enabled,false) or v_is_tester,'reward_enabled',coalesce(v_settings.reward_enabled,true),'release_locked',coalesce(v_settings.release_locked,true)),
    'mission_campaigns',coalesce(v_missions,'[]'::jsonb)
  );
end;
$$;

drop policy if exists mission_campaigns_admin_all on public.mission_campaigns;
create policy mission_campaigns_admin_all on public.mission_campaigns for all to authenticated using(public.is_funypin_admin()) with check(public.is_funypin_admin());
drop policy if exists mission_items_admin_all on public.mission_items;
create policy mission_items_admin_all on public.mission_items for all to authenticated using(public.is_funypin_admin()) with check(public.is_funypin_admin());
drop policy if exists mission_progress_select_own on public.user_mission_progress;
create policy mission_progress_select_own on public.user_mission_progress for select to authenticated using(auth.uid()=user_id or public.is_funypin_admin());
drop policy if exists mission_event_logs_select_own on public.mission_event_logs;
create policy mission_event_logs_select_own on public.mission_event_logs for select to authenticated using(auth.uid()=user_id or public.is_funypin_admin());
drop policy if exists mission_feature_settings_admin_all on public.mission_feature_settings;
create policy mission_feature_settings_admin_all on public.mission_feature_settings for all to authenticated using(public.is_funypin_admin()) with check(public.is_funypin_admin());
drop policy if exists mission_audit_admin_select on public.mission_admin_audit_logs;
create policy mission_audit_admin_select on public.mission_admin_audit_logs for select to authenticated using(public.is_funypin_admin());

revoke all on function public.mission_apply_event_for_user(uuid,text,text,text,integer,text,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.mission_checkin() from public,anon,authenticated;
grant execute on function public.mission_checkin() to authenticated;
revoke all on function public.get_my_dashboard_v1() from public,anon,authenticated;
grant execute on function public.get_my_dashboard_v1() to authenticated;
revoke all on function public.is_my_feature_tester_user(uuid) from public,anon;
grant execute on function public.is_my_feature_tester_user(uuid) to authenticated;

commit;
