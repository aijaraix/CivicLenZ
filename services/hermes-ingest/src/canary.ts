import { randomUUID } from 'node:crypto';
import { mkdir, open, link, unlink, readFile } from 'node:fs/promises';
import path from 'node:path';

export type AuthorizationPurpose = 'INTEROPERABILITY_CANARY' | 'BOUNDED_PRODUCTION_RETURN';
export type CanaryAuthorization = {
  authorization_id: string; producer_id: string; correlation_id: string;
  created_at: string; expires_at: string; status: 'ARMED' | 'CONSUMED' | 'EXPIRED';
  maximum_uses: 1; use_count: number; consumed_at: string | null;
  consumed_receipt_id: string | null; allowed_classification: 'extracted_unreviewed';
  publication_allowed: false;
  authorization_purpose?: AuthorizationPurpose;
  allowed_job_id?: string; allowed_research_work_identity?: string;
};
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const CANARY_PRODUCER = 'civicslenzz-gemini-harvester';
export const WORK_ID = /^work:v1:[0-9a-f]{64}$/;
export function validAuthorization(a: CanaryAuthorization, now = Date.now()): boolean {
  const bounded = a.authorization_purpose === 'BOUNDED_PRODUCTION_RETURN';
  const boundedIdentity = !bounded || (a.allowed_job_id !== undefined && UUID.test(a.allowed_job_id)
    && a.allowed_research_work_identity !== undefined && WORK_ID.test(a.allowed_research_work_identity)
    && a.correlation_id === a.allowed_job_id);
  return UUID.test(a.authorization_id) && UUID.test(a.correlation_id)
    && a.producer_id === CANARY_PRODUCER && a.maximum_uses === 1
    && a.allowed_classification === 'extracted_unreviewed' && a.publication_allowed === false
    && a.status === 'ARMED' && a.use_count === 0 && a.consumed_at === null && a.consumed_receipt_id === null
    && Number.isFinite(Date.parse(a.created_at)) && Date.parse(a.created_at) <= now
    && Date.parse(a.expires_at) > now && Date.parse(a.expires_at) - Date.parse(a.created_at) <= 3600000
    && boundedIdentity;
}

export function authorizationMatchesEnvelope(a: CanaryAuthorization, envelope: any, authenticatedProducerId?: string): boolean {
  if (!validAuthorization(a)) return false;
  if (authenticatedProducerId && authenticatedProducerId !== a.producer_id) return false;
  if (envelope?.producer?.producer_id !== a.producer_id || envelope?.extraction_status !== a.allowed_classification) return false;
  if (a.authorization_purpose === 'BOUNDED_PRODUCTION_RETURN') {
    return envelope?.job?.job_id === a.allowed_job_id
      && envelope?.job?.research_work_identity === a.allowed_research_work_identity;
  }
  return envelope?.producer?.execution_id === a.correlation_id;
}
export async function readAuthorization(directory: string, correlation: string): Promise<CanaryAuthorization | undefined> {
  if (!UUID.test(correlation)) return undefined;
  try {
    const a = JSON.parse(await readFile(path.join(directory, 'canary-authorizations', correlation + '.json'), 'utf8'));
    if (a.correlation_id !== correlation || !UUID.test(a.authorization_id)) return undefined;
    // The receipt is the atomic commit of BOTH acceptance and consumption.
    // There is no separately mutable use counter that can lag a receipt after a crash.
    try {
      const receipt = JSON.parse(await readFile(path.join(directory, 'receipts', a.authorization_id + '.json'), 'utf8'));
      if (receipt.canary_authorization?.authorization_id !== a.authorization_id) throw new Error('canary receipt collision');
      return { ...a, ...receipt.canary_authorization };
    } catch (e: any) { if (e.code !== 'ENOENT') throw e; }
    return Date.parse(a.expires_at) <= Date.now() ? { ...a, status: 'EXPIRED' } : a;
  } catch (e: any) { if (e.code === 'ENOENT') return undefined; throw e; }
}
// Local operator command only; no HTTP arming API and no producer authority.
export async function armCanary(directory: string, correlation: string, ttlSeconds: number): Promise<CanaryAuthorization> {
  if (!UUID.test(correlation) || !Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600) throw new Error('invalid bounded authorization');
  const now = Date.now();
  const a: CanaryAuthorization = { authorization_id: randomUUID(), producer_id: CANARY_PRODUCER,
    correlation_id: correlation, created_at: new Date(now).toISOString(), expires_at: new Date(now+ttlSeconds*1000).toISOString(),
    status: 'ARMED', maximum_uses: 1, use_count: 0, consumed_at: null, consumed_receipt_id: null,
    allowed_classification: 'extracted_unreviewed', publication_allowed: false };
  const dir = path.join(directory, 'canary-authorizations');
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const temp = path.join(dir, '.' + a.authorization_id + '.tmp');
  const f = await open(temp, 'wx', 0o600);
  try { await f.writeFile(JSON.stringify(a)+'\n'); await f.sync(); } finally { await f.close(); }
  try { await link(temp, path.join(dir, correlation+'.json')); const d=await open(dir,'r'); try { await d.sync(); } finally { await d.close(); } }
  finally { await unlink(temp); }
  return a;
}

