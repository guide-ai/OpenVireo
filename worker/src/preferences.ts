import type { Env } from './env';
import { HttpError, hasControlCharacters, json, readJsonBody } from './http';
import type { SessionUser } from './auth';

export const MAX_PREFERENCES_BYTES = 4096;
const THEMES = new Set(['light', 'dark', 'system']);
const MAX_TELESCOPE_KEYS = 32;

/** Allowlisted preference document (plan §6). Throws 400 on any unknown key or shape. */
export function readPreferences(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'preferences');
  const input = value as Record<string, unknown>, out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(input)) {
    if (key === 'theme') {
      if (typeof v !== 'string' || !THEMES.has(v)) throw new HttpError(400, 'preferences');
      out.theme = v;
    } else if (key === 'language') {
      if (typeof v !== 'string' || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,2}$/.test(v) || v.length > 16) throw new HttpError(400, 'preferences');
      out.language = v;
    } else if (key === 'telescope') {
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, 'preferences');
      const entries = Object.entries(v as Record<string, unknown>);
      if (entries.length > MAX_TELESCOPE_KEYS) throw new HttpError(400, 'preferences');
      const telescope: Record<string, string | number | boolean> = {};
      for (const [k, x] of entries) {
        if (!/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(k)) throw new HttpError(400, 'preferences');
        if (typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x)) || (typeof x === 'string' && x.length <= 64 && !hasControlCharacters(x))) telescope[k] = x;
        else throw new HttpError(400, 'preferences');
      }
      out.telescope = telescope;
    } else throw new HttpError(400, 'preferences');
  }
  if (new TextEncoder().encode(JSON.stringify(out)).byteLength > MAX_PREFERENCES_BYTES) throw new HttpError(413, 'too-large');
  return out;
}

export async function loadPreferences(env: Env, userId: string): Promise<Record<string, unknown>> {
  const row = await env.DB.prepare('SELECT doc FROM preferences WHERE user_id = ?').bind(userId).first<{ doc: string }>();
  return row ? JSON.parse(row.doc) as Record<string, unknown> : {};
}

export async function getPreferences(env: Env, user: SessionUser): Promise<Response> {
  return json({ preferences: await loadPreferences(env, user.id) });
}

export async function putPreferences(request: Request, env: Env, user: SessionUser): Promise<Response> {
  const preferences = readPreferences(await readJsonBody(request));
  await env.DB.prepare('INSERT INTO preferences (user_id, doc, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET doc = excluded.doc, updated_at = excluded.updated_at')
    .bind(user.id, JSON.stringify(preferences), Date.now()).run();
  return json({ preferences });
}
