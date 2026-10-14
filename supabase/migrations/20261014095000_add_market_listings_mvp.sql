create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  seller_nickname text not null,
  provider text not null default 'daangn' check (provider in ('daangn')),
  external_url text not null,
  external_listing_id text,
  title text not null,
  description text,
  price bigint,
  currency text not null default 'KRW',
  thumbnail_url text,
  external_status text,
  listing_status text not null default 'active' check (listing_status in ('active','reserved','sold','hidden','expired')),
  country_code text not null default 'KR',
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_listings_status_created_idx
  on public.market_listings (listing_status, created_at desc);

create index if not exists market_listings_location_idx
  on public.market_listings (country_code, latitude, longitude);

create unique index if not exists market_listings_seller_external_uidx
  on public.market_listings (seller_user_id, provider, external_listing_id)
  where external_listing_id is not null;

alter table public.market_listings enable row level security;

grant select on public.market_listings to anon, authenticated;
grant insert, update, delete on public.market_listings to authenticated;

drop policy if exists market_listings_public_read on public.market_listings;
create policy market_listings_public_read
on public.market_listings
for select
to anon, authenticated
using (
  listing_status in ('active','reserved','sold')
  or seller_user_id = (select auth.uid())
);

drop policy if exists market_listings_owner_insert on public.market_listings;
create policy market_listings_owner_insert
on public.market_listings
for insert
to authenticated
with check (seller_user_id = (select auth.uid()));

drop policy if exists market_listings_owner_update on public.market_listings;
create policy market_listings_owner_update
on public.market_listings
for update
to authenticated
using (seller_user_id = (select auth.uid()))
with check (seller_user_id = (select auth.uid()));

drop policy if exists market_listings_owner_delete on public.market_listings;
create policy market_listings_owner_delete
on public.market_listings
for delete
to authenticated
using (seller_user_id = (select auth.uid()));
