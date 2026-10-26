import { describe, expect, it } from 'vitest';
import {
  radioRecordEraseNote, radioRecordSaveAbandoned, radioRecordSaveBegin, radioRecordSaveFailed, radioRecordSaveNoticed, radioRecordSaveOpen, radioRecordSavePending,
  radioRecordSaveReady, radioRecordSaveRefused, radioRecordSaveSettled, radioRecordSaveStarted, type RadioRecordSave,
} from './radioRecordSave';
import {
  INITIAL_PULSAR_CURRENT_DATA, acquirePulsarCaptureLease, claimPulsarOutput, commitPulsarCapture, importPulsarRecording, pulsarClaimBytes, pulsarMemoryRecording,
  pulsarOutputClaim, recordPulsarWrittenCopy, releasePulsarCaptureLease, setPulsarAnalysisActivity, setPulsarCapturePhase, type PulsarCurrentData, type PulsarMemoryRecording,
} from './pulsarCurrentData';
import { buildPulsarRawExport } from './pulsarRawExport';
import { admitPlrRecording } from './pulsarRecording';

// R-RX16 pure Radio Save sub-state (docs/RADIO-RECORD-SAVE.md, WEB-RX16-01..06). Synthetic model-capture fixtures; the expected
// bytes are the R-RX14/R-RX15 web contract (the same GOLDEN as src/core/pulsarSavedCopy.test.ts), not native writer output.
const capture = (o: Partial<Parameters<typeof pulsarMemoryRecording>[0]> = {}): PulsarMemoryRecording => pulsarMemoryRecording({
  captureId: 3, name: 'PSR TEST', aperture: 100, highestIndex: 0, frequencies: [400.125, null, null], gains: [1.125, null, null], start: 50000.125, interval: 0.015625,
  rows: [1.125, -2.625, 0, 0, 2.5, 3.75], full: false, ...o,
});
const current = (m: PulsarMemoryRecording): PulsarCurrentData => {
  const r = setPulsarCapturePhase(acquirePulsarCaptureLease(INITIAL_PULSAR_CURRENT_DATA, 1, 0, false).doc, 1, 'receiving').doc;
  return releasePulsarCaptureLease(commitPulsarCapture(r, 1, m).doc, 1).doc;
};
const GOLDEN = "'PSR TEST',100,0\r\n400.13,0.0,0.0\r\n1.125,0.0,0.0\r\n50000.12500000,0.01563\r\n1.125,-2.625,0.000\r\n0.000,2.500,3.750\r\n";
const opened = (doc: PulsarCurrentData): RadioRecordSave => {
  const r = radioRecordSaveOpen(doc, doc.generation);
  if (!r.ok) throw new Error(r.reason);
  return r.save;
};
const file = () => {
  const a = admitPlrRecording(new TextEncoder().encode(["'FILE',25,0", '400.00,0,0', '1.0,0,0', '50000.5,0.01', '1,0,0'].join('\r\n') + '\r\n'), 'synthetic.plr');
  if (a.status !== 'admitted') throw new Error(a.reason);
  return a.recording;
};

describe('open (WEB-RX16-01): only for the prompt generation and memory data, with no I/O', () => {
  it('opens a save-purpose session of the current capture with its preview; nothing in the document changes', () => {
    const m = capture(), doc = current(m), save = opened(doc);
    expect(save.attempt).toBeNull(); expect(save.abandoned).toBe(false); expect(radioRecordSavePending(save)).toBe(false);
    expect(save.session.purpose).toBe('save'); expect(save.session.data).toBe(m); expect(save.session.generation).toBe(doc.generation);
    expect(save.session.preview.ok && save.session.preview.text).toBe(GOLDEN);
    expect(save.session.refusal).toBeNull(); expect(save.session.save).toBeNull();
    expect(doc.written).toBeNull(); expect(pulsarOutputClaim(doc)).toBeNull();
    expect(Object.isFrozen(save)).toBe(true);
  });
  it('refuses a changed generation (superseded) and data that is not a memory capture', () => {
    const doc = current(capture());
    expect(radioRecordSaveOpen(doc, doc.generation - 1)).toEqual({ ok: false, reason: 'superseded' });
    expect(radioRecordSaveOpen(doc, doc.generation + 1)).toEqual({ ok: false, reason: 'superseded' });
    const imported = importPulsarRecording(doc, file(), doc.generation).doc;
    expect(radioRecordSaveOpen(imported, imported.generation)).toEqual({ ok: false, reason: 'not-memory' });
    const erased = acquirePulsarCaptureLease(doc, 2, doc.generation, true).doc;
    expect(radioRecordSaveOpen(erased, erased.generation)).toEqual({ ok: false, reason: 'not-memory' });
    expect(radioRecordSaveOpen(INITIAL_PULSAR_CURRENT_DATA, 0)).toEqual({ ok: false, reason: 'not-memory' });
  });
  it('a capture the R-RX14 builder refuses still opens, with the problem shown and every Choose refused before any claim', () => {
    for (const [name, code] of [['No Data', 'name-reserved'], ["O'NEIL", 'name-apostrophe']] as const) {
      const doc = current(capture({ name })), save = opened(doc);
      expect(save.session.preview).toMatchObject({ ok: false, problem: { code } });
      const r = radioRecordSaveBegin(save, doc);
      expect(r.kind).toBe('refused');
      expect(r.kind === 'refused' && r.save.session.refusal).toMatchObject({ code: 'build', problem: { code } });
      expect(r.kind === 'refused' && r.save.attempt).toBeNull();
    }
  });
});

