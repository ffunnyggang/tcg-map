-- Existing user_coupons rows and policies are preserved. New issuance uses admin_coupon only.
create table public.coupon_campaigns (
 id uuid primary key,
 title text not null check (length(title) between 1 and 80),
 benefit_text text not null check (length(benefit_text) between 1 and 1000),
 image_path text not null,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 instructions text not null check (length(instructions) between 1 and 3000),
 shop_name text not null check (length(shop_name) between 1 and 120),
 staff_user_ids uuid[] not null default '{}',
 issuance_limit integer not null check (issuance_limit between 1 and 10000),
 is_active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 request_payload jsonb not null,
 check (ends_at > starts_at),
 check (cardinality(staff_user_ids) <= 20)
);
alter table public.coupon_campaigns enable row level security;
revoke all on public.coupon_campaigns from anon,authenticated;
grant select on public.coupon_campaigns to authenticated;
create policy coupon_campaigns_admin_read on public.coupon_campaigns for select to authenticated
 using ((select public.is_funypin_admin()));

create unique index user_coupons_admin_campaign_user_unique on public.user_coupons(source_id,user_id)
 where source_type='admin_coupon';
create unique index user_coupons_admin_code_unique on public.user_coupons(code)
 where source_type='admin_coupon';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('coupon-benefits','coupon-benefits',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy coupon_benefits_admin_insert on storage.objects for insert to authenticated
 with check (bucket_id='coupon-benefits' and (select public.is_funypin_admin()));
create policy coupon_benefits_admin_select on storage.objects for select to authenticated
 using (bucket_id='coupon-benefits' and (select public.is_funypin_admin()));
-- No update/delete policies: a published benefit image cannot be replaced in place.

create function public.admin_search_coupon_members(p_search text)
returns table(user_id uuid,nickname text,email text)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if length(trim(coalesce(p_search,''))) < 2 or length(p_search)>100 then raise exception '검색어는 2~100자로 입력해주세요.'; end if;
 return query select u.id,coalesce(p.nickname,'')::text,u.email::text
 from auth.users u left join public.profiles p on p.user_id=u.id
 where u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
 and (u.email ilike '%'||p_search||'%' or p.nickname ilike '%'||p_search||'%')
 order by lower(u.email),u.id limit 20;
end $$;

create function public.admin_create_coupon_campaign(p_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.coupon_campaigns; staff uuid[]; starts timestamptz; ends timestamptz; image text;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception '쿠폰 정보를 확인해주세요.'; end if;
 -- Serialize retries of the same client-generated ID, including concurrent requests.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
 select * into c from public.coupon_campaigns where id=p_id;
 if found then
  if c.request_payload=p_payload then return c.id; end if;
  raise exception '동일 요청 ID에 다른 쿠폰 정보가 있습니다. 기존 등록 결과를 확인해주세요.';
 end if;
 if jsonb_typeof(p_payload->'staff_user_ids') is distinct from 'array' then raise exception '직원 계정을 확인해주세요.'; end if;
 select coalesce(array_agg(distinct v::uuid),'{}'::uuid[]) into staff from jsonb_array_elements_text(p_payload->'staff_user_ids') v;
 if cardinality(staff)>20 or exists(select 1 from unnest(staff) s where not exists(select 1 from auth.users u where u.id=s and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()))) then raise exception '유효한 직원 계정은 최대 20명까지 지정할 수 있습니다.'; end if;
 starts:=(p_payload->>'starts_at')::timestamptz; ends:=(p_payload->>'ends_at')::timestamptz;
 if starts is null or ends is null or ends<=starts or ends<=now() then raise exception '사용 기간을 확인해주세요.'; end if;
 image:=p_payload->>'image_path';
 if image is null or image !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$' or not exists(select 1 from storage.objects where bucket_id='coupon-benefits' and name=image) then raise exception '혜택 이미지를 먼저 등록해주세요.'; end if;
 insert into public.coupon_campaigns(id,title,benefit_text,image_path,starts_at,ends_at,instructions,shop_name,staff_user_ids,issuance_limit,created_by,request_payload)
 values(p_id,trim(p_payload->>'title'),trim(p_payload->>'benefit_text'),image,starts,ends,trim(p_payload->>'instructions'),trim(p_payload->>'shop_name'),staff,(p_payload->>'issuance_limit')::integer,auth.uid(),p_payload);
 return p_id;
end $$;

create function public.admin_list_coupon_campaigns()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]') into result from (
 select c.id,c.title,c.benefit_text,c.image_path,c.starts_at,c.ends_at,c.instructions,c.shop_name,c.staff_user_ids,c.issuance_limit,c.is_active,c.created_at,
 (select count(*) from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id) issued_count,
 (select count(*) from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id and u.status='used') used_count,
 (select count(*) from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id and u.status='cancelled') cancelled_count
 from public.coupon_campaigns c order by c.created_at desc limit 200) t;
 return result;
