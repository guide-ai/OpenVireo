import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as appendModule from './pulsarResultsAppend';
import {
  appendPulsarResults, buildResultsAppend, RESULTS_APPEND_FILE_NAME, RESULTS_APPEND_LIMITS, RESULTS_APPEND_MEDIA_TYPE, resultsAppendBeginRead, resultsAppendCancelRead,
  resultsAppendDownloadFailed, resultsAppendOpen, resultsAppendReadFinished, resultsAppendRequest, type ResultsAppendBuild, type ResultsAppendSession,
} from './pulsarResultsAppend';
import { buildResultsExport } from './pulsarResultsExport';
import { admitSavedRows, type SavedRowsSource } from './pulsarSavedRows';
import type { PulsarEntryFields, PulsarMeasurementEntry } from './pulsarAnalysis';

// R-RX12 acceptance (docs/PULSAR-RESULTS-APPEND.md, cases AP-01..AP-33). Every vector below is synthetic: not CLEA output, not
// an observation and not a native writer oracle. The two golden targets are copied by hand from the independent
// pre-implementation files LF-opaque-empty-target.csv and CRLF-opaque-target.csv; the expected SHA-256 values are those of the
// independent expected files (RECOVERED-CONTRACT.json). Nothing here is derived from product constants.
const root = path.resolve(import.meta.dirname, '../..');
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const ascii = (text: string) => Uint8Array.from(text, c => c.charCodeAt(0));
const textOf = (bytes: Uint8Array) => String.fromCharCode(...bytes);

const HEADER_TEXT = '"Object","Freq (MHz)","Gain (Rel)","Ref (Secs)","Vert (Secs)","Horz (Rel)","Start (JD)","Comments","Data Pts","Del T (msec)","Aperture (M)","File Name"';
const ROW_A = '"PSR B0329+54",408.00,1.000,0.123456,"",5.0000E-01,49999.12345678,"first, pulse",1000,10.00,26,"C:\\CLEA\\PULSARS\\B0329.PLR"';
const ROW_B = '"PSR B0531+21",1420.00,2.500,"",0.033000,"",50000.50000000,"",2000,1.00,300';
const ROW_C = '"PSR B1919+21",430.00,0.500,1.337000,0.250000,-1.2345E+02,49000.00000000,"Crab? no, B1919",500,33.33,40,"D:\\data\\b1919+21.plr"';
const FIELDS_A: PulsarEntryFields = Object.freeze({
  object: 'PSR B0329+54', frequency: '408.00', gain: '1.000', reference: '0.123456', vertical: null, horizontal: '5.0000E-01',
  start: '49999.12345678', comment: 'first, pulse', points: '1000', intervalMs: '10.00', aperture: '26', file: 'C:\\CLEA\\PULSARS\\B0329.PLR',
});
const FIELDS_B: PulsarEntryFields = Object.freeze({
  object: 'PSR B0531+21', frequency: '1420.00', gain: '2.500', reference: null, vertical: '0.033000', horizontal: null,
  start: '50000.50000000', comment: '', points: '2000', intervalMs: '1.00', aperture: '300', file: null,
});
const entry = (sequence: number, fields: PulsarEntryFields, line: string): PulsarMeasurementEntry => Object.freeze({ sequence, panel: 0, fields, nativeLineCandidate: line });
const A = (n: number) => entry(n, FIELDS_A, ROW_A), B = (n: number) => entry(n, FIELDS_B, ROW_B);

const LF_TARGET = '"",""\n"Table Number:  1 "\n\n"  learner  "\n\n' + HEADER_TEXT + '\n' + ROW_A + '\n' + ROW_B + '\n';
const CRLF_TARGET = ['"opaque date","opaque time"', '"Table Number: "', '', '', HEADER_TEXT, ROW_A, ROW_B].map(l => l + '\r\n').join('');
const GOLDEN = [
  { id: 'LF-opaque-empty', text: LF_TARGET, nl: '\n', newline: 'LF', targetBytes: 393, targetSHA: 'bb906de92e4b739ef13ceea1a3a4b1293f15eeb8cf785a7c32883d7c0c88aced', expectedBytes: 715, expectedSHA: 'c002db30c09af3d422a8e6167245caa4eb1b8debb21fd722323df9b0881480aa' },
  { id: 'CRLF-opaque', text: CRLF_TARGET, nl: '\r\n', newline: 'CRLF', targetBytes: 405, targetSHA: '7d761927fa53c501c2c7981c5eb359bab6c06d317a57d049b88191217d4c2a5b', expectedBytes: 730, expectedSHA: '63525480a1e3ad3a579ac2275171636af232b931389a9b0302679665afff7c3a' },
] as const;
const GOLDEN_APPEND = Object.freeze([B(1), A(2), A(3)]);

