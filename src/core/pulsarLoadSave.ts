/**
 * R-RX18 E9 Load question Yes → verified Save → a separate, fresh Load choice (docs/PULSAR-LOAD-SAVE.md). Pure TypeScript: no
 * React, DOM, clock or storage. Every flow object is frozen; every step returns a new flow or a refusal and changes no document.
 *
 * Recovered statically (CLEA_VEO.exe SHA-256 781bc970…c54c, docs/PULSAR-LOAD-SAVE-PROVENANCE.json): [S] E9-PROMPT, Load1Click
 * 0x56af38 asks 0x56b1d0/0x56b258 (flags 0x13) when the list has rows and +0x97 is 0; Yes (6) calls the Save caller 0x56b36c at
 * 0x56afb7; a normal return falls into 0x56afbc with no saved-flag or success test. [S] E9-SELECTOR, the reader 0x56a260 runs
 * only at 0x56b093 after the OpenDialog accepted a file. [S] SAVE-WRITTEN, +0x97 is set only after close and the I/O check.
 *
 * WEB policy [W], a deliberately stricter adaptation (not native equivalence): Yes only opens the verified Save; only that flow's
 * own Save attempt, ending in a genuine receipt of the same data object and generation, makes the flow 'ready'; from 'ready' a
 * separate fresh click opens a dedicated chooser whose selection is bound to (flowId, invocation); the chosen file then goes
 * through the existing strict read, SHA-256 and import with the generation the flow was opened for. The saved flag
 * (pulsarCurrentSaved) is never the authority to load: it is used only to require unsaved data when the flow opens.
 * Not ported: the conditional warning (+0x64 bit 0x80), the thrown-I/O continuation, partial native read state and window effects.
 */
import { importPulsarRecording, isMemoryData, pulsarCurrentSaved, pulsarDataRows, pulsarOutputClaim, pulsarWrittenCopy,
  type PulsarCurrentData, type PulsarDataStep, type PulsarMemoryRecording, type PulsarWrittenCopy } from './pulsarCurrentData';
import type { PulsarAnalysisState } from './pulsarAnalysis';
import type { PlrRecording } from './pulsarRecording';
import type { PulsarSaveSupport } from './pulsarSavedCopy';

/** The data the flow was opened for: the memory capture object and the dataset generation the panel presented. */
export type LoadSaveContext = Readonly<{ flowId: number; generation: number; data: PulsarMemoryRecording }>;
/**
 * 'save': the verified Save dialog of this flow is open. 'ready': the flow's own Save was verified; the separate Load choice is
 * offered. 'choosing': a dedicated chooser invocation is outstanding. 'reading': its selected file is being read.
 */
export type LoadSavePhase = 'save' | 'ready' | 'choosing' | 'reading';
export type LoadSaveFlow = Readonly<{
  ctx: LoadSaveContext;
  phase: LoadSavePhase;
  /** The Save attempt token this flow owns (from the Save click), or null before the first attempt. */
  attempt: number | null;
  /** The genuine receipt that made the flow 'ready' (object identity), or null. */
  receipt: PulsarWrittenCopy | null;
  /** The latest dedicated chooser invocation; a selection or cancel of any other invocation is refused. */
  invocation: number | null;
  /** The document's `written` value when the flow opened (it was not a valid receipt then). A later receipt must differ. */
  prior: object | null;
}>;

export type LoadSaveOpenRefusal = 'input' | 'unsupported' | 'not-asking' | 'not-presented' | 'stale' | 'not-memory' | 'busy';
export type LoadSaveOpen = Readonly<{ ok: true; flow: LoadSaveFlow }> | Readonly<{ ok: false; reason: LoadSaveOpenRefusal }>;
const token = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
const flow = (f: LoadSaveFlow, patch: Partial<LoadSaveFlow>): LoadSaveFlow => Object.freeze({ ...f, ...patch });

