import { armCanary, readAuthorization } from './canary.ts';
const [action, correlation, ttl] = process.argv.slice(2);
const dir = process.env.HERMES_INGEST_SPOOL_DIRECTORY;
if (!dir || process.env.HERMES_INGEST_INTAKE_PAUSED !== 'true') throw new Error('explicit paused spool configuration required');
if (action === 'arm') console.log(JSON.stringify(await armCanary(dir, correlation, Number(ttl))));
else if (action === 'inspect') console.log(JSON.stringify(await readAuthorization(dir, correlation)));
else throw new Error('usage: canary-cli.ts arm|inspect correlation_uuid [ttl_seconds]');
