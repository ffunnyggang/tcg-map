alter table public.community_posts
  drop constraint if exists community_posts_shop_id_fkey;

alter table public.community_posts
  add constraint community_posts_shop_id_fkey
  foreign key (shop_id)
  references public.shops(id)
  on delete restrict;