const admit = (text: string, name = 'target.csv'): SavedRowsSource => {
  const a = admitSavedRows(ascii(text), name);
  if (!a.ok) throw new Error(`not admitted: ${JSON.stringify(a.error)}`);
  return a.source;
};
const bytesOf = (r: ResultsAppendBuild) => { if (!r.ok) throw new Error(`refused: ${JSON.stringify(r)}`); return r.bytes; };
const refusedList = (r: ResultsAppendBuild) => { expect(r.ok).toBe(false); expect('bytes' in r).toBe(false); return r.ok ? null : r.list; };
const refusedRow = (r: ResultsAppendBuild) => { expect(r.ok).toBe(false); expect('bytes' in r).toBe(false); return r.ok ? null : r.row; };
const minimal = (rows: readonly string[], nl = '\n') => ['"d","t"', '"Table Number: "', '', '', HEADER_TEXT, ...rows].map(l => l + nl).join('');

describe('AP-01/02 golden prefixes are preserved exactly', () => {
  for (const g of GOLDEN) {
    it(`${g.id}: target, output and independent prefix SHA-256, suffix in the target line ending`, () => {
      const targetBytes = ascii(g.text);
      expect(targetBytes.length).toBe(g.targetBytes);
      expect(sha256(targetBytes)).toBe(g.targetSHA);
      const target = admit(g.text);
      expect(target.newline).toBe(g.newline);
      const r = appendPulsarResults(target, GOLDEN_APPEND);
      if (!r.ok) throw new Error(JSON.stringify(r));
      expect(r.bytes.length).toBe(g.expectedBytes);
      expect(sha256(r.bytes)).toBe(g.expectedSHA);
      expect(sha256(r.bytes.subarray(0, g.targetBytes))).toBe(g.targetSHA);
      expect(textOf(r.bytes.subarray(g.targetBytes))).toBe([ROW_B, ROW_A, ROW_A].map(l => l + g.nl).join(''));
      expect(r).toMatchObject({ newline: g.newline, prefixBytes: g.targetBytes, oldRows: 2, addedRows: 3, totalRows: 5 });
    });
  }
  it('the empty date/time pair and an opaque table text are kept as bytes, never rebuilt or validated by the fresh rules', () => {
    const r = bytesOf(appendPulsarResults(admit(LF_TARGET), [A(1)]));
    expect(textOf(r).startsWith('"",""\n"Table Number:  1 "\n\n"  learner  "\n\n')).toBe(true);
    // The fresh export would refuse this metadata (required date and time); append does not consult it.
    expect(buildResultsExport({ date: '', time: '', table: ' 1 ', names: ['  learner  ', '', '', ''] }, [ROW_A]).ok).toBe(false);
  });
});

describe('AP-03/04/33 order, duplicates, mixed columns and counts', () => {
  const CONTROL = ['"10/22/2026","9:41:07 AM"', '"Table Number: 3"', '', '"Ada Student"', '"Ben Student"', '', HEADER_TEXT, ROW_A, ROW_A, ROW_B, ROW_C].map(l => l + '\r\n').join('');
  it('A/A/B/C then A/B/A: every old and new row in order, duplicates kept, nothing merged', () => {
    const r = appendPulsarResults(admit(CONTROL), [A(1), B(2), A(3)]);
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r).toMatchObject({ oldRows: 4, addedRows: 3, totalRows: 7, newline: 'CRLF' });
    const back = admitSavedRows(r.bytes, RESULTS_APPEND_FILE_NAME);
    if (!back.ok) throw new Error('readback');
    expect(back.source.rows.map(row => row.text)).toEqual([ROW_A, ROW_A, ROW_B, ROW_C, ROW_A, ROW_B, ROW_A]);
    expect(back.source.rows.map(row => row.columns)).toEqual([12, 12, 11, 12, 12, 11, 12]);
    expect(back.source.metadata.identities.map(i => i.value)).toEqual(['Ada Student', 'Ben Student']);
  });
});

