/** Bounded ASCII/dot-decimal interpretation of VIREO saved spectra and
 * headerless two-column source files. No original x87/RTL byte-equivalence,
 * acquired observation, missing header metadata or sky subtraction is inferred.
 */
export class LegacySpectrumFileError extends Error {
  constructor(readonly code: 'bytes' | 'encoding' | 'header' | 'rows' | 'number' | 'order' | 'counts' | 'zero-maximum' | 'range' | 'grid-precision') {
    super(`Legacy spectrum file contract: ${code}`); this.name = 'LegacySpectrumFileError';
  }
}
export type LegacySpectrumHeader = Readonly<{
  object: string; pointingRa: number; pointingDec: number; apparentMagnitude?: number;
}>;
const brand: unique symbol = Symbol('parsed-legacy-spectrum');
export type LegacySpectrumFile = Readonly<{
  [brand]: true; kind: 'vireo-headered-600' | 'headerless-source';
  header: LegacySpectrumHeader | null; sourceText: string;
  samples: readonly Readonly<{ wavelength: number; intensity: number }>[];
}>;
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const PREFIX = '*SpHdr* '; // Eight bytes, including the trailing space.
const BINS = 600, MAX_BYTES = 2 * 1024 * 1024;
function number(text: string): number {
  if (!DECIMAL.test(text)) throw new LegacySpectrumFileError('number');
  const value = Number(text);
  if (!Number.isFinite(value)) throw new LegacySpectrumFileError('number');
  if (value === 0 && /[1-9]/.test(text.split(/[eE]/)[0])) throw new LegacySpectrumFileError('range');
  return value;
}
function asciiBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 127) throw new LegacySpectrumFileError('encoding');
    bytes[i] = code;
  }
  return bytes;
}
/** Metadata are file claims. Headerless templates, including flux>1, remain
 * sources and never acquire observation status. Interior wavelengths are kept
 * exactly as parsed; the original endpoint-uniform reconstruction is separate.
 */
export function parseLegacySpectrumFile(bytes: Uint8Array): LegacySpectrumFile {
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_BYTES) throw new LegacySpectrumFileError('bytes');
  const chunks: string[] = [];
  for (let at = 0; at < bytes.length; at += 4096) {
    const chunk = bytes.subarray(at, at + 4096);
    if (chunk.some(code => code > 127)) throw new LegacySpectrumFileError('encoding');
    chunks.push(String.fromCharCode(...chunk));
  }
  const sourceText = chunks.join('');
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(sourceText) || /\r(?!\n)/.test(sourceText)) throw new LegacySpectrumFileError('encoding');
  const rows = sourceText.split(/\r?\n/).filter(row => row.trim().length > 0);
  let header: LegacySpectrumHeader | null = null;
  if (rows[0]?.startsWith(PREFIX)) {
    const parts = rows.shift()!.slice(PREFIX.length).split(',');
    if ((parts.length !== 3 && parts.length !== 4) || parts[0].length > 24 || !parts[0].trim()) throw new LegacySpectrumFileError('header');
    header = Object.freeze({ object: parts[0], pointingRa: number(parts[1].trim()), pointingDec: number(parts[2].trim()),
      ...(parts.length === 4 ? { apparentMagnitude: number(parts[3].trim()) } : {}) });
    // The native reader supplies99 when magnitude is absent. Preserve absence
    // here instead of turning its sentinel into an asserted measured magnitude.
  } else if (rows[0]?.includes('*SpHdr*')) throw new LegacySpectrumFileError('header');
  if (rows.length < 2 || rows.length > 50_000 || (header !== null && rows.length !== BINS)) throw new LegacySpectrumFileError('rows');
  let previous = 0;
  const samples = rows.map(row => {
    const fields = row.trim().split(/[ \t]+/);
    if (fields.length !== 2) throw new LegacySpectrumFileError('rows');
    const wavelength = number(fields[0]), intensity = number(fields[1]);
    if (wavelength <= previous) throw new LegacySpectrumFileError('order');
    previous = wavelength;
    return Object.freeze({ wavelength, intensity });
  });
  return Object.freeze({ [brand]: true as const, kind: header ? 'vireo-headered-600' : 'headerless-source',
    header, sourceText, samples: Object.freeze(samples) });
}
/** Exact ASCII source-byte roundtrip, including whitespace and line endings.
 * Normalization and six-decimal writing cannot recover original count scales.
 */
