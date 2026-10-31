CREATE OR REPLACE FUNCTION public.inspect_staff_coupon(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u public.user_coupons; c public.coupon_campaigns;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and deleted_at is null and (banned_until is null or banned_until<=now())) then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 select * into u from public.user_coupons where source_type='admin_coupon' and code=upper(trim(p_code));
 if not found then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 select * into c from public.coupon_campaigns where id=u.source_id;
 if not found or not (public.is_funypin_admin() or auth.uid()=any(c.staff_user_ids)) then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 return jsonb_build_object('title',u.title,'description',u.description,'shop_name',u.shop_name,'code',u.code,'status',u.status,'starts_at',c.starts_at,'expires_at',u.expires_at,'used_at',u.metadata->>'used_at','image_url',u.metadata->>'benefit_image_url','instructions',u.metadata->>'usage_instructions','own_coupon',u.user_id=auth.uid(),'can_redeem',u.status='issued' and c.starts_at<=now() and u.expires_at>now() and u.user_id<>auth.uid());
end $function$;

CREATE OR REPLACE FUNCTION public.redeem_staff_coupon(p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u public.user_coupons; c public.coupon_campaigns;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and deleted_at is null and (banned_until is null or banned_until<=now())) then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 select * into u from public.user_coupons where source_type='admin_coupon' and code=upper(trim(p_code)) for update;
 if not found then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 select * into c from public.coupon_campaigns where id=u.source_id;
 if not found or not (public.is_funypin_admin() or auth.uid()=any(c.staff_user_ids)) then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 -- A customer who also has staff privileges must ask another staff member to redeem their own coupon.
 if u.user_id=auth.uid() then raise exception '본인 쿠폰은 다른 담당 직원에게 확인받아주세요.' using errcode='42501'; end if;
 if u.status<>'issued' or c.starts_at>now() or u.expires_at is null or u.expires_at<=now() then return false; end if;
 update public.user_coupons set status='used',metadata=metadata||jsonb_build_object('used_at',now(),'redeemed_by',auth.uid(),'redemption_method','authenticated_assigned_staff') where id=u.id and status='issued';
 return found;
end $function$;
