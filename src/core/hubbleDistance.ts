/** Source contracts differ: the shipped Hubble Data.xls computes distance and
 * mean(v/D), while the 2008 student manual requests a linear trend through0.
 * This Number adapter implements those explicitly separate recipes. No native
 * VIREO regression, original Excel arithmetic or x87 equivalence is claimed.
 */
export class HubbleDistanceError extends Error {
  constructor(readonly code: 'magnitude' | 'point' | 'empty' | 'range') {
    super(`Hubble distance/summary contract: ${code}`);
    this.name = 'HubbleDistanceError';
  }
}
export type MagnitudeDistance = Readonly<{
  distanceModulus: number; log10Parsecs: number; parsecs: number; megaparsecs: number;
}>;
/** XLS Sheet1!F2/G2: log10(pc)=(apparentV-assumedAbsoluteV+5)/5;
 * Mpc=POWER(10,log10(pc))/1000000. No absolute-magnitude default is inferred:
 * workbookJ2=-21.0, VIREO manual=-21.4, standalone manual=-22.0.
 * Supply APPARENT V, never the detector's corrected surface-brightness input.
 * No catalog lookup, redshift-derived distance or luminosity model is added.
 */
export function distanceFromMagnitude(apparentV: number, assumedAbsoluteV: number): MagnitudeDistance {
  if (!Number.isFinite(apparentV) || !Number.isFinite(assumedAbsoluteV)) throw new HubbleDistanceError('magnitude');
  const distanceModulus = apparentV - assumedAbsoluteV;
  const log10Parsecs = (distanceModulus + 5) / 5;
  const parsecs = Math.pow(10, log10Parsecs), megaparsecs = parsecs / 1_000_000;
  if (!Number.isFinite(log10Parsecs) || !Number.isFinite(parsecs) || !Number.isFinite(megaparsecs) ||
      parsecs <= 0 || megaparsecs <= 0) throw new HubbleDistanceError('range');
  return Object.freeze({ distanceModulus, log10Parsecs, parsecs, megaparsecs });
}
export type HubblePoint = Readonly<{ distanceMpc: number; velocityKmS: number }>;
function checkedPoints(points: readonly HubblePoint[]): void {
  if (!Array.isArray(points)) throw new HubbleDistanceError('point');
  if (!points.length) throw new HubbleDistanceError('empty');
  for (const point of points) {
    if (!point || typeof point !== 'object' || !Number.isFinite(point.distanceMpc) ||
        point.distanceMpc <= 0 || !Number.isFinite(point.velocityKmS)) throw new HubbleDistanceError('point');
  }
}
/** XLS H2:H14=v/D and H16=AVERAGE(H2:H14). No row is filtered, weighted or
 * converted from a template spectrum into an observation. Velocities are
 * supplied explicitly, preserving the caller's chosen storage boundaries.
 */
export function meanIndividualHubble(points: readonly HubblePoint[]): Readonly<{
  method: 'worksheet-mean-individual'; kmSPerMpc: number; count: number;
}> {
  checkedPoints(points);
  let sum = 0;
  for (const point of points) {
    const ratio = point.velocityKmS / point.distanceMpc;
    if (!Number.isFinite(ratio) || (point.velocityKmS !== 0 && ratio === 0)) throw new HubbleDistanceError('range');
    sum += ratio;
    if (!Number.isFinite(sum)) throw new HubbleDistanceError('range');
  }
  const kmSPerMpc = sum / points.length;
  // New adapter guard: do not report a nonzero accumulated value as zero
  // merely because the final Number division underflows.
  if (sum !== 0 && kmSPerMpc === 0) throw new HubbleDistanceError('range');
  return Object.freeze({ method: 'worksheet-mean-individual' as const, kmSPerMpc, count: points.length });
}
/** Student manual2008 p12: XY scatter(distanceMpc,velocityKmS), Linear,
 * intercept explicitly0. The unweighted least-squares slope sum(x*y)/sum(x*x)
 * is a mathematical implementation of that prescription, NOT recovered
 * VIREO machine code. It is distinct from the shipped workbook's mean(v/D).
 * Original Excel summation, formatting, R² and uncertainty are not ported.
 */
export function fitHubbleThroughOrigin(points: readonly HubblePoint[]): Readonly<{
  method: 'student-manual-origin-linear'; slopeKmSPerMpc: number; interceptKmS: 0; count: number;
}> {
  checkedPoints(points);
  let cross = 0, square = 0;
  for (const point of points) {
    const product = point.distanceMpc * point.velocityKmS, squared = point.distanceMpc * point.distanceMpc;
    if (!Number.isFinite(product) || !Number.isFinite(squared) || squared === 0 ||
        (point.velocityKmS !== 0 && product === 0)) throw new HubbleDistanceError('range');
    cross += product; square += squared;
    if (!Number.isFinite(cross) || !Number.isFinite(square)) throw new HubbleDistanceError('range');
  }
  const slopeKmSPerMpc = cross / square;
  if (!Number.isFinite(slopeKmSPerMpc) || (cross !== 0 && slopeKmSPerMpc === 0)) throw new HubbleDistanceError('range');
  return Object.freeze({ method: 'student-manual-origin-linear' as const, slopeKmSPerMpc, interceptKmS: 0 as const, count: points.length });
}
