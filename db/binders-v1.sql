-- FUNY PIN binders. Private drafts and explicitly published snapshots.
create table public.binders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default '나의 바인더' check(char_length(title) between 1 and 60),
 description text not null default '' check(char_length(description)<=500), pockets integer not null check(pockets in(4,6,9,12)),
 pages jsonb not null default '[]', cover text, revision integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index binders_owner_idx on public.binders(user_id);
create table public.binder_publications (
 id uuid primary key references public.binders(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, description text not null default '', pockets integer not null, pages jsonb not null, cover text,
 author_nickname text not null default '수집가', avatar_url text,
 is_public boolean not null default true, hidden boolean not null default false,
 published_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index binder_publications_feed_idx on public.binder_publications(published_at desc) where is_public and not hidden;
create index binder_publications_owner_idx on public.binder_publications(user_id);
create table public.binder_likes(binder_id uuid not null references public.binder_publications(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(binder_id,user_id));
create table public.binder_comments(id uuid primary key default gen_random_uuid(),binder_id uuid not null references public.binder_publications(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,body text not null check(char_length(trim(body)) between 1 and 500),author_nickname text not null default '수집가',avatar_url text,created_at timestamptz not null default now(),hidden boolean not null default false);
create index binder_comments_parent_idx on public.binder_comments(binder_id,created_at);
create index binder_comments_owner_idx on public.binder_comments(user_id);
create table public.binder_views(binder_id uuid not null references public.binder_publications(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,view_day date not null default (now() at time zone 'Asia/Seoul')::date,primary key(binder_id,user_id,view_day));
create table public.binder_reports(id uuid primary key default gen_random_uuid(),binder_id uuid not null references public.binder_publications(id) on delete cascade,comment_id uuid references public.binder_comments(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,reason text not null check(char_length(trim(reason)) between 1 and 300),created_at timestamptz not null default now());
create index binder_reports_parent_idx on public.binder_reports(binder_id);
create index binder_reports_comment_idx on public.binder_reports(comment_id);
create index binder_reports_owner_idx on public.binder_reports(user_id);

create function public.binder_validate_draft() returns trigger language plpgsql security invoker set search_path='' as $$
declare p jsonb; path text;
begin
 if new.user_id <> auth.uid() then raise exception 'NOT_OWNER'; end if;
 if tg_op='INSERT' then
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,42));
  if (select count(*) from public.binders where user_id=new.user_id)>=3 then raise exception 'BINDER_LIMIT'; end if;
  new.created_at=now(); new.revision=0;
 else
  if new.id<>old.id or new.user_id<>old.user_id then raise exception 'IMMUTABLE_OWNER'; end if;
  if new.revision<>old.revision+1 then raise exception 'REVISION_CONFLICT'; end if;
  new.created_at=old.created_at;
 end if;
 if jsonb_typeof(new.pages)<>'array' or jsonb_array_length(new.pages)>60 then raise exception 'PAGE_LIMIT'; end if;
 if exists(select 1 from jsonb_array_elements(new.pages) x group by x->>'id' having count(*)>1) then raise exception 'DUPLICATE_PAGE'; end if;
 for p in select value from jsonb_array_elements(new.pages) loop
  if jsonb_typeof(p)<>'object' or coalesce(p->>'id','')!~'^[a-zA-Z0-9-]{1,64}$' then raise exception 'INVALID_PAGE'; end if;
  path=p->>'path';
  if path is not null and (path not like new.user_id::text||'/'||new.id::text||'/%' or path like '%..%') then raise exception 'INVALID_PATH'; end if;
 end loop;
 if new.cover is not null and (new.cover not like new.user_id::text||'/'||new.id::text||'/%' or new.cover like '%..%') then raise exception 'INVALID_COVER'; end if;
 new.updated_at=now(); return new;
end $$;
create trigger binder_draft_validate before insert or update on public.binders for each row execute function public.binder_validate_draft();

create function public.binder_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare b public.binders; p public.profiles;
begin
 if current_user in ('postgres','service_role') and tg_op='UPDATE' then return new; end if;
 select * into b from public.binders where id=new.id and user_id=auth.uid();
 if b.id is null then raise exception 'NOT_OWNER'; end if;
 if tg_op='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id then raise exception 'IMMUTABLE_OWNER'; end if;
  new.hidden=old.hidden;new.published_at=old.published_at;
 else new.hidden=false;new.published_at=now(); end if;
 new.user_id=b.user_id;new.title=b.title;new.description=b.description;new.pockets=b.pockets;new.cover=b.cover;
 select coalesce(jsonb_agg(x),'[]') into new.pages from jsonb_array_elements(b.pages) x where nullif(x->>'path','') is not null;
 if new.is_public and jsonb_array_length(new.pages)=0 then raise exception 'PHOTO_REQUIRED'; end if;
 select * into p from public.profiles where user_id=auth.uid();
 new.author_nickname=coalesce(nullif(p.nickname,''),'수집가');new.avatar_url=p.avatar_url;new.updated_at=now();return new;
end $$;
create trigger binder_publish_snapshot before insert or update on public.binder_publications for each row execute function public.binder_snapshot();
create function public.binder_comment_author() returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.profiles;
begin
 if current_user in ('postgres','service_role') and tg_op='UPDATE' then return new; end if;
 if new.user_id<>auth.uid() then raise exception 'NOT_OWNER'; end if;
 if tg_op='UPDATE' then
  new.id=old.id;new.binder_id=old.binder_id;new.user_id=old.user_id;new.created_at=old.created_at;new.hidden=old.hidden;
 else
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,43));
  if exists(select 1 from public.binder_comments where user_id=auth.uid() and created_at>now()-interval '10 seconds') then raise exception 'COMMENT_RATE_LIMIT'; end if;
  new.created_at=now();new.hidden=false;
 end if;
 select * into p from public.profiles where user_id=auth.uid();new.author_nickname=coalesce(nullif(p.nickname,''),'수집가');new.avatar_url=p.avatar_url;return new;
end $$;
create trigger binder_comment_identity before insert or update on public.binder_comments for each row execute function public.binder_comment_author();

alter table public.binders enable row level security;
alter table public.binder_publications enable row level security;
alter table public.binder_likes enable row level security;
alter table public.binder_comments enable row level security;
alter table public.binder_views enable row level security;
alter table public.binder_reports enable row level security;
create policy binder_own_select on public.binders for select to authenticated using(user_id=(select auth.uid()));
create policy binder_own_insert on public.binders for insert to authenticated with check(user_id=(select auth.uid()));
create policy binder_own_update on public.binders for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy binder_own_delete on public.binders for delete to authenticated using(user_id=(select auth.uid()));
create policy binder_public_read on public.binder_publications for select to authenticated using(user_id=(select auth.uid()) or (is_public and not hidden and not exists(select 1 from public.community_user_blocks b where b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=binder_publications.user_id)));
create policy binder_public_insert on public.binder_publications for insert to authenticated with check(user_id=(select auth.uid()));
create policy binder_public_update on public.binder_publications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy binder_likes_read on public.binder_likes for select to authenticated using(exists(select 1 from public.binder_publications p where p.id=binder_id));
create policy binder_likes_insert on public.binder_likes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.binder_publications p where p.id=binder_id and p.is_public and not p.hidden));
create policy binder_likes_delete on public.binder_likes for delete to authenticated using(user_id=(select auth.uid()));
create policy binder_comments_read on public.binder_comments for select to authenticated using(not hidden and exists(select 1 from public.binder_publications p where p.id=binder_id) and not exists(select 1 from public.community_user_blocks b where b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=binder_comments.user_id));
create policy binder_comments_insert on public.binder_comments for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.binder_publications p where p.id=binder_id and p.is_public and not p.hidden));
create policy binder_comments_update on public.binder_comments for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy binder_comments_delete on public.binder_comments for delete to authenticated using(user_id=(select auth.uid()));
create policy binder_views_read on public.binder_views for select to authenticated using(exists(select 1 from public.binder_publications p where p.id=binder_id));
create policy binder_views_insert on public.binder_views for insert to authenticated with check(user_id=(select auth.uid()) and view_day=(now() at time zone 'Asia/Seoul')::date and exists(select 1 from public.binder_publications p where p.id=binder_id and p.is_public and not p.hidden));
create policy binder_reports_insert on public.binder_reports for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.binder_publications p where p.id=binder_id) and (comment_id is null or exists(select 1 from public.binder_comments c where c.id=comment_id and c.binder_id=binder_reports.binder_id)));
revoke all on public.binders,public.binder_publications,public.binder_likes,public.binder_comments,public.binder_views,public.binder_reports from anon,authenticated;
grant select,insert,update,delete on public.binders to authenticated;
grant select on public.binder_publications to authenticated;
grant insert(id,user_id,is_public),update(is_public) on public.binder_publications to authenticated;
grant select,insert,delete on public.binder_likes to authenticated;
grant select,delete on public.binder_comments to authenticated;
grant insert(binder_id,user_id,body),update(body) on public.binder_comments to authenticated;
grant select,insert on public.binder_views to authenticated;
grant insert on public.binder_reports to authenticated;
revoke all on function public.binder_validate_draft(),public.binder_snapshot(),public.binder_comment_author() from public;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('binders','binders',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy binder_storage_insert on storage.objects for insert to authenticated with check(bucket_id='binders' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.binders b where b.id::text=(storage.foldername(name))[2] and b.user_id=(select auth.uid())));
create policy binder_storage_read on storage.objects for select to authenticated using(bucket_id='binders' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.binder_publications p where p.is_public and not p.hidden and (p.cover=name or p.pages @> jsonb_build_array(jsonb_build_object('path',name))))));
create policy binder_storage_delete on storage.objects for delete to authenticated using(bucket_id='binders' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.binder_publications p where p.cover=name or p.pages @> jsonb_build_array(jsonb_build_object('path',name))));
