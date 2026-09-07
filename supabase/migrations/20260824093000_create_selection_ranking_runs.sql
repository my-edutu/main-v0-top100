-- Frozen overall and country ranking snapshots.
-- Ranking entries are private and immutable after a run leaves draft status.

CREATE TABLE IF NOT EXISTS public.selection_ranking_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.selection_cycles(id) ON DELETE CASCADE,
  name text NOT NULL,
  policy_version text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'frozen', 'approved', 'published', 'void')
  ),
  winner_target integer NOT NULL DEFAULT 100 CHECK (winner_target BETWEEN 1 AND 10000),
  reserve_target integer NOT NULL DEFAULT 20 CHECK (reserve_target BETWEEN 0 AND 10000),
  eligible_count integer NOT NULL DEFAULT 0 CHECK (eligible_count >= 0),
  proposed_winner_count integer NOT NULL DEFAULT 0 CHECK (proposed_winner_count >= 0),
  reserve_count integer NOT NULL DEFAULT 0 CHECK (reserve_count >= 0),
  countries_represented integer NOT NULL DEFAULT 0 CHECK (countries_represented >= 0),
  input_checksum text NOT NULL CHECK (input_checksum ~ '^[0-9a-f]{64}$'),
  ranking_method jsonb NOT NULL DEFAULT '{
    "method": "merit_only",
    "countryAffectsMerit": false,
    "tieBreakers": ["totalScore", "academic", "impact", "leadership", "initiative", "communication", "name", "applicationId"]
  }'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  frozen_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  published_at timestamptz,
  frozen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, input_checksum)
);

CREATE TABLE IF NOT EXISTS public.selection_ranking_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.selection_ranking_runs(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.selection_applications(id) ON DELETE RESTRICT,
  assessment_id uuid NOT NULL REFERENCES public.selection_assessments(id) ON DELETE RESTRICT,
  country text NOT NULL,
  overall_rank integer NOT NULL CHECK (overall_rank > 0),
  country_rank integer NOT NULL CHECK (country_rank > 0),
  total_score numeric(5,2) NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  score_breakdown jsonb NOT NULL,
  selection_status text NOT NULL CHECK (
    selection_status IN ('proposed_winner', 'reserve', 'eligible_not_selected')
  ),
  rank_explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, application_id),
  UNIQUE (run_id, overall_rank),
  UNIQUE (run_id, country, country_rank)
);

CREATE TABLE IF NOT EXISTS public.selection_ranking_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.selection_ranking_runs(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject')),
  notes text NOT NULL CHECK (char_length(trim(notes)) >= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, approver_id)
);

CREATE INDEX IF NOT EXISTS selection_ranking_runs_cycle_status_idx
  ON public.selection_ranking_runs(cycle_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS selection_ranking_entries_run_status_idx
  ON public.selection_ranking_entries(run_id, selection_status, overall_rank);
CREATE INDEX IF NOT EXISTS selection_ranking_entries_country_idx
  ON public.selection_ranking_entries(run_id, country, country_rank);
CREATE INDEX IF NOT EXISTS selection_ranking_approvals_run_idx
  ON public.selection_ranking_approvals(run_id, decision, created_at);

DROP TRIGGER IF EXISTS set_selection_ranking_runs_updated_at
  ON public.selection_ranking_runs;
CREATE TRIGGER set_selection_ranking_runs_updated_at
  BEFORE UPDATE ON public.selection_ranking_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_selection_updated_at();

DROP TRIGGER IF EXISTS set_selection_ranking_approvals_updated_at
  ON public.selection_ranking_approvals;
CREATE TRIGGER set_selection_ranking_approvals_updated_at
  BEFORE UPDATE ON public.selection_ranking_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_selection_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_frozen_selection_ranking_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  run_status text;
BEGIN
  v_run_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.run_id ELSE NEW.run_id END;

  SELECT status INTO run_status
  FROM public.selection_ranking_runs
  WHERE id = v_run_id;

  IF run_status IS NULL THEN
    RAISE EXCEPTION 'Ranking run % does not exist', v_run_id;
  END IF;

  IF run_status <> 'draft' THEN
    RAISE EXCEPTION 'Ranking entries are immutable after the run is frozen';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_frozen_selection_ranking_entry_mutation()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_frozen_selection_ranking_entry_mutation()
  TO service_role;

DROP TRIGGER IF EXISTS prevent_frozen_selection_ranking_entry_mutation
  ON public.selection_ranking_entries;
CREATE TRIGGER prevent_frozen_selection_ranking_entry_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.selection_ranking_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_frozen_selection_ranking_entry_mutation();

CREATE OR REPLACE FUNCTION public.refresh_selection_ranking_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_approvals integer;
  v_rejections integer;
BEGIN
  v_run_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.run_id ELSE NEW.run_id END;

  SELECT
    count(DISTINCT approver_id) FILTER (WHERE decision = 'approve')::integer,
    count(DISTINCT approver_id) FILTER (WHERE decision = 'reject')::integer
  INTO v_approvals, v_rejections
  FROM public.selection_ranking_approvals
  WHERE run_id = v_run_id;

  UPDATE public.selection_ranking_runs
  SET
    status = CASE
      WHEN v_rejections > 0 THEN 'void'
      WHEN v_approvals >= 2 AND status = 'frozen' THEN 'approved'
      ELSE status
    END,
    approved_at = CASE
      WHEN v_rejections > 0 THEN NULL
      WHEN v_approvals >= 2 AND status IN ('frozen', 'approved') THEN COALESCE(approved_at, now())
      ELSE approved_at
    END
  WHERE id = v_run_id
    AND status IN ('frozen', 'approved', 'void');

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_selection_ranking_approval_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_selection_ranking_approval_status()
  TO service_role;

DROP TRIGGER IF EXISTS refresh_selection_ranking_approval_status
  ON public.selection_ranking_approvals;
CREATE TRIGGER refresh_selection_ranking_approval_status
  AFTER INSERT OR UPDATE OR DELETE ON public.selection_ranking_approvals
  FOR EACH ROW EXECUTE FUNCTION public.refresh_selection_ranking_approval_status();

ALTER TABLE public.selection_ranking_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_ranking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_ranking_approvals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.selection_ranking_runs FROM anon, authenticated;
REVOKE ALL ON TABLE public.selection_ranking_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.selection_ranking_approvals FROM anon, authenticated;

GRANT ALL ON TABLE public.selection_ranking_runs TO service_role;
GRANT ALL ON TABLE public.selection_ranking_entries TO service_role;
GRANT ALL ON TABLE public.selection_ranking_approvals TO service_role;

COMMENT ON TABLE public.selection_ranking_runs IS
  'Checksummed, versioned applicant ranking snapshots for one selection cycle.';
COMMENT ON TABLE public.selection_ranking_entries IS
  'Immutable overall and country rank entries after a ranking run is frozen.';
COMMENT ON TABLE public.selection_ranking_approvals IS
  'Independent committee approvals. Two distinct approvers are required.';
