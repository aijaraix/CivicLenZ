import hashlib
import hmac
import json
import io
import os
import sys
from pathlib import Path
import unittest
from unittest.mock import patch
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import producer_outbound as outbound


class FakeResponse:
    status = 201
    def __init__(self, data): self.data = data
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self, *_): return json.dumps(self.data).encode()


class ProducerOutboundTests(unittest.TestCase):
    def leased(self):
        job=str(uuid.uuid4()); need=str(uuid.uuid4()); work='work:v1:'+'a'*64
        return {'job_id':job,'research_need_id':need,'dedupe_key':work,'attempt_count':1,'leased_by':'lease-token'}

    def test_assignment_is_exact_bounded_contract(self):
        leased=self.leased(); a=outbound.build_assignment(leased)
        self.assertEqual(a['contract_version'],'HERMES_RESEARCH_JOB_V1')
        self.assertEqual(a['job_id'],leased['job_id'])
        self.assertEqual(a['research_work_identity']['work_key'],leased['dedupe_key'])
        self.assertEqual(a['research_scope'],'FL_DOS_CANDIDATE_FILINGS')
        self.assertEqual(a['source_constraints'],['dos.elections.myflorida.com'])
        self.assertEqual(a['attempt'],1)
        self.assertNotIn('seat_key',a)

    def test_hmac_matches_compact_body(self):
        a=outbound.build_assignment(self.leased())
        body, headers=outbound._body_and_headers(a,'test-secret',now=1234567890)
        expected=hmac.new(b'test-secret',b'1234567890.'+body,hashlib.sha256).hexdigest()
        self.assertEqual(headers['x-civiclenz-signature'],'sha256='+expected)
        self.assertEqual(body,json.dumps(a,separators=(',',':')).encode())

    def test_token_auth_mode_uses_supported_secret_header_without_hmac(self):
        a=outbound.build_assignment(self.leased())
        body,headers=outbound._body_and_headers(a,'test-secret',auth_mode='token')
        self.assertEqual(headers['x-harvester-secret'],'test-secret')
        self.assertNotIn('x-civiclenz-signature',headers)
        self.assertNotIn('x-civiclenz-timestamp',headers)
        self.assertEqual(body,json.dumps(a,separators=(',',':')).encode())

    def test_http_rejection_captures_only_bounded_safe_metadata(self):
        leased=self.leased()
        cfg={'ready':True,'secret':'test-secret','endpoint':'https://example.test/api/harvester/jobs','auth_mode':'token'}
        def opener(request,timeout=0):
            body=json.dumps({'status':'ERROR','error_code':'RESEARCH_SCOPE_REJECTED','message':'scope rejected'}).encode()
            raise __import__('urllib').error.HTTPError(request.full_url,400,'Bad Request',{},io.BytesIO(body))
        result=outbound.deliver(leased,cfg,opener=opener)
        self.assertEqual(result['state'],'PRODUCER_DELIVERY_UNCONFIRMED')
        self.assertEqual(result['http_status'],400)
        self.assertEqual(result['producer_error_code'],'RESEARCH_SCOPE_REJECTED')
        self.assertEqual(result['producer_error_message'],'scope rejected')
        self.assertNotIn('secret',result)

    def test_delivery_requires_durable_producer_ack(self):
        leased=self.leased(); a=outbound.build_assignment(leased)
        ack={'status':'SUCCESS','storage':'AUTHORITATIVE_PRODUCER_PERSISTENCE','is_new_job':True,
             'job':{'job_uuid':'job-producer-1','status':'QUEUED','logical_work_key':'canonical:'+leased['dedupe_key'],
                    'checkpoint':{'canonical_assignment':{'canonical_job_id':leased['job_id'],'research_scope':outbound.RESEARCH_SCOPE}}}}
        cfg={'ready':True,'secret':'test-secret','endpoint':'https://example.test/api/harvester/jobs'}
        def opener(request,timeout=0):
            self.assertEqual(request.full_url,cfg['endpoint'])
            return FakeResponse(ack)
        r=outbound.deliver(leased,cfg,opener=opener)
        self.assertEqual(r['state'],'PRODUCER_ASSIGNMENT_ACCEPTED')
        self.assertEqual(r['producer_job_id'],'job-producer-1')

    def test_activation_is_exact_blocker_and_target_scoped(self):
        source = Path(outbound.__file__).read_text()
        self.assertIn("j.job_id=%s", source)
        self.assertIn("j.attempt_count=0", source)
        self.assertIn("CAPABILITY_NOT_IMPLEMENTED: contract scope requirements", source)
        self.assertIn("n.scope_key='election_history'", source)
        self.assertIn("c.contract_key='STATE_GOVERNOR'", source)
        self.assertIn("f.source_priority->>'policy'='florida-election-calendar'", source)
        self.assertIn("s.seat_key=%s", source)
        self.assertIn("jur.jurisdiction_key=%s", source)
        self.assertIn("PRODUCER_OUTBOUND_ROUTE_READY", source)

    def test_recovery_is_same_attempt_bounded_and_receipt_fenced(self):
        source = Path(outbound.__file__).read_text()
        self.assertIn("j.status='leased' AND j.attempt_count=1", source)
        self.assertIn("j.lease_expires_at<=clock_timestamp()", source)
        self.assertIn("PRODUCER_DELIVERY_UNCONFIRMED", source)
        self.assertIn("recovery_limit > 5", source)
        self.assertIn("END < %s", source)
        self.assertIn("rn.origin='PRODUCER'", source)
        self.assertIn("lease_expires_at=clock_timestamp()+make_interval(secs=>300)", source)
        self.assertIn('"count": prior_count + 1', source)
        self.assertNotIn("attempt_count=attempt_count+1", source)

    def test_first_attempt_only(self):
        leased=self.leased(); leased['attempt_count']=2
        with self.assertRaises(ValueError): outbound.build_assignment(leased)

    def test_settings_fail_closed_without_exact_gate(self):
        env={'HERMES_PRODUCER_OUTBOUND':'true','HERMES_PRODUCER_OUTBOUND_BUDGET':'1',
             'HERMES_PRODUCER_ENDPOINT':'https://civiclenz.ai.studio/api/harvester/jobs',
             'CIVICLENZ_HARVESTER_SHARED_SECRET':'x'}
        with patch.dict(os.environ,env,clear=True):
            config=outbound.settings()
            self.assertFalse(config['ready'])
            self.assertEqual(config['recovery_limit'],1)

    def test_recovery_limit_is_explicit_and_clamped(self):
        env={'HERMES_PRODUCER_OUTBOUND':'true','HERMES_PRODUCER_OUTBOUND_BUDGET':'1',
             'HERMES_PRODUCER_OUTBOUND_JOB_ID':str(uuid.uuid4()),
             'HERMES_PRODUCER_ENDPOINT':'https://civiclenz.ai.studio/api/harvester/jobs',
             'CIVICLENZ_HARVESTER_SHARED_SECRET':'x','HERMES_PRODUCER_OUTBOUND_RECOVERY_LIMIT':'99','HERMES_PRODUCER_AUTH_MODE':'token'}
        with patch.dict(os.environ,env,clear=True):
            config=outbound.settings()
            self.assertTrue(config['ready'])
            self.assertEqual(config['recovery_limit'],5)
            self.assertEqual(config['auth_mode'],'token')

if __name__=='__main__': unittest.main()
