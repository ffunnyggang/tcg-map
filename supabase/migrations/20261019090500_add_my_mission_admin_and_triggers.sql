begin;

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
        'priority',c.priority,'is_visible',c.is_visible,'created_at',c.created_at,'updated_at',c.updated_at,
        'item_count',(select count(*) from public.mission_items i where i.campaign_id=c.id),
        'active_item_count',(select count(*) from public.mission_items i where i.campaign_id=c.id and i.is_active=true),
        'participant_count',(select count(distinct p.user_id) from public.user_mission_progress p join public.mission_items i on i.id=p.mission_id where i.campaign_id=c.id),
        'completion_count',(select count(*) from public.user_mission_progress p join public.mission_items i on i.id=p.mission_id where i.campaign_id=c.id and p.status='completed'),
        'rewarded_coin',coalesce((select sum(l.amount) from public.funy_coin_ledger l where l.transaction_type='mission_reward' and (l.metadata->>'campaign_id')::uuid=c.id),0)
      ) order by c.priority,c.created_at desc)
      from public.mission_campaigns c
    ),'[]'::jsonb),
    'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order,i.id) from public.mission_items i where p_campaign_id is not null and i.campaign_id=p_campaign_id),'[]'::jsonb),
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
        where p_campaign_id is null or c.id=p_campaign_id
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
  if v_period not in ('daily','weekly','monthly') or v_status not in ('draft','scheduled','active','paused','ended') or v_visibility not in ('test','public') then return jsonb_build_object('ok',false,'error','invalid_setting'); end if;
  if v_ends<=v_starts then return jsonb_build_object('ok',false,'error','invalid_period'); end if;
  if p_campaign_id is null then
    insert into public.mission_campaigns(title,description,period_type,starts_at,ends_at,status,visibility,priority,is_visible,created_by)
    values(btrim(coalesce(p_payload->>'title','')),nullif(btrim(coalesce(p_payload->>'description','')),''),v_period,v_starts,v_ends,v_status,v_visibility,coalesce((p_payload->>'priority')::integer,100),coalesce((p_payload->>'is_visible')::boolean,true),v_admin)
    returning * into v_saved;
    insert into public.mission_admin_audit_logs(admin_user_id,action,target_type,target_id,after_data) values(v_admin,'create_campaign','mission_campaign',v_saved.id::text,to_jsonb(v_saved));
  else
    select * into v_before from public.mission_campaigns where id=p_campaign_id for update;
    if not found then return jsonb_build_object('ok',false,'error','campaign_not_found'); end if;
    if exists(select 1 from public.user_mission_progress p join public.mission_items i on i.id=p.mission_id where i.campaign_id=p_campaign_id)
      and (v_before.period_type<>v_period or v_before.starts_at<>v_starts or v_before.ends_at<>v_ends) then return jsonb_build_object('ok',false,'error','campaign_config_locked'); end if;
    update public.mission_campaigns
    set title=btrim(coalesce(p_payload->>'title',v_before.title)),description=nullif(btrim(coalesce(p_payload->>'description',coalesce(v_before.description,''))),''),period_type=v_period,starts_at=v_starts,ends_at=v_ends,status=v_status,visibility=v_visibility,priority=coalesce((p_payload->>'priority')::integer,v_before.priority),is_visible=coalesce((p_payload->>'is_visible')::boolean,v_before.is_visible),updated_at=clock_timestamp()
    where id=p_campaign_id returning * into v_saved;
    insert into public.mission_admin_audit_logs(admin_user_id,action,target_type,target_id,before_data,after_data) values(v_admin,'update_campaign','mission_campaign',v_saved.id::text,to_jsonb(v_before),to_jsonb(v_saved));
  end if;
  return jsonb_build_object('ok',true,'campaign',to_jsonb(v_saved));
exception when check_violation or invalid_text_representation then return jsonb_build_object('ok',false,'error','invalid_payload');
end;
$$;

