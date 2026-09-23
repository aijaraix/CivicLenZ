"""UNIT tests, not production evidence."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from capability_router import resolve
from observer import governor

class RoutingTests(unittest.TestCase):
 def setUp(self):
  self.need=dict(need_id='n',target_id='s',target_type='seat',contract_id='c',contract_version='1',scope_key='evidence',execution_class='PRODUCTION',origin='CONTRACT_GAP')
  self.job=dict(job_type='contract_scope_research',research_need_id='n',target_id='s',target_type='seat',dedupe_key='work:v1:test',payload=dict(orchestration_authority='hermes',execution_class='PRODUCTION',research_work_identity='work:v1:test',scope_key='evidence',contract_id='c',contract_version='1'))
  self.field=dict(verification_requirement='official_source',sensitivity_rule='publication_eligible_claims_only',source_priority={'policy':'florida-governor-official'})
  self.sources=[dict(source_id='source',source_key='florida-governor-official',source_url='https://www.flgov.com/',active=True,authority_tier='TIER_1_PRIMARY_OFFICIAL')]
 def route(self,**kw):
  return resolve(self.job,self.need,self.field,self.sources,**kw)
 def test_no_credential_or_deployment_never_opens(self):
  self.assertEqual(self.route()['state'],'BLOCKED')
  self.assertIn('CREDENTIAL_REQUIRED',self.route(deployment_id='release')['reason'])
 def test_route_only_opens_with_all_gates(self):
  decision=self.route(deployment_id='release',transport_ready=True)
  self.assertEqual(decision['state'],'OPEN')
  self.assertEqual(decision['route']['retrieval_url'],'https://www.flgov.com/eog/')
 def test_rejects_legacy_test_unknown_and_mismatch(self):
  original=copy.deepcopy(self.job)
  for key,value in [('orchestration_authority','legacy'),('execution_class','TEST'),('research_work_identity','other'),('contract_version','2')]:
   self.job=copy.deepcopy(original);self.job['payload'][key]=value
   self.assertEqual(self.route(deployment_id='release',transport_ready=True)['state'],'BLOCKED')
 def test_unsupported_scope_stays_blocked(self):
  self.need['scope_key']=self.job['payload']['scope_key']='current_occupant'
  self.assertIn('CAPABILITY_NOT_IMPLEMENTED',self.route()['reason'])
 def test_quarantine_route_preserves_unresolved_attribution(self):
  self.need['scope_key']=self.job['payload']['scope_key']='social'
  self.field['verification_requirement']='review'
  self.field['sensitivity_rule']='publication_eligible_claims_only'
  decision=self.route(deployment_id='release',transport_ready=True)
  self.assertEqual(decision['state'],'OPEN')
  self.assertEqual(decision['route']['stage'],'quarantine')
  self.assertEqual(decision['route']['identity_attribution'],'unresolved')
  self.assertFalse(decision['route']['publication_eligible'])
 def test_source_policy_and_url_fail_closed(self):
  for url in ['http://www.flgov.com/','https://127.0.0.1/']:
   self.sources[0]['source_url']=url
   self.assertEqual(self.route(deployment_id='release',transport_ready=True)['state'],'BLOCKED')
 def test_registry_driven_dos_source_routes(self):
  self.need['scope_key']=self.job['payload']['scope_key']='social'
  self.field['verification_requirement']='review'
  self.field['source_priority']={'policy':'fl_dos_elections'}
  self.sources=[dict(source_id='dos-source',source_key='fl_dos_elections',
                     source_url='https://dos.elections.myflorida.com/candidates/CanList.asp',
                     active=True,authority_tier='TIER_1_PRIMARY_OFFICIAL')]
  result=self.route(deployment_id='release',transport_ready=True)
  self.assertEqual(result['state'],'OPEN')
  self.assertEqual(result['route']['retrieval_url'],self.sources[0]['source_url'])
 def test_monitoring_and_discovery_origins_can_route_registered_sources(self):
  self.need['scope_key']=self.job['payload']['scope_key']='seat'
  self.field['verification_requirement']='review'
  self.field['source_priority']={'policy':'miami-dade-county-elected-officials'}
  self.sources=[dict(source_id='miami-source',source_key='miami-dade-county-elected-officials',
                     source_url='https://www.miamidade.gov/elections/library/reports/elected-officials.pdf',
                     active=True,authority_tier='TIER_1_PRIMARY_OFFICIAL')]
  for origin in ['MONITORING','DISCOVERY']:
   self.need['origin']=origin
   self.assertEqual(self.route(deployment_id='release',transport_ready=True)['state'],'OPEN')
 def test_registry_driven_miami_dade_source_routes(self):
  self.need['scope_key']=self.job['payload']['scope_key']='biography'
  self.field['verification_requirement']='review'
  self.field['source_priority']={'policy':'miami-dade-county-elected-officials'}
  self.sources=[dict(source_id='miami-source',source_key='miami-dade-county-elected-officials',
                     source_url='https://www.miamidade.gov/elections/library/reports/elected-officials.pdf',
                     active=True,authority_tier='TIER_1_PRIMARY_OFFICIAL')]
  result=self.route(deployment_id='release',transport_ready=True)
  self.assertEqual(result['state'],'OPEN')
 def test_inactive_or_non_authoritative_registry_rows_fail_closed(self):
  self.need['scope_key']=self.job['payload']['scope_key']='social'
  self.field['verification_requirement']='review'
  self.field['source_priority']={'policy':'fl_dos_elections'}
  for active,tier in [(False,'TIER_1_PRIMARY_OFFICIAL'),(True,'TIER_2_OFFICIAL_CAMPAIGN')]:
   self.sources=[dict(source_id='dos-source',source_key='fl_dos_elections',source_url='https://dos.elections.myflorida.com/candidates/CanList.asp',active=active,authority_tier=tier)]
   self.assertEqual(self.route(deployment_id='release',transport_ready=True)['state'],'BLOCKED')
 def test_job_payload_url_cannot_bypass_registry(self):
  self.need['scope_key']=self.job['payload']['scope_key']='social'
  self.field['verification_requirement']='review'
  self.field['source_priority']={'policy':'fl_dos_elections'}
  self.job['payload']['source_url']='https://attacker.example/'
  self.job['payload']['retrieval_url']='https://attacker.example/'
  self.sources=[]
  self.assertEqual(self.route(deployment_id='release',transport_ready=True)['state'],'BLOCKED')
 def test_resource_budget(self):
  self.assertEqual(governor(3*1024**3,20*1024**3,0,4)['dispatch_limit'],1)
  self.assertEqual(governor(1024,20*1024**3,0,4)['dispatch_limit'],0)
  self.assertEqual(governor(3*1024**3,1024,0,4)['dispatch_limit'],0)
  self.assertEqual(governor(3*1024**3,20*1024**3,9,4)['dispatch_limit'],0)

 def test_named_capability_route_is_allow_listed_and_unresolved(self):
  self.need['scope_key']=self.job['payload']['scope_key']='identity'
  self.job['payload']['deep_dossier_unit_key']='official_identity'
  self.job['payload']['capability_key']='identity_resolution'
  self.field['verification_requirement']='review'
  self.field['source_priority']={'policy':'florida-governor-official'}
  decision=self.route(deployment_id='release',transport_ready=True)
  self.assertEqual(decision['state'],'OPEN')
  self.assertEqual(decision['route']['capability'],'identity_resolution')
  self.assertEqual(decision['route']['capability_contract']['output'],'identity_resolution_evidence')
  self.assertEqual(decision['route']['identity_attribution'],'unresolved')
  self.assertFalse(decision['route']['publication_eligible'])

 def test_arbitrary_capability_key_cannot_route(self):
  self.need['scope_key']=self.job['payload']['scope_key']='identity'
  self.job['payload']['deep_dossier_unit_key']='official_identity'
  self.job['payload']['capability_key']='not_a_capability'
  self.field['verification_requirement']='review'
  self.field['source_priority']={'policy':'florida-governor-official'}
  decision=self.route(deployment_id='release',transport_ready=True)
  self.assertEqual(decision['state'],'BLOCKED')
  self.assertIn('CAPABILITY_NOT_IMPLEMENTED',decision['reason'])

 def test_family_capability_route_remains_unresolved_and_non_publishable(self):
  self.need['scope_key']=self.job['payload']['scope_key']='campaign_finance'
  self.job['payload']['deep_dossier_unit_key']='transaction_classes'
  self.job['payload']['capability_key']='contributions'
  self.field['verification_requirement']='review'
  self.field['source_priority']={'policy':'florida-governor-official'}
  decision=self.route(deployment_id='release',transport_ready=True)
  self.assertEqual(decision['state'],'OPEN')
  self.assertEqual(decision['route']['capability'],'contributions')
  self.assertEqual(decision['route']['capability_contract']['output'],'contribution_evidence')
  self.assertEqual(decision['route']['identity_attribution'],'unresolved')
  self.assertFalse(decision['route']['publication_eligible'])

 def test_unknown_family_capability_cannot_bypass_allow_list(self):
  self.need['scope_key']=self.job['payload']['scope_key']='campaign_finance'
  self.job['payload']['deep_dossier_unit_key']='transaction_classes'
  self.job['payload']['capability_key']='made_up_finance_capability'
  self.field['verification_requirement']='review'
  self.field['source_priority']={'policy':'florida-governor-official'}
  decision=self.route(deployment_id='release',transport_ready=True)
  self.assertEqual(decision['state'],'BLOCKED')
  self.assertIn('CAPABILITY_NOT_IMPLEMENTED',decision['reason'])

 def test_elections_and_quality_family_routes_are_bounded(self):
  cases=[
   ('elections_gis','calendar_window','election_calendar'),
   ('elections_gis','election_universe','election_discovery'),
   ('elections_gis','filing_records','filing_status'),
   ('elections_gis','ballot_records','ballot_qualification'),
   ('elections_gis','result_records','election_results'),
   ('elections_gis','historical_cycles','election_history'),
   ('quality_monitoring','currentness_check','freshness_monitor'),
   ('quality_monitoring','contradiction_check','contradiction_resolution'),
  ]
  for scope,unit,capability in cases:
   self.need['scope_key']=self.job['payload']['scope_key']=scope
   self.job['payload']['deep_dossier_unit_key']=unit
   self.job['payload']['capability_key']=capability
   self.field['verification_requirement']='review'
   self.field['source_priority']={'policy':'florida-governor-official'}
   decision=self.route(deployment_id='release',transport_ready=True)
   self.assertEqual(decision['state'],'OPEN')
   self.assertEqual(decision['route']['capability'],capability)
   self.assertEqual(decision['route']['identity_attribution'],'unresolved')
   self.assertFalse(decision['route']['publication_eligible'])

if __name__=='__main__':unittest.main()
