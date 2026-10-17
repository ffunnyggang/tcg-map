create table if not exists public.account_verification_settings (
  id smallint primary key default 1 check (id = 1),
  phone_sms_enabled boolean not null default false,
  sms_provider text not null default 'solapi',
  updated_at timestamptz not null default now()
);

insert into public.account_verification_settings(id,phone_sms_enabled,sms_provider,updated_at)
values (1,false,'solapi',now())
on conflict (id) do update
set sms_provider='solapi',
    updated_at=now();

alter table public.account_verification_settings enable row level security;

revoke all on table public.account_verification_settings from anon, authenticated;
grant select on table public.account_verification_settings to authenticated;

drop policy if exists account_verification_settings_authenticated_read on public.account_verification_settings;
create policy account_verification_settings_authenticated_read
on public.account_verification_settings
for select
to authenticated
using (id = 1);

drop policy if exists account_verification_settings_admin_read on public.account_verification_settings;
create policy account_verification_settings_admin_read
on public.account_verification_settings
for select
to authenticated
using ((select public.is_funypin_admin()));
