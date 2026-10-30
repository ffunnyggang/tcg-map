create table public.home_hero_settings (
 id text primary key check (id='default'),
 interval_seconds numeric not null default 4.5 check(interval_seconds between 2 and 30),
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
create table public.home_hero_banners (
 slot smallint primary key check(slot between 1 and 5),
 title text not null check(length(btrim(title)) between 1 and 180),
 image_url text not null check(image_url ~ '^https://[^[:space:]<>"\\]+$'),
 target_url text not null check(target_url ~ '^https://[^[:space:]<>"\\]+$'),
 link_mode text not null default 'inapp' check(link_mode in ('inapp','external')),
 inapp_presentation text not null default 'page' check(inapp_presentation in ('page','bottom_sheet')),
 is_active boolean not null default true,
 starts_at timestamptz,
 ends_at timestamptz,
 check(ends_at is null or starts_at is null or ends_at>starts_at)
);
alter table public.home_hero_settings enable row level security;
alter table public.home_hero_banners enable row level security;
revoke all on public.home_hero_settings,public.home_hero_banners from anon,authenticated;
grant select on public.home_hero_settings,public.home_hero_banners to anon,authenticated;
grant update on public.home_hero_settings to authenticated;
grant insert,delete on public.home_hero_banners to authenticated;
create policy hero_settings_public_read on public.home_hero_settings for select to anon,authenticated using(true);
create policy hero_settings_admin_update on public.home_hero_settings for update to authenticated using(public.is_funypin_admin()) with check(public.is_funypin_admin());
create policy hero_banners_public_read on public.home_hero_banners for select to anon,authenticated using((is_active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())) or public.is_funypin_admin());
create policy hero_banners_admin_insert on public.home_hero_banners for insert to authenticated with check(public.is_funypin_admin());
create policy hero_banners_admin_delete on public.home_hero_banners for delete to authenticated using(public.is_funypin_admin());
insert into public.home_hero_settings(id) values('default');
insert into public.home_hero_banners(slot,title,image_url,target_url,starts_at) values
 (1,'더카드룸 × FUNY PIN 이벤트','https://funypin.kr/assets/banners/banner_hero_event_tcr.png?v=20261012-tcr1','https://funypin.kr/event-thecardroom.html','2026-10-12T11:00:00+09:00'),
 (2,'TCG MAP 바로가기','https://funypin.kr/assets/banners/banner_hero_01.png?v=20261004-0324','https://funypin.kr/shops.html',null),
 (3,'PICK 바로가기','https://funypin.kr/assets/banners/banner_hero_02.png?v=20260918-1604','https://funypin.kr/pick.html',null),
 (4,'TALK 바로가기','https://funypin.kr/assets/banners/banner_hero_03.png?v=20260918-1604','https://funypin.kr/talk.html',null),
 (5,'매장 등록 · 정보 수정 요청','https://funypin.kr/assets/banners/banner_hero_04.jpg?v=20260921-1650','https://funypin.kr/shop-request.html',null);
create function public.admin_save_home_hero(p_revision bigint,p_interval numeric,p_banners jsonb) returns bigint language plpgsql security invoker set search_path='' as $$
declare v_revision bigint; x jsonb; n integer:=0;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 if p_interval is null or p_interval not between 2 and 30 or jsonb_typeof(p_banners) is distinct from 'array' then raise exception 'INVALID_HERO_CONFIG';end if;
 if jsonb_array_length(p_banners)>5 then raise exception 'HERO_LIMIT_5';end if;
 select revision into v_revision from public.home_hero_settings where id='default' for update;
 if p_revision is distinct from v_revision then raise exception 'HERO_VERSION_CONFLICT' using errcode='40001';end if;
 delete from public.home_hero_banners;
 for x in select value from jsonb_array_elements(p_banners) loop
  n:=n+1;
  if jsonb_typeof(x->'is_active') is distinct from 'boolean' then raise exception 'INVALID_HERO_ACTIVE';end if;
  insert into public.home_hero_banners(slot,title,image_url,target_url,link_mode,inapp_presentation,is_active,starts_at,ends_at)
  values(n,btrim(x->>'title'),x->>'image_url',x->>'target_url',x->>'link_mode',x->>'inapp_presentation',(x->>'is_active')::boolean,nullif(x->>'starts_at','')::timestamptz,nullif(x->>'ends_at','')::timestamptz);
 end loop;
 update public.home_hero_settings set interval_seconds=p_interval,revision=revision+1,updated_at=now() where id='default' returning revision into v_revision;
 return v_revision;
end $$;
revoke all on function public.admin_save_home_hero(bigint,numeric,jsonb) from public,anon;
grant execute on function public.admin_save_home_hero(bigint,numeric,jsonb) to authenticated;
create function public.admin_get_home_hero() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('settings',(select to_jsonb(s) from public.home_hero_settings s where id='default'),'banners',(select coalesce(jsonb_agg(to_jsonb(b) order by slot),'[]'::jsonb) from public.home_hero_banners b)) where auth.uid() is not null and public.is_funypin_admin();
$$;
revoke all on function public.admin_get_home_hero() from public,anon;
grant execute on function public.admin_get_home_hero() to authenticated;
