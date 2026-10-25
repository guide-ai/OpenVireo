import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  buildResultsExport, EMPTY_RESULTS_EXPORT_METADATA, exportPulsarResults, RESULTS_EXPORT_FIELDS, RESULTS_EXPORT_FILE_NAME, RESULTS_EXPORT_LIMITS, resultsExportDownloadFailed,
  resultsExportEdit, resultsExportFieldProblems, resultsExportOpen, resultsExportRequest, type ResultsExportField, type ResultsExportMetadata, type ResultsExportSession,
} from './pulsarResultsExport';
import { admitSavedRows } from './pulsarSavedRows';
import {
  INITIAL_PULSAR_ANALYSIS, pulsarActivateData, pulsarBeginRecord, pulsarConfirmRecord, pulsarLoad, pulsarPointer, pulsarRecordDraft,
  type PulsarAnalysisState, type PulsarEntryFields, type PulsarMeasurementEntry,
} from './pulsarAnalysis';
import { admitPlrRecording } from './pulsarRecording';
import { pulsarMemoryRecording } from './pulsarCurrentData';

// R-RX10 acceptance (docs/PULSAR-RESULTS-EXPORT.md). Every vector below is synthetic: not CLEA output, not an observation and
// not a native writer oracle. The golden text is copied by hand from the independent pre-implementation file
// INDEPENDENT-EXPECTED-EXPORT.json (SHA-256 2c69cffa83ba8673a6b8fbe13008a8f1aa933b085ddc1623d019568a38679c5e); it is
// not derived from product constants.
const root = path.resolve(import.meta.dirname, '../..');
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const ROW_A = '"PSR, A",400.00,1.000,"","",1.00000E-02,2450000.12345678,"note, unchanged",399,0.10,100,"capture.PLR"';
const ROW_M = '"memory",800.00,2.000,0.125000,0.250000,"",2450000.00000000,"",3,0.25,120';
const GOLDEN_META: ResultsExportMetadata = { date: '25/10/2026', time: '16:00:00', table: '7', names: ['Observer A', '', 'Observer C', ''] };
const GOLDEN_TEXT =
  '"25/10/2026","16:00:00"\r\n' +
  '"Table Number: 7"\r\n' +
  '\r\n' +
  '"Observer A"\r\n' +
  '"Observer C"\r\n' +
  '\r\n' +
  '"Object","Freq (MHz)","Gain (Rel)","Ref (Secs)","Vert (Secs)","Horz (Rel)","Start (JD)","Comments","Data Pts","Del T (msec)","Aperture (M)","File Name"\r\n' +
  '"PSR, A",400.00,1.000,"","",1.00000E-02,2450000.12345678,"note, unchanged",399,0.10,100,"capture.PLR"\r\n' +
  '"memory",800.00,2.000,0.125000,0.250000,"",2450000.00000000,"",3,0.25,120\r\n' +
  '"PSR, A",400.00,1.000,"","",1.00000E-02,2450000.12345678,"note, unchanged",399,0.10,100,"capture.PLR"\r\n';
const GOLDEN_SHA = 'a51b30e9544a7fb274149ee97b5e0586d180c4aa16a0b69a959378380c28cf8f';

