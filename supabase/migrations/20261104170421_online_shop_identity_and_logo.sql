alter table public.online_shops add column management_no bigint generated always as identity, add column shop_code text generated always as ('ONL-' || lpad(management_no::text, greatest(3,length(management_no::text)), '0')) stored, add column logo_url text;
alter table public.online_shops add constraint online_shops_shop_code_key unique (shop_code), add constraint online_shops_logo_url_check check (logo_url is null or (length(logo_url)<=2000 and (logo_url ~ '^https://[^[:space:]]+$' or logo_url ~ '^/assets/shop-logo/[A-Za-z0-9_.-]+$')));
update public.online_shops set logo_url='/assets/shop-logo/funycard.webp' where slug='funycard';
update public.online_shops set logo_url='/assets/shop-logo/hobbyselect.webp' where slug='hobbyselect';
