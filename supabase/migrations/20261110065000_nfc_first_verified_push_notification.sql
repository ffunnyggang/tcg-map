-- NFC visit confirmation notification: exactly once per member / shop / KST date.
-- The NFC visit's existing unique constraint prevents duplicate trigger executions.
-- This does not retroactively notify previous check-ins or grant mission rewards.
create or replace function public.notify_nfc_visit_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_shop_name text;
  v_reward_enabled boolean := false;
  v_title text;
  v_body text;
  v_route text;
begin
  select s.name, coalesce(t.reward_enabled, false)
    into v_shop_name, v_reward_enabled
    from public.shops s
    left join public.shop_visit_nfc_tags t on t.id = new.tag_id
   where s.id = new.shop_id;
  v_shop_name := coalesce(nullif(trim(v_shop_name), ''), '카드샵');
  if v_reward_enabled then
    v_title := '📍 카드샵 방문인증 완료!';
    v_body := v_shop_name || ' 방문이 인증되었습니다. MY에서 미션 진행 현황을 확인해 보세요.';
    v_route := '/(tabs)/my';
  else
    v_title := '📍 NFC 테스트 인증 완료!';
    v_body := v_shop_name || ' NFC 테스트 인증이 완료되었습니다. 미션·코인 보상에는 반영되지 않습니다.';
    v_route := '/(tabs)/map';
  end if;

  insert into public.notifications
    (user_id, type, category, title, body, route, data, source_type, source_id)
  values
    (new.user_id,
     'nfc_visit_verified',
     'rewards',
     v_title,
     v_body,
     v_route,
     jsonb_build_object('shop_id',new.shop_id,'visit_date_kst',new.visit_date_kst,
       'pilot',not v_reward_enabled,'reward_enabled',v_reward_enabled),
     'nfc_visit_checkin',
     new.shop_id || ':' || new.visit_date_kst::text)
  on conflict do nothing;
  return new;
exception when others then
  -- Notification failures must not invalidate an otherwise successful visit.
  raise warning 'NFC visit notification enqueue failed (checkin %, SQLSTATE %)', new.id, SQLSTATE;
  return new;
end;
$function$;

drop trigger if exists trg_nfc_visit_verified_notification on public.shop_visit_nfc_pilot_checkins;
create trigger trg_nfc_visit_verified_notification
after insert on public.shop_visit_nfc_pilot_checkins
for each row execute function public.notify_nfc_visit_verified();

revoke all on function public.notify_nfc_visit_verified() from public, anon, authenticated;
