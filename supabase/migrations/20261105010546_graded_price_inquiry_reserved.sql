alter table public.graded_products add column price_on_request boolean not null default false;
alter table public.graded_products add constraint graded_inquiry_price check(not price_on_request or price_krw is null);
alter table public.graded_products drop constraint graded_products_status_check;
alter table public.graded_products add constraint graded_products_status_check check(status in ('draft','active','reserved','sold','hidden'));
drop index public.graded_products_active_cert;
create unique index graded_products_active_cert on public.graded_products(grading_company,cert_number) where status in ('active','reserved') and not is_sample and cert_number is not null;
drop index public.graded_products_browse;
create index graded_products_browse on public.graded_products(tcg_type,created_at desc) where status in ('active','reserved');
alter policy graded_public_read on public.graded_products using(status in ('active','reserved') and deleted_at is null and (online_shop_id is null or exists(select 1 from public.online_shops s where s.id=graded_products.online_shop_id and s.is_active)));
create function public.register_shop_graded_card_priced(p_draft_id uuid,p_price_krw bigint,p_contact_type text default 'none',p_contact_value text default null,p_price_on_request boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 if auth.uid() is null then raise exception 'SHOP_PERMISSION_REQUIRED' using errcode='42501'; end if;
 if not public.valid_graded_contact(p_contact_type,p_contact_value) then raise exception 'INVALID_CONTACT'; end if;
 if p_price_on_request is null or (p_price_on_request and p_price_krw is not null) then raise exception 'INVALID_PRICE';end if;
 pid:=public.register_shop_graded_card(p_draft_id,case when p_price_on_request then 1 else p_price_krw end);
 update public.graded_products set price_on_request=p_price_on_request,price_krw=case when p_price_on_request then null else price_krw end,contact_type=p_contact_type,contact_value=p_contact_value,revision=revision+1 where id=pid and revision=0 and deleted_at is null;
 return pid;
end $$;
create function public.manage_shop_graded_card_priced(p_shop_id text,p_product_id uuid,p_action text,p_revision bigint,p_price_krw bigint default null,p_status text default null,p_contact_type text default 'none',p_contact_value text default null,p_price_on_request boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.graded_products;
begin
 if auth.uid() is null or not public.can_manage_graded_shop(p_shop_id) then raise exception 'SHOP_PERMISSION_REQUIRED' using errcode='42501'; end if;
 select * into item from public.graded_products where id=p_product_id for update;
 if not found or item.deleted_at is not null or (case when item.online_shop_id is not null then 'online:'||item.online_shop_id::text else item.shop_id end) is distinct from p_shop_id then raise exception 'PRODUCT_NOT_FOUND'; end if;
 if p_revision is null or p_revision<>item.revision then raise exception 'PRODUCT_CONFLICT' using errcode='40001'; end if;
 if p_action='delete' then
  update public.graded_products set deleted_at=clock_timestamp(),status='hidden',revision=revision+1 where id=item.id;
 elsif p_action='update' then
  if p_price_on_request is null or (p_price_on_request and p_price_krw is not null) or (not p_price_on_request and (p_price_krw is null or p_price_krw<1 or p_price_krw>9999999999)) then raise exception 'INVALID_PRICE'; end if;
  if p_status is null or p_status not in ('active','reserved','sold','hidden','draft') then raise exception 'INVALID_STATUS'; end if;
  if not public.valid_graded_contact(p_contact_type,p_contact_value) then raise exception 'INVALID_CONTACT'; end if;
  update public.graded_products set price_krw=p_price_krw,price_on_request=p_price_on_request,status=p_status,contact_type=p_contact_type,contact_value=p_contact_value,revision=revision+1 where id=item.id;
 else raise exception 'INVALID_ACTION'; end if;
 return item.id;
end $$;
revoke all on function public.register_shop_graded_card_priced(uuid,bigint,text,text,boolean),public.manage_shop_graded_card_priced(text,uuid,text,bigint,bigint,text,text,text,boolean) from public,anon;
grant execute on function public.register_shop_graded_card_priced(uuid,bigint,text,text,boolean),public.manage_shop_graded_card_priced(text,uuid,text,bigint,bigint,text,text,text,boolean) to authenticated;
