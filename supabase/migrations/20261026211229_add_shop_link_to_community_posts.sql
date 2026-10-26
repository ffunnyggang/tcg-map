alter table public.community_posts
  add column if not exists shop_id text null;

alter table public.community_posts
  drop constraint if exists community_posts_shop_id_fkey;

alter table public.community_posts
  add constraint community_posts_shop_id_fkey
  foreign key (shop_id)
  references public.shops(id)
  on delete restrict;

alter table public.community_posts
  drop constraint if exists community_posts_shop_review_shop_check;

alter table public.community_posts
  add constraint community_posts_shop_review_shop_check
  check (
    (category = '카드샵 후기' and (shop_id is not null or created_at < timestamptz '2026-10-26 21:12:29+00'))
    or
    (category <> '카드샵 후기' and shop_id is null)
  );

create index if not exists community_posts_shop_review_feed_idx
  on public.community_posts (shop_id, created_at desc)
  where status = 'published' and category = '카드샵 후기';
