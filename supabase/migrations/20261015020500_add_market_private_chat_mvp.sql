alter table public.market_listings
  add column if not exists direct_buy_available boolean;

create table if not exists public.market_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  seller_nickname text not null,
  buyer_nickname text not null,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_chat_rooms_distinct_users check (seller_user_id <> buyer_user_id),
  constraint market_chat_rooms_listing_buyer_unique unique (listing_id, buyer_user_id)
);

create index if not exists market_chat_rooms_seller_last_idx
  on public.market_chat_rooms (seller_user_id, last_message_at desc nulls last);
create index if not exists market_chat_rooms_buyer_last_idx
  on public.market_chat_rooms (buyer_user_id, last_message_at desc nulls last);

create table if not exists public.market_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.market_chat_rooms(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists market_chat_messages_room_created_idx
  on public.market_chat_messages (room_id, created_at asc);
create index if not exists market_chat_messages_unread_idx
  on public.market_chat_messages (room_id, read_at)
  where read_at is null;

alter table public.market_chat_rooms enable row level security;
alter table public.market_chat_messages enable row level security;

revoke all on public.market_chat_rooms from anon;
revoke all on public.market_chat_messages from anon;

grant select, insert on public.market_chat_rooms to authenticated;
grant update (last_message_at, last_message_preview, updated_at) on public.market_chat_rooms to authenticated;
grant select, insert on public.market_chat_messages to authenticated;
grant update (read_at) on public.market_chat_messages to authenticated;

drop policy if exists market_chat_rooms_participant_read on public.market_chat_rooms;
create policy market_chat_rooms_participant_read
on public.market_chat_rooms
for select
to authenticated
using (
  seller_user_id = (select auth.uid())
  or buyer_user_id = (select auth.uid())
);

drop policy if exists market_chat_rooms_buyer_create on public.market_chat_rooms;
create policy market_chat_rooms_buyer_create
on public.market_chat_rooms
for insert
to authenticated
with check (
  buyer_user_id = (select auth.uid())
  and seller_user_id <> (select auth.uid())
  and exists (
    select 1
    from public.market_listings l
    where l.id = listing_id
      and l.seller_user_id = seller_user_id
      and l.listing_status in ('active','reserved')
  )
);

drop policy if exists market_chat_rooms_participant_touch on public.market_chat_rooms;
create policy market_chat_rooms_participant_touch
on public.market_chat_rooms
for update
to authenticated
using (
  seller_user_id = (select auth.uid())
  or buyer_user_id = (select auth.uid())
)
with check (
  seller_user_id = (select auth.uid())
  or buyer_user_id = (select auth.uid())
);

drop policy if exists market_chat_messages_participant_read on public.market_chat_messages;
create policy market_chat_messages_participant_read
on public.market_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.market_chat_rooms r
    where r.id = room_id
      and (
        r.seller_user_id = (select auth.uid())
        or r.buyer_user_id = (select auth.uid())
      )
  )
);

drop policy if exists market_chat_messages_participant_send on public.market_chat_messages;
create policy market_chat_messages_participant_send
on public.market_chat_messages
for insert
to authenticated
with check (
  sender_user_id = (select auth.uid())
  and exists (
    select 1
    from public.market_chat_rooms r
    where r.id = room_id
      and (
        r.seller_user_id = (select auth.uid())
        or r.buyer_user_id = (select auth.uid())
      )
  )
);

drop policy if exists market_chat_messages_recipient_read on public.market_chat_messages;
create policy market_chat_messages_recipient_read
on public.market_chat_messages
for update
to authenticated
using (
  sender_user_id <> (select auth.uid())
  and exists (
    select 1
    from public.market_chat_rooms r
    where r.id = room_id
      and (
        r.seller_user_id = (select auth.uid())
        or r.buyer_user_id = (select auth.uid())
      )
  )
)
with check (
  sender_user_id <> (select auth.uid())
  and exists (
    select 1
    from public.market_chat_rooms r
    where r.id = room_id
      and (
        r.seller_user_id = (select auth.uid())
        or r.buyer_user_id = (select auth.uid())
      )
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='market_chat_messages'
  ) then
    alter publication supabase_realtime add table public.market_chat_messages;
  end if;
end $$;
