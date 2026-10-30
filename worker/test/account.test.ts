import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { api, signIn, synthetic, upload } from './helpers';
import { devSinkEnabled } from '../src/email';
import { isLoopbackOrigin } from '../src/env';
import { readPreferences } from '../src/preferences';
import { termsGate } from '../src/account';
import { sessionCookie } from '../src/auth';

const fresh = () => `account-${crypto.randomUUID().slice(0, 8)}@example.test`;

describe('profile and preferences', () => {
  it('sets and clears the alias with validation', async () => {
    const cookie = await signIn(fresh());
    const put = (alias: unknown) => api('/api/account/profile', { method: 'PUT', cookie, body: JSON.stringify({ alias }) });
    expect(await (await put('  Hubble fan ')).json()).toEqual({ alias: 'Hubble fan' });
    expect((await put('x'.repeat(41))).status).toBe(400);
    expect((await put('bad\nalias')).status).toBe(400);
    expect((await put(7)).status).toBe(400);
    expect(await (await put(null)).json()).toEqual({ alias: null });
  });

  it('keeps only allowlisted preferences', async () => {
    const cookie = await signIn(fresh());
    const doc = { theme: 'dark', language: 'es-419', telescope: { limitSlewing: true, rateIndex: 2 } };
    expect((await api('/api/preferences', { method: 'PUT', cookie, body: JSON.stringify(doc) })).status).toBe(200);
    expect(await (await api('/api/preferences', { cookie })).json()).toEqual({ preferences: doc });
    expect((await api('/api/account/profile', { method: 'PUT', cookie, body: JSON.stringify({ alias: 'evil\u202Eexe.txt' }) })).status).toBe(400);
    for (const bad of [{ theme: 'neon' }, { tracking: true }, { language: 'english please' }, { telescope: { a: { nested: 1 } } }, { telescope: [] }]) {
      expect(() => readPreferences(bad)).toThrow();
    }
    expect((await api('/api/preferences', { method: 'PUT', cookie, body: JSON.stringify({ email: 'x' }) })).status).toBe(400);
  });
});

describe('export and delete', () => {
  it('exports profile, preferences, progress and every investigation verbatim', async () => {
    const email = fresh(), cookie = await signIn(email);
    await api('/api/preferences', { method: 'PUT', cookie, body: JSON.stringify({ theme: 'light' }) });
    const a = synthetic.plain(3), b = synthetic.practice();
    await upload(cookie, a, 'first'); await upload(cookie, b, 'second');
    const response = await api('/api/account/export', { cookie });
    expect(response.headers.get('Content-Disposition')).toContain('openvireo-account-export.json');
    const doc = await response.json() as { format: string; profile: { email: string }; preferences: unknown; progress: unknown[]; investigations: { name: string; file: unknown }[] };
    expect(doc.format).toBe('OpenVireo account export');
    expect(doc.profile.email).toBe(email);
    expect(doc.preferences).toEqual({ theme: 'light' });
    expect(doc.progress.length).toBe(2);
    expect(doc.investigations.map(i => i.name)).toEqual(['second', 'first']);
    expect(doc.investigations[1].file).toEqual(JSON.parse(a));
    expect(doc.investigations[0].file).toEqual(JSON.parse(b));
    expect(doc.investigations.every(i => !('missing' in i))).toBe(true);
  });

  it('marks an investigation whose stored bytes are missing (review 1 I4)', async () => {
    const cookie = await signIn(fresh());
    const { investigation } = await (await upload(cookie, synthetic.plain())).json() as { investigation: { id: string } };
    const key = (await env.DB.prepare('SELECT r2_key FROM investigations WHERE id = ?').bind(investigation.id).first<{ r2_key: string }>())!.r2_key;
    await env.INVESTIGATIONS.delete(key);
    const doc = await (await api('/api/account/export', { cookie })).json() as { investigations: { file: unknown; missing?: boolean }[] };
    expect(doc.investigations).toMatchObject([{ file: null, missing: true }]);
  });

  it('deletes everything after confirming the email, and the session ends', async () => {
    const email = fresh(), cookie = await signIn(email);
    const { investigation } = await (await upload(cookie, synthetic.plain())).json() as { investigation: { id: string } };
    await api('/api/preferences', { method: 'PUT', cookie, body: JSON.stringify({ theme: 'dark' }) });
    expect((await api('/api/account', { method: 'DELETE', cookie, body: JSON.stringify({ confirmEmail: 'someone@else.test' }) })).status).toBe(400);
    const userId = (await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>())!.id;
    const deleted = await api('/api/account', { method: 'DELETE', cookie, body: JSON.stringify({ confirmEmail: email.toUpperCase() }) });
    expect(deleted.status).toBe(200);
    expect(deleted.headers.get('Set-Cookie')).toContain('Max-Age=0');
    for (const table of ['users WHERE id', 'sessions WHERE user_id', 'investigations WHERE user_id', 'preferences WHERE user_id', 'exercise_progress WHERE user_id']) {
      expect(await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} = ?`).bind(userId).first('n')).toBe(0);
    }
    for (const table of ['login_tokens WHERE email', 'dev_outbox WHERE to_email']) {
      expect(await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} = ?`).bind(email).first('n')).toBe(0);
    }
    expect((await env.INVESTIGATIONS.list({ prefix: `inv/${userId}/` })).objects).toEqual([]);
    expect(investigation.id).toBeTruthy();
    expect(await (await api('/api/session', { cookie })).json()).toEqual({ signedIn: false });
  });
});

