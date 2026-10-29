import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { api, cookieFrom, latestToken, requestLink, signIn } from './helpers';
import { DEFAULT_LINKS_PER_HOUR, EMAIL_RATE_LIMIT, maskEmail, normaliseEmail, rateLimitMailbox } from '../src/auth';

let n = 0;
const fresh = () => `student${++n}-${crypto.randomUUID().slice(0, 8)}@example.test`;

describe('magic-link sign-in', () => {
  it('normalises and validates email addresses', () => {
    expect(normaliseEmail('  Ada@Example.ORG ')).toBe('ada@example.org');
    expect(normaliseEmail('o.brien+vireo@mail.xn--p1ai')).toBe('o.brien+vireo@mail.xn--p1ai');
    for (const bad of ['', 'a', 'a@b', 'a@@b.c', '@b.c', 'a b@c.d', 'a@.c', 'a@c.', 'x\u0000@y.z', 1, null, `${'a'.repeat(250)}@b.cd`,
      'a@b.com>,<c.d', 'a..b@c.de', '.a@c.de', 'a.@c.de', 'a@-c.de', 'a@c-.de', 'a@c.d1', 'a@c_d.de', 'a"b@c.de', `${'a'.repeat(65)}@c.de`, 'ü@c.de']) expect(normaliseEmail(bad)).toBeNull();
  });

  it('keys rate limits by mailbox: plus tags and Gmail dots share one bucket (review 1 L4)', () => {
    expect(rateLimitMailbox('victim+3@example.test')).toBe('victim@example.test');
    expect(rateLimitMailbox('v.i.c.tim+x@googlemail.com')).toBe('victim@gmail.com');
    expect(rateLimitMailbox('v.i.c.tim@example.test')).toBe('v.i.c.tim@example.test');
    expect(maskEmail('learner@example.test')).toBe('l••••••@example.test');
    expect(maskEmail('ab@example.test')).toBe('a•@example.test');
  });

  it('counts plus-addressed requests against the same mailbox', async () => {
    const base = `plus${crypto.randomUUID().slice(0, 8)}`;
    const statuses: number[] = [];
    for (let i = 0; i <= EMAIL_RATE_LIMIT; i++) statuses.push((await requestLink(`${base}+${i}@example.test`, { headers: { 'CF-Connecting-IP': `203.0.113.${i + 1}` } })).status);
    expect(statuses).toEqual([...Array(EMAIL_RATE_LIMIT).fill(202), 429]);
  });

  it('applies a global hourly cap on sign-in emails', async () => {
    const now = Date.now(), windowStart = now - (now % (60 * 60 * 1000));
    await env.DB.prepare('INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, ?) ON CONFLICT(bucket, window_start) DO UPDATE SET count = excluded.count')
      .bind('global', windowStart, DEFAULT_LINKS_PER_HOUR).run();
    try {
      expect((await requestLink(fresh())).status).toBe(429);
    } finally {
      await env.DB.prepare('DELETE FROM rate_limits WHERE bucket = ?').bind('global').run();
    }
  });

  it('retires older links when a new one is requested and when one is used (review 1 L2, P5)', async () => {
    const email = fresh();
    await requestLink(email); const first = await latestToken(email);
    await requestLink(email); const second = await latestToken(email);
    const verify = (token: string, cookie?: string) => api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token }), cookie });
    expect((await verify(first)).status).toBe(400);
    // Direct insertion of a sibling token (as if two links raced) is retired by the verify that uses the other one.
    const sibling = 'S'.repeat(43);
    const { sha256Hex } = await import('../src/crypto');
    await env.DB.prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(await sha256Hex(sibling), email, Date.now(), Date.now() + 60_000).run();
    expect((await verify(second)).status).toBe(200);
    expect((await verify(sibling)).status).toBe(400);
  });

  it('peeks at a link without consuming it and shows only a masked address (review 1 L1)', async () => {
    const email = fresh();
    await requestLink(email);
    const token = await latestToken(email);
    const peek = await api('/api/auth/peek', { method: 'POST', body: JSON.stringify({ token }) });
    expect(peek.status).toBe(200);
    const body = await peek.json() as { email: string };
    expect(body.email).toMatch(/^s•+@example\.test$/);
    expect(body.email).not.toContain(email.split('@')[0]);
    const verified = await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token }) });
    expect(await verified.json()).toEqual({ ok: true, email });
    expect((await api('/api/auth/peek', { method: 'POST', body: JSON.stringify({ token }) })).status).toBe(400);
  });

  it('rotates the session on sign-in and signs out everywhere (review 1 L2)', async () => {
    const email = fresh();
    const a = await signIn(email), b = await signIn(email);
    // Signing in again from browser A replaces A's old session row.
    await requestLink(email);
    const rotated = await api('/api/auth/verify', { method: 'POST', cookie: a, body: JSON.stringify({ token: await latestToken(email) }) });
    const a2 = cookieFrom(rotated);
    expect(await (await api('/api/session', { cookie: a })).json()).toEqual({ signedIn: false });
    expect((await (await api('/api/session', { cookie: a2 })).json() as { signedIn: boolean }).signedIn).toBe(true);
    const all = await api('/api/auth/signout-all', { method: 'POST', cookie: a2 });
    expect(all.status).toBe(200);
    expect(all.headers.get('Set-Cookie')).toContain('Max-Age=0');
    for (const cookie of [a2, b]) expect(await (await api('/api/session', { cookie })).json()).toEqual({ signedIn: false });
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
