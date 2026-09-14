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
    def test_followup_uses_existing_atomic_lease_and_only_ingest_queue(self):
        d=self.load()
        job={'job_id':'job','job_type':'contract_scope_research','target_id':'seat','research_need_id':'need',
             'dedupe_key':'work','payload':{'validation_followup':{'receipt_id':'receipt'},'capability_route':{'version':d.validation_followup.VERSION}}}
        cursor=Cursor(job)
        @contextlib.contextmanager
        def connect():yield Connection(cursor)
        credential=types.SimpleNamespace(read_text=lambda:'fixture-not-a-credential')
        with patch.object(d,'connect_database',connect),patch.object(d,'settings',return_value={'enabled':True,'ready':True,'deployment':'old','budget':5,'credential':credential}), \
             patch.object(d,'route_pending',return_value=0),patch.object(d,'recover_and_collect'), \
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
             patch.object(d,'route_pending',return_value=0),patch.object(d,'recover_and_collect'), \
             patch.object(d.validation_receipt,'collect'),patch.object(d.validation_followup,'collect'), \
             patch.object(d.governor_context,'collect'),patch.object(d.governor_context,'plan'),patch.object(d.governor_context,'candidate',return_value=None), \
             patch.object(d.validation_followup,'plan'),patch.object(d.validation_followup,'candidate') as candidate, \
             patch.dict(d.os.environ,{},clear=True):
            self.assertEqual(d.tick({'dispatch_limit':0})['state'],'RESOURCE_GATED')
            candidate.assert_not_called()
        self.assertFalse(any('hermes_ops.lease_job' in sql for sql,args in cursor.calls))

if __name__=='__main__':unittest.main()
