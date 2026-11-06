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
 * `negativeMean: 'native'` (Front R1, radio): 0x55f0f4 has no mean guard; its product branch caches g := Exp(−mean)
 * (0x55f110..0x55f141) and multiplies uniforms while t > g (0x55f169..0x55f190). For a finite negative mean g > 1, so the
 * first uniform ends the loop with value 0 and one draw [D for −11356 < mean < 0]. Below about −11356.5 Exp overflows Extended and
 * VIREO would likely raise EOverflow [I]; the web returns 0 there too [W]. The default keeps the earlier refusal for other callers.
 */
/** Front MEANBOUND: the largest mean the rejection branch evaluates the way it did before Front MEANBOUND (binary64, no guard
 * band). Means up to here keep every earlier draw, fingerprint and exercise result. */
export const POISSON_UNGUARDED_LIMIT=1_000_000;
/** poissonDraw's per-draw mean admission [W] (0x55f0f4 has none). Front MEANBOUND (2026-11-05, research
 * analysis/front-meanbound/RECOVERY.md): above POISSON_UNGUARDED_LIMIT the rejection decisions are taken with a guard band
 * (poissonLargeDecision) and typed 'precision' inside it; 2^36 keeps the expected share of 400-bin Multi-Spec fibres that meet
 * the band below 1 % (RECOVERY.md §4). Was 10^6 (Front L4, Front M D3). */
