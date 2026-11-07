-- HOME shop ranking promotion: link deduplicated 30-day engagement metrics to shop_sort_stats.
-- Deployed to FUNY PIN Supabase on 2026-11-07. Running again is idempotent.
-- Favorite count remains maintained by existing shop_favorites trigger.
CREATE OR REPLACE FUNCTION public.refresh_shop_activity_metrics()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  insert into public.shop_activity_metrics_30d
    (shop_id,detail_views_30d,shares_30d,directions_30d,web_events_30d,ios_events_30d,android_events_30d,window_starts_at,refreshed_at)
  select s.id,
    count(e.id) filter(where e.event_type='detail_view')::int,
    count(e.id) filter(where e.event_type='share_click')::int,
    count(e.id) filter(where e.event_type='directions_click')::int,
    count(e.id) filter(where e.client_surface='web')::int,
    count(e.id) filter(where e.app_platform='ios')::int,
    count(e.id) filter(where e.app_platform='android')::int,
    now()-interval '30 days', now()
  from public.shops s
  left join public.shop_activity_events e
    on e.shop_id=s.id and e.created_at>=now()-interval '30 days'
  where s.is_active is true and s.status !~* '폐업|영업종료|closed'
  group by s.id
  on conflict(shop_id) do update set
    detail_views_30d=excluded.detail_views_30d,
    shares_30d=excluded.shares_30d,
    directions_30d=excluded.directions_30d,
    web_events_30d=excluded.web_events_30d,
    ios_events_30d=excluded.ios_events_30d,
    android_events_30d=excluded.android_events_30d,
    window_starts_at=excluded.window_starts_at,
    refreshed_at=excluded.refreshed_at;

  -- Only promote new, deduplicated activity when explicitly enabled.
  -- Preserve shop_favorites-derived favorite_count and review recommendation_score.
  if (select promote_to_rankings from public.shop_activity_pipeline_status where id=true) is true then
    update public.shop_sort_stats as ss set
      detail_views_30d=m.detail_views_30d,
      shares_30d=m.shares_30d,
      directions_30d=m.directions_30d,
      engagement_ready=true,
      updated_at=now()
    from public.shop_activity_metrics_30d as m
    where ss.shop_id=m.shop_id
      and (ss.detail_views_30d,ss.shares_30d,ss.directions_30d,ss.engagement_ready)
          is distinct from (m.detail_views_30d,m.shares_30d,m.directions_30d,true);
  end if;

  delete from public.shop_activity_events where created_at<now()-interval '35 days';
  update public.shop_activity_pipeline_status set last_refreshed_at=now(),last_error=null where id=true;
end;
$function$


update public.shop_activity_pipeline_status
set promote_to_rankings=true
where id=true;

select public.refresh_shop_activity_metrics();