describe('readiness and begin (WEB-RX16-03/05/06)', () => {
  it('claims the R-RX15 GOLDEN bytes, the same text as the R-RX14 build, without changing the document', () => {
    const m = capture(), doc = current(m), save = opened(doc);
    const r = radioRecordSaveBegin(save, doc);
    if (r.kind !== 'claim') throw new Error('refused');
    expect(r.rowCount).toBe(2); expect(r.claim.text).toBe(GOLDEN);
    const build = buildPulsarRawExport(m); expect(build.ok && build.text).toBe(r.claim.text);
    expect(Array.from(pulsarClaimBytes(r.claim), c => String.fromCharCode(c)).join('')).toBe(GOLDEN);
    expect(r.claim.data).toBe(m); expect(r.claim.generation).toBe(doc.generation);
    expect(doc.written).toBeNull(); expect(pulsarOutputClaim(doc)).toBeNull();
  });
  it('refuses a held lease, a pending analysis read and an output claim of either owner, but not an open analysis modal', () => {
    const doc = current(capture()), save = opened(doc);
    const notReady = (d: PulsarCurrentData) => {
      expect(radioRecordSaveReady(d)).toBe(false);
      const r = radioRecordSaveBegin(save, d);
      expect(r.kind === 'refused' && r.save.session.refusal).toEqual({ code: 'not-ready' });
    };
    notReady(acquirePulsarCaptureLease(doc, 5, doc.generation, false).doc);
    notReady(setPulsarAnalysisActivity(doc, { modal: false, reading: true }).doc);
    notReady(claimPulsarOutput(doc, 'analysis', 1).doc);
    notReady(claimPulsarOutput(doc, 'radio', 1).doc);
    // No deadlock: an analysis dialog kept open on its hidden route is not a condition here (the erase OK still checks it).
    const modal = setPulsarAnalysisActivity(doc, { modal: true, reading: false }).doc;
    expect(radioRecordSaveReady(modal)).toBe(true);
    expect(radioRecordSaveBegin(save, modal).kind).toBe('claim');
    expect(acquirePulsarCaptureLease(modal, 9, modal.generation, true)).toMatchObject({ ok: false, reason: 'analysis-busy' });
  });
  it('refuses a newer generation or another object as stale (R-RX14 order), and any request while an attempt is pending', () => {
    const doc = current(capture()), save = opened(doc);
    const newer = importPulsarRecording(doc, file(), doc.generation).doc;
    const stale = radioRecordSaveBegin(save, newer);
    expect(stale.kind === 'refused' && stale.save.session.refusal).toEqual({ code: 'stale' });
    const other = radioRecordSaveBegin(save, current(capture()));
    expect(other.kind === 'refused' && other.save.session.refusal).toEqual({ code: 'stale' });
    const pending = radioRecordSaveStarted(save, 4);
    const again = radioRecordSaveBegin(pending, doc);
    expect(again.kind).toBe('refused');
    expect(again.kind === 'refused' && again.save).toMatchObject({ attempt: 4, session: { refusal: { code: 'not-ready' }, save: { code: 'picking' } } });
  });
});

