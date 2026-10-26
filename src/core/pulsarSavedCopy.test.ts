import { describe, expect, it } from 'vitest';
import {
  PULSAR_SAVE_PENDING, PULSAR_SAVE_PICKER_OPTIONS, pulsarSaveBegin, pulsarSaveExtensionOk, pulsarSaveRefusalNotice, pulsarSaveSupport,
} from './pulsarSavedCopy';
import { RAW_EXPORT_FILE_NAME, rawExportOpen, rawExportSaveNotice } from './pulsarRawExport';
import {
  INITIAL_PULSAR_CURRENT_DATA, acquirePulsarCaptureLease, commitPulsarCapture, pulsarClaimBytes, pulsarClaimReadback, pulsarMemoryRecording, recordPulsarWrittenCopy,
  releasePulsarCaptureLease, setPulsarCapturePhase, type PulsarCurrentData, type PulsarMemoryRecording,
} from './pulsarCurrentData';

// R-RX15 pure Save contract (docs/PULSAR-SAVE-VERIFIED.md). Synthetic model-capture fixtures; the expected bytes are the R-RX14
// web contract, not native writer output.
const capture = (o: Partial<Parameters<typeof pulsarMemoryRecording>[0]> = {}): PulsarMemoryRecording => pulsarMemoryRecording({
  captureId: 3, name: 'PSR TEST', aperture: 100, highestIndex: 0, frequencies: [400.125, null, null], gains: [1.125, null, null], start: 50000.125, interval: 0.015625,
  rows: [1.125, -2.625, 0, 0, 2.5, 3.75], full: false, ...o,
});
const current = (m: PulsarMemoryRecording): PulsarCurrentData => {
  const r = setPulsarCapturePhase(acquirePulsarCaptureLease(INITIAL_PULSAR_CURRENT_DATA, 1, 0, false).doc, 1, 'receiving').doc;
  return releasePulsarCaptureLease(commitPulsarCapture(r, 1, m).doc, 1).doc;
};
const GOLDEN = "'PSR TEST',100,0\r\n400.13,0.0,0.0\r\n1.125,0.0,0.0\r\n50000.12500000,0.01563\r\n1.125,-2.625,0.000\r\n0.000,2.500,3.750\r\n";

describe('support, picker options and the extension rule (WEB-SAVE-01/02/04)', () => {
  it('support needs a secure context, the picker and createWritable', () => {
    expect(pulsarSaveSupport({ secure: true, picker: true, writable: true })).toBe('ok');
    expect(pulsarSaveSupport({ secure: false, picker: true, writable: true })).toBe('insecure-context');
    expect(pulsarSaveSupport({ secure: true, picker: false, writable: true })).toBe('no-api');
    expect(pulsarSaveSupport({ secure: true, picker: true, writable: false })).toBe('no-api');
  });
  it('picker options suggest the R-RX14 name and one .PLR type, with no remembered directory', () => {
    expect(PULSAR_SAVE_PICKER_OPTIONS.suggestedName).toBe(RAW_EXPORT_FILE_NAME);
    expect(PULSAR_SAVE_PICKER_OPTIONS.types).toEqual([{ description: '.PLR', accept: { 'application/octet-stream': ['.PLR'] } }]);
    expect('id' in PULSAR_SAVE_PICKER_OPTIONS).toBe(false); expect('startIn' in PULSAR_SAVE_PICKER_OPTIONS).toBe(false);
    expect(Object.isFrozen(PULSAR_SAVE_PICKER_OPTIONS)).toBe(true); expect(Object.isFrozen(PULSAR_SAVE_PICKER_OPTIONS.types[0].accept['application/octet-stream'])).toBe(true);
  });
  it('the extension rule: ends in .plr (ASCII case-insensitive) after at least one character; it is not an overwrite question', () => {
    for (const ok of ['a.PLR', 'a.plr', 'capture.Plr', 'x.PLR.PLR', 'openvireo-model-capture.PLR']) expect(pulsarSaveExtensionOk(ok), ok).toBe(true);
    for (const no of ['.PLR', '.plr', 'x.PLR.txt', 'aPLR', 'a.PLR ', 'a.pl', '', 'a.ＰＬＲ']) expect(pulsarSaveExtensionOk(no), no).toBe(false);
  });
});

