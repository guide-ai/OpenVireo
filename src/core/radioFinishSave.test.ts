import { describe, expect, it } from 'vitest';
import { radioFinishLeaseHeld, radioFinishSaveBegin, radioFinishSaveOpen, radioFinishSaveReady, radioFinishSaveVerified } from './radioFinishSave';
import { radioRecordSaveBegin, radioRecordSaveOpen, radioRecordSaveReady, radioRecordSaveStarted, type RadioRecordSave } from './radioRecordSave';
import { pulsarSaveBegin } from './pulsarSavedCopy';
import { rawExportOpen } from './pulsarRawExport';
import {
  INITIAL_PULSAR_CURRENT_DATA, acquirePulsarCaptureLease, claimPulsarOutput, commitPulsarCapture, pulsarClaimBytes, pulsarMemoryRecording, pulsarOutputClaim,
  recordPulsarFinishWrittenCopy, recordPulsarWrittenCopy, releasePulsarCaptureLease, releasePulsarOutput, setPulsarAnalysisActivity, setPulsarCapturePhase,
  type PulsarCaptureLease, type PulsarCurrentData, type PulsarMemoryRecording,
} from './pulsarCurrentData';
import { admitPlrRecording } from './pulsarRecording';

// R-RX17 pure finish Save (docs/RADIO-FINISH-SAVE.md, WEB-RX17-01..05). Synthetic model-capture fixtures; the expected bytes are
// the R-RX14/R-RX15 web contract (the same GOLDEN as src/core/radioRecordSave.test.ts), not native writer output. The read-backs
// are the claim's own bytes, stand-ins for a browser read-back.
const capture = (o: Partial<Parameters<typeof pulsarMemoryRecording>[0]> = {}): PulsarMemoryRecording => pulsarMemoryRecording({
  captureId: 1, name: 'PSR TEST', aperture: 100, highestIndex: 0, frequencies: [400.125, null, null], gains: [1.125, null, null], start: 50000.125, interval: 0.015625,
  rows: [1.125, -2.625, 0, 0, 2.5, 3.75], full: false, ...o,
});
/** The document at the finish Save question: capture `id` committed under its still-held lease. */
const held = (m: PulsarMemoryRecording = capture(), id = 1): PulsarCurrentData => {
  const r = setPulsarCapturePhase(acquirePulsarCaptureLease(INITIAL_PULSAR_CURRENT_DATA, id, 0, false).doc, id, 'receiving').doc;
  return commitPulsarCapture(r, id, m).doc;
};
const GOLDEN = "'PSR TEST',100,0\r\n400.13,0.0,0.0\r\n1.125,0.0,0.0\r\n50000.12500000,0.01563\r\n1.125,-2.625,0.000\r\n0.000,2.500,3.750\r\n";
const opened = (doc: PulsarCurrentData, id = 1): { save: RadioRecordSave; lease: PulsarCaptureLease } => {
  const r = radioFinishSaveOpen(doc, id);
  if (!r.ok) throw new Error(r.reason);
  return r;
};
const file = () => {
  const a = admitPlrRecording(new TextEncoder().encode(["'FILE',25,0", '400.00,0,0', '1.0,0,0', '50000.5,0.01', '1,0,0'].join('\r\n') + '\r\n'), 'synthetic.plr');
  if (a.status !== 'admitted') throw new Error(a.reason);
  return a.recording;
};
const substituted = (doc: PulsarCurrentData): PulsarCurrentData => ({ ...doc, lease: Object.freeze({ id: doc.lease!.id, phase: 'committed' as const }) });

describe('open (WEB-RX17-01): the own committed lease and its capture, kept as an object, with no I/O', () => {
  it('opens a save-purpose session of the capture and returns the document’s lease object; nothing in the document changes', () => {
    const m = capture(), doc = held(m), { save, lease } = opened(doc);
    expect(lease).toBe(doc.lease); expect(lease).toEqual({ id: 1, phase: 'committed' });
    expect(save).toMatchObject({ attempt: null, abandoned: false, session: { purpose: 'save', generation: doc.generation, refusal: null, save: null } });
    expect(save.session.data).toBe(m); expect(save.session.preview.ok && save.session.preview.text).toBe(GOLDEN);
    expect(doc.written).toBeNull(); expect(pulsarOutputClaim(doc)).toBeNull(); expect(doc.lease).toBe(lease);
    expect(radioFinishLeaseHeld(doc, lease)).toBe(true);
  });
  it('refuses another lease id, no lease, a non-committed lease of the same id and data that is not that capture', () => {
    const m = capture(), doc = held(m);
    expect(radioFinishSaveOpen(doc, 2)).toEqual({ ok: false, reason: 'lease' });
    const released = releasePulsarCaptureLease(doc, 1).doc;
    expect(radioFinishSaveOpen(released, 1)).toEqual({ ok: false, reason: 'lease' });
    const armed = acquirePulsarCaptureLease(released, 1, released.generation, false).doc;
    expect(radioFinishSaveOpen(armed, 1)).toEqual({ ok: false, reason: 'lease' });
    expect(radioFinishSaveOpen(held(capture({ captureId: 7 }), 1), 1)).toEqual({ ok: false, reason: 'not-memory' });
    expect(radioFinishSaveOpen({ ...doc, data: file() }, 1)).toEqual({ ok: false, reason: 'not-memory' });
    expect(radioFinishSaveOpen(INITIAL_PULSAR_CURRENT_DATA, 1)).toEqual({ ok: false, reason: 'lease' });
  });
});

