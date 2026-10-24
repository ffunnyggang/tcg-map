-- TALK reports accept a binder target without duplicating community posts.
alter table public.community_post_reports alter column post_id drop not null;
alter table public.community_post_reports add column binder_id uuid references public.binder_publications(id) on delete cascade;
alter table public.community_post_reports add column binder_comment_id uuid references public.binder_comments(id) on delete cascade;
alter table public.community_post_reports add constraint community_report_one_target check ((post_id is not null)::int+(binder_id is not null)::int=1);
alter table public.community_post_reports add constraint community_report_binder_comment check (binder_comment_id is null or binder_id is not null);
create unique index community_report_binder_once on public.community_post_reports(binder_id,reporter_user_id) where binder_id is not null and binder_comment_id is null;
create unique index community_report_binder_comment_once on public.community_post_reports(binder_comment_id,reporter_user_id) where binder_comment_id is not null;
create index community_report_binder_target on public.community_post_reports(binder_id);
drop policy community_reports_insert_own on public.community_post_reports;
create policy community_reports_insert_own on public.community_post_reports for insert to authenticated with check (
 reporter_user_id=(select auth.uid()) and (binder_id is null or (
 exists(select 1 from public.binder_publications b where b.id=binder_id and b.is_public and not b.hidden and (binder_comment_id is not null or b.user_id<>(select auth.uid())))
 and (binder_comment_id is null or exists(select 1 from public.binder_comments c where c.id=binder_comment_id and c.binder_id=community_post_reports.binder_id and c.user_id<>(select auth.uid())))
 )));
-- Keep old cached clients compatible; all incoming binder reports reach TALK moderation.
create function public.binder_report_to_talk() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.community_post_reports(binder_id,binder_comment_id,reporter_user_id,reason,detail,created_at)
 values(new.binder_id,new.comment_id,new.user_id,case when new.reason in ('spam','abuse','inappropriate','privacy','other') then new.reason else 'other' end,new.reason,new.created_at)
 on conflict do nothing;
 return new;
end $$;
create trigger binder_report_to_talk after insert on public.binder_reports for each row execute function public.binder_report_to_talk();
insert into public.community_post_reports(binder_id,binder_comment_id,reporter_user_id,reason,detail,created_at)
select binder_id,comment_id,user_id,case when reason in ('spam','abuse','inappropriate','privacy','other') then reason else 'other' end,reason,created_at from public.binder_reports on conflict do nothing;
-- Allow the existing admin identity to review/hide a binder without exposing drafts.
create policy binder_public_admin_read on public.binder_publications for select to authenticated using ((select public.is_funypin_admin()));
create policy binder_public_admin_update on public.binder_publications for update to authenticated using ((select public.is_funypin_admin())) with check ((select public.is_funypin_admin()));
grant update(hidden) on public.binder_publications to authenticated;
create or replace function public.binder_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare b public.binders; p public.profiles; moderation_hidden boolean;
begin
 if current_user in ('postgres','service_role') and tg_op='UPDATE' then return new; end if;
 if tg_op='UPDATE' and new.hidden is distinct from old.hidden and public.is_funypin_admin() then
  moderation_hidden=new.hidden;new=old;new.hidden=moderation_hidden;return new;
 end if;
 select * into b from public.binders where id=new.id and user_id=auth.uid();
 if b.id is null then raise exception 'NOT_OWNER'; end if;
 if tg_op='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id then raise exception 'IMMUTABLE_OWNER'; end if;
  new.hidden=old.hidden;new.published_at=old.published_at;
  if old.is_public and new.is_public and old.is_listed and not new.is_listed then return new; end if;
 else new.hidden=false;new.published_at=now(); end if;
 new.user_id=b.user_id;new.title=b.title;new.description=b.description;new.pockets=b.pockets;new.cover=b.cover;new.cover_color=b.cover_color;new.tcg_types=b.tcg_types;new.pages=b.pages;
 -- An already-listed binder can become empty during editing without losing the user's save.
 if new.is_public and pg_trigger_depth()<2 and not exists(select 1 from jsonb_array_elements(new.pages) x where nullif(x->>'path','') is not null) then raise exception 'PHOTO_REQUIRED'; end if;
 select * into p from public.profiles where user_id=auth.uid();
 new.author_nickname=coalesce(nullif(p.nickname,''),'수집가');new.avatar_url=p.avatar_url;new.updated_at=now();return new;
end $$;
create function public.binder_sync_listed_publication() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.user_id is distinct from auth.uid() then return new; end if;
 update public.binder_publications set is_listed=true where id=new.id and user_id=new.user_id and is_public and is_listed;
 return new;
end $$;
create trigger binder_sync_listed_publication after update on public.binders for each row execute function public.binder_sync_listed_publication();
