/**
 * R-RX17 Radio-owned verified Save from the finish Save question (docs/RADIO-FINISH-SAVE.md, WEB-RX17-01..10). Pure TypeScript:
 * no React, DOM, clock or storage. It reuses the R-RX16 Save sub-state and its steps (radioRecordSave.ts, unchanged), the
 * R-RX14 canonical bytes and request order (pulsarRawExport.ts) and the browser host (src/components/pulsarSaveHost.ts). The
 * receipt is created only by recordPulsarFinishWrittenCopy (pulsarCurrentData.ts), for the owner of the committed lease.
 *
 * Recovered statically (CLEA_VEO.exe SHA-256 781bc970…c54c; docs/RADIO-FINISH-SAVE-PROVENANCE.json): [S] E4-YES, Yes (6) of the
 * finish question (flags 0x23) calls the Save wrapper 0x56b36c at 0x573d54 and its normal return jumps to 0x573d6f with no
 * saved-flag or return-value test; Yes skips the main+0x468 enable and the No (analysis) branch. The wrapper's thrown-error
 * (SEH 0x4056e4) continuation is not established. [W] web policy: Yes opens this preparation (no I/O, no picker); a separate
 * Choose click calls the picker synchronously; only a verified receipt ends the finish (releasing the session's own lease once,
 * staying on Radio, no analysis); a cancel, refusal or I/O failure stays in this dialog. That is stricter than the native normal
 * return and is not a native continuation.
 *
 * The committed lease OBJECT is kept with the dialog (WEB-RX17-02): Begin and the verified exit require that same object, so a
 * later lease that reuses the numeric id, or an equal-valued copy, is never admitted, claimed or released by an old receipt.
 */
import { rawExportRequest } from './pulsarRawExport';
import { radioRecordSaveOpen, radioRecordSaveRefused, type RadioRecordSave, type RadioRecordSaveBegin } from './radioRecordSave';
import { isMemoryData, pulsarFinishWriteClaim, pulsarOutputClaim, pulsarWrittenCopy, type PulsarCaptureLease, type PulsarCurrentData } from './pulsarCurrentData';

export type RadioFinishSaveOpen = Readonly<{ ok: true; save: RadioRecordSave; lease: PulsarCaptureLease } | { ok: false; reason: 'lease' | 'not-memory' }>;
/** The dialog's lease is still the document's committed lease (identity, not an equal value). */
export const radioFinishLeaseHeld = (doc: PulsarCurrentData, lease: PulsarCaptureLease) => doc.lease === lease && lease.phase === 'committed';

/**
 * WEB-RX17-01. Admitted only while the document holds the committed lease `leaseId` and its data is that capture (memory data
 * with captureId = leaseId). Returns the R-RX16 save-purpose sub-state and the lease object to keep. No I/O and no picker.
 */
export function radioFinishSaveOpen(doc: PulsarCurrentData, leaseId: number): RadioFinishSaveOpen {
  const lease = doc.lease;
  if (lease === null || lease.id !== leaseId || lease.phase !== 'committed' || !Number.isSafeInteger(leaseId)) return Object.freeze({ ok: false, reason: 'lease' });
  if (!isMemoryData(doc.data) || doc.data.captureId !== leaseId) return Object.freeze({ ok: false, reason: 'not-memory' });
  const opened = radioRecordSaveOpen(doc, doc.generation);
  if (!opened.ok) return Object.freeze({ ok: false, reason: 'not-memory' });
  return Object.freeze({ ok: true, save: opened.save, lease });
}

/**
 * WEB-RX17-05 readiness: the dialog's own committed lease is held, no analysis read is pending and no output claim of either
 * owner exists. The analysis modal session is NOT a condition (its dialogs stay open on the hidden route; WEB-RX16-06 reasoning).
 */
export const radioFinishSaveReady = (doc: PulsarCurrentData, lease: PulsarCaptureLease) =>
  radioFinishLeaseHeld(doc, lease) && !doc.analysis.reading && pulsarOutputClaim(doc) === null;

/**
 * The Choose request. A pending attempt refuses ('not-ready'); otherwise the R-RX14 order (rawExportRequest: not-ready, stale,
 * fresh build problem, preview equality), then a finish claim bound to `lease` in the same task ('stale' when it cannot be
 * taken). Nothing in the document changes.
 */
export function radioFinishSaveBegin(save: RadioRecordSave, lease: PulsarCaptureLease, doc: PulsarCurrentData): RadioRecordSaveBegin {
  if (save.attempt !== null) return Object.freeze({ kind: 'refused', save: radioRecordSaveRefused(save, { code: 'not-ready' }) });
  const r = rawExportRequest(save.session, { data: doc.data, generation: doc.generation, ready: radioFinishSaveReady(doc, lease) });
  if (r.kind === 'refused') return Object.freeze({ kind: 'refused', save: radioRecordSaveRefused(save, r.session.refusal ?? { code: 'not-ready' }) });
  const claim = pulsarFinishWriteClaim(doc, lease, r.text);
  if (!claim) return Object.freeze({ kind: 'refused', save: radioRecordSaveRefused(save, { code: 'stale' }) });
  return Object.freeze({ kind: 'claim', claim, rowCount: r.rowCount });
}

/**
 * WEB-RX17-04 verified-exit gate: the document still holds the dialog's lease object, committed, and its current receipt
 * (pulsarWrittenCopy) is for the dialog's data object and generation with the reported name and size. Anything else: false.
 */
export function radioFinishSaveVerified(save: RadioRecordSave, lease: PulsarCaptureLease, doc: PulsarCurrentData, verified: Readonly<{ fileName: string; byteLength: number }>): boolean {
  const w = pulsarWrittenCopy(doc);
  return radioFinishLeaseHeld(doc, lease) && w !== null && w.data === save.session.data && w.generation === save.session.generation
    && w.fileName === verified.fileName && w.byteLength === verified.byteLength;
}
