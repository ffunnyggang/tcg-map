CREATE OR REPLACE FUNCTION public.submit_funymon_event_entry(p_campaign_id text, p_instagram_id text, p_client_id text, p_claim_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_campaign public.event_campaigns%rowtype;
  v_instagram text := lower(regexp_replace(trim(coalesce(p_instagram_id,'')), '^@', ''));
  v_client text := trim(coalesce(p_client_id,''));
  v_claim text := trim(coalesce(p_claim_code,''));
  v_total integer := 0;
  v_today integer := 0;
  v_account_total integer := 0;
  v_account_today integer := 0;
  v_limit integer := 1;
  v_mode text := 'total';
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_catch_id uuid;
  v_user_id uuid;
  v_monster_id text;
  v_shop_id text;
begin
  if p_campaign_id is null or trim(p_campaign_id) = '' then
    return jsonb_build_object('ok',false,'error','campaign_unavailable');
  end if;
  if v_instagram !~ '^[a-z0-9._]{1,30}$' then
    return jsonb_build_object('ok',false,'error','invalid_instagram_id');
  end if;
  if v_client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok',false,'error','invalid_client_id');
  end if;
  if v_claim = '' then
    return jsonb_build_object('ok',false,'error','missing_claim_code');
  end if;

  select *
    into v_campaign
  from public.event_campaigns
  where id = p_campaign_id
    and status = 'active'
  limit 1;

  if not found then return jsonb_build_object('ok',false,'error','campaign_unavailable'); end if;
  if now() < v_campaign.starts_at then return jsonb_build_object('ok',false,'error','campaign_not_started'); end if;
  if now() > v_campaign.ends_at then return jsonb_build_object('ok',false,'error','campaign_ended'); end if;

  select c.id,c.user_id,c.monster_id,c.shop_id
    into v_catch_id,v_user_id,v_monster_id,v_shop_id
  from public.funy_mon_catches c
  join public.funy_mon_rewards r on r.id = c.reward_id
  where c.claim_code = v_claim
    and c.anonymous_id::text = v_client
    and c.reward_type_snapshot = 'entry'
    and r.reward_type = 'entry'
    and r.entry_campaign_id = p_campaign_id
  limit 1;

  if not found then return jsonb_build_object('ok',false,'error','invalid_claim_code'); end if;

  -- The account comes from the server-issued catch, never a caller-supplied ID.
  -- Preserve the legacy anonymous RPC flow, but reject a mismatched signed-in account.
  if auth.uid() is not null and v_user_id is not null and auth.uid() <> v_user_id then
    return jsonb_build_object('ok',false,'error','invalid_claim_code');
  end if;

  -- Acquire account before Instagram, in the same order for every request.
  -- Different Instagram IDs submitted concurrently by one account serialize here.
  if v_user_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('funymon-entry-user:' || p_campaign_id || ':' || v_user_id::text, 0)
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_campaign_id || ':' || v_instagram, 0)
  );

  if exists (
    select 1 from public.live_reports
    where entry_claim_code = v_claim and status = 'EVENT_ENTRY'
  ) then
    return jsonb_build_object('ok',false,'error','already_submitted');
  end if;

  v_mode := coalesce(v_campaign.entry_limit_mode,'total');
  v_limit := greatest(1,coalesce(v_campaign.entry_limit_count,1));
  v_day_start := (v_day::timestamp at time zone 'Asia/Seoul');
  v_day_end := ((v_day + 1)::timestamp at time zone 'Asia/Seoul');

  select count(*) into v_total
  from public.live_reports
  where shop_id = p_campaign_id
    and status = 'EVENT_ENTRY'
    and lower(content) = v_instagram;

  select count(*) into v_today
  from public.live_reports
  where shop_id = p_campaign_id
    and status = 'EVENT_ENTRY'
    and lower(content) = v_instagram
    and created_at >= v_day_start
    and created_at < v_day_end;

  -- Count successful submissions, including those made before this change.
  -- A caught/issued but unsubmitted ticket does not consume an entry.
  if v_user_id is not null then
    select count(*),
           count(*) filter (where e.created_at >= v_day_start and e.created_at < v_day_end)
      into v_account_total, v_account_today
    from public.live_reports e
    join public.funy_mon_catches c on c.claim_code = e.entry_claim_code
    where e.shop_id = p_campaign_id
      and e.status = 'EVENT_ENTRY'
      and c.user_id = v_user_id;

    if v_mode = 'total' and v_account_total >= v_limit then
      return jsonb_build_object('ok',false,'error','campaign_entry_limit',
        'limit_scope','account','limit_mode',v_mode,'limit',v_limit,'used',v_account_total,
        'entry_count_total',v_total,'entry_count_today',v_today);
    end if;
    if v_mode = 'daily' and v_account_today >= v_limit then
      return jsonb_build_object('ok',false,'error','daily_entry_limit',
        'limit_scope','account','limit_mode',v_mode,'limit',v_limit,'used',v_account_today,
        'entry_count_total',v_total,'entry_count_today',v_today);
    end if;
  end if;

  if v_mode = 'total' and v_total >= v_limit then
    return jsonb_build_object('ok',false,'error','campaign_entry_limit','limit_mode',v_mode,'limit',v_limit,'used',v_total,'entry_count_total',v_total,'entry_count_today',v_today);
  end if;
  if v_mode = 'daily' and v_today >= v_limit then
    return jsonb_build_object('ok',false,'error','daily_entry_limit','limit_mode',v_mode,'limit',v_limit,'used',v_today,'entry_count_total',v_total,'entry_count_today',v_today);
  end if;

  insert into public.live_reports(
    shop_id,shop_name,post_type,category,status,content,client_id,entry_claim_code
  ) values (
    p_campaign_id,v_campaign.title,'report','store','EVENT_ENTRY',v_instagram,v_client,v_claim
  );

  v_total := v_total + 1;
  v_today := v_today + 1;

  if v_user_id is not null and not exists (
    select 1 from public.user_entries
    where user_id=v_user_id and source_type='funy_mon' and source_id=v_catch_id
  ) then
    insert into public.user_entries(
      user_id,source_type,source_id,title,description,code,status,metadata
    ) values (
      v_user_id,
      'funy_mon',
      v_catch_id,
      v_campaign.title,
      'FUNY MON 포획 이벤트 응모 완료',
      v_claim,
      'active',
      jsonb_build_object(
        'campaign_id',p_campaign_id,
        'shop_id',v_shop_id,
        'monster_id',v_monster_id,
        'instagram_id',v_instagram,
        'entry_count_total',v_total,
        'entry_count_today',v_today
      )
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'campaign_id',p_campaign_id,
    'campaign_title',v_campaign.title,
    'limit_mode',v_mode,
    'limit',case when v_mode='unlimited' then null else v_limit end,
    'entry_count_total',v_total,
    'entry_count_today',v_today
  );
exception
  when unique_violation then
    return jsonb_build_object('ok',false,'error','already_submitted');
end;
$function$;

-- Dated EV-YYYYMMDD-* IDs are generated campaigns. Legacy event pages and
-- normal LIVE PIN submissions keep their existing insert paths.
create policy event_entries_rpc_only
on public.live_reports as restrictive
for insert to anon, authenticated
with check (status is distinct from 'EVENT_ENTRY' or shop_id !~ '^EV-[0-9]{8}-[A-Z0-9]+$');
