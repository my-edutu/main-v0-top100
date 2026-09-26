-- Atomically persist a checksummed ranking snapshot.

CREATE OR REPLACE FUNCTION public.create_frozen_selection_ranking_run(
  p_cycle_id uuid,
  p_name text,
  p_policy_version text,
  p_winner_target integer,
  p_reserve_target integer,
  p_input_checksum text,
  p_summary jsonb,
  p_entries jsonb,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_entry_count integer;
  v_expected_count integer;
BEGIN
  IF p_winner_target < 1 OR p_winner_target > 10000 THEN
    RAISE EXCEPTION 'winner target must be between 1 and 10000';
  END IF;
  IF p_reserve_target < 0 OR p_reserve_target > 10000 THEN
    RAISE EXCEPTION 'reserve target must be between 0 and 10000';
  END IF;
  IF p_input_checksum !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'input checksum must be a lowercase SHA-256 value';
  END IF;
  IF jsonb_typeof(p_entries) <> 'array' THEN
    RAISE EXCEPTION 'ranking entries must be a JSON array';
  END IF;

  SELECT jsonb_array_length(p_entries) INTO v_expected_count;

  INSERT INTO public.selection_ranking_runs (
    cycle_id,
    name,
    policy_version,
    status,
    winner_target,
    reserve_target,
    eligible_count,
    proposed_winner_count,
    reserve_count,
    countries_represented,
    input_checksum,
    created_by
  )
  VALUES (
    p_cycle_id,
    trim(p_name),
    trim(p_policy_version),
    'draft',
    p_winner_target,
    p_reserve_target,
    COALESCE((p_summary ->> 'eligibleCount')::integer, 0),
    COALESCE((p_summary ->> 'proposedWinnerCount')::integer, 0),
    COALESCE((p_summary ->> 'reserveCount')::integer, 0),
    COALESCE((p_summary ->> 'countriesRepresented')::integer, 0),
    p_input_checksum,
    p_actor_id
  )
  RETURNING id INTO v_run_id;

  INSERT INTO public.selection_ranking_entries (
    run_id,
    application_id,
    assessment_id,
    country,
    overall_rank,
    country_rank,
    total_score,
    score_breakdown,
    selection_status,
    rank_explanation
  )
  SELECT
    v_run_id,
    parsed.application_id,
    parsed.assessment_id,
    parsed.country,
    parsed.overall_rank,
    parsed.country_rank,
    parsed.total_score,
    parsed.score_breakdown,
    parsed.selection_status,
    parsed.rank_explanation
  FROM jsonb_to_recordset(p_entries) AS parsed(
    application_id uuid,
    assessment_id uuid,
    country text,
    overall_rank integer,
    country_rank integer,
    total_score numeric,
    score_breakdown jsonb,
    selection_status text,
    rank_explanation jsonb
  );

  GET DIAGNOSTICS v_entry_count = ROW_COUNT;
  IF v_entry_count <> v_expected_count THEN
    RAISE EXCEPTION 'ranking entry count mismatch: expected %, inserted %',
      v_expected_count,
      v_entry_count;
  END IF;

  UPDATE public.selection_ranking_runs
  SET
    status = 'frozen',
    frozen_by = p_actor_id,
    frozen_at = now()
  WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_frozen_selection_ranking_run(
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  jsonb,
  jsonb,
  uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_frozen_selection_ranking_run(
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  jsonb,
  jsonb,
  uuid
) TO service_role;
