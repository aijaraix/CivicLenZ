import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import governor_context as g
from test_validation_followup import Cursor,row,SOURCE,PARENT,RECEIPT
ENV={'HERMES_GOVERNOR_CONTEXT':'true','HERMES_GOVERNOR_CONTEXT_RECEIPT_ID':RECEIPT,
     'HERMES_GOVERNOR_CONTEXT_BUDGET':'1','HERMES_GOVERNOR_CONTEXT_WORKER_DEPLOYMENT':'release'}
class GovernorContextTests(unittest.TestCase):
 def test_default_off_and_lifetime_budget_is_separate(self):
  with patch.dict(os.environ,{},clear=True):self.assertIsNone(g.candidate(Cursor([])))
  with patch.dict(os.environ,ENV,clear=True):
   c=Cursor([{'attempts':1}]);self.assertIsNone(g.candidate(c))
   self.assertEqual(c.calls[0][1],('governor-context-initial-v1',))
  with patch.dict(os.environ,{**ENV,'HERMES_GOVERNOR_CONTEXT_BUDGET':'99'},clear=True):self.assertEqual(g.settings()['budget'],5)
 def test_routes_exact_scopes_without_satisfying_review(self):
  for scope in ('identity','person','occupancy','biography','current_occupant'):
   item=row(scope)
   if scope in ('person','occupancy'):item['field']['verification_requirement']='review'
   result=g.resolve_followup(**item,sources=[SOURCE],receipt=PARENT,deployment='release',ready=True)
   self.assertEqual(bool(result),scope in g.SCOPES)
   if result:self.assertEqual(result['retrieval_url'],'https://www.flgov.com/eog/leadership')
 def test_plan_reuses_only_selected_need_and_adds_proven_parent_dependency(self):
  c=Cursor([dict(PARENT),[{'job_id':'proven-followup'}],[row(s) for s in g.SCOPES],[SOURCE]])
  with patch.dict(os.environ,ENV,clear=True):g.plan(c,{'ready':True})
  writes=[(sql,args) for sql,args in c.calls if sql.startswith('UPDATE public.jobs')]
  self.assertEqual(len(writes),1);self.assertEqual(writes[0][1][1],'job-identity')
  sql='\n'.join(q for q,args in c.calls)
  self.assertNotIn('INSERT INTO public.jobs',sql);self.assertNotIn('INSERT INTO hermes_ops.research_needs',sql)
  self.assertEqual(sum('INSERT INTO hermes_ops.job_dependencies' in q for q,args in c.calls),2)
  self.assertIn('governor_context_dependencies',c.calls[-1][0])
 def test_no_proven_parent_and_unrelated_hold_do_not_route(self):
  with patch.dict(os.environ,ENV,clear=True):
   c=Cursor([dict(PARENT),[]]);g.plan(c,{'ready':True})
   self.assertFalse(any(q.startswith(('INSERT','UPDATE')) for q,args in c.calls))
   held=row('identity');held['need']['reason']='SECURITY_HOLD'
   c=Cursor([dict(PARENT),[{'job_id':'parent'}],[held],[SOURCE]]);g.plan(c,{'ready':True})
   self.assertFalse(any(q.startswith(('INSERT','UPDATE')) for q,args in c.calls))
 def test_dispatcher_uses_atomic_lease_and_distinct_envelope(self):
  import contextlib,io,json,types
  from test_followup_dispatch import DispatcherTests,Cursor as LeaseCursor,Connection
  d=DispatcherTests().load()
  job={'job_id':'job','job_type':'contract_scope_research','target_id':'seat','research_need_id':'need',
    'dedupe_key':'work','payload':{'validation_followup':{'receipt_id':'receipt'},'capability_route':{'version':g.VERSION}}}
  c=LeaseCursor(job)
  @contextlib.contextmanager
  def connect():yield Connection(c)
  with patch.object(d,'connect_database',connect),patch.object(d,'settings',return_value={'enabled':True,'ready':True,'deployment':'old','budget':5,'credential':types.SimpleNamespace(read_text=lambda:'fixture')}), \
       patch.object(d,'route_pending'),patch.object(d,'recover_and_collect'), \
       patch.object(d.producer_receipt_validation,'collect'),patch.object(d.producer_receipt_validation,'candidate',return_value=None), \
       patch.object(d.validation_receipt,'collect'),patch.object(d.validation_followup,'collect'),patch.object(d.validation_followup,'plan'),patch.object(d.governor_context,'collect'), \
       patch.object(d.governor_context,'plan'),patch.object(d.governor_context,'candidate',return_value={'job_id':'job'}), \
       patch.object(d.validation_followup,'safety_snapshot',return_value={'digest':'fixture'}), \
       patch.object(d.urllib.request,'urlopen',return_value=io.BytesIO(b'{"success":true}')) as send, \
       patch.dict(os.environ,{'HERMES_CF_ACCOUNT_ID':'account','HERMES_CF_INGEST_QUEUE_ID':'ingest'},clear=True):
   self.assertEqual(d.tick({'dispatch_limit':1})['state'],'DELIVERED_AWAITING_WORKER')
  self.assertEqual(sum('hermes_ops.lease_job' in q for q,a in c.calls),1)
  self.assertEqual(json.loads(send.call_args.args[0].data)['body']['schemaVersion'],'hermes.governor-context.v1')
 def test_no_worker_dead_letter_requeues_same_job_without_resetting_attempt(self):
  retry={'job_id':'job-identity','research_need_id':'need-identity','status':'dead_letter',
    'attempt_count':1,'max_attempts':5,'error_class':'GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED','error_message':None,
    'payload':{'validation_followup':{'allowance':g.ALLOWANCE,'receipt_id':RECEIPT},
      'capability_route':{'version':g.VERSION,'deployment_id':'superseded'}}}
  c=Cursor([retry,None,[]])
  with patch.dict(os.environ,{**ENV,'HERMES_GOVERNOR_CONTEXT_BUDGET':'2','HERMES_GOVERNOR_CONTEXT_WORKER_DEPLOYMENT':'current'},clear=True):
   g.collect(c)
  job_update=[x for x in c.calls if x[0].startswith("UPDATE public.jobs SET status='queued'")]
  self.assertEqual(len(job_update),1)
  payload=__import__('json').loads(job_update[0][1][0])
  self.assertEqual(payload['capability_route']['deployment_id'],'current')
  self.assertEqual(job_update[0][1][-1],1)
  sql='\n'.join(q for q,a in c.calls)
  self.assertNotIn('attempt_count=0',sql)
 def test_parser_fix_requeues_same_failed_job_only_after_deployment_changes(self):
  retry={'job_id':'job-identity','research_need_id':'need-identity','status':'dead_letter',
    'attempt_count':3,'max_attempts':5,'error_class':'GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED','error_message':None,
    'worker_run_id':'failed-run','failed_deployment':'old-parser','worker_error_class':'governor_card_structure_unproven',
    'worker_error_message':'structure unproven',
    'payload':{'validation_followup':{'allowance':g.ALLOWANCE,'receipt_id':RECEIPT},
      'capability_route':{'version':g.VERSION,'deployment_id':'old-parser'}}}
  # First recovery query is specifically no-worker; the parser repair path is second.
  c=Cursor([None,retry,[]])
  with patch.dict(os.environ,{**ENV,'HERMES_GOVERNOR_CONTEXT_BUDGET':'4','HERMES_GOVERNOR_CONTEXT_WORKER_DEPLOYMENT':'new-parser'},clear=True):
   g.collect(c)
  job_update=[x for x in c.calls if x[0].startswith("UPDATE public.jobs SET status='queued'")]
  self.assertEqual(len(job_update),1)
  payload=__import__('json').loads(job_update[0][1][0])
  self.assertEqual(payload['capability_route']['deployment_id'],'new-parser')
  self.assertEqual(job_update[0][1][-1],3)
  recovery=__import__('json').loads(job_update[0][1][1])
  self.assertEqual(recovery['worker_run_id'],'failed-run')
  self.assertEqual(recovery['recovery'],'PARSER_DEPLOYMENT_REFRESH')
  self.assertFalse(any('attempt_count=0' in q or q.startswith('INSERT INTO public.jobs') for q,a in c.calls))
 def test_storage_conflict_is_recoverable_only_with_a_repaired_deployment(self):
  retry={'job_id':'job-identity','research_need_id':'need-identity','status':'dead_letter',
    'attempt_count':4,'max_attempts':5,'error_class':'GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED','error_message':None,
    'worker_run_id':'failed-run','failed_deployment':'old-worker','worker_error_class':'worker_store_http_409',
    'worker_error_message':'immutable raw duplicate',
    'payload':{'validation_followup':{'allowance':g.ALLOWANCE,'receipt_id':RECEIPT},
      'capability_route':{'version':g.VERSION,'deployment_id':'old-worker'}}}
  c=Cursor([None,retry,[]])
  with patch.dict(os.environ,{**ENV,'HERMES_GOVERNOR_CONTEXT_BUDGET':'5','HERMES_GOVERNOR_CONTEXT_WORKER_DEPLOYMENT':'raw-reuse-worker'},clear=True):
   g.collect(c)
  update=[x for x in c.calls if x[0].startswith("UPDATE public.jobs SET status='queued'")]
  self.assertEqual(len(update),1);self.assertEqual(update[0][1][-1],4)
  self.assertEqual(__import__('json').loads(update[0][1][1])['worker_error_class'],'worker_store_http_409')
 def test_expired_final_attempt_with_existing_success_is_acknowledged_not_retried(self):
  job={'job_id':'exhausted-governor','target_id':'seat','research_need_id':'need-identity','dedupe_key':'work-identity',
    'status':'dead_letter','leased_by':None,'acknowledgement_attempt_token':'attempt-5-token','expired':True,'postlease_ack':True,
    'attempt_count':5,'max_attempts':5,'error_class':'GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED',
    'checkpoint':{'followup_safety_before':{'digest':'same'}},
    'payload':{'validation_followup':{'allowance':g.ALLOWANCE,'receipt_id':RECEIPT},
      'capability_route':{'deployment_id':'release','source_id':'source','retrieval_url':'url'}}}
  run={'status':'succeeded','worker_run_id':'attempt-5-run',
    'metadata':{'validation_run_id':'attempt-5-validation','raw_retrieval_reused':True}}
  artifact={'retrieved_at':'2026-09-18T00:00:00Z',
    'result_summary':{'display_value':'Unresolved context','retrieval_id':'raw','evidence_id':'pending-evidence'}}
  c=Cursor([None,None,[job],run,artifact,[],[],{'job_id':'exhausted-governor'}])
  with patch.dict(os.environ,ENV,clear=True), patch.object(g,'safety_snapshot',return_value={'digest':'same'}):
   g.collect(c)
  updates=[(sql,args) for sql,args in c.calls if sql.startswith('UPDATE public.jobs')]
  self.assertEqual(len(updates),1)
  sql,args=updates[0]
  self.assertIn("status='dead_letter'",sql)
  self.assertIn('attempt_count=max_attempts',sql)
  self.assertNotIn("status='queued'",sql)
  self.assertNotIn('attempt_count=',sql.replace('attempt_count=max_attempts',''))
  result=__import__('json').loads(args[0])
  self.assertEqual(result['worker_run_id'],'attempt-5-run')
  self.assertEqual(result['validation_run_id'],'attempt-5-validation')
  self.assertEqual(result['decision'],'NEEDS_FURTHER_VALIDATION')
  worker_query=[args for query,args in c.calls if 'FROM public.worker_runs' in query][-1]
  self.assertEqual(worker_query[1],'attempt-5-token')
  artifact_query=[(query,args) for query,args in c.calls if 'FROM public.validation_runs v' in query][-1]
  self.assertIn("OR %s",artifact_query[0])
  self.assertIn(True,artifact_query[1])
