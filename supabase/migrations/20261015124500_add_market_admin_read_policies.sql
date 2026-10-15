grant select on public.market_listing_audit_logs to authenticated;

drop policy if exists market_listings_admin_read on public.market_listings;
create policy market_listings_admin_read
on public.market_listings for select to authenticated
using ((select is_funypin_admin()));

drop policy if exists market_listing_reports_admin_read on public.market_listing_reports;
create policy market_listing_reports_admin_read
on public.market_listing_reports for select to authenticated
using ((select is_funypin_admin()));

drop policy if exists market_external_accounts_admin_read on public.market_external_seller_accounts;
create policy market_external_accounts_admin_read
on public.market_external_seller_accounts for select to authenticated
using ((select is_funypin_admin()));

drop policy if exists market_seller_verifications_admin_read on public.market_seller_verifications;
create policy market_seller_verifications_admin_read
on public.market_seller_verifications for select to authenticated
using ((select is_funypin_admin()));

drop policy if exists market_listing_audit_admin_read on public.market_listing_audit_logs;
create policy market_listing_audit_admin_read
on public.market_listing_audit_logs for select to authenticated
using ((select is_funypin_admin()));
