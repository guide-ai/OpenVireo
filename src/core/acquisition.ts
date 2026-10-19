import { roundNearestEven } from './numericPolicy';
/** Recovered numerical building blocks, not an integrated exposure simulator.
 * See docs/HUBBLE-RECOVERY.md for evidence and explicit browser adaptations.
 * Number/Math are NOT certified replacements for the original Extended/x87.
 */
export class AcquisitionError extends Error {
  constructor(readonly code: 'seed' | 'grid' | 'wavelength' | 'mean' | 'budget' | 'overflow' | 'gamma' | 'precision') {
    super(`Acquisition numerical contract: ${code}`);
    this.name = 'AcquisitionError';
  }
}
export type RandomDraw = Readonly<{ seed: number; value: number }>;
/** 0x4035e4–0x40360a. Explicit seed replaces the original shared global state. */
export function randomDraw(seed: number): RandomDraw {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) throw new AcquisitionError('seed');
  const next = (Math.imul(seed, 0x08088405) + 1) >>> 0;
  return { seed: next, value: next / 0x1_0000_0000 };
}

const gridBrand: unique symbol = Symbol('uniform-spectrum');
export type UniformSpectrum = Readonly<{ [gridBrand]: true; minimum: number; maximum: number; step: number; intensities: readonly number[] }>;
/** 0x55df2c stores endpoints and lastIndex, then step=(max-min)/lastIndex.
 * The bounded immutable array and validation are new browser protections. */
export function uniformSpectrum(minimum: number, maximum: number, intensities: readonly number[]): UniformSpectrum {
  const step = (maximum - minimum) / (intensities.length - 1);
  if (!Number.isFinite(minimum) || minimum <= 0 || !Number.isFinite(maximum) || maximum <= minimum ||
      intensities.length < 3 || intensities.length > 50_000 || !Number.isFinite(step) || step <= 0) throw new AcquisitionError('grid');
  const values = [...intensities];
  // Inspect the dense copy too: Array.some on the input would skip sparse holes.
  if (values.some(value => !Number.isFinite(value))) throw new AcquisitionError('grid');
  return Object.freeze({ [gridBrand]: true as const, minimum, maximum, step, intensities: Object.freeze(values) });
}
export type SpectrumValue = Readonly<{ valid: boolean; value: number }>;
/** 0x55dfe0. Endpoint handling and quadratic interpolation; no flux clamping. */
export function sampleUniformSpectrum(spectrum: UniformSpectrum, wavelength: number): SpectrumValue {
  if (!Number.isFinite(wavelength)) throw new AcquisitionError('wavelength');
  if (wavelength < spectrum.minimum || wavelength > spectrum.maximum) return { valid: false, value: 0 };
  const u = (wavelength - spectrum.minimum) / spectrum.step;
  let index = roundNearestEven(u), fraction = u - index;
  const values = spectrum.intensities, last = values.length - 1;
  if (Math.abs(fraction) <= 1e-5) return { valid: true, value: values[index] };
  if (index === 0) { index = 1; fraction -= 1; }
  if (index === last) { index--; fraction += 1; }
  const center = values[index], left = center - values[index - 1], right = values[index + 1] - center;
  const value = center + fraction * (left + right + fraction * (right - left)) / 2;
  if (!Number.isFinite(value)) throw new AcquisitionError('overflow');
  return { valid: true, value };
}

const gammaCoefficients = [76.18009173, -86.50532033, 24.01409822, -1.231739516, 0.00120858003, -0.00000536382] as const;
/** 0x55f354: original six coefficients, not a substituted library gamma. */
export function recoveredLogGamma(argument: number): number {
  // The recovered Poisson branch passes candidate+1 and mean+1, both >= 1.
  if (!Number.isFinite(argument) || argument < 1 || argument > Number.MAX_SAFE_INTEGER) throw new AcquisitionError('gamma');
  let x = argument - 1;
  const shifted = x + 5.5;
  const term = (x + 0.5) * Math.log(shifted) - shifted;
  let series = 1;
  for (const coefficient of gammaCoefficients) { x++; series += coefficient / x; }
  // Original checks shifted and scaled-series against zero before taking logs.
  // Its unsupported branch does not define a result; this adapter throws.
  if (shifted <= 0 || 2.50662827465 * series <= 0) throw new AcquisitionError('gamma');
  const value = term + Math.log(2.50662827465 * series);
  if (!Number.isFinite(value)) throw new AcquisitionError('overflow');
  return value;
}

export type PoissonDraw = Readonly<{ value: number; seed: number; draws: number }>;
/** 0x55f0f4: product branch below 12, rejection branch at/above 12.
 * Explicit state, domain limits and draw budget are browser adaptations.
 * Original cache is recomputed without changing random draw consumption.
 */
export function poissonDraw(mean: number, initialSeed: number, drawBudget = 10_000): PoissonDraw {
  if (!Number.isFinite(mean) || mean < 0 || mean > 1_000_000) throw new AcquisitionError('mean');
  if (!Number.isInteger(drawBudget) || drawBudget < 1 || drawBudget > 100_000) throw new AcquisitionError('budget');
  // Validate seed even if the budget is exhausted before the first accepted draw.
  randomDraw(initialSeed);
  let seed = initialSeed, draws = 0;
  function uniform(): number {
    if (draws >= drawBudget) throw new AcquisitionError('budget');
    const draw = randomDraw(seed); seed = draw.seed; draws++;
    return draw.value;
  }
  if (mean < 12) {
    const threshold = Math.exp(-mean);
    let value = -1, product = 1;
    do { value++; product *= uniform(); } while (product > threshold);
    return { value, seed, draws };
  }
  const width = Math.sqrt(2 * mean), logMean = Math.log(mean);
  const normalizer = mean * logMean - recoveredLogGamma(mean + 1);
  for (;;) {
    const angleUniform = uniform();
    // The original Extended pi and x87 argument reduction are not binary64 pi.
    // Do not invent an accept/reject decision at their singular midpoint.
    if (angleUniform === 0.5) throw new AcquisitionError('precision');
    const angle = Math.PI * angleUniform;
    const y = Math.sin(angle) / Math.cos(angle);
    const candidate = mean + width * y;
    if (candidate < 0) continue;
    const value = Math.trunc(candidate);
    if (!Number.isSafeInteger(value)) throw new AcquisitionError('overflow');
    const exponent = value * logMean - recoveredLogGamma(value + 1) - normalizer;
    const exponential = exponent < -30 ? 0 : Math.exp(exponent);
    const threshold = 0.9 * (1 + y * y) * exponential;
    if (!Number.isFinite(threshold)) throw new AcquisitionError('overflow');
    if (uniform() <= threshold) return { value, seed, draws };
  }
}
