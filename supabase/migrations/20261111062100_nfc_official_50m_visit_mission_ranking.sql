-- NFC official 50m mode: existing tags were enabled for future verified visits.
-- All NFC check-ins now use nfc_visit_verify_v2 (50m).
-- The existing shop_visit_checkins trigger handles missions and activity rankings read this table.
update public.shop_visit_nfc_tags
set reward_enabled=true,reward_enabled_at=coalesce(reward_enabled_at,now())
where status='active' and reward_enabled=false;

create or replace function public.notify_nfc_official_visit_verified()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
declare v_shop text;
begin
 if new.method is distinct from 'nfc_ntag213_gps' then return new; end if;
 select name into v_shop from public.shops where id=new.shop_id;
 insert into public.notifications
  (user_id,type,category,title,body,route,data,source_type,source_id)
 values
  (new.user_id,'nfc_visit_verified','rewards','📍 카드샵 방문인증 완료!',
   coalesce(nullif(v_shop,''),'카드샵') || ' 방문이 인증되었습니다. MY에서 미션과 방문 랭킹을 확인해 보세요.',
   '/(tabs)/my',
   jsonb_build_object('shop_id',new.shop_id,'visit_date_kst',new.visit_date_kst,'reward_enabled',true,'pilot',false),
   'nfc_visit_checkin',new.shop_id || ':' || new.visit_date_kst::text)
 on conflict do nothing;
 return new;
exception when others then
 raise warning 'NFC official notification enqueue failed (checkin %, SQLSTATE %)',new.id,SQLSTATE;
 return new;
end;
$fn$;
drop trigger if exists trg_nfc_official_visit_verified_notification on public.shop_visit_checkins;
create trigger trg_nfc_official_visit_verified_notification after insert on public.shop_visit_checkins
for each row execute function public.notify_nfc_official_visit_verified();
revoke all on function public.notify_nfc_official_visit_verified() from public,anon,authenticated;
revoke execute on function public.nfc_pilot_verify_2km_test(uuid,text,double precision,double precision,double precision) from service_role;
