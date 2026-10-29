import { isLoopbackOrigin, positiveIntVar, requestIsLoopback, type Env } from './env';
import { HttpError, hasControlCharacters, json, readJsonBody } from './http';
import { isTokenShape, randomToken, sha256Hex } from './crypto';
import { emailSender } from './email';
import { allowHit, pruneRateLimits } from './rateLimit';

export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SEEN_REFRESH_MS = 60 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000, GLOBAL_WINDOW_MS = 60 * 60 * 1000;
export const EMAIL_RATE_LIMIT = 3, IP_RATE_LIMIT = 20, DEFAULT_LINKS_PER_HOUR = 200;
export const SECURE_COOKIE = '__Host-ov_session', LOOPBACK_COOKIE = 'ov_session';

export type SessionUser = Readonly<{
  id: string; email: string; alias: string | null; termsVersion: string | null; ageConfirmedAt: number | null;
}>;

const LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/;

/** Normalised (trimmed, lower-cased) email or null. Local part: dot-atom; domain: LDH labels (IDN as punycode), at
 * least two labels, an alphabetic or punycode top-level label (review 1 L4). */
export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254 || hasControlCharacters(email)) return null;
  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return null;
  const local = email.slice(0, at), domain = email.slice(at + 1);
  if (local.length > 64 || !LOCAL_PART.test(local)) return null;
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every(l => DOMAIN_LABEL.test(l))) return null;
  const top = labels[labels.length - 1];
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(top)) return null;
  return email;
}

/** Rate-limit key only (the account and the link still use the exact address): one bucket per mailbox, so `+tag`
 * variants and Gmail dots cannot multiply a victim's or an attacker's allowance. */
export function rateLimitMailbox(email: string): string {
  const at = email.indexOf('@');
  let local = email.slice(0, at).split('+')[0];
  let domain = email.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

/** Dev-only insecure cookie: asked for, with a loopback APP_ORIGIN, on a request that arrived on loopback (M2). */
function insecureLoopback(env: Env, request: Request): boolean {
  return env.COOKIE_INSECURE_LOOPBACK === '1' && isLoopbackOrigin(env.APP_ORIGIN) && requestIsLoopback(request);
}

export function sessionCookie(env: Env, request: Request, value: string, maxAgeSeconds: number): string {
  return insecureLoopback(env, request)
    ? `${LOOPBACK_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}`
    : `${SECURE_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(env: Env, request: Request): string { return sessionCookie(env, request, '', 0); }

function readSessionCookie(request: Request, env: Env): string | null {
  const name = insecureLoopback(env, request) ? LOOPBACK_COOKIE : SECURE_COOKIE;
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
  const sender = emailSender(env, request);
  if (!sender || !env.APP_ORIGIN) throw new HttpError(503, 'email-not-configured');
  const now = Date.now();
  // CF-Connecting-IP is trustworthy only behind Cloudflare's edge; locally it is absent ('local') or spoofable.
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  // Every bucket is counted on every request so a flood cannot hide behind many addresses or many clients.
  const ipOk = await allowHit(env.DB, `ip:${await sha256Hex(ip)}`, IP_RATE_LIMIT, RATE_WINDOW_MS, now);
  const emailOk = await allowHit(env.DB, `email:${await sha256Hex(rateLimitMailbox(email))}`, EMAIL_RATE_LIMIT, RATE_WINDOW_MS, now);
  const globalOk = await allowHit(env.DB, 'global', positiveIntVar(env.MAX_LINKS_PER_HOUR, DEFAULT_LINKS_PER_HOUR), GLOBAL_WINDOW_MS, now);
  if (!ipOk || !emailOk || !globalOk) throw new HttpError(429, 'rate-limited');
  await housekeeping(env.DB, now);
  const token = randomToken();
  // A new link retires every older unused link for this address (review 1 L2).
  await env.DB.batch([
    env.DB.prepare('UPDATE login_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL').bind(now, email),
    env.DB.prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256Hex(token), email, now, now + TOKEN_TTL_MS),
  ]);
  const link = `${new URL(env.APP_ORIGIN).origin}/#signin=${token}`;
  await sender.send({
    to: email,
    subject: 'Your OpenVireo sign-in link',
    text: `Open this link to sign in to OpenVireo. It works once, expires in 15 minutes, and replaces any earlier link.\n\n${link}\n\n` +
      'If you did not ask for it, ignore this message; no account is created until the link is used.',
  });
  return json({ ok: true }, 202);
}

async function housekeeping(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM login_tokens WHERE expires_at < ?').bind(now - TOKEN_TTL_MS),
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
  ]);
  await pruneRateLimits(db, now - 2 * GLOBAL_WINDOW_MS);
}

/** Masks an address for display before sign-in completes: first character of the local part, then the domain. */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  return `${email[0]}${'•'.repeat(Math.max(1, Math.min(6, at - 1)))}${email.slice(at)}`;
}

/** POST /api/auth/peek — non-consuming: which (masked) address a link would sign in, so the user confirms before
 * completing (review 1 L1, login CSRF). Unknown, used and expired tokens get the same 400 as verify. */
export async function peekLink(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isTokenShape(body.token)) throw new HttpError(400, 'invalid-or-expired');
  const row = await env.DB.prepare('SELECT email FROM login_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
    .bind(await sha256Hex(body.token), Date.now()).first<{ email: string }>();
  if (!row) throw new HttpError(400, 'invalid-or-expired');
  return json({ email: maskEmail(row.email) });
}

/** POST /api/auth/verify — single use and expiry in one atomic statement; retires sibling links; rotates the session. */
export async function verifyLink(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isTokenShape(body.token)) throw new HttpError(400, 'invalid-or-expired');
  const now = Date.now();
  const row = await env.DB.prepare(
    'UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING email',
  ).bind(now, await sha256Hex(body.token), now).first<{ email: string }>();
  if (!row) throw new HttpError(400, 'invalid-or-expired');
  const previous = readSessionCookie(request, env);
  await env.DB.batch([
    env.DB.prepare('UPDATE login_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL').bind(now, row.email),
    ...(previous ? [env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256Hex(previous))] : []),
    env.DB.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING')
      .bind(randomToken(16), row.email, now),
  ]);
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(row.email).first<{ id: string }>();
  if (!user) throw new HttpError(500, 'internal');
  const sessionId = randomToken();
  await env.DB.prepare('INSERT INTO sessions (id_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256Hex(sessionId), user.id, now, now + SESSION_TTL_MS, now).run();
  return json({ ok: true, email: row.email }, 200, { 'Set-Cookie': sessionCookie(env, request, sessionId, SESSION_TTL_MS / 1000) });
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
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(env, request) });
}

/** POST /api/auth/signout-all — ends every session of this account, on every device (review 1 L2). */
export async function signOutEverywhere(request: Request, env: Env, user: SessionUser): Promise<Response> {
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(env, request) });
}
