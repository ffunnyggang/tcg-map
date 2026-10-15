alter table public.market_listings
  drop constraint if exists market_listings_provider_check;

alter table public.market_listings
  add constraint market_listings_provider_check
  check (provider in ('daangn','bunjang','break'));
