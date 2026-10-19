import { describe, expect, it } from 'vitest';
import vectors from '../../data/hubble/recovered-contract-composition-vectors.json';
import compact from '../../data/hubble/compact-gsc-read-order-vectors.json';
import { nativeStoredStellarLevel, nativeStellarPaintLevel, nativeCatalogAdmission } from './catalogPopulation';
import { prepareNativeStarProfiles } from './starProfiles';
import { paintNativeStar } from './detectorRaster';
import { slitPixelLevel } from './photons';
import { traceCompactGscBandRead } from './compactGscReadOrder';

const originals = new Map(compact.cases.flatMap(fixture => fixture.records).map(row => [row.recordIndex, row]));
const source = { recordCount: compact.band.recordCount, readPackedRa(index: number): number {
  const row = originals.get(index);
  if (!row) throw new Error(`Missing original-record diagnostic witness: ${index}`);
  return row.packedRa;
} };
function admitted(indices: readonly number[], minimumRa: number, maximumRa: number): number[] {
  return indices.filter(index => {
    const row = originals.get(index)!;
    return nativeCatalogAdmission({ ra: row.storedRa, dec: row.storedDec, magnitude: row.storedMagnitude }, {
      minimumRa, maximumRa, minimumDec: vectors.compact.minimumDec, maximumDec: vectors.compact.maximumDec,
      limitingMagnitude: vectors.compact.limitingMagnitude,
    });
  });
}

describe('recovered contract composition, bounded diagnostics only', () => {
  it('uses the cached configuration-stage level when selecting a prepared profile for painting', () => {
    const v = vectors.star;
    const cached = nativeStoredStellarLevel(v.magnitude, v.conversionOffset, 'round');
    expect(cached).toBe(v.cachedLevel);
    const profiles = prepareNativeStarProfiles(); // Later table construction does not replace record+0x57.
    const level = nativeStellarPaintLevel(0, cached, v.magnitudeShift)!;
    const recomputed = nativeStoredStellarLevel(v.magnitude, v.drawingOffset, 'round');
    expect(recomputed).toBe(v.recomputedLevel); expect(level).not.toBe(recomputed);
    const black = { width: 100, height: 100, rgb: new Uint8Array(100 * 100 * 3) };
    expect(slitPixelLevel(paintNativeStar(black, profiles.levels[level], { x: 50, y: 50 }))).toBe(v.correctSlitLevel);
    expect(slitPixelLevel(paintNativeStar(black, profiles.levels[recomputed], { x: 50, y: 50 }))).toBe(v.recomputedSlitLevel);
    expect(black.rgb.every(value => value === 0)).toBe(true);
  });
  it('admits both original duplicate rows on an inclusive maximum and rejects the later visited row', () => {
    const v = vectors.compact;
    const trace = traceCompactGscBandRead(source, v.normalRoundedKey, v.maximumRa, 100);
    const visits = trace.visits.map(row => row.recordIndex);
    expect(visits).toEqual(v.normalVisits);
    expect(trace.stopReason).toBe('past-upper-ra');
    expect(originals.get(visits.at(-1)!)!.storedRa).toBeGreaterThan(v.maximumRa);
    expect(admitted(visits, v.normalMinimumRa, v.maximumRa)).toEqual(v.normalAdmitted);
  });
  it('preserves the equal-RA predicate branch even for a row visited beyond the scan maximum', () => {
    const v = vectors.compact;
    const trace = traceCompactGscBandRead(source, v.equalRoundedKey, v.maximumRa, 100);
    const visits = trace.visits.map(row => row.recordIndex);
    expect(visits).toEqual(v.equalVisits);
    expect(originals.get(visits.at(-1)!)!.storedRa).toBeGreaterThan(v.maximumRa);
    // 0x599e08 takes RA>=min OR RA<=max when min==max. The reader tests
    // admission before stop. A second "helpful" clipping pass would change it.
    expect(admitted(visits, v.equalMinimumRa, v.maximumRa)).toEqual(v.equalAdmitted);
    expect(trace.scope).toBe('single-compact-band-read-trace'); // No complete-population status.
  });
});
