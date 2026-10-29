import type { Env } from './env';
import { HttpError, errorResponse, json, requireSameOriginWrite, withBaseHeaders } from './http';
import { currentUser, requestLink, requireUser, signOut, verifyLink } from './auth';
import { devSinkEnabled } from './email';
import { deleteInvestigation, downloadInvestigation, listInvestigations, progressRows, uploadInvestigation } from './investigations';
import { getPreferences, putPreferences } from './preferences';
import { acceptTerms, deleteAccount, exportAccount, putProfile, sessionBody, termsGate } from './account';
import { normaliseEmail } from './auth';

async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!path.startsWith('/api/')) throw new HttpError(404, 'not-found');
  const write = method !== 'GET' && method !== 'HEAD';
  if (write) requireSameOriginWrite(request, env);

  if (path === '/api/session' && method === 'GET') return json(sessionBody(env, await currentUser(request, env)));
  if (path === '/api/auth/request' && method === 'POST') return requestLink(request, env);
  if (path === '/api/auth/verify' && method === 'POST') return verifyLink(request, env);
  if (path === '/api/auth/signout' && method === 'POST') return signOut(request, env);

  if (path === '/api/dev/outbox' && method === 'GET') {
    if (!devSinkEnabled(env)) throw new HttpError(404, 'not-found');
    const to = normaliseEmail(url.searchParams.get('to'));
    if (!to) throw new HttpError(400, 'email');
    const row = await env.DB.prepare('SELECT subject, body, created_at FROM dev_outbox WHERE to_email = ? ORDER BY id DESC LIMIT 1').bind(to).first();
    if (!row) throw new HttpError(404, 'not-found');
    return json({ message: row });
  }

  const user = await requireUser(request, env);
  // Session, terms, export and delete stay reachable whatever the terms policy says (plan §6).
  if (path === '/api/account/terms' && method === 'POST') return acceptTerms(request, env, user);
  if (path === '/api/account/export' && method === 'GET') return exportAccount(env, user, ctx);
  if (path === '/api/account' && method === 'DELETE') return deleteAccount(request, env, user);
  termsGate(env, user);
  if (path === '/api/account/profile' && method === 'PUT') return putProfile(request, env, user);
  if (path === '/api/preferences' && method === 'GET') return getPreferences(env, user);
  if (path === '/api/preferences' && method === 'PUT') return putPreferences(request, env, user);
  if (path === '/api/progress' && method === 'GET') return json({ progress: await progressRows(env, user.id) });
  if (path === '/api/investigations' && method === 'GET') return listInvestigations(env, user);
  if (path === '/api/investigations' && method === 'POST') return uploadInvestigation(request, env, user);
  const match = /^\/api\/investigations\/([^/]+)$/.exec(path);
  if (match && method === 'GET') return downloadInvestigation(env, user, match[1]);
  if (match && method === 'DELETE') return deleteInvestigation(env, user, match[1]);
  throw new HttpError(404, 'not-found');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return withBaseHeaders(await route(request, env, ctx));
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error);
      console.error('[openvireo-api] internal error', error instanceof Error ? error.name : 'unknown');
      return errorResponse(new HttpError(500, 'internal'));
    }
  },
} satisfies ExportedHandler<Env>;
