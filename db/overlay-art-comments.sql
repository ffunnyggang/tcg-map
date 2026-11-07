create table public.overlay_art_comments (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 1200),
 created_at timestamptz not null default now()
);
create index overlay_art_comments_created_idx on public.overlay_art_comments(created_at desc,id desc);
create index overlay_art_comments_user_idx on public.overlay_art_comments(user_id);
alter table public.overlay_art_comments enable row level security;
revoke all on public.overlay_art_comments from anon,authenticated;
grant select,delete on public.overlay_art_comments to authenticated;
grant insert(user_id,body) on public.overlay_art_comments to authenticated;
create policy overlay_comments_test_gate on public.overlay_art_comments as restrictive for all to authenticated
using ((select auth.uid()) in ('e3d2e87f-bcdd-4ecf-bdb8-22866f5a5b25'::uuid,'826fdceb-da2f-4e5e-b9a6-b372a6cf5425'::uuid) or (select auth.jwt()->'app_metadata'->>'card_overlay_test')='true')
with check ((select auth.uid()) in ('e3d2e87f-bcdd-4ecf-bdb8-22866f5a5b25'::uuid,'826fdceb-da2f-4e5e-b9a6-b372a6cf5425'::uuid) or (select auth.jwt()->'app_metadata'->>'card_overlay_test')='true');
create policy overlay_comments_read on public.overlay_art_comments for select to authenticated using (true);
create policy overlay_comments_write on public.overlay_art_comments for insert to authenticated with check ((select auth.uid())=user_id);
create policy overlay_comments_delete on public.overlay_art_comments for delete to authenticated using ((select auth.uid())=user_id);
