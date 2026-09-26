-- Top100 Selection Engine foundation
-- Applicant evidence and assessments are private by default. Only server-side
-- service-role routes may read or mutate these tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.selection_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'open', 'closed', 'processing', 'review', 'finalized', 'published', 'archived')
  ),
  policy jsonb NOT NULL DEFAULT '{
    "version": "2026.1",
    "minimumMeritScore": 60,
    "academicRequirement": "first_class_or_equivalent",
    "requireVerifiedAcademicEvidence": true
  }'::jsonb,
  applications_open_at timestamptz,
  applications_close_at timestamptz,
  evidence_freeze_at timestamptz,
  appeal_deadline_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.selection_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.selection_cycles(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('google_form', 'google_sheet', 'pdf_upload')),
  source_label text NOT NULL,
  source_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'ready', 'processing', 'paused', 'completed', 'failed')
  ),
  batch_size integer NOT NULL DEFAULT 100 CHECK (batch_size BETWEEN 1 AND 100),
  total_count integer NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  processed_count integer NOT NULL DEFAULT 0 CHECK (processed_count >= 0),
  qualified_count integer NOT NULL DEFAULT 0 CHECK (qualified_count >= 0),
  not_qualified_count integer NOT NULL DEFAULT 0 CHECK (not_qualified_count >= 0),
  needs_review_count integer NOT NULL DEFAULT 0 CHECK (needs_review_count >= 0),
  current_batch integer NOT NULL DEFAULT 0 CHECK (current_batch >= 0),
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT selection_jobs_processed_not_above_total CHECK (processed_count <= total_count)
);

CREATE TABLE IF NOT EXISTS public.selection_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.selection_cycles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.selection_jobs(id) ON DELETE CASCADE,
  source_record_id text NOT NULL,
  source_submitted_at timestamptz,
  full_name text NOT NULL,
  primary_email text,
  secondary_email text,
  phone text,
  country text,
  institution text,
  course text,
  graduation_year integer,
  claimed_cgpa text,
  claimed_academic_status text,
  leadership_narrative text,
  declaration_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'imported' CHECK (
    status IN ('imported', 'queued', 'processing', 'review_required', 'assessed', 'published')
  ),
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, source_record_id)
);

CREATE TABLE IF NOT EXISTS public.selection_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.selection_applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.selection_jobs(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'academic_evidence',
  source_type text NOT NULL CHECK (source_type IN ('google_drive', 'direct_upload')),
  source_file_id text,
  original_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL DEFAULT 'application/pdf' CHECK (mime_type = 'application/pdf'),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  sha256 text,
  source_modified_at timestamptz,
  extraction_status text NOT NULL DEFAULT 'pending' CHECK (
    extraction_status IN ('pending', 'processing', 'completed', 'review_required', 'failed')
  ),
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_confidence numeric(5,2),
  integrity_flags text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS selection_documents_source_file_unique
  ON public.selection_documents(application_id, source_file_id)
  WHERE source_file_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.selection_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.selection_applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.selection_jobs(id) ON DELETE CASCADE,
  policy_version text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('qualified', 'not_qualified', 'needs_review')),
  total_score numeric(5,2) NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  score_breakdown jsonb NOT NULL,
  reason_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  internal_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],
  public_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],
  requires_human_review boolean NOT NULL DEFAULT false,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, policy_version)
);

