/**
 * Recorded pulsar (.PLR) admission and read-only data properties.
 *
 * Source: VIREO 1.504 CLEA_VEO.exe SHA-256 781bc970…c54c. Contracts and
 * evidence IDs are listed in docs/PULSAR-ANALYSIS-PROVENANCE.json.
 * - Reader 0x56a260..0x56a512 (PLR-READ-01): if the first line starts with an
 *   apostrophe, the header route runs: quoted name (0x4867fc), two integers
 *   (0x486a00), three frequencies, three gains (zero → 1), start and interval
 *   (0x48690c). Every later line gives three Doubles, appended in file order.
 * - THdrDisp.FormActivate 0x571748 (PLR-PROP-01, VMT 0x57149c, coordinator-verified
 *   method and field binding) supplies the display formats. The meanings follow
 *   the THdrDisp DFM captions (Object, Data Start, Aperture, Frequency (MHz),
 *   Relative Gain, # of Data Points, Delta T (MSecs), File) and help topic
 *   PULSRANL "View Data Properties". This is static evidence, not a runtime witness.
 *
 * Admission is a strict WEB policy, separate from native acceptance. The
 * native reader mutates partial state and raises on bad text. This module
 * either admits a whole file or rejects it with a reason, and never
 * synthesizes metadata. Values are parsed into IEEE double with Number(). The
 * native reader keeps metadata in x87 Extended and rows as Double. Number is
 * not x87 equivalent.
 */

export const PLR_MAX_BYTES = 2 * 1024 * 1024;
export const PLR_MAX_ROWS = 65536;
export const PLR_MAX_LINE_CHARS = 512;
export const PLR_MAX_NUMBER_CHARS = 64;
/** shortstring[40] at obj+4 (0x56a327 cl=0x28). The web rejects longer names instead of truncating them. */
export const PLR_MAX_NAME_CHARS = 40;
/** Literal 0x56b9bc compared at 0x56b7c9 and 0x56bf11. A matching name makes 0x56b7d0 overwrite the interval with 0.01 s. */
export const PLR_RESERVED_NAME = 'No Data';

export type PlrRejectReason =
  | 'size' | 'empty' | 'byte' | 'line-ending' | 'line-length' | 'headerless' | 'blank-first-line'
  | 'name-unterminated' | 'name-length' | 'name-reserved' | 'header-layout'
  | 'integer' | 'aperture-range' | 'highest-range' | 'number' | 'number-range'
  | 'interval-range' | 'truncated-header' | 'data-tokens' | 'trailing-content' | 'rows';

export type PlrRejection = Readonly<{ status: 'rejected'; reason: PlrRejectReason; line: number | null; detail: string }>;

/** Exact decimal lexeme as written in the file, plus its web Number value. */
export type PlrNumber = Readonly<{ lexeme: string; value: number }>;
export type PlrGain = Readonly<{ lexeme: string; value: number; effective: number; zeroReplaced: boolean }>;
export type PlrReceiverIndex = 0 | 1 | 2;

export type PlrRecording = Readonly<{
  fileName: string;
  /** Copy of the supplied bytes. Downloads return exactly these bytes. */
  bytes: Uint8Array<ArrayBuffer>;
  lineEnding: 'CRLF' | 'LF' | 'mixed' | 'none';
  name: string;
  aperture: Readonly<{ lexeme: string; value: number }>;
  highestIndex: Readonly<{ lexeme: string; value: PlrReceiverIndex }>;
  frequencies: readonly [PlrNumber, PlrNumber, PlrNumber];
  gains: readonly [PlrGain, PlrGain, PlrGain];
  start: PlrNumber;
  /** Stored interval in seconds. Properties multiply by 1000 to show msec. */
  interval: PlrNumber;
  rowCount: number;
  /** Row-major rows×3 Doubles in file order: column c is recorded channel c. */
  samples: Float64Array;
}>;

export type PlrAdmission = Readonly<{ status: 'admitted'; recording: PlrRecording }> | PlrRejection;

const reject = (reason: PlrRejectReason, line: number | null, detail = ''): PlrRejection =>
  Object.freeze({ status: 'rejected', reason, line, detail });

