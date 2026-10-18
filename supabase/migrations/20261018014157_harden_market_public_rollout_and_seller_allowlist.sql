alter table public.market_listings
  drop constraint if exists market_listings_listing_status_check;

alter table public.market_listings
  add constraint market_listings_listing_status_check
  check (listing_status = any (array[
    'active'::text,
    'reserved'::text,
    'sold'::text,
    'hidden'::text,
    'expired'::text,
    'deleted'::text
  ]));

create table if not exists public.market_seller_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  note text,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.market_seller_allowlist enable row level security;

revoke all on table public.market_seller_allowlist from public, anon, authenticated;
grant select, insert, update, delete on table public.market_seller_allowlist to service_role;

insert into public.market_seller_allowlist(user_id,is_active,note)
select distinct seller_user_id,true,'Existing MARKET tester migrated at production rollout'
from public.market_listings
where seller_user_id is not null
on conflict (user_id) do update
set is_active=true, updated_at=now();

drop policy if exists market_listings_authenticated_read on public.market_listings;
drop policy if exists market_listings_public_read on public.market_listings;
drop policy if exists market_listings_owner_read on public.market_listings;
drop policy if exists market_listings_owner_delete on public.market_listings;

create policy market_listings_public_read
on public.market_listings
for select
to anon, authenticated
using (
  listing_side='sell'
  and listing_status in ('active','reserved')
  and expires_at > now()
);

create policy market_listings_owner_read
on public.market_listings
for select
to authenticated
using ((select auth.uid()) = seller_user_id);

revoke all on table public.market_listings from anon, authenticated;
grant select on table public.market_listings to anon, authenticated;
grant update (road_address, location_name, updated_at)
on table public.market_listings to authenticated;

create or replace function public.protect_market_listing_verified_source_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is not null
     and not coalesce(public.is_funypin_admin(), false) then
    if new.seller_user_id is distinct from old.seller_user_id
       or new.seller_nickname is distinct from old.seller_nickname
       or new.provider is distinct from old.provider
       or new.external_url is distinct from old.external_url
       or new.external_listing_id is distinct from old.external_listing_id
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.price is distinct from old.price
       or new.currency is distinct from old.currency
       or new.thumbnail_url is distinct from old.thumbnail_url
       or new.image_urls is distinct from old.image_urls
       or new.external_status is distinct from old.external_status
       or new.direct_buy_available is distinct from old.direct_buy_available
       or new.external_account_id is distinct from old.external_account_id
       or new.seller_verified_at is distinct from old.seller_verified_at
       or new.seller_verification_scope is distinct from old.seller_verification_scope
       or new.seller_verification_challenge_id is distinct from old.seller_verification_challenge_id
       or new.fetched_at is distinct from old.fetched_at
       or new.source_last_checked_at is distinct from old.source_last_checked_at
       or new.source_refresh_count is distinct from old.source_refresh_count
       or new.source_status is distinct from old.source_status
       or new.listing_status is distinct from old.listing_status
       or new.hidden_reason is distinct from old.hidden_reason
       or new.hidden_at is distinct from old.hidden_at
       or new.published_at is distinct from old.published_at
       or new.expires_at is distinct from old.expires_at
       or new.listing_side is distinct from old.listing_side
       or new.tcg_category is distinct from old.tcg_category
       or new.item_type is distinct from old.item_type
       or new.country_code is distinct from old.country_code
       or new.latitude is distinct from old.latitude
       or new.longitude is distinct from old.longitude
       or new.place_name is distinct from old.place_name
       or new.seller_type is distinct from old.seller_type
       or new.individual_seller_confirmed_at is distinct from old.individual_seller_confirmed_at
       or new.rights_republish_agreed_at is distinct from old.rights_republish_agreed_at
       or new.external_trade_only_agreed_at is distinct from old.external_trade_only_agreed_at
    then
      raise exception 'MARKET_SERVER_MANAGED_FIELDS';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_market_listing_verified_source_fields()
from public, anon, authenticated;

create or replace function public.market_listing_get_stats(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_views bigint := 0;
  v_favorites bigint := 0;
  v_is_favorite boolean := false;
begin
  if not exists (
    select 1
    from public.market_listings ml
    where ml.id = p_listing_id
      and (
        (ml.listing_status in ('active','reserved') and ml.expires_at > now())
        or ml.seller_user_id = v_user
      )
  ) then
    raise exception 'listing_not_found';
  end if;

  select coalesce(sum(mv.view_count),0)
    into v_views
    from public.market_listing_views mv
    where mv.listing_id = p_listing_id;

  select count(*)
    into v_favorites
    from public.market_listing_favorites mf
    where mf.listing_id = p_listing_id;

  if v_user is not null then
    select exists(
      select 1
      from public.market_listing_favorites mf
      where mf.listing_id = p_listing_id
        and mf.user_id = v_user
    ) into v_is_favorite;
  end if;

  return jsonb_build_object(
    'view_count', v_views,
    'favorite_count', v_favorites,
    'is_favorite', v_is_favorite
  );
end;
$$;

create or replace function public.market_listing_record_view(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_user is null then
    raise exception 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.market_listings ml
    where ml.id = p_listing_id
      and (
        (ml.listing_status in ('active','reserved') and ml.expires_at > v_now)
        or ml.seller_user_id = v_user
      )
  ) then
    raise exception 'listing_not_found';
  end if;

  insert into public.market_listing_views(
    listing_id,user_id,view_count,first_viewed_at,last_viewed_at
  )
  values (p_listing_id,v_user,1,v_now,v_now)
  on conflict (listing_id,user_id) do update
    set view_count = case
      when public.market_listing_views.last_viewed_at <= v_now - interval '30 minutes'
        then public.market_listing_views.view_count + 1
      else public.market_listing_views.view_count
    end,
    last_viewed_at = case
      when public.market_listing_views.last_viewed_at <= v_now - interval '30 minutes'
        then v_now
      else public.market_listing_views.last_viewed_at
    end;

  return public.market_listing_get_stats(p_listing_id);
end;
$$;
