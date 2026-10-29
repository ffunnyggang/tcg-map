DO $qa$
DECLARE uid uuid; r jsonb; choice text; mode text; pres text; n integer:=0;
BEGIN
 BEGIN
 SELECT u.id INTO uid FROM auth.users u JOIN public.admin_accounts a ON lower(u.email)=a.email WHERE a.is_active=true LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 FOREACH choice IN ARRAY ARRAY['bottom_sheet','page','external'] LOOP
 n:=n+1; mode:=CASE WHEN choice='external' THEN 'external' ELSE 'inapp' END; pres:=CASE WHEN choice='bottom_sheet' THEN 'bottom_sheet' ELSE 'page' END;
 r:=public.publish_shop_news_link(gen_random_uuid(),'__SHOP_NEWS_LINK_QA__','https://www.instagram.com/p/FUNYPINLINKQA'||n||'/',null,'https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/cms-images/shop-news/'||uid||'/qa.png','{"kind":"screenshot","enabled":false}',mode,pres);
 IF NOT EXISTS(SELECT 1 FROM public.cms_contents WHERE id=(r->>'content_id')::uuid AND link_mode=mode AND inapp_presentation=pres) THEN RAISE EXCEPTION 'Link mode failed: %',choice; END IF;
 END LOOP;
 RAISE EXCEPTION USING ERRCODE='ZQ003',MESSAGE='ALL_LINK_MODES_PASSED';
 EXCEPTION WHEN SQLSTATE 'ZQ003' THEN RAISE NOTICE 'All three modes passed; rolled back'; END;
END $qa$;