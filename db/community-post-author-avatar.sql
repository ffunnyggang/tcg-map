alter table public.community_posts add column author_avatar_url text;
update public.community_posts p set author_avatar_url=pr.avatar_url from public.profiles pr where pr.user_id=p.user_id;
create function public.community_post_avatar_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.user_id=auth.uid() then
 select avatar_url into new.author_avatar_url from public.profiles where user_id=auth.uid();
 elsif tg_op='UPDATE' then new.author_avatar_url=old.author_avatar_url;
 else new.author_avatar_url=null;
 end if;
 return new;
end $$;
revoke all on function public.community_post_avatar_snapshot() from public;
create trigger community_post_avatar_snapshot before insert or update on public.community_posts for each row execute function public.community_post_avatar_snapshot();