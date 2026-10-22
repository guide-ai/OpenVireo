import { describe, expect, it } from 'vitest';
import {
  admitSavedRows, INITIAL_SAVED_ROWS, SAVED_FIND_INITIAL, SAVED_ROW_FIELDS, SAVED_ROWS_HEADER, SAVED_ROWS_HEADER_NAMES, SAVED_ROWS_LIMITS, savedFindLower, savedFindOpen,
  savedFindRun, savedRowsBeginRead, savedRowsBytes, savedRowsCancelRead, savedRowsConfirm, savedRowsDiscardCandidate, savedRowsFind, savedRowsReadFinished,
  savedRowsReassemble, savedRowsSelect, type SavedRowsSource, type SavedRowsWorkspace,
} from './pulsarSavedRows';
import provenance from '../../docs/PULSAR-SAVED-ROWS-PROVENANCE.json';

// HAND-WRITTEN CONTROL FILES. They follow the recovered writer layout but were typed for these tests: they are not
// CLEA output, not acquired observations and not a writer oracle. Numbers, dates, names and paths are invented text.
const HEADER = '"Object","Freq (MHz)","Gain (Rel)","Ref (Secs)","Vert (Secs)","Horz (Rel)","Start (JD)","Comments","Data Pts","Del T (msec)","Aperture (M)","File Name"';
const ROW_A = '"PSR B0329+54",408.00,1.000,0.123456,"",5.0000E-01,49999.12345678,"first, pulse",1000,10.00,26,"C:\\CLEA\\PULSARS\\B0329.PLR"';
const ROW_B = '"PSR B0531+21",1420.00,2.500,"",0.033000,"",50000.50000000,"",2000,1.00,300';
const ROW_C = '"PSR B1919+21",430.00,0.500,1.337000,0.250000,-1.2345E+02,49000.00000000,"Crab? no, B1919",500,33.33,40,"D:\\data\\b1919+21.plr"';
const CONTROL_CRLF =
  '"10/22/2026","9:41:07 AM"\r\n' +
  '"Table Number: 3"\r\n' +
  '\r\n' +
  '"Ada Student"\r\n' +
  '"Ben Student"\r\n' +
  '\r\n' +
  HEADER + '\r\n' +
  ROW_A + '\r\n' +
  ROW_A + '\r\n' +
  ROW_B + '\r\n' +
  ROW_C + '\r\n';
const CONTROL_LF = '"2026-10-22","21:41"\n"Table Number: "\n\n\n' + HEADER + '\n' + ROW_B + '\n';

const ascii = (text: string) => Uint8Array.from(text, c => c.charCodeAt(0));
const text = (bytes: Uint8Array) => String.fromCharCode(...bytes);
const admit = (t: string, name = 'control.csv') => admitSavedRows(ascii(t), name);
const ok = (t: string): SavedRowsSource => { const r = admit(t); if (!r.ok) throw new Error(`rejected: ${JSON.stringify(r.error)}`); return r.source; };
const error = (t: string | Uint8Array) => { const r = typeof t === 'string' ? admit(t) : admitSavedRows(t, 'x'); if (r.ok) throw new Error('admitted'); return r.error; };
/** Control file with replaced rows (CRLF, no identity lines). */
const withRows = (...rows: string[]) => '"d","t"\r\n"Table Number: 1"\r\n\r\n\r\n' + HEADER + '\r\n' + rows.map(r => r + '\r\n').join('');

describe('saved-rows provenance', () => {
  it('names the three contracts, the evidence ids they cite and the WEB limits used by the code', () => {
    expect(provenance.contracts.map(c => c.id)).toEqual(['SAVED-FRAMING-01', 'SAVED-ROW-01', 'SAVED-FIND-01']);
    const ids = new Set(provenance.evidence.map(e => e.id));
    for (const c of provenance.contracts) {
      const cited = c.source.match(/SRC-[A-Z-]+/g) ?? [];
      expect(cited.length).toBeGreaterThan(1);
      for (const id of cited) expect(ids.has(id)).toBe(true);
    }
    const framing = provenance.contracts[0].web, row = provenance.contracts[1].web;
    expect(framing).toContain(`<= ${SAVED_ROWS_LIMITS.maxDateTimeBytes} bytes`);
    expect(row).toContain(`<= ${SAVED_ROWS_LIMITS.maxNumberBytes} bytes`);
    expect(row).toContain(`<= ${SAVED_ROWS_LIMITS.maxRowBytes} bytes`);
    expect(row).toContain(`<= ${SAVED_ROWS_LIMITS.maxRows} rows`);
    expect(provenance.noOriginalExecutionOrEmulation).toBe(true);
  });
});

