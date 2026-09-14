"""Stage evidence-backed enumeration proposals; never create/bind/activate Seats.

First source-specific parser: official Senate contact roster. Membership is not a
complete permanent Seat universe, especially across vacancies. No national target
count is used. Other office-class enumeration capabilities remain unimplemented.
The caller supplies bytes from a canonical raw retrieval, never a synthetic list.
"""
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from backlog_inventory import record

SOURCE_URL = 'https://www.senate.gov/general/contact_information/senators_cfm.xml'
SOURCE_ROLE = 'us-senate-official-membership-roster'
VERSION = 'senate-seat-context-v1'


def parse_senate_roster(data):
    if not data or len(data) > 1048576 or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('UNSUPPORTED_OR_UNSAFE_ENUMERATION_DOCUMENT')
    root = ET.fromstring(data)
    if root.tag != 'contact_information' or any(child.tag != 'member' for child in root):
        raise ValueError('ENUMERATION_STRUCTURE_UNPROVEN')
    seats = {}
    for member in root:
        states, classes = member.findall('state'), member.findall('class')
        if len(states) != 1 or len(classes) != 1:
            raise ValueError('AMBIGUOUS_STATE_OR_SEAT_CLASS')
        state, seat_class = (states[0].text or '').strip(), (classes[0].text or '').strip()
        if not re.fullmatch('[A-Z]{2}', state) or seat_class not in ('Class I','Class II','Class III'):
            raise ValueError('UNSUPPORTED_STATE_OR_SEAT_CLASS')
        # Person, party, name, contact and roster position do not form Seat IDs.
        key = 'us-'+state.lower()+'-senate-'+seat_class.lower().replace(' ', '-')
        if key in seats:
            raise ValueError('DUPLICATE_PERMANENT_SEAT_CONTEXT')
        seats[key] = {'proposed_seat_key':key,'jurisdiction_key':'us-'+state.lower(),
                      'office_class':'US_SENATOR','seat_class':seat_class,
                      'locator':f'/contact_information/member[state="{state}"][class="{seat_class}"]'}
    if not seats:
        raise ValueError('EMPTY_ROSTER_IS_NOT_RECONCILIATION')
    return list(seats.values())


def stage(cursor, retrieval_id, data):
    """Caller owns transaction. Insert-only operational history under runtime role.

    The registry binding, HTTP result and raw-byte hash are independently checked.
    No unregistered role, payload label or claim of worker success substitutes.
    """
    cursor.execute('''SELECT r.retrieval_id,r.content_hash,r.byte_length,r.source_url,r.retrieved_at,
        r.raw_object_uri,s.source_id,s.source_key,s.source_url AS registry_url,s.authority_tier,s.active
        FROM public.raw_retrievals r JOIN public.sources s ON s.source_id=r.source_id
        WHERE r.retrieval_id=%s AND r.http_status=200 AND r.retrieval_status='stored' ''', (retrieval_id,))
    raw=cursor.fetchone()
    if (not raw or raw['source_key'] != SOURCE_ROLE or not raw['active']
            or raw['source_url'] != SOURCE_URL or raw['registry_url'] != SOURCE_URL
            or raw['authority_tier'] != 'TIER_1_PRIMARY_OFFICIAL' or not raw['raw_object_uri']
            or raw['byte_length'] != len(data) or raw['content_hash'] != hashlib.sha256(data).hexdigest()):
        raise ValueError('ENUMERATION_ARTIFACT_OR_REGISTRY_UNPROVEN')
    proposals=parse_senate_roster(data)  # Validate whole document before any write.
    cursor.execute("SELECT research_contract_id,active FROM public.research_contracts WHERE contract_key='US_SENATOR_V2' AND version='2'")
    contract=cursor.fetchone()
    if not contract or contract['active']:
        raise ValueError('EXPECTED_INACTIVE_CONTRACT_MISSING_OR_CHANGED')
    assessment={'state':'ENUMERATED_ROSTER_CONTEXT_PENDING_RECONCILIATION','parser_version':VERSION,
        'retrieved_at':str(raw['retrieved_at']),'sha256':raw['content_hash'],'artifact_uri':raw['raw_object_uri'],
        'source_id':str(raw['source_id']),'observed_seat_contexts':proposals,
        'permanent_universe_reconciled':False,'national_acceptance':False,
        'binding_allowed':False,'activation_allowed':False,
        'blockers':['VACANCY_AND_PERMANENT_UNIVERSE_RECONCILIATION',
                    'AUTHORITATIVE_JURISDICTION_MAPPING','REQUIRED_SOURCE_ROLE_REGISTRATION',
                    'EXACT_CAPABILITY_PHYSICAL_PROOF','CANONICAL_SEAT_REVIEW'],
        'downstream_obligations':['elections','candidates','contract_scope_evaluation','monitoring'],
        'reason':'Roster-derived permanent Seat context proposals; not a certified full Seat universe or verified occupants'}
    record(cursor,'seat-enumeration:v1:'+str(retrieval_id),'SEAT_ENUMERATION_REVIEW',
           {'retrieval_id':str(retrieval_id),'contract_id':str(contract['research_contract_id'])},assessment)
    return assessment
