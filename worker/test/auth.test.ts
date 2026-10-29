import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { api, cookieFrom, latestToken, requestLink, signIn } from './helpers';
import { EMAIL_RATE_LIMIT, normaliseEmail } from '../src/auth';

let n = 0;
const fresh = () => `student${++n}-${crypto.randomUUID().slice(0, 8)}@example.test`;

describe('magic-link sign-in', () => {
  it('normalises and validates email addresses', () => {
    expect(normaliseEmail('  Ada@Example.ORG ')).toBe('ada@example.org');
    for (const bad of ['', 'a', 'a@b', 'a@@b.c', '@b.c', 'a b@c.d', 'a@.c', 'a@c.', 'x\u0000@y.z', 1, null, `${'a'.repeat(250)}@b.cd`]) expect(normaliseEmail(bad)).toBeNull();
  });

  it('answers the same 202 for new and existing addresses (no enumeration) and stores only the token hash', async () => {
    const email = fresh();
    await signIn(email);
    const other = fresh();
    const existing = await requestLink(email), unknown = await requestLink(other);
    expect(existing.status).toBe(202); expect(unknown.status).toBe(202);
    expect(await existing.text()).toBe(await unknown.text());
    const token = await latestToken(email);
    const stored = await env.DB.prepare('SELECT token_hash FROM login_tokens WHERE email = ?').bind(email).all<{ token_hash: string }>();
    expect(stored.results.every(r => /^[0-9a-f]{64}$/.test(r.token_hash) && r.token_hash !== token)).toBe(true);
    // No account is created by a request alone.
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE email = ?').bind(other).first('n')).toBe(0);
  });

  it('creates the account only at the first verified sign-in and sets a hardened cookie', async () => {
    const email = fresh();
    await requestLink(email);
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE email = ?').bind(email).first('n')).toBe(0);
    const verified = await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token: await latestToken(email) }) });
    expect(verified.status).toBe(200);
    const cookie = verified.headers.get('Set-Cookie') ?? '';
    expect(cookie).toMatch(/^__Host-ov_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000$/);
    const session = await (await api('/api/session', { cookie: cookieFrom(verified) })).json();
    expect(session).toMatchObject({ signedIn: true, user: { email, alias: null } });
    const stored = await env.DB.prepare('SELECT s.id_hash FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email = ?').bind(email).first<{ id_hash: string }>();
    expect(stored?.id_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(cookieFrom(verified)).not.toContain(stored!.id_hash);
  });

  it('accepts a token once, and treats used, expired and unknown tokens identically', async () => {
    const email = fresh();
    await requestLink(email);
    const token = await latestToken(email);
    const body = JSON.stringify({ token });
    expect((await api('/api/auth/verify', { method: 'POST', body })).status).toBe(200);
    const reused = await api('/api/auth/verify', { method: 'POST', body });
    await requestLink(email);
    const second = await latestToken(email);
    await env.DB.prepare('UPDATE login_tokens SET expires_at = ? WHERE email = ? AND used_at IS NULL').bind(Date.now() - 1, email).run();
    const expired = await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token: second }) });
    const unknown = await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token: 'A'.repeat(43) }) });
    const malformed = await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token: 'short' }) });
    for (const r of [reused, expired, unknown, malformed]) { expect(r.status).toBe(400); expect(await r.json()).toEqual({ error: 'invalid-or-expired' }); }
  });

  it('rate-limits link requests per address', async () => {
    const email = fresh();
    for (let i = 0; i < EMAIL_RATE_LIMIT; i++) expect((await requestLink(email)).status).toBe(202);
    const limited = await requestLink(email);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'rate-limited' });
  });

  it('rate-limits link requests per client address', async () => {
    const headers = { 'CF-Connecting-IP': '198.51.100.7' };
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await requestLink(fresh(), { headers })).status);
    expect(statuses.slice(0, 20).every(s => s === 202)).toBe(true);
    expect(statuses[20]).toBe(429);
  });

  it('expires sessions and signs out', async () => {
    const email = fresh(), cookie = await signIn(email);
    expect((await (await api('/api/session', { cookie })).json() as { signedIn: boolean }).signedIn).toBe(true);
    const out = await api('/api/auth/signout', { method: 'POST', cookie });
    expect(out.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect(await (await api('/api/session', { cookie })).json()).toEqual({ signedIn: false });
    const again = await signIn(email);
    await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE user_id = (SELECT id FROM users WHERE email = ?)').bind(Date.now() - 1, email).run();
    expect(await (await api('/api/session', { cookie: again })).json()).toEqual({ signedIn: false });
    expect((await api('/api/investigations', { cookie: again })).status).toBe(401);
  });
});

describe('CSRF guard', () => {
  it('refuses writes without the custom header, from a foreign Origin or a cross-site fetch', async () => {
    const body = JSON.stringify({ email: fresh() });
    const noHeader = await api('/api/auth/request', { method: 'POST', body, csrf: false, headers: { Origin: 'http://127.0.0.1:5175' } });
    const foreign = await api('/api/auth/request', { method: 'POST', body, headers: { Origin: 'https://evil.example' } });
    const crossSite = await api('/api/auth/request', { method: 'POST', body, headers: { 'Sec-Fetch-Site': 'cross-site' } });
    for (const r of [noHeader, foreign, crossSite]) { expect(r.status).toBe(403); expect(await r.json()).toEqual({ error: 'csrf' }); }
    const ok = await api('/api/auth/request', { method: 'POST', body, headers: { 'Sec-Fetch-Site': 'same-origin' } });
    expect(ok.status).toBe(202);
  });

  it('never answers CORS and marks responses no-store', async () => {
    const preflight = await api('/api/investigations', { method: 'OPTIONS', csrf: false, headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
    expect(preflight.status).toBe(403);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const session = await api('/api/session');
    expect(session.headers.get('Cache-Control')).toBe('no-store');
    expect(session.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(session.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('rejects non-JSON and oversized small bodies', async () => {
    expect((await api('/api/auth/request', { method: 'POST', body: 'email=a@b.cd', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status).toBe(415);
    expect((await api('/api/auth/request', { method: 'POST', body: JSON.stringify({ email: 'a@b.cd', pad: 'x'.repeat(9000) }) })).status).toBe(413);
    expect((await api('/api/auth/request', { method: 'POST', body: '[1]' })).status).toBe(400);
  });
});
