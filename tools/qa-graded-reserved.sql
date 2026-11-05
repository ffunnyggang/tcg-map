begin;
do $$
declare u uuid;s uuid;p uuid;r bigint;
begin
 select id into u from auth.users where deleted_at is null limit 1;
 select id into s from public.online_shops where slug='funycard';
 select id,revision into p,r from public.graded_products where online_shop_id=s and deleted_at is null limit 1;
 insert into public.graded_online_shop_managers(online_shop_id,user_id,is_active) values(s,u,true) on conflict(online_shop_id,user_id) do update set is_active=true;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform public.manage_shop_graded_card_priced('online:'||s,p,'update',r,null,'reserved','none',null,true);
 if not exists(select 1 from public.graded_products where id=p and status='reserved' and price_on_request and price_krw is null) then raise exception 'INQUIRY_RESERVED_FAILED';end if;
 perform public.manage_shop_graded_card_priced('online:'||s,p,'update',r+1,30000,'active','none',null,false);
 if not exists(select 1 from public.graded_products where id=p and not price_on_request and price_krw=30000) then raise exception 'FIXED_PRICE_RESTORE_FAILED';end if;
 perform public.manage_shop_graded_card_priced('online:'||s,p,'update',r+2,null,'reserved','none',null,true);
 perform set_config('qa.product',p::text,true);
end$$;
set local role authenticated;
insert into public.graded_product_favorites(product_id,user_id) values(current_setting('qa.product')::uuid,auth.uid()) on conflict do nothing;
insert into public.graded_product_views(product_id,view_key) values(current_setting('qa.product')::uuid,gen_random_uuid());
reset role;
set local role anon;
do $$begin if not exists(select 1 from public.graded_products where id=current_setting('qa.product')::uuid and status='reserved') then raise exception 'RESERVED_PUBLIC_HIDDEN';end if;end$$;
reset role;
rollback;
select 'PASS: inquiry+reserved update, fixed price restoration, public reserved read, favorite and view insert; rollback complete' result;
