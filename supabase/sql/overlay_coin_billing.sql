create table public.overlay_coin_jobs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 reference_id text not null, cost integer not null check(cost in (0,10)),
 status text not null default 'pending' check(status in ('pending','completed','failed','expired')),
 ready boolean not null default false, text_started boolean not null default false,
 art_started boolean not null default false, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 minutes', completed_at timestamptz,
 ledger_id uuid references public.funy_coin_ledger(id)
);
create index overlay_coin_jobs_user_status on public.overlay_coin_jobs(user_id,status);
alter table public.overlay_coin_jobs enable row level security;
revoke all on public.overlay_coin_jobs from public,anon,authenticated;
grant all on public.overlay_coin_jobs to service_role;

alter table public.funy_coin_ledger drop constraint funy_coin_ledger_transaction_type_check;
alter table public.funy_coin_ledger add constraint funy_coin_ledger_transaction_type_check check(transaction_type in
 ('signup_bonus','mission_reward','event_reward','garapon_spend','garapon_refund','admin_grant','admin_deduct','overlay_spend'));

create or replace function public.overlay_coin_access(p_user uuid,p_mode text default 'status',p_job uuid default null,p_reference text default null,p_kind text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b bigint; held bigint; admin boolean; free boolean; j public.overlay_coin_jobs%rowtype; charge integer; l uuid;
begin
 if p_user is null or p_mode not in ('status','start','check','ready','complete','cancel') then raise exception 'INVALID_BILLING_REQUEST'; end if;
 select exists(select 1 from public.admin_accounts a join auth.users u on lower(u.email)=a.email where u.id=p_user and a.is_active) into admin;
 perform public.ensure_funy_coin_wallet(p_user);
 select balance into b from public.funy_coin_wallets where user_id=p_user for update;
 update public.overlay_coin_jobs set status='expired' where user_id=p_user and status='pending' and expires_at<=now();
 select coalesce(sum(cost),0) into held from public.overlay_coin_jobs where user_id=p_user and status='pending';
 free:=not exists(select 1 from public.overlay_coin_jobs where user_id=p_user and status='completed')
   and not exists(select 1 from public.overlay_generations where user_id=p_user and model='gpt-image-2.5-sunburst');
 charge:=case when admin or free then 0 else 10 end;
 if p_mode='status' then return jsonb_build_object('ok',true,'active',true,'unlimited',admin,'admin',admin,'firstFree',free and not admin,'cost',charge,'balance',b,'available',b-held,'reserved',held); end if;
 if admin then return jsonb_build_object('ok',true,'admin',true,'cost',0,'balance',b,'active',true,'unlimited',true); end if;
 if p_job is null then return jsonb_build_object('ok',false,'code','BILLING_REQUIRED'); end if;
 select * into j from public.overlay_coin_jobs where id=p_job for update;
 if found then
  if j.user_id<>p_user then return jsonb_build_object('ok',false,'code','BILLING_REQUIRED'); end if;
  if p_reference is not null and j.reference_id<>p_reference then return jsonb_build_object('ok',false,'code','BILLING_CARD_MISMATCH'); end if;
  if p_mode='complete' and j.status='completed' then return jsonb_build_object('ok',true,'duplicate',true,'charged',j.cost,'balance',b); end if;
  if p_mode='start' and j.status='pending' then return jsonb_build_object('ok',true,'jobId',j.id,'cost',j.cost,'balance',b); end if;
 else
  if p_mode<>'start' then return jsonb_build_object('ok',false,'code','BILLING_REQUIRED'); end if;
 end if;
 if p_mode='start' then
  if j.id is not null then return jsonb_build_object('ok',false,'code','BILLING_EXPIRED'); end if;
  if p_reference is null or not exists(select 1 from public.overlay_art_references where id=p_reference) then return jsonb_build_object('ok',false,'code','INVALID_REFERENCE'); end if;
  if exists(select 1 from public.overlay_coin_jobs where user_id=p_user and status='pending') then return jsonb_build_object('ok',false,'code','GENERATION_IN_PROGRESS'); end if;
  if b-held<charge then return jsonb_build_object('ok',false,'code','INSUFFICIENT_COINS','balance',b-held,'cost',charge); end if;
  insert into public.overlay_coin_jobs(id,user_id,reference_id,cost) values(p_job,p_user,p_reference,charge);
  return jsonb_build_object('ok',true,'jobId',p_job,'cost',charge,'balance',b);
 end if;
 if j.status<>'pending' then return jsonb_build_object('ok',false,'code','BILLING_EXPIRED'); end if;
 if p_mode='check' then
  if p_kind not in ('cache','text','art') or p_kind is null then return jsonb_build_object('ok',false,'code','INVALID_BILLING_REQUEST'); end if;
  if (p_kind='text' and j.text_started) or (p_kind='art' and j.art_started) then return jsonb_build_object('ok',false,'code','GENERATION_ALREADY_STARTED'); end if;
  update public.overlay_coin_jobs set text_started=text_started or p_kind='text',art_started=art_started or p_kind='art' where id=j.id;
 elsif p_mode='ready' then
  update public.overlay_coin_jobs set ready=true where id=j.id;
 elsif p_mode='cancel' then
  update public.overlay_coin_jobs set status='failed' where id=j.id;
 elsif p_mode='complete' then
  if not j.ready then return jsonb_build_object('ok',false,'code','GENERATION_NOT_READY'); end if;
  if b<j.cost then return jsonb_build_object('ok',false,'code','INSUFFICIENT_COINS'); end if;
  if j.cost>0 then
   update public.funy_coin_wallets set balance=balance-j.cost,version=version+1,updated_at=now() where user_id=p_user;
   insert into public.funy_coin_ledger(user_id,amount,balance_after,transaction_type,source_type,source_id,idempotency_key,description,metadata)
   values(p_user,-j.cost,b-j.cost,'overlay_spend','overlay_generation',j.id::text,'overlay:'||j.id,'확장아트 생성',jsonb_build_object('reference_id',j.reference_id)) returning id into l;
  end if;
  update public.overlay_coin_jobs set status='completed',completed_at=now(),ledger_id=l where id=j.id;
  return jsonb_build_object('ok',true,'charged',j.cost,'balance',b-j.cost);
 end if;
 return jsonb_build_object('ok',true,'cost',j.cost,'balance',b);
end $$;
revoke all on function public.overlay_coin_access(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.overlay_coin_access(uuid,text,uuid,text,text) to service_role;

CREATE OR REPLACE FUNCTION public.funy_coin_apply(p_user_id uuid, p_amount bigint, p_transaction_type text, p_source_type text, p_source_id text, p_idempotency_key text, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_balance bigint;
  v_existing public.funy_coin_ledger%rowtype;
  v_ledger_id uuid;
begin
  if p_user_id is null or p_amount = 0 or coalesce(trim(p_idempotency_key),'') = '' then
    raise exception 'invalid_coin_transaction';
  end if;
  if p_transaction_type not in ('signup_bonus','mission_reward','event_reward','garapon_spend','garapon_refund','admin_grant','admin_deduct') then
    raise exception 'invalid_coin_transaction_type';
  end if;

  perform public.ensure_funy_coin_wallet(p_user_id);

  select * into v_existing
  from public.funy_coin_ledger
  where user_id = p_user_id and idempotency_key = p_idempotency_key
  limit 1;
  if found then
    return jsonb_build_object('ok',true,'duplicate',true,'ledger_id',v_existing.id,'balance',v_existing.balance_after);
  end if;

  select balance into v_balance
  from public.funy_coin_wallets
  where user_id = p_user_id
  for update;

  if v_balance + p_amount - coalesce((select sum(cost) from public.overlay_coin_jobs where user_id=p_user_id and status='pending' and expires_at>now()),0) < 0 then
    return jsonb_build_object('ok',false,'error','insufficient_balance','balance',v_balance);
  end if;

  v_balance := v_balance + p_amount;
  update public.funy_coin_wallets
  set balance = v_balance, version = version + 1
  where user_id = p_user_id;

  insert into public.funy_coin_ledger(
    user_id,amount,balance_after,transaction_type,source_type,source_id,idempotency_key,description,metadata
  ) values (
    p_user_id,p_amount,v_balance,p_transaction_type,p_source_type,p_source_id,p_idempotency_key,p_description,coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_ledger_id;

  return jsonb_build_object('ok',true,'duplicate',false,'ledger_id',v_ledger_id,'balance',v_balance);
end;
$function$
