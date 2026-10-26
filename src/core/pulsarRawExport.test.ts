import { describe, expect, it } from 'vitest';
import {
  buildPulsarRawExport, RAW_EXPORT_FILE_NAME, rawExportDownloadFailed, rawExportOpen, rawExportRequest, type RawExportBuild, type RawExportProblem,
} from './pulsarRawExport';
import { admitPlrRecording, PLR_MAX_BYTES } from './pulsarRecording';
import { EMPTY_PULSAR_HEADER, pulsarMemoryRecording, type PulsarCaptureInput, type PulsarMemoryRecording } from './pulsarCurrentData';

// Synthetic model-capture fixtures. Expected bytes are written out by hand from the chosen WEB contract (toFixed digits
// 2/3/8/5/3, inactive cells 0.0, CR LF after every line); they are not native writer output.
type Overrides = Partial<Omit<PulsarCaptureInput, 'rows'>> & { rows?: readonly number[] };
const capture = (o: Overrides = {}): PulsarMemoryRecording => pulsarMemoryRecording({
  captureId: 1, name: 'PSR B0329+54', aperture: 100, highestIndex: 1,
  frequencies: [600.004, 1400.5, null], gains: [2.5, 0.75, null], start: 50000.123456789, interval: 0.01,
  rows: [1.23449, -2, 0, 0.5, 1e-4, 7], full: false, ...o,
});
const text = (b: RawExportBuild) => { if (!b.ok) throw new Error(`refused: ${JSON.stringify(b.problem)}`); return b.text; };
const problem = (b: RawExportBuild): RawExportProblem | null => (b.ok ? null : b.problem);
const latin1 = (bytes: Uint8Array) => Array.from(bytes, c => String.fromCharCode(c)).join('');