describe('readiness (WEB-RX17-05) and the arming and generic paths under the committed lease', () => {
  it('is ready under its own lease, also with an analysis modal open; a read, either owner’s claim or a substituted lease refuse', () => {
    const doc = held(), { save, lease } = opened(doc);
    expect(radioFinishSaveReady(doc, lease)).toBe(true);
    const modal = setPulsarAnalysisActivity(doc, { modal: true, reading: false }).doc;
    expect(radioFinishSaveReady(modal, lease)).toBe(true); expect(radioFinishSaveBegin(save, lease, modal).kind).toBe('claim');
    for (const d of [setPulsarAnalysisActivity(doc, { modal: false, reading: true }).doc, claimPulsarOutput(doc, 'analysis', 1).doc, claimPulsarOutput(doc, 'radio', 1).doc, substituted(doc)]) {
      expect(radioFinishSaveReady(d, lease)).toBe(false);
      const r = radioFinishSaveBegin(save, lease, d);
      expect(r.kind === 'refused' && r.save.session.refusal).toEqual({ code: 'not-ready' });
    }
  });
  it('the R-RX16 arming Save stays not-ready and the generic recorder keeps refusing while the lease is held (RX17-06/07)', () => {
    const doc = held(), armingSave = radioRecordSaveOpen(doc, doc.generation);
    if (!armingSave.ok) throw new Error(armingSave.reason);
    expect(radioRecordSaveReady(doc)).toBe(false);
    const r = radioRecordSaveBegin(armingSave.save, doc);
    expect(r.kind === 'refused' && r.save.session.refusal).toEqual({ code: 'not-ready' });
    // The R-RX15 request issues a generic claim (it checks readiness separately), and that claim is refused under the lease.
    const g = pulsarSaveBegin(armingSave.save.session, doc, true);
    if (g.kind !== 'claim') throw new Error('refused');
    expect(recordPulsarWrittenCopy(doc, g.claim, pulsarClaimBytes(g.claim), 'x.PLR')).toMatchObject({ ok: false, reason: 'capture-lease' });
  });
});

