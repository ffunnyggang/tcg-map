alter table public.community_posts
  drop constraint if exists community_posts_shop_review_shop_check;

alter table public.community_posts
  add constraint community_posts_shop_review_shop_check
  check (
    (category = '카드샵 후기' and (shop_id is not null or created_at < timestamptz '2026-10-26 21:12:29+00'))
    or
    (category <> '카드샵 후기' and shop_id is null)
  );
