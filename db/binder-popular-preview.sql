create or replace function public.binder_popular_preview() returns table(id uuid,title text,cover text,cover_color text,author_nickname text,avatar_url text,like_count bigint,comment_count bigint,view_count bigint) language sql stable security invoker set search_path='' as $$
select p.id,p.title,p.cover,p.cover_color,p.author_nickname,p.avatar_url,
(select count(*) from public.binder_likes l where l.binder_id=p.id) as like_count,
(select count(*) from public.binder_comments c where c.binder_id=p.id and not c.hidden) as comment_count,
(select count(*) from public.binder_views v where v.binder_id=p.id) as view_count
from public.binder_publications p where p.is_public and p.is_listed and not p.hidden
order by like_count desc,comment_count desc,view_count desc,p.published_at desc,p.id limit 10
$$;
revoke all on function public.binder_popular_preview() from public,anon;
grant execute on function public.binder_popular_preview() to authenticated;