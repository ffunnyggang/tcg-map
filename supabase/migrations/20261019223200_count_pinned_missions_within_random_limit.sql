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
  v_pinned_count integer:=0;
  v_random_slots integer:=0;
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

    select count(*) into v_pinned_count
    from public.mission_items i
    where i.campaign_id=p_campaign_id
      and i.is_active=true
      and i.is_pinned=true;

    if exists(
      select 1 from public.mission_items i
      where i.id=p_item_id
        and i.campaign_id=p_campaign_id
        and i.is_active=true
        and i.is_pinned=true
    ) then return true; end if;

    v_random_slots:=greatest(0,coalesce(v_campaign.random_count,1)-v_pinned_count);
    if v_random_slots=0 then return false; end if;

    v_day_key:=to_char(p_at at time zone 'Asia/Seoul','YYYY-MM-DD');
    return exists(
      select 1 from (
        select i.id
        from public.mission_items i
        where i.campaign_id=p_campaign_id
          and i.is_active=true
          and coalesce(i.is_pinned,false)=false
        order by md5(p_campaign_id::text||':'||i.id::text||':'||v_day_key),i.id
        limit v_random_slots
      ) picked
      where picked.id=p_item_id
    );
  end if;

  return false;
end;
$$;
