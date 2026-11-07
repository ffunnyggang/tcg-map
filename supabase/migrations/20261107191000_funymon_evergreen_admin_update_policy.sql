-- FUNY MON evergreen admin settings: only verified FUNY PIN administrators may edit.
-- Existing public read is unchanged. Column allowlist prevents editing the settings identity.
grant update (is_enabled,search_radius_m,max_shops,shop_rotation_minutes,monster_rotation_minutes,catch_radius_m,capture_success_bp,daily_attempt_limit,repeat_delay_minutes,updated_at)
on public.funy_mon_evergreen_settings to authenticated;
drop policy if exists funy_mon_evergreen_admin_update on public.funy_mon_evergreen_settings;
create policy funy_mon_evergreen_admin_update
on public.funy_mon_evergreen_settings
for update to authenticated
using ((select public.is_funypin_admin()))
with check ((select public.is_funypin_admin()));
