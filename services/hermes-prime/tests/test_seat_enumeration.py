import hashlib
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import seat_enumeration as e
from test_validation_followup import Cursor
DATA=b'<contact_information><member><state>FL</state><class>Class I</class><first_name>Fixture</first_name></member></contact_information>'
class EnumerationTests(unittest.TestCase):
 def test_permanent_identity_ignores_person_name_and_order(self):
  self.assertEqual(e.parse_senate_roster(DATA),e.parse_senate_roster(DATA.replace(b'Fixture',b'Another')))
  self.assertEqual(e.parse_senate_roster(DATA)[0]['proposed_seat_key'],'us-fl-senate-class-i')
 def test_empty_ambiguous_duplicate_and_entity_documents_fail_closed(self):
  for data in (b'<contact_information/>',DATA.replace(b'<state>FL</state>',b'<state>FL</state><state>NY</state>'),
               DATA.replace(b'</contact_information>',DATA.split(b'<member>')[0]+b'</contact_information>'),
               b'<!DOCTYPE x>'+DATA,DATA.replace(b'Class I',b'Class IV')):
   with self.assertRaises((ValueError,e.ET.ParseError)):e.parse_senate_roster(data)
 def test_stage_checks_raw_bytes_and_only_inserts_incident(self):
  raw=dict(source_key=e.SOURCE_ROLE,active=True,source_url=e.SOURCE_URL,registry_url=e.SOURCE_URL,
    authority_tier='TIER_1_PRIMARY_OFFICIAL',raw_object_uri='r2://fixture',byte_length=len(DATA),
    content_hash=hashlib.sha256(DATA).hexdigest(),retrieved_at='fixture-time',source_id='source')
  c=Cursor([raw,{'research_contract_id':'contract','active':False}]);result=e.stage(c,'raw',DATA)
  self.assertFalse(result['binding_allowed']);self.assertFalse(result['permanent_universe_reconciled'])
  self.assertEqual(len([q for q,a in c.calls if 'INSERT' in q]),1)
  self.assertIn('hermes_ops.incidents',c.calls[-1][0])
  with self.assertRaises(ValueError):e.stage(Cursor([raw]),'raw',DATA+b' ')