/** Strict web grammar for one StrToFloat (0x40cf60) token. The native helper accepts more spellings and uses the host DecimalSeparator. */
const FLOAT_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,3})? *$/;
/** Strict web grammar for one StrToInt (0x40ad50) token: decimal digits only, no hex or trailing blanks. */
const INT_RE = /^[+-]?\d{1,6}$/;

/** Mutable cursor over one line. These are ports of the recovered tokenizers 0x4867fc, 0x48690c and 0x486a00. */
class Line {
  constructor(public rest: string, readonly number: number) {}
  /** All three helpers first delete leading ' ' (0x20) and delimiter characters. */
  skip() { let i = 0; while (i < this.rest.length && (this.rest[i] === ' ' || this.rest[i] === ',')) i++; this.rest = this.rest.slice(i); }
  /** 0x48690c / 0x486a00: the token runs to the first ','. Delete(token + delimiter). */
  token(): string {
    this.skip();
    const p = this.rest.indexOf(','), n = p < 0 ? this.rest.length : p, tok = this.rest.slice(0, n);
    this.rest = this.rest.slice(n + 1);
    return tok;
  }
  /** Text left once the needed tokens are consumed, ignoring delimiters and blanks. */
  remaining(): string { this.skip(); return this.rest; }
}

type Bound = Readonly<{ max: number; positive?: boolean }>;
const FREQ: Bound = { max: 1e9 }, GAIN: Bound = { max: 1e6 }, START: Bound = { max: 1e7 }, SAMPLE: Bound = { max: 1e9 };
const INTERVAL: Bound = { max: 1e3, positive: true };

function float(line: Line, bound: Bound): PlrNumber | PlrRejection {
  const lexeme = line.token();
  if (lexeme.length === 0) return reject('data-tokens', line.number, 'missing value');
  if (lexeme.length > PLR_MAX_NUMBER_CHARS || !FLOAT_RE.test(lexeme)) return reject('number', line.number, lexeme.slice(0, PLR_MAX_NUMBER_CHARS));
  const value = Number(lexeme.trimEnd());
  if (!Number.isFinite(value) || Math.abs(value) > bound.max) return reject(bound.positive ? 'interval-range' : 'number-range', line.number, lexeme);
  if (bound.positive && !(value > 0)) return reject('interval-range', line.number, lexeme);
  // A nonzero spelling that underflows to zero is invalid, not a zero gain.
  if (value === 0 && /[1-9]/.test(lexeme.split(/[eE]/)[0])) return reject('number-range', line.number, lexeme);
  return Object.freeze({ lexeme, value: value === 0 ? 0 : value });
}

function integer(line: Line): Readonly<{ lexeme: string; value: number }> | PlrRejection {
  const lexeme = line.token();
  if (!INT_RE.test(lexeme)) return reject('integer', line.number, lexeme.slice(0, PLR_MAX_NUMBER_CHARS));
  return Object.freeze({ lexeme, value: Number(lexeme) + 0 });
}

const isRejection = (v: unknown): v is PlrRejection => typeof v === 'object' && v !== null && (v as { status?: string }).status === 'rejected';

/** Splits on LF and strips one trailing CR. A lone CR, a byte outside printable ASCII or tab, or an over-long line rejects. */
function splitLines(bytes: Uint8Array): Readonly<{ lines: string[]; ending: PlrRecording['lineEnding'] }> | PlrRejection {
  const lines: string[] = [];
  let crlf = 0, lf = 0, start = 0;
  for (let i = 0; i <= bytes.length; i++) {
    if (i < bytes.length && bytes[i] !== 0x0a) {
      const b = bytes[i];
      if (b === 0x0d) { if (bytes[i + 1] !== 0x0a) return reject('line-ending', lines.length + 1, 'lone CR'); continue; }
      if (b < 0x20 || b > 0x7e) return reject('byte', lines.length + 1, `0x${b.toString(16).padStart(2, '0')} at byte ${i}`);
      continue;
    }
    if (i === bytes.length && start === bytes.length) break; // A final LF does not start another line.
    let end = i;
    if (i < bytes.length) { if (end > start && bytes[end - 1] === 0x0d) { end--; crlf++; } else lf++; }
    if (end - start > PLR_MAX_LINE_CHARS) return reject('line-length', lines.length + 1);
    let text = '';
    for (let j = start; j < end; j++) text += String.fromCharCode(bytes[j]);
    lines.push(text);
    start = i + 1;
  }
  return { lines, ending: crlf && lf ? 'mixed' : crlf ? 'CRLF' : lf ? 'LF' : 'none' };
}

