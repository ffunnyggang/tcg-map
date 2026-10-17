alter table public.user_verifications
  add column if not exists account_verified_at timestamptz;

alter table public.user_verifications
  drop column if exists verification_level;

alter table public.user_verifications
  add column verification_level smallint generated always as (
    case
      when identity_verified_at is not null then 3
      when phone_verified_at is not null then 2
      when account_verified_at is not null then 1
      else 0
    end
  ) stored;

comment on column public.user_verifications.account_verified_at is
  'Level-1 account verification timestamp. Uses confirmed email or trusted OAuth sign-in (Google/Apple/Kakao).';
comment on column public.user_verifications.email_verified_at is
  'Actual Supabase email confirmation timestamp when available.';
comment on column public.user_verifications.verification_level is
  '0=login only, 1=email/OAuth account verified, 2=phone SMS verified, 3=identity/PASS verified (reserved).';

create or replace function public.sync_user_verification_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text;
  v_account_verified_at timestamptz;
begin
  v_provider := coalesce(new.raw_app_meta_data ->> 'provider', '');
  v_account_verified_at := case
    when new.email_confirmed_at is not null then new.email_confirmed_at
    when v_provider in ('google','apple','kakao') then new.created_at
    else null
  end;

  insert into public.user_verifications (
    user_id,
    account_verified_at,
    email_verified_at,
    phone_verified_at,
    updated_at
  )
  values (
    new.id,
    v_account_verified_at,
    new.email_confirmed_at,
    new.phone_confirmed_at,
    now()
  )
  on conflict (user_id) do update
    set account_verified_at = excluded.account_verified_at,
        email_verified_at = excluded.email_verified_at,
        phone_verified_at = excluded.phone_verified_at,
        updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_user_verification_from_auth() from public, anon, authenticated;
grant execute on function public.sync_user_verification_from_auth() to supabase_auth_admin;

insert into public.user_verifications (
  user_id,
  account_verified_at,
  email_verified_at,
  phone_verified_at,
  updated_at
)
select
  id,
  case
    when email_confirmed_at is not null then email_confirmed_at
    when coalesce(raw_app_meta_data ->> 'provider','') in ('google','apple','kakao') then created_at
    else null
  end,
  email_confirmed_at,
  phone_confirmed_at,
  now()
from auth.users
on conflict (user_id) do update
  set account_verified_at = excluded.account_verified_at,
      email_verified_at = excluded.email_verified_at,
      phone_verified_at = excluded.phone_verified_at,
      updated_at = now();
