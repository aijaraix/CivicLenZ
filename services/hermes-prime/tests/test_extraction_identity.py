import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from extraction_handoff import child_identity
class ChildIdentityTests(unittest.TestCase):
 def test_stable_stage_identity_preserves_distinct_work(self):
  first=child_identity('work:v1:parent','retrieval','extraction')
  self.assertEqual(first,child_identity('work:v1:parent','retrieval','extraction'))
  for args in [('work:v1:other','retrieval','extraction'),('work:v1:parent','other','extraction'),('work:v1:parent','retrieval','canonical_validation')]:
   self.assertNotEqual(first,child_identity(*args))
