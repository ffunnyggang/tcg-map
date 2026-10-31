create or replace function public.redeem_test_cardroom_coupon(p_coupon_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 if auth.uid() is null or not public.is_funypin_admin() then
  raise exception '운영자 인증이 필요합니다.' using errcode='42501';
 end if;
 update public.user_coupons
 set status='used', metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
 'used_at',now(),'redeemed_by',auth.uid(),'redemption_method','authenticated_admin_test')
 where id=p_coupon_id and source_type='event_test' and status='issued'
 and (expires_at is null or expires_at>now())
 and metadata->>'event_id'='EV-20261011-82460D';
 get diagnostics n=row_count;
 return n=1;
end $$;
revoke all on function public.redeem_test_cardroom_coupon(uuid) from public,anon;
grant execute on function public.redeem_test_cardroom_coupon(uuid) to authenticated;

create or replace function public.inspect_test_cardroom_coupon(p_coupon_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_funypin_admin() then
  raise exception '운영자 인증이 필요합니다.' using errcode='42501';
 end if;
 select jsonb_build_object('id',id,'title',title,'code',code,'status',status,
 'expires_at',expires_at,'used_at',metadata->>'used_at',
 'can_redeem',status='issued' and (expires_at is null or expires_at>now()))
 into result from public.user_coupons
 where id=p_coupon_id and source_type='event_test'
 and metadata->>'event_id'='EV-20261011-82460D';
 return result;
end $$;
revoke all on function public.inspect_test_cardroom_coupon(uuid) from public,anon;
grant execute on function public.inspect_test_cardroom_coupon(uuid) to authenticated;
-- Restore the intended read access; the existing owner-only RLS policy remains unchanged.
grant select on public.user_coupons to authenticated;
