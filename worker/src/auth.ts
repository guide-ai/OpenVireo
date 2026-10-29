import { isLoopbackOrigin, type Env } from './env';
import { HttpError, hasControlCharacters, json, readJsonBody } from './http';
import { isTokenShape, randomToken, sha256Hex } from './crypto';
import { emailSender } from './email';
import { allowHit, pruneRateLimits } from './rateLimit';

export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SEEN_REFRESH_MS = 60 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
export const EMAIL_RATE_LIMIT = 3, IP_RATE_LIMIT = 20;
export const SECURE_COOKIE = '__Host-ov_session', LOOPBACK_COOKIE = 'ov_session';

export type SessionUser = Readonly<{
  id: string; email: string; alias: string | null; termsVersion: string | null; ageConfirmedAt: number | null;
}>;

/** Normalised email or null. Deliberately simple: one '@', non-empty parts, a dot in the domain, no spaces/controls. */
export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || hasControlCharacters(email) || /\s/.test(email)) return null;
  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return null;
  const domain = email.slice(at + 1);
  if (domain.length < 3 || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null;
  return email;
}

function insecureLoopback(env: Env): boolean {
  return env.COOKIE_INSECURE_LOOPBACK === '1' && isLoopbackOrigin(env.APP_ORIGIN);
}

export function sessionCookie(env: Env, value: string, maxAgeSeconds: number): string {
  return insecureLoopback(env)
    ? `${LOOPBACK_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}`
    : `${SECURE_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(env: Env): string { return sessionCookie(env, '', 0); }

function readSessionCookie(request: Request, env: Env): string | null {
  const name = insecureLoopback(env) ? LOOPBACK_COOKIE : SECURE_COOKIE;
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) { const value = rest.join('='); return isTokenShape(value) ? value : null; }
  }
  return null;
}

/** POST /api/auth/request — always the same 202 whether or not the account exists. */
export async function requestLink(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  const email = normaliseEmail(body.email);
  if (!email) throw new HttpError(400, 'email');
  const sender = emailSender(env);
  if (!sender || !env.APP_ORIGIN) throw new HttpError(503, 'email-not-configured');
  const now = Date.now();
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  // Both buckets are counted on every request so a flood from one address cannot hide behind many emails.
  const ipOk = await allowHit(env.DB, `ip:${await sha256Hex(ip)}`, IP_RATE_LIMIT, RATE_WINDOW_MS, now);
  const emailOk = await allowHit(env.DB, `email:${await sha256Hex(email)}`, EMAIL_RATE_LIMIT, RATE_WINDOW_MS, now);
  if (!ipOk || !emailOk) throw new HttpError(429, 'rate-limited');
  await housekeeping(env.DB, now);
  const token = randomToken();
  await env.DB.prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), email, now, now + TOKEN_TTL_MS).run();
  const link = `${new URL(env.APP_ORIGIN).origin}/#signin=${token}`;
  await sender.send({
    to: email,
    subject: 'Your OpenVireo sign-in link',
    text: `Open this link to sign in to OpenVireo. It works once and expires in 15 minutes.\n\n${link}\n\n` +
      'If you did not ask for it, ignore this message; no account is created until the link is used.',
  });
  return json({ ok: true }, 202);
}

async function housekeeping(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM login_tokens WHERE expires_at < ?').bind(now - TOKEN_TTL_MS),
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
  ]);
  await pruneRateLimits(db, now - 2 * RATE_WINDOW_MS);
}

/** POST /api/auth/verify — single use and expiry in one atomic statement. */
export async function verifyLink(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isTokenShape(body.token)) throw new HttpError(400, 'invalid-or-expired');
  const now = Date.now();
  const row = await env.DB.prepare(
    'UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING email',
  ).bind(now, await sha256Hex(body.token), now).first<{ email: string }>();
  if (!row) throw new HttpError(400, 'invalid-or-expired');
  await env.DB.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING')
    .bind(randomToken(16), row.email, now).run();
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(row.email).first<{ id: string }>();
  if (!user) throw new HttpError(500, 'internal');
  const sessionId = randomToken();
  await env.DB.prepare('INSERT INTO sessions (id_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256Hex(sessionId), user.id, now, now + SESSION_TTL_MS, now).run();
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(env, sessionId, SESSION_TTL_MS / 1000) });
}

export async function currentUser(request: Request, env: Env): Promise<SessionUser | null> {
  const sessionId = readSessionCookie(request, env);
  if (!sessionId) return null;
  const now = Date.now();
  const idHash = await sha256Hex(sessionId);
  const row = await env.DB.prepare(
    'SELECT u.id, u.email, u.alias, u.terms_version, u.age_confirmed_at, s.last_seen_at FROM sessions s ' +
    'JOIN users u ON u.id = s.user_id WHERE s.id_hash = ? AND s.expires_at > ?',
  ).bind(idHash, now).first<{ id: string; email: string; alias: string | null; terms_version: string | null; age_confirmed_at: number | null; last_seen_at: number }>();
  if (!row) return null;
  if (now - row.last_seen_at > SEEN_REFRESH_MS) {
    await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?').bind(now, idHash).run();
  }
  return { id: row.id, email: row.email, alias: row.alias, termsVersion: row.terms_version, ageConfirmedAt: row.age_confirmed_at };
}

export async function requireUser(request: Request, env: Env): Promise<SessionUser> {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, 'signed-out');
  return user;
}

/** POST /api/auth/signout */
export async function signOut(request: Request, env: Env): Promise<Response> {
  const sessionId = readSessionCookie(request, env);
  if (sessionId) await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256Hex(sessionId)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(env) });
}
