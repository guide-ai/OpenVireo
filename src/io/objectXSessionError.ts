/** Front D3: ObjectXSessionError, split out unchanged from objectXInvestigation.ts so the analyzer can recognise it without loading the
 * session code (re-exported by objectXInvestigation.ts). */
export class ObjectXSessionError extends Error{
 constructor(readonly code:'format'|'bounds'|'record'|'replay'|'digest'){super(`Object X investigation: ${code}`);this.name='ObjectXSessionError';}
}
