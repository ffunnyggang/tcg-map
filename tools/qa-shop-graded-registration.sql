begin;
do $$
declare a uuid;b uuid;sa text;sb text;m jsonb;da uuid;db uuid;
begin
 select u.id into a from auth.users u where u.deleted_at is null and not exists(select 1 from public.admin_accounts aa where lower(u.email)=aa.email and aa.is_active) order by u.created_at limit 1;
 select u.id into b from auth.users u where u.deleted_at is null and u.id<>a and not exists(select 1 from public.admin_accounts aa where lower(u.email)=aa.email and aa.is_active) order by u.created_at limit 1;
 select id into sa from public.shops where is_active order by id limit 1;
 select id into sb from public.shops where is_active and id<>sa order by id limit 1;
 if a is null or b is null or sa is null or sb is null then raise exception 'QA_FIXTURES_MISSING';end if;
 perform set_config('qa.user_a',a::text,true);perform set_config('qa.user_b',b::text,true);
 perform set_config('qa.shop_a',sa,true);perform set_config('qa.shop_b',sb,true);
 insert into public.graded_shop_managers(shop_id,user_id) values(sa,a),(sb,b);
 m:=jsonb_build_object('cert_number','999999999991','tcg_type','pokemon','grading_company','PSA','grade','10','issue_year','2022','set_name','QA test','card_number','337','card_name','QA rollback only','image_urls',jsonb_build_array('https://example.com/front.jpg'),'source_url','https://api.renaissos.com/v1/graded/PSA999999999991','checked_at',now());
 insert into public.graded_registration_drafts(user_id,shop_id,cert_number,metadata) values(a,sa,'999999999991',m) returning id into da;
 m:=jsonb_set(m,'{cert_number}','"999999999992"');
 insert into public.graded_registration_drafts(user_id,shop_id,cert_number,metadata) values(b,sb,'999999999992',m) returning id into db;
 perform set_config('qa.draft_a',da::text,true);perform set_config('qa.draft_b',db::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.user_a'),true);
do $$
declare p uuid;p2 uuid;
begin
 if not public.can_manage_graded_shop(current_setting('qa.shop_a')) then raise exception 'OWN_SHOP_DENIED';end if;
 if public.can_manage_graded_shop(current_setting('qa.shop_b')) then raise exception 'CROSS_SHOP_ALLOWED';end if;
 if exists(select 1 from public.graded_shop_managers where user_id=current_setting('qa.user_b')::uuid) then raise exception 'OTHER_MANAGERS_LEAKED';end if;
 if has_table_privilege('authenticated','public.graded_products','INSERT') or has_table_privilege('authenticated','public.graded_products','UPDATE') then raise exception 'DIRECT_PRODUCT_WRITE_ALLOWED';end if;
 if has_table_privilege('authenticated','public.graded_cert_cache','SELECT') or has_table_privilege('authenticated','public.graded_registration_drafts','INSERT') then raise exception 'SERVER_DATA_EXPOSED';end if;
 begin perform public.register_shop_graded_card(current_setting('qa.draft_b')::uuid,1000);raise exception 'OTHER_DRAFT_ALLOWED';exception when insufficient_privilege then null;end;
 begin perform public.set_graded_shop_manager(current_setting('qa.shop_b'),'fake@example.com',true);raise exception 'SELF_GRANT_ALLOWED';exception when insufficient_privilege then null;end;
 p:=public.register_shop_graded_card(current_setting('qa.draft_a')::uuid,123000);
 p2:=public.register_shop_graded_card(current_setting('qa.draft_a')::uuid,456000);
 if p<>p2 then raise exception 'DUPLICATE_SUBMIT_CREATED_ROWS';end if;
 if not exists(select 1 from public.graded_products where id=p and shop_id=current_setting('qa.shop_a') and price_krw=123000 and status='active' and not is_sample) then raise exception 'INCORRECT_PRODUCT';end if;
end $$;
reset role;
update public.graded_shop_managers set is_active=false where user_id=current_setting('qa.user_a')::uuid and shop_id=current_setting('qa.shop_a');
set local role authenticated;
do $$begin
 if public.can_manage_graded_shop(current_setting('qa.shop_a')) then raise exception 'REVOKED_ACCESS_ALLOWED';end if;
 begin perform public.register_shop_graded_card(current_setting('qa.draft_a')::uuid,123000);raise exception 'REVOKED_REGISTRATION_ALLOWED';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: shop isolation, private data grants, no direct writes, foreign draft denied, self-grant denied, registration, idempotency, immediate revocation; all fixtures rolled back' as result;