/** Parses a supplied recording. The bytes are copied, so a later change to the caller's buffer has no effect. */
export function admitPlrRecording(input: Uint8Array, fileName: string): PlrAdmission {
  if (input.byteLength > PLR_MAX_BYTES) return reject('size', null);
  if (input.byteLength === 0) return reject('empty', null);
  const bytes = Uint8Array.from(input);
  const split = splitLines(bytes);
  if (isRejection(split)) return split;
  const { lines } = split;
  if (lines.length === 0) return reject('empty', null);
  // 0x56a2ed compares the first character of line 1 with an apostrophe. A non-empty first line without one
  // takes the headerless route: it resets the file and reads rows, but leaves the metadata untouched.
  // WEB: a blank first line is rejected on its own. The listing dereferences the line's first character, and
  // what the original does with an empty line there is not established (no runtime witness), so no native
  // route is claimed for it. This admission requires the apostrophe header on line 1.
  if (lines[0].length === 0) return reject('blank-first-line', 1);
  if (lines[0][0] !== "'") return reject('headerless', 1);
  if (lines.length < 4) return reject('truncated-header', lines.length + 1);

  // Line 1: 'NAME',aperture,highest (0x56a2f6..0x56a346)
  const l1 = lines[0], close = l1.indexOf("'", 1);
  if (close < 0) return reject('name-unterminated', 1);
  const name = l1.slice(1, close);
  if (name.length > PLR_MAX_NAME_CHARS) return reject('name-length', 1, String(name.length));
  if (name === PLR_RESERVED_NAME) return reject('name-reserved', 1);
  // The native helper deletes one extra character after the closing quote. The web requires it to be the delimiter.
  if (l1[close + 1] !== ',') return reject('header-layout', 1);
  const h1 = new Line(l1.slice(close + 2), 1);
  const aperture = integer(h1); if (isRejection(aperture)) return aperture;
  if (aperture.value < 0 || aperture.value > 0xffff) return reject('aperture-range', 1, aperture.lexeme);
  const highest = integer(h1); if (isRejection(highest)) return highest;
  if (highest.value < 0 || highest.value > 2 || highest.lexeme.startsWith('-')) return reject('highest-range', 1, highest.lexeme);
  if (h1.remaining() !== '') return reject('trailing-content', 1);

  const triple = (index: number, bound: Bound) => {
    const line = new Line(lines[index], index + 1), out: PlrNumber[] = [];
    for (let i = 0; i < 3; i++) { const v = float(line, bound); if (isRejection(v)) return v; out.push(v); }
    if (line.remaining() !== '') return reject('trailing-content', index + 1);
    return out as [PlrNumber, PlrNumber, PlrNumber];
  };
  const freqs = triple(1, FREQ); if (isRejection(freqs)) return freqs;
  const rawGains = triple(2, GAIN); if (isRejection(rawGains)) return rawGains;
  // 0x56a3b6..0x56a3d7: a gain equal to 0.0 (f32 0x56a514) is replaced by Extended 1.0.
  const gains = rawGains.map(g => Object.freeze({ lexeme: g.lexeme, value: g.value, effective: g.value === 0 ? 1 : g.value, zeroReplaced: g.value === 0 })) as unknown as [PlrGain, PlrGain, PlrGain];
  const l4 = new Line(lines[3], 4);
  const start = float(l4, START); if (isRejection(start)) return start;
  const interval = float(l4, INTERVAL); if (isRejection(interval)) return interval;
  if (l4.remaining() !== '') return reject('trailing-content', 4);

  // 0x56a432..0x56a474: read until EOF, three Doubles per physical line. A blank line raises natively, so the web rejects it.
  const rowCount = lines.length - 4;
  if (rowCount > PLR_MAX_ROWS) return reject('rows', null, String(rowCount));
  const samples = new Float64Array(rowCount * 3);
  for (let r = 0; r < rowCount; r++) {
    const line = new Line(lines[r + 4], r + 5);
    for (let c = 0; c < 3; c++) { const v = float(line, SAMPLE); if (isRejection(v)) return v; samples[r * 3 + c] = v.value; }
    if (line.remaining() !== '') return reject('trailing-content', r + 5);
  }
  const recording: PlrRecording = Object.freeze({
    fileName: fileName.slice(0, 255), bytes, lineEnding: split.ending, name,
    aperture: Object.freeze({ lexeme: aperture.lexeme, value: aperture.value }),
    highestIndex: Object.freeze({ lexeme: highest.lexeme, value: highest.value as PlrReceiverIndex }),
    frequencies: Object.freeze(freqs) as PlrRecording['frequencies'], gains: Object.freeze(gains) as PlrRecording['gains'],
    start, interval, rowCount, samples,
  });
  return Object.freeze({ status: 'admitted', recording });
}

