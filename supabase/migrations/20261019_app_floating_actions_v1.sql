begin;

create table if not exists public.app_floating_actions (
  platform text not null default 'android',
  surface text not null,
  mode text not null default 'native',
  label_ko text not null,
  action_key text not null,
  target_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (platform,surface),
  constraint app_floating_actions_platform_check check (platform in ('android','ios','web')),
  constraint app_floating_actions_surface_check check (surface in ('home','map','pick','talk')),
  constraint app_floating_actions_mode_check check (mode in ('native','web','off')),
  constraint app_floating_actions_action_check check (action_key in ('live_pin','map_actions','external_link'))
);

alter table public.app_floating_actions enable row level security;

grant select on table public.app_floating_actions to anon, authenticated;
grant insert, update, delete on table public.app_floating_actions to authenticated;
grant select, insert, update, delete on table public.app_floating_actions to service_role;

drop policy if exists "floating actions public read" on public.app_floating_actions;
create policy "floating actions public read"
  on public.app_floating_actions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "floating actions admin manage" on public.app_floating_actions;
create policy "floating actions admin manage"
  on public.app_floating_actions
  for all
  to authenticated
  using (public.is_funypin_admin())
  with check (public.is_funypin_admin());

create or replace function public.touch_app_floating_actions_updated_at()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

revoke execute on function public.touch_app_floating_actions_updated_at() from public, anon, authenticated;
grant execute on function public.touch_app_floating_actions_updated_at() to service_role;

drop trigger if exists app_floating_actions_touch_updated_at on public.app_floating_actions;
create trigger app_floating_actions_touch_updated_at
before update on public.app_floating_actions
for each row execute function public.touch_app_floating_actions_updated_at();

insert into public.app_floating_actions(platform,surface,mode,label_ko,action_key,target_url,is_active,sort_order)
values
  ('android','home','native','LIVE PIN','live_pin',null,true,10),
  ('android','map','native','제보 · 매물 등록','map_actions',null,true,20),
  ('android','pick','native','LIVE PIN','live_pin',null,true,30),
  ('android','talk','native','POKAMO에 글쓰기','external_link','https://cafe.daangn.com/pokamo-pokesm-1',true,40)
on conflict(platform,surface) do nothing;

commit;
