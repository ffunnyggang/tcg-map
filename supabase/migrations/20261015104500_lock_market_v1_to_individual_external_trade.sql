alter table public.market_listings
  add column if not exists seller_type text not null default 'individual',
  add column if not exists individual_seller_confirmed_at timestamptz,
  add column if not exists rights_republish_agreed_at timestamptz,
  add column if not exists external_trade_only_agreed_at timestamptz;

alter table public.market_listings
  drop constraint if exists market_listings_seller_type_check;

alter table public.market_listings
  add constraint market_listings_seller_type_check
  check (seller_type = 'individual');

revoke all on public.market_chat_rooms from anon, authenticated;
revoke all on public.market_chat_messages from anon, authenticated;
