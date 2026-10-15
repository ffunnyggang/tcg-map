create table if not exists public.funy_mon_map_settings (
  id text primary key default 'default',
  is_enabled boolean not null default false,
  event_id uuid null references public.funy_mon_events(id) on delete set null,
  collapse_seconds integer not null default 4 check (collapse_seconds between 1 and 30),
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  constraint funy_mon_map_settings_singleton check (id = 'default')
);

insert into public.funy_mon_map_settings (id,is_enabled,event_id,collapse_seconds)
values ('default',false,null,4)
on conflict (id) do nothing;

alter table public.funy_mon_map_settings enable row level security;

grant select on public.funy_mon_map_settings to anon, authenticated;
grant insert, update, delete on public.funy_mon_map_settings to authenticated;

drop policy if exists funy_mon_map_settings_public_select on public.funy_mon_map_settings;
create policy funy_mon_map_settings_public_select
on public.funy_mon_map_settings
for select
to anon, authenticated
using (true);

drop policy if exists funy_mon_map_settings_admin_insert on public.funy_mon_map_settings;
create policy funy_mon_map_settings_admin_insert
on public.funy_mon_map_settings
for insert
to authenticated
with check ((select public.is_funypin_admin()));

drop policy if exists funy_mon_map_settings_admin_update on public.funy_mon_map_settings;
create policy funy_mon_map_settings_admin_update
on public.funy_mon_map_settings
for update
to authenticated
using ((select public.is_funypin_admin()))
with check ((select public.is_funypin_admin()));

drop policy if exists funy_mon_map_settings_admin_delete on public.funy_mon_map_settings;
create policy funy_mon_map_settings_admin_delete
on public.funy_mon_map_settings
for delete
to authenticated
using ((select public.is_funypin_admin()));
