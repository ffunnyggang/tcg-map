-- Applied via overlay_generation_card_labels migration on 2026-11-06.
alter table public.overlay_generations
 add column source_reference_id text references public.overlay_art_references(id) on delete set null,
 add column source_card_label text check (char_length(source_card_label)<=240);
comment on column public.overlay_generations.source_reference_id is 'Descriptive source association; not verified cache identity';
