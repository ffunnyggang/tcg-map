-- Shop-scoped graded-card registration; external data is server-only.
create table public.graded_shop_managers(
 shop_id text not null references public.shops(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 is_active boolean not null default true,
 assigned_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 primary key(shop_id,user_id)
);
create index graded_shop_managers_user on public.graded_shop_managers(user_id,shop_id) where is_active;
alter table public.graded_shop_managers enable row level security;
revoke all on public.graded_shop_managers from anon,authenticated;
grant select on public.graded_shop_managers to authenticated;
grant all on public.graded_shop_managers to service_role;
create policy graded_managers_read on public.graded_shop_managers for select to authenticated using(user_id=(select auth.uid()) or (select public.is_funypin_admin()));

create table public.graded_cert_cache(
 cert_number text primary key check(cert_number ~ '^[0-9]{6,12}$'),
 metadata jsonb not null check(jsonb_typeof(metadata)='object'),
 fetched_at timestamptz not null default now()
);
create table public.graded_registration_drafts(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 shop_id text not null references public.shops(id),
 cert_number text not null check(cert_number ~ '^[0-9]{6,12}$'),
 metadata jsonb not null check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 minutes',
 product_id uuid references public.graded_products(id)
);
create index graded_drafts_user_time on public.graded_registration_drafts(user_id,created_at desc);
alter table public.graded_cert_cache enable row level security;
alter table public.graded_registration_drafts enable row level security;
revoke all on public.graded_cert_cache,public.graded_registration_drafts from anon,authenticated;
grant all on public.graded_cert_cache,public.graded_registration_drafts to service_role;

alter table public.graded_products
 add column created_by uuid references auth.users(id) on delete set null,
 add column source_url text,
 add column source_checked_at timestamptz;
create index graded_products_creator on public.graded_products(created_by) where created_by is not null;
create unique index graded_products_active_cert on public.graded_products(grading_company,cert_number)
 where status='active' and not is_sample and cert_number is not null;
create index graded_products_shop_created on public.graded_products(shop_id,created_at desc);

create function public.can_manage_graded_shop(p_shop_id text) returns boolean
language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.shops s where s.id=p_shop_id and s.is_active)
 and (public.is_funypin_admin() or exists(select 1 from public.graded_shop_managers m where m.shop_id=p_shop_id and m.user_id=auth.uid() and m.is_active));
$$;
revoke all on function public.can_manage_graded_shop(text) from public,anon;
grant execute on function public.can_manage_graded_shop(text) to authenticated,service_role;
create policy graded_manager_read_products on public.graded_products for select to authenticated
 using(public.can_manage_graded_shop(shop_id));

create function public.set_graded_shop_manager(p_shop_id text,p_email text,p_enabled boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 if p_enabled is null or length(btrim(p_email))>254 then raise exception 'INVALID_PERMISSION'; end if;
 if not exists(select 1 from public.shops where id=p_shop_id and is_active) then raise exception 'SHOP_NOT_FOUND'; end if;
 select id into v_user from auth.users where lower(email)=lower(btrim(p_email)) and deleted_at is null and email_confirmed_at is not null and (banned_until is null or banned_until<=now()) limit 1;
 if v_user is null then raise exception 'REGISTERED_USER_REQUIRED'; end if;
 insert into public.graded_shop_managers(shop_id,user_id,is_active,assigned_by)
 values(p_shop_id,v_user,p_enabled,auth.uid())
 on conflict(shop_id,user_id) do update set is_active=excluded.is_active,assigned_by=excluded.assigned_by,updated_at=now();
 return jsonb_build_object('saved',true);
end $$;
revoke all on function public.set_graded_shop_manager(text,text,boolean) from public,anon;
grant execute on function public.set_graded_shop_manager(text,text,boolean) to authenticated;

-- The only browser write path accepts a server-created draft and a selling price.
create function public.register_shop_graded_card(p_draft_id uuid,p_price_krw bigint) returns uuid
language plpgsql security definer set search_path='' as $$
declare d public.graded_registration_drafts%rowtype; v_id uuid; m jsonb;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED' using errcode='42501'; end if;
 if p_price_krw is null or p_price_krw<1 or p_price_krw>9999999999 then raise exception 'INVALID_PRICE'; end if;
 select * into d from public.graded_registration_drafts where id=p_draft_id and user_id=auth.uid() for update;
 if not found then raise exception 'DRAFT_NOT_FOUND' using errcode='42501'; end if;
 if not public.can_manage_graded_shop(d.shop_id) then raise exception 'SHOP_PERMISSION_REQUIRED' using errcode='42501'; end if;
 if d.product_id is not null then return d.product_id; end if;
 if d.expires_at<now() then raise exception 'DRAFT_EXPIRED'; end if;
 m:=d.metadata;
 if m->>'cert_number' is distinct from d.cert_number or m->>'grading_company' is distinct from 'PSA'
 or m->>'tcg_type' not in ('pokemon','one_piece') or jsonb_array_length(m->'image_urls')<1 then raise exception 'INVALID_CARD_DATA'; end if;
 insert into public.graded_products(tcg_type,grading_company,grade,issue_year,set_name,card_number,card_name,price_krw,image_urls,shop_id,status,cert_number,is_sample,created_by,source_url,source_checked_at)
 values(m->>'tcg_type','PSA',m->>'grade',m->>'issue_year',m->>'set_name',m->>'card_number',m->>'card_name',p_price_krw,m->'image_urls',d.shop_id,'active',d.cert_number,false,auth.uid(),m->>'source_url',(m->>'checked_at')::timestamptz)
 returning id into v_id;
 update public.graded_registration_drafts set product_id=v_id where id=d.id;
 return v_id;
end $$;
revoke all on function public.register_shop_graded_card(uuid,bigint) from public,anon;
grant execute on function public.register_shop_graded_card(uuid,bigint) to authenticated;
