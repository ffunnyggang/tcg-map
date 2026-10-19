begin;

update public.mission_feature_settings
set public_enabled=true,
    reward_enabled=true,
    release_locked=false,
    updated_at=clock_timestamp()
where id=true;

update public.funy_coin_settings
set system_enabled=true,
    signup_bonus_enabled=false,
    release_locked=false,
    updated_at=clock_timestamp()
where id=true;

update public.mission_campaigns
set visibility='public',
    updated_at=clock_timestamp()
where deleted_at is null
  and status='active'
  and is_visible=true;

commit;
