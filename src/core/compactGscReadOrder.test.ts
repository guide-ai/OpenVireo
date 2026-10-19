import { describe, expect, it } from 'vitest';
import vectors from '../../data/hubble/compact-gsc-read-order-vectors.json';
import { traceCompactGscBandRead, CompactBandReadOrderError } from './compactGscReadOrder';
import { nativeCatalogAdmission } from './catalogPopulation';
import { nearestCatalogObject } from './objectSelection';
import { project } from './sky';

type Fixture = typeof vectors.cases[number];
function bandSource(fixture: Fixture) {
  const rows = new Map(fixture.records.map(row => [row.recordIndex, row]));
  return { recordCount: vectors.band.recordCount, readPackedRa(index: number): number {
    const row = rows.get(index);
    if (!row) throw new Error(`Unexpected access outside the original-record trace fixture: ${index}`);
    return row.packedRa;
  } };
}
function trace(fixture: Fixture) {
  return traceCompactGscBandRead(bandSource(fixture), fixture.roundedMinimumRaKey, fixture.maximumRa, fixture.maximumScanRecords);
}
function admittedRows(fixture: Fixture) {
  const rows = new Map(fixture.records.map(row => [row.recordIndex, row]));
  return trace(fixture).visits.map(visit => rows.get(visit.recordIndex)!).filter(row => nativeCatalogAdmission({
    ra: row.storedRa, dec: row.storedDec, magnitude: row.storedMagnitude,
  }, fixture.region));
}

describe('single NewGSC compact-band read traces, not complete field populations', () => {
  it('matches independent integer/Fraction traces from the original whole-band record count', () => {
    expect(vectors.band.recordCount).toBe(1165987);
    expect(vectors.band.sha256).toBe('a1394a80eea5aca3ef765e841883ef75de94e96aea972d7ed3e68787d23bb36a');
    for (const fixture of vectors.cases) {
      if (fixture.expectedError) {
        expect(() => trace(fixture)).toThrow(expect.objectContaining(fixture.expectedError)); continue;
      }
      const result = trace(fixture);
      expect(result.scope).toBe('single-compact-band-read-trace');
      expect(result.probes).toEqual(fixture.expectedProbes);
      expect(result.searchIndex).toBe(fixture.expectedSearchIndex);
      expect(result.exactKeyMatch).toBe(fixture.expectedExactKeyMatch);
      expect(result.visits).toEqual(fixture.expectedVisits);
      expect(result.stopReason).toBe(fixture.expectedStopReason);
      expect(admittedRows(fixture).map(row => row.recordIndex)).toEqual(fixture.expectedAdmittedIndices);
    }
  });
  it('preserves an exact-key midpoint inside a duplicate group instead of rewinding to lower_bound', () => {
    const before = vectors.cases.find(row => row.label === 'before-identical-pair')!;
    const boundary = vectors.cases.find(row => row.label === 'at-identical-pair')!;
    expect(admittedRows(before).map(row => row.recordIndex)).toEqual([43828, 43829]);
    expect(trace(boundary).searchIndex).toBe(43829);
    expect(boundary.comparisonLowerBoundIndex).toBe(43828);
    expect(admittedRows(boundary).map(row => row.recordIndex)).toEqual([43829]);
    expect(boundary.comparisonIntervalIndices).toEqual([43828, 43829]);
    expect(boundary.records.find(row => row.recordIndex === 43828)?.recordSHA256)
      .not.toBe(boundary.records.find(row => row.recordIndex === 43829)?.recordSHA256);
  });
  it('keeps original scan order observable in a conditional nearest-candidate tie', () => {
    const before = vectors.cases.find(row => row.label === 'before-identical-pair')!;
    const boundary = vectors.cases.find(row => row.label === 'at-identical-pair')!;
    const rows = admittedRows(before);
    expect(rows[0].storedRa).toBe(rows[1].storedRa); expect(rows[0].storedDec).toBe(rows[1].storedDec);
    const center = { ra: rows[0].storedRa, dec: rows[0].storedDec };
    // Explicit synthetic native-sized query frame; no completeness attestation,
    // navigation sample or claim about the final post-merge slit winner.
    const projected = rows.map(row => ({ id: row.rowReference,
      ...project({ ra: row.storedRa, dec: row.storedDec }, center, .25, 312) }));
    expect(projected.every(point => point.x === 156 && point.y === 156)).toBe(true);
    expect(nearestCatalogObject(projected, 156, 156)?.object.id).toBe('N0000.DAT@43828');
    expect(nearestCatalogObject([...projected].reverse(), 156, 156)?.object.id).toBe('N0000.DAT@43829');
    const boundaryIds = new Set(admittedRows(boundary).map(row => row.rowReference));
    expect(nearestCatalogObject(projected.filter(row => boundaryIds.has(row.id)), 156, 156)?.object.id).toBe('N0000.DAT@43829');
  });
  it('visits the last midpoint below the minimum and processes the first row above the upper bound', () => {
    const fixture = vectors.cases.find(row => row.label === 'inexact-start-below-minimum')!;
    expect(trace(fixture).visits.map(row => row.recordIndex)).toEqual([39195, 39196, 39197, 39198]);
    expect(admittedRows(fixture).map(row => row.recordIndex)).toEqual([39196, 39197]);
    const source = { recordCount: 3, readPackedRa: (index: number) => [10, 20, 30][index] };
    const result = traceCompactGscBandRead(source, 11, 20 / 1e7, 3);
    expect(result.searchIndex).toBe(0);
    expect(result.visits.map(row => row.packedRa)).toEqual([10, 20, 30]);
    expect(result.stopReason).toBe('past-upper-ra');
  });
  it('distinguishes last-record EOF from a search that attempts index FileSize', () => {
    const last = vectors.cases.find(row => row.label === 'last-record-eof')!;
    expect(trace(last).visits).toHaveLength(1); expect(trace(last).stopReason).toBe('band-eof');
    const source = { recordCount: 3, readPackedRa: (index: number) => [10, 20, 30][index] };
    expect(() => traceCompactGscBandRead(source, 31, 24, 3)).toThrow(expect.objectContaining({
      code: 'read-boundary', phase: 'search', recordIndex: 3,
    }));
    expect(() => traceCompactGscBandRead({ recordCount: 0, readPackedRa: () => 0 }, 0, 1, 1)).toThrow(/read-boundary/);
  });
  it('rejects incomplete traces on budget or input failure and owns the returned arrays', () => {
    const fixture = vectors.cases[0], result = trace(fixture);
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.visits)).toBe(true);
    expect(Object.isFrozen(result.visits[0])).toBe(true);
    expect(() => traceCompactGscBandRead(bandSource(fixture), fixture.roundedMinimumRaKey, fixture.maximumRa, 1)).toThrow(/budget/);
    expect(() => traceCompactGscBandRead(bandSource(fixture), 1.5, 1, 10)).toThrow(/key/);
    expect(() => traceCompactGscBandRead(bandSource(fixture), 1, NaN, 10)).toThrow(/maximum/);
    expect(() => traceCompactGscBandRead({ recordCount: 1, readPackedRa: () => NaN }, 1, 1, 1)).toThrow(CompactBandReadOrderError);
  });
});