create or replace function public.admin_replace_mission_items(p_campaign_id uuid,p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin uuid:=auth.uid();
  v_before jsonb;
  v_count integer:=0;
  v_row jsonb;
begin
  if not public.is_funypin_admin() then return jsonb_build_object('ok',false,'error','admin_required'); end if;
  if not exists(select 1 from public.mission_campaigns where id=p_campaign_id) then return jsonb_build_object('ok',false,'error','campaign_not_found'); end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 then return jsonb_build_object('ok',false,'error','items_required'); end if;
  if exists(select 1 from public.user_mission_progress p join public.mission_items i on i.id=p.mission_id where i.campaign_id=p_campaign_id) then return jsonb_build_object('ok',false,'error','mission_config_locked'); end if;
  select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order,i.id),'[]'::jsonb) into v_before from public.mission_items i where i.campaign_id=p_campaign_id;
  delete from public.mission_items where campaign_id=p_campaign_id;
  for v_row in select value from jsonb_array_elements(p_items)
  loop
    insert into public.mission_items(campaign_id,mission_type,title,description,target_count,reward_coin,cta_type,cta_label,cta_target,sort_order,is_active)
    values(p_campaign_id,coalesce(nullif(v_row->>'mission_type',''),'daily_checkin'),btrim(coalesce(v_row->>'title','')),nullif(btrim(coalesce(v_row->>'description','')),''),greatest(1,coalesce((v_row->>'target_count')::integer,1)),greatest(0,coalesce((v_row->>'reward_coin')::bigint,0)),coalesce(nullif(v_row->>'cta_type',''),'route'),nullif(btrim(coalesce(v_row->>'cta_label','')),''),nullif(btrim(coalesce(v_row->>'cta_target','')),''),coalesce((v_row->>'sort_order')::integer,(v_count+1)*10),coalesce((v_row->>'is_active')::boolean,true));
    v_count:=v_count+1;
  end loop;
  update public.mission_campaigns set updated_at=clock_timestamp() where id=p_campaign_id;
  insert into public.mission_admin_audit_logs(admin_user_id,action,target_type,target_id,before_data,after_data) values(v_admin,'replace_items','mission_campaign',p_campaign_id::text,v_before,p_items);
  return jsonb_build_object('ok',true,'count',v_count);
exception when check_violation or invalid_text_representation then return jsonb_build_object('ok',false,'error','invalid_item');
end;
$$;