describe('begin: R-RX14 order, then a finish claim bound to the dialog’s lease in the same task', () => {
  it('claims the GOLDEN bytes, the same text as R-RX15 on the released twin; only the finish recorder accepts that claim', () => {
    const m = capture(), doc = held(m), { save, lease } = opened(doc);
    const r = radioFinishSaveBegin(save, lease, doc);
    if (r.kind !== 'claim') throw new Error('refused');
    expect(r.rowCount).toBe(2); expect(r.claim.text).toBe(GOLDEN); expect(r.claim.data).toBe(m); expect(r.claim.generation).toBe(doc.generation);
    const twin = releasePulsarCaptureLease(doc, 1).doc, generic = pulsarSaveBegin(rawExportOpen(m, twin.generation, 'save'), twin, true);
    expect(generic.kind === 'claim' && generic.claim.text).toBe(r.claim.text);
    expect(doc.written).toBeNull(); expect(pulsarOutputClaim(doc)).toBeNull(); expect(doc.lease).toBe(lease);
    const out = claimPulsarOutput(doc, 'radio', 3).doc, bytes = pulsarClaimBytes(r.claim);
    expect(recordPulsarWrittenCopy(releasePulsarCaptureLease(out, 1).doc, r.claim, bytes, 'a.PLR')).toMatchObject({ ok: false, reason: 'claim' });
    expect(recordPulsarFinishWrittenCopy(out, r.claim, { lease, outputToken: 3 }, bytes, 'a.PLR').ok).toBe(true);
  });
  it('hostile OPEN → BEGIN: an equal-valued lease, or the same id re-acquired and re-committed, is refused before any claim', () => {
    const m = capture(), doc = held(m), { save, lease } = opened(doc);
    const r = radioFinishSaveBegin(save, lease, substituted(doc));
    expect(r.kind === 'refused' && r.save.session.refusal).toEqual({ code: 'not-ready' });
    const released = releasePulsarCaptureLease(doc, 1).doc;
    const again = commitPulsarCapture(setPulsarCapturePhase(acquirePulsarCaptureLease(released, 1, released.generation, false).doc, 1, 'receiving').doc, 1, m).doc;
    expect(again.lease).toEqual(lease); expect(again.lease).not.toBe(lease);
    const late = radioFinishSaveBegin(save, lease, again);
    expect(late.kind === 'refused' && late.save.session.refusal).toEqual({ code: 'not-ready' });
  });
  it('refuses a pending attempt (not-ready), a newer generation or another object (stale), and a build problem', () => {
    const doc = held(), { save, lease } = opened(doc);
    const pending = radioFinishSaveBegin(radioRecordSaveStarted(save, 4), lease, doc);
    expect(pending.kind === 'refused' && pending.save).toMatchObject({ attempt: 4, session: { refusal: { code: 'not-ready' }, save: { code: 'picking' } } });
    const newer = radioFinishSaveBegin(save, lease, { ...doc, generation: doc.generation + 1 });
    expect(newer.kind === 'refused' && newer.save.session.refusal).toEqual({ code: 'stale' });
    const other = radioFinishSaveBegin(save, lease, { ...doc, data: capture() });
    expect(other.kind === 'refused' && other.save.session.refusal).toEqual({ code: 'stale' });
    for (const [o, code] of [[{ name: 'No Data' }, 'name-reserved'], [{ rows: [] }, 'no-rows']] as const) {
      const d = held(capture(o)), x = opened(d);
      expect(x.save.session.preview).toMatchObject({ ok: false, problem: { code } });
      const b = radioFinishSaveBegin(x.save, x.lease, d);
      expect(b.kind === 'refused' && b.save.session.refusal).toMatchObject({ code: 'build', problem: { code } });
      expect(b.kind === 'refused' && b.save.attempt).toBeNull();
    }
  });
});

describe('the verified-exit gate (WEB-RX17-04)', () => {
  const receipt = () => {
    const m = capture(), doc = held(m), { save, lease } = opened(doc);
    const r = radioFinishSaveBegin(save, lease, doc);
    if (r.kind !== 'claim') throw new Error('refused');
    const step = recordPulsarFinishWrittenCopy(claimPulsarOutput(doc, 'radio', 2).doc, r.claim, { lease, outputToken: 2 }, pulsarClaimBytes(r.claim), 'copy.PLR');
    if (!step.ok) throw new Error(step.reason);
    return { m, save, lease, written: releasePulsarOutput(step.doc, 'radio', 2).doc, verified: { fileName: 'copy.PLR', byteLength: GOLDEN.length } };
  };
  it('passes only for the dialog’s lease object, data, generation and the reported name and size', () => {
    const { save, lease, written, verified } = receipt();
    expect(radioFinishSaveVerified(save, lease, written, verified)).toBe(true);
    expect(radioFinishSaveVerified(save, lease, written, { ...verified, fileName: 'other.PLR' })).toBe(false);
    expect(radioFinishSaveVerified(save, lease, written, { ...verified, byteLength: GOLDEN.length + 1 })).toBe(false);
    expect(radioFinishSaveVerified(save, lease, held(), verified)).toBe(false);// no receipt
    expect(radioFinishSaveVerified(save, lease, { ...written, generation: written.generation + 1 }, verified)).toBe(false);
  });
  it('hostile RECEIPT → EXIT: the current receipt does not pass under a substituted or released lease of the same id', () => {
    const { m, save, lease, written, verified } = receipt();
    expect(radioFinishSaveVerified(save, lease, substituted(written), verified)).toBe(false);
    expect(radioFinishSaveVerified(save, Object.freeze({ id: 1, phase: 'committed' as const }), written, verified)).toBe(false);
    const released = releasePulsarCaptureLease(written, 1).doc;
    expect(radioFinishSaveVerified(save, lease, released, verified)).toBe(false);
    // Re-acquired without erase the receipt survives, but under a new lease object it opens no exit.
    const rearmed = acquirePulsarCaptureLease(released, 1, released.generation, false).doc;
    expect(rearmed.data).toBe(m); expect(radioFinishSaveVerified(save, lease, rearmed, verified)).toBe(false);
    // A dialog opened on another capture never passes with this receipt.
    const other = opened(held(capture({ name: 'OTHER' })));
    expect(radioFinishSaveVerified(other.save, lease, written, verified)).toBe(false);
  });
});
