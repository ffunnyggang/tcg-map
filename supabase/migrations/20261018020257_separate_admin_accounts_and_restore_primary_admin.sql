create table if not exists public.admin_accounts (
  email text primary key,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_accounts_email_normalized check (email = lower(btrim(email)))
);

alter table public.admin_accounts enable row level security;
revoke all on table public.admin_accounts from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_accounts to service_role;

insert into public.admin_accounts(email,display_name,is_active,updated_at)
values ('ffunnyggang@gmail.com','FUNY PIN Admin',true,now())
on conflict (email) do update
set display_name=excluded.display_name,
    is_active=true,
    updated_at=now();

create or replace function public.is_funypin_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_accounts aa
    join auth.users u on lower(u.email) = aa.email
    where u.id = auth.uid()
      and aa.is_active = true
  );
$$;

revoke all on function public.is_funypin_admin() from public, anon;
grant execute on function public.is_funypin_admin() to authenticated, service_role;

create or replace function public.sync_admin_user_mapping_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is not null and exists (
    select 1
    from public.admin_accounts aa
    where aa.email = lower(btrim(new.email))
      and aa.is_active = true
  ) then
    insert into public.admin_users(user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  else
    delete from public.admin_users where user_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_admin_user_mapping_from_auth() from public, anon, authenticated;

drop trigger if exists trg_sync_admin_user_mapping_from_auth on auth.users;
create trigger trg_sync_admin_user_mapping_from_auth
after insert or update of email on auth.users
for each row execute function public.sync_admin_user_mapping_from_auth();

create or replace function public.sync_admin_account_runtime_mapping()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_active then
    insert into public.admin_users(user_id)
    select u.id
    from auth.users u
    where lower(u.email) = new.email
    on conflict (user_id) do nothing;
  else
    delete from public.admin_users a
    using auth.users u
    where a.user_id = u.id
      and lower(u.email) = new.email;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_admin_account_runtime_mapping() from public, anon, authenticated;

drop trigger if exists trg_sync_admin_account_runtime_mapping on public.admin_accounts;
create trigger trg_sync_admin_account_runtime_mapping
after insert or update of email, is_active on public.admin_accounts
for each row execute function public.sync_admin_account_runtime_mapping();

insert into public.admin_users(user_id)
select u.id
from auth.users u
join public.admin_accounts aa on aa.email = lower(u.email)
where aa.is_active = true
on conflict (user_id) do nothing;

alter policy event_campaigns_admin_all
on public.event_campaigns
using ((select public.is_funypin_admin()))
with check ((select public.is_funypin_admin()));

alter policy "admin can read flags"
on public.live_report_flags
using ((select public.is_funypin_admin()));

alter policy "admin can update flags"
on public.live_report_flags
using ((select public.is_funypin_admin()))
with check ((select public.is_funypin_admin()));

alter policy "admin can read live reports"
on public.live_reports
using ((select public.is_funypin_admin()));

alter policy "admin can update live reports"
on public.live_reports
using ((select public.is_funypin_admin()))
with check ((select public.is_funypin_admin()));

alter policy user_entries_admin_delete_funymon
on public.user_entries
using ((source_type = 'funy_mon'::text) and (select public.is_funypin_admin()));

alter policy user_entries_admin_select_funymon
on public.user_entries
using ((source_type = 'funy_mon'::text) and (select public.is_funypin_admin()));

create or replace function public.is_garapon_tester(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id is not null and (
    exists (
      select 1
      from public.admin_accounts aa
      join auth.users u on lower(u.email)=aa.email
      where u.id=p_user_id and aa.is_active=true
    )
    or exists (
      select 1
      from public.garapon_testers t
      where t.user_id=p_user_id and t.is_active=true
    )
  );
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_prefix text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if public.is_funypin_admin() then
    raise exception 'ADMIN_ACCOUNT_PROTECTED' using errcode = '42501';
  end if;

  v_prefix := v_user_id::text || '/';

  delete from storage.objects
  where bucket_id in ('profile-images','community-posts')
    and name like v_prefix || '%';

  delete from public.shop_favorites where user_id = v_user_id;
  delete from public.profiles where user_id = v_user_id;
  delete from public.admin_users where user_id = v_user_id;

  update public.funy_mon_catches set user_id = null where user_id = v_user_id;

  delete from auth.users where id = v_user_id;
end;
$$;
