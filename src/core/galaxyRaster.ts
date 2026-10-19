import { roundNearestEven } from './numericPolicy';
/** Original pre-resampling galaxy raster stages. Native GDI stretching,
 * palette/device conversion, rotation/cropping and full scene are not replaced
 * by browser interpolation. See docs/HUBBLE-ORACLE-PROPOSAL.md. */
export const GALAXY_STAMP_SIZE = 249;

/** 0x593f64 initializes the BSS table; it is not stored as file-backed pixels.
 * i,j=1..249, center125, sigma45, round(255*exp(-(x²+y²)/2)). */
let baseTable: Int32Array | undefined;
function cachedBaseProfile(): Int32Array {
  if (baseTable) return baseTable;
  const result = new Int32Array(GALAXY_STAMP_SIZE ** 2);
  for (let y = 0; y < GALAXY_STAMP_SIZE; y++) for (let x = 0; x < GALAXY_STAMP_SIZE; x++) {
    const dx = (x + 1 - 125) / 45, dy = (y + 1 - 125) / 45;
    result[y * GALAXY_STAMP_SIZE + x] = roundNearestEven(255 * Math.exp(-(dx * dx + dy * dy) / 2));
  }
  baseTable = result;
  return result;
}
/** The private cache is never exposed; each caller owns its mutable result. */
export function galaxyBaseProfile(): Int32Array { return cachedBaseProfile().slice(); }
/** 0x59422c scales the integer base table by 0.9^level before rounding/clamp.
 * 0x5942dc removes levels below15 and remaps15..119 with sqrt((b-15)/105)*120.
 * Number/Math is not bitwise x87 equivalence. No resampling is performed here. */
export function galaxyToneProfile(level: number): Uint8Array {
  if (!Number.isInteger(level) || level < 0 || level > 14) throw new Error('Galaxy raster level must be an integer from 0 to 14.');
  const base = cachedBaseProfile(), scale = 0.9 ** level;
  return Uint8Array.from(base, sample => {
    let value = Math.min(255, roundNearestEven(sample * scale));
    if (value < 15) value = 0;
    else if (value < 120) value = roundNearestEven(Math.sqrt((value - 15) / 105) * 120);
    return value;
  });
}
/** 0x594808 compares COLORREF's low byte (red), not summed intensity.
 * A nonzero brighter source replaces the complete destination RGB triplet. */
export function composeGalaxyPixel(source: readonly [number, number, number], destination: readonly [number, number, number]): readonly [number, number, number] {
  if ([...source, ...destination].some(value => !Number.isInteger(value) || value < 0 || value > 255)) throw new Error('RGB channels must be byte values.');
  return source[0] > 0 && source[0] > destination[0] ? [...source] : [...destination];
}
