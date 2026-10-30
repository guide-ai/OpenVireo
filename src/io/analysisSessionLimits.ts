/** Front D3: the analysis session's row limit and error class, split out unchanged from io/analysisSession so the
 * analyzer can check them without loading the session code (re-exported by io/analysisSession). */
export const MAX_SESSION_ROWS=1000;
export class AnalysisSessionError extends Error {
  constructor(readonly code:'size'|'format'|'state'|'measurements'|'observation'|'resources') {super(`Analysis session: ${code}`);this.name='AnalysisSessionError';}
}
