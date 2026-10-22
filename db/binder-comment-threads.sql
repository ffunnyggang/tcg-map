alter table public.binder_comments add column parent_id uuid references public.binder_comments(id) on delete cascade;
create index binder_comments_reply_parent_idx on public.binder_comments(parent_id,created_at);
grant insert(parent_id) on public.binder_comments to authenticated;
create function public.binder_reply_validate() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and new.parent_id is distinct from old.parent_id then raise exception 'IMMUTABLE_PARENT';end if;
 if new.parent_id is not null and not exists(select 1 from public.binder_comments c where c.id=new.parent_id and c.binder_id=new.binder_id and not c.hidden) then raise exception 'INVALID_PARENT';end if;
 return new;
end $$;
revoke all on function public.binder_reply_validate() from public;
create trigger binder_reply_validate before insert or update on public.binder_comments for each row execute function public.binder_reply_validate();
create table public.binder_comment_likes(
 comment_id uuid not null references public.binder_comments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(comment_id,user_id)
);
alter table public.binder_comment_likes enable row level security;
create policy binder_comment_likes_read on public.binder_comment_likes for select to authenticated using(exists(select 1 from public.binder_comments c where c.id=comment_id));
create policy binder_comment_likes_add on public.binder_comment_likes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.binder_comments c join public.binder_publications p on p.id=c.binder_id where c.id=comment_id and p.is_public and not p.hidden));
create policy binder_comment_likes_remove on public.binder_comment_likes for delete to authenticated using(user_id=(select auth.uid()));
revoke all on public.binder_comment_likes from anon,authenticated;
grant select,insert,delete on public.binder_comment_likes to authenticated;
create index binder_comment_likes_user_idx on public.binder_comment_likes(user_id);
create function public.binder_comment_stats(ids uuid[]) returns table(comment_id uuid,like_count bigint,reply_count bigint,liked boolean) language sql stable security invoker set search_path='' as $$
 select c.id,(select count(*) from public.binder_comment_likes l where l.comment_id=c.id),(select count(*) from public.binder_comments r where r.parent_id=c.id),exists(select 1 from public.binder_comment_likes l where l.comment_id=c.id and l.user_id=auth.uid())
 from public.binder_comments c where c.id=any(ids[1:100])
$$;
revoke all on function public.binder_comment_stats(uuid[]) from public;
grant execute on function public.binder_comment_stats(uuid[]) to authenticated;