alter table public.graded_products alter column shop_id drop not null;
alter table public.graded_products alter column price_krw drop not null;
alter table public.graded_products add column seller_name text, add column seller_address text, add column cert_number text, add column is_sample boolean not null default false;
alter table public.graded_products add constraint graded_seller_required check (shop_id is not null or (nullif(btrim(seller_name),'') is not null and nullif(btrim(seller_address),'') is not null));
create unique index graded_sample_certificate on public.graded_products(cert_number) where is_sample and cert_number is not null;
