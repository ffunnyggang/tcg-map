-- The box-price-admin Edge Function authenticates the user and checks
-- can_manage_box_prices before deleting a seller/product registration.
-- Keep direct client access and RLS unchanged.
GRANT DELETE ON TABLE public.box_price_daily TO service_role;
