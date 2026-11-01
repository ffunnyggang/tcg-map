CREATE OR REPLACE FUNCTION public.admin_issue_coupon_campaign(p_campaign_id uuid, p_user_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.coupon_campaigns; ids uuid[]; existing_count integer; fresh_count integer; inserted_count integer;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_user_ids is null or cardinality(p_user_ids)<1 or cardinality(p_user_ids)>100 or array_position(p_user_ids,null) is not null then raise exception '발급 회원은 한 번에 1~100명까지 선택해주세요.'; end if;
 select array_agg(distinct x) into ids from unnest(p_user_ids) x;
 select * into c from public.coupon_campaigns where id=p_campaign_id for update;
 if not found then raise exception '등록된 쿠폰이 없습니다.'; end if;
 if exists(select 1 from unnest(ids) x where not exists(select 1 from auth.users u where u.id=x and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()))) then raise exception '탈퇴 또는 이용 제한된 회원이 포함되어 있습니다.'; end if;
 select count(*) into fresh_count from unnest(ids) x where not exists(select 1 from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id and u.user_id=x);
 -- A replay after a successful response was lost must remain safe even after issuance is paused.
 if fresh_count=0 then return jsonb_build_object('issued',0,'skipped',cardinality(ids),'total',(select count(*) from public.user_coupons where source_type='admin_coupon' and source_id=c.id)); end if;
 if not exists(select 1 from coupon_private.confirmation_codes where campaign_id=c.id) then raise exception '직원 확인코드를 먼저 설정해주세요.'; end if;
 if not c.is_active or c.ends_at<=now() then raise exception '발급이 중지됐거나 사용 기간이 종료된 쿠폰입니다.'; end if;
 select count(*) into existing_count from public.user_coupons where source_type='admin_coupon' and source_id=c.id;
 if existing_count+fresh_count>c.issuance_limit then raise exception '총 발급 한도를 초과합니다. 남은 수량: %',c.issuance_limit-existing_count; end if;
 insert into public.user_coupons(user_id,source_type,source_id,title,description,code,status,shop_name,expires_at,metadata)
 select x,'admin_coupon',c.id,c.title,c.benefit_text,'FP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),'issued',c.shop_name,c.ends_at,
 jsonb_build_object('coupon_version',1,'benefit_image_url','https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/coupon-benefits/'||c.image_path,'starts_at',c.starts_at,'usage_instructions',c.instructions,'issued_by',auth.uid())
 from unnest(ids) x where not exists(select 1 from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id and u.user_id=x);
 get diagnostics inserted_count=row_count;
 return jsonb_build_object('issued',inserted_count,'skipped',cardinality(ids)-inserted_count,'total',existing_count+inserted_count);
end $function$;
