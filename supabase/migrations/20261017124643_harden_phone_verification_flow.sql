create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.phone_verification_reservations (
  phone_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.phone_verification_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  send_count integer not null default 0 check (send_count >= 0),
  last_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on table private.phone_verification_reservations from public, anon, authenticated;
revoke all on table private.phone_verification_rate_limits from public, anon, authenticated;

create or replace function public.prepare_phone_verification(
  p_user_id uuid,
  p_phone text,
  p_phone_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_limit private.phone_verification_rate_limits%rowtype;
  v_reservation private.phone_verification_reservations%rowtype;
begin
  if p_user_id is null
     or p_phone is null
     or p_phone !~ '^\+8210[0-9]{8}$'
     or p_phone_hash is null
     or length(p_phone_hash) <> 64 then
    raise exception 'INVALID_PHONE_VERIFICATION_REQUEST' using errcode='22023';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'USER_NOT_FOUND' using errcode='P0001';
  end if;

  delete from private.phone_verification_reservations
  where expires_at <= v_now;

  update auth.users
  set phone_change = '',
      phone_change_token = '',
      phone_change_sent_at = null,
      updated_at = v_now
  where coalesce(phone_change,'') <> ''
    and phone_change_sent_at is not null
    and phone_change_sent_at < v_now - interval '10 minutes';

  if exists (
    select 1 from auth.users
    where id <> p_user_id
      and phone = p_phone
  ) then
    raise exception 'PHONE_ALREADY_USED' using errcode='23505';
  end if;

  if exists (
    select 1 from auth.users
    where id <> p_user_id
      and phone_change = p_phone
      and phone_change_sent_at is not null
      and phone_change_sent_at >= v_now - interval '10 minutes'
  ) then
    raise exception 'PHONE_VERIFICATION_IN_PROGRESS' using errcode='P0001';
  end if;

  select * into v_limit
  from private.phone_verification_rate_limits
  where user_id = p_user_id
  for update;

  if found then
    if v_limit.last_sent_at is not null
       and v_limit.last_sent_at > v_now - interval '60 seconds' then
      raise exception 'PHONE_OTP_COOLDOWN' using errcode='P0001';
    end if;

    if v_limit.window_started_at <= v_now - interval '1 hour' then
      update private.phone_verification_rate_limits
      set window_started_at = v_now,
          send_count = 1,
          last_sent_at = v_now,
          updated_at = v_now
      where user_id = p_user_id;
    elsif v_limit.send_count >= 10 then
      raise exception 'PHONE_OTP_RATE_LIMIT' using errcode='P0001';
    else
      update private.phone_verification_rate_limits
      set send_count = send_count + 1,
          last_sent_at = v_now,
          updated_at = v_now
      where user_id = p_user_id;
    end if;
  else
    insert into private.phone_verification_rate_limits(
      user_id,window_started_at,send_count,last_sent_at,updated_at
    ) values (
      p_user_id,v_now,1,v_now,v_now
    );
  end if;

  select * into v_reservation
  from private.phone_verification_reservations
  where phone_hash = p_phone_hash
  for update;

  if found and v_reservation.user_id <> p_user_id and v_reservation.expires_at > v_now then
    raise exception 'PHONE_VERIFICATION_RESERVED' using errcode='P0001';
  end if;

  insert into private.phone_verification_reservations(
    phone_hash,user_id,expires_at,created_at,updated_at
  ) values (
    p_phone_hash,p_user_id,v_now + interval '10 minutes',v_now,v_now
  )
  on conflict (phone_hash) do update
    set user_id = excluded.user_id,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at;

  return true;
end;
$$;

create or replace function public.release_phone_verification_reservation(
  p_user_id uuid,
  p_phone_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.phone_verification_reservations
  where user_id = p_user_id
    and phone_hash = p_phone_hash;
  return true;
end;
$$;

revoke all on function public.prepare_phone_verification(uuid,text,text) from public, anon, authenticated;
revoke all on function public.release_phone_verification_reservation(uuid,text) from public, anon, authenticated;
grant execute on function public.prepare_phone_verification(uuid,text,text) to service_role;
grant execute on function public.release_phone_verification_reservation(uuid,text) to service_role;
