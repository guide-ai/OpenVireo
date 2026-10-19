import { describe, expect, it } from 'vitest';
import vectors from '../../data/hubble/hubble-distance-vectors.json';
import composition from '../../data/hubble/recovered-contract-composition-vectors.json';
import { distanceFromMagnitude, meanIndividualHubble, fitHubbleThroughOrigin, HubbleDistanceError } from './hubbleDistance';

const close = (actual: number, expected: string) => expect(Math.abs(actual - Number(expected)) / Math.max(1, Math.abs(Number(expected)))).toBeLessThan(2e-14);
describe('explicit original workbook/manual Hubble recipes, no native-run oracle', () => {
  it('rejects final-division underflow without rejecting true zero or signed cancellation', () => {
    const v = composition.resultUnderflow;
    expect(() => meanIndividualHubble([{ distanceMpc: 1, velocityKmS: v.meanSmallestPositiveInput },
      { distanceMpc: 1, velocityKmS: 0 }])).toThrow(/range/);
    expect(() => fitHubbleThroughOrigin([{ distanceMpc: v.fitDistanceMpc, velocityKmS: v.fitVelocityKmS }])).toThrow(/range/);
    expect(meanIndividualHubble([{ distanceMpc: 1, velocityKmS: 0 }]).kmSPerMpc).toBe(0);
    expect(fitHubbleThroughOrigin([{ distanceMpc: 1, velocityKmS: 1 }, { distanceMpc: 1, velocityKmS: -1 }]).slopeKmSPerMpc).toBe(0);
  });
  it('checks pc/Mpc and distance-modulus calculations against Decimal90, with explicit absolute magnitude', () => {
    for (const vector of vectors.distances) {
      const result = distanceFromMagnitude(vector.apparentV, vector.assumedAbsoluteV);
      close(result.log10Parsecs, vector.log10Parsecs); close(result.parsecs, vector.parsecs);
      close(result.megaparsecs, vector.megaparsecs);
    }
    expect(distanceFromMagnitude(0, 0).parsecs).toBe(10);
    expect(distanceFromMagnitude(25, 0).megaparsecs).toBe(1);
    expect(distanceFromMagnitude(15, -21.4).megaparsecs).toBeGreaterThan(distanceFromMagnitude(15, -21).megaparsecs);
  });
  it('keeps the worksheet mean and manual origin-constrained fit distinct', () => {
    for (const vector of vectors.aggregates) {
      const mean = meanIndividualHubble(vector.points), fit = fitHubbleThroughOrigin(vector.points);
      close(mean.kmSPerMpc, vector.meanIndividualH); close(fit.slopeKmSPerMpc, vector.originSlope);
      expect(mean.method).toBe('worksheet-mean-individual');
      expect(fit.method).toBe('student-manual-origin-linear'); expect(fit.interceptKmS).toBe(0);
    }
    const points = [{ distanceMpc: 1, velocityKmS: 100 }, { distanceMpc: 10, velocityKmS: 500 }];
    expect(meanIndividualHubble(points).kmSPerMpc).toBe(75);
    expect(fitHubbleThroughOrigin(points).slopeKmSPerMpc).toBeCloseTo(5100 / 101, 13);
  });
  it('matches the shipped worksheet aggregate without forcing the result to71', () => {
    const fixture = vectors.worksheetAggregate;
    close(meanIndividualHubble(fixture.points).kmSPerMpc, fixture.meanIndividualH);
    close(fitHubbleThroughOrigin(fixture.points).slopeKmSPerMpc, fixture.originSlope);
    expect(meanIndividualHubble(fixture.points).kmSPerMpc).toBeGreaterThan(86);
  });
  it('rejects missing, invalid and unsupported numeric inputs atomically', () => {
    for (const value of [NaN, Infinity, -Infinity]) expect(() => distanceFromMagnitude(value, -21.4)).toThrow(HubbleDistanceError);
    expect(() => distanceFromMagnitude(15, NaN)).toThrow(HubbleDistanceError);
    for (const magnitude of [2000, -2000]) expect(() => distanceFromMagnitude(magnitude, 0)).toThrow(/range/);
    for (const calculate of [meanIndividualHubble, fitHubbleThroughOrigin]) {
      expect(() => calculate([])).toThrow(/empty/);
      expect(() => calculate(new Array(2))).toThrow(/point/);
      for (const distanceMpc of [0, -1, NaN, Infinity]) expect(() => calculate([{ distanceMpc, velocityKmS: 1 }])).toThrow(/point/);
      expect(() => calculate([{ distanceMpc: 1, velocityKmS: Infinity }])).toThrow(/point/);
    }
    expect(() => fitHubbleThroughOrigin([{ distanceMpc: Number.MAX_VALUE, velocityKmS: 1 }])).toThrow(/range/);
    const input = Object.freeze([Object.freeze({ distanceMpc: 1, velocityKmS: 100 })]);
    meanIndividualHubble(input); fitHubbleThroughOrigin(input); expect(input[0].velocityKmS).toBe(100);
  });
});
