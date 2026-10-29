ALTER TABLE public.cms_contents ADD COLUMN IF NOT EXISTS instagram_embed jsonb DEFAULT NULL;
ALTER TABLE public.cms_block_items ADD COLUMN IF NOT EXISTS instagram_embed jsonb DEFAULT NULL;
ALTER TABLE public.cms_contents ADD CONSTRAINT cms_contents_instagram_embed_object CHECK (instagram_embed IS NULL OR jsonb_typeof(instagram_embed) = 'object') NOT VALID;
ALTER TABLE public.cms_block_items ADD CONSTRAINT cms_items_instagram_embed_object CHECK (instagram_embed IS NULL OR jsonb_typeof(instagram_embed) = 'object') NOT VALID;
ALTER TABLE public.cms_contents VALIDATE CONSTRAINT cms_contents_instagram_embed_object;
ALTER TABLE public.cms_block_items VALIDATE CONSTRAINT cms_items_instagram_embed_object;
COMMENT ON COLUMN public.cms_contents.instagram_embed IS 'Opt-in Instagram embed display defaults; NULL preserves existing image rendering. No HTML or executable embed code stored.';
COMMENT ON COLUMN public.cms_block_items.instagram_embed IS 'Per-placement Instagram frame override. NULL inherits content default; enabled:false forces image rendering.';
NOTIFY pgrst, 'reload schema';
