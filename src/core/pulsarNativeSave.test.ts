import { describe, expect, it } from 'vitest';
import {
  buildNativeSave, folderKey, nativeSaveAnswer, nativeSaveAutoName, nativeSaveFileName, nativeSaveStart, pulsarSaveDateText, pulsarSaveTimeText,
  PULSAR_NATIVE_SAVE_TEXT, type NativeSaveFolder, type NativeSaveNext, type NativeSaveSession,
} from './pulsarNativeSave';
import { INITIAL_PULSAR_ANALYSIS, pulsarAnswerClear, pulsarNativeSaveCancelled, pulsarNativeSaved, pulsarRequestClear, type PulsarEntryFields, type PulsarMeasurementEntry } from './pulsarAnalysis';
import { SAVED_ROWS_HEADER } from './pulsarSavedRows';

// Front F3: Save Recorded Measurements (Save2Click 0x56ef60, writer 0x56feac). Synthetic rows, not CLEA output.
const ROW = '"memory",800.00,2.000,0.125000,0.250000,"",2450000.00000000,"",3,0.25,120';
const FIELDS: PulsarEntryFields = Object.freeze({ object: 'memory', frequency: '800.00', gain: '2.000', reference: '0.125000', vertical: '0.250000', horizontal: null,
  start: '2450000.00000000', comment: '', points: '3', intervalMs: '0.25', aperture: '120', file: null });
const entry = (sequence: number): PulsarMeasurementEntry => Object.freeze({ sequence, panel: 0, fields: FIELDS, nativeLineCandidate: ROW });
const LIST = Object.freeze([entry(1), entry(2)]);
const EMPTY: NativeSaveFolder = new Map();
const folderOf = (...names: string[]): NativeSaveFolder => new Map(names.map(n => [folderKey(n), { name: n, bytes: new Uint8Array(0) }]));
const start = (p: Partial<Parameters<typeof nativeSaveStart>[0]> = {}) => nativeSaveStart({ list: LIST, pending: [false, false, false], generation: 1, lastName: '', ...p });
const step = (n: NativeSaveNext | null): NativeSaveSession => { if (n?.kind !== 'step') throw new Error(JSON.stringify(n)); return n.session; };

