CREATE OR REPLACE FUNCTION public.admin_create_coupon_campaign_with_code(p_id uuid, p_payload jsonb, p_confirmation_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare campaign uuid;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_confirmation_code is null or p_confirmation_code !~ '^[0-9]{4,12}$' then raise exception '확인코드는 숫자 4~12자리로 설정해주세요.'; end if;
 campaign:=public.admin_create_coupon_campaign(p_id,p_payload);
 -- A create retry must not silently rotate a code that was changed separately.
 if exists(select 1 from coupon_private.confirmation_codes where campaign_id=campaign) then
  if not exists(select 1 from coupon_private.confirmation_codes where campaign_id=campaign and extensions.crypt(p_confirmation_code,code_hash)=code_hash) then raise exception '이미 등록된 쿠폰입니다. 목록에서 확인코드 설정 상태를 확인해주세요.'; end if;
 else
  perform public.admin_set_coupon_confirmation_code(campaign,p_confirmation_code);
 end if;
 return campaign;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_set_coupon_confirmation_code(p_campaign_id uuid, p_confirmation_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare secret coupon_private.confirmation_codes;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_confirmation_code is null or p_confirmation_code !~ '^[0-9]{4,12}$' then raise exception '확인코드는 숫자 4~12자리로 설정해주세요.'; end if;
 perform 1 from public.coupon_campaigns where id=p_campaign_id for update;
 if not found then raise exception '쿠폰을 찾을 수 없습니다.'; end if;
 select * into secret from coupon_private.confirmation_codes where campaign_id=p_campaign_id;
 if found and extensions.crypt(p_confirmation_code,secret.code_hash)=secret.code_hash then return jsonb_build_object('configured',true,'version',secret.version); end if;
 insert into coupon_private.confirmation_codes(campaign_id,code_hash,updated_by) values(p_campaign_id,extensions.crypt(p_confirmation_code,extensions.gen_salt('bf',10)),auth.uid())
 on conflict(campaign_id) do update set code_hash=excluded.code_hash,version=coupon_private.confirmation_codes.version+1,updated_by=excluded.updated_by,updated_at=now()
 returning * into secret;
 return jsonb_build_object('configured',true,'version',secret.version);
end $function$;
CREATE OR REPLACE FUNCTION public.redeem_coupon_with_confirmation(p_coupon_id uuid, p_confirmation_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare coupon public.user_coupons; campaign public.coupon_campaigns; secret coupon_private.confirmation_codes; attempt coupon_private.confirmation_attempts;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and deleted_at is null and (banned_until is null or banned_until<=now())) then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 select * into coupon from public.user_coupons where id=p_coupon_id and user_id=auth.uid() and source_type='admin_coupon' for update;
 if not found then return jsonb_build_object('ok',false,'reason','UNAVAILABLE'); end if;
 if coupon.status='used' then return jsonb_build_object('ok',true,'already_used',true); end if;
 select * into campaign from public.coupon_campaigns where id=coupon.source_id;
 if not found or coupon.status<>'issued' or campaign.starts_at>now() or coupon.expires_at is null or coupon.expires_at<=now() then return jsonb_build_object('ok',false,'reason','UNAVAILABLE'); end if;
 select * into secret from coupon_private.confirmation_codes where campaign_id=campaign.id;
 if not found then return jsonb_build_object('ok',false,'reason','NOT_CONFIGURED'); end if;
 insert into coupon_private.confirmation_attempts(user_id,campaign_id) values(auth.uid(),campaign.id) on conflict do nothing;
 select * into attempt from coupon_private.confirmation_attempts where user_id=auth.uid() and campaign_id=campaign.id for update;
 if attempt.locked_until>now() then return jsonb_build_object('ok',false,'reason','LOCKED','retry_at',attempt.locked_until); end if;
 if attempt.window_started_at<=now()-interval '15 minutes' then
  update coupon_private.confirmation_attempts set failures=0,window_started_at=now(),locked_until=null where user_id=auth.uid() and campaign_id=campaign.id;
  attempt.failures:=0;
 end if;
 if p_confirmation_code is null or p_confirmation_code !~ '^[0-9]{4,12}$' or extensions.crypt(p_confirmation_code,secret.code_hash)<>secret.code_hash then
  update coupon_private.confirmation_attempts set failures=attempt.failures+1,locked_until=case when attempt.failures+1>=5 then now()+interval '15 minutes' else null end where user_id=auth.uid() and campaign_id=campaign.id;
  return jsonb_build_object('ok',false,'reason',case when attempt.failures+1>=5 then 'LOCKED' else 'INVALID_CODE' end,'remaining',greatest(0,4-attempt.failures),'retry_at',case when attempt.failures+1>=5 then now()+interval '15 minutes' else null end);
 end if;
 update public.user_coupons set status='used',metadata=metadata||jsonb_build_object('used_at',now(),'redemption_method','staff_confirmation_code','confirmation_code_version',secret.version) where id=coupon.id and status='issued';
 update coupon_private.confirmation_attempts set failures=0,locked_until=null,window_started_at=now() where user_id=auth.uid() and campaign_id=campaign.id;
 return jsonb_build_object('ok',true,'already_used',false);
end $function$;