export function originalLegacySpectrumBytes(file: LegacySpectrumFile): Uint8Array {
  if (!file || file[brand] !== true) throw new LegacySpectrumFileError('bytes');
  return asciiBytes(file.sourceText);
}
export function fixedRatio(numerator: bigint, denominator: bigint, digits: number): string {
  const negative = numerator < 0n, magnitude = negative ? -numerator : numerator;
  const scaled = magnitude * 10n ** BigInt(digits);
  let rounded = scaled / denominator;
  if ((scaled % denominator) * 2n >= denominator) rounded++;
  const text = rounded.toString().padStart(digits + 1, '0');
  const result = digits ? text.slice(0, -digits) + '.' + text.slice(-digits) : text;
  return (negative && rounded !== 0n ? '-' : '') + result;
}
/** Exact fraction of a supplied Number; this is a new binary64 decimal policy,
 * not an emulation of the original eighteen-digit x87/BCD conversion stage.
 */
export function fixedNumber(value: number, digits: number): string {
  if (!Number.isFinite(value) || Math.abs(value) >= 1e18) throw new LegacySpectrumFileError('range');
  if (value === 0) return fixedRatio(0n, 1n, digits);
  const bits = new DataView(new ArrayBuffer(8)); bits.setFloat64(0, value, false);
  const hi = bits.getUint32(0, false), lo = bits.getUint32(4, false), exponent = (hi >>> 20) & 0x7ff;
  let significand = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (exponent) significand |= 1n << 52n;
  if (hi >>> 31) significand = -significand;
  const power = (exponent || 1) - 1023 - 52;
  return fixedRatio(power >= 0 ? significand << BigInt(power) : significand,
    power >= 0 ? 1n : 1n << BigInt(-power), digits);
}
export type VireoSpectrumSaveInput = Readonly<{
  object: string; pointingRa: number; pointingDec: number; apparentMagnitude: number;
  minimum: number; step: number; counts: readonly number[] | Int32Array;
}>;
/** 0x50fb1c/0x510090:600 signed int32 counts, max starts at0; no baseline
 * subtraction, absolute-value normalization or rescaling to min/max.
 * Dot decimal/ASCII/CRLF is the explicit supported output profile. Original
 * locale separators, ANSI codepages, exceptional FPU output and extreme RTL
 * general-format fallback are unsupported. Complete output is returned atomically.
 */
export function serializeDotDecimalVireoSpectrum(input: VireoSpectrumSaveInput): Uint8Array {
  if (!input || typeof input.object !== 'string' || !input.object.trim() || input.object.length > 255 ||
      /[^\x20-\x7e]|,/.test(input.object)) throw new LegacySpectrumFileError('header');
  if (!(Array.isArray(input.counts) || input.counts instanceof Int32Array) || input.counts.length !== BINS) throw new LegacySpectrumFileError('counts');
  const counts = Array.from(input.counts);
  let maximum = 0;
  for (const value of counts) {
    if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw new LegacySpectrumFileError('counts');
    maximum = Math.max(maximum, value);
  }
  if (maximum === 0) throw new LegacySpectrumFileError('zero-maximum');
  let wavelength = Math.fround(input.minimum);
  if (!Number.isFinite(wavelength) || wavelength <= 0 || !Number.isFinite(input.step) || input.step <= 0) throw new LegacySpectrumFileError('range');
  const magnitude = Math.fround(input.apparentMagnitude);
  const rows = [PREFIX + input.object.slice(0, 24) + ',' + fixedNumber(input.pointingRa, 6) + ',' +
    fixedNumber(input.pointingDec, 5) + ',' + fixedNumber(magnitude, 3)];
  let previous = 0;
  for (const value of counts) {
    const label = fixedNumber(wavelength, 2), quantized = Number(label);
    if (quantized <= previous) throw new LegacySpectrumFileError('grid-precision');
    previous = quantized;
    rows.push(label + ' ' + fixedRatio(BigInt(value), BigInt(maximum), 6));
    wavelength += input.step; // Explicit Number adaptation of repeated Extended stores.
  }
  return asciiBytes(rows.join('\r\n') + '\r\n');
}
