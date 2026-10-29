CREATE OR REPLACE FUNCTION public.publish_instagram_content(p_request uuid, p_title text, p_url text, p_shop_id text, p_image text, p_settings jsonb, p_placement text, p_link_mode text, p_inapp_presentation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_title text; v_content uuid;v_block uuid;v_order integer;v_previous public.shop_news_submissions%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_shop_news() THEN RAISE EXCEPTION 'SHOP_NEWS_PERMISSION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_placement IS NULL OR p_placement NOT IN ('pick_shop_news','pick_information') OR p_link_mode IS NULL OR p_link_mode NOT IN ('inapp','external') OR p_inapp_presentation IS NULL OR p_inapp_presentation NOT IN ('page','bottom_sheet') THEN RAISE EXCEPTION 'INVALID_DESTINATION'; END IF;
 v_title:=CASE WHEN p_placement='pick_information' THEN 'TCG 정보' ELSE '카드샵 소식' END;
 IF p_placement='pick_information' THEN p_shop_id:=NULL; END IF;
 IF p_request IS NULL OR p_title IS NULL OR p_url IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 180 OR p_url !~ '^https://www[.]instagram[.]com/(p|reel)/[A-Za-z0-9_-]{1,100}/$' THEN RAISE EXCEPTION 'INVALID_NEWS'; END IF;
 IF p_image IS NULL OR p_image NOT LIKE ('https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/cms-images/shop-news/'||auth.uid()::text||'/%') THEN RAISE EXCEPTION 'INVALID_NEWS_IMAGE'; END IF;
 IF jsonb_typeof(p_settings) IS DISTINCT FROM 'object' OR p_settings->>'kind' IS DISTINCT FROM 'screenshot' OR p_settings->>'enabled' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'INVALID_SCREENSHOT_SETTINGS'; END IF;
 IF p_shop_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.shops WHERE id=p_shop_id AND is_active=true) THEN RAISE EXCEPTION 'SHOP_NOT_FOUND'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('funypin-shop-news-publish'));
 SELECT * INTO v_previous FROM public.shop_news_submissions WHERE request_id=p_request;
 IF FOUND THEN
  IF v_previous.created_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'REQUEST_OWNER_MISMATCH' USING ERRCODE='42501'; END IF;
  IF (SELECT placement FROM public.cms_blocks WHERE id=v_previous.block_id) IS DISTINCT FROM p_placement THEN RAISE EXCEPTION 'REQUEST_DESTINATION_MISMATCH'; END IF;
  RETURN jsonb_build_object('content_id',v_previous.content_id,'block_id',v_previous.block_id,'already_registered',true,'image_url',(SELECT image_url FROM public.cms_contents WHERE id=v_previous.content_id));
 END IF;
 IF EXISTS(SELECT 1 FROM public.cms_contents c JOIN public.cms_block_items i ON i.content_id=c.id JOIN public.cms_blocks b ON b.id=i.block_id WHERE b.placement=p_placement AND i.is_active=true AND b.is_active=true AND split_part(c.target_url,'?',1) IN (p_url,rtrim(p_url,'/'))) THEN RAISE EXCEPTION 'NEWS_ALREADY_REGISTERED' USING ERRCODE='23505'; END IF;
 SELECT id INTO v_block FROM public.cms_blocks WHERE placement=p_placement AND block_type='collection' AND style='grid_2' AND (p_placement<>'pick_information' OR title='TCG 정보') AND status='published' AND is_active=true ORDER BY sort_order,created_at LIMIT 1;
 IF v_block IS NULL THEN
  SELECT CASE WHEN p_placement='pick_information' THEN coalesce(max(sort_order),0)+10 ELSE coalesce(min(sort_order),0)-10 END INTO v_order FROM public.cms_blocks WHERE placement=p_placement;
  INSERT INTO public.cms_blocks(placement,block_type,title,style,sort_order,status,is_active,title_hidden) VALUES(p_placement,'collection',v_title,'grid_2',v_order,'published',true,p_placement='pick_shop_news') RETURNING id INTO v_block;
 END IF;
 INSERT INTO public.cms_contents(content_type,title,target_url,shop_id,image_url,instagram_embed,platform,status,is_library,published_at,link_mode,inapp_presentation) VALUES('link',btrim(p_title),p_url,p_shop_id,p_image,p_settings,'instagram','published',true,now(),p_link_mode,p_inapp_presentation) RETURNING id INTO v_content;
 SELECT coalesce(min(sort_order),0)-10 INTO v_order FROM public.cms_block_items WHERE block_id=v_block;
 INSERT INTO public.cms_block_items(block_id,content_id,item_type,sort_order,is_active,title_hidden) VALUES(v_block,v_content,'content',v_order,true,false);
 INSERT INTO public.shop_news_submissions(request_id,content_id,block_id,created_by) VALUES(p_request,v_content,v_block,auth.uid());
 RETURN jsonb_build_object('content_id',v_content,'block_id',v_block,'already_registered',false,'image_url',p_image);
END $function$;

REVOKE ALL ON FUNCTION public.publish_instagram_content(uuid,text,text,text,text,jsonb,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_instagram_content(uuid,text,text,text,text,jsonb,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.remove_shop_news(p_content uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE affected integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_shop_news() THEN RAISE EXCEPTION 'SHOP_NEWS_PERMISSION_REQUIRED' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('funypin-shop-news-publish'));
 IF NOT EXISTS(SELECT 1 FROM public.shop_news_submissions WHERE content_id=p_content) THEN RAISE EXCEPTION 'SHOP_NEWS_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 UPDATE public.cms_block_items i SET is_active=false FROM public.cms_blocks b,public.shop_news_submissions s WHERE i.block_id=b.id AND s.block_id=b.id AND s.content_id=p_content AND i.content_id=p_content AND b.placement IN ('pick_shop_news','pick_information') AND i.is_active=true;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN jsonb_build_object('removed',true,'already_removed',affected=0);
END $$;