describe('Front F3: native Save Recorded Measurements', () => {
  it('header date and time use the approved US Windows defaults (M/d/yyyy with DateSeparator "-", h:mm:ss AMPM)', () => {
    expect(pulsarSaveDateText(new Date(2026, 9, 30, 15, 7, 42))).toBe('10-30-2026');
    expect(pulsarSaveDateText(new Date(2026, 0, 5))).toBe('1-5-2026');
    expect(pulsarSaveTimeText(new Date(2026, 9, 30, 15, 7, 42))).toBe('3:07:42 PM');
    expect(pulsarSaveTimeText(new Date(2026, 9, 30, 0, 0, 5))).toBe('12:00:05 AM');
    expect(pulsarSaveTimeText(new Date(2026, 9, 30, 12, 30, 0))).toBe('12:30:00 PM');
    expect(pulsarSaveTimeText(new Date(2026, 9, 30, 9, 4, 3))).toBe('9:04:03 AM');
  });
  it('the dialog applies DefaultExt CSV and flags a different extension, case-insensitively', () => {
    expect(nativeSaveFileName('pulsar')).toEqual({ ok: true, name: 'pulsar.CSV', extensionDifferent: false });
    expect(nativeSaveFileName('a.csv')).toEqual({ ok: true, name: 'a.csv', extensionDifferent: false });
    expect(nativeSaveFileName('a.txt')).toEqual({ ok: true, name: 'a.txt', extensionDifferent: true });
    for (const [typed, problem] of [['', 'empty'], ['María', 'text'], ['a/b', 'reserved'], ['a?', 'reserved'], ['x'.repeat(252), 'length']] as const)
      expect(nativeSaveFileName(typed)).toEqual({ ok: false, problem });
  });
  it('auto-names 001.CSV, 002.CSV, … past the files the folder holds (no login: empty prefix; a prefix is cut to 5)', () => {
    expect(nativeSaveAutoName(EMPTY)).toBe('001.CSV');
    expect(nativeSaveAutoName(folderOf('001.csv', '002.CSV'))).toBe('003.CSV');
    expect(nativeSaveAutoName(EMPTY, 'ABCDEFGHIJ')).toBe('ABCDE001.CSV');
  });
  it('follows the recovered prompt sequence', () => {
    expect(nativeSaveStart({ list: [], pending: [true, false, false], generation: 1, lastName: '' }).step).toEqual({ kind: 'nothing' });
    expect(nativeSaveAnswer(nativeSaveStart({ list: [], pending: [], generation: 1, lastName: '' }), 'ok', EMPTY)).toEqual({ kind: 'end', unsaved: false });
    const unrecorded = start({ pending: [false, true, false], lastName: 'old.CSV' });
    expect(unrecorded.step).toEqual({ kind: 'unrecorded' });
    expect(nativeSaveAnswer(unrecorded, 'no', EMPTY)).toEqual({ kind: 'end', unsaved: false });
    expect(step(nativeSaveAnswer(unrecorded, 'yes', EMPTY)).step).toEqual({ kind: 'dialog', fileName: 'old.CSV', problem: null });
    const d = start();
    expect(d.step).toEqual({ kind: 'dialog', fileName: '', problem: null });
    expect(nativeSaveAnswer(d, 'cancel', EMPTY)).toEqual({ kind: 'end', unsaved: false });
    expect(step(nativeSaveAnswer(d, 'ok', EMPTY, '')).step).toEqual({ kind: 'dialog', fileName: '', problem: 'empty' });
    // Different extension: Yes changes it (the dialog again), No goes on, Cancel stops.
    const ext = step(nativeSaveAnswer(d, 'ok', EMPTY, 'run.txt'));
    expect(ext.step).toEqual({ kind: 'extension', fileName: 'run.txt', name: 'run.txt' });
    expect(step(nativeSaveAnswer(ext, 'yes', EMPTY)).step).toEqual({ kind: 'dialog', fileName: 'run.txt', problem: null });
    expect(step(nativeSaveAnswer(ext, 'no', EMPTY)).step).toEqual({ kind: 'verify', name: 'run.txt', append: false });
    expect(nativeSaveAnswer(ext, 'cancel', EMPTY)).toEqual({ kind: 'end', unsaved: false });
    // Existing file: Yes overwrites, No appends, Cancel auto-names and shows the dialog again.
    const folder = folderOf('RUN.CSV');
    const exists = step(nativeSaveAnswer(d, 'ok', folder, 'run'));
    expect(exists.step).toEqual({ kind: 'exists', fileName: 'run', name: 'run.CSV' });
    expect(PULSAR_NATIVE_SAVE_TEXT.existsText('run.CSV')).toBe('The File run.CSV Already Exists.\r\n\r\nOverwrite Existing Data With New Measurements?\r\n\r\n"No" => Append To Existing Data\r\n"Cancel" => Select New File Name');
    expect(step(nativeSaveAnswer(exists, 'yes', folder)).step).toEqual({ kind: 'verify', name: 'run.CSV', append: false });
    const append = step(nativeSaveAnswer(exists, 'no', folder));
    expect(append.step).toEqual({ kind: 'verify', name: 'run.CSV', append: true });
    expect(step(nativeSaveAnswer(exists, 'cancel', folder)).step).toEqual({ kind: 'dialog', fileName: '001.CSV', problem: null });
    // Verify: OK writes, Cancel stops with the saved byte cleared.
    expect(nativeSaveAnswer(append, 'ok', folder)).toEqual({ kind: 'write', name: 'run.CSV', append: true });
    expect(nativeSaveAnswer(append, 'cancel', folder)).toEqual({ kind: 'end', unsaved: true });
    expect(PULSAR_NATIVE_SAVE_TEXT.verifyText('run.CSV', true)).toBe('Appending Data to run.CSV');
    expect(nativeSaveAnswer(append, 'yes', folder)).toBeNull();
  });
  it('writes the fresh header with two clock reads, then appends only the rows', () => {
    const reads = [new Date(2026, 9, 30, 23, 59, 59), new Date(2026, 9, 31, 0, 0, 0)];
    const fresh = buildNativeSave(LIST, () => reads.shift()!, null, 'run.CSV');
    if (!fresh.ok) throw new Error(JSON.stringify(fresh));
    const text = new TextDecoder().decode(fresh.bytes);
    expect(text).toBe(`"10-30-2026","12:00:00 AM"\r\n"Table Number: "\r\n\r\n\r\n${SAVED_ROWS_HEADER}\r\n${ROW}\r\n${ROW}\r\n`);
    expect(fresh.append).toBe(false);
    const more = buildNativeSave([entry(3)], () => { throw new Error('no clock on append'); }, fresh.bytes, 'run.CSV');
    if (!more.ok) throw new Error(JSON.stringify(more));
    expect(new TextDecoder().decode(more.bytes)).toBe(text + ROW + '\r\n');
    expect(more.rowCount).toBe(1);
  });
  it('after the writer: Record and Save off, Review on, panels recorded, list saved and kept, measurement record cleared; Verify Cancel clears saved', () => {
    const s = { ...INITIAL_PULSAR_ANALYSIS, list: LIST, recordEnabled: true, saveEnabled: true, pending: [true, false, false] as const,
      measurement: { reference: 1, vertical: [2, 0, 0] as const, horizontal: [3, 0, 0] as const, comments: ['c', '', ''] as const } };
    const saved = pulsarNativeSaved(s).state;
    expect([saved.recordEnabled, saved.saveEnabled, saved.reviewEnabled, saved.listSaved]).toEqual([false, false, true, true]);
    expect(saved.pending).toEqual([false, false, false]);
    expect(saved.list).toBe(LIST);
    expect(saved.measurement).toEqual(INITIAL_PULSAR_ANALYSIS.measurement);
    expect(pulsarNativeSaveCancelled(saved).state.listSaved).toBe(false);
  });
  it('Clear with an unsaved list offers Save first; a completed save then confirms, Cancel stops', () => {
    const s = { ...INITIAL_PULSAR_ANALYSIS, list: LIST, reviewEnabled: true, saveEnabled: true };
    const asked = pulsarRequestClear(s).state;
    expect(asked.clearPrompt).toBe('unsaved');
    const save = pulsarAnswerClear(asked, 'save');
    expect([save.outcome, save.state.clearPrompt]).toEqual(['clear-save', null]);
    expect(pulsarRequestClear(pulsarNativeSaved(save.state).state).state.clearPrompt).toBe('confirm');
    expect(pulsarAnswerClear(asked, 'cancel').state.clearPrompt).toBeNull();
  });
});