end $$;

create function public.admin_set_coupon_campaign_active(p_id uuid,p_active boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_active is null then raise exception '발급 상태가 필요합니다.'; end if;
 update public.coupon_campaigns set is_active=p_active where id=p_id;
 return found;
end $$;

create function public.admin_issue_coupon_campaign(p_campaign_id uuid,p_user_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.coupon_campaigns; ids uuid[]; existing_count integer; fresh_count integer; inserted_count integer;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_user_ids is null or cardinality(p_user_ids)<1 or cardinality(p_user_ids)>100 or array_position(p_user_ids,null) is not null then raise exception '발급 회원은 한 번에 1~100명까지 선택해주세요.'; end if;
 select array_agg(distinct x) into ids from unnest(p_user_ids) x;
 select * into c from public.coupon_campaigns where id=p_campaign_id for update;
 if not found then raise exception '등록된 쿠폰이 없습니다.'; end if;
 if exists(select 1 from unnest(ids) x where not exists(select 1 from auth.users u where u.id=x and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()))) then raise exception '탈퇴 또는 이용 제한된 회원이 포함되어 있습니다.'; end if;
 select count(*) into fresh_count from unnest(ids) x where not exists(select 1 from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id and u.user_id=x);
 -- A replay after a successful response was lost must remain safe even after issuance is paused.
 if fresh_count=0 then return jsonb_build_object('issued',0,'skipped',cardinality(ids),'total',(select count(*) from public.user_coupons where source_type='admin_coupon' and source_id=c.id)); end if;
 if not c.is_active or c.ends_at<=now() then raise exception '발급이 중지됐거나 사용 기간이 종료된 쿠폰입니다.'; end if;
 select count(*) into existing_count from public.user_coupons where source_type='admin_coupon' and source_id=c.id;
 if existing_count+fresh_count>c.issuance_limit then raise exception '총 발급 한도를 초과합니다. 남은 수량: %',c.issuance_limit-existing_count; end if;
 insert into public.user_coupons(user_id,source_type,source_id,title,description,code,status,shop_name,expires_at,metadata)
 select x,'admin_coupon',c.id,c.title,c.benefit_text,'FP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),'issued',c.shop_name,c.ends_at,
 jsonb_build_object('coupon_version',1,'benefit_image_url','https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/coupon-benefits/'||c.image_path,'starts_at',c.starts_at,'usage_instructions',c.instructions,'issued_by',auth.uid())
 from unnest(ids) x where not exists(select 1 from public.user_coupons u where u.source_type='admin_coupon' and u.source_id=c.id and u.user_id=x);
 get diagnostics inserted_count=row_count;
 return jsonb_build_object('issued',inserted_count,'skipped',cardinality(ids)-inserted_count,'total',existing_count+inserted_count);
end $$;

create function public.admin_list_issued_coupons(p_campaign_id uuid,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_offset is null or p_offset<0 or p_offset>10000 then raise exception '페이지 범위가 올바르지 않습니다.'; end if;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.issued_at desc,t.id desc),'[]') into result from (
 select u.id,u.title,u.code,u.status,u.issued_at,u.expires_at,u.metadata->>'starts_at' starts_at,u.metadata->>'used_at' used_at,u.metadata->>'redeemed_by' redeemed_by,u.metadata->>'cancelled_at' cancelled_at,u.metadata->>'cancel_reason' cancel_reason,p.nickname,a.email
 from public.user_coupons u join auth.users a on a.id=u.user_id left join public.profiles p on p.user_id=u.user_id
 where u.source_type='admin_coupon' and u.source_id=p_campaign_id order by u.issued_at desc,u.id desc limit 50 offset p_offset) t;
 return result;
