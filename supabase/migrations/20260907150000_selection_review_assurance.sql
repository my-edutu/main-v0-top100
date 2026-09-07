-- Proposed release migration: apply to an isolated synthetic preview first.
-- No browser grants. The API remains responsible for request authentication.
ALTER TABLE public.selection_assessments
  ADD COLUMN IF NOT EXISTS verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1;
ALTER TABLE public.selection_public_results
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Retain void snapshots as history, while allowing a fresh committee review of
-- restored inputs. The original RPC uses a plain INSERT, not ON CONFLICT.
ALTER TABLE public.selection_ranking_runs
  DROP CONSTRAINT IF EXISTS selection_ranking_runs_cycle_id_input_checksum_key;
CREATE UNIQUE INDEX IF NOT EXISTS selection_ranking_live_checksum_unique
  ON public.selection_ranking_runs(cycle_id, input_checksum) WHERE status <> 'void';

CREATE OR REPLACE FUNCTION public.assert_selection_reviewer(p_actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.profiles
    WHERE id = p_actor_id AND lower(role::text) IN ('admin', 'superadmin') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current administrator required' USING ERRCODE = '42501'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_selection_verification(p_verdict text, p_verification jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_outcome text := COALESCE(p_verification->>'academicOutcome', '');
BEGIN
  IF COALESCE(p_verdict, '') NOT IN ('qualified', 'not_qualified', 'needs_review') THEN
    RAISE EXCEPTION 'Invalid verdict' USING ERRCODE = '23514';
  END IF;
  IF p_verdict = 'needs_review' THEN RETURN; END IF;
  IF p_verification->'identityConfirmed' IS DISTINCT FROM 'true'::jsonb OR
     p_verification->'academicEvidenceAuthenticated' IS DISTINCT FROM 'true'::jsonb OR
     p_verification->'leadershipEvidenceReviewed' IS DISTINCT FROM 'true'::jsonb OR
     p_verification->'noConflictOfInterest' IS DISTINCT FROM 'true'::jsonb OR
     COALESCE(jsonb_typeof(p_verification->'evidenceReference'), '') <> 'string' OR
     char_length(trim(COALESCE(p_verification->>'evidenceReference', ''))) NOT BETWEEN 20 AND 2000 OR
     v_outcome NOT IN ('first_class', 'approved_equivalent', 'requirement_not_met') OR
     (p_verdict = 'qualified' AND v_outcome = 'requirement_not_met') OR
     (v_outcome = 'approved_equivalent' AND
       (COALESCE(jsonb_typeof(p_verification->'equivalenceReference'), '') <> 'string' OR
        char_length(trim(COALESCE(p_verification->>'equivalenceReference', ''))) NOT BETWEEN 10 AND 600))
  THEN RAISE EXCEPTION 'Documented verification required' USING ERRCODE = '23514'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_selection_assessment_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.revision := OLD.revision + 1;
    -- Automated retries must not inherit an old human approval receipt.
    IF NEW.reviewed_at IS NOT DISTINCT FROM OLD.reviewed_at THEN
      NEW.reviewer_id := NULL; NEW.reviewed_at := NULL;
      NEW.reviewer_notes := NULL; NEW.verification := '{}'::jsonb;
    END IF;
  ELSE
    NEW.revision := 1;
  END IF;
  IF NEW.reviewer_id IS NULL OR NEW.reviewed_at IS NULL THEN
    NEW.verdict := 'needs_review'; NEW.requires_human_review := true;
  ELSE
    PERFORM public.assert_selection_reviewer(NEW.reviewer_id);
    PERFORM public.assert_selection_verification(NEW.verdict, NEW.verification);
  END IF;
  UPDATE public.selection_public_results
    SET is_published = false, published_at = NULL, published_by = NULL, access_token = gen_random_uuid()
    WHERE application_id = NEW.application_id;
  UPDATE public.selection_ranking_runs SET status = 'void', approved_at = NULL, published_at = NULL
    WHERE cycle_id = (SELECT cycle_id FROM public.selection_applications WHERE id = NEW.application_id)
      AND status IN ('frozen', 'approved', 'published');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_selection_assessment_revision ON public.selection_assessments;
CREATE TRIGGER guard_selection_assessment_revision BEFORE INSERT OR UPDATE ON public.selection_assessments
  FOR EACH ROW EXECUTE FUNCTION public.guard_selection_assessment_revision();

CREATE OR REPLACE FUNCTION public.save_selection_human_review(
  p_application_id uuid, p_actor_id uuid, p_expected_revision bigint, p_policy_version text,
  p_assessment jsonb, p_verification jsonb, p_reviewer_notes text, p_payload jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_app public.selection_applications%ROWTYPE;
  v_cycle public.selection_cycles%ROWTYPE;
  v_old public.selection_assessments%ROWTYPE;
  v_id uuid;
  v_score numeric := 0;
  v_key text;
  v_max numeric;
  v_value numeric;
  v_verdict text := p_assessment->>'verdict';
  v_internal text[];
BEGIN
  PERFORM public.assert_selection_reviewer(p_actor_id);
  SELECT * INTO v_app FROM public.selection_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application unavailable' USING ERRCODE = '23514'; END IF;
  SELECT * INTO v_cycle FROM public.selection_cycles WHERE id = v_app.cycle_id FOR SHARE;
  IF v_cycle.policy->>'version' IS DISTINCT FROM p_policy_version OR
     COALESCE(trim(p_policy_version), '') = '' OR
     v_cycle.policy->'requireVerifiedAcademicEvidence' IS DISTINCT FROM 'true'::jsonb OR
     v_cycle.policy->>'academicRequirement' IS DISTINCT FROM 'first_class_or_equivalent' OR
     COALESCE(jsonb_typeof(v_cycle.policy->'minimumMeritScore'), '') <> 'number' OR
     (v_cycle.policy->>'minimumMeritScore')::numeric NOT BETWEEN 0 AND 100
  THEN RAISE EXCEPTION 'Policy changed or invalid' USING ERRCODE = '40001'; END IF;
  IF EXISTS (SELECT 1 FROM public.selection_processing_tasks WHERE application_id = p_application_id
             AND status IN ('pending', 'processing', 'retry')) THEN
    RAISE EXCEPTION 'Active processing must finish first' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO v_old FROM public.selection_assessments
    WHERE application_id = p_application_id AND policy_version = p_policy_version FOR UPDATE;
  IF (v_old.id IS NULL AND p_expected_revision IS NOT NULL) OR
     (v_old.id IS NOT NULL AND v_old.revision IS DISTINCT FROM p_expected_revision) THEN
    RAISE EXCEPTION 'Stale review revision' USING ERRCODE = '40001';
  END IF;
  PERFORM public.assert_selection_verification(v_verdict, p_verification);
  IF char_length(trim(COALESCE(p_reviewer_notes, ''))) NOT BETWEEN 10 AND 4000 OR
     COALESCE(jsonb_typeof(p_assessment->'publicReasons'), '') <> 'array' THEN
    RAISE EXCEPTION 'Review explanation required' USING ERRCODE = '23514';
  END IF;
  IF jsonb_array_length(p_assessment->'publicReasons') NOT BETWEEN 1 AND 8 OR
     EXISTS (SELECT 1 FROM jsonb_array_elements(p_assessment->'publicReasons') AS reason
             WHERE jsonb_typeof(reason) <> 'string' OR char_length(trim(reason #>> '{}')) NOT BETWEEN 10 AND 600) THEN
    RAISE EXCEPTION 'Invalid review explanation' USING ERRCODE = '23514';
  END IF;
  FOR v_key, v_max IN SELECT * FROM (VALUES ('academic',30),('leadership',25),('impact',25),('initiative',10),('communication',10)) AS bounds(k,m) LOOP
    IF COALESCE(jsonb_typeof(p_assessment->'scoreBreakdown'->v_key), '') <> 'number' THEN
      RAISE EXCEPTION 'Numeric score required' USING ERRCODE = '23514';
    END IF;
    v_value := (p_assessment->'scoreBreakdown'->>v_key)::numeric;
    IF v_value NOT BETWEEN 0 AND v_max OR v_value <> round(v_value,2) THEN
      RAISE EXCEPTION 'Score outside rubric' USING ERRCODE = '23514';
    END IF;
    v_score := v_score + v_value;
  END LOOP;
  IF v_score IS DISTINCT FROM (p_assessment->>'totalScore')::numeric OR
     (v_verdict = 'qualified' AND v_score < (v_cycle.policy->>'minimumMeritScore')::numeric) THEN
    RAISE EXCEPTION 'Score does not meet policy' USING ERRCODE = '23514';
  END IF;
  v_internal := ARRAY(SELECT DISTINCT value FROM unnest(COALESCE(v_old.internal_reasons, ARRAY[]::text[]) ||
    ARRAY(SELECT jsonb_array_elements_text(p_assessment->'internalReasons'))) AS values_(value));
  INSERT INTO public.selection_assessments AS current_assessment
    (application_id,job_id,policy_version,verdict,total_score,score_breakdown,reason_codes,
     internal_reasons,public_reasons,requires_human_review,reviewer_id,reviewer_notes,reviewed_at,verification)
  VALUES (p_application_id,v_app.job_id,p_policy_version,v_verdict,v_score,p_assessment->'scoreBreakdown',
    ARRAY(SELECT jsonb_array_elements_text(p_assessment->'reasonCodes')),v_internal,
    ARRAY(SELECT jsonb_array_elements_text(p_assessment->'publicReasons')),v_verdict='needs_review',
    p_actor_id,p_reviewer_notes,clock_timestamp(),p_verification)
  ON CONFLICT (application_id,policy_version) DO UPDATE SET
    verdict=EXCLUDED.verdict,total_score=EXCLUDED.total_score,score_breakdown=EXCLUDED.score_breakdown,
    reason_codes=EXCLUDED.reason_codes,internal_reasons=EXCLUDED.internal_reasons,public_reasons=EXCLUDED.public_reasons,
    requires_human_review=EXCLUDED.requires_human_review,reviewer_id=EXCLUDED.reviewer_id,
    reviewer_notes=EXCLUDED.reviewer_notes,reviewed_at=EXCLUDED.reviewed_at,verification=EXCLUDED.verification
  RETURNING id INTO v_id;
  INSERT INTO public.selection_public_results(application_id,assessment_id,payload,is_published,published_at,published_by)
    VALUES(p_application_id,v_id,p_payload,false,NULL,NULL)
    ON CONFLICT(application_id) DO UPDATE SET assessment_id=EXCLUDED.assessment_id,payload=EXCLUDED.payload,
      is_published=false,published_at=NULL,published_by=NULL,access_token=gen_random_uuid();
  UPDATE public.selection_applications SET status=CASE WHEN v_verdict='needs_review' THEN 'review_required' ELSE 'assessed' END
    WHERE id=p_application_id;
  INSERT INTO public.selection_audit_events(cycle_id,job_id,application_id,actor_id,event_type,event_data)
    VALUES(v_app.cycle_id,v_app.job_id,p_application_id,p_actor_id,'application_human_reviewed',
      jsonb_build_object('assessmentId',v_id,'verdict',v_verdict,'totalScore',v_score,'policyVersion',p_policy_version,
        'previousRevision',v_old.revision,'verification',p_verification,'previousAssessment',
        to_jsonb(v_old)-'internal_reasons'-'reviewer_notes'));
  PERFORM public.refresh_selection_job_counts(v_app.job_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_selection_result_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_assessment public.selection_assessments%ROWTYPE;
  v_cycle public.selection_cycles%ROWTYPE;
  v_key text;
BEGIN
  IF NOT NEW.is_published THEN RETURN NEW; END IF;
  PERFORM public.assert_selection_reviewer(NEW.published_by);
  SELECT * INTO v_assessment FROM public.selection_assessments WHERE id=NEW.assessment_id FOR SHARE;
  IF v_assessment.id IS NULL OR v_assessment.application_id IS DISTINCT FROM NEW.application_id OR
     v_assessment.requires_human_review OR v_assessment.verdict='needs_review' OR
     v_assessment.reviewer_id IS NULL OR v_assessment.reviewed_at IS NULL OR
     v_assessment.reviewer_id=NEW.published_by THEN
    RAISE EXCEPTION 'Independent verified review required' USING ERRCODE='23514';
  END IF;
  PERFORM public.assert_selection_verification(v_assessment.verdict,v_assessment.verification);
  SELECT c.* INTO v_cycle FROM public.selection_cycles c JOIN public.selection_applications a ON a.cycle_id=c.id
    WHERE a.id=NEW.application_id FOR SHARE OF c;
  IF v_cycle.policy->>'version' IS DISTINCT FROM v_assessment.policy_version OR
     v_cycle.policy->'requireVerifiedAcademicEvidence' IS DISTINCT FROM 'true'::jsonb OR
     v_cycle.policy->>'academicRequirement' IS DISTINCT FROM 'first_class_or_equivalent' OR
     (NEW.payload->>'minimumMeritScore')::numeric IS DISTINCT FROM (v_cycle.policy->>'minimumMeritScore')::numeric OR
     NEW.payload->>'verdict' IS DISTINCT FROM v_assessment.verdict OR
     (NEW.payload->>'totalScore')::numeric IS DISTINCT FROM v_assessment.total_score OR
     NEW.payload->'reasons' IS DISTINCT FROM to_jsonb(v_assessment.public_reasons) OR
     NEW.payload->'isFinal' IS DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION 'Stale result payload or policy' USING ERRCODE='23514';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['academic','leadership','impact','initiative','communication'] LOOP
    IF (NEW.payload->'scoreBreakdown'->v_key->>'score')::numeric IS DISTINCT FROM
       (v_assessment.score_breakdown->>v_key)::numeric THEN
      RAISE EXCEPTION 'Stale criterion score' USING ERRCODE='23514';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.selection_processing_tasks WHERE application_id=NEW.application_id
    AND status IN ('pending','processing','retry')) THEN
    RAISE EXCEPTION 'Processing is active' USING ERRCODE='40001';
  END IF;
  IF v_assessment.verdict='qualified' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.selection_ranking_runs r JOIN public.selection_ranking_entries e ON e.run_id=r.id
      WHERE r.cycle_id=v_cycle.id AND r.status='approved' AND r.policy_version=v_assessment.policy_version
        AND e.application_id=NEW.application_id AND e.assessment_id=v_assessment.id
        AND e.total_score=v_assessment.total_score AND e.score_breakdown=v_assessment.score_breakdown
        AND r.frozen_at >= (SELECT max(s.updated_at) FROM public.selection_assessments s
          JOIN public.selection_applications a ON a.id=s.application_id WHERE a.cycle_id=v_cycle.id)
        AND r.frozen_at >= (SELECT max(a.created_at) FROM public.selection_applications a WHERE a.cycle_id=v_cycle.id)
        AND (SELECT count(DISTINCT approver_id) FROM public.selection_ranking_approvals
             WHERE run_id=r.id AND decision='approve') >= 2
        AND NOT EXISTS (SELECT 1 FROM public.selection_ranking_approvals WHERE run_id=r.id AND decision='reject')
    ) THEN RAISE EXCEPTION 'Current committee-approved ranking required' USING ERRCODE='23514'; END IF;
    IF EXISTS (SELECT 1 FROM public.selection_applications a WHERE a.cycle_id=v_cycle.id AND NOT EXISTS (
      SELECT 1 FROM public.selection_assessments s WHERE s.application_id=a.id AND s.policy_version=v_assessment.policy_version
        AND NOT s.requires_human_review AND s.verdict<>'needs_review' AND s.reviewer_id IS NOT NULL AND s.reviewed_at IS NOT NULL
    )) OR EXISTS (SELECT 1 FROM public.selection_processing_tasks t JOIN public.selection_applications a ON a.id=t.application_id
      WHERE a.cycle_id=v_cycle.id AND t.status IN ('pending','processing','retry')) THEN
      RAISE EXCEPTION 'Cycle review is incomplete' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_selection_result_publication ON public.selection_public_results;
CREATE TRIGGER guard_selection_result_publication BEFORE INSERT OR UPDATE ON public.selection_public_results
  FOR EACH ROW EXECUTE FUNCTION public.guard_selection_result_publication();

CREATE OR REPLACE FUNCTION public.publish_selection_reviewed_result(p_application_id uuid,p_actor_id uuid)
RETURNS TABLE(access_token uuid,published_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_app public.selection_applications%ROWTYPE;
BEGIN
  PERFORM public.assert_selection_reviewer(p_actor_id);
  SELECT * INTO v_app FROM public.selection_applications WHERE id=p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application unavailable' USING ERRCODE='23514'; END IF;
  -- Assessment locks are taken before result locks, matching review saves.
  PERFORM 1 FROM public.selection_assessments WHERE application_id=p_application_id FOR SHARE;
  RETURN QUERY UPDATE public.selection_public_results r SET
    is_published=true,published_by=p_actor_id,published_at=clock_timestamp(),
    payload=r.payload || jsonb_build_object('isFinal',true,'publishedAt',clock_timestamp())
    WHERE r.application_id=p_application_id RETURNING r.access_token,r.published_at;
  IF NOT FOUND THEN RAISE EXCEPTION 'Result unavailable' USING ERRCODE='23514'; END IF;
  INSERT INTO public.selection_audit_events(cycle_id,job_id,application_id,actor_id,event_type)
    VALUES(v_app.cycle_id,v_app.job_id,p_application_id,p_actor_id,'applicant_result_published');
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_selection_reviewed_result(p_application_id uuid,p_actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.assert_selection_reviewer(p_actor_id);
  PERFORM 1 FROM public.selection_applications WHERE id=p_application_id FOR UPDATE;
  UPDATE public.selection_public_results SET is_published=false,published_at=NULL,published_by=NULL,access_token=gen_random_uuid()
    WHERE application_id=p_application_id;
  INSERT INTO public.selection_audit_events(application_id,actor_id,event_type)
    VALUES(p_application_id,p_actor_id,'applicant_result_unpublished');
END;
$$;

REVOKE ALL ON FUNCTION public.assert_selection_reviewer(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.assert_selection_verification(text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_selection_assessment_revision() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_selection_result_publication() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_selection_human_review(uuid,uuid,bigint,text,jsonb,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.publish_selection_reviewed_result(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.unpublish_selection_reviewed_result(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assert_selection_reviewer(uuid),public.assert_selection_verification(text,jsonb),
  public.guard_selection_assessment_revision(),public.guard_selection_result_publication(),
  public.save_selection_human_review(uuid,uuid,bigint,text,jsonb,jsonb,text,jsonb),
  public.publish_selection_reviewed_result(uuid,uuid),public.unpublish_selection_reviewed_result(uuid,uuid) TO service_role;


-- Count applications under the active cycle policy, not every historical assessment.
CREATE OR REPLACE FUNCTION public.refresh_selection_job_counts(p_job_id uuid)
RETURNS public.selection_jobs LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_result public.selection_jobs%ROWTYPE; v_total integer; v_processed integer; v_yes integer; v_no integer; v_review integer; v_active integer;
BEGIN
  SELECT count(*)::integer,count(s.id)::integer,count(*) FILTER(WHERE s.verdict='qualified')::integer,
    count(*) FILTER(WHERE s.verdict='not_qualified')::integer,count(*) FILTER(WHERE s.verdict='needs_review')::integer
    INTO v_total,v_processed,v_yes,v_no,v_review
    FROM public.selection_applications a JOIN public.selection_cycles c ON c.id=a.cycle_id
    LEFT JOIN public.selection_assessments s ON s.application_id=a.id AND s.policy_version=c.policy->>'version'
    WHERE a.job_id=p_job_id;
  SELECT count(*)::integer INTO v_active FROM public.selection_processing_tasks
    WHERE job_id=p_job_id AND status IN ('pending','processing','retry');
  UPDATE public.selection_jobs SET total_count=v_total,processed_count=v_processed,qualified_count=v_yes,
    not_qualified_count=v_no,needs_review_count=v_review,status=CASE WHEN v_active>0 THEN 'processing'
    WHEN v_processed>=v_total THEN 'completed' ELSE 'ready' END,
    completed_at=CASE WHEN v_processed>=v_total AND v_active=0 THEN COALESCE(completed_at,now()) ELSE NULL END
    WHERE id=p_job_id RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

-- A worker cannot hide an unresolved assessment by writing an 'assessed' status.
CREATE OR REPLACE FUNCTION public.guard_selection_application_status()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.status IN ('assessed','published') AND NOT EXISTS (
    SELECT 1 FROM public.selection_assessments s JOIN public.selection_cycles c ON c.id=NEW.cycle_id
      WHERE s.application_id=NEW.id AND s.policy_version=c.policy->>'version'
        AND NOT s.requires_human_review AND s.verdict<>'needs_review'
        AND s.reviewer_id IS NOT NULL AND s.reviewed_at IS NOT NULL
  ) THEN NEW.status:='review_required'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_selection_application_status ON public.selection_applications;
CREATE TRIGGER guard_selection_application_status BEFORE UPDATE ON public.selection_applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_selection_application_status();
REVOKE ALL ON FUNCTION public.guard_selection_application_status(),public.refresh_selection_job_counts(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_selection_application_status(),public.refresh_selection_job_counts(uuid) TO service_role;

-- Migration compatibility: previous OCR-only and undocumented decisions are not
-- grandfathered into trusted status. Reopen them without deleting their history.
WITH reopened AS (
  UPDATE public.selection_assessments SET verdict='needs_review',requires_human_review=true,
    reviewer_id=NULL,reviewed_at=NULL,
    reason_codes=ARRAY['LEGACY_ASSURANCE_REVIEW_REQUIRED'],
    internal_reasons=internal_reasons || ARRAY['Review predates documented verification safeguards.']
    WHERE verification='{}'::jsonb
    RETURNING application_id,job_id,id
)
INSERT INTO public.selection_audit_events(application_id,job_id,event_type,event_data)
  SELECT application_id,job_id,'legacy_assessment_reopened',jsonb_build_object('assessmentId',id)
  FROM reopened;
UPDATE public.selection_applications a SET status='review_required'
  WHERE EXISTS (SELECT 1 FROM public.selection_assessments s JOIN public.selection_cycles c ON c.id=a.cycle_id
    WHERE s.application_id=a.id AND s.policy_version=c.policy->>'version' AND s.requires_human_review);
DO $$ DECLARE v_job uuid; BEGIN
  FOR v_job IN SELECT id FROM public.selection_jobs LOOP
    PERFORM public.refresh_selection_job_counts(v_job);
  END LOOP;
END $$;
