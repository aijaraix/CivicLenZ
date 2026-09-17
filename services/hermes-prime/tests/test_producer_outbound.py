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
import tempfile

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

    def test_bridge_secret_uses_same_legacy_backtick_normalization_as_receiver(self):
        raw='`' + ('a'*64) + '`'
        self.assertEqual(outbound._normalize_bridge_secret(raw),'a'*64)
        self.assertEqual(outbound._normalize_bridge_secret('plain-secret'),'plain-secret')
        with patch.dict(os.environ,{'CIVICLENZ_HARVESTER_SHARED_SECRET':raw},clear=True):
            self.assertEqual(outbound._secret_from_credential(),'a'*64)

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

    def test_terminal_child_recovery_requires_new_nonterminal_producer_child(self):
        leased=self.leased()
        leased['checkpoint']={
            'producer_outbound_recovery':{
                'reason':'SAME_ATTEMPT_TERMINAL_CHILD_RECOVERY',
                'previous_producer_job_id':'job-producer-failed',
            }
        }
        base={'status':'SUCCESS','storage':'AUTHORITATIVE_PRODUCER_PERSISTENCE',
              'job':{'job_uuid':'job-producer-failed','status':'FAILED_PERMANENT',
                     'logical_work_key':'canonical:'+leased['dedupe_key'],
                     'checkpoint':{'canonical_assignment':{'canonical_job_id':leased['job_id'],
                                                           'research_scope':outbound.RESEARCH_SCOPE}}}}
        cfg={'ready':True,'secret':'test-secret','endpoint':'https://example.test/api/harvester/jobs'}
        rejected=outbound.deliver(leased,cfg,opener=lambda *_args,**_kwargs: FakeResponse({**base,'is_new_job':False}))
        self.assertEqual(rejected['state'],'PRODUCER_DELIVERY_UNCONFIRMED')
        self.assertEqual(rejected['producer_error_code'],'ACK_CONTRACT_MISMATCH')
        replacement={**base,'is_new_job':True,'job':{**base['job'],'job_uuid':'job-producer-replacement','status':'QUEUED'}}
        accepted=outbound.deliver(leased,cfg,opener=lambda *_args,**_kwargs: FakeResponse(replacement))
        self.assertEqual(accepted['state'],'PRODUCER_ASSIGNMENT_ACCEPTED')
        self.assertEqual(accepted['producer_job_id'],'job-producer-replacement')
        self.assertTrue(accepted['is_new_job'])

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
        self.assertIn("SUPPORTED_FL_DOS_CURRENTNESS_WORK_READY", source)
        self.assertIn("NOT (j.payload ? 'dispatch_blocker')", source)

    def test_queue_capacity_counts_unreconciled_assignments_after_lease_expiry(self):
        source = Path(outbound.__file__).read_text()
        self.assertIn("outstanding.status='leased'", source)
        self.assertIn("outstanding.job_id<>j.job_id", source)
        self.assertNotIn("active.lease_expires_at>clock_timestamp()", source)

    def test_recovery_is_same_attempt_bounded_and_receipt_fenced(self):
        source = Path(outbound.__file__).read_text()
        self.assertIn("j.status='leased' AND j.attempt_count=1", source)
        self.assertIn("j.lease_expires_at<=clock_timestamp()", source)
        self.assertIn("PRODUCER_DELIVERY_UNCONFIRMED", source)
        self.assertIn("PRODUCER_ASSIGNMENT_ACCEPTED", source)
        self.assertIn("HERMES_PRODUCER_OUTBOUND_TERMINAL_CHILD_RECOVERY", source)
        self.assertIn("SAME_ATTEMPT_TERMINAL_CHILD_RECOVERY", source)
        self.assertIn("recovery_limit > 6", source)
        self.assertIn("END < %s", source)
        self.assertIn("rn.origin='PRODUCER'", source)
        self.assertIn("lease_expires_at=clock_timestamp()+make_interval(secs=>300)", source)
        self.assertIn('"count": prior_count + 1', source)
        self.assertNotIn("attempt_count=attempt_count+1", source)

    def test_terminal_child_recovery_preserves_prior_child_lineage(self):
        row=self.leased()
        row.update({'status':'leased','lease_expires_at':'expired','checkpoint':{
            'producer_outbound':{'version':outbound.VERSION,'state':'PRODUCER_ASSIGNMENT_ACCEPTED',
                                 'producer_job_id':'job-producer-failed','producer_status':'QUEUED',
                                 'observed_at':'2026-09-16T22:18:08Z'},
        }})
        class Cursor:
            def __init__(self): self.step=0; self.recovery=None
            def execute(inner,sql,args=()):
                inner.step+=1
                if inner.step==2:
                    inner.recovery=json.loads(args[0])
            def fetchone(inner):
                if inner.step==1: return row
                if inner.step==2: return {**row,'checkpoint':{**row['checkpoint'],'producer_outbound_recovery':inner.recovery}}
        config={'ready':True,'budget':1,'exact_job_id':row['job_id'],'recovery_limit':1,
                'terminal_child_recovery':True}
        recovered=outbound.recover_unconfirmed(Cursor(),config)
        metadata=recovered['checkpoint']['producer_outbound_recovery']
        self.assertEqual(metadata['reason'],'SAME_ATTEMPT_TERMINAL_CHILD_RECOVERY')
        self.assertEqual(metadata['previous_delivery_state'],'PRODUCER_ASSIGNMENT_ACCEPTED')
        self.assertEqual(metadata['previous_producer_job_id'],'job-producer-failed')
        self.assertEqual(metadata['previous_producer_status'],'QUEUED')
        self.assertEqual(metadata['previous_observed_at'],'2026-09-16T22:18:08Z')
        self.assertEqual(metadata['attempt_count'],1)

    def test_completed_receipt_validation_reconciles_original_contract_need(self):
        class Cursor:
            def __init__(self):
                self.rows=[]; self.one=None; self.calls=[]
            def execute(self,sql,args=()):
                self.calls.append((sql,args)); self.one=None
                if "j.status='succeeded'" in sql and "PRODUCER_RECEIPT_ACCEPTED_PENDING_CANONICAL_VALIDATION" in sql:
                    self.rows=[{
                        'job_id':'parent-job','research_need_id':'parent-need',
                        'receipt_need_id':'receipt-need','receipt_id':'receipt-id',
                        'receipt_need_state':'BLOCKED','receipt_need_reason':'PRODUCER_RECEIPT_VALIDATED_NEEDS_MORE_EVIDENCE',
                        'receipt_basis':{'producer_receipt_validation':{'validation_disposition':'NEEDS_MORE_EVIDENCE'}},
                        'validation_job_id':'validation-job','validation_job_status':'succeeded',
                        'validation_checkpoint':{'validation_evaluation_id':'evaluation-id','validation_disposition':'NEEDS_MORE_EVIDENCE'},
                    }]
                elif "UPDATE public.jobs" in sql and "producer_validation_job_id" in sql:
                    self.one={'job_id':'parent-job'}
                elif "UPDATE hermes_ops.research_needs" in sql and "PRODUCER_RECEIPT_ACCEPTED_PENDING_CANONICAL_VALIDATION" in sql:
                    self.one={'need_id':'parent-need'}
            def fetchall(self):
                rows=self.rows; self.rows=[]; return rows
            def fetchone(self):
                one=self.one; self.one=None; return one
        cursor=Cursor()
        self.assertEqual(outbound.reconcile_validated_parent(cursor),1)
        writes=[(sql,args) for sql,args in cursor.calls if sql.lstrip().startswith('UPDATE')]
        self.assertTrue(any("producer_validation_disposition" in args[0] for sql,args in writes if sql.lstrip().startswith('UPDATE public.jobs')))
        need_writes=[(sql,args) for sql,args in writes if sql.lstrip().startswith('UPDATE hermes_ops.research_needs')]
        self.assertEqual(len(need_writes),1)
        self.assertEqual(need_writes[0][1][0],'PRODUCER_RECEIPT_VALIDATED_NEEDS_MORE_EVIDENCE')
        self.assertIn('NEEDS_MORE_EVIDENCE',need_writes[0][1][1])

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
            self.assertFalse(config['terminal_child_recovery'])

    def test_terminal_child_recovery_requires_explicit_gate(self):
        env={'HERMES_PRODUCER_OUTBOUND':'true','HERMES_PRODUCER_OUTBOUND_BUDGET':'1',
             'HERMES_PRODUCER_OUTBOUND_JOB_ID':str(uuid.uuid4()),
             'HERMES_PRODUCER_ENDPOINT':'https://civiclenz.ai.studio/api/harvester/jobs',
             'CIVICLENZ_HARVESTER_SHARED_SECRET':'x','HERMES_PRODUCER_AUTH_MODE':'hmac',
             'HERMES_PRODUCER_OUTBOUND_TERMINAL_CHILD_RECOVERY':'true'}
        with patch.dict(os.environ,env,clear=True):
            config=outbound.settings()
            self.assertTrue(config['ready'])
            self.assertTrue(config['terminal_child_recovery'])

    def test_recovery_limit_is_explicit_and_clamped(self):
        env={'HERMES_PRODUCER_OUTBOUND':'true','HERMES_PRODUCER_OUTBOUND_BUDGET':'1',
             'HERMES_PRODUCER_OUTBOUND_JOB_ID':str(uuid.uuid4()),
             'HERMES_PRODUCER_ENDPOINT':'https://civiclenz.ai.studio/api/harvester/jobs',
             'CIVICLENZ_HARVESTER_SHARED_SECRET':'x','HERMES_PRODUCER_OUTBOUND_RECOVERY_LIMIT':'99','HERMES_PRODUCER_AUTH_MODE':'token'}
        with patch.dict(os.environ,env,clear=True):
            config=outbound.settings()
            self.assertTrue(config['ready'])
            self.assertEqual(config['recovery_limit'],6)
            self.assertEqual(config['auth_mode'],'token')

    def test_bounded_supported_queue_is_ready_without_manual_job_rotation(self):
        env={'HERMES_PRODUCER_OUTBOUND':'true','HERMES_PRODUCER_OUTBOUND_BUDGET':'1',
             'HERMES_PRODUCER_OUTBOUND_SELECTION':'bounded_supported_queue',
             'HERMES_PRODUCER_ENDPOINT':'https://civiclenz.ai.studio/api/harvester/jobs',
             'CIVICLENZ_HARVESTER_SHARED_SECRET':'x','HERMES_PRODUCER_AUTH_MODE':'hmac'}
        with patch.dict(os.environ,env,clear=True):
            config=outbound.settings()
            self.assertTrue(config['ready'])
            self.assertTrue(config['queue_selection'])
            self.assertIsNone(config['exact_job_id'])

    def test_machine_authorization_is_exact_single_use_create_only_and_rearmable(self):
        leased=self.leased()
        with tempfile.TemporaryDirectory() as directory:
            cfg={'authorization_directory':Path(directory),'authorization_ttl_seconds':3600}
            first=outbound.arm_return_authorization(leased,cfg)
            self.assertEqual(first['allowed_job_id'],leased['job_id'])
            self.assertEqual(first['allowed_research_work_identity'],leased['dedupe_key'])
            self.assertEqual(first['maximum_uses'],1)
            self.assertFalse(first['publication_allowed'])
            self.assertEqual(outbound.arm_return_authorization(leased,cfg)['authorization_id'],first['authorization_id'])
            active=Path(directory)/(leased['job_id']+'.json')
            expired=json.loads(active.read_text())
            expired['expires_at']='2000-01-01T00:00:00Z'
            active.write_text(json.dumps(expired)+'\n')
            second=outbound.arm_return_authorization(leased,cfg)
            self.assertNotEqual(second['authorization_id'],first['authorization_id'])
            self.assertTrue((Path(directory)/'history'/f"{leased['job_id']}.{first['authorization_id']}.json").exists())

    def test_machine_authorization_rejects_identity_drift(self):
        leased=self.leased()
        with tempfile.TemporaryDirectory() as directory:
            cfg={'authorization_directory':Path(directory),'authorization_ttl_seconds':3600}
            outbound.arm_return_authorization(leased,cfg)
            drift={**leased,'dedupe_key':'work:v1:'+'b'*64}
            with self.assertRaises(ValueError):
                outbound.arm_return_authorization(drift,cfg)

if __name__=='__main__': unittest.main()
