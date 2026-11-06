-- Schema applied via overlay_shared_symbol_asset migration. Asset bytes are private Storage PNG.
create table public.overlay_symbol_assets (id text primary key,image_path text not null unique,placement jsonb not null,source_generation_id uuid references public.overlay_generations(id) on delete set null,created_at timestamptz not null default now());
alter table public.overlay_symbol_assets enable row level security;
revoke all on public.overlay_symbol_assets from anon,authenticated;
grant select,insert,update,delete on public.overlay_symbol_assets to service_role;
