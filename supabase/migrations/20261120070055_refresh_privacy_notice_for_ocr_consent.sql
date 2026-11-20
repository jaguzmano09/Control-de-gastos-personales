update public.document_versions
set is_active = false
where document_key = 'privacy'
  and is_active;

insert into public.document_versions (document_key, version, public_path, is_active)
values ('privacy', '2026-11-20.2', '/privacidad', true);
