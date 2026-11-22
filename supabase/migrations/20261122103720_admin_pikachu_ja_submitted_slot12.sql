begin;
alter table private.overlay_admin_print_ja_submitted_v1
  drop constraint overlay_admin_print_ja_submitted_v1_reference_id_check,
  add constraint overlay_admin_print_ja_submitted_v1_reference_id_check
    check (reference_id in ('m6a-ja-017','m6a-ja-019','m6a-ja-021','m6a-ja-022','m6a-ja-025','m6a-ja-028'));
commit;
