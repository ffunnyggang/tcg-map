ALTER TABLE public.live_reports ADD COLUMN location_type text NOT NULL DEFAULT 'registered', ADD COLUMN country_code text, ADD COLUMN latitude double precision, ADD COLUMN longitude double precision;
ALTER TABLE public.live_reports ADD CONSTRAINT live_reports_direct_location_check CHECK (
 (location_type='registered' AND shop_id NOT LIKE 'LIVE-PIN:%' AND latitude IS NULL AND longitude IS NULL AND country_code IS NULL)
 OR (location_type='direct' AND shop_id LIKE 'LIVE-PIN:%' AND post_type='report' AND request_id IS NULL AND status IS DISTINCT FROM 'EVENT_ENTRY' AND length(trim(shop_name)) BETWEEN 1 AND 100
 AND latitude IS NOT NULL AND longitude IS NOT NULL AND country_code IS NOT NULL AND expires_at IS NOT NULL
 AND ((country_code='KR' AND latitude BETWEEN 33 AND 39.8 AND longitude BETWEEN 124 AND 132) OR (country_code='JP' AND latitude BETWEEN 24 AND 46 AND longitude BETWEEN 122 AND 154))
 AND expires_at=((date_trunc('day',created_at AT TIME ZONE 'Asia/Seoul')+interval '1 day') AT TIME ZONE 'Asia/Seoul'))
);
CREATE INDEX live_reports_direct_current_idx ON public.live_reports(created_at DESC) WHERE location_type='direct' AND is_hidden=false;
CREATE SCHEMA IF NOT EXISTS funy_private;
REVOKE ALL ON SCHEMA funy_private FROM PUBLIC;
CREATE FUNCTION funy_private.normalize_live_direct() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.location_type='direct' THEN
  NEW.created_at=now();
  NEW.expires_at=(date_trunc('day',now() AT TIME ZONE 'Asia/Seoul')+interval '1 day') AT TIME ZONE 'Asia/Seoul';
  NEW.shop_name=trim(NEW.shop_name);
  NEW.is_hidden=false; NEW.hidden_at=NULL; NEW.hidden_reason=NULL;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION funy_private.normalize_live_direct() FROM PUBLIC;
CREATE TRIGGER trg_normalize_live_direct BEFORE INSERT ON public.live_reports FOR EACH ROW EXECUTE FUNCTION funy_private.normalize_live_direct();
-- A public revision signal carries no report content or hidden record data.
-- Hidden rows are not delivered to public live_reports subscribers under RLS.
CREATE TABLE public.live_pin_map_revision(id smallint PRIMARY KEY CHECK(id=1),revision bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.live_pin_map_revision(id) VALUES(1);
ALTER TABLE public.live_pin_map_revision ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.live_pin_map_revision TO anon,authenticated;
CREATE POLICY live_pin_revision_public_read ON public.live_pin_map_revision FOR SELECT TO anon,authenticated USING (id=1);
CREATE FUNCTION funy_private.signal_live_direct() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF (TG_OP='INSERT' AND NEW.location_type='direct') OR (TG_OP='DELETE' AND OLD.location_type='direct') OR (TG_OP='UPDATE' AND (NEW.location_type='direct' OR OLD.location_type='direct')) THEN
  UPDATE public.live_pin_map_revision SET revision=revision+1,updated_at=now() WHERE id=1;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION funy_private.signal_live_direct() FROM PUBLIC;
CREATE TRIGGER trg_signal_live_direct AFTER INSERT OR UPDATE OR DELETE ON public.live_reports FOR EACH ROW EXECUTE FUNCTION funy_private.signal_live_direct();
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_pin_map_revision;
