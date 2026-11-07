create or replace function public.publish_overlay_art_review(p_id uuid,p_title text,p_body text,p_path text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); existing uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_id is null or p_path is distinct from u::text||'/'||p_id::text||'/overlay-review.jpg' then raise exception 'INVALID_IMAGE_PATH'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select p.id into existing from public.community_posts p join public.community_post_images i on i.post_id=p.id
 where p.id=p_id and p.user_id=u and i.storage_path=p_path and p.status='published';
 if existing is not null then return existing; end if;
 if not exists(select 1 from storage.objects where bucket_id='community-posts' and name=p_path) then raise exception 'IMAGE_REQUIRED'; end if;
 insert into public.community_posts(id,user_id,author_nickname,category,title,body)
 values(p_id,u,'-','자유 게시판',p_title,p_body);
 insert into public.community_post_images(post_id,user_id,storage_path,sort_order) values(p_id,u,p_path,0);
 return p_id;
end $$;
revoke all on function public.publish_overlay_art_review(uuid,text,text,text) from public,anon;
grant execute on function public.publish_overlay_art_review(uuid,text,text,text) to authenticated;