alter table public.coupon_campaigns add column staff_change_history jsonb not null default '[]';
create function public.admin_update_coupon_staff(p_campaign_id uuid,p_staff_user_ids uuid[])
returns boolean language plpgsql security definer set search_path='' as $$
declare previous_ids uuid[]; ids uuid[];
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_staff_user_ids is null or cardinality(p_staff_user_ids)>20 or array_position(p_staff_user_ids,null) is not null then raise exception '직원은 최대 20명까지 지정할 수 있습니다.'; end if;
 select coalesce(array_agg(distinct x),'{}'::uuid[]) into ids from unnest(p_staff_user_ids) x;
 if exists(select 1 from unnest(ids) s where not exists(select 1 from auth.users u where u.id=s and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()))) then raise exception '유효한 직원 계정을 지정해주세요.'; end if;
 select staff_user_ids into previous_ids from public.coupon_campaigns where id=p_campaign_id for update;
 if not found then raise exception '등록된 쿠폰이 없습니다.'; end if;
 if previous_ids @> ids and ids @> previous_ids then return true; end if;
 update public.coupon_campaigns set staff_user_ids=ids,staff_change_history=staff_change_history||jsonb_build_array(jsonb_build_object('changed_at',now(),'changed_by',auth.uid(),'previous',previous_ids,'current',ids)) where id=p_campaign_id;
 return true;
end $$;
revoke all on function public.admin_update_coupon_staff(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.admin_update_coupon_staff(uuid,uuid[]) to authenticated;

create or replace function public.admin_list_coupon_campaigns()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]') into result from (
 select c.id,c.title,c.benefit_text,c.image_path,c.starts_at,c.ends_at,c.instructions,c.shop_name,c.staff_user_ids,c.issuance_limit,c.is_active,c.created_at,
 coalesce((select jsonb_agg(jsonb_build_object('user_id',u.id,'email',u.email,'nickname',p.nickname)) from auth.users u left join public.profiles p on p.user_id=u.id where u.id=any(c.staff_user_ids)),'[]'::jsonb) staff_accounts,
 (select count(*) from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id) issued_count,
 (select count(*) from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id and u.status='used') used_count,
 (select count(*) from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id and u.status='cancelled') cancelled_count
 from public.coupon_campaigns c order by c.created_at desc limit 200) t;
 return result;
end $$;

create or replace function public.inspect_staff_coupon(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u public.user_coupons; c public.coupon_campaigns;
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 select * into u from public.user_coupons where source_type='admin_coupon' and code=upper(trim(p_code));
 if not found then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 select * into c from public.coupon_campaigns where id=u.source_id;
 if not found or not (public.is_funypin_admin() or auth.uid()=any(c.staff_user_ids)) then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 return jsonb_build_object('title',u.title,'description',u.description,'shop_name',u.shop_name,'code',u.code,'status',u.status,'starts_at',c.starts_at,'expires_at',u.expires_at,'used_at',u.metadata->>'used_at','image_url',u.metadata->>'benefit_image_url','instructions',u.metadata->>'usage_instructions','own_coupon',u.user_id=auth.uid(),'can_redeem',u.status='issued' and c.starts_at<=now() and u.expires_at>now() and u.user_id<>auth.uid());
end $$;
