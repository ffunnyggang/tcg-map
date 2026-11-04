create table public.online_shops(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique default ('online-'||gen_random_uuid()::text),
 name text not null check(length(btrim(name)) between 1 and 120),
 address text check(address is null or length(address)<=300),
 website_url text check(website_url is null or (length(website_url)<=2000 and website_url ~ '^https://[^[:space:]]+$')),
 contact_url text check(contact_url is null or (length(contact_url)<=2000 and contact_url ~ '^https://[^[:space:]]+$')),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.online_shops enable row level security;
revoke all on public.online_shops from anon,authenticated;
grant select on public.online_shops to anon;
grant select,insert,update on public.online_shops to authenticated;
grant all on public.online_shops to service_role;
create policy online_shop_public_read on public.online_shops for select to anon,authenticated using(is_active);
create policy online_shop_admin_read on public.online_shops for select to authenticated using((select public.is_funypin_admin()));
create policy online_shop_admin_insert on public.online_shops for insert to authenticated with check((select public.is_funypin_admin()));
create policy online_shop_admin_update on public.online_shops for update to authenticated using((select public.is_funypin_admin())) with check((select public.is_funypin_admin()));
create function public.touch_online_shop_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$begin new.updated_at=clock_timestamp();return new;end$$;
revoke all on function public.touch_online_shop_updated_at() from public,anon;
grant execute on function public.touch_online_shop_updated_at() to authenticated,service_role;
create trigger online_shop_updated before update on public.online_shops for each row execute function public.touch_online_shop_updated_at();

alter table public.graded_products add column online_shop_id uuid references public.online_shops(id);
create index graded_products_online_shop_created on public.graded_products(online_shop_id,created_at desc) where online_shop_id is not null;
alter table public.graded_products drop constraint graded_seller_required;
alter table public.graded_products add constraint graded_seller_required check(shop_id is not null or online_shop_id is not null or (nullif(btrim(seller_name),'') is not null and nullif(btrim(seller_address),'') is not null));
alter table public.graded_products add constraint graded_single_shop check(num_nonnulls(shop_id,online_shop_id)<=1);

create table public.graded_online_shop_managers(
 online_shop_id uuid not null references public.online_shops(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 is_active boolean not null default true,
 assigned_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 primary key(online_shop_id,user_id)
);
create index graded_online_managers_user on public.graded_online_shop_managers(user_id,online_shop_id) where is_active;
alter table public.graded_online_shop_managers enable row level security;
revoke all on public.graded_online_shop_managers from anon,authenticated;
grant select on public.graded_online_shop_managers to authenticated;
grant all on public.graded_online_shop_managers to service_role;
create policy online_managers_read on public.graded_online_shop_managers for select to authenticated using(user_id=(select auth.uid()) or (select public.is_funypin_admin()));

alter table public.graded_registration_drafts add column online_shop_id uuid references public.online_shops(id);
alter table public.graded_registration_drafts alter column shop_id drop not null;
alter table public.graded_registration_drafts add constraint graded_draft_single_shop check(num_nonnulls(shop_id,online_shop_id)=1);

create or replace function public.can_manage_graded_shop(p_shop_id text) returns boolean
language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and (
  exists(select 1 from public.shops s where s.id=p_shop_id and s.is_active and
   (public.is_funypin_admin() or exists(select 1 from public.graded_shop_managers m where m.shop_id=s.id and m.user_id=auth.uid() and m.is_active)))
  or exists(select 1 from public.online_shops s where 'online:'||s.id::text=p_shop_id and s.is_active and
   (public.is_funypin_admin() or exists(select 1 from public.graded_online_shop_managers m where m.online_shop_id=s.id and m.user_id=auth.uid() and m.is_active)))
 );
$$;
alter policy graded_public_read on public.graded_products using(status='active' and (online_shop_id is null or exists(select 1 from public.online_shops s where s.id=online_shop_id and s.is_active)));
create policy graded_online_manager_read_products on public.graded_products for select to authenticated using(public.can_manage_graded_shop('online:'||online_shop_id::text));
create policy graded_admin_read_products on public.graded_products for select to authenticated using((select public.is_funypin_admin()));

create or replace function public.set_graded_shop_manager(p_shop_id text,p_email text,p_enabled boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid;v_online uuid;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 if p_enabled is null or length(btrim(p_email))>254 then raise exception 'INVALID_PERMISSION';end if;
 select id into v_online from public.online_shops where 'online:'||id::text=p_shop_id and is_active;
 if v_online is null and not exists(select 1 from public.shops where id=p_shop_id and is_active) then raise exception 'SHOP_NOT_FOUND';end if;
 select id into v_user from auth.users where lower(email)=lower(btrim(p_email)) and deleted_at is null and email_confirmed_at is not null and (banned_until is null or banned_until<=now()) limit 1;
 if v_user is null then raise exception 'REGISTERED_USER_REQUIRED';end if;
 if v_online is not null then
  insert into public.graded_online_shop_managers(online_shop_id,user_id,is_active,assigned_by)
  values(v_online,v_user,p_enabled,auth.uid()) on conflict(online_shop_id,user_id) do update set is_active=excluded.is_active,assigned_by=excluded.assigned_by,updated_at=now();
 else
  insert into public.graded_shop_managers(shop_id,user_id,is_active,assigned_by)
  values(p_shop_id,v_user,p_enabled,auth.uid()) on conflict(shop_id,user_id) do update set is_active=excluded.is_active,assigned_by=excluded.assigned_by,updated_at=now();
 end if;
 return jsonb_build_object('saved',true);
end$$;

create or replace function public.register_shop_graded_card(p_draft_id uuid,p_price_krw bigint) returns uuid
language plpgsql security definer set search_path='' as $$
declare d public.graded_registration_drafts%rowtype;v_id uuid;m jsonb;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED' using errcode='42501';end if;
 if p_price_krw is null or p_price_krw<1 or p_price_krw>9999999999 then raise exception 'INVALID_PRICE';end if;
 select * into d from public.graded_registration_drafts where id=p_draft_id and user_id=auth.uid() for update;
 if not found then raise exception 'DRAFT_NOT_FOUND' using errcode='42501';end if;
 if not public.can_manage_graded_shop(coalesce(d.shop_id,'online:'||d.online_shop_id::text)) then raise exception 'SHOP_PERMISSION_REQUIRED' using errcode='42501';end if;
 if d.product_id is not null then return d.product_id;end if;
 if d.expires_at<now() then raise exception 'DRAFT_EXPIRED';end if;
 m:=d.metadata;
 if m->>'cert_number' is distinct from d.cert_number or m->>'grading_company' is distinct from 'PSA'
 or m->>'tcg_type' not in ('pokemon','one_piece') or jsonb_array_length(m->'image_urls')<1 then raise exception 'INVALID_CARD_DATA';end if;
 insert into public.graded_products(tcg_type,grading_company,grade,issue_year,set_name,card_number,card_name,price_krw,image_urls,shop_id,online_shop_id,status,cert_number,is_sample,created_by,source_url,source_checked_at)
 values(m->>'tcg_type','PSA',m->>'grade',m->>'issue_year',m->>'set_name',m->>'card_number',m->>'card_name',p_price_krw,m->'image_urls',d.shop_id,d.online_shop_id,'active',d.cert_number,false,auth.uid(),m->>'source_url',(m->>'checked_at')::timestamptz)
 returning id into v_id;
 update public.graded_registration_drafts set product_id=v_id where id=d.id;
 return v_id;
end$$;

-- Link the existing sample records to one actual online-shop record.
insert into public.online_shops(slug,name,address) values('funycard','퍼니카드','서울 용산구');
