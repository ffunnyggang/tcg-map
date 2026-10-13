-- Private, account-scoped persistence for custom coin-flip skins.
-- Anonymous users continue to use browser IndexedDB on-device.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('coin-skins','coin-skins',false,2097152,array['image/jpeg'])
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists coin_skins_select_own on storage.objects;
create policy coin_skins_select_own
on storage.objects for select
to authenticated
using (
  bucket_id='coin-skins'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists coin_skins_insert_own on storage.objects;
create policy coin_skins_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id='coin-skins'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists coin_skins_update_own on storage.objects;
create policy coin_skins_update_own
on storage.objects for update
to authenticated
using (
  bucket_id='coin-skins'
  and (storage.foldername(name))[1]=(select auth.uid())::text
)
with check (
  bucket_id='coin-skins'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists coin_skins_delete_own on storage.objects;
create policy coin_skins_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id='coin-skins'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