describe('pulsarSaveBegin (WEB-SAVE-03)', () => {
  it('keeps the R-RX14 order: not-ready, stale (object or generation), build problem, preview equality; then an owned claim of the golden bytes', () => {
    const m = capture(), doc = current(m), s = rawExportOpen(m, doc.generation, 'save');
    const notReady = pulsarSaveBegin(s, { ...doc, generation: doc.generation + 1 }, false);
    expect(notReady.kind === 'refused' && notReady.session.refusal).toEqual({ code: 'not-ready' });
    const newer = pulsarSaveBegin(s, { ...doc, generation: doc.generation + 1 }, true);
    expect(newer.kind === 'refused' && newer.session.refusal).toEqual({ code: 'stale' });
    const other = pulsarSaveBegin(s, current(capture()), true);
    expect(other.kind === 'refused' && other.session.refusal).toEqual({ code: 'stale' });
    const r = pulsarSaveBegin(s, doc, true);
    if (r.kind !== 'claim') throw new Error('refused');
    expect(r.rowCount).toBe(2); expect(r.claim.text).toBe(GOLDEN); expect(r.claim.data).toBe(m); expect(r.claim.generation).toBe(doc.generation);
    expect(Array.from(pulsarClaimBytes(r.claim), c => String.fromCharCode(c)).join('')).toBe(GOLDEN);
    // Nothing in the document or the session changed.
    expect(doc.written).toBeNull(); expect(s.save).toBeNull(); expect(s.refusal).toBeNull();
  });
  it('a mutated Float64Array is refused (problem or stale) and never claimed; a build problem names it', () => {
    const m = capture(), doc = current(m), s = rawExportOpen(m, doc.generation, 'save');
    m.samples[0] = Number.NaN;
    const bad = pulsarSaveBegin(s, doc, true);
    expect(bad.kind === 'refused' && bad.session.refusal).toEqual({ code: 'build', problem: { code: 'sample-range', row: 1, channel: 0 } });
    m.samples[0] = 9;
    const changed = pulsarSaveBegin(s, doc, true);
    expect(changed.kind === 'refused' && changed.session.refusal).toEqual({ code: 'stale' });
  });
  it('a claim taken before an in-place change is refused at commit as source-mutated, even when the read-back equals the claim', () => {
    const m = capture(), doc = current(m), r = pulsarSaveBegin(rawExportOpen(m, doc.generation, 'save'), doc, true);
    if (r.kind !== 'claim') throw new Error('refused');
    const back = pulsarClaimBytes(r.claim);
    m.samples[1] = 7;
    const step = recordPulsarWrittenCopy(doc, r.claim, back, 'a.PLR');
    expect(step).toMatchObject({ ok: false, reason: 'source-mutated' });
    expect(pulsarSaveRefusalNotice(step.ok ? 'claim' : step.reason, pulsarClaimReadback(r.claim, back), 'a.PLR')).toEqual({ code: 'verified-stale', fileName: 'a.PLR', reason: 'source-mutated' });
  });
  it('a previous Save notice survives a refusal of the next request', () => {
    const m = capture(), doc = current(m);
    const s = rawExportSaveNotice(rawExportOpen(m, doc.generation, 'save'), { code: 'write-failed', fileName: 'a.PLR' });
    const r = pulsarSaveBegin(s, doc, false);
    expect(r.kind === 'refused' && r.session.save).toEqual({ code: 'write-failed', fileName: 'a.PLR' });
  });
});

describe('refusal notices', () => {
  it('maps size/byte refusals to mismatch, staleness to verified-stale only when the read-back matched, and the name rule to file-name', () => {
    expect(pulsarSaveRefusalNotice('readback-size', 'readback-size', 'a.PLR')).toEqual({ code: 'mismatch', fileName: 'a.PLR', reason: 'readback-size' });
    expect(pulsarSaveRefusalNotice('readback-bytes', 'readback-bytes', 'a.PLR')).toEqual({ code: 'mismatch', fileName: 'a.PLR', reason: 'readback-bytes' });
    for (const reason of ['superseded', 'capture-lease', 'source-mutated'] as const) {
      expect(pulsarSaveRefusalNotice(reason, 'ok', 'a.PLR')).toEqual({ code: 'verified-stale', fileName: 'a.PLR', reason });
      expect(pulsarSaveRefusalNotice(reason, 'readback-bytes', 'a.PLR')).toEqual({ code: 'mismatch', fileName: 'a.PLR', reason });
    }
    expect(pulsarSaveRefusalNotice('claim', 'ok', 'a.PLR').code).toBe('mismatch');
    expect(pulsarSaveRefusalNotice('file-name', 'ok', 'a\u0001.PLR')).toEqual({ code: 'file-name', fileName: 'a\u0001.PLR' });
    expect([...PULSAR_SAVE_PENDING].sort()).toEqual(['closing', 'picking', 'reading', 'writing']);
  });
});
