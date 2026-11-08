-- Free launch: Nov 8 through Nov 14, 2026, Asia/Seoul. Service-only quota API.
create table if not exists public.overlay_card_daily_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 usage_date date not null,
 reference_id text not null references public.overlay_art_references(id),
 text_attempts integer not null default 0 check(text_attempts between 0 and 3),
 illustration_attempts integer not null default 0 check(illustration_attempts between 0 and 3),
 created_at timestamptz not null default now(),
 primary key(user_id,usage_date,reference_id)
);
alter table public.overlay_card_daily_usage enable row level security;
revoke all on public.overlay_card_daily_usage from public,anon,authenticated;
grant select,insert,update on public.overlay_card_daily_usage to service_role;
create table if not exists public.overlay_quota_exempt_accounts(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.overlay_quota_exempt_accounts enable row level security;
revoke all on public.overlay_quota_exempt_accounts from public,anon,authenticated;
grant select on public.overlay_quota_exempt_accounts to service_role;
-- Provision designated accounts privately through server-side administration.
CREATE OR REPLACE FUNCTION public.overlay_card_access(p_user uuid, p_reference text DEFAULT NULL::text, p_mode text DEFAULT 'status'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 d date := (now() at time zone 'Asia/Seoul')::date;
 active boolean := now() >= '2026-11-08 00:00:00+09'::timestamptz and now() < '2026-11-15 00:00:00+09'::timestamptz;
 n integer; refs jsonb; attempts integer; unlimited boolean;
begin
 if p_mode not in ('status','claim','text','illustration') or p_user is null then raise exception 'INVALID_QUOTA_REQUEST'; end if;
 select exists(select 1 from public.overlay_quota_exempt_accounts where user_id=p_user) into unlimited;
 unlimited:=coalesce(unlimited,false);
 -- Serialize tabs and devices for this account; transaction lock releases on return.
 perform pg_advisory_xact_lock(hashtextextended('overlay-card:'||p_user::text,0));
 select count(*),coalesce(jsonb_agg(reference_id),'[]'::jsonb) into n,refs from public.overlay_card_daily_usage where user_id=p_user and usage_date=d;
 if p_mode <> 'status' then
  if not active then return jsonb_build_object('ok',false,'code','FREE_PERIOD_ENDED','active',false,'used',n,'limit',3,'references',refs); end if;
  if p_reference is null or not exists(select 1 from public.overlay_art_references where id=p_reference) then return jsonb_build_object('ok',false,'code','INVALID_REFERENCE'); end if;
  if unlimited then return jsonb_build_object('ok',true,'active',active,'unlimited',true,'used',n,'limit',null,'references',refs,'day',d,'endsAt','2026-11-15T00:00:00+09:00'); end if;
  if p_mode='claim' then
   if not (refs ? p_reference) then
    if n>=3 then return jsonb_build_object('ok',false,'code','CARD_DAILY_LIMIT','active',true,'used',n,'limit',3,'references',refs); end if;
    insert into public.overlay_card_daily_usage(user_id,usage_date,reference_id) values(p_user,d,p_reference);
    n:=n+1; refs:=refs||jsonb_build_array(p_reference);
   end if;
  else
   if not (refs ? p_reference) then return jsonb_build_object('ok',false,'code','CARD_RESERVATION_REQUIRED'); end if;
   select case when p_mode='text' then text_attempts else illustration_attempts end into attempts from public.overlay_card_daily_usage where user_id=p_user and usage_date=d and reference_id=p_reference;
   if attempts>=3 then return jsonb_build_object('ok',false,'code','CARD_RETRY_LIMIT'); end if;
   update public.overlay_card_daily_usage set text_attempts=text_attempts+case when p_mode='text' then 1 else 0 end,illustration_attempts=illustration_attempts+case when p_mode='illustration' then 1 else 0 end where user_id=p_user and usage_date=d and reference_id=p_reference;
  end if;
 end if;
 return jsonb_build_object('ok',true,'active',active,'unlimited',unlimited,'used',n,'limit',case when unlimited then null else 3 end,'references',refs,'day',d,'endsAt','2026-11-15T00:00:00+09:00');
end $function$
;
revoke all on function public.overlay_card_access(uuid,text,text) from public,anon,authenticated;
grant execute on function public.overlay_card_access(uuid,text,text) to service_role;
