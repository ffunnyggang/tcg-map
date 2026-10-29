DO $qa$
DECLARE uid uuid; r jsonb; bid uuid; cid uuid;
BEGIN
 BEGIN
 SELECT u.id INTO uid FROM auth.users u JOIN public.admin_accounts a ON lower(u.email)=a.email WHERE a.is_active=true LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.remove_shop_news(gen_random_uuid()); RAISE EXCEPTION 'Anonymous allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 r:=public.publish_shop_news(gen_random_uuid(),'__SHOP_NEWS_REMOVE_QA__','https://www.instagram.com/p/FUNYPINREMOVEQA/',null,'https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/cms-images/shop-news/'||uid||'/qa.png','{"kind":"screenshot","enabled":false}');
 cid:=(r->>'content_id')::uuid;
 INSERT INTO public.cms_blocks(placement,block_type,title,style,status,is_active) VALUES('pick_information','collection','__SHOP_NEWS_REMOVE_QA__','grid_2','published',true) RETURNING id INTO bid;
 INSERT INTO public.cms_block_items(block_id,content_id,item_type,is_active) VALUES(bid,cid,'content',true);
 PERFORM public.remove_shop_news(cid);
 IF EXISTS(SELECT 1 FROM public.cms_block_items i JOIN public.cms_blocks b ON b.id=i.block_id WHERE i.content_id=cid AND b.placement='pick_shop_news' AND i.is_active=true) THEN RAISE EXCEPTION 'News still active'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cms_block_items WHERE block_id=bid AND content_id=cid AND is_active=true) THEN RAISE EXCEPTION 'Other placement affected'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cms_contents WHERE id=cid AND title='__SHOP_NEWS_REMOVE_QA__') THEN RAISE EXCEPTION 'Source modified'; END IF;
 r:=public.remove_shop_news(cid);IF r->>'already_removed'<>'true' THEN RAISE EXCEPTION 'Repeat removal failed'; END IF;
 BEGIN PERFORM public.remove_shop_news(gen_random_uuid()); RAISE EXCEPTION 'Unmanaged accepted'; EXCEPTION WHEN SQLSTATE 'P0002' THEN NULL; END;
 RAISE EXCEPTION USING ERRCODE='ZQ004',MESSAGE='REMOVE_QA_PASSED';
 EXCEPTION WHEN SQLSTATE 'ZQ004' THEN RAISE NOTICE 'Removal, authorization, idempotency and other placement preservation passed; rolled back'; END;
END $qa$;