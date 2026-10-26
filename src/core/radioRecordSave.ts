/**
 * R-RX16 Radio-owned verified Save from the Record arming "unsaved" prompt (docs/RADIO-RECORD-SAVE.md, WEB-RX16-01..08). Pure
 * TypeScript: no React, DOM, clock or storage. The browser calls stay in src/components/pulsarSaveHost.ts (R-RX15, reused
 * unchanged); the receipt is created only by recordPulsarWrittenCopy (src/core/pulsarCurrentData.ts, unchanged).
 *
 * Recovered statically (CLEA_VEO.exe SHA-256 781bc970…c54c; docs/RADIO-RECORD-SAVE-PROVENANCE.json): [S] E1 record-button
 * 0x57589f..0x5758bb, Yes (6) of the unsaved prompt (flags 0x13) calls the Save wrapper 0x56b36c, whose normal return falls into
 * 0x5758c0 (the second non-empty check and the separate erase prompt, flags 0x41) with no saved-flag or return-value test.
 * [W] web policy: Yes opens this Radio-owned Save preparation (no I/O, no picker); a separate Choose click calls the picker
 * synchronously; only a verified receipt continues to the erase prompt, and every other result stays in this dialog. Browser
 * cancel/refusal/I-O continuation is web policy, not the native normal return, and no SEH/exception path is modelled.
 *
 * The sub-state lives in the session's 'save' prompt. `attempt` is the token of the attempt that holds the shared output claim
 * (null: none). `abandoned`: that attempt was made dead by a hidden route, a project operation or an unmount; its later notices
 * are ignored and the claim stays held until its own cleanup settled.
 */
import { rawExportOpen, rawExportSaveNotice, type RawExportRefusal, type RawExportSession } from './pulsarRawExport';
import { pulsarSaveBegin, type PulsarSaveNotice } from './pulsarSavedCopy';
import { isMemoryData, pulsarOutputClaim, pulsarWrittenCopy, type PulsarCurrentData, type PulsarWriteClaim } from './pulsarCurrentData';

export type RadioRecordSave = Readonly<{
  /** An R-RX14/R-RX15 session with purpose 'save': the capture object, its generation, the preview shown and the last notice. */
  session: RawExportSession;
  attempt: number | null;
  abandoned: boolean;
}>;
export type RadioRecordSaveOpen = Readonly<{ ok: true; save: RadioRecordSave } | { ok: false; reason: 'superseded' | 'not-memory' }>;
const make = (session: RawExportSession, attempt: number | null, abandoned: boolean): RadioRecordSave => Object.freeze({ session, attempt, abandoned });

/**
 * WEB-RX16-01. Admitted only for the generation the unsaved prompt was shown for, and only for memory data (the only data the
 * unsaved prompt can be shown for without a dataset change). No I/O and no picker.
 */
export function radioRecordSaveOpen(doc: PulsarCurrentData, promptGeneration: number): RadioRecordSaveOpen {
  if (doc.generation !== promptGeneration) return Object.freeze({ ok: false, reason: 'superseded' });
  if (!isMemoryData(doc.data)) return Object.freeze({ ok: false, reason: 'not-memory' });
  return Object.freeze({ ok: true, save: make(rawExportOpen(doc.data, doc.generation, 'save'), null, false) });
}

/**
 * WEB-RX16-06 readiness: no capture lease, no pending analysis read and no output claim of either owner. The analysis modal
 * session is deliberately NOT a condition (the analysis dialogs stay open on its hidden route; requiring them closed could
 * deadlock this dialog). The erase OK still refuses while the analysis is busy (acquirePulsarCaptureLease, unchanged).
 */
export const radioRecordSaveReady = (doc: PulsarCurrentData) => doc.lease === null && !doc.analysis.reading && pulsarOutputClaim(doc) === null;
export const radioRecordSavePending = (save: RadioRecordSave) => save.attempt !== null;

