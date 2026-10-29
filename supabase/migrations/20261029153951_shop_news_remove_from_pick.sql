CREATE OR REPLACE FUNCTION public.remove_shop_news(p_content uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE affected integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_shop_news() THEN RAISE EXCEPTION 'SHOP_NEWS_PERMISSION_REQUIRED' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('funypin-shop-news-publish'));
 IF NOT EXISTS(SELECT 1 FROM public.shop_news_submissions WHERE content_id=p_content) THEN RAISE EXCEPTION 'SHOP_NEWS_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 UPDATE public.cms_block_items i SET is_active=false FROM public.cms_blocks b WHERE i.block_id=b.id AND i.content_id=p_content AND b.placement='pick_shop_news' AND i.is_active=true;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN jsonb_build_object('removed',true,'already_removed',affected=0);
END $$;
REVOKE ALL ON FUNCTION public.remove_shop_news(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remove_shop_news(uuid) TO authenticated;
