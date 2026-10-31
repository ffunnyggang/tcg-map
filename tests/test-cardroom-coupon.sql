create temporary table coupon_audit_result (result jsonb);
do $test$
declare owner_id uuid; admin_id uuid; cid uuid:=gen_random_uuid(); expired_id uuid:=gen_random_uuid(); general_id uuid:=gen_random_uuid(); results jsonb:='[]'; ok boolean;
begin
 select u.id into admin_id from auth.users u join public.admin_accounts a on lower(u.email)=a.email where a.is_active limit 1;
 select u.id into owner_id from auth.users u where not exists(select 1 from public.admin_accounts a where a.email=lower(u.email) and a.is_active) limit 1;
 assert owner_id is not null and admin_id is not null;
 begin
 insert into public.user_coupons(id,user_id,title,source_type,expires_at,metadata) values
 (cid,owner_id,'TRANSACTION-ONLY-AUDIT','event_test',now()+interval '1 hour','{"event_id":"EV-20261011-82460D"}'),
 (expired_id,owner_id,'TRANSACTION-ONLY-EXPIRED','event_test',now()-interval '1 second','{"event_id":"EV-20261011-82460D"}'),
 (general_id,owner_id,'TRANSACTION-ONLY-GENERAL','event',now()+interval '1 hour','{"event_id":"EV-20261011-82460D"}');
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 begin perform public.redeem_test_cardroom_coupon(cid); raise exception 'Customer redemption allowed'; exception when insufficient_privilege then results:=results||'["owner self redemption denied"]'; end;
 begin perform public.inspect_test_cardroom_coupon(cid); raise exception 'Customer inspection allowed'; exception when insufficient_privilege then results:=results||'["customer admin inspection denied"]'; end;
 perform set_config('role','authenticated',true);
 assert (select count(*)=1 from public.user_coupons where id=cid);
 perform set_config('role','postgres',true);
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 perform set_config('role','authenticated',true);
 assert (select count(*)=0 from public.user_coupons where id=cid);
 results:=results||'["owner read allowed; other account read hidden by RLS"]';
 perform set_config('role','postgres',true);
 assert public.redeem_test_cardroom_coupon(expired_id)=false;
 assert public.redeem_test_cardroom_coupon(general_id)=false;
 assert public.redeem_test_cardroom_coupon(gen_random_uuid())=false;
 results:=results||'["expired / general / missing coupon rejected"]';
 assert (public.inspect_test_cardroom_coupon(cid)->>'can_redeem')::boolean;
 assert public.redeem_test_cardroom_coupon(cid)=true;
 assert public.redeem_test_cardroom_coupon(cid)=false;
 assert public.redeem_test_cardroom_coupon(cid)=false;
 assert (public.inspect_test_cardroom_coupon(cid)->>'status')='used';
 assert (select metadata->>'redeemed_by'=admin_id::text from public.user_coupons where id=cid);
 results:=results||'["admin redemption succeeds once; duplicate / retry rejected; used status and actor recorded"]';
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.redeem_test_cardroom_coupon(cid); raise exception 'Unauthenticated redemption allowed'; exception when insufficient_privilege then results:=results||'["unauthenticated denied"]'; end;
 raise exception using errcode='ZX001',message='rollback audit fixtures';
 exception when sqlstate 'ZX001' then null;
 end;
 assert not exists(select 1 from public.user_coupons where id in(cid,expired_id,general_id));
 results:=results||'["all fixture coupons and notification inserts rolled back"]';
 assert not has_function_privilege('anon','public.redeem_test_cardroom_coupon(uuid)','EXECUTE');
 assert not has_function_privilege('anon','public.inspect_test_cardroom_coupon(uuid)','EXECUTE');
 assert has_function_privilege('authenticated','public.redeem_test_cardroom_coupon(uuid)','EXECUTE');
 results:=results||'["anon execute denied; authenticated execute granted with in-function admin authorization"]';
 insert into coupon_audit_result values(results);
end $test$;
select * from coupon_audit_result;