describe('AP-05 no scalar parse or reformat', () => {
  it('edge spellings pass through unchanged', () => {
    const odd = '"x",400.,1.,"",-0.0,-1.2345E+02,0049999.10,"",0010,0.,00007,"a.plr"';
    const fields: PulsarEntryFields = { object: 'x', frequency: '400.', gain: '1.', reference: null, vertical: '-0.0', horizontal: '-1.2345E+02', start: '0049999.10', comment: '', points: '0010', intervalMs: '0.', aperture: '00007', file: 'a.plr' };
    const out = textOf(bytesOf(appendPulsarResults(admit(LF_TARGET), [entry(1, fields, odd)])));
    expect(out.endsWith('\n' + odd + '\n')).toBe(true);
  });
  it('the module parses no number and reads no clock, locale, browser or storage (source scan)', () => {
    const source = readFileSync(path.join(root, 'src/core/pulsarResultsAppend.ts'), 'utf8');
    for (const forbidden of [/\bNumber\s*\(/, /parseFloat/, /parseInt/, /toFixed/, /toPrecision/, /\bDate\s*[.(]/, /new\s+Date\b/, /\bIntl\b/, /toLocale/, /\bnavigator\b/, /Storage\b/, /indexedDB/, /\bwindow\b/, /\bdocument\b/])
      expect(source).not.toMatch(forbidden);
  });
});

describe('AP-06 byte ownership', () => {
  const deepFreeze = <T>(v: T): T => { if (v && typeof v === 'object') { for (const x of Object.values(v)) deepFreeze(x); Object.freeze(v); } return v; };
  it('copies the supplied buffer and returns a new array per call; frozen inputs stay unchanged', () => {
    const input = ascii(LF_TARGET), target = admitSavedRows(input, 't.csv');
    if (!target.ok) throw new Error('not admitted');
    input.fill(0x41);
    const entries = deepFreeze(GOLDEN_APPEND.map(e => ({ ...e, fields: { ...e.fields } })));
    const before = JSON.stringify(entries);
    const a = bytesOf(appendPulsarResults(target.source, entries)), b = bytesOf(appendPulsarResults(target.source, entries));
    expect(a).not.toBe(b);
    a.fill(0);
    expect(sha256(b)).toBe(GOLDEN[0].expectedSHA);
    expect(sha256(bytesOf(appendPulsarResults(target.source, entries)))).toBe(GOLDEN[0].expectedSHA);
    expect(JSON.stringify(entries)).toBe(before);
  });
});

describe('AP-07/08 the confirmed list', () => {
  const target = admit(LF_TARGET);
  it('an empty list is refused first, before the target is examined (NAP-01 order)', () => {
    expect(buildResultsAppend(target, [])).toEqual({ ok: false, list: { code: 'no-rows' }, row: null });
    expect(buildResultsAppend({} as SavedRowsSource, [])).toEqual({ ok: false, list: { code: 'no-rows' }, row: null });
    expect(appendPulsarResults(target, []).ok).toBe(false);
  });
  it('invalid rows are refused with their position among the NEW rows (not the file row ordinal)', () => {
    const second = (bad: string) => refusedRow(buildResultsAppend(target, [ROW_A, bad]));
    expect(second(ROW_A.replace('"PSR B0329+54"', '"PSR "A""'))).toEqual({ ordinal: 1, code: 'row-quote' });
    expect(second(ROW_A.replace('408.00', '408,00'))).toEqual({ ordinal: 1, code: 'row-columns', count: 13 });
    expect(second(ROW_A.replace('5.0000E-01', '5.0000e-01'))).toEqual({ ordinal: 1, code: 'row-field', field: 'horizontal' });
    expect(second('')).toEqual({ ordinal: 1, code: 'row-blank' });
    expect(second(ROW_A.replace('first', 'fírst'))).toEqual({ ordinal: 1, code: 'row-text', position: ROW_A.indexOf('first') + 2 });
    expect(second(ROW_A.replace('first', 'fi\x0erst'))).toMatchObject({ ordinal: 1, code: 'row-text' });
    expect(second('x'.repeat(1025))).toEqual({ ordinal: 1, code: 'row-length', length: 1025 });
    expect(second(5 as unknown as string)).toEqual({ ordinal: 1, code: 'row-text' });
  });
  it('a stored row must agree with its structured fields (ordinal relative to the new rows)', () => {
    expect(refusedRow(appendPulsarResults(target, [A(1), entry(2, { ...FIELDS_B, comment: 'other' }, ROW_B)]))).toEqual({ ordinal: 1, code: 'row-fields-mismatch', field: 'comment', count: 11 });
    expect(refusedRow(appendPulsarResults(target, [entry(1, { ...FIELDS_A, file: null }, ROW_A)]))).toEqual({ ordinal: 0, code: 'row-fields-mismatch', count: 12 });
    expect(refusedRow(appendPulsarResults(target, [B(1), entry(2, { ...FIELDS_A, reference: null }, ROW_A)]))).toEqual({ ordinal: 1, code: 'row-fields-mismatch', field: 'reference', count: 12 });
  });
});

describe('AP-09..12 refused targets cannot become a target', () => {
  const cases: [string, string][] = [
    ['empty', ''],
    ['header', LF_TARGET.replace('"Object"', '"Objekt"')],
    ['date-time', LF_TARGET.replace('"",""', '"",')],
    ['metadata-quote', LF_TARGET.replace('"Table Number:  1 "', '"Table Number:  1 ""')],
    ['bare-cr', LF_TARGET.replace('"",""\n', '"",""\r')],
    ['mixed-newlines', LF_TARGET.replace('"",""\n', '"",""\r\n')],
    ['unterminated', LF_TARGET.slice(0, -1)],
    ['control', LF_TARGET.slice(0, -10) + '\x0e' + LF_TARGET.slice(-9)], // 0x0e inside the native 128-byte scan window
    ['control', LF_TARGET.replace('learner', 'lea\x0erner')],              // 0x0e in metadata
    ['control', LF_TARGET.replace('first, pulse', 'first,\x0e pulse')],    // 0x0e in a row
    ['control', LF_TARGET.slice(0, -1) + '\x1a\n'],                         // 0x1a
    ['control', LF_TARGET.replace('first, pulse', 'first,\tpulse')],
    ['nul', LF_TARGET.replace('first', 'fi\x00rst')],
    ['control', LF_TARGET.replace('first', 'fi\x7frst')],
    ['no-rows', minimal([])],
  ];
  cases.forEach(([code, text], i) => {
    it(`case ${i}: ${code}`, () => {
      const a = admitSavedRows(ascii(text), 't.csv');
      expect(a.ok).toBe(false);
      if (!a.ok) expect(a.error.code).toBe(code);
      expect('source' in a).toBe(false);
    });
  });
  it('0x0e within the last 128 bytes really is inside the native scan window', () => {
    const text = cases[7][1];
    expect(text.length - text.indexOf('\x0e')).toBeLessThanOrEqual(128);
  });
});

describe('AP-13 unowned targets', () => {
  it('spread, cloned and fabricated sources are refused as target-unowned, with no bytes', () => {
    const target = admit(LF_TARGET);
    for (const fake of [{ ...target }, structuredClone(target), Object.freeze({ fileName: 'x', byteLength: 0, newline: 'LF', lines: [], metadata: target.metadata, rows: target.rows }) as SavedRowsSource, null as unknown as SavedRowsSource])
      expect(refusedList(buildResultsAppend(fake, [ROW_A]))).toEqual({ code: 'target-unowned' });
  });
});

describe('AP-14/15 combined bounds, checked before the output exists', () => {
  it('2000 combined rows are accepted; 2001 are refused with old and new counts', () => {
    const t1999 = admit(minimal(Array.from({ length: 1999 }, () => ROW_B)));
    const r = buildResultsAppend(t1999, [ROW_B]);
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.totalRows).toBe(2000);
    expect(refusedList(buildResultsAppend(t1999, [ROW_B, ROW_B]))).toEqual({ code: 'too-many-rows', old: 1999, added: 2, max: 2000 });
    const t2000 = admit(minimal(Array.from({ length: 2000 }, () => ROW_B)));
    expect(refusedList(buildResultsAppend(t2000, [ROW_B]))).toEqual({ code: 'too-many-rows', old: 2000, added: 1, max: 2000 });
  });
  /** A valid 12-column row of exactly n bytes (29 ≤ n ≤ 639), every field within the strict profile. */
  function rowLen(n: number): string {
    let extra = n - 29;
    const take = (max: number) => { const k = Math.min(max, extra); extra -= k; return k; };
    const file = 'f'.repeat(take(255)), comment = 'c'.repeat(take(81)), object = 'o'.repeat(take(40));
    const [freq, gain, start, points, interval, aperture] = Array.from({ length: 6 }, () => '1' + '0'.repeat(take(39)));
    if (extra !== 0) throw new Error(`row length ${n}`);
    return [`"${object}"`, freq, gain, '""', '""', '""', start, `"${comment}"`, points, interval, aperture, `"${file}"`].join(',');
  }
  const rowsFilling = (remaining: number) => {
    const out: string[] = [];
    while (remaining > 0) {
      const line = remaining > 670 ? 640 : remaining > 640 ? remaining - 30 : remaining;
      out.push(rowLen(line - 1)); remaining -= line;
    }
    return out;
  };
  it('exactly 1,048,576 bytes are accepted; one more byte is refused with no partial result', () => {
    expect(rowLen(29).length).toBe(29);
    expect(rowLen(639).length).toBe(639);
    const target = admit(minimal([ROW_B]));
    const exact = rowsFilling(RESULTS_APPEND_LIMITS.maxBytes - target.byteLength);
    const r = buildResultsAppend(target, exact);
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.bytes.length).toBe(1_048_576);
    expect(r.totalRows).toBeLessThanOrEqual(2000);
    const over = rowsFilling(RESULTS_APPEND_LIMITS.maxBytes + 1 - target.byteLength);
    expect(refusedList(buildResultsAppend(target, over))).toEqual({ code: 'too-large', bytes: 1_048_577, max: 1_048_576 });
  });
});

