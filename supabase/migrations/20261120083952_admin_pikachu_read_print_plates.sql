-- Only the administrator-gated Pikachu print Edge Function uses these RPCs.
-- Keep the private table/schema unexposed, and never include blobs in metadata.
create or replace function public.admin_pikachu_print_plate_metadata(p_reference_id text)
returns table (
  reference_id text, width_px integer, height_px integer,
  trim_width_mm integer, trim_height_mm integer, bleed_mm integer,
  window_rect_mm jsonb, artwork_window_knockout boolean
)
language sql stable security definer set search_path = ''
as $$
  select p.reference_id, p.width_px, p.height_px,
         p.trim_width_mm, p.trim_height_mm, p.bleed_mm,
         p.window_rect_mm, p.artwork_window_knockout
  from private.overlay_admin_print_illustration_plates p
  where auth.role() = 'service_role'
    and p.reference_id = p_reference_id
    and p.reference_id ~ '^30th-en-0(2[3-9]|[34][0-9]|5[0-4])$';
$$;

create or replace function public.admin_pikachu_print_plate_image(p_reference_id text)
returns table (
  reference_id text, width_px integer, height_px integer,
  trim_width_mm integer, trim_height_mm integer, bleed_mm integer,
  window_rect_mm jsonb, artwork_window_knockout boolean,
  source_crop_xywh_px integer[], native_offset_xy_px integer[],
  source_jpeg_base64 text, bleed_ring_webp_base64 text
)
language sql stable security definer set search_path = ''
as $$
  select p.reference_id, p.width_px, p.height_px,
         p.trim_width_mm, p.trim_height_mm, p.bleed_mm,
         p.window_rect_mm, p.artwork_window_knockout,
         p.source_crop_xywh_px, p.native_offset_xy_px,
         replace(encode(p.source_jpeg, 'base64'), E'\n', ''),
         replace(encode(p.bleed_ring_webp, 'base64'), E'\n', '')
  from private.overlay_admin_print_illustration_plates p
  where auth.role() = 'service_role'
    and p.reference_id = p_reference_id
    and p.reference_id ~ '^30th-en-0(2[3-9]|[34][0-9]|5[0-4])$';
$$;

revoke all privileges on function public.admin_pikachu_print_plate_metadata(text) from PUBLIC, anon, authenticated;
revoke all privileges on function public.admin_pikachu_print_plate_image(text) from PUBLIC, anon, authenticated;
grant execute on function public.admin_pikachu_print_plate_metadata(text) to service_role;
grant execute on function public.admin_pikachu_print_plate_image(text) to service_role;