describe('buildPulsarRawExport bytes', () => {
  it('canonical fixture: exact bytes, final CR LF, no bare LF, and the loss summary', () => {
    const b = buildPulsarRawExport(capture());
    const expected = "'PSR B0329+54',100,1\r\n600.00,1400.50,0.0\r\n2.500,0.750,0.0\r\n50000.12345679,0.01000\r\n1.234,-2.000,0.000\r\n0.500,0.000,7.000\r\n";
    expect(text(b)).toBe(expected);
    if (!b.ok) return;
    expect(latin1(b.bytes)).toBe(expected);
    expect(b.bytes.byteLength).toBe(expected.length);
    expect(expected.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(b.rowCount).toBe(2); expect(b.highestIndex).toBe(1);
    // 600.004 → 600.00 and 50000.123456789 → 50000.12345679 both read back differently; 1.23449 → 1.234 and 1e-4 → 0.000.
    expect(b.loss).toEqual({ header: ['frequency1', 'start'], samplesChanged: 2, samplesZeroed: 1 });
  });

  it('coordinator acceptance FIXED-BYTES (independent literal)', () => {
    const b = buildPulsarRawExport(capture({
      name: 'PSR TEST', aperture: 100, highestIndex: 0, frequencies: [400.125, null, 999.0], gains: [1.125, null, 9.0], start: 50000.125, interval: 0.015625,
      rows: [1.125, -2.625, 0.0, 0.0, 2.5, 3.75],
    }));
    expect(text(b)).toBe("'PSR TEST',100,0\r\n400.13,0.0,0.0\r\n1.125,0.0,0.0\r\n50000.12500000,0.01563\r\n1.125,-2.625,0.000\r\n0.000,2.500,3.750\r\n");
    expect(b.ok && b.loss).toEqual({ header: ['frequency1', 'interval'], samplesChanged: 0, samplesZeroed: 0 });
  });

  it('inactive cells are 0.0 whatever they hold (null, stale, NaN, 0); all three sample columns are written', () => {
    const h0 = buildPulsarRawExport(capture({ highestIndex: 0, frequencies: [600, null, 999], gains: [1, Number.NaN, 0], rows: [1, 2, 3] }));
    expect(text(h0)).toBe("'PSR B0329+54',100,0\r\n600.00,0.0,0.0\r\n1.000,0.0,0.0\r\n50000.12345679,0.01000\r\n1.000,2.000,3.000\r\n");
    const h1 = buildPulsarRawExport(capture({ highestIndex: 1, frequencies: [600, 700, 999], gains: [1, 2, 999], rows: [1, 2, 3] }));
    expect(text(h1).split('\r\n').slice(1, 3)).toEqual(['600.00,700.00,0.0', '1.000,2.000,0.0']);
    const h2 = buildPulsarRawExport(capture({ highestIndex: 2, frequencies: [1, 2, 3], gains: [1, 2, 3], rows: [1, 2, 3] }));
    expect(text(h2).split('\r\n').slice(0, 3)).toEqual(["'PSR B0329+54',100,2", '1.00,2.00,3.00', '1.000,2.000,3.000']);
  });

  it('an empty name is written as two apostrophes; aperture 0 and 65535 are accepted', () => {
    expect(text(buildPulsarRawExport(capture({ name: '', aperture: 0 }))).startsWith("'',0,1\r\n")).toBe(true);
    expect(text(buildPulsarRawExport(capture({ aperture: 65535 }))).startsWith("'PSR B0329+54',65535,1\r\n")).toBe(true);
    expect(buildPulsarRawExport(capture({ name: 'x'.repeat(40) })).ok).toBe(true);
  });

  it('negative zero and a tiny negative sample are written as 0.000 (no sign)', () => {
    const b = buildPulsarRawExport(capture({ highestIndex: 0, frequencies: [600, null, null], gains: [1, null, null], rows: [-0, -0.0004, 5, 2, 0, 0] }));
    expect(text(b).split('\r\n').slice(4, 6)).toEqual(['0.000,0.000,5.000', '2.000,0.000,0.000']);
    expect(b.ok && b.loss).toEqual({ header: ['start'], samplesChanged: 1, samplesZeroed: 1 });
  });

  it('the strict reader admits the bytes with the written lexemes (self-consistency, not a native oracle)', () => {
    const b = buildPulsarRawExport(capture());
    if (!b.ok) throw new Error('refused');
    const a = admitPlrRecording(b.bytes, RAW_EXPORT_FILE_NAME);
    if (a.status !== 'admitted') throw new Error(a.reason);
    const r = a.recording;
    expect(r.lineEnding).toBe('CRLF'); expect(r.name).toBe('PSR B0329+54'); expect(r.aperture.lexeme).toBe('100'); expect(r.highestIndex.value).toBe(1);
    expect(r.frequencies.map(f => f.lexeme)).toEqual(['600.00', '1400.50', '0.0']);
    expect(r.gains.map(g => g.lexeme)).toEqual(['2.500', '0.750', '0.0']);
    expect(r.gains.map(g => g.zeroReplaced)).toEqual([false, false, true]);
    expect([r.start.lexeme, r.interval.lexeme]).toEqual(['50000.12345679', '0.01000']);
    expect(Array.from(r.samples)).toEqual([1.234, -2, 0, 0.5, 0, 7]);
  });
});

describe('buildPulsarRawExport refusals', () => {
  it('name: text, apostrophe, length and the reserved name', () => {
    expect(problem(buildPulsarRawExport(capture({ name: "a'b" })))).toEqual({ code: 'name-apostrophe', position: 2 });
    expect(problem(buildPulsarRawExport(capture({ name: 'x\r\ny' })))).toEqual({ code: 'name-text', position: 2 });
    expect(problem(buildPulsarRawExport(capture({ name: 'ab\n' })))).toEqual({ code: 'name-text', position: 3 });
    expect(problem(buildPulsarRawExport(capture({ name: '\tPSR' })))).toEqual({ code: 'name-text', position: 1 });
    expect(problem(buildPulsarRawExport(capture({ name: 'é' })))).toEqual({ code: 'name-text', position: 1 });
    expect(problem(buildPulsarRawExport(capture({ name: 'P\u{1F600}' })))).toEqual({ code: 'name-text', position: 2 });
    expect(problem(buildPulsarRawExport(capture({ name: 'x'.repeat(41) })))).toEqual({ code: 'name-length', length: 41, max: 40 });
    expect(problem(buildPulsarRawExport(capture({ name: 'No Data' })))).toEqual({ code: 'name-reserved' });
  });

  it('aperture and highest index', () => {
    for (const aperture of [-1, 65536, 1.5, Number.NaN]) expect(problem(buildPulsarRawExport(capture({ aperture })))).toEqual({ code: 'aperture' });
    for (const h of [3, -1, 1.5]) expect(problem(buildPulsarRawExport(capture({ highestIndex: h as 0 })))).toEqual({ code: 'highest' });
  });

  it('recorded metadata must be present, finite and within the reader bounds; inactive cells are not read', () => {
    expect(problem(buildPulsarRawExport(capture({ frequencies: [null, 1400, null] })))).toEqual({ code: 'metadata-missing', field: 'frequency1' });
    expect(problem(buildPulsarRawExport(capture({ gains: [1, null, null] })))).toEqual({ code: 'metadata-missing', field: 'gain2' });
    for (const v of [Number.NaN, Infinity, -Infinity, 1e9 + 1])
      expect(problem(buildPulsarRawExport(capture({ frequencies: [600, v, null] })))).toEqual({ code: 'metadata-range', field: 'frequency2' });
    expect(problem(buildPulsarRawExport(capture({ gains: [1e6 + 1, 1, null] })))).toEqual({ code: 'metadata-range', field: 'gain1' });
    expect(problem(buildPulsarRawExport(capture({ start: 1e7 + 1 })))).toEqual({ code: 'metadata-range', field: 'start' });
    expect(problem(buildPulsarRawExport(capture({ start: Number.NaN })))).toEqual({ code: 'metadata-range', field: 'start' });
    expect(problem(buildPulsarRawExport(capture({ interval: 1e3 + 1 })))).toEqual({ code: 'metadata-range', field: 'interval' });
    expect(problem(buildPulsarRawExport(capture({ interval: Infinity })))).toEqual({ code: 'metadata-range', field: 'interval' });
    expect(buildPulsarRawExport(capture({ highestIndex: 0, frequencies: [600, Number.NaN, Infinity], gains: [1, null, Number.NaN] })).ok).toBe(true);
  });

  it('a recorded gain whose 3-digit text is zero is refused (the reader would read it as 1); an inactive zero gain is ignored', () => {
    for (const g of [0, -0, 0.0004, -0.0004, 0.0001, -0.0001])
      expect(problem(buildPulsarRawExport(capture({ gains: [g, 1, null] })))).toEqual({ code: 'gain-zero', receiver: 0 });
    expect(problem(buildPulsarRawExport(capture({ gains: [1, 0, null] })))).toEqual({ code: 'gain-zero', receiver: 1 });
    const small = buildPulsarRawExport(capture({ gains: [0.0006, 1, null] }));
    expect(text(small).split('\r\n')[2]).toBe('0.001,1.000,0.0');
    expect(small.ok && small.loss.header).toEqual(['frequency1', 'gain1', 'start']);
    expect(buildPulsarRawExport(capture({ highestIndex: 0, frequencies: [600, null, null], gains: [1, 0, 0] })).ok).toBe(true);
  });

  it('the interval must stay positive after 5-digit formatting', () => {
    for (const interval of [4e-6, 1e-6, 0, -0.01]) expect(problem(buildPulsarRawExport(capture({ interval })))).toEqual({ code: 'interval-zero' });
    expect(text(buildPulsarRawExport(capture({ interval: 1e-5 }))).split('\r\n')[3]).toBe('50000.12345679,0.00001');
  });

  it('samples: non-finite or out of bounds names the row (1-based) and channel (0-based)', () => {
    expect(problem(buildPulsarRawExport(capture({ rows: [1, 2, 3, 4, Number.NaN, 6] })))).toEqual({ code: 'sample-range', row: 2, channel: 1 });
    expect(problem(buildPulsarRawExport(capture({ rows: [Infinity, 2, 3, 4, 5, 6] })))).toEqual({ code: 'sample-range', row: 1, channel: 0 });
    expect(problem(buildPulsarRawExport(capture({ rows: [1, 2, 3, 4, 5, -(1e9 + 1)] })))).toEqual({ code: 'sample-range', row: 2, channel: 2 });
    expect(buildPulsarRawExport(capture({ rows: [1e9, -1e9, 0, 1, 1, 1] })).ok).toBe(true);
  });

  it('channel-erased: a recorded channel whose nonzero samples all become 0.000; exact-zero channels and inactive columns pass', () => {
    expect(problem(buildPulsarRawExport(capture({ rows: [1, 1e-4, 0, 1, -4e-4, 0] })))).toEqual({ code: 'channel-erased', receiver: 1 });
    const zero = buildPulsarRawExport(capture({ rows: [1, 0, 0, 2, -0, 0] }));
    expect(zero.ok && zero.loss).toEqual({ header: ['frequency1', 'start'], samplesChanged: 0, samplesZeroed: 0 });
    const inactive = buildPulsarRawExport(capture({ highestIndex: 0, frequencies: [600, null, null], gains: [1, null, null], rows: [1, 1e-4, 0, 2, 2e-4, 0] }));
    expect(inactive.ok && inactive.loss).toEqual({ header: ['start'], samplesChanged: 2, samplesZeroed: 2 });
  });

  it('shape and size: no rows, sample shape, row bound and byte budget (computed before assembly)', () => {
    expect(problem(buildPulsarRawExport(capture({ rows: [] })))).toEqual({ code: 'no-rows' });
    const base = capture();
    expect(problem(buildPulsarRawExport({ ...base, samples: new Float64Array(5) }))).toEqual({ code: 'samples-shape' });
    expect(problem(buildPulsarRawExport({ ...base, samples: [1, 2, 3, 4, 5, 6] as unknown as Float64Array }))).toEqual({ code: 'samples-shape' });
    expect(problem(buildPulsarRawExport({ ...base, rowCount: 1.5 }))).toEqual({ code: 'no-rows' });
    expect(problem(buildPulsarRawExport(capture({ rows: new Array(65537 * 3).fill(1) })))).toEqual({ code: 'too-many-rows', count: 65537, max: 65536 });
    // Header: 11 + 14 + 15 + 24 bytes; each row "-1000000000.000" ×3 with two commas and CR LF = 49 bytes.
    const big = capture({ name: 'X', highestIndex: 0, frequencies: [1, null, null], gains: [1, null, null], start: 50000, rows: new Array(45000 * 3).fill(-1e9) });
    expect(problem(buildPulsarRawExport(big))).toEqual({ code: 'too-large', bytes: 64 + 45000 * 49, max: PLR_MAX_BYTES });
  });

  it('only memory data: an imported file, a cleared header and no data are refused', () => {
    const file = admitPlrRecording(new TextEncoder().encode("'F',1,0\r\n1,0,0\r\n1,0,0\r\n1,0.01\r\n1,2,3\r\n"), 'f.plr');
    if (file.status !== 'admitted') throw new Error('fixture');
    expect(problem(buildPulsarRawExport(file.recording))).toEqual({ code: 'not-memory' });
    expect(problem(buildPulsarRawExport({ origin: 'cleared', header: EMPTY_PULSAR_HEADER }))).toEqual({ code: 'not-memory' });
    expect(problem(buildPulsarRawExport(null))).toEqual({ code: 'not-memory' });
  });

  it('never writes to the source; every build returns a new buffer with identical bytes', () => {
    const d = capture(), samples = d.samples, before = JSON.stringify({ ...d, samples: Array.from(d.samples) });
    const a = buildPulsarRawExport(d), b = buildPulsarRawExport(d);
    expect(JSON.stringify({ ...d, samples: Array.from(d.samples) })).toBe(before);
    expect(d.samples).toBe(samples); expect(Object.isFrozen(d)).toBe(true);
    if (!a.ok || !b.ok) throw new Error('refused');
    expect(a.bytes).not.toBe(b.bytes); expect(a.bytes.buffer).not.toBe(samples.buffer);
    expect(Array.from(a.bytes)).toEqual(Array.from(b.bytes));
    a.bytes[0] = 0x41;
    expect(Array.from(samples)).toEqual([1.23449, -2, 0, 0.5, 1e-4, 7]);
  });
});

describe('raw export session', () => {
  const ready = (d: PulsarMemoryRecording, generation = 3) => ({ data: d, generation, ready: true });

  it('refuses not-ready, then stale (other object or generation), then a build problem; otherwise returns the artifact', () => {
    const d = capture(), s = rawExportOpen(d, 3);
    expect(s.preview.ok).toBe(true); expect(s.refusal).toBeNull();
    const notReady = rawExportRequest(s, { data: d, generation: 4, ready: false });
    expect(notReady.kind === 'refused' && notReady.session.refusal).toEqual({ code: 'not-ready' });
    const other = rawExportRequest(s, ready(capture()));
    expect(other.kind === 'refused' && other.session.refusal).toEqual({ code: 'stale' });
    const newer = rawExportRequest(s, ready(d, 4));
    expect(newer.kind === 'refused' && newer.session.refusal).toEqual({ code: 'stale' });
    const r = rawExportRequest(s, ready(d));
    if (r.kind !== 'artifact') throw new Error('refused');
    expect(r.rowCount).toBe(2); expect(latin1(r.bytes)).toBe(s.preview.ok ? s.preview.text : '');
    expect(s.data).toBe(d);
  });

  it('a build problem is reported, and Download stays refused', () => {
    const d = capture({ name: "it's" }), s = rawExportOpen(d, 0);
    expect(s.preview.ok).toBe(false);
    const r = rawExportRequest(s, ready(d, 0));
    expect(r.kind === 'refused' && r.session.refusal).toEqual({ code: 'build', problem: { code: 'name-apostrophe', position: 3 } });
  });

  it('rebuilds at the request: a mutated Float64Array is refused (problem or stale), never silently refreshed', () => {
    const d = capture(), s = rawExportOpen(d, 1);
    d.samples[0] = Number.NaN;
    const bad = rawExportRequest(s, ready(d, 1));
    expect(bad.kind === 'refused' && bad.session.refusal).toEqual({ code: 'build', problem: { code: 'sample-range', row: 1, channel: 0 } });
    d.samples[0] = 9;
    const changed = rawExportRequest(s, ready(d, 1));
    expect(changed.kind === 'refused' && changed.session.refusal).toEqual({ code: 'stale' });
    expect(changed.kind === 'refused' && changed.session.preview).toBe(s.preview);
  });

  it('a browser failure keeps the session for a retry and clears the refusal', () => {
    const d = capture(), s = rawExportOpen(d, 2);
    const refused = rawExportRequest(s, { data: d, generation: 2, ready: false });
    if (refused.kind !== 'refused') throw new Error('expected refusal');
    const failed = rawExportDownloadFailed(refused.session);
    expect(failed.failure).toBe(true); expect(failed.refusal).toBeNull(); expect(failed.data).toBe(d); expect(failed.preview).toBe(s.preview);
    const retry = rawExportRequest(failed, ready(d, 2));
    expect(retry.kind).toBe('artifact');
  });
});