export const POISSON_MEAN_ADMISSION=2**36;
export function poissonDraw(mean: number, initialSeed: number, drawBudget = 10_000, negativeMean: 'refuse' | 'native' = 'refuse'): PoissonDraw {
  if (!Number.isFinite(mean) || (mean < 0 && negativeMean !== 'native') || mean > POISSON_MEAN_ADMISSION) throw new AcquisitionError('mean');
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
  if (mean > POISSON_UNGUARDED_LIMIT) return largeMeanDraw(mean, uniform, () => ({ seed, draws }));
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

// ---- Front MEANBOUND: the rejection branch above 10^6 with a guard band (research analysis/front-meanbound/RECOVERY.md). ----
// VIREO evaluates 0x55f0f4 in x87 Extended (control word 0x1332 at 0x5ae024: 64-bit precision, round to nearest [D for the
// static default; I that nothing changes it at run time]). The web evaluates the same formula more accurately than binary64 does
// naively, bounds its own error and VIREO's Extended error per proposal, and decides only outside both bounds; inside, it throws
// 'precision' (the typed u = 0.5 boundary already does this). The input mean is taken as the Extended argument exactly (the callers'
// binary64 means are their own declared policy, unchanged).
const UX = 2 ** -64, UD = 2 ** -53, ULP = 2 ** -52;
/** π at 0x55f334 (Extended 35c26821a2da0fc90040 = 14488038916154245685·2^-62) minus Math.PI, both exact: 1.2246467991473532e-16 + 5.0e-20. */
const PI_EXTENDED_MINUS_MATH_PI = 1.2246467991473532e-16 + 5.0166e-20;
/** |0.9 binary64 − 0.9 Extended (0x55f348)| / 0.9. */
const NINE_TENTHS_RELATIVE = 2.5e-17;
const twoSum = (a: number, b: number): [number, number] => { const s = a + b, bb = s - a; return [s, (a - (s - bb)) + (b - bb)]; };
const split = (a: number): [number, number] => { const c = 134217729 * a, h = c - (c - a); return [h, a - h]; };
const twoProduct = (a: number, b: number): [number, number] => {
  const p = a * b, [ah, al] = split(a), [bh, bl] = split(b);
  return [p, ((ah * bh - p) + ah * bl + al * bh) + al * bl];
};
/** φ(r) = (1+r)·log1p(r) − r ≥ 0, with an absolute error bound (series below |r| < 1/4, direct above). */
function phi(r: number): [number, number] {
  if (Math.abs(r) < 0.25) {
    let term = r * r, sum = 0;
    for (let k = 2; k < 80; k++) { const t = term / (k * (k - 1)); sum += k % 2 === 0 ? t : -t; if (Math.abs(t) <= 1e-19 * Math.abs(sum)) break; term *= r; }
    return [sum, 16 * UD * Math.abs(sum)];
  }
  const a = (1 + r) * Math.log1p(r);
  return [a - r, 16 * UD * (Math.abs(a) + Math.abs(r))];
}
/** VIREO's Extended evaluation error bound for its gammln 0x55f354 at x (= argument − 1), from the magnitudes of its steps. */
function vireoGammaError(x: number): Readonly<{ value: number; error: number }> {
  const t = x + 5.5, l = Math.log(t), q = (x + 0.5) * l, a = q - t;
  let ser = 1, serError = 0;
  for (let j = 0; j < 6; j++) { const term = gammaCoefficients[j] / (x + j + 1); ser += term; serError += UX * (Math.abs(term) + Math.abs(ser)); }
  const lnS = Math.log(2.50662827465 * ser), g = a + lnS;
  const errQ = Math.abs(x + 0.5) * 3 * UX * Math.abs(l) + UX * Math.abs(q), errA = errQ + UX * Math.abs(a);
  const errLnS = 3 * UX * Math.abs(lnS) + serError / ser + UX;
  return { value: g, error: errA + errLnS + UX * Math.abs(g) };
}
export type PoissonLargeDecision = 'reject' | 'accept' | 'precision';
/** Exponent value·L − G(value+1) − (mean·L − G(mean+1)) of 0x55f27b..0x55f2a2 with the bound on |web − exact| + |VIREO − exact|.
 * The web evaluates the difference form, which has no cancellation between the ~mean·ln(mean) terms:
 * E = −D·log1p(5.5/m) − tm·φ(D/tm) + 5·log1p(D/tm) − log1p(Δser/ser(m)), D = value − mean, tm = mean + 5.5.
 * VIREO's bound follows its naive Extended sequence (L, value·L, G(value+1), mean·L, G(mean+1), N, E; 0x55f1db..0x55f205 and
 * 0x55f28e..0x55f2a0), each step within its rounding, Ln (FLDLN2·FYL2X, 0x4036cc) within 3·2^-64 relative, times 2. */
export function poissonLargeExponent(mean: number, value: number): Readonly<{ exponent: number; error: number; webError: number; vireoError: number }> {
  const D = value - mean, tm = mean + 5.5, r = D / tm, [ph, phError] = phi(r), lp = Math.log1p(r);
  let dSer = 0, serM = 1;
  for (let j = 0; j < 6; j++) { dSer -= D * gammaCoefficients[j] / ((value + j + 1) * (mean + j + 1)); serM += gammaCoefficients[j] / (mean + j + 1); }
  const t1 = -D * Math.log1p(5.5 / mean), t2 = -tm * ph, t3 = 5 * lp, t4 = -Math.log1p(dSer / serM), exponent = t1 + t2 + t3 + t4;
  const webError = 16 * UD * (Math.abs(t1) + Math.abs(t2) + Math.abs(t3) + Math.abs(t4) + tm * Math.abs(r * lp)) + tm * phError + 1e-16 * Math.abs(t4) + 1e-300;
  const L = Math.log(mean), gv = vireoGammaError(value), gm = vireoGammaError(mean);
  const vL = value * L, mL = mean * L, e1 = vL - gv.value, N = mL - gm.value, errL = 3 * UX * Math.abs(L);
  const vireoError = 2 * ((value * errL + UX * Math.abs(vL)) + gv.error + UX * Math.abs(e1) + (mean * errL + UX * Math.abs(mL)) + gm.error + UX * Math.abs(N) + UX * Math.abs(exponent));
  return { exponent, error: webError + vireoError, webError, vireoError };
}
/** One proposal of the rejection branch above 10^6: candidate (0x55f209..0x55f265), its truncation (0x55f267, Trunc 0x40370c to
 * Int64), exponent and threshold (0x55f27b..0x55f2ef) and the acceptance comparison (0x55f2f3..0x55f301). 'negative': the
 * candidate is below 0 and no acceptance uniform is drawn. Otherwise `decide(u2)` gives the decision for the acceptance uniform,
 * 'precision' when the web cannot tell VIREO's Extended decision apart (RECOVERY.md §3). Pure; exported for the tests. */
export function poissonLargeProposal(mean: number, angleUniform: number): Readonly<{ kind: 'negative' } | { kind: 'precision' } | { kind: 'candidate'; value: number | null; decide: (u2: number) => PoissonLargeDecision }> {
  const width = Math.sqrt(2 * mean), angle = Math.PI * angleUniform, y = Math.sin(angle) / Math.cos(angle);
  const yy = 1 + y * y, ay = Math.abs(y);
  // Candidate mean + width·y as a double-double, and the bound on |web − exact| + |VIREO − exact| (exact: the formula with π_ext).
  const [p, pe] = twoProduct(width, y), [h, he] = twoSum(mean, p), lo = he + pe;
  const dAngleWeb = PI_EXTENDED_MINUS_MATH_PI * angleUniform + UD * angle, dAngleVireo = UX * angle + 1e-19;
  const dyWeb = yy * dAngleWeb + 5 * ULP * ay, dyVireo = yy * dAngleVireo + 1e-18 * ay;
  const candidateError = 2 * (width * (dyWeb + dyVireo) + (UD + 2 * UX) * width * ay + (2 * UX + 2 ** -100) * (mean + width * ay));
  if (Math.abs(h + lo) <= candidateError) return { kind: 'precision' };
  if (h + lo < 0) return { kind: 'negative' };
  let n = Math.floor(h), f = (h - n) + lo;
  if (f < 0) { n--; f += 1; } else if (f >= 1) { n++; f -= 1; }
  const low = f <= candidateError ? n - Math.ceil(candidateError - f + 1e-9) : n, high = 1 - f <= candidateError ? n + Math.ceil(candidateError - (1 - f) + 1e-9) : n;
  if (!Number.isSafeInteger(Math.max(0, low)) || !Number.isSafeInteger(high)) throw new AcquisitionError('overflow');
  if (low !== high) {
    // The truncation is not decided. If every integer it could be has a threshold of 0 (exponent < −30 beyond both bounds;
    // E(v) is concave with its maximum near the mean, so the end nearer the mean is the largest), only u2 = 0 accepts, and that
    // acceptance's value is not decided.
    const nearest = Math.max(0, high < mean ? high : low > mean ? low : Math.round(mean)), e = poissonLargeExponent(mean, nearest);
    if (low <= mean && mean <= high || !(e.exponent + e.error < -30)) return { kind: 'precision' };
    return { kind: 'candidate', value: null, decide: u2 => u2 <= 0 ? 'precision' : 'reject' };
  }
  const value = n, e = poissonLargeExponent(mean, value);
  if (Math.abs(e.exponent + 30) <= e.error) return { kind: 'precision' };
  if (e.exponent < -30) return { kind: 'candidate', value, decide: u2 => u2 <= 0 ? 'accept' : 'reject' };// threshold 0 (0x55f2b5)
  const threshold = 0.9 * yy * Math.exp(e.exponent);
  if (!Number.isFinite(threshold)) throw new AcquisitionError('overflow');
  // Relative threshold error: exponent (web + VIREO), Exp (Math.exp ≤ 2 ulp; VIREO 0x40368c 64·UX), (1+y²), 0.9 and products.
  const relative = e.error + 2 * ULP + 64 * UX + 2 * ay * (dyWeb + dyVireo) / yy + NINE_TENTHS_RELATIVE + 4 * UD + 4 * UX;
  const margin = threshold * relative * 2;
  return { kind: 'candidate', value, decide: u2 => Math.abs(u2 - threshold) <= margin ? 'precision' : u2 <= threshold ? 'accept' : 'reject' };
}
function largeMeanDraw(mean: number, uniform: () => number, state: () => Readonly<{ seed: number; draws: number }>): PoissonDraw {
  for (;;) {
    const angleUniform = uniform();
    if (angleUniform === 0.5) throw new AcquisitionError('precision');
    const proposal = poissonLargeProposal(mean, angleUniform);
    if (proposal.kind === 'precision') throw new AcquisitionError('precision');
    if (proposal.kind === 'negative') continue;
    const decision = proposal.decide(uniform());
    if (decision === 'precision') throw new AcquisitionError('precision');
    if (decision === 'accept') return { value: proposal.value!, ...state() };
  }
}
