create or replace function public.notify_funymon_reward()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.user_id is null then
    return new;
  end if;

  -- Entry tickets are not rewards yet. Notify only after the actual event entry is completed.
  if new.reward_type_snapshot = 'entry' then
    return new;
  end if;

  perform public.enqueue_notification(
    new.user_id,
    'reward_issued',
    'rewards',
    '리워드가 지급됐어요',
    coalesce(nullif(new.reward_title_snapshot,''),'FUNY MON 리워드') || '을 확인해보세요.',
    '/my/entries',
    null,
    jsonb_build_object(
      'claimId',new.id,
      'eventId',new.event_id,
      'rewardId',new.reward_id,
      'rewardType',new.reward_type_snapshot
    ),
    'funymon_reward_claim',
    new.id::text,
    now()
  );
  return new;
end;
$function$;

create or replace function public.notify_event_entry_completed()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_total integer;
  v_today integer;
  v_body text;
begin
  if new.user_id is null or new.status is distinct from 'active' then
    return new;
  end if;

  -- Current completed-entry source is FUNY MON.
  -- Keep event_entry reserved for the same completion contract in future event flows.
  if new.source_type not in ('funy_mon','event_entry') then
    return new;
  end if;

  v_total := nullif(new.metadata->>'entry_count_total','')::integer;
  v_today := nullif(new.metadata->>'entry_count_today','')::integer;

  v_body := coalesce(nullif(new.title,''),'FUNY PIN 이벤트') || ' 응모가 정상적으로 완료되었습니다.';
  if v_total is not null and v_total > 1 then
    if v_today is not null and v_today > 0 then
      v_body := v_body || ' 오늘 ' || v_today::text || '회 · 총 ' || v_total::text || '회 응모 완료';
    else
      v_body := v_body || ' 총 ' || v_total::text || '회 응모 완료';
    end if;
  end if;

  perform public.enqueue_notification(
    new.user_id,
    'event_entry_completed',
    'rewards',
    '이벤트 응모가 완료됐어요',
    v_body,
    '/my/entries',
    null,
    jsonb_build_object(
      'entryId',new.id,
      'sourceType',new.source_type,
      'sourceId',new.source_id,
      'campaignId',new.metadata->>'campaign_id',
      'entryCountTotal',v_total,
      'entryCountToday',v_today
    ),
    'event_entry',
    new.id::text,
    now()
  );

  return new;
end;
$function$;

drop trigger if exists user_entries_notification on public.user_entries;
create trigger user_entries_notification
after insert on public.user_entries
for each row execute function public.notify_event_entry_completed();

revoke all on function public.notify_funymon_reward() from public, anon, authenticated;
revoke all on function public.notify_event_entry_completed() from public, anon, authenticated;
