import { roundNearestEven } from './numericPolicy';

/** VIREO SHA256 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c.
 * 0x593df8 base table, 0x594018 level, 0x5948b0 bank; startup 0x5ad220.
 * Explicit binary64/nearest-even adapter, NOT an original x87 pixel oracle.
 * These tables alone do not certify a detector scene or enable acquisition.
 */
export class StarProfileError extends Error {
  constructor(readonly code: 'table' | 'level') {
    super(`Star profile contract: ${code}`);
    this.name = 'StarProfileError';
  }
}
export const NATIVE_STAR_SIDE = 99;
const CELLS = NATIVE_STAR_SIDE * NATIVE_STAR_SIDE;
// Packed original <int16 threshold, Single amplitude, Single divisor, Single spike>.
// All these Single values are exactly representable in binary64.
const PARAMETERS = [
  [2000, 6, 1000], [7000, 4.5, 1000],
  [20000, 3.5, 1000], [45000, 2, 1000],
] as const;
let bases: readonly Int32Array[] | undefined;

/** 0x593e7e..0x593f18 preserves x-column priority. In particular, (0,1)
 * and (1,0) have different cross terms. This is not a radial/symmetric PSF.
 */
function makeBases(): readonly Int32Array[] {
  return PARAMETERS.map(([amplitude, divisor, spike]) => {
    const table = new Int32Array(CELLS);
    for (let x = 0; x < NATIVE_STAR_SIDE; x++) {
      const dx = x - 49, xRatio = dx / divisor, xSquared = xRatio * xRatio;
      for (let y = 0; y < NATIVE_STAR_SIDE; y++) {
        const dy = y - 49, yRatio = dy / divisor;
        const gaussian = Math.exp(-(yRatio * yRatio + xSquared) / 2) * amplitude;
        const ax = Math.abs(dx), ay = Math.abs(dy);
        let cross = 0;
        if (ax === 0) cross = 1 - ay / 50;
        else if (ax === 1) cross = .5 - ay / 100;
        else if (ay === 0) cross = 1 - ax / 50;
        else if (ay === 1) cross = .5 - ax / 100;
        table[x * NATIVE_STAR_SIDE + y] = roundNearestEven(gaussian + cross * spike);
      }
    }
    return table;
  });
}
function cachedBases(): readonly Int32Array[] {
  return bases ??= makeBases();
}
/** Owned x-major/y-fastest int32 copy; pre-brightness/pre-painter values. */
export function nativeStarBase(table: number): Int32Array {
  if (!Number.isInteger(table) || table < 0 || table >= PARAMETERS.length) throw new StarProfileError('table');
  return new Int32Array(cachedBases()[table]);
}
/** Integer-exponent branch of RTL0x42703c, used for levels0..14.
 * Multiplication tree is preserved; intermediates and 0.63 are binary64
 * projections rather than the original Extended operands/control word.
 */
function levelScale(level: number): number {
  let factor = 1, power = .63, remaining = level;
  while (remaining) {
    if (remaining % 2) factor *= power;
    remaining = Math.floor(remaining / 2);
    if (remaining) power *= power;
  }
  return factor;
}
/** 0x59409d..0x59410a selects tables at inclusive thresholds3/6/9.
 * Returns owned byte levels accepted by paintNativeStar; that separate
 * painter applies threshold30, clipping and strict red-channel comparison.
 */
export function prepareNativeStarProfile(level: number): Uint8Array {
  if (!Number.isInteger(level) || level < 0 || level > 14) throw new StarProfileError('level');
  const table = cachedBases()[level >= 9 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0];
  const factor = levelScale(level), result = new Uint8Array(CELLS);
  for (let i = 0; i < CELLS; i++) result[i] = Math.min(255, roundNearestEven(table[i] * factor));
  return result;
}
/** Original bank constructs fifteen entries with stride0x9925 and radius50.
 * EDX/CL store magnitude offset and conversion flag AFTER construction;
 * they are not Gaussian inputs. catalogPopulation.ts separately models the
 * converter and cached record level; this API returns only prepared tables.
 */
export function prepareNativeStarProfiles(): Readonly<{ radius: 50; levels: readonly Uint8Array[] }> {
  return Object.freeze({ radius: 50 as const,
    levels: Object.freeze(Array.from({ length: 15 }, (_, level) => prepareNativeStarProfile(level))) });
}
