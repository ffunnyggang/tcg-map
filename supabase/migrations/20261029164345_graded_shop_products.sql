create table public.graded_products (
 id uuid primary key default gen_random_uuid(),
 tcg_type text not null check (tcg_type in ('pokemon','one_piece')),
 grading_company text not null check (grading_company in ('PSA','BRG')),
 grade text not null check (length(grade) between 1 and 20),
 issue_year text not null check (issue_year ~ '^[0-9]{4}$'),
 set_name text not null check (length(set_name) between 1 and 200),
 card_number text not null check (length(card_number) between 1 and 40),
 card_name text not null check (length(card_name) between 1 and 200),
 price_krw bigint not null check (price_krw >= 0),
 image_urls jsonb not null default '[]' check (jsonb_typeof(image_urls)='array'),
 shop_id text not null references public.shops(id),
 status text not null default 'draft' check (status in ('draft','active','sold','hidden')),
 created_at timestamptz not null default now(),
 view_count bigint not null default 0 check (view_count >= 0),
 favorite_count bigint not null default 0 check (favorite_count >= 0)
);
create index graded_products_browse on public.graded_products(tcg_type,created_at desc) where status='active';
create index graded_products_shop on public.graded_products(shop_id);
alter table public.graded_products enable row level security;
revoke all on public.graded_products from anon,authenticated;
grant select on public.graded_products to anon,authenticated;
grant all on public.graded_products to service_role;
create policy graded_public_read on public.graded_products for select to anon,authenticated using(status='active');

create table public.graded_product_favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id uuid not null references public.graded_products(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,product_id)
);
create index graded_favorites_product on public.graded_product_favorites(product_id);
alter table public.graded_product_favorites enable row level security;
revoke all on public.graded_product_favorites from anon,authenticated;
grant select,insert,delete on public.graded_product_favorites to authenticated;
grant all on public.graded_product_favorites to service_role;
create policy graded_favorite_read on public.graded_product_favorites for select to authenticated using((select auth.uid())=user_id);
create policy graded_favorite_add on public.graded_product_favorites for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.graded_products p where p.id=product_id and p.status='active'));
create policy graded_favorite_remove on public.graded_product_favorites for delete to authenticated using((select auth.uid())=user_id);

create table public.graded_product_views (
 product_id uuid not null references public.graded_products(id) on delete cascade,
 view_key uuid not null, created_at timestamptz not null default now(), primary key(product_id,view_key)
);
alter table public.graded_product_views enable row level security;
revoke all on public.graded_product_views from anon,authenticated;
grant insert(product_id,view_key) on public.graded_product_views to anon,authenticated;
grant all on public.graded_product_views to service_role;
create policy graded_view_add on public.graded_product_views for insert to anon,authenticated with check(exists(select 1 from public.graded_products p where p.id=product_id and p.status='active'));
-- These private trigger functions maintain public counters without exposing users' favorites/views.
create function private.graded_favorite_counter() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  update public.graded_products set favorite_count=favorite_count+1 where id=NEW.product_id;
  return NEW;
 else
  update public.graded_products set favorite_count=greatest(0,favorite_count-1) where id=OLD.product_id;
  return OLD;
 end if;
end $$;
revoke all on function private.graded_favorite_counter() from public,anon,authenticated;
create trigger graded_favorite_counter after insert or delete on public.graded_product_favorites for each row execute function private.graded_favorite_counter();
create function private.graded_view_counter() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.graded_products set view_count=view_count+1 where id=NEW.product_id;
 return NEW;
end $$;
revoke all on function private.graded_view_counter() from public,anon,authenticated;
create trigger graded_view_counter after insert on public.graded_product_views for each row execute function private.graded_view_counter();
