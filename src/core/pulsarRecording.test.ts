import { describe, expect, it } from 'vitest';
import { admitPlrRecording, formatExponent, formatFixed, plrProperties, plrSample, PLR_MAX_BYTES, type PlrAdmission, type PlrRecording } from './pulsarRecording';

// SYNTHETIC fixtures written for the recovered reader contract. They are not CLEA
// recordings or acquired observations, and passing them is not native equivalence.
const enc = (text: string) => new TextEncoder().encode(text);
const SYNTH = ["'SYNTHETIC TEST',40,1", '430.00,1420.00,0', '1.000,0.000,1.000', '49999.12345678,0.00250', '1.000,2.000,0.000', '3.500,-4.250,0.000', '0.125,8.000,0.000'].join('\r\n') + '\r\n';
const admit = (text: string, name = 'synthetic.plr') => admitPlrRecording(enc(text), name);
const ok = (a: PlrAdmission): PlrRecording => { if (a.status !== 'admitted') throw new Error(`${a.reason}@${a.line}:${a.detail}`); return a.recording; };
const reason = (a: PlrAdmission) => (a.status === 'rejected' ? a.reason : 'admitted');

describe('PLR reader admission (PLR-READ-01)', () => {
  it('reads header metadata, preserves lexemes and keeps rows in file order', () => {
    const r = ok(admit(SYNTH));
    expect(r.name).toBe('SYNTHETIC TEST');
    expect(r.aperture).toEqual({ lexeme: '40', value: 40 });
    expect(r.highestIndex.value).toBe(1);
    expect(r.frequencies.map(f => f.lexeme)).toEqual(['430.00', '1420.00', '0']);
    expect(r.start).toEqual({ lexeme: '49999.12345678', value: 49999.12345678 });
    expect(r.interval.value).toBe(0.0025);
    expect(r.rowCount).toBe(3);
    expect([plrSample(r, 0, 0), plrSample(r, 1, 1), plrSample(r, 2, 0), plrSample(r, 3, 0), plrSample(r, -1, 0)]).toEqual([1, -4.25, 0.125, null, null]);
    expect(r.lineEnding).toBe('CRLF');
  });
  it('replaces a zero gain with 1 and records that it happened (0x56a3b6)', () => {
    const r = ok(admit(SYNTH));
    expect(r.gains.map(g => [g.lexeme, g.value, g.effective, g.zeroReplaced])).toEqual([['1.000', 1, 1, false], ['0.000', 0, 1, true], ['1.000', 1, 1, false]]);
  });
  it('copies the input bytes and keeps them exactly for download', () => {
    const bytes = enc(SYNTH), r = ok(admitPlrRecording(bytes, 'a.plr'));
    bytes[1] = 0x58;
    expect(new TextDecoder().decode(r.bytes)).toBe(SYNTH);
    expect(r.bytes).not.toBe(bytes);
  });
  it('accepts LF and a final line without a terminator', () => {
    expect(ok(admit(SYNTH.replace(/\r\n/g, '\n'))).lineEnding).toBe('LF');
    expect(ok(admit(SYNTH.replace(/\r\n$/, ''))).rowCount).toBe(3);
  });
  it('applies the native tokenizers: leading blanks/commas are skipped and tokens end at the comma', () => {
    const r = ok(admit("'X',  40,,2\n 1, ,2,3\n1,1,1\n0,0.5\n  7 ,8,9\n"));
    expect(r.highestIndex.value).toBe(2);
    expect(r.frequencies.map(f => f.value)).toEqual([1, 2, 3]);
    expect(r.samples[0]).toBe(7);
  });
  it('admits zero data rows as a recording with zero points', () => {
    const r = ok(admit("'EMPTY',1,0\n1,0,0\n1,1,1\n0,1\n"));
    expect(r.rowCount).toBe(0);
    expect(plrProperties(r).fields.points).toBe('0');
  });
  it('rejects headerless input: the native route leaves the metadata uninitialized', () => {
    expect(reason(admit('1,2,3\n4,5,6\n'))).toBe('headerless');
  });
  it('rejects a non-empty file whose first line is blank as blank-first-line, not as empty (no native route is claimed)', () => {
    expect(admit('\r\n' + SYNTH)).toEqual({ status: 'rejected', reason: 'blank-first-line', line: 1, detail: '' });
    expect(reason(admit('\n' + SYNTH.replace(/\r\n/g, '\n')))).toBe('blank-first-line');
    expect(admit('')).toEqual({ status: 'rejected', reason: 'empty', line: null, detail: '' });
  });
  it.each([
    ['empty', ''],
    ['blank-first-line', '\r\n'],
    ['truncated-header', "'A',1,0\n1,1,1\n1,1,1\n"],
    ['name-unterminated', "'A,1,0\n1,1,1\n1,1,1\n0,1\n"],
    ['name-length', `'${'N'.repeat(41)}',1,0\n1,1,1\n1,1,1\n0,1\n`],
    ['name-reserved', "'No Data',1,0\n1,1,1\n1,1,1\n0,1\n"],
    ['header-layout', "'A' ,1,0\n1,1,1\n1,1,1\n0,1\n"],
    ['integer', "'A',4.5,0\n1,1,1\n1,1,1\n0,1\n"],
    ['integer', "'A',$10,0\n1,1,1\n1,1,1\n0,1\n"],
    ['aperture-range', "'A',70000,0\n1,1,1\n1,1,1\n0,1\n"],
    ['highest-range', "'A',1,3\n1,1,1\n1,1,1\n0,1\n"],
    ['highest-range', "'A',1,-0\n1,1,1\n1,1,1\n0,1\n"],
    ['trailing-content', "'A',1,0,9\n1,1,1\n1,1,1\n0,1\n"],
    ['number', "'A',1,0\n1,1e,1\n1,1,1\n0,1\n"],
    ['number', "'A',1,0\n1,1,NaN\n1,1,1\n0,1\n"],
    ['number-range', "'A',1,0\n1,1,1e999\n1,1,1\n0,1\n"],
    ['number-range', "'A',1,0\n1,1,1\n1,1,1e-400\n0,1\n"],
    ['interval-range', "'A',1,0\n1,1,1\n1,1,1\n0,0\n"],
    ['interval-range', "'A',1,0\n1,1,1\n1,1,1\n0,-0.01\n"],
    ['data-tokens', "'A',1,0\n1,1,1\n1,1,1\n0,1\n1,2\n"],
    ['data-tokens', "'A',1,0\n1,1,1\n1,1,1\n0,1\n1,2,3\n\n"],
    ['trailing-content', "'A',1,0\n1,1,1\n1,1,1\n0,1\n1,2,3,4\n"],
    ['line-ending', "'A',1,0\r1,1,1\n1,1,1\n0,1\n"],
    ['byte', "'A',1,0\n1,1,1\n1,1,1\n0,1\n1,2,3\x1a\n"],
    ['byte', "'Ä',1,0\n1,1,1\n1,1,1\n0,1\n"],
    ['byte', "'A',1,0\n1\t,1,1\n1,1,1\n0,1\n"],
  ])('rejects %s', (expected, text) => {
    expect(reason(admit(text))).toBe(expected);
  });
  it('rejects an oversized input before decoding it', () => {
    expect(reason(admitPlrRecording(new Uint8Array(PLR_MAX_BYTES + 1), 'big.plr'))).toBe('size');
  });
});

