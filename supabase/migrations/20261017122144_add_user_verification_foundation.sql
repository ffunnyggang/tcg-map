create table if not exists public.user_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  identity_verified_at timestamptz,
  verification_level smallint generated always as (
    case
      when identity_verified_at is not null then 3
      when phone_verified_at is not null then 2
      when email_verified_at is not null then 1
      else 0
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_verifications is
  'FUNY PIN account verification state. Stores verification timestamps only; phone/email values remain in auth.users.';
comment on column public.user_verifications.verification_level is
  '0=login only, 1=email/OAuth verified, 2=phone SMS verified, 3=identity/PASS verified (reserved).';

alter table public.user_verifications enable row level security;

revoke all on table public.user_verifications from anon;
revoke insert, update, delete on table public.user_verifications from authenticated;
grant select on table public.user_verifications to authenticated;

drop policy if exists user_verifications_select_own on public.user_verifications;
create policy user_verifications_select_own
  on public.user_verifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists user_verifications_admin_read on public.user_verifications;
create policy user_verifications_admin_read
  on public.user_verifications
  for select
  to authenticated
  using ((select public.is_funypin_admin()));

create or replace function public.sync_user_verification_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_verifications (
    user_id,
    email_verified_at,
    phone_verified_at,
    updated_at
  )
  values (
    new.id,
    new.email_confirmed_at,
    new.phone_confirmed_at,
    now()
  )
  on conflict (user_id) do update
    set email_verified_at = excluded.email_verified_at,
        phone_verified_at = excluded.phone_verified_at,
        updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_user_verification_from_auth() from public, anon, authenticated;
grant execute on function public.sync_user_verification_from_auth() to supabase_auth_admin;

drop trigger if exists on_auth_user_verification_synced on auth.users;
create trigger on_auth_user_verification_synced
after insert or update of email_confirmed_at, phone_confirmed_at
on auth.users
for each row
execute function public.sync_user_verification_from_auth();

insert into public.user_verifications (
  user_id,
  email_verified_at,
  phone_verified_at,
  updated_at
)
select
  id,
  email_confirmed_at,
  phone_confirmed_at,
  now()
from auth.users
on conflict (user_id) do update
  set email_verified_at = excluded.email_verified_at,
      phone_verified_at = excluded.phone_verified_at,
      updated_at = now();
