import { armBoundedReturn, armCanary, readAuthorization, rearmExpiredBoundedReturn } from './canary.ts';
const [action, correlation, arg3, arg4] = process.argv.slice(2);
const dir = process.env.HERMES_INGEST_SPOOL_DIRECTORY;
if (!dir || process.env.HERMES_INGEST_INTAKE_PAUSED !== 'true') throw new Error('explicit paused spool configuration required');
if (action === 'arm') console.log(JSON.stringify(await armCanary(dir, correlation, Number(arg3))));
else if (action === 'arm-production') console.log(JSON.stringify(await armBoundedReturn(dir, correlation, arg3, Number(arg4))));
else if (action === 'rearm-expired-production') console.log(JSON.stringify(await rearmExpiredBoundedReturn(dir, correlation, arg3, Number(arg4))));
else if (action === 'inspect') console.log(JSON.stringify(await readAuthorization(dir, correlation)));
else throw new Error('usage: canary-cli.ts arm correlation_uuid ttl | arm-production canonical_job_uuid work:v1:<sha256> ttl | rearm-expired-production canonical_job_uuid work:v1:<sha256> ttl | inspect correlation_uuid');
