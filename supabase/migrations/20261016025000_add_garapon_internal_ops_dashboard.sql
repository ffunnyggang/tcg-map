begin;

create index if not exists funy_coin_ledger_created_idx
  on public.funy_coin_ledger(created_at desc);
create index if not exists garapon_testers_active_updated_idx
  on public.garapon_testers(is_active,updated_at desc);

create or replace function public.admin_get_garapon_ops(p_event_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_feature public.garapon_feature_settings%rowtype;
  v_coin public.funy_coin_settings%rowtype;
  v_inventory_mismatch integer := 0;
  v_queue_mismatch integer := 0;
  v_overdue_queue integer := 0;
  v_claim_mismatch integer := 0;
  v_duplicate_active integer := 0;
  v_wallet_mismatch integer := 0;
  v_negative_wallet integer := 0;
  v_entry_mismatch integer := 0;
  v_public_while_locked integer := 0;
  v_cron_active boolean := false;
  v_cron_status text := null;
  v_cron_end timestamptz := null;
  v_release_ok boolean := false;
  v_all_ok boolean := false;
begin
  if not public.is_funypin_admin() then
    return jsonb_build_object('ok',false,'error','admin_required');
  end if;

  perform public.finalize_due_garapon_participations(p_event_id);

  select * into v_feature from public.garapon_feature_settings where id=true;
  select * into v_coin from public.funy_coin_settings where id=true;

  v_release_ok := coalesce(v_feature.release_locked,true)
    and not coalesce(v_feature.public_enabled,false)
    and coalesce(v_coin.release_locked,true)
    and not coalesce(v_coin.system_enabled,false)
    and not coalesce(v_coin.signup_bonus_enabled,false);

  with inventory as (
    select
      e.id,
      e.total_ball_count,
      e.remaining_ball_count,
      coalesce(sum(b.initial_count),0)::integer as initial_sum,
      coalesce(sum(b.remaining_count),0)::integer as remaining_sum,
      coalesce(bool_or(b.remaining_count < 0 or b.remaining_count > b.initial_count),false) as invalid_ball
    from public.garapon_events e
    left join public.garapon_event_balls b on b.event_id=e.id
    where p_event_id is null or e.id=p_event_id
    group by e.id,e.total_ball_count,e.remaining_ball_count
  )
  select count(*) into v_inventory_mismatch
  from inventory
  where total_ball_count<>initial_sum
     or remaining_ball_count<>remaining_sum
     or remaining_ball_count<0
     or remaining_ball_count>total_ball_count
     or invalid_ball;

  with queue_rows as (
    select
      p.event_id,p.sequence_no,p.turn_starts_at,p.reveal_at,
      lag(p.reveal_at) over(partition by p.event_id order by p.sequence_no) as previous_reveal_at
    from public.garapon_participations p
    where p.status='queued'
      and p.reveal_at>clock_timestamp()
      and (p_event_id is null or p.event_id=p_event_id)
  )
  select count(*) into v_queue_mismatch
  from queue_rows
  where reveal_at<=turn_starts_at
     or (previous_reveal_at is not null and abs(extract(epoch from (turn_starts_at-previous_reveal_at)))>1);

  select count(*) into v_overdue_queue
  from public.garapon_participations p
  where p.status='queued'
    and p.reveal_at<=clock_timestamp()-interval '90 seconds'
    and (p_event_id is null or p.event_id=p_event_id);

  select count(*) into v_claim_mismatch
  from public.garapon_participations p
  left join public.garapon_prize_claims c on c.participation_id=p.id
  where (p_event_id is null or p.event_id=p_event_id)
    and (
      (coalesce((p.result_snapshot->>'is_win')::boolean,false) and c.id is null)
      or
      (not coalesce((p.result_snapshot->>'is_win')::boolean,false) and c.id is not null)
    );

  select count(*) into v_duplicate_active
  from (
    select p.event_id,p.user_id
    from public.garapon_participations p
    where p.status='queued'
      and p.reveal_at>clock_timestamp()
      and (p_event_id is null or p.event_id=p_event_id)
    group by p.event_id,p.user_id
    having count(*)>1
  ) d;

  select count(*) into v_wallet_mismatch
  from public.funy_coin_wallets w
  left join lateral (
    select l.id,l.balance_after
    from public.funy_coin_ledger l
    where l.user_id=w.user_id
    order by l.created_at desc,l.id desc
    limit 1
  ) latest on true
  where (latest.id is null and w.balance<>0)
     or (latest.id is not null and latest.balance_after<>w.balance);

  select count(*) into v_negative_wallet
  from public.funy_coin_wallets
  where balance<0;

  select count(*) into v_entry_mismatch
  from public.garapon_participations p
  left join public.user_entries ue
    on ue.source_type='garapon_event'
   and ue.source_id::text=p.id::text
   and ue.user_id=p.user_id
  where p.status='completed'
    and p.reveal_at<=clock_timestamp()
    and coalesce((p.result_snapshot->>'is_win')::boolean,false)
    and ue.id is null
    and (p_event_id is null or p.event_id=p_event_id);

  if coalesce(v_feature.release_locked,true) then
    select count(*) into v_public_while_locked
    from public.garapon_events e
    where e.visibility='public'
      and (p_event_id is null or e.id=p_event_id);
  end if;

  select coalesce(j.active,false),r.status,r.end_time
  into v_cron_active,v_cron_status,v_cron_end
  from cron.job j
  left join lateral (
    select d.status,d.end_time
    from cron.job_run_details d
    where d.jobid=j.jobid
    order by d.runid desc
    limit 1
  ) r on true
  where j.jobname='finalize-hidden-garapon-participations'
  limit 1;

  v_cron_active := coalesce(v_cron_active,false);
  v_all_ok := v_release_ok
    and v_inventory_mismatch=0
    and v_queue_mismatch=0
    and v_overdue_queue=0
    and v_claim_mismatch=0
    and v_duplicate_active=0
    and v_wallet_mismatch=0
    and v_negative_wallet=0
    and v_entry_mismatch=0
    and v_public_while_locked=0
    and v_cron_active
    and coalesce(v_cron_status,'succeeded')='succeeded';

  return jsonb_build_object(
    'ok',true,
    'generated_at',clock_timestamp(),
    'selected_event_id',p_event_id,
    'all_ok',v_all_ok,
    'settings',jsonb_build_object(
      'feature',to_jsonb(v_feature),
      'coin',to_jsonb(v_coin)
    ),
    'cron',jsonb_build_object(
      'active',v_cron_active,
      'last_status',v_cron_status,
      'last_finished_at',v_cron_end
    ),
    'summary',jsonb_build_object(
      'event_count',(select count(*) from public.garapon_events e where p_event_id is null or e.id=p_event_id),
      'active_event_count',(select count(*) from public.garapon_events e where e.status='active' and (p_event_id is null or e.id=p_event_id)),
      'queued_count',(select count(*) from public.garapon_participations p where p.status='queued' and p.reveal_at>clock_timestamp() and (p_event_id is null or p.event_id=p_event_id)),
      'participation_count',(select count(*) from public.garapon_participations p where p_event_id is null or p.event_id=p_event_id),
      'claim_action_count',(select count(*) from public.garapon_prize_claims c where c.status in ('awaiting_instagram','pending_review','ready','verified','dm_sent') and (p_event_id is null or c.event_id=p_event_id)),
      'active_tester_count',(select count(*) from public.garapon_testers t where t.is_active=true),
      'wallet_count',(select count(*) from public.funy_coin_wallets)
    ),
    'health',jsonb_build_array(
      jsonb_build_object('key','release_lock','label','출시 잠금','ok',v_release_ok,'count',case when v_release_ok then 0 else 1 end,'detail','가라폰·퍼니코인·가입 보너스 공개 차단'),
      jsonb_build_object('key','inventory','label','구슬 재고 일치','ok',v_inventory_mismatch=0,'count',v_inventory_mismatch,'detail','이벤트 합계와 컬러별 재고 대조'),
      jsonb_build_object('key','queue','label','대기열 시간 정합성','ok',v_queue_mismatch=0,'count',v_queue_mismatch,'detail','순번별 시작·공개 시각 연속성'),
      jsonb_build_object('key','overdue','label','지연된 결과 마감','ok',v_overdue_queue=0,'count',v_overdue_queue,'detail','공개 시각 90초 초과 대기 건'),
      jsonb_build_object('key','claims','label','당첨 클레임 정합성','ok',v_claim_mismatch=0,'count',v_claim_mismatch,'detail','당첨 결과와 클레임 생성 여부'),
      jsonb_build_object('key','duplicates','label','중복 진행 참여','ok',v_duplicate_active=0,'count',v_duplicate_active,'detail','회원별 진행 중 참여 중복 여부'),
      jsonb_build_object('key','wallets','label','퍼니코인 원장 일치','ok',v_wallet_mismatch=0 and v_negative_wallet=0,'count',v_wallet_mismatch+v_negative_wallet,'detail','지갑 잔액과 최종 원장 잔액 대조'),
      jsonb_build_object('key','entries','label','MY 당첨 내역 생성','ok',v_entry_mismatch=0,'count',v_entry_mismatch,'detail','공개 완료된 당첨의 응모 내역 연동'),
      jsonb_build_object('key','public_events','label','잠금 중 공개 이벤트','ok',v_public_while_locked=0,'count',v_public_while_locked,'detail','출시 잠금 상태의 public 이벤트 차단'),
      jsonb_build_object('key','cron','label','자동 마감 작업','ok',v_cron_active and coalesce(v_cron_status,'succeeded')='succeeded','count',case when v_cron_active and coalesce(v_cron_status,'succeeded')='succeeded' then 0 else 1 end,'detail','1분 주기 결과 마감 스케줄러')
    ),
    'events',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'title',x.title,'status',x.status,'visibility',x.visibility,
        'starts_at',x.starts_at,'ends_at',x.ends_at,'coin_cost',x.coin_cost,
        'total_ball_count',x.total_ball_count,'remaining_ball_count',x.remaining_ball_count,
        'ball_initial_sum',x.ball_initial_sum,'ball_remaining_sum',x.ball_remaining_sum,
        'participation_count',x.participation_count,'queued_count',x.queued_count,
        'claim_count',x.claim_count,'updated_at',x.updated_at
      ) order by x.created_at desc)
      from (
        select
          e.*,
          coalesce((select sum(b.initial_count) from public.garapon_event_balls b where b.event_id=e.id),0)::integer as ball_initial_sum,
          coalesce((select sum(b.remaining_count) from public.garapon_event_balls b where b.event_id=e.id),0)::integer as ball_remaining_sum,
          (select count(*) from public.garapon_participations p where p.event_id=e.id) as participation_count,
          (select count(*) from public.garapon_participations p where p.event_id=e.id and p.status='queued' and p.reveal_at>clock_timestamp()) as queued_count,
          (select count(*) from public.garapon_prize_claims c where c.event_id=e.id) as claim_count
        from public.garapon_events e
        where p_event_id is null or e.id=p_event_id
        order by e.created_at desc
        limit 100
      ) x
    ),'[]'::jsonb),
    'testers',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',x.user_id,'email',x.email,'is_active',x.is_active,'note',x.note,
        'wallet_balance',x.wallet_balance,'participation_count',x.participation_count,
        'claim_count',x.claim_count,'last_sign_in_at',x.last_sign_in_at,
        'created_at',x.created_at,'updated_at',x.updated_at
      ) order by x.is_active desc,x.updated_at desc)
      from (
        select
          t.user_id,u.email,t.is_active,t.note,t.created_at,t.updated_at,u.last_sign_in_at,
          coalesce(w.balance,0) as wallet_balance,
          (select count(*) from public.garapon_participations p where p.user_id=t.user_id) as participation_count,
          (select count(*) from public.garapon_prize_claims c where c.user_id=t.user_id) as claim_count
        from public.garapon_testers t
        join auth.users u on u.id=t.user_id
        left join public.funy_coin_wallets w on w.user_id=t.user_id
        order by t.is_active desc,t.updated_at desc
        limit 200
      ) x
    ),'[]'::jsonb),
    'coin_ledger',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'user_id',x.user_id,'email',x.email,'amount',x.amount,
        'balance_after',x.balance_after,'transaction_type',x.transaction_type,
        'source_type',x.source_type,'source_id',x.source_id,'description',x.description,
        'created_at',x.created_at
      ) order by x.created_at desc,x.id desc)
      from (
        select l.*,u.email
        from public.funy_coin_ledger l
        left join auth.users u on u.id=l.user_id
        order by l.created_at desc,l.id desc
        limit 200
      ) x
    ),'[]'::jsonb),
    'audit_logs',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'admin_user_id',x.admin_user_id,'admin_email',x.admin_email,
        'action',x.action,'target_type',x.target_type,'target_id',x.target_id,
        'before_data',x.before_data,'after_data',x.after_data,'created_at',x.created_at
      ) order by x.created_at desc,x.id desc)
      from (
        select a.*,u.email as admin_email
        from public.garapon_admin_audit_logs a
        left join auth.users u on u.id=a.admin_user_id
        order by a.created_at desc,a.id desc
        limit 200
      ) x
    ),'[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_run_garapon_maintenance(
  p_event_id uuid default null,
  p_reflow boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_finalized integer := 0;
  v_reflowed integer := 0;
begin
  if not public.is_funypin_admin() then
    return jsonb_build_object('ok',false,'error','admin_required');
  end if;
  if p_reflow and p_event_id is null then
    return jsonb_build_object('ok',false,'error','event_required_for_reflow');
  end if;

  v_finalized := public.finalize_due_garapon_participations(p_event_id);
  if p_reflow then
    v_reflowed := public.garapon_reflow_queue(p_event_id);
  end if;

  insert into public.garapon_admin_audit_logs(
    admin_user_id,action,target_type,target_id,after_data
  ) values (
    v_admin,'run_maintenance','garapon_event',p_event_id::text,
    jsonb_build_object('finalized',v_finalized,'reflow_requested',p_reflow,'reflowed',v_reflowed)
  );

  return jsonb_build_object(
    'ok',true,'event_id',p_event_id,'finalized',v_finalized,'reflowed',v_reflowed
  );
end;
$$;

revoke all on function public.admin_get_garapon_ops(uuid) from public,anon,authenticated;
grant execute on function public.admin_get_garapon_ops(uuid) to authenticated;
revoke all on function public.admin_run_garapon_maintenance(uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_run_garapon_maintenance(uuid,boolean) to authenticated;

commit;
