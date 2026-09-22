import json
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from extraction_handoff import child_identity, plan_exhausted_extraction_recovery, recovery_identity


class RecoveryCursor:
 def __init__(self, item):
  self.item=item; self.calls=[]; self.result=None; self.scanned=False; self.inserted=False
 def execute(self,sql,args=()):
  self.calls.append((sql,args))
  if 'INSERT INTO public.jobs' in sql:
   self.result=None if self.inserted else {'job_id':'replacement-job'}
   self.inserted=True
  else:
   self.result=None
 def fetchall(self):
  if "w.error_class='parser_failure'" in self.calls[-1][0] and not self.scanned:
   self.scanned=True
   return [self.item]
  return []
 def fetchone(self):
  result=self.result; self.result=None; return result


class ChildIdentityTests(unittest.TestCase):
 def test_stable_stage_identity_preserves_distinct_work(self):
  first=child_identity('work:v1:parent','retrieval','extraction')
  self.assertEqual(first,child_identity('work:v1:parent','retrieval','extraction'))
  for args in [('work:v1:other','retrieval','extraction'),('work:v1:parent','other','extraction'),('work:v1:parent','retrieval','canonical_validation')]:
   self.assertNotEqual(first,child_identity(*args))

 def test_exhausted_parser_generation_is_new_bounded_work_and_idempotent(self):
  digest='a'*64
  item={'job_id':'exhausted-job','research_need_id':'need','attempt_count':2,'max_attempts':2,
        'target_type':'seat','target_id':'seat','seat_id':'seat','priority':16,
        'dedupe_key':'work:v1:exhausted','parent_work':'work:v1:parent',
        'retrieval_id':'retrieval','content_hash':digest,
        'payload':{'orchestration_authority':'hermes','execution_class':'PRODUCTION',
                   'research_work_identity':'work:v1:exhausted',
                   'parent_research_work_identity':'work:v1:parent','parent_job_id':'parent-job',
                   'capability_route':{'version':'hermes-evidence-v1','stage':'extraction',
                                       'source_id':'source','input_retrieval_id':'retrieval',
                                       'input_sha256':digest,'deployment_id':'old'}}}
  cursor=RecoveryCursor(item)
  config={'deployment':'new','ready':True}
  self.assertEqual(plan_exhausted_extraction_recovery(cursor,config),1)
  insert=[x for x in cursor.calls if 'INSERT INTO public.jobs' in x[0]][0]
  payload=json.loads(insert[1][5])
  self.assertEqual(payload['supersedes_job_id'],'exhausted-job')
  self.assertEqual(payload['supersedes_research_work_identity'],'work:v1:exhausted')
  self.assertEqual(payload['recovery_reason'],'CHANGED_PARSER_IMPLEMENTATION')
  self.assertEqual(payload['recovery_generation'],2)
  self.assertEqual(payload['recovery_deployment'],'new')
  self.assertEqual(payload['input_retrieval_id'],'retrieval')
  self.assertEqual(payload['input_sha256'],digest)
  self.assertEqual(payload['capability_route']['deployment_id'],'new')
  self.assertEqual(payload['research_work_identity'],insert[1][4])
  self.assertEqual(insert[1][6],'need')
  sql='\n'.join(sql for sql,_ in cursor.calls)
  self.assertIn("j.status='dead_letter'",sql)
  self.assertIn('j.attempt_count=j.max_attempts',sql)
  self.assertNotIn("UPDATE public.jobs SET status='queued'",sql)
  self.assertEqual(plan_exhausted_extraction_recovery(cursor,config),0)
  self.assertEqual(len([x for x in cursor.calls if 'INSERT INTO public.jobs' in x[0]]),1)

 def test_recovery_identity_requires_prior_job_and_deployment(self):
  first=recovery_identity('parent','retrieval','old-job','new')
  self.assertNotEqual(first,child_identity('parent','retrieval','extraction'))
  self.assertNotEqual(first,recovery_identity('parent','retrieval','old-job','other'))


if __name__=='__main__': unittest.main()
