drop policy if exists market_chat_rooms_buyer_create on public.market_chat_rooms;
create policy market_chat_rooms_buyer_create
on public.market_chat_rooms
for insert
to authenticated
with check (
  market_chat_rooms.buyer_user_id = (select auth.uid())
  and market_chat_rooms.seller_user_id <> (select auth.uid())
  and exists (
    select 1
    from public.market_listings l
    where l.id = market_chat_rooms.listing_id
      and l.seller_user_id = market_chat_rooms.seller_user_id
      and l.listing_status in ('active','reserved')
  )
);
