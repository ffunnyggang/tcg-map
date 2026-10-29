DO $qa$
DECLARE uid uuid; info jsonb; news jsonb; again jsonb; req uuid:=gen_random_uuid(); img text;
BEGIN
 BEGIN
 SELECT u.id INTO uid FROM auth.users u JOIN public.admin_accounts a ON lower(u.email)=a.email WHERE a.is_active=true LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.publish_instagram_content(req,'QA','https://www.instagram.com/p/INFOQA/',null,'invalid','{}','pick_information','inapp','page');RAISE EXCEPTION 'Anonymous accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 img:='https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/cms-images/shop-news/'||uid||'/qa.png';
 info:=public.publish_instagram_content(req,'__INSTAGRAM_INFO_QA__','https://www.instagram.com/p/INFOQA/','KR-SEO-013',img,'{"kind":"screenshot","enabled":false}','pick_information','inapp','bottom_sheet');
 IF NOT EXISTS(SELECT 1 FROM public.cms_blocks WHERE id=(info->>'block_id')::uuid AND placement='pick_information' AND title='TCG 정보') THEN RAISE EXCEPTION 'Wrong information collection';END IF;
 IF (SELECT shop_id FROM public.cms_contents WHERE id=(info->>'content_id')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'Hidden shop leaked';END IF;
 again:=public.publish_instagram_content(req,'QA','https://www.instagram.com/p/INFOQA/',null,img,'{"kind":"screenshot","enabled":false}','pick_information','inapp','bottom_sheet');
 IF again->>'already_registered'<>'true' THEN RAISE EXCEPTION 'Idempotency failed';END IF;
 BEGIN PERFORM public.publish_instagram_content(gen_random_uuid(),'QA','https://www.instagram.com/p/INFOQA/',null,img,'{"kind":"screenshot","enabled":false}','pick_information','inapp','page');RAISE EXCEPTION 'Duplicate accepted';EXCEPTION WHEN unique_violation THEN NULL;END;
 news:=public.publish_instagram_content(gen_random_uuid(),'__INSTAGRAM_INFO_QA__','https://www.instagram.com/p/INFOQA/','KR-SEO-013',img,'{"kind":"screenshot","enabled":false}','pick_shop_news','external','page');
 IF (SELECT shop_id FROM public.cms_contents WHERE id=(news->>'content_id')::uuid) IS DISTINCT FROM 'KR-SEO-013' THEN RAISE EXCEPTION 'News shop lost';END IF;
 PERFORM public.remove_shop_news((info->>'content_id')::uuid);
 IF EXISTS(SELECT 1 FROM public.cms_block_items WHERE content_id=(info->>'content_id')::uuid AND block_id=(info->>'block_id')::uuid AND is_active) THEN RAISE EXCEPTION 'Info removal failed';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.cms_block_items WHERE content_id=(news->>'content_id')::uuid AND is_active) THEN RAISE EXCEPTION 'News affected';END IF;
 RAISE EXCEPTION USING ERRCODE='ZQ005',MESSAGE='INFORMATION_QA_PASSED';
 EXCEPTION WHEN SQLSTATE 'ZQ005' THEN RAISE NOTICE 'Destination, hidden shop, duplicate, permissions, removal and existing news passed; rolled back';END;
END $qa$;