-- Fresh-install schema; deployed through migration overlay_private_generated_images.
create table public.overlay_generations (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 mode text not null check (mode in ('original','independent','fullart')),
 raw_path text not null unique,
 image_path text not null unique,
 result_kind text not null default 'provider' check (result_kind in ('provider','prepared')),
 width integer not null check (width>0 and width<=4096),
 height integer not null check (height>0 and height<=4096),
 window_rect jsonb,
 model text not null,
 prompt_version text not null,
 request_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index overlay_generations_user_created_idx on public.overlay_generations(user_id,created_at desc);
alter table public.overlay_generations enable row level security;
revoke all on public.overlay_generations from anon,authenticated;
grant select,insert,update,delete on public.overlay_generations to service_role;
comment on table public.overlay_generations is 'Private test-account generated images. Original card uploads are not retained. Access through authenticated owner-filtered Edge Function only.';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('overlay-generated-images','overlay-generated-images',false,20971520,array['image/png'])
 on conflict(id) do nothing;
