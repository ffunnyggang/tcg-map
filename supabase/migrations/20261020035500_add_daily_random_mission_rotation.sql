begin;

alter table public.mission_campaigns
  add column if not exists display_mode text not null default 'all',
  add column if not exists random_count integer;

alter table public.mission_campaigns drop constraint if exists mission_campaigns_display_mode_check;
alter table public.mission_campaigns add constraint mission_campaigns_display_mode_check
  check (display_mode in ('all','random_daily'));

alter table public.mission_campaigns drop constraint if exists mission_campaigns_random_count_check;
alter table public.mission_campaigns add constraint mission_campaigns_random_count_check
  check (random_count is null or random_count between 1 and 100);

create or replace function public.mission_item_is_selected(
  p_campaign_id uuid,
  p_item_id uuid,
  p_at timestamptz default clock_timestamp()
)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_campaign public.mission_campaigns%rowtype;
  v_day_key text;
begin
  select * into v_campaign from public.mission_campaigns where id=p_campaign_id;
  if not found or v_campaign.deleted_at is not null then return false; end if;

  if coalesce(v_campaign.display_mode,'all')='all' then
    return exists(
      select 1 from public.mission_items i
      where i.id=p_item_id and i.campaign_id=p_campaign_id and i.is_active=true
    );
  end if;

  if v_campaign.display_mode='random_daily' then
    if v_campaign.period_type<>'daily' then return false; end if;
    v_day_key:=to_char(p_at at time zone 'Asia/Seoul','YYYY-MM-DD');
    return exists(
      select 1
      from (
        select i.id
        from public.mission_items i
        where i.campaign_id=p_campaign_id and i.is_active=true
        order by md5(p_campaign_id::text||':'||i.id::text||':'||v_day_key),i.id
        limit greatest(1,coalesce(v_campaign.random_count,1))
      ) picked
      where picked.id=p_item_id
    );
  end if;

  return false;
end;
$$;