create or replace function public.admin_set_mission_campaign_status(p_campaign_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin uuid:=auth.uid();v_before public.mission_campaigns%rowtype;v_after public.mission_campaigns%rowtype;
begin
  if not public.is_funypin_admin() then return jsonb_build_object('ok',false,'error','admin_required'); end if;
  if p_status not in ('draft','scheduled','active','paused','ended') then return jsonb_build_object('ok',false,'error','invalid_status'); end if;
  select * into v_before from public.mission_campaigns where id=p_campaign_id for update;
  if not found then return jsonb_build_object('ok',false,'error','campaign_not_found'); end if;
  if p_status='active' and not exists(select 1 from public.mission_items where campaign_id=p_campaign_id and is_active=true) then return jsonb_build_object('ok',false,'error','items_required'); end if;
  update public.mission_campaigns set status=p_status,updated_at=clock_timestamp() where id=p_campaign_id returning * into v_after;
  insert into public.mission_admin_audit_logs(admin_user_id,action,target_type,target_id,before_data,after_data) values(v_admin,'set_status','mission_campaign',p_campaign_id::text,to_jsonb(v_before),to_jsonb(v_after));
  return jsonb_build_object('ok',true,'campaign',to_jsonb(v_after));
end;
$$;

create or replace function public.admin_update_mission_feature_settings(p_public_enabled boolean,p_reward_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin uuid:=auth.uid();v_before public.mission_feature_settings%rowtype;v_after public.mission_feature_settings%rowtype;
begin
  if not public.is_funypin_admin() then return jsonb_build_object('ok',false,'error','admin_required'); end if;
  select * into v_before from public.mission_feature_settings where id=true for update;
  update public.mission_feature_settings
  set public_enabled=case when coalesce(release_locked,true) then false else coalesce(p_public_enabled,false) end,reward_enabled=coalesce(p_reward_enabled,true),updated_at=clock_timestamp(),updated_by=v_admin
  where id=true returning * into v_after;
  insert into public.mission_admin_audit_logs(admin_user_id,action,target_type,target_id,before_data,after_data) values(v_admin,'update_settings','mission_settings','default',to_jsonb(v_before),to_jsonb(v_after));
  return jsonb_build_object('ok',true,'settings',to_jsonb(v_after));
end;
$$;

create or replace function public.mission_trigger_community_post() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published') then perform public.mission_apply_event_for_user(new.user_id,'community_post_create','community_post',new.id::text,1,'community_post:'||new.id::text,jsonb_build_object('category',new.category),coalesce(new.created_at,clock_timestamp())); end if;
  return new;
end;$$;
drop trigger if exists trg_mission_community_post on public.community_posts;
create trigger trg_mission_community_post after insert or update of status on public.community_posts for each row execute function public.mission_trigger_community_post();

create or replace function public.mission_trigger_market_listing() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.listing_status='active' and (tg_op='INSERT' or old.listing_status is distinct from 'active') then perform public.mission_apply_event_for_user(new.seller_user_id,'market_listing_create','market_listing',new.id::text,1,'market_listing:'||new.id::text,jsonb_build_object('listing_side',new.listing_side,'tcg_category',new.tcg_category),coalesce(new.created_at,clock_timestamp())); end if;
  return new;
end;$$;
drop trigger if exists trg_mission_market_listing on public.market_listings;
create trigger trg_mission_market_listing after insert or update of listing_status on public.market_listings for each row execute function public.mission_trigger_market_listing();

create or replace function public.mission_trigger_shop_favorite() returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.mission_apply_event_for_user(new.user_id,'shop_favorite_add','shop_favorite',new.shop_id,1,'shop_favorite:'||new.shop_id,jsonb_build_object('shop_id',new.shop_id),coalesce(new.created_at,clock_timestamp()));return new;end;$$;
drop trigger if exists trg_mission_shop_favorite on public.shop_favorites;
create trigger trg_mission_shop_favorite after insert on public.shop_favorites for each row execute function public.mission_trigger_shop_favorite();

create or replace function public.mission_trigger_market_favorite() returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.mission_apply_event_for_user(new.user_id,'market_favorite_add','market_listing_favorite',new.listing_id::text,1,'market_favorite:'||new.listing_id::text,jsonb_build_object('listing_id',new.listing_id),coalesce(new.created_at,clock_timestamp()));return new;end;$$;
drop trigger if exists trg_mission_market_favorite on public.market_listing_favorites;
create trigger trg_mission_market_favorite after insert on public.market_listing_favorites for each row execute function public.mission_trigger_market_favorite();

create or replace function public.mission_trigger_profile_complete() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if nullif(btrim(coalesce(new.nickname,'')),'') is not null and nullif(btrim(coalesce(new.avatar_url,'')),'') is not null and (tg_op='INSERT' or nullif(btrim(coalesce(old.nickname,'')),'') is null or nullif(btrim(coalesce(old.avatar_url,'')),'') is null) then perform public.mission_apply_event_for_user(new.user_id,'profile_complete','profile',new.user_id::text,1,'profile_complete:'||new.user_id::text,'{}'::jsonb,coalesce(new.updated_at,clock_timestamp())); end if;
  return new;
end;$$;
drop trigger if exists trg_mission_profile_complete on public.profiles;
create trigger trg_mission_profile_complete after insert or update of nickname,avatar_url on public.profiles for each row execute function public.mission_trigger_profile_complete();

create or replace function public.mission_trigger_funymon_capture() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.user_id is not null and new.result in ('caught','entry','winner') then perform public.mission_apply_event_for_user(new.user_id,'funymon_capture','funy_mon_catch',new.id::text,1,'funymon_capture:'||new.id::text,jsonb_build_object('monster_id',new.monster_id,'result',new.result,'event_id',new.event_id),coalesce(new.caught_at,clock_timestamp())); end if;
  return new;
end;$$;
drop trigger if exists trg_mission_funymon_capture on public.funy_mon_catches;
create trigger trg_mission_funymon_capture after insert on public.funy_mon_catches for each row execute function public.mission_trigger_funymon_capture();

create or replace function public.mission_trigger_event_entry() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='active' then perform public.mission_apply_event_for_user(new.user_id,'event_entry','user_entry',new.id::text,1,'event_entry:'||new.id::text,jsonb_build_object('source_type',new.source_type,'source_id',new.source_id),coalesce(new.created_at,clock_timestamp())); end if;
  return new;
end;$$;
drop trigger if exists trg_mission_event_entry on public.user_entries;
create trigger trg_mission_event_entry after insert on public.user_entries for each row execute function public.mission_trigger_event_entry();

revoke all on function public.admin_get_mission_dashboard(uuid) from public,anon,authenticated;
grant execute on function public.admin_get_mission_dashboard(uuid) to authenticated;
revoke all on function public.admin_save_mission_campaign(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_save_mission_campaign(uuid,jsonb) to authenticated;
revoke all on function public.admin_replace_mission_items(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_replace_mission_items(uuid,jsonb) to authenticated;
revoke all on function public.admin_set_mission_campaign_status(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_set_mission_campaign_status(uuid,text) to authenticated;
revoke all on function public.admin_update_mission_feature_settings(boolean,boolean) from public,anon,authenticated;
grant execute on function public.admin_update_mission_feature_settings(boolean,boolean) to authenticated;

commit;
