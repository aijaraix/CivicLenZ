"""UNIT/FIXTURE tests of routing, budgets, acknowledgement and telemetry.

Cursor fixtures exercise Python branches, not PostgreSQL RLS/lease proof.
Production execution and SQL integration remain supervisor acceptance gates.
"""
import copy
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import validation_followup as f
import validation_telemetry as telemetry
import observer

RECEIPT = '78963717-dcaa-588f-b201-99c3ea65e066'
ENV = {'HERMES_VALIDATION_FOLLOWUP': 'true', 'HERMES_VALIDATION_FOLLOWUP_RECEIPT_ID': RECEIPT,
       'HERMES_VALIDATION_FOLLOWUP_BUDGET': '1', 'HERMES_VALIDATION_FOLLOWUP_WORKER_DEPLOYMENT': 'release'}

class Cursor:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []
    def execute(self, sql, params=()):
        self.calls.append((sql, params))
    def fetchone(self):
        return self.responses.pop(0)
    def fetchall(self):
        return self.responses.pop(0)


def row(scope):
    n = dict(need_id='need-'+scope, target_id='seat', target_type='seat', contract_id='contract', contract_version='1',
             scope_key=scope, execution_class='PRODUCTION', origin='CONTRACT_GAP', state='BLOCKED',
             reason='CAPABILITY_NOT_IMPLEMENTED: contract scope requirements')
    j = dict(job_id='job-'+scope, job_type='contract_scope_research', research_need_id=n['need_id'], target_id='seat',
             target_type='seat', dedupe_key='work-'+scope, payload=dict(orchestration_authority='hermes',
             execution_class='PRODUCTION', research_work_identity='work-'+scope, scope_key=scope,
             contract_id='contract', contract_version='1', dispatch_blocker='CAPABILITY_NOT_IMPLEMENTED'))
    field = dict(verification_requirement='official_source', sensitivity_rule='publication_eligible_claims_only',
                 source_priority={'policy': 'florida-governor-official'})
    return dict(job=j, need=n, field=field)

SOURCE = dict(source_id='source',source_key='florida-governor-official',source_url='https://www.flgov.com/',
              active=True,authority_tier='TIER_1_PRIMARY_OFFICIAL')
PARENT = dict(subject_id='seat',contract_id='contract',contract_version='1',receipt_job_id='receipt-job',
              evidence_need_id='evidence-need',result_summary={'claim_id':'claim','evidence_id':'evidence'})

