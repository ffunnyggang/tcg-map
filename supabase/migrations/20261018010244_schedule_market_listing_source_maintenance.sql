do $$
declare
  v_job bigint;
begin
  select jobid into v_job from cron.job where jobname='market-listing-source-maintenance' limit 1;
  if v_job is not null then
    perform cron.unschedule(v_job);
  end if;
end $$;

select cron.schedule(
  'market-listing-source-maintenance',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://wdttzpbmqavaqfcbaywj.supabase.co/functions/v1/market-listing-maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret',
      (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'live_pin_cleanup_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  ) as request_id;
  $$
);