describe('attempt bookkeeping: tokens, abandonment and settlement', () => {
  const base = () => opened(current(capture()));
  it('started holds the token with a picking notice; notices of another token or of an abandoned attempt change nothing', () => {
    const s0 = base(), s1 = radioRecordSaveStarted(s0, 7);
    expect(s1).toMatchObject({ attempt: 7, abandoned: false, session: { save: { code: 'picking', fileName: null } } });
    expect(radioRecordSaveStarted(s1, 8)).toBe(s1);
    expect(radioRecordSaveStarted(s0, 0)).toBe(s0); expect(radioRecordSaveStarted(s0, 1.5)).toBe(s0);
    const writing = radioRecordSaveNoticed(s1, 7, { code: 'writing', fileName: 'a.PLR' });
    expect(writing.session.save).toEqual({ code: 'writing', fileName: 'a.PLR' }); expect(writing.attempt).toBe(7);
    expect(radioRecordSaveNoticed(writing, 6, { code: 'verified', fileName: 'a.PLR' })).toBe(writing);
    const abandoned = radioRecordSaveAbandoned(writing);
    expect(abandoned).toMatchObject({ attempt: 7, abandoned: true, session: { save: { code: 'abandoned', fileName: 'a.PLR' } } });
    expect(radioRecordSaveAbandoned(abandoned)).toBe(abandoned);
    expect(radioRecordSaveNoticed(abandoned, 7, { code: 'verified', fileName: 'a.PLR' })).toBe(abandoned);
    // Settlement only for the same token; the abandoned notice stays for the learner, the attempt ends.
    expect(radioRecordSaveSettled(abandoned, 6)).toBe(abandoned);
    const settled = radioRecordSaveSettled(abandoned, 7);
    expect(settled).toMatchObject({ attempt: null, abandoned: false, session: { save: { code: 'abandoned' } } });
    expect(radioRecordSavePending(settled)).toBe(false);
    expect(radioRecordSaveSettled(settled, 7)).toBe(settled);
    expect(radioRecordSaveAbandoned(base())).toEqual(base());
  });
  it('a synchronous failure is kept only while nothing is pending; a refusal keeps the last notice', () => {
    const s0 = base();
    const failed = radioRecordSaveFailed(s0, { code: 'picker-refused', fileName: null });
    expect(failed.session.save).toEqual({ code: 'picker-refused', fileName: null }); expect(failed.attempt).toBeNull();
    const pending = radioRecordSaveStarted(s0, 2);
    expect(radioRecordSaveFailed(pending, { code: 'picker-refused', fileName: null })).toBe(pending);
    const refused = radioRecordSaveRefused(failed, { code: 'not-ready' });
    expect(refused.session.refusal).toEqual({ code: 'not-ready' }); expect(refused.session.save).toEqual({ code: 'picker-refused', fileName: null });
    // A new phase clears an earlier refusal (R-RX15 rawExportSaveNotice).
    const restarted = radioRecordSaveStarted(refused, 3);
    expect(restarted.session.refusal).toBeNull(); expect(restarted.session.save).toEqual({ code: 'picking', fileName: null });
  });
});

describe('the erase note gate (WEB-RX16-04): the verified note follows the current receipt', () => {
  it('returns the noted object only for a matching current receipt; another name, size or generation, an import, an erase or an in-place change give null', () => {
    const m = capture(), doc = current(m), save = opened(doc);
    const r = radioRecordSaveBegin(save, doc);
    if (r.kind !== 'claim') throw new Error('refused');
    const step = recordPulsarWrittenCopy(doc, r.claim, pulsarClaimBytes(r.claim), 'copy.PLR');
    if (!step.ok) throw new Error(step.reason);
    const written = step.doc, g = written.generation, verified = Object.freeze({ fileName: 'copy.PLR', byteLength: GOLDEN.length });
    expect(radioRecordEraseNote(verified, g, written)).toBe(verified);
    expect(radioRecordEraseNote(undefined, g, written)).toBeNull();
    expect(radioRecordEraseNote({ fileName: 'other.PLR', byteLength: GOLDEN.length }, g, written)).toBeNull();
    expect(radioRecordEraseNote({ fileName: 'copy.PLR', byteLength: GOLDEN.length + 1 }, g, written)).toBeNull();
    expect(radioRecordEraseNote(verified, g + 1, written)).toBeNull();
    // Without any receipt (the document before the copy) the note is not shown.
    expect(radioRecordEraseNote(verified, doc.generation, doc)).toBeNull();
    const imported = importPulsarRecording(written, file(), g).doc;
    expect(radioRecordEraseNote(verified, g, imported)).toBeNull(); expect(radioRecordEraseNote(verified, imported.generation, imported)).toBeNull();
    const erased = acquirePulsarCaptureLease(written, 2, g, true).doc;
    expect(radioRecordEraseNote(verified, g, erased)).toBeNull(); expect(radioRecordEraseNote(verified, erased.generation, erased)).toBeNull();
    // The same object changed in place: the receipt no longer matches its owned samples.
    m.samples[0] = 9;
    expect(radioRecordEraseNote(verified, g, written)).toBeNull();
  });
});
