begin;
alter table private.overlay_admin_print_ja_full_bleed_nov25_v1
  drop constraint overlay_admin_print_ja_full_bleed_nov25_v1_reference_id_check,
  add constraint overlay_admin_print_ja_full_bleed_nov25_v1_reference_id_check
  check (reference_id in ('m6a-ja-017','m6a-ja-025','m6a-ja-034','m6a-ja-037','m6a-ja-039'));
alter table private.overlay_admin_print_ja_full_bleed_nov25_chunks
  drop constraint overlay_admin_print_ja_full_bleed_nov25_chun_reference_id_check,
  add constraint overlay_admin_print_ja_full_bleed_nov25_chun_reference_id_check
  check (reference_id in ('m6a-ja-017','m6a-ja-025','m6a-ja-034','m6a-ja-037','m6a-ja-039'));
commit;