export type RadioRecordSaveBegin =
  | Readonly<{ kind: 'claim'; claim: PulsarWriteClaim; rowCount: number }>
  | Readonly<{ kind: 'refused'; save: RadioRecordSave }>;
/** A request refusal kept in the session (the last notice stays, as R-RX14/R-RX15 do). */
export const radioRecordSaveRefused = (save: RadioRecordSave, refusal: RawExportRefusal): RadioRecordSave =>
  make(Object.freeze({ ...save.session, refusal: Object.freeze(refusal), failure: false }), save.attempt, save.abandoned);

/**
 * The Choose request. A pending attempt refuses ('not-ready'); otherwise R-RX15's pulsarSaveBegin unchanged (R-RX14 order:
 * not-ready, stale, fresh build problem, preview equality, then an owned claim in the same task). Nothing in the document changes.
 */
export function radioRecordSaveBegin(save: RadioRecordSave, doc: PulsarCurrentData): RadioRecordSaveBegin {
  if (save.attempt !== null) return Object.freeze({ kind: 'refused', save: radioRecordSaveRefused(save, { code: 'not-ready' }) });
  const r = pulsarSaveBegin(save.session, doc, radioRecordSaveReady(doc));
  if (r.kind === 'refused') return Object.freeze({ kind: 'refused', save: make(r.session, null, save.abandoned) });
  return Object.freeze({ kind: 'claim', claim: r.claim, rowCount: r.rowCount });
}
/** The picker was called for this token: the attempt holds the output claim; the notice is 'picking'. */
export function radioRecordSaveStarted(save: RadioRecordSave, token: number): RadioRecordSave {
  if (save.attempt !== null || !Number.isSafeInteger(token) || token <= 0) return save;
  return make(rawExportSaveNotice(save.session, Object.freeze({ code: 'picking' as const, fileName: null })), token, false);
}
/** A phase or result of the live attempt `token`. A stale token or an abandoned attempt changes nothing. */
export function radioRecordSaveNoticed(save: RadioRecordSave, token: number, notice: PulsarSaveNotice): RadioRecordSave {
  if (save.attempt !== token || save.abandoned) return save;
  return make(rawExportSaveNotice(save.session, notice), save.attempt, false);
}
/** A result with no attempt (a synchronous picker refusal): only while nothing is pending. */
export function radioRecordSaveFailed(save: RadioRecordSave, notice: PulsarSaveNotice): RadioRecordSave {
  if (save.attempt !== null) return save;
  return make(rawExportSaveNotice(save.session, notice), null, save.abandoned);
}
/** The pending attempt becomes dead: an 'abandoned' notice; the attempt (and the shared claim) stay until it settled. */
export function radioRecordSaveAbandoned(save: RadioRecordSave): RadioRecordSave {
  if (save.attempt === null || save.abandoned) return save;
  const notice = Object.freeze({ code: 'abandoned' as const, fileName: save.session.save?.fileName ?? null });
  return make(rawExportSaveNotice(save.session, notice), save.attempt, true);
}
/** The attempt `token` settled (its stream cleanup finished and its claim was released). Another token changes nothing. */
export function radioRecordSaveSettled(save: RadioRecordSave, token: number): RadioRecordSave {
  if (save.attempt !== token) return save;
  return make(save.session, null, false);
}

/**
 * WEB-RX16-04 note gate: the erase question reached from a verified Save shows its note only while the document's current
 * receipt (pulsarWrittenCopy: same object, generation, metadata, samples) is for the question's generation and has the noted
 * file name and byte count; otherwise null (plain erase text). The question's origin (async arrival, Cancel default) is not
 * decided here. The type is written out because radioReceiverSession imports this module.
 */
export function radioRecordEraseNote(verified: Readonly<{ fileName: string; byteLength: number }> | undefined, promptGeneration: number, doc: PulsarCurrentData) {
  const w = pulsarWrittenCopy(doc);
  return verified !== undefined && w !== null && w.generation === promptGeneration && w.fileName === verified.fileName && w.byteLength === verified.byteLength ? verified : null;
}
