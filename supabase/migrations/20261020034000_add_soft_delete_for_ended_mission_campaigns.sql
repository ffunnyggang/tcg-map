begin;

alter table public.mission_campaigns
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists mission_campaigns_deleted_idx
  on public.mission_campaigns(deleted_at, status, priority);

create or replace function public.admin_soft_delete_mission_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin uuid:=auth.uid();
  v_before public.mission_campaigns%rowtype;
  v_after public.mission_campaigns%rowtype;
begin
  if not public.is_funypin_admin() then
    return jsonb_build_object('ok',false,'error','admin_required');
  end if;

  select * into v_before
  from public.mission_campaigns
  where id=p_campaign_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'error','campaign_not_found');
  end if;

  if v_before.deleted_at is not null then
    return jsonb_build_object('ok',true,'already_deleted',true);
  end if;

  if v_before.status <> 'ended' then
    return jsonb_build_object('ok',false,'error','ended_only');
  end if;

  update public.mission_campaigns
  set deleted_at=clock_timestamp(),
      deleted_by=v_admin,
      is_visible=false,
      visibility='test',
      updated_at=clock_timestamp()
  where id=p_campaign_id
  returning * into v_after;

  insert into public.mission_admin_audit_logs(
    admin_user_id,action,target_type,target_id,before_data,after_data
  ) values (
    v_admin,'soft_delete_campaign','mission_campaign',p_campaign_id::text,to_jsonb(v_before),to_jsonb(v_after)
  );

  return jsonb_build_object('ok',true,'campaign',to_jsonb(v_after));
end;
$$;

revoke all on function public.admin_soft_delete_mission_campaign(uuid) from public,anon,authenticated;
grant execute on function public.admin_soft_delete_mission_campaign(uuid) to authenticated;

create or replace function public.admin_get_mission_dashboard(p_campaign_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.is_funypin_admin() then
    return jsonb_build_object('ok',false,'error','admin_required');
  end if;

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
      where c.deleted_at is null
    ),'[]'::jsonb),
    'items',coalesce((
      select jsonb_agg(to_jsonb(i) order by i.sort_order,i.id)
      from public.mission_items i
      join public.mission_campaigns c on c.id=i.campaign_id
      where p_campaign_id is not null
        and i.campaign_id=p_campaign_id
        and c.deleted_at is null
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
        where c.deleted_at is null
          and (p_campaign_id is null or c.id=p_campaign_id)
        order by p.updated_at desc
        limit 200
      ) x
    ),'[]'::jsonb),
    'audit_logs',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'admin_user_id',x.admin_user_id,'admin_email',x.email,'action',x.action,
        'target_type',x.target_type,'target_id',x.target_id,'before_data',x.before_data,
        'after_data',x.after_data,'created_at',x.created_at
      ) order by x.created_at desc)
      from (
        select a.*,u.email
        from public.mission_admin_audit_logs a
        left join auth.users u on u.id=a.admin_user_id
        order by a.created_at desc
        limit 200
      ) x
    ),'[]'::jsonb)
  );
end;
$$;

commit;
