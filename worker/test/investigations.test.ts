import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { api, signIn, synthetic, upload } from './helpers';
import { MAX_INVESTIGATION_BYTES } from '../src/investigations';
import { sha256Hex } from '../src/crypto';

const fresh = () => `saver-${crypto.randomUUID().slice(0, 8)}@example.test`;

describe('cloud investigations', () => {
  it('stores the exact bytes, lists them and returns them unchanged to the owner only', async () => {
    const cookie = await signIn(fresh()), other = await signIn(fresh());
    const text = synthetic.plain(2);
    const created = await upload(cookie, text, 'Hubble — night 1');
    expect(created.status).toBe(201);
    const { investigation } = await created.json() as { investigation: { id: string; sha256: string; exercises: string[]; name: string } };
    expect(investigation).toMatchObject({ name: 'Hubble — night 1', sha256: await sha256Hex(text), exercises: ['E01'] });
    const list = await (await api('/api/investigations', { cookie })).json() as { investigations: { id: string }[] };
    expect(list.investigations.map(i => i.id)).toEqual([investigation.id]);
    const download = await api(`/api/investigations/${investigation.id}`, { cookie });
    expect(download.status).toBe(200);
    expect(download.headers.get('Content-Disposition')).toBe('attachment; filename="openvireo-session.json"');
    expect(await download.text()).toBe(text);
    expect((await api(`/api/investigations/${investigation.id}`, { cookie: other })).status).toBe(404);
    expect((await api(`/api/investigations/${investigation.id}`, { method: 'DELETE', cookie: other })).status).toBe(404);
    expect((await api(`/api/investigations/../../x`, { cookie })).status).toBe(404);
    expect((await (await api('/api/investigations', { cookie: other })).json() as { investigations: unknown[] }).investigations).toEqual([]);
  });

  it('requires a session', async () => {
    expect((await upload('', synthetic.plain())).status).toBe(401);
    expect((await api('/api/investigations')).status).toBe(401);
  });

  it('validates names, content type, length, encoding and format', async () => {
    const cookie = await signIn(fresh());
    expect((await upload(cookie, synthetic.plain(), '')).status).toBe(400);
    expect((await upload(cookie, synthetic.plain(), 'x'.repeat(121))).status).toBe(400);
    expect((await upload(cookie, synthetic.plain(), 'tab\there')).status).toBe(400);
    expect((await upload(cookie, synthetic.plain(), 'ok', { headers: { 'Content-Type': 'text/plain' } })).status).toBe(415);
    expect((await upload(cookie, '{"format":"Something else","version":1}')).status).toBe(400);
    expect((await upload(cookie, '{"format":"OpenVireo analysis session","version":"31"}')).status).toBe(400);
    expect((await upload(cookie, 'not json')).status).toBe(400);
    expect((await upload(cookie, new Uint8Array([0x7b, 0xff, 0x7d]))).status).toBe(400);
    expect((await upload(cookie, '﻿' + synthetic.plain())).status).toBe(400);
    const noLength = await api('/api/investigations', { method: 'POST', cookie, body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(synthetic.plain())); c.close(); } }), headers: { 'Content-Type': 'application/json', 'X-OpenVireo-Name': 'x' }, duplex: 'half' } as RequestInit);
    expect(noLength.status).toBe(411);
  });

  it('refuses files over the Restore cap, by header and by body', async () => {
    const cookie = await signIn(fresh());
    const declared = await api('/api/investigations', { method: 'POST', cookie, body: synthetic.plain(), headers: { 'Content-Type': 'application/json', 'Content-Length': String(MAX_INVESTIGATION_BYTES + 1), 'X-OpenVireo-Name': 'big' } });
    expect(declared.status).toBe(413);
    const huge = new Uint8Array(MAX_INVESTIGATION_BYTES + 1).fill(0x20);
    expect((await upload(cookie, huge)).status).toBe(413);
  });

  it('holds the quota under concurrent uploads (review 1 M1, P1)', async () => {
    const cookie = await signIn(fresh());
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => upload(cookie, synthetic.plain(), `parallel ${i}`)));
    const statuses = results.map(r => r.status);
    expect(statuses.filter(s => s === 201)).toHaveLength(3);
    expect(statuses.filter(s => s === 413)).toHaveLength(9);
    const list = await (await api('/api/investigations', { cookie })).json() as { investigations: { id: string }[] };
    expect(list.investigations).toHaveLength(3);
    const userId = (await env.DB.prepare('SELECT user_id FROM investigations WHERE id = ?').bind(list.investigations[0].id).first<{ user_id: string }>())!.user_id;
    expect((await env.INVESTIGATIONS.list({ prefix: `inv/${userId}/` })).objects).toHaveLength(3);
  });

  it('enforces the per-user quota and derives progress from the index', async () => {
    const cookie = await signIn(fresh());
    expect((await upload(cookie, synthetic.plain(), 'one')).status).toBe(201);
    const wrapped = await (await upload(cookie, synthetic.wrapped(), 'two')).json() as { investigation: { id: string; exercises: string[] } };
    expect(wrapped.investigation.exercises).toEqual(['E02', 'E04', 'E06', 'E08']);
    const practice = await (await upload(cookie, synthetic.practice(), 'three')).json() as { investigation: { id: string; exercises: string[] } };
    expect(practice.investigation.exercises).toEqual(['E03']);
    const over = await upload(cookie, synthetic.plain(), 'four');
    expect(over.status).toBe(413); expect(await over.json()).toEqual({ error: 'quota' });
    const progress = await (await api('/api/progress', { cookie })).json() as { progress: { exerciseId: string; investigationId: string; status: string; results: unknown }[] };
    expect(progress.progress.map(p => p.exerciseId)).toEqual(['E01', 'E02', 'E03', 'E04', 'E06', 'E08']);
    expect(progress.progress.find(p => p.exerciseId === 'E03')).toMatchObject({ investigationId: practice.investigation.id, status: 'saved-work', results: { derived: false, reason: 'results-not-derived-v1' } });
    expect((await api(`/api/investigations/${wrapped.investigation.id}`, { method: 'DELETE', cookie })).status).toBe(200);
    const after = await (await api('/api/progress', { cookie })).json() as { progress: { exerciseId: string }[] };
    expect(after.progress.map(p => p.exerciseId)).toEqual(['E01', 'E03']);
    const keys = await env.INVESTIGATIONS.list({ prefix: 'inv/' });
    expect(keys.objects.some(o => o.key.includes(wrapped.investigation.id))).toBe(false);
  });
});