/** Sample of recorded channel c at row index i. Out of range gives null, like list item 0x492688. */
export function plrSample(rec: PlrRecording, row: number, channel: PlrReceiverIndex): number | null {
  return Number.isInteger(row) && row >= 0 && row < rec.rowCount ? rec.samples[row * 3 + channel] : null;
}

// ---------------------------------------------------------------- native text formats
/**
 * FloatToStrF(value, ffFixed, 18, digits) via wrapper 0x486268. Number.toFixed rounds the exact
 * binary value half away from zero. A rounded zero prints without '-'; the native sign behavior is
 * not verified. DecimalSeparator is not recovered, so '.' is used.
 */
export function formatFixed(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '';
  const text = value.toFixed(digits);
  return /^-0(?:\.0*)?$/.test(text) ? text.slice(1) : text;
}
/** FloatToStrF(value, ffExponent, precision, 2) via wrapper 0x48634c, for example 1.2346E+02. */
export function formatExponent(value: number, precision = 5, minExponentDigits = 2): string {
  if (!Number.isFinite(value)) return '';
  const [mantissa, exp] = value.toExponential(precision - 1).split('e');
  const sign = exp.startsWith('-') ? '-' : '+', digits = exp.replace(/^[+-]/, '').padStart(minExponentDigits, '0');
  return `${mantissa}E${sign}${digits}`;
}

export type PlrPropertyKey = 'object' | 'start' | 'aperture' | 'interval' | 'points' | 'file';
export type PlrReceiverProperty = Readonly<{ receiver: PlrReceiverIndex; recorded: boolean; frequency: string; gain: string; gainZeroReplaced: boolean }>;
export type PlrProperties = Readonly<{ fields: Readonly<Record<PlrPropertyKey, string>>; receivers: readonly PlrReceiverProperty[] }>;

/**
 * Read-only properties text as formatted by 0x571748. File name: the native code shows obj+0x9a,
 * the reader FileName text (possibly including a directory path), not supplied by the PLR header.
 * This window retains the supplied browser File.name instead; no native path equivalence is claimed.
 */
export function plrProperties(rec: PlrRecording): PlrProperties {
  const h = rec.highestIndex.value;
  return Object.freeze({
    fields: Object.freeze({
      object: rec.name,
      start: formatFixed(rec.start.value, 8),
      aperture: String(rec.aperture.value),
      // fmul f32 1000 (0x571998) then ffFixed 2
      interval: formatFixed(rec.interval.value * 1000, 2),
      // IntToStr([obj+0x84]+1): last index + 1
      points: String(rec.rowCount),
      file: rec.fileName,
    }),
    receivers: Object.freeze(([0, 1, 2] as const).map(i => Object.freeze({
      receiver: i, recorded: i <= h,
      frequency: i <= h ? formatFixed(rec.frequencies[i].value, 2) : '',
      gain: i <= h ? formatFixed(rec.gains[i].effective, 3) : '',
      gainZeroReplaced: rec.gains[i].zeroReplaced,
    }))),
  });
}
