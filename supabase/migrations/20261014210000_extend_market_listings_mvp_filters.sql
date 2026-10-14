alter table public.market_listings
  add column if not exists listing_side text not null default 'sell',
  add column if not exists tcg_category text,
  add column if not exists item_type text,
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.market_listings
  drop constraint if exists market_listings_listing_side_check;
alter table public.market_listings
  add constraint market_listings_listing_side_check check (listing_side in ('sell'));

create index if not exists market_listings_category_created_idx
  on public.market_listings (tcg_category, created_at desc);

create index if not exists market_listings_item_type_created_idx
  on public.market_listings (item_type, created_at desc);