const FIELDS_A: PulsarEntryFields = Object.freeze({
  object: 'PSR, A', frequency: '400.00', gain: '1.000', reference: null, vertical: null, horizontal: '1.00000E-02',
  start: '2450000.12345678', comment: 'note, unchanged', points: '399', intervalMs: '0.10', aperture: '100', file: 'capture.PLR',
});
const FIELDS_M: PulsarEntryFields = Object.freeze({
  object: 'memory', frequency: '800.00', gain: '2.000', reference: '0.125000', vertical: '0.250000', horizontal: null,
  start: '2450000.00000000', comment: '', points: '3', intervalMs: '0.25', aperture: '120', file: null,
});
const entry = (sequence: number, fields: PulsarEntryFields, line: string): PulsarMeasurementEntry => Object.freeze({ sequence, panel: 0, fields, nativeLineCandidate: line });
const GOLDEN_ENTRIES = Object.freeze([entry(1, FIELDS_A, ROW_A), entry(2, FIELDS_M, ROW_M), entry(3, FIELDS_A, ROW_A)]);
const META: ResultsExportMetadata = { date: 'd', time: 't', table: '', names: ['', '', '', ''] };
const meta = (patch: Partial<ResultsExportMetadata>): ResultsExportMetadata => ({ ...META, ...patch });
const refusedRow = (r: ReturnType<typeof buildResultsExport>) => { expect(r.ok).toBe(false); return r.ok ? null : r.row; };
const refusedList = (r: ReturnType<typeof buildResultsExport>) => { expect(r.ok).toBe(false); return r.ok ? null : r.list; };
const textOf = (r: ReturnType<typeof buildResultsExport>) => { if (!r.ok) throw new Error(`refused: ${JSON.stringify(r)}`); return r.text; };

/** The largest row the strict profile admits under every field cap: 42 + 9 × 40 + 83 + 257 + 11 commas = 753 bytes. */
const nines = (n: number) => '9'.repeat(n);
const maxRow = (fileInner = 255) => ['"' + 'O'.repeat(40) + '"', nines(40), nines(40), nines(40), nines(40), '1.' + '0'.repeat(34) + 'E+00', nines(40),
  '"' + 'c'.repeat(81) + '"', nines(40), nines(40), nines(40), '"' + 'f'.repeat(fileInner) + '"'].join(',');

describe('RX10-01 golden fresh export', () => {
  it('matches the independent hand-written expected bytes exactly', () => {
    const r = buildResultsExport(GOLDEN_META, [ROW_A, ROW_M, ROW_A]);
    if (!r.ok) throw new Error('refused');
    expect(r.text).toBe(GOLDEN_TEXT);
    expect(r.bytes.byteLength).toBe(510);
    expect(r.text.split('\r\n').length - 1).toBe(10);
    expect(sha256(r.bytes)).toBe(GOLDEN_SHA);
    expect(r.rowCount).toBe(3);
    expect(RESULTS_EXPORT_FILE_NAME).toBe('pulsar-results.csv');
  });
  it('the entry path gives the same bytes when every stored row agrees with its fields', () => {
    const r = exportPulsarResults(GOLDEN_META, GOLDEN_ENTRIES);
    if (!r.ok) throw new Error('refused');
    expect(sha256(r.bytes)).toBe(GOLDEN_SHA);
  });
  it('secondary: the strict saved-rows reader admits the bytes with identical row texts in order', () => {
    const r = buildResultsExport(GOLDEN_META, [ROW_A, ROW_M, ROW_A]);
    if (!r.ok) throw new Error('refused');
    const a = admitSavedRows(r.bytes, RESULTS_EXPORT_FILE_NAME);
    if (!a.ok) throw new Error('not admitted');
    expect(a.source.newline).toBe('CRLF');
    expect(a.source.rows.map(row => row.text)).toEqual([ROW_A, ROW_M, ROW_A]);
    expect(a.source.rows.map(row => row.columns)).toEqual([12, 11, 12]);
    // Physical line 6 + 2 non-empty names is ordinal 0.
    expect(a.source.rows[0].line).toBe(8);
    expect(a.source.metadata.identities.map(i => i.value)).toEqual(['Observer A', 'Observer C']);
  });
});

describe('RX10-02/03 rows are copied verbatim', () => {
  it('keeps 11- and 12-column rows unchanged, with no padding or reformatting', () => {
    const text = textOf(buildResultsExport(META, [ROW_M, ROW_A]));
    expect(text.endsWith(`${ROW_M}\r\n${ROW_A}\r\n`)).toBe(true);
  });
  it('keeps duplicates and their order (A/B/A)', () => {
    const lines = textOf(buildResultsExport(META, [ROW_A, ROW_M, ROW_A])).split('\r\n');
    expect(lines.slice(-4)).toEqual([ROW_A, ROW_M, ROW_A, '']);
  });
});

