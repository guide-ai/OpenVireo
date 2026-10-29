import type { Env } from './env';

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

const BASE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export function json(value: unknown, status = 200, extra: HeadersInit = {}): Response {
  const headers = new Headers({ ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8' });
  new Headers(extra).forEach((v, k) => headers.append(k, v));
  return new Response(JSON.stringify(value), { status, headers });
}

export function withBaseHeaders(response: Response): Response {
  for (const [k, v] of Object.entries(BASE_HEADERS)) response.headers.set(k, v);
  return response;
}

export function errorResponse(error: HttpError): Response {
  return json({ error: error.code }, error.status);
}

/** CSRF guard for every state-changing route (plan §8): custom header, same Origin, same-origin fetch metadata. */
export function requireSameOriginWrite(request: Request, env: Env): void {
  if (request.headers.get('X-OpenVireo-CSRF') !== '1') throw new HttpError(403, 'csrf');
  const origin = request.headers.get('Origin');
  if (origin !== null && (!env.APP_ORIGIN || origin !== new URL(env.APP_ORIGIN).origin)) throw new HttpError(403, 'csrf');
  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'csrf');
}

/** Reads the body with a hard byte cap, whatever Content-Length claims. */
export async function readCapped(request: Request, cap: number): Promise<Uint8Array> {
  const declared = request.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > cap)) throw new HttpError(413, 'too-large');
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) { await reader.cancel(); throw new HttpError(413, 'too-large'); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
  return out;
}

export const MAX_JSON_BODY = 8 * 1024;

/** Small JSON request bodies (everything except uploads). */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('Content-Type') ?? '';
  if (!/^application\/json\b/i.test(type)) throw new HttpError(415, 'content-type');
  const bytes = await readCapped(request, MAX_JSON_BODY);
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)); } catch { throw new HttpError(400, 'json'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'json');
  return value as Record<string, unknown>;
}

const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
export function hasControlCharacters(text: string): boolean { return CONTROL.test(text); }
