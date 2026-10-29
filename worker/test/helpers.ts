import { SELF, env } from 'cloudflare:test';

export const ORIGIN = 'http://127.0.0.1:5175';
export const BASE = 'http://127.0.0.1:8787';

export function api(path: string, init: RequestInit & { cookie?: string; csrf?: boolean } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const write = init.method !== undefined && init.method !== 'GET';
  if (write && init.csrf !== false) { headers.set('X-OpenVireo-CSRF', '1'); if (!headers.has('Origin')) headers.set('Origin', ORIGIN); }
  if (init.cookie) headers.set('Cookie', init.cookie);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return SELF.fetch(`${BASE}${path}`, { ...init, headers });
}

export async function requestLink(email: string, init: RequestInit = {}): Promise<Response> {
  return api('/api/auth/request', { method: 'POST', body: JSON.stringify({ email }), ...init });
}

export async function latestToken(email: string): Promise<string> {
  const row = await env.DB.prepare('SELECT body FROM dev_outbox WHERE to_email = ? ORDER BY id DESC LIMIT 1').bind(email).first<{ body: string }>();
  const match = /#signin=([A-Za-z0-9_-]{43})/.exec(row?.body ?? '');
  if (!match) throw new Error('no sign-in link in the dev outbox');
  return match[1];
}

export function cookieFrom(response: Response): string {
  const header = response.headers.get('Set-Cookie') ?? '';
  return header.split(';')[0];
}

/** Signs in through the dev sink and returns the Cookie header value. */
export async function signIn(email: string): Promise<string> {
  const requested = await requestLink(email);
  if (requested.status !== 202) throw new Error(`request ${requested.status}`);
  const verified = await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token: await latestToken(email) }) });
  if (verified.status !== 200) throw new Error(`verify ${verified.status}`);
  return cookieFrom(verified);
}

/** SYNTHETIC minimal files shaped like Save investigation output (not produced by the app; real ones are exercised in
 * tests/cloud-account.spec.ts). Only the fields the worker sniffs are meaningful. */
export const synthetic = {
  plain: (measurements = 1) => JSON.stringify({ format: 'OpenVireo analysis session', version: 18, numericalPolicy: 'x', observation: null, adjustment: {}, measurements: Array.from({ length: measurements }, (_, id) => ({ id })) }, null, 2) + '\n',
  wrapped: () => JSON.stringify({ format: 'OpenVireo analysis session', version: 28, objectX: { a: 1 }, base: { format: 'OpenVireo analysis session', version: 27, lss: { b: 2 }, base: { format: 'OpenVireo analysis session', version: 23, radio: {}, base: { format: 'OpenVireo analysis session', version: 18, photometry: { c: 3 }, classification: null, measurements: [] } } } }),
  practice: () => JSON.stringify({ format: 'OpenVireo stellar classification session', version: 3, datasetFingerprint: 'x', state: {} }),
};

export function upload(cookie: string, body: string | Uint8Array, name = 'My Hubble run', init: RequestInit = {}): Promise<Response> {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  return api('/api/investigations', {
    method: 'POST', cookie, body: bytes,
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(bytes.byteLength), 'X-OpenVireo-Name': encodeURIComponent(name), ...(init.headers as Record<string, string> ?? {}) },
  });
}