describe('RX10-04..07 metadata', () => {
  const headerLines = (m: ResultsExportMetadata) => textOf(buildResultsExport(m, [ROW_A])).split('\r\n');
  it('writes 0 to 4 non-empty names in slot order, omits empty slots and keeps spaces', () => {
    expect(headerLines(META).slice(0, 5)).toEqual(['"d","t"', '"Table Number: "', '', '', expect.stringMatching(/^"Object"/)]);
    expect(headerLines(meta({ names: ['A', 'B', 'C', 'D'] })).slice(3, 8)).toEqual(['"A"', '"B"', '"C"', '"D"', '']);
    expect(headerLines(meta({ names: ['', ' two ', '', ' '] })).slice(3, 6)).toEqual(['" two "', '" "', '']);
  });
  it('table: empty and 4 bytes accepted, 5 refused without truncation', () => {
    expect(headerLines(meta({ table: '' }))[1]).toBe('"Table Number: "');
    expect(headerLines(meta({ table: '12AB' }))[1]).toBe('"Table Number: 12AB"');
    const r = buildResultsExport(meta({ table: '12ABC' }), [ROW_A]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields).toEqual([{ field: 'table', code: 'length', length: 5, max: 4 }]);
  });
  it('names: 40 bytes accepted, 41 refused naming the slot', () => {
    expect(headerLines(meta({ names: ['', '', 'N'.repeat(40), ''] }))[3]).toBe(`"${'N'.repeat(40)}"`);
    const r = buildResultsExport(meta({ names: ['', '', 'N'.repeat(41), ''] }), [ROW_A]);
    if (r.ok) throw new Error('accepted');
    expect(r.fields).toEqual([{ field: 'name3', code: 'length', length: 41, max: 40 }]);
  });
  it('date and time are required; 64 accepted, 65 refused', () => {
    expect(resultsExportFieldProblems(EMPTY_RESULTS_EXPORT_METADATA)).toEqual([{ field: 'date', code: 'required' }, { field: 'time', code: 'required' }]);
    expect(headerLines(meta({ date: 'D'.repeat(64), time: 'T'.repeat(64) }))[0]).toBe(`"${'D'.repeat(64)}","${'T'.repeat(64)}"`);
    expect(resultsExportFieldProblems(meta({ date: 'D'.repeat(65), time: 'T'.repeat(65) }))).toEqual([
      { field: 'date', code: 'length', length: 65, max: 64 }, { field: 'time', code: 'length', length: 65, max: 64 }]);
  });
  it('the module reads no clock, locale, browser or storage (source scan)', () => {
    const source = readFileSync(path.join(root, 'src/core/pulsarResultsExport.ts'), 'utf8');
    for (const forbidden of [/\bDate\s*[.(]/, /new\s+Date\b/, /\bIntl\b/, /toLocale/, /\bnavigator\b/, /Storage\b/, /indexedDB/, /\bwindow\b/, /\bdocument\b/])
      expect(source).not.toMatch(forbidden);
  });
});

describe('RX10-08 header text profile', () => {
  it('refuses a quote, tab, line break, DEL and non-ASCII in every field, with the position', () => {
    for (const field of RESULTS_EXPORT_FIELDS) {
      for (const [bad, code] of [['"', 'quote'], ['\t', 'text'], ['\n', 'text'], ['\x7f', 'text'], ['é', 'text']] as const) {
        const m = setField(meta({}), field, 'a' + bad);
        const problems = resultsExportFieldProblems(m);
        expect(problems, `${field} ${JSON.stringify(bad)}`).toEqual([{ field, code, position: 2 }]);
        expect(buildResultsExport(m, [ROW_A]).ok).toBe(false);
      }
    }
  });
});
function setField(m: ResultsExportMetadata, field: ResultsExportField, value: string): ResultsExportMetadata {
  if (field === 'date') return { ...m, date: value };
  if (field === 'time') return { ...m, time: value };
  if (field === 'table') return { ...m, table: value };
  const i = Number(field.slice(4)) - 1;
  return { ...m, names: m.names.map((n, k) => (k === i ? value : n)) as unknown as ResultsExportMetadata['names'] };
}

describe('RX10-09/10 rows', () => {
  it('refuses an empty list before any bytes', () => {
    const r = buildResultsExport(GOLDEN_META, []);
    expect(r).toEqual({ ok: false, fields: [], list: { code: 'no-rows' }, row: null });
    expect('bytes' in r).toBe(false);
    expect(exportPulsarResults(GOLDEN_META, []).ok).toBe(false);
  });
  const second = (bad: string) => refusedRow(buildResultsExport(GOLDEN_META, [ROW_A, bad]));
  it('refuses ambiguous quotes, injections, decimal commas, bad exponents, column counts, blank and non-ASCII rows with their ordinal', () => {
    expect(second(ROW_A.replace('"PSR, A"', '"PSR "A""'))).toEqual({ ordinal: 1, code: 'row-quote' });
    expect(second(ROW_A.replace('"capture.PLR"', '"cap"ture.PLR"'))).toEqual({ ordinal: 1, code: 'row-quote' });
    expect(second(ROW_A.replace('"PSR, A"', '"A","1"'))).toEqual({ ordinal: 1, code: 'row-columns', count: 13 });
    expect(second(ROW_A.replace('400.00', '400,00'))).toEqual({ ordinal: 1, code: 'row-columns', count: 13 });
    expect(second(ROW_A.replace('1.00000E-02', '1.00000e-02'))).toEqual({ ordinal: 1, code: 'row-field', field: 'horizontal' });
    expect(second(ROW_M.slice(0, ROW_M.lastIndexOf(',')))).toEqual({ ordinal: 1, code: 'row-columns', count: 10 });
    expect(second(ROW_A + ',"x"')).toEqual({ ordinal: 1, code: 'row-columns', count: 13 });
    expect(second('')).toEqual({ ordinal: 1, code: 'row-blank' });
    expect(second(ROW_A.replace('capture.PLR', 'capturé.PLR'))).toEqual({ ordinal: 1, code: 'row-text', position: ROW_A.indexOf('capture') + 7 });
    expect(second(ROW_A.replace('note, unchanged', 'note\tx'))).toMatchObject({ ordinal: 1, code: 'row-text' });
  });
  it('maps the reader line to the ordinal for every name count (first row is physical line 6 + k)', () => {
    for (let k = 0; k <= 4; k++) {
      const names = ['A', 'B', 'C', 'D'].map((n, i) => (i < k ? n : '')) as unknown as ResultsExportMetadata['names'];
      expect(refusedRow(buildResultsExport(meta({ names }), [ROW_A, ROW_M, ROW_A + ',"x"']))).toEqual({ ordinal: 2, code: 'row-columns', count: 13 });
      expect(refusedRow(buildResultsExport(meta({ names }), ['"x"']))).toEqual({ ordinal: 0, code: 'row-columns', count: 1 });
    }
  });
  it('refuses a stored row that does not agree with its structured fields', () => {
    const r = exportPulsarResults(GOLDEN_META, [GOLDEN_ENTRIES[0], entry(2, { ...FIELDS_M, comment: 'other' }, ROW_M)]);
    expect(refusedRow(r)).toEqual({ ordinal: 1, code: 'row-fields-mismatch', field: 'comment', count: 11 });
    expect(refusedRow(exportPulsarResults(GOLDEN_META, [entry(1, { ...FIELDS_A, file: null }, ROW_A)]))).toEqual({ ordinal: 0, code: 'row-fields-mismatch', count: 12 });
    expect(refusedRow(exportPulsarResults(GOLDEN_META, [entry(1, { ...FIELDS_A, reference: '0.000000' }, ROW_A)]))).toEqual({ ordinal: 0, code: 'row-fields-mismatch', field: 'reference', count: 12 });
    expect(refusedRow(exportPulsarResults(GOLDEN_META, [entry(1, { ...FIELDS_M, horizontal: '' }, ROW_M)]))).toEqual({ ordinal: 0, code: 'row-fields-mismatch', field: 'horizontal', count: 11 });
  });
});

describe('RX10-11 WEB bounds', () => {
  it('admits the largest lexical row (753 bytes under every field cap)', () => {
    const row = maxRow();
    expect(row.length).toBe(753);
    expect(textOf(buildResultsExport(META, [row])).endsWith(row + '\r\n')).toBe(true);
  });
  it('a 1024-byte row cannot be valid (profile refusal), a 1025-byte row is refused by size', () => {
    const at1024 = maxRow(255 + 271), at1025 = maxRow(255 + 272);
    expect(at1024.length).toBe(1024);
    expect(refusedRow(buildResultsExport(META, [ROW_A, at1024]))).toEqual({ ordinal: 1, code: 'row-field', field: 'file' });
    expect(at1025.length).toBe(1025);
    expect(refusedRow(buildResultsExport(META, [ROW_A, at1025]))).toEqual({ ordinal: 1, code: 'row-length', length: 1025 });
  });
  it('2000 rows accepted, 2001 refused', () => {
    // Five header lines without names (date/time, table, blank, blank, column header), then the rows.
    expect(textOf(buildResultsExport(META, Array.from({ length: 2000 }, () => ROW_M))).split('\r\n').length - 1).toBe(5 + 2000);
    expect(refusedList(buildResultsExport(META, Array.from({ length: 2001 }, () => ROW_M)))).toEqual({ code: 'too-many-rows', count: 2001, max: 2000 });
  });
  it('more than 1 MiB in total is refused with no partial result', () => {
    const rows = Array.from({ length: 1500 }, () => maxRow());
    const r = buildResultsExport(META, rows);
    const list = refusedList(r);
    expect(list?.code).toBe('too-large');
    if (list?.code === 'too-large') { expect(list.bytes).toBeGreaterThan(1_048_576); expect(list.max).toBe(1_048_576); }
    expect('bytes' in r).toBe(false);
    expect(buildResultsExport(META, rows.slice(0, 1000)).ok).toBe(true);
  });
});

describe('RX10-12 no mutation, fresh bytes', () => {
  const deepFreeze = <T>(v: T): T => { if (v && typeof v === 'object') { for (const x of Object.values(v)) deepFreeze(x); Object.freeze(v); } return v; };
  it('leaves frozen inputs unchanged and returns a new Uint8Array per call', () => {
    const m = deepFreeze({ ...GOLDEN_META, names: [...GOLDEN_META.names] as unknown as ResultsExportMetadata['names'] });
    const entries = deepFreeze(GOLDEN_ENTRIES.map(e => ({ ...e, fields: { ...e.fields } })));
    const before = JSON.stringify([m, entries]);
    const a = exportPulsarResults(m, entries), b = exportPulsarResults(m, entries);
    if (!a.ok || !b.ok) throw new Error('refused');
    expect(JSON.stringify([m, entries])).toBe(before);
    expect(a.bytes).not.toBe(b.bytes);
    a.bytes.fill(0);
    const c = exportPulsarResults(m, entries);
    if (!c.ok) throw new Error('refused');
    expect(sha256(c.bytes)).toBe(GOLDEN_SHA);
    expect(sha256(b.bytes)).toBe(GOLDEN_SHA);
  });
});

describe('rows recorded by the web analysis core', () => {
  const record = (s0: PulsarAnalysisState, comment: string) => {
    let s = pulsarPointer(s0, 0, { phase: 'down', button: 'left', leftHeld: false, rightHeld: false, x: 2, y: 0 }).state;
    s = pulsarPointer(s, 0, { phase: 'up', button: 'left', leftHeld: false, rightHeld: false, x: 2, y: 0 }).state;
    s = pulsarBeginRecord(s).state;
    s = pulsarRecordDraft(s, comment).state;
    return pulsarConfirmRecord(s).state;
  };
  it('a model-generated memory capture gives 11-column rows that export unchanged', () => {
    const memory = pulsarMemoryRecording({ captureId: 1, name: 'PSR B2358+38', aperture: 100, highestIndex: 0, frequencies: [600, null, null], gains: [2, null, null],
      start: 50000.5, interval: 0.01, rows: Array.from({ length: 30 }, (_, i) => [i % 5, 0, 0]).flat(), full: false });
    const s = record(pulsarActivateData(INITIAL_PULSAR_ANALYSIS, memory).state, 'memory, pulse');
    expect(s.list).toHaveLength(1);
    const r = exportPulsarResults(GOLDEN_META, s.list);
    if (!r.ok) throw new Error(JSON.stringify(r));
    const row = r.text.split('\r\n')[7];
    expect(row).toBe(s.list[0].nativeLineCandidate);
    expect(row.startsWith('"PSR B2358+38",600.00,2.000,')).toBe(true);
    const admitted = admitSavedRows(r.bytes, 'x');
    expect(admitted.ok && admitted.source.rows.map(x => x.columns)).toEqual([11]);
  });
  const plr = (fileName: string) => {
    const text = ["'SYNTHETIC',40,1", '430.00,1420.00,0', '1.000,0.000,1.000', '49999.12345678,0.01', ...Array.from({ length: 20 }, (_, i) => `${i % 5},10,0`)].join('\r\n') + '\r\n';
    const a = admitPlrRecording(new TextEncoder().encode(text), fileName);
    if (a.status === 'rejected') throw new Error(a.reason);
    return record(pulsarLoad(INITIAL_PULSAR_ANALYSIS, a.recording).state, 'file, pulse');
  };
  it('a file recording gives a 12-column row ending in its browser file name', () => {
    const s = plr('synthetic.plr');
    const r = exportPulsarResults(GOLDEN_META, s.list);
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.text.endsWith(',"synthetic.plr"\r\n')).toBe(true);
  });
  it('refuses rows whose file name is not printable ASCII or holds a double quote; nothing is repaired', () => {
    expect(refusedRow(exportPulsarResults(GOLDEN_META, plr('é.plr').list))).toMatchObject({ ordinal: 0, code: 'row-text' });
    expect(refusedRow(exportPulsarResults(GOLDEN_META, plr('a"b.plr').list))).toEqual({ ordinal: 0, code: 'row-quote' });
  });
  it('a 256-character browser name is stored as 255 by the existing PLR admission; export keeps that confirmed row unchanged', () => {
    const input = `${'n'.repeat(252)}.plr`, stored = input.slice(0, 255);
    expect(input.length).toBe(256);
    // Baseline admission (pulsarRecording.ts) already holds the 255-character name; export does not cut anything itself.
    const s = plr(input);
    expect(s.list).toHaveLength(1);
    const e = s.list[0];
    expect(e.fields.file).toBe(stored);
    expect(e.nativeLineCandidate.endsWith(`,"${stored}"`)).toBe(true);
    const before = JSON.stringify(e);
    const r = exportPulsarResults(GOLDEN_META, s.list);
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.text.endsWith(`${e.nativeLineCandidate}\r\n`)).toBe(true);
    expect(JSON.stringify(e)).toBe(before);
  });
  it('refuses a directly supplied stored row whose file field exceeds 255, without truncating or repairing it', () => {
    const e = plr('synthetic.plr').list[0], long = `${'n'.repeat(252)}.plr`;
    const over = Object.freeze({ ...e, fields: Object.freeze({ ...e.fields, file: long }), nativeLineCandidate: e.nativeLineCandidate.replace('"synthetic.plr"', `"${long}"`) });
    expect(over.nativeLineCandidate.endsWith(`,"${long}"`)).toBe(true);
    const before = JSON.stringify(over);
    const r = exportPulsarResults(GOLDEN_META, [over]);
    expect(refusedRow(r)).toEqual({ ordinal: 0, code: 'row-field', field: 'file' });
    expect('bytes' in r).toBe(false);
    expect(JSON.stringify(over)).toBe(before);
    expect(over.fields.file).toHaveLength(256);
  });
});

