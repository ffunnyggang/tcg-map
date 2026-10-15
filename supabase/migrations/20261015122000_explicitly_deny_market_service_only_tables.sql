drop policy if exists market_external_challenges_deny_authenticated on public.market_external_verification_challenges;
create policy market_external_challenges_deny_authenticated
on public.market_external_verification_challenges
for all to authenticated
using (false)
with check (false);

drop policy if exists market_listing_audit_deny_authenticated on public.market_listing_audit_logs;
create policy market_listing_audit_deny_authenticated
on public.market_listing_audit_logs
for all to authenticated
using (false)
with check (false);
