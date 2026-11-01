create temporary table shop_feature_test_result(result text);
do $test$
declare admin_id uuid; fixture text:='QA-'||gen_random_uuid()::text; payload jsonb; features jsonb; before_hash text; result text;
begin
 select u.id into admin_id from auth.users u join public.admin_accounts a on a.email=lower(u.email) where a.is_active limit 1;
 assert admin_id is not null;
 select md5(coalesce(jsonb_agg(to_jsonb(t) order by shop_id,feature_id)::text,'')) into before_hash from public.shop_features t;
 begin
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 payload:=jsonb_build_object('id',fixture,'country_code','KR','region_code','SEO','name','TRANSACTION-ONLY FEATURE QA','address','QA fixture','is_active',false);
 features:='{"single":{"value":true,"detail":"싱글 메모"},"graded":{"value":false,"detail":"등급 메모"},"vintage":{"value":null,"detail":"미확인 메모"}}';
 result:=public.admin_save_shop_full(payload,'{"pokemon":true}',features,'[]',null,null);
 assert result=fixture;
 assert (select value is true and detail='싱글 메모' from public.shop_features s join public.features f on f.id=s.feature_id where s.shop_id=fixture and f.code='single');
 assert (select value is false and detail='등급 메모' from public.shop_features s join public.features f on f.id=s.feature_id where s.shop_id=fixture and f.code='graded');
 assert (select value is null and detail='미확인 메모' from public.shop_features s join public.features f on f.id=s.feature_id where s.shop_id=fixture and f.code='vintage');
 features:='{"single":{"value":false,"detail":null},"graded":{"value":true,"detail":"수정 메모"},"vintage":{"value":null,"detail":null}}';
 perform public.admin_save_shop_full(payload,'{"pokemon":false}',features,'[]',null,null);
 assert (select value is false and detail is null from public.shop_features s join public.features f on f.id=s.feature_id where s.shop_id=fixture and f.code='single');
 assert (select value is true and detail='수정 메모' from public.shop_features s join public.features f on f.id=s.feature_id where s.shop_id=fixture and f.code='graded');
 assert (select count(*) from public.shop_features where shop_id=fixture)=(select count(*) from public.features where is_active);
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin perform public.admin_save_shop_full(payload,'{}',features,'[]',null,null);raise exception 'unauthorized save allowed';exception when insufficient_privilege then null;end;
 raise exception using errcode='ZX001',message='rollback fixture shop and associations';
 exception when sqlstate 'ZX001' then null;
 end;
 assert not exists(select 1 from public.shops where id=fixture);
 assert before_hash=(select md5(coalesce(jsonb_agg(to_jsonb(t) order by shop_id,feature_id)::text,'')) from public.shop_features t);
 insert into shop_feature_test_result values('PASS: true/false/null and detail create/update/reset; unauthorized save denied; fixture rolled back; existing features unchanged');
end $test$;
select * from shop_feature_test_result;