describe('saved PLR measurement rows: layout of the recovered writer 0x56feac', () => {
  it('pins the header literal 0x570400 and its twelve names', () => {
    expect(SAVED_ROWS_HEADER).toBe(HEADER);
    expect(SAVED_ROWS_HEADER.length).toBe(151);
    expect(SAVED_ROWS_HEADER_NAMES.map(n => `"${n}"`).join(',')).toBe(SAVED_ROWS_HEADER);
    expect(SAVED_ROW_FIELDS).toHaveLength(12);
  });

  it('admits the CRLF control losslessly: exact bytes, line spans, opaque metadata, rows and duplicates by ordinal', () => {
    const input = ascii(CONTROL_CRLF), r = admitSavedRows(input, 'control.csv');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = r.source;
    expect(s.newline).toBe('CRLF');
    expect(s.byteLength).toBe(CONTROL_CRLF.length);
    expect(text(savedRowsBytes(s))).toBe(CONTROL_CRLF);
    expect(text(savedRowsReassemble(s))).toBe(CONTROL_CRLF);
    // Opaque header text: kept as written, nothing interpreted.
    expect(s.metadata.dateTime).toEqual({ line: 1, text: '"10/22/2026","9:41:07 AM"', first: '10/22/2026', second: '9:41:07 AM' });
    expect(s.metadata.table).toEqual({ line: 2, text: '"Table Number: 3"', value: '3' });
    expect(s.metadata.identities.map(i => [i.line, i.value])).toEqual([[4, 'Ada Student'], [5, 'Ben Student']]);
    expect(s.metadata.header).toEqual({ line: 7, text: HEADER });
    // Rows: exact text, file order, duplicates kept as separate ordinals.
    expect(s.rows.map(row => row.text)).toEqual([ROW_A, ROW_A, ROW_B, ROW_C]);
    expect(s.rows.map(row => [row.ordinal, row.line, row.columns])).toEqual([[0, 8, 12], [1, 9, 12], [2, 10, 11], [3, 11, 12]]);
    expect(s.rows[0]).not.toBe(s.rows[1]);
    // Every line and field span points at its exact bytes.
    for (const l of s.lines) expect(CONTROL_CRLF.slice(l.span.start, l.span.end)).toBe(l.text);
    for (const l of s.lines) expect(CONTROL_CRLF.slice(l.terminator.start, l.terminator.end)).toBe('\r\n');
    for (const row of s.rows) {
      expect(CONTROL_CRLF.slice(row.span.start, row.span.end)).toBe(row.text);
      for (const f of row.fields) expect(CONTROL_CRLF.slice(f.span.start, f.span.end)).toBe(f.raw);
      expect(row.fields.map(f => f.raw).join(',')).toBe(row.text);
    }
    // Spellings are kept verbatim; nothing is converted to a Number.
    const a = s.rows[0].fields;
    expect(a.map(f => f.raw)).toEqual(['"PSR B0329+54"', '408.00', '1.000', '0.123456', '""', '5.0000E-01', '49999.12345678', '"first, pulse"', '1000', '10.00', '26', '"C:\\CLEA\\PULSARS\\B0329.PLR"']);
    expect(a[7].inner).toBe('first, pulse');
    expect(a[11].inner).toBe('C:\\CLEA\\PULSARS\\B0329.PLR');
    expect(s.rows[3].fields[5].raw).toBe('-1.2345E+02');
    // The 11-column row has no file field (Record writer 0x570e85 skips it when +0x96 is zero).
    expect(s.rows[2].fields.map(f => f.field)).toEqual(SAVED_ROW_FIELDS.slice(0, 11));
    expect(Object.isFrozen(s) && Object.isFrozen(s.rows) && Object.isFrozen(s.rows[0].fields)).toBe(true);
  });

  it('owns a private byte copy: later changes to the input or to a returned copy do not reach the source', () => {
    const input = ascii(CONTROL_CRLF), r = admitSavedRows(input, 'c.csv');
    if (!r.ok) throw new Error('rejected');
    input[0] = 0x58;
    const copy = savedRowsBytes(r.source);
    copy[1] = 0x58;
    expect(text(savedRowsBytes(r.source))).toBe(CONTROL_CRLF);
    expect(() => savedRowsBytes({ ...r.source })).toThrow('Unknown saved-rows source');
  });

  it('admits the LF branch with an empty table text, no identity lines and empty date/time values', () => {
    const s = ok(CONTROL_LF.replace('"2026-10-22","21:41"', '"",""'));
    expect(s.newline).toBe('LF');
    expect(s.metadata.table.value).toBe('');
    expect(s.metadata.identities).toEqual([]);
    expect(s.metadata.header.line).toBe(5);
    expect(s.rows.map(r => r.text)).toEqual([ROW_B]);
    expect(s.lines.every(l => l.terminator.end - l.terminator.start === 1)).toBe(true);
    expect(text(savedRowsReassemble(s))).toBe(CONTROL_LF.replace('"2026-10-22","21:41"', '"",""'));
  });

  it('admits four identity lines of 1..40 bytes and table text of up to 4 bytes', () => {
    const forty = 'x'.repeat(40);
    const s = ok(`"d","t"\r\n"Table Number: 1234"\r\n\r\n"a"\r\n"${forty}"\r\n"c"\r\n"d"\r\n\r\n${HEADER}\r\n${ROW_B}\r\n`);
    expect(s.metadata.identities.map(i => i.value)).toEqual(['a', forty, 'c', 'd']);
    expect(s.metadata.table.value).toBe('1234');
  });

  it('admits commas inside quoted fields and the bounds of each quoted field', () => {
    const s = ok(withRows(`"${'o'.repeat(40)}",1,2,3,4,"",5,"${'c'.repeat(81)}",6,7,8,"${'f'.repeat(255)}"`, '",,,",1,2,"","","",5,",",6,7,8,","'));
    expect(s.rows[1].fields[0].inner).toBe(',,,');
    expect(s.rows[1].fields[11].inner).toBe(',');
  });

  it('bounds newline-heavy input before allocating every line, while retaining the largest admitted layout', () => {
    // Independent layout count: date/time, table, two blanks and column header = 5; four identities; 2000 rows.
    const header = `"d","t"\n"Table Number: 1"\n\n"a"\n"b"\n"c"\n"d"\n\n${HEADER}\n`;
    const largest = header + (ROW_B + '\n').repeat(2000);
    const admitted = ok(largest);
    expect(admitted.lines).toHaveLength(2009);
    expect(admitted.rows).toHaveLength(2000);
    expect(savedRowsBytes(admitted)).toEqual(ascii(largest));
    expect(error(largest + ROW_B + '\n')).toEqual({ code: 'too-many-lines', line: 2010, count: 2010 });
    expect(error(new Uint8Array(100_000).fill(10))).toEqual({ code: 'too-many-lines', line: 2010, count: 2010 });
  });

  it.each([
    ['empty', new Uint8Array(0), { code: 'empty' }],
    ['too large', new Uint8Array(SAVED_ROWS_LIMITS.maxBytes + 1).fill(0x41), { code: 'too-large', count: SAVED_ROWS_LIMITS.maxBytes + 1 }],
    ['UTF-8 BOM', ascii('\xef\xbb\xbf' + CONTROL_CRLF), { code: 'bom', offset: 0 }],
    ['NUL', ascii(CONTROL_CRLF.replace('Ada', 'A\0a')), { code: 'nul', offset: CONTROL_CRLF.indexOf('Ada') + 1, line: 4 }],
    ['non-ASCII byte', ascii(CONTROL_CRLF.replace('first', 'fïrst')), { code: 'non-ascii', offset: CONTROL_CRLF.indexOf('first') + 1, line: 8 }],
    ['tab', ascii(CONTROL_CRLF.replace('first,', 'first\t')), { code: 'control', offset: CONTROL_CRLF.indexOf('first,') + 5, line: 8 }],
    ['bare CR', ascii(CONTROL_CRLF.replace('"Ada Student"\r\n', '"Ada Student"\r')), { code: 'bare-cr', offset: CONTROL_CRLF.indexOf('"Ada Student"') + 13, line: 4 }],
    ['mixed newlines', ascii(CONTROL_CRLF.replace('"Ben Student"\r\n', '"Ben Student"\n')), { code: 'mixed-newlines', offset: CONTROL_CRLF.indexOf('"Ben Student"') + 13, line: 5 }],
    ['missing final newline', ascii(CONTROL_CRLF.slice(0, -2)), { code: 'unterminated', offset: CONTROL_CRLF.lastIndexOf(ROW_C), line: 11 }],
    ['cut inside the last row', ascii(CONTROL_CRLF.slice(0, -20)), { code: 'unterminated', offset: CONTROL_CRLF.lastIndexOf(ROW_C), line: 11 }],
  ])('rejects bytes outside the profile: %s', (_name, bytes, expected) => {
    expect(error(bytes)).toEqual(expected);
  });

  it.each([
    ['only the first line', '"d","t"\r\n', { code: 'truncated', line: 2 }],
    ['nothing after the table line', '"d","t"\r\n"Table Number: 1"\r\n', { code: 'truncated', line: 3 }],
    ['identity lines without the closing blank', '"d","t"\r\n"Table Number: 1"\r\n\r\n"a"\r\n', { code: 'truncated', line: 5 }],
    ['blank lines without the header', '"d","t"\r\n"Table Number: 1"\r\n\r\n\r\n', { code: 'truncated', line: 5 }],
    ['header without rows (the writer refuses an empty list)', '"d","t"\r\n"Table Number: 1"\r\n\r\n\r\n' + HEADER + '\r\n', { code: 'no-rows', line: 6 }],
    ['unquoted date/time line', 'd,t\r\n"Table Number: 1"\r\n\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'date-time', line: 1 }],
    ['ambiguous quote in the date/time line', '"d"x","t"\r\n"Table Number: 1"\r\n\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'date-time', line: 1 }],
    ['date/time value over the web bound', `"${'d'.repeat(65)}","t"\r\n"Table Number: 1"\r\n\r\n\r\n` + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'date-time', line: 1 }],
    ['table text longer than the 20-byte line', '"d","t"\r\n"Table Number: 12345"\r\n\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'table', line: 2 }],
    ['other second line', '"d","t"\r\n"Table: 1"\r\n\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'table', line: 2 }],
    ['quote inside table text', '"d","t"\r\n"Table Number: 1"2"\r\n\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'metadata-quote', line: 2 }],
    ['third line not blank', '"d","t"\r\n"Table Number: 1"\r\n"a"\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'blank-expected', line: 3 }],
    ['identity over 40 bytes', `"d","t"\r\n"Table Number: 1"\r\n\r\n"${'x'.repeat(41)}"\r\n\r\n` + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'identity', line: 4 }],
    ['empty identity line', '"d","t"\r\n"Table Number: 1"\r\n\r\n""\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'identity', line: 4 }],
    ['five identity lines', '"d","t"\r\n"Table Number: 1"\r\n\r\n"a"\r\n"b"\r\n"c"\r\n"d"\r\n"e"\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'identity-count', line: 8 }],
    ['quote inside identity', '"d","t"\r\n"Table Number: 1"\r\n\r\n"a"b"\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'metadata-quote', line: 4 }],
    ['header without the blank line before it', '"d","t"\r\n"Table Number: 1"\r\n\r\n' + HEADER + '\r\n' + ROW_B + '\r\n', { code: 'identity', line: 4 }],
    ['changed header text', '"d","t"\r\n"Table Number: 1"\r\n\r\n\r\n' + HEADER.replace('File Name', 'File name') + '\r\n' + ROW_B + '\r\n', { code: 'header', line: 5 }],
    ['header without its last column', '"d","t"\r\n"Table Number: 1"\r\n\r\n\r\n' + HEADER.replace(',"File Name"', '') + '\r\n' + ROW_B + '\r\n', { code: 'header', line: 5 }],
  ])('rejects framing outside the recovered layout: %s', (_name, t, expected) => {
    expect(error(t)).toEqual(expected);
  });

  it.each([
    ['blank row after the rows', [ROW_B, ''], { code: 'row-blank', line: 7 }],
    ['unescaped quote inside a comment', ['"X",1,2,3,4,"",5,"say "hi"",6,7,8'], { code: 'row-quote', line: 6 }],
    ['doubled quote (no CSV escaping is recovered)', ['"X",1,2,3,4,"",5,"a""b",6,7,8'], { code: 'row-quote', line: 6 }],
    ['quote inside a bare field', ['"X",1,2"x,3,4,"",5,"c",6,7,8'], { code: 'row-quote', line: 6 }],
    ['unterminated quoted file field', ['"X",1,2,3,4,"",5,"c",6,7,8,"C:\\A.PLR'], { code: 'row-quote', line: 6 }],
    ['ten columns', ['"X",1,2,3,4,"",5,"c",6,7'], { code: 'row-columns', line: 6, count: 10 }],
    ['thirteen columns', ['"X",1,2,3,4,"",5,"c",6,7,8,"f",9'], { code: 'row-columns', line: 6, count: 13 }],
    ['trailing comma', ['"X",1,2,3,4,"",5,"c",6,7,8,'], { code: 'row-field', line: 6, field: 'file' }],
    ['comma decimal separator', ['"X",408,00,1,000,0,123456,"",5,0000E-01,49999,12345678,"c",1000,10,00,26'], { code: 'row-columns', line: 6, count: 17 }],
    ['unquoted object', ['X,1,2,3,4,"",5,"c",6,7,8'], { code: 'row-field', line: 6, field: 'object' }],
    ['object over 40 bytes', [`"${'o'.repeat(41)}",1,2,3,4,"",5,"c",6,7,8`], { code: 'row-field', line: 6, field: 'object' }],
    ['plus sign', ['"X",+1,2,3,4,"",5,"c",6,7,8'], { code: 'row-field', line: 6, field: 'frequency' }],
    ['INF spelling', ['"X",1,INF,3,4,"",5,"c",6,7,8'], { code: 'row-field', line: 6, field: 'gain' }],
    ['space in a number', ['"X",1,2, 3,4,"",5,"c",6,7,8'], { code: 'row-field', line: 6, field: 'reference' }],
    ['quoted non-empty reference', ['"X",1,2,"3",4,"",5,"c",6,7,8'], { code: 'row-field', line: 6, field: 'reference' }],
    ['fixed spelling in the exponent column', ['"X",1,2,3,4,0.5,5,"c",6,7,8'], { code: 'row-field', line: 6, field: 'horizontal' }],
    ['empty start', ['"X",1,2,3,4,"",,"c",6,7,8'], { code: 'row-field', line: 6, field: 'start' }],
    ['unquoted comment', ['"X",1,2,3,4,"",5,c,6,7,8'], { code: 'row-field', line: 6, field: 'comment' }],
    ['comment over 81 bytes', [`"X",1,2,3,4,"",5,"${'c'.repeat(82)}",6,7,8`], { code: 'row-field', line: 6, field: 'comment' }],
    ['fractional points', ['"X",1,2,3,4,"",5,"c",6.5,7,8'], { code: 'row-field', line: 6, field: 'points' }],
    ['negative aperture', ['"X",1,2,3,4,"",5,"c",6,7,-8'], { code: 'row-field', line: 6, field: 'aperture' }],
    ['unquoted file name', ['"X",1,2,3,4,"",5,"c",6,7,8,f'], { code: 'row-field', line: 6, field: 'file' }],
    ['file name over 255 bytes', [`"X",1,2,3,4,"",5,"c",6,7,8,"${'f'.repeat(256)}"`], { code: 'row-field', line: 6, field: 'file' }],
    ['number over the web bound', [`"X",${'1'.repeat(41)},2,3,4,"",5,"c",6,7,8`], { code: 'row-field', line: 6, field: 'frequency' }],
  ])('rejects rows outside the Record writer profile: %s', (_name, rows, expected) => {
    expect(error(withRows(...rows))).toEqual(expected);
  });

  it('bounds the row length and the row count', () => {
    const long = `"X",1,2,3,4,"",5,"c",6,7,8,"${'f'.repeat(255)}"`;
    expect(long.length).toBeLessThan(SAVED_ROWS_LIMITS.maxRowBytes);
    expect(error(withRows('x'.repeat(SAVED_ROWS_LIMITS.maxRowBytes + 1)))).toEqual({ code: 'row-length', line: 6, count: SAVED_ROWS_LIMITS.maxRowBytes + 1 });
    expect(ok(withRows(...Array<string>(SAVED_ROWS_LIMITS.maxRows).fill(ROW_B))).rows).toHaveLength(SAVED_ROWS_LIMITS.maxRows);
    expect(error(withRows(...Array<string>(SAVED_ROWS_LIMITS.maxRows + 1).fill(ROW_B)))).toEqual({ code: 'too-many-rows', count: SAVED_ROWS_LIMITS.maxRows + 1 });
  });
});

describe('recovered Review Find over the owned rows (PLR-REVIEW-FIND-STATIC-01)', () => {
  const rows = ok(CONTROL_CRLF).rows.map(r => r.text);
  const draft = (t: string, caseDependent = false) => ({ text: t, caseDependent });

  it('FormCreate memory is empty; FormActivate shows the remembered query and case flag', () => {
    expect(SAVED_FIND_INITIAL).toEqual({ query: '', caseDependent: false });
    expect(savedFindOpen({ query: 'b0329', caseDependent: true })).toEqual({ text: 'b0329', caseDependent: true });
  });

  it('From Top selects the first row whose whole text contains the query, including the native file and number texts', () => {
    expect(savedFindRun(rows, 3, SAVED_FIND_INITIAL, draft('b0329.plr'), 'top').outcome).toEqual({ kind: 'found', ordinal: 0, start: 0, scanned: 1 });
    expect(savedFindRun(rows, 3, SAVED_FIND_INITIAL, draft('0.123456'), 'top').selection).toBe(0);
    // The match may cross field boundaries: the row string is searched, not a set of display fields.
    expect(savedFindRun(rows, 3, SAVED_FIND_INITIAL, draft('26,"c:\\clea'), 'top').selection).toBe(0);
    expect(savedFindRun(rows, 3, SAVED_FIND_INITIAL, draft('"",0.033'), 'top').selection).toBe(2);
    // Earlier first match: 'b1919' is in row 3's comment and file name; nothing earlier contains it.
    expect(savedFindRun(rows, 0, SAVED_FIND_INITIAL, draft('B1919'), 'top').outcome).toEqual({ kind: 'found', ordinal: 3, start: 0, scanned: 4 });
  });

  it('From Cursor starts after the selection, keeps duplicates as separate rows and does not wrap', () => {
    const first = savedFindRun(rows, 0, SAVED_FIND_INITIAL, draft('B0329.PLR'), 'cursor');
    expect(first.outcome).toEqual({ kind: 'found', ordinal: 1, start: 1, scanned: 1 });
    const second = savedFindRun(rows, first.selection, first.memory, savedFindOpen(first.memory), 'cursor');
    expect(second.outcome).toEqual({ kind: 'miss', start: 2, scanned: 2, caption: 'String Not Found', body: '"b0329.plr" Not Found.' });
    expect(second.selection).toBe(1);
    // No selection counts as ItemIndex −1, so From Cursor starts at row 0.
    expect(savedFindRun(rows, null, SAVED_FIND_INITIAL, draft('psr'), 'cursor').outcome).toEqual({ kind: 'found', ordinal: 0, start: 0, scanned: 1 });
  });

  it('folds only A..Z, stores the lowercased query, ignores the case flag and leaves the row strings unchanged', () => {
    const r = savedFindRun(rows, 0, SAVED_FIND_INITIAL, draft('D:\\DATA', true), 'top');
    expect(r.selection).toBe(3);
    expect(r.memory).toEqual({ query: 'd:\\data', caseDependent: true });
    expect(rows[3]).toContain('D:\\data');
    expect(rows[0]).toContain('C:\\CLEA\\PULSARS\\B0329.PLR');
    expect(savedFindLower('AZaz@[`{09 ~')).toBe('azaz@[`{09 ~');
    // The miss text shows the stored (lowercased) query.
    expect(savedFindRun(rows, 0, SAVED_FIND_INITIAL, draft('NOWHERE', true), 'top').outcome).toMatchObject({ kind: 'miss', body: '"nowhere" Not Found.' });
  });

  it('an empty query from Top or Cursor stores the empty text and case flag, searches nothing and keeps the selection', () => {
    const memory = { query: 'psr', caseDependent: false };
    for (const action of ['top', 'cursor'] as const) {
      const r = savedFindRun(rows, 2, memory, draft('', true), action);
      expect(r.outcome).toEqual({ kind: 'empty' });
      expect(r.selection).toBe(2);
      expect(r.memory).toEqual({ query: '', caseDependent: true });
    }
    // Spaces are not trimmed: a space query searches.
    expect(savedFindRun(rows, 2, memory, draft(' '), 'top').outcome).toMatchObject({ kind: 'found', ordinal: 0 });
  });

  it('Cancel copies neither the draft text nor the case flag', () => {
    const memory = { query: 'psr', caseDependent: false };
    const r = savedFindRun(rows, 1, memory, draft('OTHER', true), 'cancel');
    expect(r.outcome).toEqual({ kind: 'cancelled' });
    expect(r.memory).toBe(memory);
    expect(r.selection).toBe(1);
  });

  it('when the row count is not above the start, no row is read and the result is the miss', () => {
    expect(savedFindRun([], null, SAVED_FIND_INITIAL, draft('psr'), 'top').outcome).toEqual({ kind: 'miss', start: 0, scanned: 0, caption: 'String Not Found', body: '"psr" Not Found.' });
    expect(savedFindRun([], null, SAVED_FIND_INITIAL, draft('psr'), 'cursor').outcome).toMatchObject({ kind: 'miss', start: 0, scanned: 0 });
    // From Cursor on the last row: the query occurs in every row, but none is read.
    const last = savedFindRun(rows, 3, SAVED_FIND_INITIAL, draft('psr'), 'cursor');
    expect(last.outcome).toEqual({ kind: 'miss', start: 4, scanned: 0, caption: 'String Not Found', body: '"psr" Not Found.' });
    expect(last.selection).toBe(3);
    expect(last.memory.query).toBe('psr');
  });

  it('WEB: refuses non-ASCII or over-long query text without changing memory or selection', () => {
    const memory = { query: 'psr', caseDependent: false };
    for (const [t, reason] of [['pulsé', 'query-text'], ['tab\there', 'query-text'], ['x'.repeat(81), 'query-length']] as const) {
      const r = savedFindRun(rows, 1, memory, draft(t, true), 'top');
      expect(r.outcome).toEqual({ kind: 'refused', reason });
      expect(r.memory).toBe(memory);
      expect(r.selection).toBe(1);
    }
    expect(savedFindRun(rows, 1, memory, draft('x'.repeat(80)), 'top').outcome.kind).toBe('miss');
  });
});

describe('saved-rows workspace: read ownership and explicit confirmation', () => {
  const sourceA = ok(CONTROL_CRLF), sourceB = ok(CONTROL_LF);
  const accepted = (): SavedRowsWorkspace => {
    let ws = savedRowsBeginRead(INITIAL_SAVED_ROWS, 'a.csv');
    ws = savedRowsReadFinished(ws, ws.reading!.token, { ok: true, source: sourceA, sha256: 'a'.repeat(64) });
    ws = savedRowsConfirm(ws);
    ws = savedRowsSelect(ws, 2);
    return savedRowsFind(ws, { text: 'PSR', caseDependent: true }, 'cursor').workspace;
  };

  it('a candidate becomes the source only on confirmation', () => {
    let ws = savedRowsBeginRead(INITIAL_SAVED_ROWS, 'a.csv');
    expect(ws.reading).toEqual({ token: 1, fileName: 'a.csv' });
    ws = savedRowsReadFinished(ws, 1, { ok: true, source: sourceA, sha256: 'h' });
    expect(ws.accepted).toBeNull();
    expect(ws.candidate?.source).toBe(sourceA);
    ws = savedRowsConfirm(ws);
    expect(ws.accepted).toEqual({ source: sourceA, sha256: 'h' });
    expect(ws.selection).toBe(0);
    expect(ws.candidate).toBeNull();
  });

  it('a rejection, a discarded candidate, a cancelled read and a late or superseded result keep the previous source, selection and Find memory', () => {
    const before = accepted();
    expect(before.selection).toBe(3);
    expect(before.find).toEqual({ query: 'psr', caseDependent: true });
    const same = (ws: SavedRowsWorkspace) => { expect(ws.accepted).toBe(before.accepted); expect(ws.selection).toBe(3); expect(ws.find).toBe(before.find); };

    let ws = savedRowsBeginRead(before, 'bad.csv');
    ws = savedRowsReadFinished(ws, ws.reading!.token, { ok: false, error: { code: 'header', line: 5 } });
    same(ws);
    expect(ws.rejection).toEqual({ fileName: 'bad.csv', error: { code: 'header', line: 5 } });
    ws = savedRowsBeginRead(ws, 'unreadable.csv');
    expect(ws.rejection).toBeNull();
    ws = savedRowsReadFinished(ws, ws.reading!.token, { ok: false, error: { code: 'read' } });
    same(ws);

    ws = savedRowsBeginRead(ws, 'b.csv');
    ws = savedRowsReadFinished(ws, ws.reading!.token, { ok: true, source: sourceB, sha256: 'b' });
    same(ws);
    ws = savedRowsDiscardCandidate(ws);
    same(ws);
    expect(ws.candidate).toBeNull();

    ws = savedRowsBeginRead(ws, 'slow.csv');
    const slow = ws.reading!.token;
    ws = savedRowsCancelRead(ws);
    const afterCancel = savedRowsReadFinished(ws, slow, { ok: true, source: sourceB, sha256: 'b' });
    expect(afterCancel).toBe(ws);
    same(afterCancel);

    ws = savedRowsBeginRead(ws, 'old.csv');
    const old = ws.reading!.token;
    ws = savedRowsBeginRead(ws, 'new.csv');
    expect(savedRowsReadFinished(ws, old, { ok: true, source: sourceB, sha256: 'b' })).toBe(ws);
    ws = savedRowsReadFinished(ws, ws.reading!.token, { ok: true, source: sourceB, sha256: 'b' });
    same(ws);
    // A new read replaces an unconfirmed candidate; the accepted source stays.
    ws = savedRowsBeginRead(ws, 'again.csv');
    expect(ws.candidate).toBeNull();
    same(ws);
  });

  it('re-reading the same file yields a new candidate that replaces the source only when confirmed; Find memory carries over', () => {
    const before = accepted();
    let ws = savedRowsBeginRead(before, 'a.csv');
    const again = ok(CONTROL_CRLF);
    ws = savedRowsReadFinished(ws, ws.reading!.token, { ok: true, source: again, sha256: 'a'.repeat(64) });
    expect(ws.accepted).toBe(before.accepted);
    ws = savedRowsConfirm(ws);
    expect(ws.accepted?.source).toBe(again);
    expect(ws.selection).toBe(0);
    expect(ws.find).toBe(before.find);
  });

  it('selection accepts only existing ordinals; Find needs an accepted source', () => {
    const ws = accepted();
    expect(savedRowsSelect(ws, 4)).toBe(ws);
    expect(savedRowsSelect(ws, -1)).toBe(ws);
    expect(savedRowsSelect(ws, 1.5)).toBe(ws);
    expect(savedRowsFind(INITIAL_SAVED_ROWS, { text: 'x', caseDependent: false }, 'top')).toEqual({ workspace: INITIAL_SAVED_ROWS, outcome: null });
    const cancelled = savedRowsFind(ws, { text: 'zzz', caseDependent: false }, 'cancel');
    expect(cancelled.workspace).toBe(ws);
  });
});
