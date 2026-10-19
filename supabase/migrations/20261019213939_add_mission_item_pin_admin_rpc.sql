create or replace function public.admin_set_mission_item_pinned(
  p_mission_id uuid,
  p_is_pinned boolean
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin uuid:=auth.uid();
  v_before public.mission_items%rowtype;
  v_after public.mission_items%rowtype;
begin
  if not public.is_funypin_admin() then
    return jsonb_build_object('ok',false,'error','admin_required');
  end if;

  select i.* into v_before
  from public.mission_items i
  join public.mission_campaigns c on c.id=i.campaign_id
  where i.id=p_mission_id
    and c.deleted_at is null
  for update;

  if not found then
    return jsonb_build_object('ok',false,'error','mission_not_found');
  end if;

  update public.mission_items
  set is_pinned=coalesce(p_is_pinned,false),
      updated_at=clock_timestamp()
  where id=p_mission_id
  returning * into v_after;

  insert into public.mission_admin_audit_logs(
    admin_user_id,action,target_type,target_id,before_data,after_data
  ) values (
    v_admin,'set_item_pinned','mission_item',p_mission_id::text,to_jsonb(v_before),to_jsonb(v_after)
  );

  return jsonb_build_object('ok',true,'item',to_jsonb(v_after));
end;
$$;

revoke all on function public.admin_set_mission_item_pinned(uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_set_mission_item_pinned(uuid,boolean) to authenticated;
