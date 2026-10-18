create index if not exists market_listing_publication_events_listing_id_idx
  on public.market_listing_publication_events (listing_id)
  where listing_id is not null;
