alter table public.mission_items
  add column if not exists is_pinned boolean not null default false;

alter table public.mission_items drop constraint if exists mission_items_mission_type_check;
alter table public.mission_items add constraint mission_items_mission_type_check check (mission_type in (
  'daily_checkin','profile_complete','community_post_create','community_comment_create','community_post_like',
  'market_listing_create','shop_favorite_add','market_favorite_add','shop_visit_checkin',
  'funymon_capture','event_entry','garapon_participation'
));

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
    return exists(select 1 from public.mission_items i
      where i.id=p_item_id and i.campaign_id=p_campaign_id and i.is_active=true);
  end if;

  if v_campaign.display_mode='random_daily' then
    if v_campaign.period_type<>'daily' then return false; end if;

    if exists(select 1 from public.mission_items i
      where i.id=p_item_id and i.campaign_id=p_campaign_id and i.is_active=true and i.is_pinned=true)
    then return true; end if;

    v_day_key:=to_char(p_at at time zone 'Asia/Seoul','YYYY-MM-DD');
    return exists(
      select 1 from (
        select i.id
        from public.mission_items i
        where i.campaign_id=p_campaign_id
          and i.is_active=true
          and coalesce(i.is_pinned,false)=false
        order by md5(p_campaign_id::text||':'||i.id::text||':'||v_day_key),i.id
        limit greatest(1,coalesce(v_campaign.random_count,1))
      ) picked
      where picked.id=p_item_id
    );
  end if;

  return false;
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
  if not exists(select 1 from public.mission_campaigns where id=p_campaign_id and deleted_at is null)
    then return jsonb_build_object('ok',false,'error','campaign_not_found'); end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1
    then return jsonb_build_object('ok',false,'error','items_required'); end if;
  if exists(select 1 from public.user_mission_progress p
    join public.mission_items i on i.id=p.mission_id
    where i.campaign_id=p_campaign_id)
    then return jsonb_build_object('ok',false,'error','mission_config_locked'); end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order,i.id),'[]'::jsonb)
  into v_before from public.mission_items i where i.campaign_id=p_campaign_id;

  delete from public.mission_items where campaign_id=p_campaign_id;

  for v_row in select value from jsonb_array_elements(p_items)
  loop
    insert into public.mission_items(
      campaign_id,mission_type,title,description,target_count,reward_coin,
      cta_type,cta_label,cta_target,sort_order,is_active,is_pinned
    ) values (
      p_campaign_id,
      coalesce(nullif(v_row->>'mission_type',''),'daily_checkin'),
      btrim(coalesce(v_row->>'title','')),
      nullif(btrim(coalesce(v_row->>'description','')),''),
      greatest(1,coalesce((v_row->>'target_count')::integer,1)),
      greatest(0,coalesce((v_row->>'reward_coin')::bigint,0)),
      coalesce(nullif(v_row->>'cta_type',''),'route'),
      nullif(btrim(coalesce(v_row->>'cta_label','')),''),
      nullif(btrim(coalesce(v_row->>'cta_target','')),''),
      coalesce((v_row->>'sort_order')::integer,(v_count+1)*10),
      coalesce((v_row->>'is_active')::boolean,true),
      coalesce((v_row->>'is_pinned')::boolean,false)
    );
    v_count:=v_count+1;
  end loop;

  update public.mission_campaigns set updated_at=clock_timestamp() where id=p_campaign_id;
  insert into public.mission_admin_audit_logs(admin_user_id,action,target_type,target_id,before_data,after_data)
  values(v_admin,'replace_items','mission_campaign',p_campaign_id::text,v_before,p_items);
  return jsonb_build_object('ok',true,'count',v_count);
exception when check_violation or invalid_text_representation then
  return jsonb_build_object('ok',false,'error','invalid_item');
end;
$$;

create or replace function public.mission_trigger_community_comment()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.user_id is not null and new.status='published' then
    perform public.mission_apply_event_for_user(
      new.user_id,'community_comment_create','community_comment',new.id::text,1,
      'community_comment:'||new.id::text,
      jsonb_build_object('post_id',new.post_id),
      coalesce(new.created_at,clock_timestamp())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mission_community_comment on public.community_comments;
create trigger trg_mission_community_comment
after insert on public.community_comments
for each row execute function public.mission_trigger_community_comment();

create or replace function public.mission_trigger_community_post_like()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform public.mission_apply_event_for_user(
    new.user_id,'community_post_like','community_post_like',new.post_id::text,1,
    'community_post_like:'||new.post_id::text||':'||new.user_id::text,
    jsonb_build_object('post_id',new.post_id),
    coalesce(new.created_at,clock_timestamp())
  );
  return new;
end;
$$;

drop trigger if exists trg_mission_community_post_like on public.community_post_likes;
create trigger trg_mission_community_post_like
after insert on public.community_post_likes
for each row execute function public.mission_trigger_community_post_like();

create or replace function public.mission_trigger_garapon_participation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.user_id is not null
     and new.status='completed'
     and (tg_op='INSERT' or old.status is distinct from 'completed')
  then
    perform public.mission_apply_event_for_user(
      new.user_id,'garapon_participation','garapon_participation',new.id::text,1,
      'garapon_participation:'||new.id::text,
      jsonb_build_object('event_id',new.event_id,'coin_cost',new.coin_cost),
      coalesce(new.completed_at,new.created_at,clock_timestamp())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mission_garapon_participation on public.garapon_participations;
create trigger trg_mission_garapon_participation
after insert or update of status on public.garapon_participations
for each row execute function public.mission_trigger_garapon_participation();
