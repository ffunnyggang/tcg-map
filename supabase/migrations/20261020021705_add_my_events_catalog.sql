create table if not exists public.my_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  detail_url text not null,
  is_visible boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists my_events_visible_sort_idx
on public.my_events(is_visible,sort_order,starts_at desc);

alter table public.my_events enable row level security;

drop policy if exists my_events_member_read on public.my_events;
create policy my_events_member_read
on public.my_events for select
to authenticated
using (is_visible=true);

drop policy if exists my_events_admin_all on public.my_events;
create policy my_events_admin_all
on public.my_events for all
to authenticated
using ((select public.is_funypin_admin()))
with check ((select public.is_funypin_admin()));

grant select on public.my_events to authenticated;
grant insert,update,delete on public.my_events to authenticated;
