-- Synthetic CI data only. Executes real PostgreSQL functions and triggers.
CREATE FUNCTION pg_temp.assert_ok(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text,expected text,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE=expected THEN RAISE NOTICE 'PASS: %',label; RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Expected rejection: %',label;
END $$;
CREATE FUNCTION public.assurance_test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('assurance.fail_audit',true)='on' AND NEW.event_type='application_human_reviewed' THEN
    RAISE EXCEPTION 'Synthetic audit failure';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assurance_test_fail_audit BEFORE INSERT ON public.selection_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.assurance_test_fail_audit();
SET ROLE service_role;
DO $$
DECLARE
  a uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); j uuid:=gen_random_uuid(); s uuid; r uuid:=gen_random_uuid(); token_before uuid;
  actor uuid:='00000000-0000-4000-8000-000000000001'; publisher uuid:='00000000-0000-4000-8000-000000000002';
  outsider uuid:='00000000-0000-4000-8000-000000000003';
  checks jsonb:='{"academicOutcome":"first_class","identityConfirmed":true,"academicEvidenceAuthenticated":true,"leadershipEvidenceReviewed":true,"noConflictOfInterest":true,"evidenceReference":"Synthetic registrar REF-001 and holder confirmation.","equivalenceReference":""}';
  assessment jsonb:='{"verdict":"qualified","totalScore":84,"scoreBreakdown":{"academic":28,"leadership":20,"impact":20,"initiative":8,"communication":8},"reasonCodes":["HUMAN_REVIEW_QUALIFIED"],"publicReasons":["The evidence met the published requirements."],"internalReasons":[]}';
  payload jsonb:='{"verdict":"qualified","isFinal":true,"minimumMeritScore":60,"totalScore":84,"reasons":["The evidence met the published requirements."],"scoreBreakdown":{"academic":{"score":28,"maximum":30},"leadership":{"score":20,"maximum":25},"impact":{"score":20,"maximum":25},"initiative":{"score":8,"maximum":10},"communication":{"score":8,"maximum":10}}}';
  save_sql text;
