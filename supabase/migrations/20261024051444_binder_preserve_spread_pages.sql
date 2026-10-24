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
 new.pages=b.pages;
 if new.is_public and not exists(select 1 from jsonb_array_elements(new.pages) x where nullif(x->>'path','') is not null) then raise exception 'PHOTO_REQUIRED'; end if;
 select * into p from public.profiles where user_id=auth.uid();
 new.author_nickname=coalesce(nullif(p.nickname,''),'수집가');new.avatar_url=p.avatar_url;new.updated_at=now();return new;
end $$;
