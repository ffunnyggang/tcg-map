create table private.overlay_admin_print_illustration_plates (
  reference_id text primary key check (reference_id ~ '^30th-en-(02[3-9]|03[0-9]|04[0-9]|05[0-4])$'),
  source_import_id uuid not null,
  source_jpeg bytea not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_crop_xywh_px integer[] not null check (source_crop_xywh_px in (array[0,0,1008,1408],array[320,80,1008,1408])),
  native_offset_xy_px integer[] not null default array[40,40] check (native_offset_xy_px=array[40,40]),
  bleed_ring_webp bytea not null,
  bleed_ring_sha256 text not null check (bleed_ring_sha256 ~ '^[0-9a-f]{64}$'),
  composed_rgb_sha256 text not null check (composed_rgb_sha256 ~ '^[0-9a-f]{64}$'),
  width_px integer not null default 1088 check (width_px=1088),
  height_px integer not null default 1488 check (height_px=1488),
  trim_width_mm integer not null default 64 check (trim_width_mm=64),
  trim_height_mm integer not null default 89 check (trim_height_mm=89),
  bleed_mm integer not null default 2 check (bleed_mm=2),
  window_rect_mm jsonb,
  artwork_window_knockout boolean not null,
  saved_at timestamptz not null default now(),
  check (source_sha256=encode(sha256(source_jpeg),'hex')),
  check (bleed_ring_sha256=encode(sha256(bleed_ring_webp),'hex'))
);
alter table private.overlay_admin_print_illustration_plates enable row level security;
revoke all on private.overlay_admin_print_illustration_plates from public, anon, authenticated, service_role;
comment on table private.overlay_admin_print_illustration_plates is 'Private admin print artwork archive, 64 x 89 mm trim and 2 mm bleed. Not used by live export or public shared cache. Compose by decoding source JPEG, taking source_crop_xywh_px, pasting at native_offset_xy_px in the 1088 x 1488 transparent-center lossless WebP border. Original native JPEG and geometric recipe are retained.';