describe('export dialog session', () => {
  const open = () => resultsExportOpen(GOLDEN_ENTRIES, 4);
  const ctx = (s: ResultsExportSession, patch: Partial<{ list: readonly PulsarMeasurementEntry[]; generation: number; ready: boolean }> = {}) => ({ list: s.list, generation: s.generation, ready: true, ...patch });
  const fill = (s: ResultsExportSession, values: Partial<Record<ResultsExportField, string>>) =>
    Object.entries(values).reduce((acc, [f, v]) => resultsExportEdit(acc, f as ResultsExportField, v), s);
  it('opens with every field empty (nothing is filled in)', () => {
    const s = open();
    expect(s.draft).toEqual({ date: '', time: '', table: '', names: ['', '', '', ''] });
    expect(s.refusal).toBeNull();
    expect(s.oversize).toEqual([]);
  });
  it('a valid draft gives the artifact; the session is not consumed by the core', () => {
    const s = fill(open(), { date: '25/10/2026', time: '16:00:00', table: '7', name1: 'Observer A', name3: 'Observer C' });
    const r = resultsExportRequest(s, ctx(s));
    if (r.kind !== 'artifact') throw new Error('refused');
    expect(sha256(r.bytes)).toBe(GOLDEN_SHA);
    expect(r.rowCount).toBe(3);
  });
  it('an invalid draft within 256 characters stays visible and editable, and is refused', () => {
    const s = fill(open(), { date: 'x"y', time: 't' });
    expect(s.draft.date).toBe('x"y');
    const r = resultsExportRequest(s, ctx(s));
    expect(r.kind).toBe('refused');
    if (r.kind === 'refused') { expect(r.session.refusal).toEqual({ code: 'metadata' }); expect(r.session.draft.date).toBe('x"y'); expect(r.session.attempted).toBe(true); }
  });
  it('an edit over 256 characters is not taken, latches its field and keeps the previous text', () => {
    const s = fill(open(), { date: 'kept', time: 't' });
    const over = resultsExportEdit(s, 'date', 'x'.repeat(257));
    expect(over).not.toBe(s);
    expect(over.draft.date).toBe('kept');
    expect(over.oversize).toEqual([{ field: 'date', length: 257 }]);
    expect(resultsExportEdit(s, 'date', 'x'.repeat(256)).draft.date).toBe('x'.repeat(256));
  });
  it('regression: valid date, oversize replacement, another field edited → no download of the stale old date', () => {
    let s = fill(open(), { date: 'valid date', time: 't' });
    s = resultsExportEdit(s, 'date', 'z'.repeat(300));
    s = resultsExportEdit(s, 'time', 'later');
    expect(s.oversize).toEqual([{ field: 'date', length: 300 }]);
    const r = resultsExportRequest(s, ctx(s));
    expect(r.kind).toBe('refused');
    if (r.kind !== 'refused') return;
    expect(r.session.refusal).toEqual({ code: 'oversize' });
    // Only a within-bound edit of the same field clears the latch.
    const fixed = resultsExportEdit(r.session, 'date', 'new date');
    expect(fixed.oversize).toEqual([]);
    const ok = resultsExportRequest(fixed, ctx(fixed));
    if (ok.kind !== 'artifact') throw new Error('refused');
    expect(ok.text.startsWith('"new date","later"\r\n')).toBe(true);
  });
  it('ignores non-string values and unknown fields (same object)', () => {
    const s = open();
    expect(resultsExportEdit(s, 'date', 5)).toBe(s);
    expect(resultsExportEdit(s, 'nope' as ResultsExportField, 'x')).toBe(s);
  });
  it('refuses a changed list object or generation as stale, and an unready host as not-ready, keeping the draft', () => {
    const s = fill(open(), { date: 'd', time: 't' });
    for (const [patch, code] of [[{ list: [...GOLDEN_ENTRIES] }, 'stale'], [{ generation: 5 }, 'stale'], [{ ready: false }, 'not-ready']] as const) {
      const r = resultsExportRequest(s, ctx(s, patch));
      expect(r.kind).toBe('refused');
      if (r.kind === 'refused') { expect(r.session.refusal).toEqual({ code }); expect(r.session.draft).toBe(s.draft); expect(r.session.list).toBe(s.list); }
    }
  });
  it('a row refusal names the snapshot ordinal and survives metadata edits', () => {
    const s0 = resultsExportOpen([GOLDEN_ENTRIES[0], entry(9, FIELDS_A, ROW_A.replace('capture', 'capturé'))], 1);
    const s = fill(s0, { date: 'd', time: 't' });
    const r = resultsExportRequest(s, ctx(s));
    if (r.kind !== 'refused') throw new Error('accepted');
    expect(r.session.refusal).toMatchObject({ code: 'row', problem: { ordinal: 1, code: 'row-text' } });
    expect(r.session.list[1].sequence).toBe(9);
    expect(resultsExportEdit(r.session, 'table', '1').refusal).toEqual(r.session.refusal);
  });
  it('a download failure keeps the draft; an edit clears the failure', () => {
    const s = fill(open(), { date: 'd', time: 't' });
    const failed = resultsExportDownloadFailed(s);
    expect(failed.failure).toBe(true);
    expect(failed.draft).toBe(s.draft);
    expect(failed.list).toBe(s.list);
    expect(resultsExportEdit(failed, 'table', '2').failure).toBe(false);
    expect(resultsExportRequest(failed, ctx(failed)).kind).toBe('artifact');
  });
});

