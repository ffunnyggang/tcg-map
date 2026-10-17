drop function if exists public.admin_list_members(text);

create function public.admin_list_members(p_search text default null)
returns table(
  user_id uuid,
  nickname text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  last_sign_in_at timestamptz,
  favorite_count bigint,
  funymon_count bigint,
  entry_count bigint,
  coupon_count bigint,
  account_verified_at timestamptz,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  identity_verified_at timestamptz,
  verification_level smallint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_funypin_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;

  return query
  select
    p.user_id,
    p.nickname,
    p.avatar_url,
    p.created_at,
    p.updated_at,
    u.email::text,
    u.last_sign_in_at,
    (select count(*) from public.shop_favorites sf where sf.user_id=p.user_id),
    (select count(*) from public.funy_mon_catches fc where fc.user_id=p.user_id and fc.result in ('caught','winner','entry')),
    (select count(*) from public.user_entries ue where ue.user_id=p.user_id),
    (select count(*) from public.user_coupons uc where uc.user_id=p.user_id),
    v.account_verified_at,
    v.email_verified_at,
    v.phone_verified_at,
    v.identity_verified_at,
    coalesce(v.verification_level,0)::smallint
  from public.profiles p
  join auth.users u on u.id=p.user_id
  left join public.user_verifications v on v.user_id=p.user_id
  where p_search is null
     or p.nickname ilike '%'||p_search||'%'
     or u.email ilike '%'||p_search||'%'
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_members(text) from public, anon;
grant execute on function public.admin_list_members(text) to authenticated;
