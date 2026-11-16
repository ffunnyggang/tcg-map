create table public.overlay_admin_print_imports (
 id uuid primary key,
 reference_id text not null references public.overlay_art_references(id),
 label text not null,
 cut_rect jsonb not null,
 image_base64 text not null default '',
 active boolean not null default false,
 created_at timestamptz not null default now(),
 check (length(image_base64) <= 1500000),
 check (not active or image_base64 like '/9j/%')
);
create index overlay_admin_print_imports_reference_idx
 on public.overlay_admin_print_imports (reference_id) where active;
alter table public.overlay_admin_print_imports enable row level security;
revoke all on public.overlay_admin_print_imports from public, anon, authenticated;
grant select on public.overlay_admin_print_imports to service_role;
