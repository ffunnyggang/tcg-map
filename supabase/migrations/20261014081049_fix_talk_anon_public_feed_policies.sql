-- Allow unauthenticated users to read published TALK feed rows without
-- evaluating the admin-only SECURITY DEFINER helper.
-- Authenticated users keep the existing owner/admin visibility behavior.

alter policy community_posts_public_read
on public.community_posts
to authenticated
using (
  status = 'published'
  or user_id = (select auth.uid())
  or (select public.is_funypin_admin())
);

create policy community_posts_anon_published_read
on public.community_posts
for select
to anon
using (status = 'published');

alter policy community_images_public_read
on public.community_post_images
to authenticated
using (
  exists (
    select 1
    from public.community_posts p
    where p.id = community_post_images.post_id
      and (
        p.status = 'published'
        or p.user_id = (select auth.uid())
        or (select public.is_funypin_admin())
      )
  )
);

create policy community_images_anon_published_read
on public.community_post_images
for select
to anon
using (
  exists (
    select 1
    from public.community_posts p
    where p.id = community_post_images.post_id
      and p.status = 'published'
  )
);
