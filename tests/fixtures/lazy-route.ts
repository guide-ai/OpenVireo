/** Front QA2 (2026-10-31): the Galaxy exposure route is a lazy chunk shown under Suspense ("Loading supported galaxy
 * configuration…"); under load its heading takes longer than the 5 s default to appear (kpno09-galaxy already waited 30 s, L4).
 * Specs wait for that heading with this budget; other headings keep the default. */
export const GALAXY_EXPOSURE_HEADING='Acquire a Hubble galaxy.';
export const LAZY_ROUTE_TIMEOUT=30_000;
/** Options for a heading wait: the lazy-route budget for the Galaxy exposure heading, the default otherwise. */
export const headingWait=(heading:string)=>heading===GALAXY_EXPOSURE_HEADING?{timeout:LAZY_ROUTE_TIMEOUT}:{};
