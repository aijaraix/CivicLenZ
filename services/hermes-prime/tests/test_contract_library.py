import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import contract_library as library
import capability_router


class ContractLibraryTests(unittest.TestCase):
    def test_major_classes_and_all_scope_policies_survive_persistence(self):
        catalog = library.load_catalog()
        contracts, fields = library.rows(catalog)
        self.assertEqual(len(contracts),16)
        self.assertEqual(len(fields),493)
        self.assertTrue({'FEDERAL_EXECUTIVE','US_SENATOR','US_REPRESENTATIVE',
            'COUNTY_EXECUTIVE','COUNTY_CONSTITUTIONAL_OFFICER','JUDGE','SPECIAL_DISTRICT_MEMBER'}
            <= set(catalog['officeClasses']))
        self.assertTrue(all(c['active'] is False and c['contract_key'].endswith('_V2') for c in contracts))
        for field in fields:
            spec = catalog['scopeDefinitions'][field['field_key']]
            self.assertEqual(field['source_priority']['contract_scope'], spec)
            self.assertEqual(field['category'], spec['category'])
            self.assertEqual(field['sensitivity_rule'],'publication_eligible_claims_only')
            self.assertEqual(field['source_priority']['policy'],'')
        self.assertEqual(len({f['research_contract_field_id'] for f in fields}),len(fields))

    def test_missing_policy_and_active_catalog_rejected(self):
        for mutate in (lambda c:c['officeClasses']['JUDGE'].update(active=True),
                       lambda c:c['scopeDefinitions']['votes']['datasetReconciliation'].update(samplingAllowed=True),
                       lambda c:c['scopeDefinitions']['identity'].update(sourcePriority=[])):
            catalog=copy.deepcopy(library.load_catalog());mutate(catalog)
            with tempfile.TemporaryDirectory() as folder:
                path=Path(folder)/'catalog.json';path.write_text(json.dumps(catalog))
                with self.assertRaises(ValueError):library.load_catalog(path)

    def test_sql_is_reproducible_insert_only_and_rejects_drift(self):
        sql=library.render_sql(library.load_catalog())
        self.assertEqual(sql,library.render_sql(library.load_catalog()))
        self.assertNotIn('UPDATE ',sql);self.assertNotIn('DELETE ',sql)
        self.assertNotIn('public.seats',sql)
        self.assertIn('RAISE EXCEPTION',sql)
        self.assertIn('NOT actual @> expected',sql)

    def test_existing_router_cannot_treat_role_policy_as_source(self):
        from test_validation_followup import row, SOURCE
        candidate=row('evidence')
        field=next(f for f in library.rows(library.load_catalog())[1] if f['field_key']=='evidence')
        decision=capability_router.resolve(candidate['job'],candidate['need'],field,[SOURCE],
                                           deployment_id='test',transport_ready=True)
        self.assertEqual(decision['state'],'BLOCKED')
        self.assertIn('CAPABILITY_NOT_IMPLEMENTED',decision['reason'])
