-- Additive CMS config and private, per-account detail history. Legacy collections retained.
ALTER TABLE public.cms_blocks ADD COLUMN home_shop_config jsonb;
ALTER TABLE public.cms_blocks ADD CONSTRAINT cms_blocks_home_shop_config_check CHECK (home_shop_config IS NULL OR jsonb_typeof(home_shop_config)='object');
ALTER TABLE public.cms_blocks DROP CONSTRAINT cms_blocks_block_type_check;
ALTER TABLE public.cms_blocks ADD CONSTRAINT cms_blocks_block_type_check CHECK (block_type IN ('link','collection','banner','divider','box_price_comparison','youtube_shorts','graded_cards','home_news_feed','home_shop_discovery'));
ALTER TABLE public.cms_blocks ADD CONSTRAINT cms_blocks_home_shop_placement_check CHECK (block_type <> 'home_shop_discovery' OR placement='home');
CREATE UNIQUE INDEX cms_blocks_one_home_shop_discovery ON public.cms_blocks(placement) WHERE block_type='home_shop_discovery';

CREATE TABLE public.shop_recent_views (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 shop_id text NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
 viewed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,shop_id)
);
CREATE INDEX shop_recent_views_user_time ON public.shop_recent_views(user_id,viewed_at DESC);
ALTER TABLE public.shop_recent_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_recent_views FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.shop_recent_views TO authenticated;
CREATE POLICY shop_recent_views_read_own ON public.shop_recent_views FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY shop_recent_views_insert_own ON public.shop_recent_views FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY shop_recent_views_update_own ON public.shop_recent_views FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY shop_recent_views_delete_own ON public.shop_recent_views FOR DELETE TO authenticated USING ((SELECT auth.uid())=user_id);
COMMENT ON TABLE public.shop_recent_views IS 'Private shop detail opens after HOME discovery launch; HOME queries last 30 days, latest 10 distinct shops. No historical backfill.';

DO $migration$
DECLARE config jsonb; legacy jsonb; today_ids jsonb; beginner_ids jsonb; box_ids jsonb; oripa_ids jsonb; all_day_ids jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status,'is_active',is_active) ORDER BY sort_order),'[]') INTO legacy
 FROM public.cms_blocks WHERE placement='home' AND id IN ('ad117b85-942c-4e59-b7e3-4f2339fe599e','161a2639-c50c-45d5-b0bd-90c9fb46633e','72817016-adfc-4f36-af67-db1b78d39db1','683bfa99-41d3-4c85-b152-77f0cca2b4cd','3ff1aa9d-c76a-4ceb-9106-b913428bbf11','a71f3a43-3a43-445f-a0fd-888ee23f120b','1375acc3-6ec3-4308-a681-21a1edd7f137','4e8f26ab-6d42-49ac-bb7f-219536dd3195','cb177790-d33d-4c20-ad28-748462a06340','17db3a94-13c8-4d58-9da2-6dd44ef00fd4','061933af-8328-4eb8-95f5-5db970dc7518','aac4aec0-f467-4721-9c2e-4b5cd7d7ffcd','08c82856-3f16-49ad-af53-5cdb82acb6cd','bbd9ee2e-ab0c-49db-a4b8-99594e5a1e7e');
 SELECT coalesce(jsonb_agg(shop_id ORDER BY block_sort,item_sort),'[]') INTO today_ids FROM (
 SELECT i.shop_id,min(b.sort_order) block_sort,min(i.sort_order) item_sort FROM public.cms_blocks b JOIN public.cms_block_items i ON i.block_id=b.id JOIN public.shops s ON s.id=i.shop_id
 WHERE b.placement='home' AND b.block_type='collection' AND b.status='published' AND b.is_active AND i.is_active AND i.item_type='shop' AND s.is_active GROUP BY i.shop_id) q;
 SELECT coalesce(jsonb_agg(i.shop_id ORDER BY i.sort_order),'[]') INTO beginner_ids FROM public.cms_block_items i WHERE i.block_id='161a2639-c50c-45d5-b0bd-90c9fb46633e' AND i.is_active AND i.item_type='shop';
 SELECT coalesce(jsonb_agg(i.shop_id ORDER BY i.sort_order),'[]') INTO box_ids FROM public.cms_block_items i WHERE i.block_id='4e8f26ab-6d42-49ac-bb7f-219536dd3195' AND i.is_active AND i.item_type='shop';
 SELECT coalesce(jsonb_agg(i.shop_id ORDER BY i.sort_order),'[]') INTO oripa_ids FROM public.cms_block_items i WHERE i.block_id='a71f3a43-3a43-445f-a0fd-888ee23f120b' AND i.is_active AND i.item_type='shop';
 SELECT coalesce(jsonb_agg(i.shop_id ORDER BY i.sort_order),'[]') INTO all_day_ids FROM public.cms_block_items i JOIN public.shops s ON s.id=i.shop_id WHERE i.block_id='bbd9ee2e-ab0c-49db-a4b8-99594e5a1e7e' AND i.is_active AND i.item_type='shop' AND s.is_active AND s.hours_display ~ '^\s*24\s*시간\s*$';
 config=jsonb_build_object('enabled',jsonb_build_object('today',true,'browse',true,'themes',true,'mine',true),'subtitle','새로운 매장과 카드 수집 정보를 만나보세요','today',today_ids,'themes',jsonb_build_object('beginner',beginner_ids,'rare','[]'::jsonb,'box',box_ids,'oripa',oripa_ids,'play','[]'::jsonb,'all_day',all_day_ids),'legacy_blocks',legacy);
 INSERT INTO public.cms_blocks(placement,block_type,title,style,sort_order,is_active,status,registration_type,home_shop_config)
 VALUES ('home','home_shop_discovery',E'오늘은 어떤 카드샵을\n발견해 볼까요?','thumbnail',20,true,'published','block',config);
 -- Preserve every legacy block and item for review/rollback; change visibility only.
 UPDATE public.cms_blocks b SET status='hidden',updated_at=now() WHERE b.placement='home' AND b.id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(legacy) x);
END $migration$;