export async function armBoundedReturn(directory: string, jobId: string, researchWorkIdentity: string, ttlSeconds: number): Promise<CanaryAuthorization> {
  if (!UUID.test(jobId) || !WORK_ID.test(researchWorkIdentity) || !Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600)
    throw new Error('invalid bounded production authorization');
  const now = Date.now();
  const a: CanaryAuthorization = { authorization_id: randomUUID(), producer_id: CANARY_PRODUCER,
    correlation_id: jobId, created_at: new Date(now).toISOString(), expires_at: new Date(now+ttlSeconds*1000).toISOString(),
    status: 'ARMED', maximum_uses: 1, use_count: 0, consumed_at: null, consumed_receipt_id: null,
    allowed_classification: 'extracted_unreviewed', publication_allowed: false,
    authorization_purpose: 'BOUNDED_PRODUCTION_RETURN', allowed_job_id: jobId,
    allowed_research_work_identity: researchWorkIdentity };
  const dir = path.join(directory, 'canary-authorizations');
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const temp = path.join(dir, '.' + a.authorization_id + '.tmp');
  const f = await open(temp, 'wx', 0o600);
  try { await f.writeFile(JSON.stringify(a)+'\n'); await f.sync(); } finally { await f.close(); }
  try { await link(temp, path.join(dir, jobId+'.json')); const d=await open(dir,'r'); try { await d.sync(); } finally { await d.close(); } }
  finally { await unlink(temp); }
  return a;
}

/**
 * Replace only an expired, unused bounded-production grant for the same exact
 * canonical job/work identity.  The old file is hard-linked into immutable
 * history before the active correlation path is released.  A crash can leave
 * the path safely unarmed, but can never erase the prior grant or broaden it.
 */
export async function rearmExpiredBoundedReturn(
  directory: string,
  jobId: string,
  researchWorkIdentity: string,
  ttlSeconds: number,
): Promise<CanaryAuthorization> {
  if (!UUID.test(jobId) || !WORK_ID.test(researchWorkIdentity) || !Number.isInteger(ttlSeconds)
    || ttlSeconds < 60 || ttlSeconds > 3600) throw new Error('invalid bounded production authorization');
  const dir = path.join(directory, 'canary-authorizations');
  const activePath = path.join(dir, jobId + '.json');
  const rawText = await readFile(activePath, 'utf8');
  const raw = JSON.parse(rawText) as CanaryAuthorization;
  const exactUnusedExpired = raw.authorization_purpose === 'BOUNDED_PRODUCTION_RETURN'
    && raw.producer_id === CANARY_PRODUCER
    && raw.correlation_id === jobId
    && raw.allowed_job_id === jobId
    && raw.allowed_research_work_identity === researchWorkIdentity
    && raw.allowed_classification === 'extracted_unreviewed'
    && raw.publication_allowed === false
    && raw.maximum_uses === 1 && raw.use_count === 0
    && raw.consumed_at === null && raw.consumed_receipt_id === null
    && raw.status === 'ARMED' && Number.isFinite(Date.parse(raw.expires_at))
    && Date.parse(raw.expires_at) <= Date.now();
  if (!exactUnusedExpired || !UUID.test(raw.authorization_id)) {
    throw new Error('only the exact expired unused bounded production authorization may be rearmed');
  }
  const historyDir = path.join(dir, 'history');
  await mkdir(historyDir, { recursive: true, mode: 0o700 });
  const historyPath = path.join(historyDir, `${jobId}.${raw.authorization_id}.json`);
  try {
    await link(activePath, historyPath);
  } catch (error: any) {
    if (error.code !== 'EEXIST') throw error;
    const archivedText = await readFile(historyPath, 'utf8');
    if (archivedText !== rawText) {
      throw new Error('bounded production authorization history collision');
    }
  }
  const historyDirectory = await open(historyDir, 'r');
  try { await historyDirectory.sync(); } finally { await historyDirectory.close(); }
  await unlink(activePath);
  const authorizationDirectory = await open(dir, 'r');
  try { await authorizationDirectory.sync(); } finally { await authorizationDirectory.close(); }
  try {
    return await armBoundedReturn(directory, jobId, researchWorkIdentity, ttlSeconds);
  } catch (error) {
    // Best-effort fail-closed restoration. Never overwrite a concurrently
    // created active grant.
    try { await link(historyPath, activePath); } catch { /* active or safely unarmed */ }
    throw error;
  }
}

export async function auditCanary(directory: string, correlation: string, producer: string, disposition: string, receipt?: string): Promise<void> {
  if (!UUID.test(correlation)) return;
  // Only correlate against an operator-created grant, never arbitrary producer paths.
  if (!await readAuthorization(directory, correlation)) return;
  const dir = path.join(directory, 'canary-audit');
  await mkdir(dir, {recursive:true, mode:0o700});
  const f = await open(path.join(dir, randomUUID()+'.json'), 'wx', 0o600);
  try { await f.writeFile(JSON.stringify({correlation_id:correlation,authenticated_producer_id:producer,
    disposition,receipt_id:receipt??null,observed_at:new Date().toISOString()})+'\n'); await f.sync(); } finally { await f.close(); }
  const d=await open(dir,'r'); try { await d.sync(); } finally { await d.close(); }
}
