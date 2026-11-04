begin;
do $$
declare a uuid;b uuid;admin_id uuid;oa uuid;ob uuid;m jsonb;d uuid;
begin
 select u.id into a from auth.users u where deleted_at is null and not exists(select 1 from public.admin_accounts aa where lower(u.email)=aa.email and aa.is_active) order by u.created_at limit 1;
 select u.id into b from auth.users u where deleted_at is null and u.id<>a and not exists(select 1 from public.admin_accounts aa where lower(u.email)=aa.email and aa.is_active) order by u.created_at limit 1;
 select u.id into admin_id from auth.users u join public.admin_accounts aa on lower(u.email)=aa.email where aa.is_active limit 1;
 select id into oa from public.online_shops where slug='funycard';
 insert into public.online_shops(name) values('QA rollback online shop') returning id into ob;
 if a is null or b is null or admin_id is null or oa is null then raise exception 'QA_FIXTURES_MISSING';end if;
 perform set_config('qa.user_a',a::text,true);perform set_config('qa.user_b',b::text,true);perform set_config('qa.admin',admin_id::text,true);
 perform set_config('qa.online_a',oa::text,true);perform set_config('qa.online_b',ob::text,true);
 insert into public.graded_online_shop_managers(online_shop_id,user_id) values(oa,a),(ob,b);
 m:=jsonb_build_object('cert_number','999999999993','tcg_type','pokemon','grading_company','PSA','grade','10','issue_year','2022','set_name','QA online','card_number','337','card_name','QA rollback only','image_urls',jsonb_build_array('https://example.com/front.jpg'),'source_url','https://api.renaissos.com/v1/graded/PSA999999999993','checked_at',now());
 insert into public.graded_registration_drafts(user_id,online_shop_id,cert_number,metadata) values(a,oa,'999999999993',m) returning id into d;
 perform set_config('qa.draft',d::text,true);
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.user_a'),true);
do $$
declare p uuid;n integer;
begin
 if not public.can_manage_graded_shop('online:'||current_setting('qa.online_a')) then raise exception 'OWN_ONLINE_DENIED';end if;
 if public.can_manage_graded_shop('online:'||current_setting('qa.online_b')) then raise exception 'FOREIGN_ONLINE_ALLOWED';end if;
 if exists(select 1 from public.graded_online_shop_managers where user_id=current_setting('qa.user_b')::uuid) then raise exception 'MANAGER_DATA_LEAK';end if;
 begin insert into public.online_shops(name) values('Unauthorized');raise exception 'UNAUTHORIZED_CREATE_ALLOWED';exception when insufficient_privilege then null;end;
 update public.online_shops set name='Unauthorized' where id=current_setting('qa.online_a')::uuid;get diagnostics n=row_count;if n<>0 then raise exception 'UNAUTHORIZED_EDIT_ALLOWED';end if;
 begin perform public.set_graded_shop_manager('online:'||current_setting('qa.online_b'),'no@example.com',true);raise exception 'SELF_GRANT_ALLOWED';exception when insufficient_privilege then null;end;
 p:=public.register_shop_graded_card_with_contact(current_setting('qa.draft')::uuid,50000,'phone','010-1234-5678');perform set_config('qa.product',p::text,true);
 if not exists(select 1 from public.graded_products where id=p and online_shop_id=current_setting('qa.online_a')::uuid and shop_id is null and price_krw=50000 and contact_type='phone' and contact_value='010-1234-5678') then raise exception 'ONLINE_PRODUCT_LINK_FAILED';end if;
 if public.register_shop_graded_card_with_contact(current_setting('qa.draft')::uuid,60000,'email','shop@example.com')<>p then raise exception 'DUPLICATE_PRODUCT';end if;
if not exists(select 1 from public.graded_products where id=p and contact_type='phone' and contact_value='010-1234-5678') then raise exception 'IDEMPOTENT_CONTACT_CHANGED';end if;
end$$;
reset role;
update public.online_shops set is_active=false where id=current_setting('qa.online_a')::uuid;
set local role anon;
do $$begin if exists(select 1 from public.graded_products where id=current_setting('qa.product')::uuid) then raise exception 'INACTIVE_ONLINE_PRODUCT_LEAKED';end if;end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.user_a'),true);
do $$begin if public.can_manage_graded_shop('online:'||current_setting('qa.online_a')) then raise exception 'INACTIVE_ONLINE_ACCESS';end if;end$$;
select set_config('request.jwt.claim.sub',current_setting('qa.admin'),true);
do $$declare n integer;begin
 insert into public.online_shops(name) values('Admin QA rollback');
 update public.online_shops set name=name where id=current_setting('qa.online_a')::uuid;get diagnostics n=row_count;if n<>1 then raise exception 'ADMIN_EDIT_FAILED';end if;
 if not exists(select 1 from public.graded_products where id=current_setting('qa.product')::uuid) then raise exception 'ADMIN_PRODUCT_READ_FAILED';end if;
end$$;
reset role;
rollback;
select 'PASS: online shop create/edit admin-only, manager isolation, online registration/idempotency, inactive public hiding, admin read; rollback complete' as result;
