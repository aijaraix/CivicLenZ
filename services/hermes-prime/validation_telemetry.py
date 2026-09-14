"""Read-only canonical receipt telemetry; implementation is not validation."""

def inspect(cursor):
    cursor.execute("""SELECT count(*) AS receipts FROM public.validation_runs v
      JOIN public.jobs j ON j.job_id::text=v.input_summary->>'job_id'
      JOIN public.worker_runs w ON w.worker_run_id::text=j.checkpoint->>'worker_run_id'
      WHERE v.validator_key='hermes.internal.receipt.v1' AND v.status='ACCEPTED_FOR_VALIDATION'
      AND j.job_type='contract_evidence_validate' AND j.status='succeeded'
      AND j.payload->>'orchestration_authority'='hermes' AND j.payload->>'execution_class'='PRODUCTION'
      AND j.dedupe_key=v.input_summary->>'research_work_identity'
      AND j.checkpoint->>'validation_run_id'=v.validation_run_id::text
      AND w.job_id=j.job_id AND w.status='succeeded' AND w.worker_key='hermes.cloudflare.validation'
      AND w.deployment_id=v.input_summary->>'validator_deployment_id'
      AND w.metadata->>'attempt_token'=v.input_summary->>'attempt_token'
      AND j.checkpoint->>'independent_safety_check'='UNCHANGED_OCCUPANCY_AND_VERIFIED_CLAIMS'""")
    count = int(cursor.fetchone()['receipts'])
    return {'state': 'RECEIPT_PROVEN_FURTHER_VALIDATION_PENDING' if count else
            'RECEIPT_IMPLEMENTED_NOT_YET_PROVEN', 'accepted_receipts': count,
            'canonical_validation': 'NOT_YET_PROVEN'}


def observe():
    try:
        from database_bootstrap import connect_database
        from psycopg2.extras import RealDictCursor
        with connect_database() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                return inspect(cursor)
    except Exception:
        return {'state': 'UNKNOWN_RECEIPT_QUERY_FAILED', 'canonical_validation': 'NOT_YET_PROVEN'}
