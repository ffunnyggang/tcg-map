create table public.card_art_window_presets (
  kind text primary key check (kind in ('regular','evolution','classic')),
  x numeric(4,1) not null check (x >= 0),
  y numeric(4,1) not null check (y >= 0),
  w numeric(4,1) not null check (w >= 5),
  h numeric(4,1) not null check (h >= 5),
  revision integer not null default 0 check (revision >= 0),
  check (x + w <= 63 and y + h <= 88)
);

insert into public.card_art_window_presets (kind,x,y,w,h) values
  ('regular',5.3,9.1,52.4,32.1),
  ('evolution',5.3,10.1,52.7,31.4),
  ('classic',7.9,11.7,47.4,33.2);

alter table public.card_art_window_presets enable row level security;
revoke all on public.card_art_window_presets from public,anon,authenticated;
grant select on public.card_art_window_presets to anon,authenticated;
grant update (x,y,w,h,revision) on public.card_art_window_presets to authenticated;

create policy card_art_window_presets_read on public.card_art_window_presets
  for select to anon,authenticated using (true);

create policy card_art_window_presets_admin_update on public.card_art_window_presets
  for update to authenticated
  using ((select public.is_funypin_admin()))
  with check ((select public.is_funypin_admin()));