/**
 * Yes of the E9 question. Refused, in order: a bad flow id ('input'); no browser Save support ('unsupported'); the question is
 * not open ('not-asking'); the panel presents no data (for example the refused 'No Data' placeholder, WEB-REC-NODATA:
 * 'not-presented'); the presented data is not the current object, or the presented generation is not the current one ('stale'); the current data is not a memory capture with rows, or it is already saved ('not-memory'; the question would not
 * apply); a capture lease or a held output claim ('busy'). Never a load permission: the result only starts the Save.
 */
export function loadSaveOpen(s: PulsarAnalysisState, doc: PulsarCurrentData, adoptedGeneration: number, support: PulsarSaveSupport, flowId: number): LoadSaveOpen {
  const refuse = (reason: LoadSaveOpenRefusal): LoadSaveOpen => Object.freeze({ ok: false, reason });
  if (!token(flowId)) return refuse('input');
  if (support !== 'ok') return refuse('unsupported');
  if (!s.loadPrompt) return refuse('not-asking');
  if (s.recording === null) return refuse('not-presented');
  if (doc.data !== s.recording || doc.generation !== adoptedGeneration) return refuse('stale');
  const d = doc.data;
  if (!isMemoryData(d) || pulsarDataRows(d) < 1 || pulsarCurrentSaved(doc)) return refuse('not-memory');
  if (doc.lease !== null || pulsarOutputClaim(doc) !== null) return refuse('busy');
  const ctx: LoadSaveContext = Object.freeze({ flowId, generation: doc.generation, data: d });
  const opened: LoadSaveFlow = Object.freeze({ ctx, phase: 'save', attempt: null, receipt: null, invocation: null, prior: doc.written ?? null });
  return Object.freeze({ ok: true, flow: opened });
}

/** The flow's context is still the current document: same generation, same data object, no capture lease. */
export const loadSaveLive = (f: LoadSaveFlow, doc: PulsarCurrentData) => doc.generation === f.ctx.generation && doc.data === f.ctx.data && doc.lease === null;
/** Live, and the current receipt is still exactly the receipt that made the flow ready. */
const receiptLive = (f: LoadSaveFlow, doc: PulsarCurrentData) => f.receipt !== null && loadSaveLive(f, doc) && pulsarWrittenCopy(doc) === f.receipt;

/** The Save click of this flow took attempt `attempt` (its output claim token). null: not this flow's Save phase or a bad token. */
export function loadSaveAttempt(f: LoadSaveFlow, flowId: number, attempt: number): LoadSaveFlow | null {
  if (f.ctx.flowId !== flowId || f.phase !== 'save' || !token(attempt)) return null;
  return flow(f, { attempt });
}

/**
 * The flow's own Save attempt verified. 'ready' only when: phase 'save'; the same flow and attempt token; the context is live;
 * the current receipt is genuine, of the flow's data object and generation, carries the attempt's file name and is not the
 * value the document held when the flow opened. Otherwise null (the flow is unchanged; a verified Save alone grants nothing).
 */
export function loadSaveVerified(f: LoadSaveFlow, doc: PulsarCurrentData, flowId: number, attempt: number, fileName: string): LoadSaveFlow | null {
  if (f.ctx.flowId !== flowId || f.phase !== 'save' || f.attempt === null || f.attempt !== attempt || !loadSaveLive(f, doc)) return null;
  const r = pulsarWrittenCopy(doc);
  if (r === null || r === f.prior || r.data !== f.ctx.data || r.generation !== f.ctx.generation || r.fileName !== fileName) return null;
  return flow(f, { phase: 'ready', receipt: r, invocation: null });
}

/**
 * Result of a choice step. `end`: the context or receipt is gone, the flow must end (nothing is imported). Otherwise the flow
 * stays as it was ('busy': the shared output claim is held; 'phase' / 'input': not a valid request).
 */
export type LoadSaveRefusal = Readonly<{ ok: false; reason: 'phase' | 'input' | 'busy' | 'stale'; end: boolean }>;
export type LoadSaveChoose = Readonly<{ ok: true; flow: LoadSaveFlow }> | LoadSaveRefusal;
const refused = (reason: LoadSaveRefusal['reason'], end = false): LoadSaveRefusal => Object.freeze({ ok: false, reason, end });

