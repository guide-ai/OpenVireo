/** Front A: the optional cloud account exists only in builds made with VITE_OPENVIREO_CLOUD=1 (today: the local
 * backend flow, docs/BACKEND-LOCAL.md). Every other build renders nothing from src/cloud and makes no request. */
// Plain (not optional-chained) so Vite replaces it at build time and drops the cloud chunk from ordinary builds.
export const CLOUD_ENABLED=import.meta.env.VITE_OPENVIREO_CLOUD==='1';
/** Same-origin API prefix (production shape: Workers serving the site and /api together). */
export const CLOUD_API='/api';
/** Restore's own cap (src/io/analysisSession.ts MAX_SESSION_BYTES); the worker enforces the same value. */
export const CLOUD_MAX_BYTES=16*1024*1024+4096;
