alter table public.market_listings
  add column if not exists published_at timestamptz,
  add column if not exists expires_at timestamptz;

update public.market_listings
set
  published_at = coalesce(published_at, created_at),
  expires_at = coalesce(expires_at, coalesce(published_at, created_at) + interval '14 days')
where published_at is null or expires_at is null;

alter table public.market_listings
  alter column published_at set default now(),
  alter column published_at set not null,
  alter column expires_at set default (now() + interval '14 days'),
  alter column expires_at set not null;

create index if not exists market_listings_active_expires_idx
  on public.market_listings (expires_at)
  where listing_status in ('active','reserved');

create table if not exists public.market_listing_publication_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid null references public.market_listings(id) on delete set null,
  provider text not null,
  external_listing_id text null,
  publication_kind text not null default 'new'
    check (publication_kind in ('initial','new','republish')),
  published_at timestamptz not null default now()
);

alter table public.market_listing_publication_events enable row level security;

revoke all on table public.market_listing_publication_events from public, anon, authenticated;
grant select, insert, update, delete on table public.market_listing_publication_events to service_role;

create index if not exists market_listing_publication_events_user_time_idx
  on public.market_listing_publication_events (user_id, published_at desc);

insert into public.market_listing_publication_events
  (user_id, listing_id, provider, external_listing_id, publication_kind, published_at)
select
  l.seller_user_id,
  l.id,
  l.provider,
  l.external_listing_id,
  'initial',
  l.published_at
from public.market_listings l
where not exists (
  select 1
  from public.market_listing_publication_events e
  where e.listing_id = l.id
);

create or replace function public.claim_market_listing_publication_quota(
  p_user_id uuid,
  p_provider text,
  p_external_listing_id text,
  p_publication_kind text default 'new'
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_day_start timestamptz;
  v_month_start timestamptz;
  v_daily_count integer;
  v_monthly_count integer;
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'MARKET_USER_REQUIRED';
  end if;

  if p_publication_kind not in ('new','republish') then
    raise exception 'MARKET_INVALID_PUBLICATION_KIND';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_day_start := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  v_month_start := date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';

  select count(*)::integer
    into v_daily_count
  from public.market_listing_publication_events
  where user_id = p_user_id
    and published_at >= v_day_start;

  if v_daily_count >= 10 then
    raise exception 'MARKET_DAILY_LIMIT_REACHED';
  end if;

  select count(*)::integer
    into v_monthly_count
  from public.market_listing_publication_events
  where user_id = p_user_id
    and published_at >= v_month_start;

  if v_monthly_count >= 30 then
    raise exception 'MARKET_MONTHLY_LIMIT_REACHED';
  end if;

  insert into public.market_listing_publication_events(
    user_id, provider, external_listing_id, publication_kind, published_at
  )
  values (
    p_user_id, coalesce(nullif(trim(p_provider),''),'unknown'),
    nullif(trim(p_external_listing_id),''),
    p_publication_kind, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.claim_market_listing_publication_quota(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.claim_market_listing_publication_quota(uuid,text,text,text) to service_role;

create or replace function public.expire_due_market_listings()
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  update public.market_listings
  set
    listing_status = 'expired',
    hidden_reason = 'listing_expired',
    hidden_at = coalesce(hidden_at, now()),
    updated_at = now()
  where listing_status in ('active','reserved')
    and expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_due_market_listings() from public, anon, authenticated;
grant execute on function public.expire_due_market_listings() to service_role;

do $$
declare
  v_job bigint;
begin
  select jobid into v_job from cron.job where jobname='market-listing-expire' limit 1;
  if v_job is not null then
    perform cron.unschedule(v_job);
  end if;
end $$;

select cron.schedule(
  'market-listing-expire',
  '*/10 * * * *',
  $$select public.expire_due_market_listings();$$
);