class FollowupTests(unittest.TestCase):
    def test_disabled_default_invalid_and_clamped_allowance(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(f.settings()['enabled']); self.assertEqual(f.settings()['budget'],0)
        for value, expected in [('999',1),('-1',0),('invalid',0)]:
            with patch.dict(os.environ, {**ENV,'HERMES_VALIDATION_FOLLOWUP_BUDGET':value}, clear=True):
                self.assertEqual(f.settings()['budget'],expected)
        with patch.dict(os.environ, {**ENV,'HERMES_VALIDATION_FOLLOWUP_RECEIPT_ID':'wrong'}, clear=True):
            self.assertIsNone(f.candidate(Cursor([])))

    def test_exhaustion_survives_reenable_and_different_receipt(self):
        for receipt in [RECEIPT,'00000000-0000-4000-8000-000000000001']:
            with patch.dict(os.environ,{**ENV,'HERMES_VALIDATION_FOLLOWUP_RECEIPT_ID':receipt},clear=True):
                cursor=Cursor([{'attempts':1}]);self.assertIsNone(f.candidate(cursor))
                self.assertEqual(cursor.calls[0][1],(f.ALLOWANCE,))
                self.assertEqual(len(cursor.calls),1)

    def test_only_supported_scope_context_and_authority_resolve(self):
        for scope in f.SCOPES+('biography',):
            item=row(scope)
            route=f.resolve_followup(**item,sources=[SOURCE],receipt=PARENT,deployment='release',ready=True)
            self.assertEqual(bool(route),scope=='current_occupant')
        for mutate in [lambda x:x['job']['payload'].update(execution_class='TEST'),
                       lambda x:x['job']['payload'].update(research_work_identity='wrong'),
                       lambda x:x['need'].update(contract_version='2'),
                       lambda x:x['need'].update(target_id='other'),
                       lambda x:x['field'].update(source_priority={'policy':'florida-election-calendar'})]:
            item=row('current_occupant');mutate(item)
            self.assertIsNone(f.resolve_followup(**item,sources=[SOURCE],receipt=PARENT,deployment='release',ready=True))

    def test_plan_reuses_all_four_work_identities_and_only_opens_current_occupant(self):
        rows=[row(s) for s in f.SCOPES];before=copy.deepcopy(rows)
        cursor=Cursor([PARENT,rows,[SOURCE]])
        with patch.dict(os.environ,ENV,clear=True):f.plan(cursor,{'ready':True})
        import json
        payloads=[json.loads(args[0]) for sql,args in cursor.calls if sql.startswith('UPDATE public.jobs')]
        self.assertEqual(len(payloads),4)
        self.assertEqual([x['research_work_identity'] for x in payloads],[x['job']['dedupe_key'] for x in before])
        self.assertEqual([x['scope_key'] for x in payloads if 'capability_route' in x],['current_occupant'])
        sql='\n'.join(x[0] for x in cursor.calls)
        self.assertNotIn('INSERT INTO public.jobs',sql);self.assertNotIn('INSERT INTO hermes_ops.research_needs',sql)
        self.assertEqual(sum('INSERT INTO hermes_ops.job_dependencies' in x[0] for x in cursor.calls),4)
        dependency=json.loads(cursor.calls[-1][1][0])['validation_dependencies'][RECEIPT]
        self.assertEqual({d['scope'] for d in dependency},set(f.SCOPES))
        self.assertTrue(all(d['satisfaction']=='CANONICAL_GATE_DECISION_REQUIRED_NOT_JOB_SUCCESS' for d in dependency))

    def test_unrelated_blockers_and_duplicate_work_not_released(self):
        rows=[row(s) for s in f.SCOPES];rows[1]['need']['reason']='SECURITY_HOLD'
        cursor=Cursor([PARENT,rows,[SOURCE]])
        with patch.dict(os.environ,ENV,clear=True):f.plan(cursor,{'ready':True})
        self.assertFalse(any('job-current_occupant' in args for sql,args in cursor.calls[3:]))
        duplicate=[row('current_occupant'),row('current_occupant')]
        cursor=Cursor([PARENT,duplicate])
        with patch.dict(os.environ,ENV,clear=True):f.plan(cursor,{'ready':True})
        self.assertFalse(any(sql.startswith(('INSERT','UPDATE')) for sql,args in cursor.calls))

    def test_failure_recovery_runs_when_disabled_preserves_attempts_and_original_need(self):
        job=dict(job_id='job',target_id='seat',research_need_id='followup-need',leased_by='token',expired=True,
                 payload={'validation_followup':{'receipt_id':RECEIPT},'capability_route':{'deployment_id':'release'}})
        cursor=Cursor([[job],{'status':'started','worker_run_id':'run'}])
        with patch.dict(os.environ,{},clear=True):f.collect(cursor)
        writes=[(sql,args) for sql,args in cursor.calls if sql.startswith('UPDATE')]
        self.assertEqual(len(writes),3)
        self.assertTrue(any("status='dead_letter'" in sql for sql,args in writes))
        self.assertFalse(any('attempt_count=' in sql or 'DELETE' in sql or 'validation_runs SET' in sql for sql,args in writes))
        self.assertEqual(writes[-1][1],('followup-need',))

    def test_inconsistent_artifact_never_acknowledged(self):
        job=dict(job_id='job',target_id='seat',research_need_id='followup-need',dedupe_key='work',leased_by='token',expired=False,
                 payload={'validation_followup':{'receipt_id':RECEIPT},'capability_route':{'deployment_id':'release','source_id':'source','retrieval_url':'url'}})
        cursor=Cursor([[job],{'status':'succeeded','worker_run_id':'run','metadata':{}},None])
        f.collect(cursor)
        self.assertFalse(any(sql.startswith('UPDATE') for sql,args in cursor.calls))

    def test_acknowledgement_queries_whole_seat_period_and_preserves_truth(self):
        job=dict(job_id='job',target_id='seat',research_need_id='followup-need',dedupe_key='work',leased_by='token',expired=False,
                 checkpoint={'followup_safety_before':{'digest':'same'}},
                 payload={'validation_followup':{'receipt_id':RECEIPT},'capability_route':{'deployment_id':'release','source_id':'source','retrieval_url':'url'}})
        for count in (0, 125):
            artifact={'retrieved_at':'2026-09-14T00:00:00Z','result_summary':{'display_value':'Alex Example','retrieval_id':'raw','evidence_id':'new-evidence'}}
            claims=[{'claim_id':str(i),'display_value':'Other Person'} for i in range(count)]
            cursor=Cursor([[job],{'status':'succeeded','worker_run_id':'run','metadata':{'validation_run_id':'validation'}},artifact,claims,[],{'job_id':'job'}])
            with patch.object(f,'safety_snapshot',return_value={'digest':'same'}):f.collect(cursor)
            import json
            updates=[(sql,args) for sql,args in cursor.calls if sql.startswith('UPDATE')]
            self.assertEqual(len(updates),2)
            result=json.loads(updates[0][1][0])
            self.assertEqual(result['contradiction_assessment']['claims_examined'],count)
            self.assertEqual(result['contradiction_assessment']['state'],'CONTRADICTION_PENDING' if count else 'NO_COMPETING_CLAIM_FOUND')
            self.assertEqual(result['decision'],'NEEDS_FURTHER_VALIDATION')
            reads=[sql for sql,args in cursor.calls if 'FROM public.claims' in sql or 'FROM public.contradictions' in sql]
            self.assertTrue(all('LIMIT' not in sql for sql in reads))
            self.assertTrue(any('valid_from IS NULL' in sql and 'valid_to IS NULL' in sql for sql in reads))
            self.assertEqual(updates[-1][1][-1],'followup-need')

class TelemetryTests(unittest.TestCase):
    def test_accepted_receipt_is_intermediate_not_complete_or_not_implemented(self):
        result=telemetry.inspect(Cursor([{'receipts':1}]))
        self.assertEqual(result['state'],'RECEIPT_PROVEN_FURTHER_VALIDATION_PENDING')
        self.assertEqual(result['canonical_validation'],'NOT_YET_PROVEN')
        with patch.object(observer,'resources',return_value={'memory_available_bytes':3*1024**3,'disk_free_bytes':20*1024**3,'load_one_minute':0,'cpus':4}), \
             patch.object(observer,'service_state',return_value={}), patch.object(observer,'local_receiver_health',return_value=True), \
             patch.object(telemetry,'observe',return_value=result):
            snapshot=observer.observe(Path('/nonexistent'))
        self.assertEqual(snapshot['civic_validation'],result['state'])
    def test_no_receipt_does_not_claim_proof(self):
        self.assertEqual(telemetry.inspect(Cursor([{'receipts':0}]))['state'],'RECEIPT_IMPLEMENTED_NOT_YET_PROVEN')

if __name__=='__main__':unittest.main()
