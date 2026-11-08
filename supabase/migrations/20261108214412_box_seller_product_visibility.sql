-- Seller/product visibility is independent of daily prices and survives new uploads.
create table public.box_seller_product_visibility (
 seller_name text not null references public.box_price_sellers(seller_name),
 product_id text not null references public.box_products(product_id),
 is_visible boolean not null default true,
 updated_at timestamptz not null default now(),
 primary key (seller_name,product_id)
);
alter table public.box_seller_product_visibility enable row level security;
revoke all on public.box_seller_product_visibility from anon,authenticated;
grant select,insert,update on public.box_seller_product_visibility to service_role;
comment on table public.box_seller_product_visibility is 'Manual visibility per seller/product; absent rows are visible. Daily prices and upload evidence are preserved.';
