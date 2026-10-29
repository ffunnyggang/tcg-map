DO $qa$
DECLARE uid uuid; first_result jsonb; second_result jsonb; third_result jsonb; before_order integer; first_order integer; second_order integer; request_one uuid:=gen_random_uuid(); request_two uuid:=gen_random_uuid();
BEGIN
 BEGIN
  SELECT u.id INTO uid FROM auth.users u JOIN public.admin_accounts a ON lower(u.email)=a.email WHERE a.is_active=true LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'QA requires existing admin'; END IF;
  PERFORM set_config('request.jwt.claim.sub','',true);
  BEGIN
   PERFORM public.publish_shop_news(request_one,'__SHOP_NEWS_QA__','https://www.instagram.com/p/FUNYPINQAA/','KR-SEO-013','invalid','{}'::jsonb);
   RAISE EXCEPTION 'Anonymous unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  IF NOT public.can_manage_shop_news() THEN RAISE EXCEPTION 'Admin denied'; END IF;
  first_result:=public.publish_shop_news(request_one,'__SHOP_NEWS_QA__','https://www.instagram.com/p/FUNYPINQAA/','KR-SEO-013','https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/cms-images/shop-news/'||uid||'/qa.png','{"kind":"screenshot","enabled":false}'::jsonb);
  second_result:=public.publish_shop_news(request_one,'__SHOP_NEWS_QA__','https://www.instagram.com/p/FUNYPINQAA/','KR-SEO-013','https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/cms-images/shop-news/'||uid||'/qa.png','{"kind":"screenshot","enabled":false}'::jsonb);
  IF first_result->>'content_id'<>second_result->>'content_id' OR second_result->>'already_registered'<>'true' THEN RAISE EXCEPTION 'Idempotency failed'; END IF;
  BEGIN
   PERFORM public.publish_shop_news(gen_random_uuid(),'__SHOP_NEWS_QA__','https://www.instagram.com/p/FUNYPINQAA/',null,'https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/cms-images/shop-news/'||uid||'/qa.png','{"kind":"screenshot","enabled":false}'::jsonb);
   RAISE EXCEPTION 'Duplicate unexpectedly allowed';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  third_result:=public.publish_shop_news(request_two,'__SHOP_NEWS_QA__','https://www.instagram.com/reel/FUNYPINQAB/',null,'https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/cms-images/shop-news/'||uid||'/qa2.png','{"kind":"screenshot","enabled":false}'::jsonb);
  SELECT sort_order INTO first_order FROM public.cms_block_items WHERE content_id=(first_result->>'content_id')::uuid;
  SELECT sort_order INTO second_order FROM public.cms_block_items WHERE content_id=(third_result->>'content_id')::uuid;
  IF second_order>=first_order THEN RAISE EXCEPTION 'Latest first failed'; END IF;
  IF (SELECT shop_id FROM public.cms_contents WHERE id=(first_result->>'content_id')::uuid)<>'KR-SEO-013' THEN RAISE EXCEPTION 'Shop assignment failed'; END IF;
  RAISE EXCEPTION USING ERRCODE='ZQ001',MESSAGE='ALL_QA_PASSED_ROLLBACK';
 EXCEPTION WHEN SQLSTATE 'ZQ001' THEN RAISE NOTICE 'Authorization, atomic registration, idempotency, duplicate prevention and newest-first QA passed; writes rolled back';
 END;
END $qa$;