end $$;

create function public.admin_cancel_issued_coupon(p_coupon_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_funypin_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if length(trim(coalesce(p_reason,''))) not between 1 and 300 then raise exception '취소 사유는 1~300자로 입력해주세요.'; end if;
 update public.user_coupons set status='cancelled',metadata=metadata||jsonb_build_object('cancelled_at',now(),'cancelled_by',auth.uid(),'cancel_reason',trim(p_reason))
 where id=p_coupon_id and source_type='admin_coupon' and status='issued';
 return found;
end $$;

create function public.inspect_staff_coupon(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u public.user_coupons; c public.coupon_campaigns; result jsonb;
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 select * into u from public.user_coupons where source_type='admin_coupon' and code=upper(trim(p_code));
 if not found then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 select * into c from public.coupon_campaigns where id=u.source_id;
 if not found or not (public.is_funypin_admin() or auth.uid()=any(c.staff_user_ids)) then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 result:=jsonb_build_object('title',u.title,'description',u.description,'shop_name',u.shop_name,'code',u.code,'status',u.status,'starts_at',c.starts_at,'expires_at',u.expires_at,'used_at',u.metadata->>'used_at','image_url',u.metadata->>'benefit_image_url','instructions',u.metadata->>'usage_instructions','can_redeem',u.status='issued' and c.starts_at<=now() and u.expires_at>now());
 return result;
end $$;

create function public.redeem_staff_coupon(p_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare u public.user_coupons; c public.coupon_campaigns;
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 select * into u from public.user_coupons where source_type='admin_coupon' and code=upper(trim(p_code)) for update;
 if not found then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 select * into c from public.coupon_campaigns where id=u.source_id;
 if not found or not (public.is_funypin_admin() or auth.uid()=any(c.staff_user_ids)) then raise exception '쿠폰이 없거나 확인 권한이 없습니다.' using errcode='42501'; end if;
 -- A customer who also has staff privileges must ask another staff member to redeem their own coupon.
 if u.user_id=auth.uid() then raise exception '본인 쿠폰은 다른 담당 직원에게 확인받아주세요.' using errcode='42501'; end if;
 if u.status<>'issued' or c.starts_at>now() or u.expires_at is null or u.expires_at<=now() then return false; end if;
 update public.user_coupons set status='used',metadata=metadata||jsonb_build_object('used_at',now(),'redeemed_by',auth.uid(),'redemption_method','authenticated_assigned_staff') where id=u.id and status='issued';
 return found;
end $$;

revoke all on function public.admin_search_coupon_members(text),public.admin_create_coupon_campaign(uuid,jsonb),public.admin_list_coupon_campaigns(),public.admin_set_coupon_campaign_active(uuid,boolean),public.admin_issue_coupon_campaign(uuid,uuid[]),public.admin_list_issued_coupons(uuid,integer),public.admin_cancel_issued_coupon(uuid,text),public.inspect_staff_coupon(text),public.redeem_staff_coupon(text) from public,anon,authenticated;
grant execute on function public.admin_search_coupon_members(text),public.admin_create_coupon_campaign(uuid,jsonb),public.admin_list_coupon_campaigns(),public.admin_set_coupon_campaign_active(uuid,boolean),public.admin_issue_coupon_campaign(uuid,uuid[]),public.admin_list_issued_coupons(uuid,integer),public.admin_cancel_issued_coupon(uuid,text),public.inspect_staff_coupon(text),public.redeem_staff_coupon(text) to authenticated;
