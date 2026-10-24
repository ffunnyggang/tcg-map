alter table public.binders add column tcg_types text[] not null default '{}' check(tcg_types <@ array['포켓몬','원피스','드래곤볼','리프트바운드','기타 TCG']::text[] and cardinality(tcg_types)<=5 and array_position(tcg_types,null) is null);
alter table public.binder_publications add column tcg_types text[] not null default '{}' check(tcg_types <@ array['포켓몬','원피스','드래곤볼','리프트바운드','기타 TCG']::text[] and cardinality(tcg_types)<=5 and array_position(tcg_types,null) is null);
create or replace function public.binder_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare b public.binders; p public.profiles;
begin
 if current_user in ('postgres','service_role') and tg_op='UPDATE' then return new; end if;
 select * into b from public.binders where id=new.id and user_id=auth.uid();
 if b.id is null then raise exception 'NOT_OWNER'; end if;
 if tg_op='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id then raise exception 'IMMUTABLE_OWNER'; end if;
  new.hidden=old.hidden;new.published_at=old.published_at;
  if old.is_public and new.is_public and old.is_listed and not new.is_listed then return new; end if;
 else new.hidden=false;new.published_at=now(); end if;
 new.user_id=b.user_id;new.title=b.title;new.description=b.description;new.pockets=b.pockets;new.cover=b.cover;new.cover_color=b.cover_color;new.tcg_types=b.tcg_types;
 select coalesce(jsonb_agg(x),'[]') into new.pages from jsonb_array_elements(b.pages) x where nullif(x->>'path','') is not null;
 if new.is_public and jsonb_array_length(new.pages)=0 then raise exception 'PHOTO_REQUIRED'; end if;
 select * into p from public.profiles where user_id=auth.uid();
 new.author_nickname=coalesce(nullif(p.nickname,''),'수집가');new.avatar_url=p.avatar_url;new.updated_at=now();return new;
end $$;