describe('Native text formats (PLR-FMT-01)', () => {
  it('ffFixed rounds the exact binary value half away from zero', () => {
    expect(formatFixed(49999.12345678, 8)).toBe('49999.12345678');
    expect(formatFixed(2.5, 0)).toBe('3');
    expect(formatFixed(-2.5, 0)).toBe('-3');
    expect(formatFixed(0.125, 2)).toBe('0.13');
    expect(formatFixed(-0.001, 2)).toBe('0.00');
  });
  it('ffExponent precision 5, with at least 2 exponent digits', () => {
    expect(formatExponent(123.456)).toBe('1.2346E+02');
    expect(formatExponent(0.0125)).toBe('1.2500E-02');
    expect(formatExponent(0)).toBe('0.0000E+00');
    expect(formatExponent(-1e-120)).toBe('-1.0000E-120');
  });
});

describe('Read-only properties (PLR-PROP-01)', () => {
  it('formats fields as 0x571748 does and blanks receivers above the highest index', () => {
    const p = plrProperties(ok(admit(SYNTH, 'pulse.plr')));
    expect(p.fields).toEqual({ object: 'SYNTHETIC TEST', start: '49999.12345678', aperture: '40', interval: '2.50', points: '3', file: 'pulse.plr' });
    expect(p.receivers.map(r => [r.recorded, r.frequency, r.gain])).toEqual([[true, '430.00', '1.000'], [true, '1420.00', '1.000'], [false, '', '']]);
    expect(p.receivers[1].gainZeroReplaced).toBe(true);
  });
});
