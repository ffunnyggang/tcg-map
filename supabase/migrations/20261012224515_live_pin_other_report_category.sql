ALTER TABLE public.live_reports DROP CONSTRAINT live_reports_category_check;
ALTER TABLE public.live_reports ADD CONSTRAINT live_reports_category_check CHECK (category IN ('queue','stock','store','other'));
