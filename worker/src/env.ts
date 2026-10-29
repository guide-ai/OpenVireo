export interface Env {
  DB: D1Database;
  INVESTIGATIONS: R2Bucket;
  /** Browser origin that serves the app; state-changing requests must come from it. */
  APP_ORIGIN?: string;
  /** Only 'dev-sink' exists; honoured only with a loopback APP_ORIGIN (email.ts). */
  EMAIL_MODE?: string;
  /** Minimum-age/terms hook: only 'none' is implemented (account.ts). */
  TERMS_POLICY?: string;
  MAX_INVESTIGATIONS?: string;
  MAX_TOTAL_BYTES?: string;
  /** Global cap on sign-in emails per hour (all addresses together). */
  MAX_LINKS_PER_HOUR?: string;
  /** Dev-only: drop Secure/__Host- from the cookie, loopback APP_ORIGIN only. */
  COOKIE_INSECURE_LOOPBACK?: string;
}

/** True for http(s)://127.0.0.1, localhost, *.localhost and [::1] origins. */
export function isLoopbackOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  let url: URL;
  try { url = new URL(origin); } catch { return false; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname;
  return host === '127.0.0.1' || host === 'localhost' || host.endsWith('.localhost') || host === '[::1]';
}

/** True when the request itself arrived on a loopback host (wrangler dev, or the Vite proxy in front of it). */
export function requestIsLoopback(request: Request): boolean {
  return isLoopbackOrigin(new URL(request.url).origin);
}

/** Dev-only switches present in the configuration (the dev email sink, the insecure loopback cookie). */
export function devSwitchesConfigured(env: Env): boolean {
  return env.EMAIL_MODE === 'dev-sink' || env.COOKIE_INSECURE_LOOPBACK === '1';
}

export function positiveIntVar(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}
