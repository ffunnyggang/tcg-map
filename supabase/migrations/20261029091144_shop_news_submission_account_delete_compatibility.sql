ALTER TABLE public.shop_news_submissions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.shop_news_submissions DROP CONSTRAINT shop_news_submissions_created_by_fkey;
ALTER TABLE public.shop_news_submissions ADD CONSTRAINT shop_news_submissions_created_by_fkey FOREIGN KEY(created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