/**
 * A fresh Choose click. From 'ready' or 'choosing' of the same flow, while the receipt is still the current one and no output
 * claim is held, with an invocation newer than the last: 'choosing' with that invocation (an older invocation is superseded).
 */
export function loadSaveChoose(f: LoadSaveFlow, doc: PulsarCurrentData, flowId: number, invocation: number): LoadSaveChoose {
  if (f.ctx.flowId !== flowId || (f.phase !== 'ready' && f.phase !== 'choosing')) return refused('phase');
  if (!token(invocation) || (f.invocation !== null && invocation <= f.invocation)) return refused('input');
  if (!receiptLive(f, doc)) return refused('stale', true);
  if (pulsarOutputClaim(doc) !== null) return refused('busy');
  return Object.freeze({ ok: true, flow: flow(f, { phase: 'choosing', invocation }) });
}

/**
 * A change event of the dedicated input bound to (flowId, invocation). 'foreign': another flow or invocation, or no outstanding
 * choice (after a cancel or an empty selection): nothing changes and nothing is said. Otherwise the grant is consumed once:
 * 'empty' (no file) returns to 'ready'; 'ended' (the context or receipt changed) ends the flow; 'read' moves to 'reading' and
 * gives the generation the import must still find.
 */
export type LoadSaveSelection =
  | Readonly<{ kind: 'foreign' }>
  | Readonly<{ kind: 'empty'; flow: LoadSaveFlow }>
  | Readonly<{ kind: 'ended' }>
  | Readonly<{ kind: 'read'; flow: LoadSaveFlow; generation: number }>;
export function loadSaveSelected(f: LoadSaveFlow, doc: PulsarCurrentData, flowId: number, invocation: number | null, hasFile: boolean): LoadSaveSelection {
  if (f.ctx.flowId !== flowId || f.phase !== 'choosing' || invocation === null || f.invocation !== invocation) return Object.freeze({ kind: 'foreign' });
  if (!hasFile) return Object.freeze({ kind: 'empty', flow: flow(f, { phase: 'ready' }) });
  if (!receiptLive(f, doc)) return Object.freeze({ kind: 'ended' });
  return Object.freeze({ kind: 'read', flow: flow(f, { phase: 'reading' }), generation: f.ctx.generation });
}

/** The standard `cancel` event of the input bound to (flowId, invocation): back to 'ready' (grant consumed). Otherwise unchanged. */
export function loadSaveChoiceCancelled(f: LoadSaveFlow, flowId: number, invocation: number | null): LoadSaveFlow {
  if (f.ctx.flowId !== flowId || f.phase !== 'choosing' || invocation === null || f.invocation !== invocation) return f;
  return flow(f, { phase: 'ready' });
}

/** The read of (flowId, invocation) is still this flow's read, and its context and receipt are still current. */
export function loadSaveReadLive(f: LoadSaveFlow, doc: PulsarCurrentData, flowId: number, invocation: number): boolean {
  return f.ctx.flowId === flowId && f.phase === 'reading' && f.invocation === invocation && receiptLive(f, doc);
}
/** The read of (flowId, invocation) still belongs to this flow (whatever the document now holds). */
export const loadSaveReadOwned = (f: LoadSaveFlow | null, flowId: number, invocation: number): f is LoadSaveFlow =>
  f !== null && f.ctx.flowId === flowId && f.phase === 'reading' && f.invocation === invocation;

/**
 * The flow's import, applied to the latest document (inside the shared update): the read must still be live, then the unchanged
 * importPulsarRecording with the flow's generation. A dead read is refused as 'superseded' and changes nothing.
 */
export function loadSaveImport(doc: PulsarCurrentData, f: LoadSaveFlow, flowId: number, invocation: number, recording: PlrRecording): PulsarDataStep {
  if (!loadSaveReadLive(f, doc, flowId, invocation)) return Object.freeze({ doc, ok: false, reason: doc.lease ? 'capture-lease' : 'superseded' });
  return importPulsarRecording(doc, recording, f.ctx.generation);
}
