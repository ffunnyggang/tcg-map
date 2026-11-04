alter table public.graded_products add column contact_type text not null default 'none', add column contact_value text, add column deleted_at timestamptz, add column revision bigint not null default 0;
create function public.valid_graded_contact(t text,v text) returns boolean language sql immutable set search_path='' as $$ select coalesce(case t when 'none' then v is null when 'visit' then v is null or length(v)<=300 when 'phone' then v ~ '^\+?[0-9][0-9 -]{6,19}$' when 'email' then length(v)<=254 and v ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' when 'instagram' then v ~ '^[A-Za-z0-9_.]{1,30}$' else false end,false) $$;
alter table public.graded_products add constraint graded_products_contact_check check(public.valid_graded_contact(contact_type,contact_value));
create function public.register_shop_graded_card_with_contact(p_draft_id uuid,p_price_krw bigint,p_contact_type text default 'none',p_contact_value text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 if auth.uid() is null then raise exception 'SHOP_PERMISSION_REQUIRED' using errcode='42501'; end if;
 if not public.valid_graded_contact(p_contact_type,p_contact_value) then raise exception 'INVALID_CONTACT'; end if;
 pid:=public.register_shop_graded_card(p_draft_id,p_price_krw);
 update public.graded_products set contact_type=p_contact_type,contact_value=p_contact_value,revision=revision+1 where id=pid and revision=0 and deleted_at is null;
 return pid;
end $$;
create function public.manage_shop_graded_card(p_shop_id text,p_product_id uuid,p_action text,p_revision bigint,p_price_krw bigint default null,p_status text default null,p_contact_type text default 'none',p_contact_value text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.graded_products;
begin
 if auth.uid() is null or not public.can_manage_graded_shop(p_shop_id) then raise exception 'SHOP_PERMISSION_REQUIRED' using errcode='42501'; end if;
 select * into item from public.graded_products where id=p_product_id for update;
 if not found or item.deleted_at is not null or (case when item.online_shop_id is not null then 'online:'||item.online_shop_id::text else item.shop_id end) is distinct from p_shop_id then raise exception 'PRODUCT_NOT_FOUND'; end if;
 if p_revision is null or p_revision<>item.revision then raise exception 'PRODUCT_CONFLICT' using errcode='40001'; end if;
 if p_action='delete' then
  update public.graded_products set deleted_at=clock_timestamp(),status='hidden',revision=revision+1 where id=item.id;
 elsif p_action='update' then
  if p_price_krw is null or p_price_krw<1 or p_price_krw>9999999999 then raise exception 'INVALID_PRICE'; end if;
  if p_status is null or p_status not in ('active','sold','hidden','draft') then raise exception 'INVALID_STATUS'; end if;
  if not public.valid_graded_contact(p_contact_type,p_contact_value) then raise exception 'INVALID_CONTACT'; end if;
  update public.graded_products set price_krw=p_price_krw,status=p_status,contact_type=p_contact_type,contact_value=p_contact_value,revision=revision+1 where id=item.id;
 else raise exception 'INVALID_ACTION'; end if;
 return item.id;
end $$;
revoke all on function public.register_shop_graded_card_with_contact(uuid,bigint,text,text), public.manage_shop_graded_card(text,uuid,text,bigint,bigint,text,text,text) from public,anon;
grant execute on function public.register_shop_graded_card_with_contact(uuid,bigint,text,text), public.manage_shop_graded_card(text,uuid,text,bigint,bigint,text,text,text) to authenticated;
