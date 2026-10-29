import { positiveIntVar, type Env } from './env';
import { HttpError, hasControlCharacters, json, readCapped } from './http';
import { randomToken, sha256Hex } from './crypto';
import { DERIVER_VERSION, deriveProgress, investigationShape } from './progress';
import type { SessionUser } from './auth';

/** Restore's own cap (src/io/analysisSession.ts MAX_SESSION_BYTES = 16 MiB + MAX_PROJECT_METADATA_GROWTH 4096). */
export const MAX_INVESTIGATION_BYTES = 16 * 1024 * 1024 + 4096;
export const MAX_NAME_LENGTH = 120;

type IndexRow = { id: string; name: string; size_bytes: number; sha256: string; format: string; format_version: number; exercises: string; created_at: number; r2_key: string };

export function readName(header: string | null): string {
  if (header === null) throw new HttpError(400, 'name');
  let name: string;
  try { name = decodeURIComponent(header).trim(); } catch { throw new HttpError(400, 'name'); }
  if (name.length < 1 || [...name].length > MAX_NAME_LENGTH || hasControlCharacters(name)) throw new HttpError(400, 'name');
  return name;
}

function publicRow(row: IndexRow) {
  return { id: row.id, name: row.name, sizeBytes: row.size_bytes, sha256: row.sha256, format: row.format, version: row.format_version, exercises: JSON.parse(row.exercises) as string[], createdAt: row.created_at };
}

export async function listIndex(env: Env, userId: string): Promise<IndexRow[]> {
  const { results } = await env.DB.prepare(
    'SELECT id, name, size_bytes, sha256, format, format_version, exercises, created_at, r2_key FROM investigations WHERE user_id = ? ORDER BY created_at DESC, id DESC',
  ).bind(userId).all<IndexRow>();
  return results;
}

export async function listInvestigations(env: Env, user: SessionUser): Promise<Response> {
  return json({ investigations: (await listIndex(env, user.id)).map(publicRow) });
}

/** POST /api/investigations — stores the exact bytes of a Save investigation file. */
export async function uploadInvestigation(request: Request, env: Env, user: SessionUser): Promise<Response> {
  const type = request.headers.get('Content-Type') ?? '';
  if (!/^application\/json\b/i.test(type)) throw new HttpError(415, 'content-type');
  if (request.headers.get('Content-Length') === null) throw new HttpError(411, 'length-required');
  const name = readName(request.headers.get('X-OpenVireo-Name'));
  const bytes = await readCapped(request, MAX_INVESTIGATION_BYTES);
  // ignoreBOM keeps a leading BOM so JSON.parse rejects it: stored bytes must embed verbatim in the account export.
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)); } catch { throw new HttpError(400, 'json'); }
  const shape = investigationShape(value);
  if (!shape) throw new HttpError(400, 'format');
  const existing = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(size_bytes), 0) AS total FROM investigations WHERE user_id = ?')
    .bind(user.id).first<{ n: number; total: number }>();
  if ((existing?.n ?? 0) + 1 > positiveIntVar(env.MAX_INVESTIGATIONS, 20)
    || (existing?.total ?? 0) + bytes.byteLength > positiveIntVar(env.MAX_TOTAL_BYTES, 128 * 1024 * 1024)) throw new HttpError(413, 'quota');
  const id = randomToken(16), r2Key = `inv/${user.id}/${id}.json`, sha256 = await sha256Hex(bytes), now = Date.now();
  await env.INVESTIGATIONS.put(r2Key, bytes, { httpMetadata: { contentType: 'application/json' }, sha256 });
  try {
    await env.DB.prepare(
      'INSERT INTO investigations (id, user_id, name, r2_key, size_bytes, sha256, format, format_version, exercises, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, user.id, name, r2Key, bytes.byteLength, sha256, shape.format, shape.version, JSON.stringify(shape.exercises), now).run();
  } catch (error) {
    await env.INVESTIGATIONS.delete(r2Key);
    throw error;
  }
  await refreshProgress(env, user.id);
  return json({ investigation: { id, name, sizeBytes: bytes.byteLength, sha256, format: shape.format, version: shape.version, exercises: shape.exercises, createdAt: now } }, 201);
}

async function ownedRow(env: Env, user: SessionUser, id: string): Promise<IndexRow> {
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) throw new HttpError(404, 'not-found');
  const row = await env.DB.prepare(
    'SELECT id, name, size_bytes, sha256, format, format_version, exercises, created_at, r2_key FROM investigations WHERE id = ? AND user_id = ?',
  ).bind(id, user.id).first<IndexRow>();
  if (!row) throw new HttpError(404, 'not-found');
  return row;
}

/** GET /api/investigations/:id — the stored bytes, owner only (404 for anyone else). */
export async function downloadInvestigation(env: Env, user: SessionUser, id: string): Promise<Response> {
  const row = await ownedRow(env, user, id);
  const object = await env.INVESTIGATIONS.get(row.r2_key);
  if (!object) throw new HttpError(404, 'not-found');
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="openvireo-session.json"',
      'Content-Length': String(row.size_bytes),
      'X-OpenVireo-SHA256': row.sha256,
    },
  });
}

export async function deleteInvestigation(env: Env, user: SessionUser, id: string): Promise<Response> {
  const row = await ownedRow(env, user, id);
  await env.INVESTIGATIONS.delete(row.r2_key);
  await env.DB.prepare('DELETE FROM investigations WHERE id = ? AND user_id = ?').bind(row.id, user.id).run();
  await refreshProgress(env, user.id);
  return json({ ok: true });
}

/** Recomputes exercise_progress from the index (cheap; no file is re-read). */
export async function refreshProgress(env: Env, userId: string): Promise<void> {
  const index = (await listIndex(env, userId)).map(r => ({ id: r.id, createdAt: r.created_at, exercises: JSON.parse(r.exercises) as string[] }));
  const now = Date.now();
  const rows = deriveProgress(index);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM exercise_progress WHERE user_id = ?').bind(userId),
    ...rows.filter(r => r.status !== 'none').map(r => env.DB.prepare(
      'INSERT INTO exercise_progress (user_id, exercise_id, investigation_id, status, results, deriver_version, derived_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(userId, r.exerciseId, r.investigationId, r.status, JSON.stringify(r.results), DERIVER_VERSION, now)),
  ]);
}

export async function progressRows(env: Env, userId: string) {
  const { results } = await env.DB.prepare(
    'SELECT exercise_id, investigation_id, status, results, deriver_version, derived_at FROM exercise_progress WHERE user_id = ? ORDER BY exercise_id',
  ).bind(userId).all<{ exercise_id: string; investigation_id: string | null; status: string; results: string; deriver_version: string; derived_at: number }>();
  return results.map(r => ({ exerciseId: r.exercise_id, investigationId: r.investigation_id, status: r.status, results: JSON.parse(r.results) as unknown, deriverVersion: r.deriver_version, derivedAt: r.derived_at }));
}