describe('AP-16 no rewrite or fallback', () => {
  it('the module exposes no metadata or header builder, and never writes a header itself', () => {
    expect(Object.keys(appendModule).sort()).toEqual([
      'RESULTS_APPEND_FILE_NAME', 'RESULTS_APPEND_LIMITS', 'RESULTS_APPEND_MEDIA_TYPE', 'appendPulsarResults', 'buildResultsAppend', 'resultsAppendBeginRead',
      'resultsAppendCancelRead', 'resultsAppendDownloadFailed', 'resultsAppendOpen', 'resultsAppendReadFinished', 'resultsAppendRequest',
    ]);
    const source = readFileSync(path.join(root, 'src/core/pulsarResultsAppend.ts'), 'utf8');
    for (const forbidden of [/SAVED_ROWS_HEADER\b/, /SAVED_ROWS_TABLE_PREFIX/, /buildResultsExport/, /Table Number/]) expect(source).not.toMatch(forbidden);
  });
  it('a failing target yields a refusal, not a fresh file', () => {
    const r = buildResultsAppend({ ...admit(LF_TARGET) }, [ROW_A]);
    expect(r).toEqual({ ok: false, list: { code: 'target-unowned' }, row: null });
  });
  it('the fixed download name is never derived from the target name', () => {
    expect(RESULTS_APPEND_FILE_NAME).toBe('pulsar-results-appended.csv');
    expect(RESULTS_APPEND_MEDIA_TYPE).toBe('text/csv');
    const r = bytesOf(appendPulsarResults(admit(LF_TARGET, 'C:\\secret\\path\\mine.csv'), [A(1)]));
    expect(textOf(r)).not.toContain('secret');
  });
});

