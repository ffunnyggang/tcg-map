
-- All fixture writes live in a subtransaction that is intentionally rolled back.
do $qa$
declare
  u uuid;
  u2 uuid;
  campaign text := 'EV-' || to_char(now(),'YYYYMMDD') || '-QA' || upper(replace(gen_random_uuid()::text,'-',''));
  second_campaign text;
  reward uuid := gen_random_uuid();
  reward2 uuid := gen_random_uuid();
  client uuid := gen_random_uuid();
  claims text[] := array[]::text[];
  r jsonb;
  n integer;
  account_key bigint;
begin
  select id into u from auth.users order by created_at limit 1;
  select id into u2 from auth.users where id <> u order by created_at limit 1;
  assert u is not null, 'QA requires an existing account';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  second_campaign := campaign || 'B';
  begin
    insert into public.event_campaigns(id,title,starts_at,ends_at,status,entry_limit_mode,entry_limit_count)
    values(campaign,'QA account entry limit',now()-interval '2 days',now()+interval '2 days','active','daily',1);
    insert into public.funy_mon_rewards(id,title,reward_type,entry_campaign_id)
    values(reward,'QA entry ticket','entry',campaign);
    for i in 1..10 loop
      claims := array_append(claims,'QA-'||gen_random_uuid()::text);
      insert into public.funy_mon_catches(anonymous_id,monster_id,distance_m,result,reward_id,claim_code,catch_date_kst,user_id,reward_type_snapshot)
      values(client,'ponanyang',0,'entry',reward,claims[i],(now() at time zone 'Asia/Seoul')::date,u,'entry');
    end loop;

    r := public.submit_funymon_event_entry(campaign,'qa.first',client::text,claims[1]);
    assert r->>'ok'='true', 'first account submission must succeed';
    assert exists(select 1 from public.user_entries where user_id=u and code=claims[1]), 'MY entry history must be created';
    r := public.submit_funymon_event_entry(campaign,'qa.first',client::text,claims[1]);
    assert r->>'error'='already_submitted', 'ticket replay must remain blocked';

    r := public.submit_funymon_event_entry(campaign,'qa.changed',client::text,claims[2]);
    assert r->>'error'='daily_entry_limit' and r->>'limit_scope'='account', 'changing Instagram must not bypass daily account limit';
    select count(*) into n from public.live_reports where shop_id=campaign and status='EVENT_ENTRY';
    assert n=1, 'rejected submission must not insert an entry';
    r := public.submit_funymon_event_entry(campaign,'qa.invalid',client::text,'not-a-valid-claim');
    assert r->>'error'='invalid_claim_code', 'invalid ticket must remain rejected';

    update public.live_reports set created_at=((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')-interval '1 second'
    where shop_id=campaign;
    r := public.submit_funymon_event_entry(campaign,'qa.changed',client::text,claims[2]);
    assert r->>'ok'='true', 'previous KST day must not consume today allowance';

    if u2 is not null then
      update public.funy_mon_catches set user_id=u2 where claim_code=claims[4];
      r := public.submit_funymon_event_entry(campaign,'qa.changed',client::text,claims[4]);
      assert r->>'error'='daily_entry_limit' and not(r ? 'limit_scope'), 'existing Instagram daily limit must still apply across accounts';
      perform set_config('request.jwt.claim.sub',u2::text,true);
      r := public.submit_funymon_event_entry(campaign,'qa.owner',client::text,claims[3]);
      assert r->>'error'='invalid_claim_code', 'signed-in account must match ticket owner';
      perform set_config('request.jwt.claim.sub','',true);
    end if;

    update public.event_campaigns set entry_limit_count=2 where id=campaign;
    r := public.submit_funymon_event_entry(campaign,'qa.third',client::text,claims[3]);
    assert r->>'ok'='true', 'configured daily limit 2 must allow second entry today';
    r := public.submit_funymon_event_entry(campaign,'qa.fifth',client::text,claims[5]);
    assert r->>'error'='daily_entry_limit' and r->>'used'='2', 'configured daily account limit must stop third entry';

    update public.event_campaigns set entry_limit_mode='total',entry_limit_count=3 where id=campaign;
    r := public.submit_funymon_event_entry(campaign,'qa.fifth',client::text,claims[5]);
    assert r->>'error'='campaign_entry_limit' and r->>'limit_scope'='account', 'total limit must count previous successful entries across Instagram IDs and dates';
    update public.event_campaigns set entry_limit_count=4 where id=campaign;
    r := public.submit_funymon_event_entry(campaign,'qa.fifth',client::text,claims[5]);
    assert r->>'ok'='true', 'configured total limit 4 must allow fourth account entry';
    r := public.submit_funymon_event_entry(campaign,'qa.sixth',client::text,claims[6]);
    assert r->>'error'='campaign_entry_limit', 'configured total limit must block fifth entry';

    update public.event_campaigns set entry_limit_mode='unlimited',entry_limit_count=null where id=campaign;
    r := public.submit_funymon_event_entry(campaign,'qa.sixth',client::text,claims[6]);
    assert r->>'ok'='true', 'unlimited account entry must remain allowed';
    r := public.submit_funymon_event_entry(campaign,'qa.sixth',client::text,claims[7]);
    assert r->>'ok'='true', 'unlimited Instagram entry must remain allowed';

    account_key := pg_catalog.hashtextextended('funymon-entry-user:'||campaign||':'||u::text,0);
    assert exists (
      select 1 from pg_locks where locktype='advisory' and pid=pg_backend_pid() and granted
      and classid=((account_key>>32)&4294967295)::oid
      and objid=(account_key&4294967295)::oid and objsubid=1
    ), 'account transaction lock must be held until commit';

    insert into public.event_campaigns(id,title,starts_at,ends_at,status,entry_limit_mode,entry_limit_count)
    values(second_campaign,'QA separate campaign',now()-interval '1 day',now()+interval '1 day','active','daily',1);
    insert into public.funy_mon_rewards(id,title,reward_type,entry_campaign_id)
    values(reward2,'QA separate ticket','entry',second_campaign);
    update public.funy_mon_catches set reward_id=reward2 where claim_code=claims[8];
    r := public.submit_funymon_event_entry(second_campaign,'qa.separate',client::text,claims[8]);
    assert r->>'ok'='true', 'one campaign must not consume another campaign allowance';

    update public.funy_mon_catches set user_id=null where claim_code=claims[9];
    r := public.submit_funymon_event_entry(campaign,'qa.legacy',client::text,claims[9]);
    assert r->>'ok'='true', 'legacy anonymous tickets must preserve existing behavior';

    raise sqlstate 'PQA01' using message='ROLLBACK_QA_FIXTURES';
  exception when sqlstate 'PQA01' then
    null;
  end;
  assert not exists(select 1 from public.event_campaigns where id in(campaign,second_campaign)), 'QA campaign cleanup';
  assert not exists(select 1 from public.live_reports where shop_id in(campaign,second_campaign)), 'QA entry cleanup';
  assert not exists(select 1 from public.funy_mon_catches where claim_code=any(claims)), 'QA catch cleanup';
  raise notice 'PASS account/Instagram limits, KST reset, configured counts, total/unlimited modes, owner check, ticket reuse, MY history, account transaction lock, campaign isolation; fixture writes rolled back';
end;
$qa$;
