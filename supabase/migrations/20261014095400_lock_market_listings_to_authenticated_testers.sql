revoke select on public.market_listings from anon;

drop policy if exists market_listings_public_read on public.market_listings;
create policy market_listings_authenticated_read
on public.market_listings
for select
to authenticated
using (
  listing_status in ('active','reserved','sold')
  or seller_user_id = (select auth.uid())
);
