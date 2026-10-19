import { describe, expect, it } from 'vitest';
import vectors from '../../data/hubble/catalog-population-vectors.json';
import { nativeCatalogAdmission, galaxyLoadMagnitudeLimit, nativeStoredStellarLevel, nativeStellarPaintLevel, CatalogPopulationError } from './catalogPopulation';
import { createNativeSelectionScene, selectCatalogObject } from './objectSelection';

describe('bounded native population stages, not a complete scene loader', () => {
  it('checks inclusive, wrapped, equal-endpoint and Single-magnitude predicate vectors', () => {
    for (const row of vectors.admission) expect(nativeCatalogAdmission(row.record, row.region)).toBe(row.admitted);
    const region = { minimumRa: 10, maximumRa: 12, minimumDec: -1, maximumDec: 1, limitingMagnitude: 20 };
    expect(nativeCatalogAdmission({ ra: 10, dec: -1, magnitude: 20.0000001 }, region)).toBe(true);
    expect(nativeCatalogAdmission({ ra: 12, dec: 1, magnitude: 20.00001 }, region)).toBe(false);
    // Equal RA endpoints mean OR/all-RA in this predicate, not necessarily in
    // the reader's independent seek/enumeration stage, which is not ported here.
    expect(nativeCatalogAdmission({ ra: 11, dec: 0, magnitude: 19 }, { ...region, minimumRa: 5, maximumRa: 5 })).toBe(true);
  });
  it('keeps original decoded samples independent of quality-bit selection', () => {
    expect(vectors.originalSamples).toHaveLength(16);
    expect(new Set(vectors.originalSamples.map(row => row.flags)).size).toBeGreaterThan(1);
    for (const row of vectors.originalSamples) expect(nativeCatalogAdmission(row.record, row.region)).toBe(row.admitted);
    // These are hash-bound decoded catalog samples, not native rendered pixels.
    expect(vectors.originalSamples.some(row => row.flags === 240 && row.admitted)).toBe(true);
    expect(vectors.originalSamples.some(row => row.flags === 15 && row.admitted)).toBe(true);
  });
  it('keeps the copied galaxy-limit adjustment separate from GSC admission', () => {
    for (const row of vectors.galaxyLimits) expect(galaxyLoadMagnitudeLimit(row.mode as 0 | 1, row.requestedLimit)).toBe(row.limit);
    const region = { minimumRa: 0, maximumRa: 24, minimumDec: -8, maximumDec: 8, limitingMagnitude: 20 };
    expect(galaxyLoadMagnitudeLimit(0, region.limitingMagnitude)).toBe(12);
    expect(nativeCatalogAdmission({ ra: 1, dec: 1, magnitude: 19 }, region)).toBe(true);
    expect(region.limitingMagnitude).toBe(20);
  });
  it('keeps magnitude conversion state separate from cached-level painting', () => {
    for (const row of vectors.levels) expect(nativeStoredStellarLevel(row.magnitude, row.bankOffset, row.conversion as 'round' | 'truncate')).toBe(row.storedLevel);
    for (const row of vectors.paint) expect(nativeStellarPaintLevel(row.type, row.storedLevel, row.magnitudeShift)).toBe(row.level);
    for (let type = 0; type < 256; type++) expect(nativeStellarPaintLevel(type, 12, 3)).toBe([0, 2, 3].includes(type) ? 9 : null);
    expect(nativeStoredStellarLevel(8.4999999, 1, 'round')).toBe(7); // Single8.5 -> nearest-even8, minus1.
    const cached = nativeStoredStellarLevel(9.5, 1, 'round');
    expect(cached).toBe(9);
    expect(nativeStoredStellarLevel(9.5, -2, 'round')).toBe(12);
    expect(nativeStellarPaintLevel(0, cached, 0)).toBe(9); // A later bank reset must not replace record+0x57.
    expect(nativeStellarPaintLevel(3, 99, 0)).toBe(14); // Faint is clamped, not discarded.
  });
  it('shows why a faint admitted source cannot be removed before native nearest selection', () => {
    const region = { minimumRa: 0, maximumRa: 24, minimumDec: -1, maximumDec: 1, limitingMagnitude: 20 };
    const faint = { id: 'synthetic-faint', ra: 12, dec: 0, magnitude: 15.5 };
    const bright = { id: 'synthetic-bright', ra: 12.0001, dec: 0, magnitude: 5 };
    const admitted = [bright, faint].filter(row => nativeCatalogAdmission(row, region));
    expect(admitted).toHaveLength(2); expect(nativeStellarPaintLevel(0, nativeStoredStellarLevel(faint.magnitude, 1, 'round'), 0)).toBe(14);
    const scene = createNativeSelectionScene(admitted, [], { width: 312, height: 312, fieldDegrees: .25,
      center: { ra: 12, dec: 0 }, population: { coverage: 'complete', provenance: 'Complete synthetic two-record scenario only; not original catalog completeness' } });
    const selected = selectCatalogObject(scene, 156, 156);
    expect(selected.kind).toBe('star');
    if (selected.kind === 'star') expect(selected.object.id).toBe(faint.id);
  });
  it('rejects unsupported domains instead of inventing a native population or byte-wrap brightness', () => {
    const region = { minimumRa: 0, maximumRa: 24, minimumDec: -1, maximumDec: 1, limitingMagnitude: 20 };
    expect(() => nativeCatalogAdmission({ ra: NaN, dec: 0, magnitude: 1 }, region)).toThrow(CatalogPopulationError);
    expect(() => nativeCatalogAdmission({ ra: 12, dec: 0, magnitude: Infinity }, region)).toThrow();
    expect(() => nativeCatalogAdmission({ ra: 12, dec: 0, magnitude: 1 }, { ...region, minimumDec: 2 })).toThrow();
    expect(() => galaxyLoadMagnitudeLimit(2 as 0, 20)).toThrow();
    expect(() => nativeStoredStellarLevel(126, -2, 'round')).toThrow(/range/);
    expect(() => nativeStellarPaintLevel(0, 0, -0x80000000)).toThrow(/range/);
    expect(() => nativeStellarPaintLevel(256, 1, 0)).toThrow(/level/);
  });
});
