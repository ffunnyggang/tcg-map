-- Execute only after the pending migration is applied. Everything rolls back.
begin;
select set_config('request.jwt.claim.sub',(select u.id::text from auth.users u join public.admin_accounts a on lower(u.email)=a.email and a.is_active=true limit 1),true);
set local role authenticated;
do $$
declare config jsonb; rev bigint; payload jsonb; n bigint;
begin
 config:=public.admin_get_home_hero();
 if config is null then raise exception 'QA admin missing';end if;
 rev:=(config->'settings'->>'revision')::bigint;
 payload:=jsonb_build_array(jsonb_build_object('title','QA visible','image_url','https://funypin.kr/a.png','target_url','https://funypin.kr/shops.html','link_mode','inapp','inapp_presentation','page','is_active',true),jsonb_build_object('title','QA future','image_url','https://funypin.kr/a.png','target_url','https://funypin.kr/shops.html','link_mode','external','inapp_presentation','page','is_active',true,'starts_at',now()+interval '1 day'),jsonb_build_object('title','QA hidden','image_url','https://funypin.kr/a.png','target_url','https://funypin.kr/shops.html','link_mode','inapp','inapp_presentation','bottom_sheet','is_active',false));
 n:=public.admin_save_home_hero(rev,6,payload);
 if n<>rev+1 then raise exception 'QA revision';end if;
 begin
  perform public.admin_save_home_hero(rev,6,payload);
  raise exception 'QA stale revision accepted';
 exception when serialization_failure then null;end;
 begin
  perform public.admin_save_home_hero(n,6,jsonb_build_array(payload->0,payload->0,payload->0,payload->0,payload->0,payload->0));
  raise exception 'QA six banners accepted';
 exception when raise_exception then if sqlerrm<>'HERO_LIMIT_5' then raise;end if;end;
 if (select count(*) from public.home_hero_banners)<>3 then raise exception 'QA atomicity';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 if (select count(*) from public.home_hero_banners)<>1 then raise exception 'QA public visibility';end if;
 if has_function_privilege('anon','public.admin_save_home_hero(bigint,numeric,jsonb)','EXECUTE') then raise exception 'QA anon write privilege';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
set local role authenticated;
do $$ begin
 if public.admin_get_home_hero() is not null then raise exception 'QA non-admin read';end if;
 begin
  perform public.admin_save_home_hero(1,6,'[]');
  raise exception 'QA non-admin write';
 exception when insufficient_privilege then null;end;
end $$;
rollback;
