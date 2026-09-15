-- A Google Form response gives a Drive file id before the worker downloads the
-- immutable private snapshot. Size remains zero only while that snapshot is
-- pending; direct uploads are still validated by the API before processing.

ALTER TABLE public.selection_documents
  DROP CONSTRAINT IF EXISTS selection_documents_size_bytes_check;

ALTER TABLE public.selection_documents
  ALTER COLUMN size_bytes SET DEFAULT 0;

ALTER TABLE public.selection_documents
  ADD CONSTRAINT selection_documents_size_bytes_range
  CHECK (size_bytes BETWEEN 0 AND 26214400);
