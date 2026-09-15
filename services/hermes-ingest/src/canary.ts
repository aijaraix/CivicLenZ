import { randomUUID } from 'node:crypto';
import { mkdir, open, link, unlink, readFile } from 'node:fs/promises';
import path from 'node:path';

export type CanaryAuthorization = {
  authorization_id: string; producer_id: string; correlation_id: string;
  created_at: string; expires_at: string; status: 'ARMED' | 'CONSUMED' | 'EXPIRED';
  maximum_uses: 1; use_count: number; consumed_at: string | null;
  consumed_receipt_id: string | null; allowed_classification: 'extracted_unreviewed';
  publication_allowed: false;
};
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const CANARY_PRODUCER = 'civicslenzz-gemini-harvester';
export function validAuthorization(a: CanaryAuthorization, now = Date.now()): boolean {
  return UUID.test(a.authorization_id) && UUID.test(a.correlation_id)
    && a.producer_id === CANARY_PRODUCER && a.maximum_uses === 1
    && a.allowed_classification === 'extracted_unreviewed' && a.publication_allowed === false
    && a.status === 'ARMED' && a.use_count === 0 && a.consumed_at === null && a.consumed_receipt_id === null
    && Number.isFinite(Date.parse(a.created_at)) && Date.parse(a.created_at) <= now
    && Date.parse(a.expires_at) > now && Date.parse(a.expires_at) - Date.parse(a.created_at) <= 3600000;
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
  const a: CanaryAuthorization = { authorization_id: randomUUID(), producer_id: CANARY_PRODUCER,
    correlation_id: correlation, created_at: new Date().toISOString(), expires_at: new Date(Date.now()+ttlSeconds*1000).toISOString(),
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
