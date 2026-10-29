CREATE OR REPLACE FUNCTION public.publish_shop_news_link(p_request uuid,p_title text,p_url text,p_shop_id text,p_image text,p_settings jsonb,p_link_mode text,p_inapp_presentation text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_shop_news() THEN RAISE EXCEPTION 'SHOP_NEWS_PERMISSION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_link_mode IS NULL OR p_link_mode NOT IN ('inapp','external') OR p_inapp_presentation IS NULL OR p_inapp_presentation NOT IN ('bottom_sheet','page') THEN RAISE EXCEPTION 'INVALID_LINK_MODE'; END IF;
 result:=public.publish_shop_news(p_request,p_title,p_url,p_shop_id,p_image,p_settings);
 IF result->>'already_registered'='false' THEN
  UPDATE public.cms_contents SET link_mode=p_link_mode,inapp_presentation=p_inapp_presentation WHERE id=(result->>'content_id')::uuid;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.publish_shop_news_link(uuid,text,text,text,text,jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_shop_news_link(uuid,text,text,text,text,jsonb,text,text) TO authenticated;