describe('AP-17 fresh export unchanged', () => {
  it('the R-RX10 golden export still has its independent SHA-256', () => {
    const r = buildResultsExport({ date: '25/10/2026', time: '16:00:00', table: '7', names: ['Observer A', '', 'Observer C', ''] }, [
      '"PSR, A",400.00,1.000,"","",1.00000E-02,2450000.12345678,"note, unchanged",399,0.10,100,"capture.PLR"',
      '"memory",800.00,2.000,0.125000,0.250000,"",2450000.00000000,"",3,0.25,120',
      '"PSR, A",400.00,1.000,"","",1.00000E-02,2450000.12345678,"note, unchanged",399,0.10,100,"capture.PLR"']);
    if (!r.ok) throw new Error('refused');
    expect(sha256(r.bytes)).toBe('a51b30e9544a7fb274149ee97b5e0586d180c4aa16a0b69a959378380c28cf8f');
  });
});

describe('append dialog session (AP-20/21/22/24/27)', () => {
  const list = GOLDEN_APPEND;
  const target = admit(LF_TARGET);
  const ok = { ok: true as const, source: target, sha256: GOLDEN[0].targetSHA };
  const ctx = (s: ResultsAppendSession, patch: Partial<{ list: readonly PulsarMeasurementEntry[]; generation: number; ready: boolean }> = {}) => ({ list: s.list, generation: s.generation, ready: true, ...patch });
  const withTarget = () => resultsAppendReadFinished(resultsAppendBeginRead(resultsAppendOpen(list, 3), 10, 'a.csv'), 10, ok);
  it('opens without a target; a request then is refused as no-target', () => {
    const s = resultsAppendOpen(list, 3);
    expect(s).toMatchObject({ target: null, reading: null, rejection: null, refusal: null, failure: false, notice: null });
    const r = resultsAppendRequest(s, ctx(s));
    expect(r.kind === 'refused' && r.session.refusal).toEqual({ code: 'no-target' });
  });
  it('a finished read gives the owned target and a request gives the golden artifact', () => {
    const s = withTarget();
    expect(s.target).toEqual({ source: target, sha256: GOLDEN[0].targetSHA });
    const r = resultsAppendRequest(s, ctx(s));
    if (r.kind !== 'artifact') throw new Error('refused');
    expect(sha256(r.bytes)).toBe(GOLDEN[0].expectedSHA);
    expect(r).toMatchObject({ oldRows: 2, addedRows: 3, totalRows: 5, newline: 'LF' });
  });
  it('AP-20: a new selection clears the target at once; a failed replacement leaves no target', () => {
    const s = resultsAppendBeginRead(withTarget(), 11, 'b.csv');
    expect(s.target).toBeNull();
    const failed = resultsAppendReadFinished(s, 11, { ok: false, error: { code: 'too-large', count: 2_000_000 } });
    expect(failed.target).toBeNull();
    expect(failed.rejection).toEqual({ fileName: 'b.csv', error: { code: 'too-large', count: 2_000_000 } });
    const r = resultsAppendRequest(failed, ctx(failed));
    expect(r.kind === 'refused' && r.session.refusal).toEqual({ code: 'no-target' });
  });
  it('AP-21: a superseded, cancelled or other-session token changes nothing', () => {
    const first = resultsAppendBeginRead(resultsAppendOpen(list, 3), 20, 'old.csv'), second = resultsAppendBeginRead(first, 21, 'new.csv');
    expect(resultsAppendReadFinished(second, 20, ok)).toBe(second);
    const cancelled = resultsAppendCancelRead(second);
    expect(cancelled.reading).toBeNull();
    expect(resultsAppendReadFinished(cancelled, 21, ok)).toBe(cancelled);
    const reopened = resultsAppendBeginRead(resultsAppendOpen(list, 3), 22, 'again.csv');
    expect(resultsAppendReadFinished(reopened, 21, ok)).toBe(reopened);
    expect(resultsAppendCancelRead(resultsAppendOpen(list, 3)).reading).toBeNull();
  });
  it('AP-21/29: only a learner cancellation leaves the read-cancelled notice; a new selection clears it', () => {
    const reading = resultsAppendBeginRead(withTarget(), 25, 'a.csv');
    const learner = resultsAppendCancelRead(reading, 'learner');
    expect(learner).toMatchObject({ reading: null, target: null, notice: 'read-cancelled' });
    expect(resultsAppendCancelRead(reading).notice).toBeNull();
    expect(resultsAppendCancelRead(reading, 'host').notice).toBeNull();
    expect(resultsAppendReadFinished(learner, 25, ok)).toBe(learner);
    expect(resultsAppendBeginRead(learner, 26, 'b.csv').notice).toBeNull();
    const idle = resultsAppendOpen(list, 3);
    expect(resultsAppendCancelRead(idle, 'learner')).toBe(idle);
    expect(resultsAppendCancelRead(learner, 'learner')).toBe(learner);
  });
  it('AP-22: while a read is running a request is refused as reading', () => {
    const s = resultsAppendBeginRead(withTarget(), 30, 'b.csv');
    const r = resultsAppendRequest(s, ctx(s));
    expect(r.kind === 'refused' && r.session.refusal).toEqual({ code: 'reading' });
  });
  it('AP-24: a changed list object or generation is stale; an unready host is not-ready; the target is kept', () => {
    const s = withTarget();
    for (const [patch, code] of [[{ list: [...list] }, 'stale'], [{ generation: 4 }, 'stale'], [{ ready: false }, 'not-ready']] as const) {
      const r = resultsAppendRequest(s, ctx(s, patch));
      if (r.kind !== 'refused') throw new Error('accepted');
      expect(r.session.refusal).toEqual({ code });
      expect(r.session.target).toBe(s.target);
    }
  });
  it('a row refusal names the new-row position; a list refusal carries the combined counts', () => {
    const bad = resultsAppendReadFinished(resultsAppendBeginRead(resultsAppendOpen([A(1), entry(7, { ...FIELDS_B, gain: '9.9' }, ROW_B)], 1), 40, 'a.csv'), 40, ok);
    const r = resultsAppendRequest(bad, ctx(bad));
    expect(r.kind === 'refused' && r.session.refusal).toEqual({ code: 'row', problem: { ordinal: 1, code: 'row-fields-mismatch', field: 'gain', count: 11 } });
  });
  it('AP-27: a download failure keeps the target for one new request', () => {
    const s = resultsAppendDownloadFailed(withTarget());
    expect(s.failure).toBe(true);
    expect(s.target?.source).toBe(target);
    expect(resultsAppendRequest(s, ctx(s)).kind).toBe('artifact');
  });
});