BEGIN
  INSERT INTO public.selection_cycles(id,name,slug,year) VALUES(c,'Synthetic assurance cycle',c::text,2026);
  INSERT INTO public.selection_jobs(id,cycle_id,source_type,source_label,total_count) VALUES(j,c,'pdf_upload','Synthetic evidence',1);
  INSERT INTO public.selection_applications(id,cycle_id,job_id,source_record_id,full_name) VALUES(a,c,j,a::text,'Invented Applicant');
  INSERT INTO public.selection_assessments(application_id,job_id,policy_version,verdict,total_score,score_breakdown)
    VALUES(a,j,'2026.1','qualified',84,assessment->'scoreBreakdown') RETURNING id INTO s;
  PERFORM pg_temp.assert_ok((SELECT verdict='needs_review' AND requires_human_review FROM public.selection_assessments WHERE id=s),'automated qualification remains provisional');
  UPDATE public.selection_applications SET status='assessed' WHERE id=a;
  PERFORM pg_temp.assert_ok((SELECT status='review_required' FROM public.selection_applications WHERE id=a),'worker cannot hide an unresolved case');
  PERFORM pg_temp.expect_error(format('SELECT public.assert_selection_reviewer(%L::uuid)',outsider),'42501','non-admin reviewer denied');
  PERFORM pg_temp.expect_error('SELECT public.assert_selection_verification(''qualified'',''{}''::jsonb)','23514','missing verification denied');
  PERFORM pg_temp.expect_error(format('SELECT public.assert_selection_verification(''qualified'',%L::jsonb)',checks||'{"identityConfirmed":false}'::jsonb),'23514','unconfirmed holder denied');
  PERFORM pg_temp.expect_error(format('SELECT public.assert_selection_verification(''qualified'',%L::jsonb)',checks||'{"academicOutcome":"approved_equivalent"}'::jsonb),'23514','undocumented equivalence denied');
  s:=public.save_selection_human_review(a,actor,1,'2026.1',assessment,checks,'Synthetic source verified.',payload);
  PERFORM pg_temp.assert_ok((SELECT revision=2 AND verdict='qualified' AND reviewer_id=actor FROM public.selection_assessments WHERE id=s),'verified human review saved at next revision');
  save_sql:=format('SELECT public.save_selection_human_review(%L::uuid,%L::uuid,1,''2026.1'',%L::jsonb,%L::jsonb,''Synthetic source verified.'',%L::jsonb)',a,actor,assessment,checks,payload);
  PERFORM pg_temp.expect_error(save_sql,'40001','stale reviewer cannot overwrite a decision');
  PERFORM pg_temp.expect_error(format('SELECT * FROM public.publish_selection_reviewed_result(%L::uuid,%L::uuid)',a,actor),'23514','reviewer cannot self-publish');
  PERFORM pg_temp.expect_error(format('SELECT * FROM public.publish_selection_reviewed_result(%L::uuid,%L::uuid)',a,publisher),'23514','qualification publication requires committee');
  INSERT INTO public.selection_ranking_runs(id,cycle_id,name,policy_version,status,input_checksum)
    VALUES(r,c,'Synthetic ranking','2026.1','draft',repeat('a',64));
  INSERT INTO public.selection_ranking_entries(run_id,application_id,assessment_id,country,overall_rank,country_rank,total_score,score_breakdown,selection_status)
    VALUES(r,a,s,'Nigeria',1,1,84,assessment->'scoreBreakdown','proposed_winner');
  UPDATE public.selection_ranking_runs SET status='frozen',frozen_at=clock_timestamp() WHERE id=r;
  INSERT INTO public.selection_ranking_approvals(run_id,approver_id,decision,notes) VALUES(r,actor,'approve','Synthetic independent committee check.');
  PERFORM pg_temp.expect_error(format('SELECT * FROM public.publish_selection_reviewed_result(%L::uuid,%L::uuid)',a,publisher),'23514','one committee approval is insufficient');
  INSERT INTO public.selection_ranking_approvals(run_id,approver_id,decision,notes) VALUES(r,publisher,'approve','Second synthetic committee check.');
  PERFORM public.publish_selection_reviewed_result(a,publisher);
  SELECT access_token INTO token_before FROM public.selection_public_results WHERE application_id=a;
  PERFORM pg_temp.assert_ok((SELECT is_published FROM public.selection_public_results WHERE application_id=a),'independent publication succeeds after two approvals');
  PERFORM set_config('assurance.fail_audit','on',true);
  save_sql:=format('SELECT public.save_selection_human_review(%L::uuid,%L::uuid,2,''2026.1'',%L::jsonb,%L::jsonb,''Synthetic source rechecked.'',%L::jsonb)',a,actor,assessment,checks,payload);
  PERFORM pg_temp.expect_error(save_sql,'P0001','audit failure rolls back the review transaction');
  PERFORM set_config('assurance.fail_audit','off',true);
  PERFORM pg_temp.assert_ok((SELECT revision=2 FROM public.selection_assessments WHERE id=s),'failed transaction preserves revision');
  PERFORM pg_temp.assert_ok((SELECT is_published AND access_token=token_before FROM public.selection_public_results WHERE application_id=a),'failed transaction preserves prior result atomically');
  PERFORM public.save_selection_human_review(a,actor,2,'2026.1',assessment,checks,'Synthetic source rechecked.',payload);
  PERFORM pg_temp.assert_ok((SELECT NOT is_published AND access_token<>token_before FROM public.selection_public_results WHERE application_id=a),'review revokes old public token');
  PERFORM pg_temp.assert_ok((SELECT status='void' FROM public.selection_ranking_runs WHERE id=r),'review invalidates ranking approval');
  INSERT INTO public.selection_assessments(application_id,job_id,policy_version,verdict,total_score,score_breakdown)
    VALUES(a,j,'older-policy','needs_review',0,'{"academic":0,"leadership":0,"impact":0,"initiative":0,"communication":0}');
  PERFORM public.refresh_selection_job_counts(j);
  PERFORM pg_temp.assert_ok((SELECT total_count=1 AND processed_count=1 FROM public.selection_jobs WHERE id=j),'historical policy does not inflate applicant counts');
  PERFORM pg_temp.assert_ok(NOT has_table_privilege('anon','public.selection_assessments','SELECT'),'anonymous private-table read denied');
  PERFORM pg_temp.assert_ok(NOT has_table_privilege('authenticated','public.selection_assessments','SELECT'),'browser private-table read denied');
  PERFORM pg_temp.assert_ok(NOT has_function_privilege('anon','public.publish_selection_reviewed_result(uuid,uuid)','EXECUTE'),'anonymous publication RPC denied');
  PERFORM pg_temp.assert_ok(NOT has_function_privilege('authenticated','public.save_selection_human_review(uuid,uuid,bigint,text,jsonb,jsonb,text,jsonb)','EXECUTE'),'browser review RPC denied');
END $$;
RESET ROLE;
