import type { Env } from './env';
import { HttpError, hasControlCharacters, json, readJsonBody } from './http';
import { clearSessionCookie, rateLimitMailbox, type SessionUser } from './auth';
import { sha256Hex } from './crypto';
import { listIndex, progressRows } from './investigations';
import { loadPreferences } from './preferences';

export const MAX_ALIAS_LENGTH = 40;
export const EXPORT_FORMAT = 'OpenVireo account export';

/** Minimum-age/terms hook (plan §6). Only 'none' exists until the user decides the terms; anything else fails closed. */
export function termsGate(env: Env, user: SessionUser): void {
  const policy = env.TERMS_POLICY ?? 'none';
  if (policy === 'none') return;
  void user;
  throw new HttpError(503, 'terms-policy-unknown');
}

export function sessionBody(env: Env, user: SessionUser | null) {
  if (!user) return { signedIn: false };
  return {
    signedIn: true,
    termsPolicy: env.TERMS_POLICY ?? 'none',
    user: { email: user.email, alias: user.alias, termsVersion: user.termsVersion, ageConfirmed: user.ageConfirmedAt !== null },
  };
}

/** POST /api/account/terms — records what the user accepted; enforced only once a policy exists. */
export async function acceptTerms(request: Request, env: Env, user: SessionUser): Promise<Response> {
  const body = await readJsonBody(request);
  const version = body.termsVersion;
  if (typeof version !== 'string' || !/^[A-Za-z0-9._-]{1,32}$/.test(version) || body.ageConfirmed !== true) throw new HttpError(400, 'terms');
  await env.DB.prepare('UPDATE users SET terms_version = ?, age_confirmed_at = ? WHERE id = ?').bind(version, Date.now(), user.id).run();
  return json({ ok: true });
}

export async function putProfile(request: Request, env: Env, user: SessionUser): Promise<Response> {
  const body = await readJsonBody(request);
  let alias: string | null;
  if (body.alias === null) alias = null;
  else if (typeof body.alias === 'string') {
    alias = body.alias.trim();
    if (alias.length < 1 || [...alias].length > MAX_ALIAS_LENGTH || hasControlCharacters(alias)) throw new HttpError(400, 'alias');
  } else throw new HttpError(400, 'alias');
  await env.DB.prepare('UPDATE users SET alias = ? WHERE id = ?').bind(alias, user.id).run();
  return json({ alias });
}

/** GET /api/account/export — streamed so the worker never holds every investigation in memory. Stored investigations
 * were valid JSON at upload, so they are embedded verbatim as JSON values. */
export async function exportAccount(env: Env, user: SessionUser, ctx: ExecutionContext): Promise<Response> {
  const [preferences, progress, index] = await Promise.all([loadPreferences(env, user.id), progressRows(env, user.id), listIndex(env, user.id)]);
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter(), encoder = new TextEncoder();
  const head = {
    format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(),
    profile: { email: user.email, alias: user.alias, termsVersion: user.termsVersion, ageConfirmedAt: user.ageConfirmedAt },
    preferences, progress,
  };
  const pump = async () => {
    try {
      const prefix = JSON.stringify(head);
      await writer.write(encoder.encode(`${prefix.slice(0, -1)},"investigations":[`));
      for (let i = 0; i < index.length; i++) {
        const row = index[i];
        const meta = { id: row.id, name: row.name, sizeBytes: row.size_bytes, sha256: row.sha256, format: row.format, version: row.format_version, exercises: JSON.parse(row.exercises), createdAt: row.created_at };
        await writer.write(encoder.encode(`${i ? ',' : ''}${JSON.stringify(meta).slice(0, -1)},"file":`));
        const object = await env.INVESTIGATIONS.get(row.r2_key);
        if (object) {
          const reader = object.body.getReader();
          for (;;) { const { done, value } = await reader.read(); if (done) break; await writer.write(value); }
        } else await writer.write(encoder.encode('null,"missing":true'));
        await writer.write(encoder.encode('}'));
      }
      await writer.write(encoder.encode(']}\n'));
      await writer.close();
    } catch (error) {
      await writer.abort(error);
    }
  };
  ctx.waitUntil(pump());
  return new Response(readable, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="openvireo-account-export.json"' },
  });
}

/** DELETE /api/account {confirmEmail} — irreversible: R2 objects, then every row (cascade), tokens and rate buckets. */
export async function deleteAccount(request: Request, env: Env, user: SessionUser): Promise<Response> {
  const body = await readJsonBody(request);
  if (typeof body.confirmEmail !== 'string' || body.confirmEmail.trim().toLowerCase() !== user.email) throw new HttpError(400, 'confirm-email');
  const prefix = `inv/${user.id}/`;
  await deletePrefix(env.INVESTIGATIONS, prefix);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM login_tokens WHERE email = ?').bind(user.email),
    env.DB.prepare('DELETE FROM rate_limits WHERE bucket = ?').bind(`email:${await sha256Hex(rateLimitMailbox(user.email))}`),
    env.DB.prepare('DELETE FROM dev_outbox WHERE to_email = ?').bind(user.email),
  ]);
  // Review 1 L5: an upload that was in flight may have written its bytes after the first listing; sweep once more now
  // that no row can be reserved for this user any more (the foreign key refuses it).
  await deletePrefix(env.INVESTIGATIONS, prefix);
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(env, request) });
}

async function deletePrefix(bucket: R2Bucket, prefix: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    if (page.objects.length) await bucket.delete(page.objects.map(o => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
