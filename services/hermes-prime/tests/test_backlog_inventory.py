import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import backlog_inventory as inventory


class Cursor:
    def __init__(self, responses): self.responses=iter(responses);self.calls=[]
    def __enter__(self): return self
    def __exit__(self,*args): pass
    def execute(self,sql,args=()): self.calls.append((sql,args))
    def fetchone(self): return next(self.responses)
    def fetchall(self): return next(self.responses)

class Connection:
    def __init__(self,cursor): self.c=cursor
    def __enter__(self): return self
    def __exit__(self,*args): pass
    def cursor(self): return self.c


class BacklogInventoryTests(unittest.TestCase):
    def test_declarations_and_execution_are_never_independent_proof(self):
        for label in ('REAL_PROVEN','TEST','SYNTHETIC',None):
            for runs in (0,1):
                result=inventory.legacy_classification({'execution_class':label},runs)
                self.assertEqual(result['classification'],'LEGACY_UNPROVEN' if runs else 'UNKNOWN')
                self.assertFalse(result['dispatch_allowed'])

    def test_existing_need_lineage_and_legacy_attempts_preserved(self):
        cursor=Cursor([(True,), [('job','ingest',{},3,2)], [('need','contract','1','identity','CAPABILITY_NOT_IMPLEMENTED: identity')]])
        with patch.object(inventory,'connect_database',return_value=Connection(cursor)):
            result=inventory.reconcile()
        self.assertEqual(result['legacy_observations'],1)
        self.assertEqual(result['capability_observations'],1)
        writes=[(sql,args) for sql,args in cursor.calls if 'INSERT' in sql]
        self.assertEqual(len(writes),2)
        self.assertTrue(all('INSERT INTO hermes_ops.incidents' in sql for sql,args in writes))
        self.assertEqual(json.loads(writes[0][1][3])['attempt_count'],3)
        self.assertEqual(json.loads(writes[1][1][2])['need_id'],'need')
        self.assertFalse(json.loads(writes[1][1][3])['factual_no_result'])
        self.assertNotIn('UPDATE public.jobs','\n'.join(sql for sql,args in cursor.calls))

    def test_oversized_inventory_is_explicitly_partial_and_bounded(self):
        cursor=Cursor([(True,),[(str(i),'monitor',{},0,0) for i in range(inventory.LIMIT+1)],[]])
        with patch.object(inventory,'connect_database',return_value=Connection(cursor)):
            result=inventory.reconcile()
        self.assertEqual(result['state'],'PARTIAL_ROTATING_INVENTORY')
        self.assertEqual(result['legacy_observations'],inventory.LIMIT)

    def test_repeat_observation_retains_resolution_changed_facts_append(self):
        cursor=Cursor([])
        for observation in ({'a':1},{'a':1},{'a':2}):
            inventory.record(cursor,'key','kind',{'job_id':'job'},observation)
        self.assertEqual(cursor.calls[0][1][0],cursor.calls[1][1][0])
        self.assertNotEqual(cursor.calls[0][1][0],cursor.calls[2][1][0])
        self.assertNotIn('SET observations',cursor.calls[0][0])
        self.assertNotIn('status=',cursor.calls[0][0])
