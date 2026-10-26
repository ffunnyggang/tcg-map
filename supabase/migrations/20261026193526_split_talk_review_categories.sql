begin;

alter table public.community_posts
  drop constraint if exists community_posts_category_check;

update public.community_posts
set category = '카드샵 후기'
where category = '카드깡/카드샵 후기';

alter table public.community_posts
  add constraint community_posts_category_check
  check (
    category = any (
      array[
        '자유 게시판'::text,
        '카드 자랑'::text,
        '카드샵 후기'::text,
        '카드깡 후기'::text,
        '정보 공유'::text
      ]
    )
  );

commit;
