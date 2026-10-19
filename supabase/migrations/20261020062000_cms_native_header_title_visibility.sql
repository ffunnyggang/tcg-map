alter table public.cms_contents
  add column if not exists native_header_title_visible boolean not null default true;
