-- Production-safe role checks: all changes in this script roll back.
begin;
select set_config('qa.user1',(select id::text from auth.users order by created_at limit 1),true);
select set_config('qa.user2',(select id::text from auth.users order by created_at offset 1 limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('qa.user1'),true);
set local role authenticated;
do $$
declare sid text;
begin
 select id into sid from public.shops where is_active limit 1;
 insert into public.shop_recent_views(user_id,shop_id) values(auth.uid(),sid) on conflict(user_id,shop_id) do update set viewed_at=now();
 if not exists(select 1 from public.shop_recent_views where shop_id=sid and user_id=auth.uid()) then raise exception 'own history missing';end if;
 begin
  insert into public.shop_recent_views(user_id,shop_id) values(current_setting('qa.user2')::uuid,sid);
  raise exception 'cross-user insert allowed';
 exception when insufficient_privilege then null;end;
 begin
  update public.shop_recent_views set user_id=current_setting('qa.user2')::uuid where user_id=auth.uid() and shop_id=sid;
  raise exception 'history ownership reassignment allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.user2'),true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.shop_recent_views where user_id=current_setting('qa.user1')::uuid) then raise exception 'cross-user history read allowed';end if;
 delete from public.shop_recent_views where user_id=current_setting('qa.user1')::uuid;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 if (select count(*) from public.cms_blocks where block_type='home_shop_discovery')<>1 then raise exception 'public config missing';end if;
 if has_table_privilege('anon','public.shop_recent_views','SELECT') then raise exception 'anon history exposed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select u.id::text from auth.users u join public.admin_accounts a on lower(u.email)=a.email and a.is_active=true limit 1),true);
set local role authenticated;
do $$ begin
 update public.cms_blocks set home_shop_config=jsonb_set(home_shop_config,'{enabled,browse}','false') where block_type='home_shop_discovery';
 if (select home_shop_config->'enabled'->>'browse' from public.cms_blocks where block_type='home_shop_discovery')<>'false' then raise exception 'admin update failed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
set local role authenticated;
do $$ declare n integer;begin
 update public.cms_blocks set home_shop_config='{}' where block_type='home_shop_discovery';get diagnostics n=row_count;
 if n<>0 then raise exception 'non-admin config write allowed';end if;
end $$;
rollback;