describe('provenance file', () => {
  const doc = JSON.parse(readFileSync(path.join(root, 'docs/PULSAR-RESULTS-APPEND-PROVENANCE.json'), 'utf8'));
  it('lists every contract and acceptance case, the evidence and golden hashes, and the limits', () => {
    const ids = doc.contracts.map((c: { id: string }) => c.id);
    for (let i = 1; i <= 7; i++) expect(ids).toContain(`NAP-${String(i).padStart(2, '0')}`);
    for (let i = 1; i <= 6; i++) expect(ids).toContain(`WEB-NAP-${String(i).padStart(2, '0')}`);
    expect(Object.keys(doc.acceptance)).toEqual(Array.from({ length: 33 }, (_, i) => `AP-${String(i + 1).padStart(2, '0')}`));
    expect(doc.sourceSHA256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
    expect(doc.evidence['append-open-backend.asm']).toBe('3cc627b999691a62280e79d4a46743a77e5df823d1ca5dedb02d872418cc6701');
    expect(doc.evidence['result-writer-code-only.asm']).toBe('d3db8fa7beab51c97a646644f21e84fbf3e4a3df4c904621289d2a8698ab6ef0');
    for (const g of GOLDEN) expect(doc.golden[g.id]).toEqual({ targetBytes: g.targetBytes, targetSHA256: g.targetSHA, expectedBytes: g.expectedBytes, expectedSHA256: g.expectedSHA, newline: g.newline });
    expect(doc.limits).toEqual({ ...RESULTS_APPEND_LIMITS });
    expect(doc.fileName).toBe(RESULTS_APPEND_FILE_NAME);
    expect(doc.noOriginalExecutionOrEmulation).toBe(true);
  });
});
