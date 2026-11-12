-- Preserve transaction columns and the extraction engine while removing raw
-- receipt OCR text, duplicate extracted fields, and provider diagnostics.
-- This is intentionally scoped to OCR transactions and is safe to re-run.
update public.transactions
set raw_data = raw_data - 'ocr' - 'extraction_errors' - 'extracted'
where source = 'ocr'
  and jsonb_typeof(raw_data) = 'object'
  and raw_data ?| array['ocr', 'extraction_errors', 'extracted'];
