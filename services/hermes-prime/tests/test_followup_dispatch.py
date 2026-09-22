"""UNIT: real dispatcher control flow with isolated transport/database fixtures."""
import contextlib
import importlib.util
import io
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

class Cursor:
    def __init__(self, job):
        self.job=job; self.calls=[]; self.result=None
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def execute(self,sql,args=()):
        self.calls.append((sql,args))
        if 'pg_try_advisory' in sql:self.result={'acquired':True}
        elif 'hermes_ops.lease_job' in sql:
            self.job['leased_by']=args[1];self.result=self.job
        elif 'sum(attempt_count)' in sql:self.result={'attempts':5,'active':0}
    def fetchone(self):return self.result

class Connection:
    def __init__(self,cursor):self.c=cursor
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def cursor(self,**kwargs):return self.c

class DispatcherTests(unittest.TestCase):
    def load(self):
        fake_db=types.ModuleType('database_bootstrap');fake_db.connect_database=lambda:None
        fake_pg=types.ModuleType('psycopg2.extras');fake_pg.RealDictCursor=object
        spec=importlib.util.spec_from_file_location('dispatcher_under_test',Path(__file__).resolve().parents[1]/'contract_dispatcher.py')
        module=importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules,{'database_bootstrap':fake_db,'psycopg2':types.ModuleType('psycopg2'),'psycopg2.extras':fake_pg}):
            spec.loader.exec_module(module)
        return module

    def test_quarantine_budget_excludes_historical_evidence_routes(self):
        d=self.load(); cursor=Cursor({})
        d.quarantine_canary_budget(cursor)
        query,args=cursor.calls[-1]
        self.assertIn("capability_route'->>'capability'=%s",query)
        self.assertEqual(args,(d.ROUTE_VERSION,d.QUARANTINE_CAPABILITY))

    def test_continuous_mode_requires_explicit_opt_in_and_is_concurrency_bounded(self):
        d=self.load()
        with patch.dict(d.os.environ,{},clear=True):
            self.assertEqual(d.settings()['mode'],'canary')
        with patch.dict(d.os.environ,{'HERMES_CONTRACT_DISPATCH_MODE':'continuous',
                                      'HERMES_CONTRACT_DISPATCH_CONCURRENCY':'99'},clear=True):
            config=d.settings()
        self.assertEqual(config['mode'],'continuous')
        self.assertEqual(config['concurrency'],5)
    def test_followup_uses_existing_atomic_lease_and_only_ingest_queue(self):
        d=self.load()
        job={'job_id':'job','job_type':'contract_scope_research','target_id':'seat','research_need_id':'need',
             'dedupe_key':'work','payload':{'validation_followup':{'receipt_id':'receipt'},'capability_route':{'version':d.validation_followup.VERSION}}}
        cursor=Cursor(job)
        @contextlib.contextmanager
        def connect():yield Connection(cursor)
        credential=types.SimpleNamespace(read_text=lambda:'fixture-not-a-credential')
        with patch.object(d,'connect_database',connect),patch.object(d,'settings',return_value={'enabled':True,'ready':True,'deployment':'old','budget':5,'credential':credential}), \
             patch.object(d,'route_pending',return_value=0),patch.object(d,'recover_and_collect'),patch.object(d,'collect_late_successes',return_value=0),patch.object(d,'recover_immutable_raw_conflicts',return_value=0), \
             patch.object(d.producer_receipt_validation,'collect'),patch.object(d.producer_receipt_validation,'candidate',return_value=None), \
             patch.object(d.validation_receipt,'collect'),patch.object(d.validation_followup,'collect'), \
             patch.object(d.governor_context,'collect'),patch.object(d.governor_context,'plan'),patch.object(d.governor_context,'candidate',return_value=None), \
             patch.object(d.validation_followup,'plan'),patch.object(d.validation_followup,'safety_snapshot',return_value={'digest':'fixture'}),patch.object(d.validation_followup,'candidate',return_value={'job_id':'job'}), \
             patch.object(d.urllib.request,'urlopen',return_value=io.BytesIO(b'{"success":true}')) as send, \
             patch.dict(d.os.environ,{'HERMES_CF_ACCOUNT_ID':'account','HERMES_CF_INGEST_QUEUE_ID':'ingest','HERMES_EXTRACT_EVIDENCE':'false'},clear=True):
            result=d.tick({'dispatch_limit':1})
        self.assertEqual(result['state'],'DELIVERED_AWAITING_WORKER')
        self.assertEqual(sum('hermes_ops.lease_job' in sql for sql,args in cursor.calls),1)
        self.assertFalse(any('sum(attempt_count)' in sql for sql,args in cursor.calls))
        import json
        request=send.call_args.args[0]
        self.assertIn('/queues/ingest/messages',request.full_url)
        message=json.loads(request.data)['body']
        self.assertEqual(message['schemaVersion'],'hermes.validation-followup.v1')
        self.assertEqual(message['research_work_identity'],'work')
        self.assertEqual(len(message['attempt_token']),64)

    def test_resource_governor_prevents_even_followup_selection(self):
        d=self.load();cursor=Cursor({})
        @contextlib.contextmanager
        def connect():yield Connection(cursor)
        with patch.object(d,'connect_database',connect),patch.object(d,'settings',return_value={'enabled':True,'ready':True,'deployment':'release'}), \
             patch.object(d,'route_pending',return_value=0),patch.object(d,'recover_and_collect'),patch.object(d,'collect_late_successes',return_value=0),patch.object(d,'recover_immutable_raw_conflicts',return_value=0), \
             patch.object(d.producer_receipt_validation,'collect'),patch.object(d.producer_receipt_validation,'candidate') as producer_candidate, \
             patch.object(d.validation_receipt,'collect'),patch.object(d.validation_followup,'collect'), \
             patch.object(d.governor_context,'collect'),patch.object(d.governor_context,'plan'),patch.object(d.governor_context,'candidate',return_value=None), \
             patch.object(d.validation_followup,'plan'),patch.object(d.validation_followup,'candidate') as candidate, \
             patch.dict(d.os.environ,{},clear=True):
            self.assertEqual(d.tick({'dispatch_limit':0})['state'],'RESOURCE_GATED')
            producer_candidate.assert_not_called();candidate.assert_not_called()
        self.assertFalse(any('hermes_ops.lease_job' in sql for sql,args in cursor.calls))

    def test_producer_receipt_validation_uses_existing_lease_and_never_cloudflare_queue(self):
        d=self.load()
        job={'job_id':'job','job_type':'producer_receipt_validate','target_id':'receipt','research_need_id':'need',
             'dedupe_key':'work','payload':{'canonical_receipt_id':'receipt','capability_route':{'version':d.producer_receipt_validation.VERSION}}}
        cursor=Cursor(job)
        @contextlib.contextmanager
        def connect():yield Connection(cursor)
        with patch.object(d,'connect_database',connect), \
             patch.object(d,'settings',return_value={'enabled':False,'ready':False,'deployment':None,'budget':0}), \
             patch.object(d,'route_pending',return_value=0),patch.object(d,'recover_and_collect'),patch.object(d,'collect_late_successes',return_value=0),patch.object(d,'recover_immutable_raw_conflicts',return_value=0), \
             patch.object(d.producer_receipt_validation,'collect'), \
             patch.object(d.producer_receipt_validation,'candidate',return_value={'job_id':'job'}), \
             patch.object(d.producer_receipt_validation,'execute',return_value={'state':'LOCAL_VALIDATION_RECORDED_AWAITING_COLLECTION','job_id':'job'}) as execute, \
             patch.object(d.validation_receipt,'collect'),patch.object(d.validation_followup,'collect'), \
             patch.object(d.governor_context,'collect'),patch.object(d.governor_context,'plan'), \
             patch.object(d.validation_followup,'plan'),patch.dict(d.os.environ,{'HERMES_EXTRACT_EVIDENCE':'false'},clear=True), \
             patch.object(d.urllib.request,'urlopen') as send:
            result=d.tick({'dispatch_limit':1})
        self.assertEqual(result['state'],'LOCAL_VALIDATION_RECORDED_AWAITING_COLLECTION')
        self.assertEqual(sum('hermes_ops.lease_job' in sql for sql,args in cursor.calls),1)
        execute.assert_called_once()
        send.assert_not_called()
        self.assertEqual(len(job['leased_by']),64)

    def test_immutable_raw_conflict_reuses_same_job_only_after_new_deployment(self):
        d=self.load()
        item={'job_id':'same-job','research_need_id':'need','attempt_count':1,
              'worker_run_id':'failed-run','failed_deployment':'old','error_class':'worker_store_http_409',
              'payload':{'orchestration_authority':'hermes','execution_class':'PRODUCTION',
                         'capability_route':{'version':d.ROUTE_VERSION,'capability':d.QUARANTINE_CAPABILITY,
                                             'deployment_id':'old'}}}
        class RecoveryCursor:
            def __init__(self): self.calls=[]
            def execute(self,sql,args=()): self.calls.append((sql,args))
            def fetchall(self):
                return [item] if "w.error_class='worker_store_http_409'" in self.calls[-1][0] else []
        cursor=RecoveryCursor()
        self.assertEqual(d.recover_immutable_raw_conflicts(cursor,{'deployment':'new'}),1)
        updates=[x for x in cursor.calls if x[0].startswith("UPDATE public.jobs SET status='queued'")]
        self.assertEqual(len(updates),1)
        payload=__import__('json').loads(updates[0][1][0])
        checkpoint=__import__('json').loads(updates[0][1][1])
        self.assertEqual(payload['capability_route']['deployment_id'],'new')
        self.assertEqual(checkpoint['recovery'],'IMMUTABLE_RAW_REUSE_DEPLOYMENT_REFRESH')
        self.assertEqual(updates[0][1][-1],1)
        sql='\n'.join(query for query,args in cursor.calls)
        self.assertNotIn('attempt_count=0',sql)
        self.assertNotIn('INSERT INTO public.jobs',sql)


    def test_parser_failure_recovery_requires_new_deployment_and_same_immutable_input(self):
        d=self.load()
        digest='a'*64
        item={'job_id':'same-parser-job','research_need_id':'need','attempt_count':1,'max_attempts':2,
              'worker_run_id':'failed-parser-run','failed_deployment':'old','error_class':'parser_failure',
              'retrieval_id':'retrieval','content_hash':digest,
              'payload':{'orchestration_authority':'hermes','execution_class':'PRODUCTION',
                         'parent_job_id':'parent-job',
                         'capability_route':{'version':d.ROUTE_VERSION,'stage':'extraction',
                                             'capability':'authoritative_roster_extraction',
                                             'deployment_id':'old','source_id':'source',
                                             'input_retrieval_id':'retrieval','input_sha256':digest}}}
        class RecoveryCursor:
            def __init__(self): self.calls=[]
            def execute(self,sql,args=()): self.calls.append((sql,args))
            def fetchall(self):
                return [item] if "w.error_class='parser_failure'" in self.calls[-1][0] else []
        cursor=RecoveryCursor()
        self.assertEqual(d.recover_immutable_raw_conflicts(cursor,{'deployment':'new'}),1)
        updates=[x for x in cursor.calls if x[0].startswith("UPDATE public.jobs SET status='queued'")]
        self.assertEqual(len(updates),1)
        payload=__import__('json').loads(updates[0][1][0])
        checkpoint=__import__('json').loads(updates[0][1][1])
        self.assertEqual(payload['capability_route']['deployment_id'],'new')
        self.assertEqual(checkpoint['recovery'],'CHANGED_PARSER_DEPLOYMENT_REFRESH')
        self.assertEqual(checkpoint['input_retrieval_id'],'retrieval')
        self.assertEqual(checkpoint['input_sha256'],digest)
        self.assertEqual(updates[0][1][-2:],('retrieval',digest))
        sql='\n'.join(query for query,args in cursor.calls)
        self.assertIn("w.error_class='parser_failure'",sql)
        self.assertIn("content_hash",sql)
        self.assertIn("input_retrieval_id",sql)
        self.assertNotIn('INSERT INTO public.jobs',sql)

    def test_late_success_handoff_preserves_terminal_history_and_is_idempotent(self):
        d=self.load()
        metadata={'extraction_run_id':'run','retrieval_id':'retrieval','sha256':'a'*64,
                  'roster_units_extracted':19,'unresolved_attribution':True,
                  'publication_eligible':False}
        item={'job_id':'job','attempt_count':2,'max_attempts':2,'research_need_id':'need',
              'worker_run_id':'run','worker_metadata':metadata}
        class LateSuccessCursor:
            def __init__(self):
                self.calls=[]; self.queries=0
            def execute(self,sql,args=()):
                self.calls.append((sql,args))
            def fetchall(self):
                self.queries+=1
                return [item] if self.queries == 1 else []
            def fetchone(self):
                return {'job_id':'job'}
        cursor=LateSuccessCursor()
        with patch.object(d.authoritative_roster_discovery,'plan_downstream',
                          return_value={'state':'AUTHORITATIVE_ROSTER_DOWNSTREAM_PLANNED',
                                        'created':19,'seats_created':19,'seats_reused':0}) as planner:
            self.assertEqual(d.collect_late_successes(cursor),1)
            self.assertEqual(d.collect_late_successes(cursor),0)
        planner.assert_called_once_with(cursor,item,metadata)
        sql='\\n'.join(query for query,args in cursor.calls)
        self.assertIn("j.status='dead_letter'",sql)
        self.assertIn("w2.status='succeeded'",sql)
        self.assertIn("attempt_count=j.max_attempts",sql)
        self.assertIn('authoritative_roster_late_success_handoff',sql)
        self.assertNotIn("SET status='queued'",sql)
        self.assertNotIn('attempt_count=0',sql)

    def test_expired_success_is_completed_without_requeue(self):
        d=self.load()
        token='t'*64
        metadata={'attempt_token':token,'retrieval_id':'retrieval','sha256':'a'*64,
                  'extraction_run_id':'run','roster_units_extracted':19,
                  'unresolved_attribution':True,'publication_eligible':False}
        job={'job_id':'job','job_type':'contract_evidence_extract','leased_by':token,
             'expired':True,'research_need_id':'need','payload':{
                 'parent_job_id':'parent','capability_route':{
                     'capability':'authoritative_roster_extraction'}}}
        run={'worker_run_id':'run','status':'succeeded','metadata':metadata}
        class ExpiredSuccessCursor:
            def __init__(self):
                self.calls=[]; self.phase='jobs'; self.result=None
            def execute(self,sql,args=()):
                self.calls.append((sql,args))
                if "SELECT * FROM public.worker_runs" in sql:
                    self.result=run
                elif "FROM public.raw_retrievals" in sql:
                    self.result={'retrieval_id':'retrieval'}
                elif "SELECT count(*) AS count" in sql:
                    self.result={'count':19}
                elif "UPDATE public.jobs SET status='succeeded'" in sql:
                    self.result={'job_id':'job'}
                else:
                    self.result=None
            def fetchall(self):
                if self.phase == 'jobs':
                    self.phase='done'
                    return [job]
                return []
            def fetchone(self):
                result=self.result
                self.result=None
                return result
        cursor=ExpiredSuccessCursor()
        with patch.object(d.authoritative_roster_discovery,'plan_downstream',
                          return_value={'state':'AUTHORITATIVE_ROSTER_DOWNSTREAM_PLANNED',
                                        'created':19}) as planner:
            d.recover_and_collect(cursor)
        planner.assert_called_once()
        update_sql=[sql for sql,args in cursor.calls if "UPDATE public.jobs SET status='succeeded'" in sql][0]
        self.assertIn('lease_expires_at<=clock_timestamp()',update_sql)
        self.assertIn('AND %s)',update_sql)
        self.assertFalse(any("SET status='queued'" in sql for sql,args in cursor.calls))

    def test_subject_factory_uses_canonical_discovered_seat_baseline(self):
        source = (Path(__file__).resolve().parents[3] /
                  'services/hermes-prime/authoritative_roster_discovery.py').read_text()
        migration = (Path(__file__).resolve().parents[3] /
                     'supabase/migrations/20260922190000_authoritative_subject_factory_canonical_seat_baseline.sql').read_text()
        self.assertIn("'discovered',false", source)
        self.assertNotIn("'discovered_unreviewed'", source)
        self.assertIn("baseline_status = 'discovered'", migration)
        self.assertIn("research_contract_key = 'AUTHORITATIVE_ROSTER_DISCOVERY'", migration)
        self.assertIn("monitoring_active = false", migration)

    def test_subject_factory_uses_real_dict_cursor_need_id(self):
        source = (Path(__file__).resolve().parents[3] /
                  'services/hermes-prime/authoritative_roster_discovery.py').read_text()
        self.assertIn('need["need_id"]', source)
        self.assertNotIn('json.dumps(downstream_payload), need[0]', source)

if __name__=='__main__':unittest.main()