describe('provenance file', () => {
  const doc = JSON.parse(readFileSync(path.join(root, 'docs/PULSAR-RESULTS-EXPORT-PROVENANCE.json'), 'utf8'));
  it('lists every contract, the evidence hashes, the golden hashes and the limits of the code', () => {
    const ids = doc.contracts.map((c: { id: string }) => c.id);
    for (let i = 1; i <= 10; i++) expect(ids).toContain(`NWE-${String(i).padStart(2, '0')}`);
    for (let i = 1; i <= 5; i++) expect(ids).toContain(`WEB-NWE-${String(i).padStart(2, '0')}`);
    expect(doc.sourceSHA256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
    expect(doc.golden.jsonSHA256).toBe('2c69cffa83ba8673a6b8fbe13008a8f1aa933b085ddc1623d019568a38679c5e');
    expect(doc.golden.bytesSHA256).toBe(GOLDEN_SHA);
    expect(doc.golden.byteLength).toBe(510);
    expect(doc.evidence['result-writer-code-only.asm']).toBe('d3db8fa7beab51c97a646644f21e84fbf3e4a3df4c904621289d2a8698ab6ef0');
    expect(doc.evidence['fresh-write-newline.asm']).toBe('dcb303c2e90da43f8df533621789cfa64509e1e45b8c9213760c603c364cd44b');
    expect(doc.limits).toEqual({ ...RESULTS_EXPORT_LIMITS });
    expect(doc.fileName).toBe(RESULTS_EXPORT_FILE_NAME);
    expect(doc.noOriginalExecutionOrEmulation).toBe(true);
  });
});
