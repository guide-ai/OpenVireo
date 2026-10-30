/** Front D3: LssSessionError, split out unchanged from lssInvestigation.ts so the analyzer can recognise it without loading the
 * session code (re-exported by lssInvestigation.ts). */
export class LssSessionError extends Error{
 constructor(readonly code:'format'|'bounds'|'record'|'replay'|'digest'){super(`LSS investigation: ${code}`);this.name='LssSessionError';}
}