describe('configuration fails closed', () => {
  const local = new Request('http://127.0.0.1:8787/api/session');
  const publicHost = new Request('https://openvireo.example/api/session');

  it('only honours the dev email sink with a loopback app origin and a loopback request host (review 1 M2)', () => {
    expect(isLoopbackOrigin('http://127.0.0.1:5175')).toBe(true);
    expect(isLoopbackOrigin('http://localhost:3000')).toBe(true);
    expect(isLoopbackOrigin('https://openvireo.example')).toBe(false);
    expect(isLoopbackOrigin('http://127.0.0.1.example.com')).toBe(false);
    expect(devSinkEnabled({ ...env, EMAIL_MODE: 'dev-sink', APP_ORIGIN: 'https://openvireo.example' }, local)).toBe(false);
    expect(devSinkEnabled({ ...env, EMAIL_MODE: 'smtp' }, local)).toBe(false);
    expect(devSinkEnabled(env, publicHost)).toBe(false);
    expect(devSinkEnabled(env, local)).toBe(true);
  });

  it('uses the dev-only loopback cookie only when asked, with a loopback app origin, on a loopback request (M2)', () => {
    const id = 'A'.repeat(43);
    expect(sessionCookie(env, local, id, 60)).toBe(`__Host-ov_session=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=60`);
    expect(sessionCookie({ ...env, COOKIE_INSECURE_LOOPBACK: '1' }, local, id, 60)).toBe(`ov_session=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=60`);
    expect(sessionCookie({ ...env, COOKIE_INSECURE_LOOPBACK: '1', APP_ORIGIN: 'https://openvireo.example' }, local, id, 60)).toMatch(/^__Host-ov_session=.*; Secure;/);
    expect(sessionCookie({ ...env, COOKIE_INSECURE_LOOPBACK: '1' }, publicHost, id, 60)).toMatch(/^__Host-ov_session=.*; Secure;/);
  });

  it('refuses every request on a public host while dev switches are configured (review 1 P3 regression)', async () => {
    const victim = `victim-${crypto.randomUUID().slice(0, 8)}@example.test`;
    await signIn(victim);
    const outbox = await SELF.fetch(`https://openvireo.example/api/dev/outbox?to=${encodeURIComponent(victim)}`);
    expect(outbox.status).toBe(503);
    expect(await outbox.json()).toEqual({ error: 'dev-config-on-public-host' });
    const request = await SELF.fetch('https://openvireo.example/api/auth/request', { method: 'POST', headers: { 'X-OpenVireo-CSRF': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: victim }) });
    expect(request.status).toBe(503);
    expect((await SELF.fetch('https://openvireo.example/api/session')).status).toBe(503);
  });

  it('applies no terms gate under the "none" policy and refuses unknown policies', () => {
    const user = { id: 'u', email: 'a@b.cd', alias: null, termsVersion: null, ageConfirmedAt: null };
    expect(() => termsGate({ ...env, TERMS_POLICY: 'none' }, user)).not.toThrow();
    expect(() => termsGate({ ...env, TERMS_POLICY: 'min-age-16' }, user)).toThrow('terms-policy-unknown');
  });

  it('records terms acceptance through the hook', async () => {
    const cookie = await signIn(fresh());
    expect((await api('/api/account/terms', { method: 'POST', cookie, body: JSON.stringify({ termsVersion: '2027-01', ageConfirmed: false }) })).status).toBe(400);
    expect((await api('/api/account/terms', { method: 'POST', cookie, body: JSON.stringify({ termsVersion: '2027-01', ageConfirmed: true }) })).status).toBe(200);
    expect(await (await api('/api/session', { cookie })).json()).toMatchObject({ user: { termsVersion: '2027-01', ageConfirmed: true } });
  });

  it('answers unknown routes without revealing them to signed-out callers', async () => {
    expect((await api('/api/nope')).status).toBe(401);
    expect((await api('/api/nope', { cookie: await signIn(fresh()) })).status).toBe(404);
    expect((await api('/elsewhere')).status).toBe(404);
    expect((await api('/api/dev/outbox?to=nobody@example.test')).status).toBe(404);
  });
});
