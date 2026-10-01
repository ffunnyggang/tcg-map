create table if not exists public.user_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'funy_mon',
  source_id uuid null,
  title text not null,
  description text null,
  code text null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_entries_user_created_idx on public.user_entries(user_id, created_at desc);
alter table public.user_entries enable row level security;
drop policy if exists user_entries_select_own on public.user_entries;
create policy user_entries_select_own on public.user_entries for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'event',
  source_id uuid null,
  title text not null,
  description text null,
  code text null,
  status text not null default 'issued',
  shop_name text null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_coupons_user_issued_idx on public.user_coupons(user_id, issued_at desc);
alter table public.user_coupons enable row level security;
drop policy if exists user_coupons_select_own on public.user_coupons;
create policy user_coupons_select_own on public.user_coupons for select to authenticated using ((select auth.uid()) = user_id);

alter table public.funy_mon_reward_claims add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists funy_mon_reward_claims_user_created_idx on public.funy_mon_reward_claims(user_id, created_at desc);
drop policy if exists funy_mon_reward_claims_select_own on public.funy_mon_reward_claims;
create policy funy_mon_reward_claims_select_own on public.funy_mon_reward_claims for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists funy_mon_catches_select_own on public.funy_mon_catches;
create policy funy_mon_catches_select_own on public.funy_mon_catches for select to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id,name,public,allowed_mime_types,file_size_limit)
values ('profile-images','profile-images',true,array['image/png','image/jpeg','image/webp'],1048576)
on conflict (id) do update set public=true,allowed_mime_types=excluded.allowed_mime_types,file_size_limit=excluded.file_size_limit;

drop policy if exists profile_images_select_own on storage.objects;
create policy profile_images_select_own on storage.objects for select to authenticated using (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists profile_images_insert_own on storage.objects;
create policy profile_images_insert_own on storage.objects for insert to authenticated with check (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists profile_images_update_own on storage.objects;
create policy profile_images_update_own on storage.objects for update to authenticated using (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists profile_images_delete_own on storage.objects;
create policy profile_images_delete_own on storage.objects for delete to authenticated using (bucket_id='profile-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
