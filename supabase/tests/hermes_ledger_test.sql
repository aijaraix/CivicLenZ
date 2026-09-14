-- Run through hermes_runtime in an explicit transaction, always rollback.
-- Synthetic TEST records only; never count these as civic research.

DO $test$
DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); need uuid; n integer;
BEGIN
 INSERT INTO hermes_ops.research_needs(need_key,target_type,target_id,scope_key,origin,execution_class,reason,basis)
 VALUES ('TEST:ledger-migration:'||a,'test',a,'permission_canary','TEST','TEST','Rolled-back schema behavior test','{}') RETURNING need_id INTO need;
 INSERT INTO public.jobs(job_id,job_type,dedupe_key,payload,research_need_id) VALUES
 (a,'permission_canary','TEST:parent:'||a,'{"orchestration_authority":"hermes","execution_class":"TEST"}',need),
 (b,'permission_canary','TEST:child:'||b,'{"orchestration_authority":"hermes","execution_class":"TEST"}',need);
 INSERT INTO hermes_ops.job_dependencies(job_id,prerequisite_job_id,reason) VALUES(b,a,'TEST prerequisite');
 SELECT count(*) INTO n FROM hermes_ops.lease_job(b,repeat('b',32),60);
 IF n<>0 THEN RAISE EXCEPTION 'Dependency did not block lease'; END IF;
 BEGIN
  INSERT INTO hermes_ops.job_dependencies(job_id,prerequisite_job_id,reason) VALUES(a,b,'TEST cycle must fail');
  RAISE EXCEPTION 'Cycle accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM * FROM hermes_ops.lease_job(a,repeat('a',32),NULL);
  RAISE EXCEPTION 'NULL duration accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 SELECT count(*) INTO n FROM hermes_ops.lease_job(a,repeat('a',32),60);
 IF n<>1 THEN RAISE EXCEPTION 'Independent prerequisite not leasable'; END IF;
 SELECT count(*) INTO n FROM hermes_ops.release_job(a,repeat('x',32));
 IF n<>0 THEN RAISE EXCEPTION 'Wrong token released lease'; END IF;
 SELECT count(*) INTO n FROM hermes_ops.release_job(a,repeat('a',32));
 IF n<>1 THEN RAISE EXCEPTION 'Owned lease release failed'; END IF;
 UPDATE public.jobs SET status='succeeded' WHERE job_id=a; -- TEST-only, rolled back, never production proof.
 SELECT count(*) INTO n FROM hermes_ops.lease_job(b,repeat('b',32),60);
 IF n<>1 THEN RAISE EXCEPTION 'Satisfied dependency did not unblock'; END IF;
 BEGIN
  INSERT INTO hermes_ops.job_dependencies(job_id,prerequisite_job_id,reason) VALUES(b,a,'Late dependency');
  RAISE EXCEPTION 'Late dependency accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END;
$test$;