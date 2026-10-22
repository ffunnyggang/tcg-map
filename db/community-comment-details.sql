
alter table public.community_comments add column author_avatar_url text, add column parent_id uuid references public.community_comments(id) on delete cascade;
create index community_comments_parent_idx on public.community_comments(parent_id,created_at);
alter table public.community_comments disable trigger trg_prepare_community_comment;
update public.community_comments c set author_avatar_url=p.avatar_url from public.profiles p where p.user_id=c.user_id;
alter table public.community_comments enable trigger trg_prepare_community_comment;
create function public.community_comment_details() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.parent_id is distinct from old.parent_id or new.post_id<>old.post_id or new.user_id<>old.user_id) then raise exception 'COMMENT_IDENTITY_IMMUTABLE'; end if;
 if new.parent_id is not null and not exists(select 1 from public.community_comments c where c.id=new.parent_id and c.post_id=new.post_id and c.status='published' and c.parent_id is null) then raise exception 'INVALID_REPLY_PARENT'; end if;
 if new.user_id=auth.uid() then select avatar_url into new.author_avatar_url from public.profiles where user_id=auth.uid();
 elsif tg_op='UPDATE' then new.author_avatar_url=old.author_avatar_url; else new.author_avatar_url=null; end if;
 return new;
end $$;
revoke all on function public.community_comment_details() from public,anon,authenticated;
create trigger community_comment_details before insert or update on public.community_comments for each row execute function public.community_comment_details();
grant select(author_avatar_url,parent_id),insert(parent_id) on public.community_comments to authenticated;
grant select(author_avatar_url,parent_id) on public.community_comments to anon;
create table public.community_comment_likes(comment_id uuid not null references public.community_comments(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(comment_id,user_id));
create index community_comment_likes_user_idx on public.community_comment_likes(user_id);
alter table public.community_comment_likes enable row level security;
revoke all on public.community_comment_likes from anon,authenticated;
grant select,insert,delete on public.community_comment_likes to authenticated;
create policy comment_likes_read on public.community_comment_likes for select to authenticated using(exists(select 1 from public.community_comments c where c.id=comment_id and c.status='published'));
create policy comment_likes_insert on public.community_comment_likes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.community_comments c join public.community_posts p on p.id=c.post_id where c.id=comment_id and c.status='published' and p.status='published'));
create policy comment_likes_delete on public.community_comment_likes for delete to authenticated using(user_id=(select auth.uid()));
create function public.community_comment_stats(ids uuid[]) returns table(comment_id uuid,like_count bigint,reply_count bigint,liked boolean) language sql stable security invoker set search_path='' as $$
 select c.id,(select count(*) from public.community_comment_likes l where l.comment_id=c.id),(select count(*) from public.community_comments r where r.parent_id=c.id and r.status='published'),exists(select 1 from public.community_comment_likes l where l.comment_id=c.id and l.user_id=auth.uid()) from public.community_comments c where c.id=any(ids[1:100]) and c.status='published'
$$;
revoke all on function public.community_comment_stats(uuid[]) from public,anon;
grant execute on function public.community_comment_stats(uuid[]) to authenticated;
