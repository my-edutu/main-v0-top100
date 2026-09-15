-- Durable application processing tasks.
-- One logical admin batch contains at most 100 applications. Cron/manual workers
-- claim only a small number of tasks per invocation so PDF OCR stays within
-- normal serverless execution limits.

CREATE TABLE IF NOT EXISTS public.selection_processing_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.selection_jobs(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.selection_applications(id) ON DELETE CASCADE,
  logical_batch_number integer NOT NULL CHECK (logical_batch_number > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'retry', 'completed', 'failed')
  ),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  lock_token uuid,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, application_id)
);

CREATE INDEX IF NOT EXISTS selection_processing_tasks_claim_idx
  ON public.selection_processing_tasks(status, available_at, logical_batch_number, created_at)
  WHERE status IN ('pending', 'retry', 'processing');
CREATE INDEX IF NOT EXISTS selection_processing_tasks_job_batch_idx
  ON public.selection_processing_tasks(job_id, logical_batch_number, status);

DROP TRIGGER IF EXISTS set_selection_processing_tasks_updated_at
  ON public.selection_processing_tasks;
CREATE TRIGGER set_selection_processing_tasks_updated_at
  BEFORE UPDATE ON public.selection_processing_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_selection_updated_at();

ALTER TABLE public.selection_processing_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.selection_processing_tasks FROM anon, authenticated;
GRANT ALL ON TABLE public.selection_processing_tasks TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_selection_job_batch(p_job_id uuid)
RETURNS TABLE (
  logical_batch_number integer,
  enqueued_count integer,
  has_more boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job public.selection_jobs%ROWTYPE;
  v_batch_number integer;
  v_enqueued integer;
  v_has_more boolean;
BEGIN
  SELECT *
  INTO v_job
  FROM public.selection_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selection job % was not found', p_job_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.selection_processing_tasks
    WHERE job_id = p_job_id
      AND status IN ('pending', 'processing', 'retry')
  ) THEN
    RAISE EXCEPTION 'The current selection batch is still processing';
  END IF;

  v_batch_number := v_job.current_batch + 1;

  WITH candidates AS (
    SELECT application.id
    FROM public.selection_applications AS application
    WHERE application.job_id = p_job_id
      AND application.status IN ('imported', 'queued')
      AND NOT EXISTS (
        SELECT 1
        FROM public.selection_processing_tasks AS existing_task
        WHERE existing_task.job_id = p_job_id
          AND existing_task.application_id = application.id
      )
    ORDER BY application.created_at, application.id
    LIMIT LEAST(v_job.batch_size, 100)
  ), inserted AS (
    INSERT INTO public.selection_processing_tasks (
      job_id,
      application_id,
      logical_batch_number,
      status
    )
    SELECT p_job_id, candidates.id, v_batch_number, 'pending'
    FROM candidates
    ON CONFLICT (job_id, application_id) DO NOTHING
    RETURNING application_id
  )
  SELECT count(*)::integer INTO v_enqueued FROM inserted;

  UPDATE public.selection_applications
  SET status = 'queued'
  WHERE id IN (
    SELECT application_id
    FROM public.selection_processing_tasks
    WHERE job_id = p_job_id
      AND logical_batch_number = v_batch_number
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.selection_applications AS application
    WHERE application.job_id = p_job_id
      AND application.status IN ('imported', 'queued')
      AND NOT EXISTS (
        SELECT 1
        FROM public.selection_processing_tasks AS existing_task
        WHERE existing_task.job_id = p_job_id
          AND existing_task.application_id = application.id
      )
  ) INTO v_has_more;

  UPDATE public.selection_jobs
  SET
    current_batch = CASE WHEN v_enqueued > 0 THEN v_batch_number ELSE current_batch END,
    status = CASE
      WHEN v_enqueued > 0 THEN 'processing'
      WHEN processed_count >= total_count THEN 'completed'
      ELSE 'ready'
    END,
    started_at = COALESCE(started_at, CASE WHEN v_enqueued > 0 THEN now() ELSE NULL END),
    last_error = NULL
  WHERE id = p_job_id;

  RETURN QUERY SELECT v_batch_number, v_enqueued, v_has_more;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_selection_job_batch(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_selection_job_batch(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_selection_processing_tasks(
  p_limit integer DEFAULT 5,
  p_lock_minutes integer DEFAULT 10
)
RETURNS SETOF public.selection_processing_tasks
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT task.id
    FROM public.selection_processing_tasks AS task
    WHERE (
        task.status IN ('pending', 'retry')
        OR (
          task.status = 'processing'
          AND task.locked_at < now() - make_interval(mins => GREATEST(p_lock_minutes, 1))
        )
      )
      AND task.available_at <= now()
    ORDER BY task.logical_batch_number, task.available_at, task.created_at, task.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 10)
  )
  UPDATE public.selection_processing_tasks AS task
  SET
    status = 'processing',
    attempt_count = task.attempt_count + 1,
    locked_at = now(),
    lock_token = gen_random_uuid(),
    updated_at = now()
  FROM candidates
  WHERE task.id = candidates.id
  RETURNING task.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_selection_processing_tasks(integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_selection_processing_tasks(integer, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_selection_job_counts(p_job_id uuid)
RETURNS public.selection_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result public.selection_jobs%ROWTYPE;
  v_processed integer;
  v_qualified integer;
  v_not_qualified integer;
  v_needs_review integer;
  v_active_tasks integer;
BEGIN
  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE verdict = 'qualified')::integer,
    count(*) FILTER (WHERE verdict = 'not_qualified')::integer,
    count(*) FILTER (WHERE verdict = 'needs_review')::integer
  INTO v_processed, v_qualified, v_not_qualified, v_needs_review
  FROM public.selection_assessments
  WHERE job_id = p_job_id;

  SELECT count(*)::integer
  INTO v_active_tasks
  FROM public.selection_processing_tasks
  WHERE job_id = p_job_id
    AND status IN ('pending', 'processing', 'retry');

  UPDATE public.selection_jobs
  SET
    processed_count = v_processed,
    qualified_count = v_qualified,
    not_qualified_count = v_not_qualified,
    needs_review_count = v_needs_review,
    status = CASE
      WHEN v_processed >= total_count AND v_active_tasks = 0 THEN 'completed'
      WHEN v_active_tasks > 0 THEN 'processing'
      ELSE 'ready'
    END,
    completed_at = CASE
      WHEN v_processed >= total_count AND v_active_tasks = 0 THEN COALESCE(completed_at, now())
      ELSE NULL
    END
  WHERE id = p_job_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_selection_job_counts(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_selection_job_counts(uuid) TO service_role;

COMMENT ON TABLE public.selection_processing_tasks IS
  'Retryable PDF OCR and assessment work items. Workers claim rows with SKIP LOCKED.';