revoke all on function public.mission_item_is_selected(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.mission_item_is_selected(uuid,uuid,timestamptz) to authenticated;

create or replace function public.admin_save_mission_campaign(p_campaign_id uuid,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin uuid:=auth.uid();
  v_settings public.mission_feature_settings%rowtype;
  v_before public.mission_campaigns%rowtype;
  v_saved public.mission_campaigns%rowtype;
  v_visibility text;
  v_period text;
  v_status text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_display_mode text;
  v_random_count integer;
begin
  if not public.is_funypin_admin() then return jsonb_build_object('ok',false,'error','admin_required'); end if;
  if p_payload is null then return jsonb_build_object('ok',false,'error','invalid_payload'); end if;

  select * into v_settings from public.mission_feature_settings where id=true;
  v_visibility:=coalesce(nullif(p_payload->>'visibility',''),'test');
  if coalesce(v_settings.release_locked,true) then v_visibility:='test'; end if;
  v_period:=coalesce(nullif(p_payload->>'period_type',''),'daily');
  v_status:=coalesce(nullif(p_payload->>'status',''),'draft');
  v_starts:=coalesce(nullif(p_payload->>'starts_at','')::timestamptz,clock_timestamp());
  v_ends:=coalesce(nullif(p_payload->>'ends_at','')::timestamptz,clock_timestamp()+interval '7 days');
  v_display_mode:=coalesce(nullif(p_payload->>'display_mode',''),'all');
  v_random_count:=case when v_display_mode='random_daily'
    then greatest(1,least(100,coalesce(nullif(p_payload->>'random_count','')::integer,1)))
    else null end;

  if v_period not in ('daily','weekly','monthly')
     or v_status not in ('draft','scheduled','active','paused','ended')
     or v_visibility not in ('test','public')
     or v_display_mode not in ('all','random_daily') then
    return jsonb_build_object('ok',false,'error','invalid_setting');
  end if;
  if v_display_mode='random_daily' and v_period<>'daily' then
    return jsonb_build_object('ok',false,'error','random_daily_requires_daily');
  end if;
  if v_ends<=v_starts then return jsonb_build_object('ok',false,'error','invalid_period'); end if;

  if p_campaign_id is null then
    insert into public.mission_campaigns(
      title,description,period_type,starts_at,ends_at,status,visibility,priority,is_visible,created_by,
      display_mode,random_count
    ) values (
      btrim(coalesce(p_payload->>'title','')),
      nullif(btrim(coalesce(p_payload->>'description','')),''),
      v_period,v_starts,v_ends,v_status,v_visibility,
      coalesce((p_payload->>'priority')::integer,100),
      coalesce((p_payload->>'is_visible')::boolean,true),v_admin,
      v_display_mode,v_random_count
    ) returning * into v_saved;
    insert into public.mission_admin_audit_logs(admin_user_id,action,target_type,target_id,after_data)
    values(v_admin,'create_campaign','mission_campaign',v_saved.id::text,to_jsonb(v_saved));
  else
    select * into v_before
    from public.mission_campaigns
    where id=p_campaign_id and deleted_at is null
    for update;
    if not found then return jsonb_build_object('ok',false,'error','campaign_not_found'); end if;

    if exists(
      select 1 from public.user_mission_progress p
      join public.mission_items i on i.id=p.mission_id
      where i.campaign_id=p_campaign_id
    ) and (
      v_before.period_type<>v_period
      or v_before.starts_at<>v_starts
      or v_before.ends_at<>v_ends
      or coalesce(v_before.display_mode,'all')<>v_display_mode
      or coalesce(v_before.random_count,0)<>coalesce(v_random_count,0)
    ) then
      return jsonb_build_object('ok',false,'error','campaign_config_locked');
    end if;

    update public.mission_campaigns
    set title=btrim(coalesce(p_payload->>'title',v_before.title)),
        description=nullif(btrim(coalesce(p_payload->>'description',coalesce(v_before.description,''))),''),
        period_type=v_period,starts_at=v_starts,ends_at=v_ends,status=v_status,visibility=v_visibility,
        priority=coalesce((p_payload->>'priority')::integer,v_before.priority),
        is_visible=coalesce((p_payload->>'is_visible')::boolean,v_before.is_visible),
        display_mode=v_display_mode,random_count=v_random_count,updated_at=clock_timestamp()
    where id=p_campaign_id returning * into v_saved;

    insert into public.mission_admin_audit_logs(admin_user_id,action,target_type,target_id,before_data,after_data)
    values(v_admin,'update_campaign','mission_campaign',v_saved.id::text,to_jsonb(v_before),to_jsonb(v_saved));
  end if;

  return jsonb_build_object('ok',true,'campaign',to_jsonb(v_saved));
exception when check_violation or invalid_text_representation then
  return jsonb_build_object('ok',false,'error','invalid_payload');
end;
$$;

-- Only missions selected for the current KST day receive progress/rewards.
create or replace function public.mission_apply_event_for_user(
  p_user_id uuid,p_event_type text,p_source_type text,p_source_id text,p_delta integer,
  p_idempotency_key text,p_metadata jsonb default '{}'::jsonb,p_occurred_at timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_settings public.mission_feature_settings%rowtype;
  v_is_tester boolean:=false;
  v_log_id uuid;
  v_item record;
  v_period_key text;
  v_progress public.user_mission_progress%rowtype;
  v_wallet_balance bigint;
  v_ledger_id uuid;
  v_affected integer:=0;
  v_completed integer:=0;
  v_rewarded integer:=0;
begin
  if p_user_id is null or p_event_type is null or p_idempotency_key is null or greatest(coalesce(p_delta,1),1)<1 then
    return jsonb_build_object('ok',false,'error','invalid_request');
  end if;
  select * into v_settings from public.mission_feature_settings where id=true;
  v_is_tester:=public.is_my_feature_tester_user(p_user_id);
  if not coalesce(v_settings.public_enabled,false) and not v_is_tester then
    return jsonb_build_object('ok',false,'error','feature_hidden');
  end if;

  if not exists(
    select 1 from public.mission_items mi
    join public.mission_campaigns mc on mc.id=mi.campaign_id
    where mi.is_active=true and mi.mission_type=p_event_type
      and mc.deleted_at is null and mc.is_visible=true and mc.status='active'
      and p_occurred_at>=mc.starts_at and p_occurred_at<mc.ends_at
      and (mc.visibility='public' or v_is_tester)
      and public.mission_item_is_selected(mc.id,mi.id,p_occurred_at)
  ) then return jsonb_build_object('ok',true,'matched',0,'completed',0,'rewarded_coin',0); end if;

  insert into public.mission_event_logs(user_id,event_type,source_type,source_id,delta,idempotency_key,occurred_at,metadata)
  values(p_user_id,p_event_type,p_source_type,p_source_id,greatest(coalesce(p_delta,1),1),p_idempotency_key,p_occurred_at,coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,idempotency_key) do nothing returning id into v_log_id;
  if v_log_id is null then return jsonb_build_object('ok',true,'duplicate',true,'matched',0,'completed',0,'rewarded_coin',0); end if;

  for v_item in
    select mi.*,mc.period_type,mc.title as campaign_title
    from public.mission_items mi
    join public.mission_campaigns mc on mc.id=mi.campaign_id
    where mi.is_active=true and mi.mission_type=p_event_type
      and mc.deleted_at is null and mc.is_visible=true and mc.status='active'
      and p_occurred_at>=mc.starts_at and p_occurred_at<mc.ends_at
      and (mc.visibility='public' or v_is_tester)
      and public.mission_item_is_selected(mc.id,mi.id,p_occurred_at)
    order by mc.priority,mi.sort_order,mi.id
  loop
    v_period_key:=public.mission_period_key(v_item.period_type,p_occurred_at);
    insert into public.user_mission_progress(user_id,mission_id,period_key,progress_count,status,completed_at,updated_at)
    values(
      p_user_id,v_item.id,v_period_key,
      least(v_item.target_count,greatest(coalesce(p_delta,1),1)),
      case when greatest(coalesce(p_delta,1),1)>=v_item.target_count then 'completed' else 'in_progress' end,
      case when greatest(coalesce(p_delta,1),1)>=v_item.target_count then p_occurred_at else null end,
      clock_timestamp()
    )
    on conflict(user_id,mission_id,period_key) do update set
      progress_count=least(v_item.target_count,public.user_mission_progress.progress_count+greatest(coalesce(p_delta,1),1)),
      status=case when least(v_item.target_count,public.user_mission_progress.progress_count+greatest(coalesce(p_delta,1),1))>=v_item.target_count then 'completed' else 'in_progress' end,
      completed_at=case
        when public.user_mission_progress.completed_at is not null then public.user_mission_progress.completed_at
        when least(v_item.target_count,public.user_mission_progress.progress_count+greatest(coalesce(p_delta,1),1))>=v_item.target_count then p_occurred_at
        else null end,
      updated_at=clock_timestamp()
    returning * into v_progress;

    v_affected:=v_affected+1;
    if v_progress.status='completed' then
      v_completed:=v_completed+1;
      if v_progress.rewarded_at is null then
        update public.user_mission_progress
        set rewarded_at=clock_timestamp(),updated_at=clock_timestamp()
        where user_id=p_user_id and mission_id=v_item.id and period_key=v_period_key and rewarded_at is null
        returning * into v_progress;
        if found and v_item.reward_coin>0 and coalesce(v_settings.reward_enabled,true) then
          insert into public.funy_coin_wallets(user_id,balance,version) values(p_user_id,0,0) on conflict(user_id) do nothing;
          select balance into v_wallet_balance from public.funy_coin_wallets where user_id=p_user_id for update;
          insert into public.funy_coin_ledger(
            user_id,amount,balance_after,transaction_type,source_type,source_id,idempotency_key,description,metadata
          ) values(
            p_user_id,v_item.reward_coin,v_wallet_balance+v_item.reward_coin,'mission_reward','mission',v_item.id::text,
            'mission_reward:'||v_item.id::text||':'||p_user_id::text||':'||v_period_key,
            v_item.title||' 완료',
            jsonb_build_object('mission_id',v_item.id,'campaign_id',v_item.campaign_id,'period_key',v_period_key,'campaign_title',v_item.campaign_title)
          )
          on conflict(user_id,idempotency_key) do nothing returning id into v_ledger_id;
          if v_ledger_id is not null then
            update public.funy_coin_wallets set balance=balance+v_item.reward_coin,version=version+1,updated_at=clock_timestamp() where user_id=p_user_id;
            v_rewarded:=v_rewarded+v_item.reward_coin;
          end if;
        end if;
      end if;
    end if;
  end loop;
  return jsonb_build_object('ok',true,'duplicate',false,'matched',v_affected,'completed',v_completed,'rewarded_coin',v_rewarded);
end;
$$;

-- Keep the existing native/web MY payload contract; only the missions array is filtered.
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

  select jsonb_build_object('nickname',p.nickname,'avatar_url',p.avatar_url,'created_at',coalesce(p.created_at,u.created_at))
  into v_profile from auth.users u left join public.profiles p on p.user_id=u.id where u.id=v_user;

  select count(*) into v_post_count from public.community_posts where user_id=v_user and status='published';
  select count(*) into v_listing_count from public.market_listings where seller_user_id=v_user and listing_status='active';
  select count(*) into v_shop_favorite_count from public.shop_favorites where user_id=v_user;
  select count(*) into v_market_favorite_count from public.market_listing_favorites where user_id=v_user;

  insert into public.funy_coin_wallets(user_id,balance,version) values(v_user,0,0) on conflict(user_id) do nothing;
  select balance into v_balance from public.funy_coin_wallets where user_id=v_user;

  if coalesce(v_settings.public_enabled,false) or v_is_tester then
    select coalesce(jsonb_agg(campaign_obj order by priority,starts_at,id),'[]'::jsonb) into v_missions
    from (
      select mc.id,mc.priority,mc.starts_at,
        jsonb_build_object(
          'id',mc.id,'title',mc.title,'description',mc.description,'period_type',mc.period_type,
          'period_key',public.mission_period_key(mc.period_type,v_now),'starts_at',mc.starts_at,'ends_at',mc.ends_at,
          'display_mode',mc.display_mode,'random_count',mc.random_count,
          'completed_count',(
            select count(*) from public.mission_items mi
            left join public.user_mission_progress ump
              on ump.mission_id=mi.id and ump.user_id=v_user and ump.period_key=public.mission_period_key(mc.period_type,v_now)
            where mi.campaign_id=mc.id and mi.is_active=true
              and public.mission_item_is_selected(mc.id,mi.id,v_now)
              and coalesce(ump.status,'in_progress')='completed'
          ),
          'total_count',(
            select count(*) from public.mission_items mi
            where mi.campaign_id=mc.id and mi.is_active=true
              and public.mission_item_is_selected(mc.id,mi.id,v_now)
          ),
          'missions',coalesce((
            select jsonb_agg(jsonb_build_object(
              'id',mi.id,'mission_type',mi.mission_type,'title',mi.title,'description',mi.description,
              'target_count',mi.target_count,'reward_coin',mi.reward_coin,'cta_type',mi.cta_type,
              'cta_label',mi.cta_label,'cta_target',mi.cta_target,'sort_order',mi.sort_order,
              'progress_count',least(mi.target_count,coalesce(ump.progress_count,0)),
              'status',coalesce(ump.status,'in_progress'),'completed_at',ump.completed_at,'rewarded_at',ump.rewarded_at
            ) order by mi.sort_order,mi.id)
            from public.mission_items mi
            left join public.user_mission_progress ump
              on ump.mission_id=mi.id and ump.user_id=v_user and ump.period_key=public.mission_period_key(mc.period_type,v_now)
            where mi.campaign_id=mc.id and mi.is_active=true and public.mission_item_is_selected(mc.id,mi.id,v_now)
          ),'[]'::jsonb)
        ) as campaign_obj
      from public.mission_campaigns mc
      where mc.deleted_at is null and mc.is_visible=true and mc.status='active'
        and v_now>=mc.starts_at and v_now<mc.ends_at and (mc.visibility='public' or v_is_tester)
        and exists(
          select 1 from public.mission_items mi
          where mi.campaign_id=mc.id and mi.is_active=true and public.mission_item_is_selected(mc.id,mi.id,v_now)
        )
    ) q;
  end if;

  return jsonb_build_object(
    'ok',true,'is_tester',v_is_tester,'profile',coalesce(v_profile,'{}'::jsonb),
    'activity',jsonb_build_object(
      'post_count',v_post_count,'listing_count',v_listing_count,
      'shop_favorite_count',v_shop_favorite_count,'market_favorite_count',v_market_favorite_count,
      'favorite_count',v_shop_favorite_count+v_market_favorite_count
    ),
    'funy_coin',jsonb_build_object(
      'visible',coalesce(v_coin_settings.system_enabled,false) or v_is_tester,
      'balance',v_balance,'url','https://funypin.kr/my-funy-coin.html'
    ),
    'mission_features',jsonb_build_object(
      'visible',coalesce(v_settings.public_enabled,false) or v_is_tester,
      'reward_enabled',coalesce(v_settings.reward_enabled,true),
      'release_locked',coalesce(v_settings.release_locked,true)
    ),
    'mission_campaigns',coalesce(v_missions,'[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_mission_dashboard(p_campaign_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.is_funypin_admin() then return jsonb_build_object('ok',false,'error','admin_required'); end if;

  return jsonb_build_object(
    'ok',true,
    'settings',(select to_jsonb(s) from public.mission_feature_settings s where s.id=true),
    'campaigns',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'title',c.title,'description',c.description,'period_type',c.period_type,
        'starts_at',c.starts_at,'ends_at',c.ends_at,'status',c.status,'visibility',c.visibility,
        'priority',c.priority,'is_visible',c.is_visible,'display_mode',c.display_mode,'random_count',c.random_count,
        'created_at',c.created_at,'updated_at',c.updated_at,
        'item_count',(select count(*) from public.mission_items i where i.campaign_id=c.id),
        'active_item_count',(select count(*) from public.mission_items i where i.campaign_id=c.id and i.is_active=true),
        'today_selected_count',(select count(*) from public.mission_items i where i.campaign_id=c.id and i.is_active=true and public.mission_item_is_selected(c.id,i.id,clock_timestamp())),
        'participant_count',(select count(distinct p.user_id) from public.user_mission_progress p join public.mission_items i on i.id=p.mission_id where i.campaign_id=c.id),
        'completion_count',(select count(*) from public.user_mission_progress p join public.mission_items i on i.id=p.mission_id where i.campaign_id=c.id and p.status='completed'),
        'rewarded_coin',coalesce((select sum(l.amount) from public.funy_coin_ledger l where l.transaction_type='mission_reward' and (l.metadata->>'campaign_id')::uuid=c.id),0)
      ) order by c.priority,c.created_at desc)
      from public.mission_campaigns c where c.deleted_at is null
    ),'[]'::jsonb),
    'items',coalesce((
      select jsonb_agg(
        to_jsonb(i)||jsonb_build_object('selected_today',public.mission_item_is_selected(i.campaign_id,i.id,clock_timestamp()))
        order by i.sort_order,i.id
      )
      from public.mission_items i
      join public.mission_campaigns c on c.id=i.campaign_id
      where p_campaign_id is not null and i.campaign_id=p_campaign_id and c.deleted_at is null
    ),'[]'::jsonb),
    'recent_progress',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',x.user_id,'email',x.email,'mission_id',x.mission_id,'mission_title',x.mission_title,
        'campaign_title',x.campaign_title,'period_key',x.period_key,'progress_count',x.progress_count,
        'target_count',x.target_count,'status',x.status,'completed_at',x.completed_at,
        'rewarded_at',x.rewarded_at,'updated_at',x.updated_at
      ) order by x.updated_at desc)
      from (
        select p.*,u.email,i.title as mission_title,i.target_count,c.title as campaign_title
        from public.user_mission_progress p
        join public.mission_items i on i.id=p.mission_id
        join public.mission_campaigns c on c.id=i.campaign_id
        left join auth.users u on u.id=p.user_id
        where c.deleted_at is null and (p_campaign_id is null or c.id=p_campaign_id)
        order by p.updated_at desc limit 200
      ) x
    ),'[]'::jsonb),
    'audit_logs',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'admin_user_id',x.admin_user_id,'admin_email',x.email,'action',x.action,
        'target_type',x.target_type,'target_id',x.target_id,'before_data',x.before_data,
        'after_data',x.after_data,'created_at',x.created_at
      ) order by x.created_at desc)
      from (
        select a.*,u.email from public.mission_admin_audit_logs a
        left join auth.users u on u.id=a.admin_user_id
        order by a.created_at desc limit 200
      ) x
    ),'[]'::jsonb)
  );
end;
$$;

commit;
