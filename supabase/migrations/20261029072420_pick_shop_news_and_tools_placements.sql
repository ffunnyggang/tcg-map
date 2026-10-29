ALTER TABLE public.cms_blocks DROP CONSTRAINT cms_blocks_placement_check;
ALTER TABLE public.cms_blocks ADD CONSTRAINT cms_blocks_placement_check CHECK (placement = ANY (ARRAY['home','pick_shop_news','pick_information','pick_schedule','pick_creator','pick_tools','pick_review']::text[]));