CREATE TABLE IF NOT EXISTS public.selection_public_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.selection_applications(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.selection_assessments(id) ON DELETE CASCADE,
  access_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  payload jsonb NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.selection_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.selection_cycles(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.selection_jobs(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.selection_applications(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS selection_jobs_cycle_status_idx
  ON public.selection_jobs(cycle_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS selection_applications_job_status_idx
  ON public.selection_applications(job_id, status, created_at);
CREATE INDEX IF NOT EXISTS selection_applications_country_idx
  ON public.selection_applications(cycle_id, country);
CREATE INDEX IF NOT EXISTS selection_documents_application_idx
  ON public.selection_documents(application_id, extraction_status);
CREATE INDEX IF NOT EXISTS selection_assessments_job_verdict_idx
  ON public.selection_assessments(job_id, verdict, total_score DESC);
CREATE INDEX IF NOT EXISTS selection_audit_events_application_idx
  ON public.selection_audit_events(application_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_selection_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_selection_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_selection_updated_at() TO service_role;

DROP TRIGGER IF EXISTS set_selection_cycles_updated_at ON public.selection_cycles;
CREATE TRIGGER set_selection_cycles_updated_at
  BEFORE UPDATE ON public.selection_cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_selection_updated_at();

DROP TRIGGER IF EXISTS set_selection_jobs_updated_at ON public.selection_jobs;
CREATE TRIGGER set_selection_jobs_updated_at
  BEFORE UPDATE ON public.selection_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_selection_updated_at();

DROP TRIGGER IF EXISTS set_selection_applications_updated_at ON public.selection_applications;
CREATE TRIGGER set_selection_applications_updated_at
  BEFORE UPDATE ON public.selection_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_selection_updated_at();

DROP TRIGGER IF EXISTS set_selection_documents_updated_at ON public.selection_documents;
CREATE TRIGGER set_selection_documents_updated_at
  BEFORE UPDATE ON public.selection_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_selection_updated_at();

DROP TRIGGER IF EXISTS set_selection_assessments_updated_at ON public.selection_assessments;
CREATE TRIGGER set_selection_assessments_updated_at
  BEFORE UPDATE ON public.selection_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_selection_updated_at();

DROP TRIGGER IF EXISTS set_selection_public_results_updated_at ON public.selection_public_results;
CREATE TRIGGER set_selection_public_results_updated_at
  BEFORE UPDATE ON public.selection_public_results
  FOR EACH ROW EXECUTE FUNCTION public.set_selection_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_selection_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'selection_audit_events is append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_selection_audit_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_selection_audit_mutation() TO service_role;

DROP TRIGGER IF EXISTS prevent_selection_audit_update ON public.selection_audit_events;
CREATE TRIGGER prevent_selection_audit_update
  BEFORE UPDATE OR DELETE ON public.selection_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_selection_audit_mutation();

ALTER TABLE public.selection_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_public_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.selection_cycles FROM anon, authenticated;
REVOKE ALL ON TABLE public.selection_jobs FROM anon, authenticated;
REVOKE ALL ON TABLE public.selection_applications FROM anon, authenticated;
REVOKE ALL ON TABLE public.selection_documents FROM anon, authenticated;
REVOKE ALL ON TABLE public.selection_assessments FROM anon, authenticated;
REVOKE ALL ON TABLE public.selection_public_results FROM anon, authenticated;
REVOKE ALL ON TABLE public.selection_audit_events FROM anon, authenticated;

GRANT ALL ON TABLE public.selection_cycles TO service_role;
GRANT ALL ON TABLE public.selection_jobs TO service_role;
GRANT ALL ON TABLE public.selection_applications TO service_role;
GRANT ALL ON TABLE public.selection_documents TO service_role;
GRANT ALL ON TABLE public.selection_assessments TO service_role;
GRANT ALL ON TABLE public.selection_public_results TO service_role;
GRANT INSERT, SELECT ON TABLE public.selection_audit_events TO service_role;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'selection-evidence',
  'selection-evidence',
  false,
  26214400,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE public.selection_cycles IS
  'Versioned Top100 applicant selection cycles and approved scoring policy.';
COMMENT ON TABLE public.selection_jobs IS
  'Durable intake and processing jobs, capped at 100 applications per batch.';
COMMENT ON TABLE public.selection_applications IS
  'Private applicant records imported from Google Forms, Sheets, or admin upload.';
COMMENT ON TABLE public.selection_documents IS
  'Private PDF evidence snapshots and extraction metadata.';
COMMENT ON TABLE public.selection_assessments IS
  'Explainable rule-based or reviewer-approved application assessments.';
COMMENT ON TABLE public.selection_public_results IS
  'Applicant-safe result payloads exposed only through opaque server-side access tokens.';
COMMENT ON TABLE public.selection_audit_events IS
  'Append-only audit history for imports, processing, reviews, overrides, and publication.';
