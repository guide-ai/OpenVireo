/** One NewGSCFieldObj compact-band read trace, not a field-population loader.
 * The caller supplies access to the untruncated band and the already rounded
 * native RA key. No filename, source completeness, x87 rounding mode, region
 * enumeration, decoded object, merge or acquisition status is inferred. */
export type CompactBandRaSource = Readonly<{
  recordCount: number;
  readPackedRa: (recordIndex: number) => number;
}>;
export type CompactBandRaRead = Readonly<{ recordIndex: number; packedRa: number }>;
export class CompactBandReadOrderError extends Error {
  constructor(readonly code: 'source' | 'key' | 'maximum' | 'budget' | 'read-boundary',
    readonly phase?: 'search' | 'scan', readonly recordIndex?: number) {
    super(`Compact GSC band read trace: ${code}`); this.name = 'CompactBandReadOrderError';
  }
}
export type CompactBandReadTrace = Readonly<{
  scope: 'single-compact-band-read-trace';
  sourceRecordCount: number;
  roundedMinimumRaKey: number;
  searchIndex: number;
  exactKeyMatch: boolean;
  probes: readonly CompactBandRaRead[];
  visits: readonly CompactBandRaRead[];
  stopReason: 'past-upper-ra' | 'band-eof';
}>;

/** 0x59af80..0x59b026 starts low=0, HIGH=FileSize(record count), not N-1.
 * It stops on the first equal midpoint, or low>high, then seeks the LAST
 * midpoint again. It is not a lower_bound and does not rewind equal keys.
 * 0x59b030..0x59b1f7 processes each row before testing DoubleRA>max or EOF,
 * so visits includes the first row beyond the maximum. Admission0x599e08
 * is a separate stage, as are list insertion and all later catalog merges.
 * Input RA order/stability are caller prerequisites. Explicit budgets and
 * read-boundary errors are adapter guards; no truncated trace is returned.
 */
export function traceCompactGscBandRead(source: CompactBandRaSource, roundedMinimumRaKey: number,
  maximumRa: number, maximumScanRecords: number): CompactBandReadTrace {
  if (!source || !Number.isInteger(source.recordCount) || source.recordCount < 0 || source.recordCount > 0x3fff_ffff ||
      typeof source.readPackedRa !== 'function') throw new CompactBandReadOrderError('source');
  if (!Number.isInteger(roundedMinimumRaKey) || roundedMinimumRaKey < 0 || roundedMinimumRaKey > 240_000_000) throw new CompactBandReadOrderError('key');
  if (!Number.isFinite(maximumRa) || maximumRa < 0 || maximumRa > 24) throw new CompactBandReadOrderError('maximum');
  if (!Number.isInteger(maximumScanRecords) || maximumScanRecords < 1 || maximumScanRecords > 10_000_000) throw new CompactBandReadOrderError('budget');
  function read(recordIndex: number, phase: 'search' | 'scan'): CompactBandRaRead {
    if (recordIndex < 0 || recordIndex >= source.recordCount) throw new CompactBandReadOrderError('read-boundary', phase, recordIndex);
    const packedRa = source.readPackedRa(recordIndex);
    if (!Number.isInteger(packedRa) || packedRa < 0 || packedRa > 240_000_000) throw new CompactBandReadOrderError('source', phase, recordIndex);
    return Object.freeze({ recordIndex, packedRa });
  }
  const probes: CompactBandRaRead[] = [], visits: CompactBandRaRead[] = [];
  let low = 0, high = source.recordCount, midpoint: number, exactKeyMatch: boolean;
  for (;;) {
    // The bounded source count keeps the native signed sum in range; positive
    // SAR/correction is floor here. Exceptional signed overflow is not ported.
    midpoint = Math.floor((low + high) / 2);
    const row = read(midpoint, 'search'); probes.push(row);
    exactKeyMatch = row.packedRa === roundedMinimumRaKey;
    if (!exactKeyMatch) {
      if (row.packedRa > roundedMinimumRaKey) high = midpoint - 1;
      else low = midpoint + 1;
    }
    if (exactKeyMatch || low > high) break;
  }
  let index = midpoint, stopReason: 'past-upper-ra' | 'band-eof';
  for (;;) {
    if (visits.length >= maximumScanRecords) throw new CompactBandReadOrderError('budget', 'scan', index);
    const row = read(index, 'scan'); visits.push(row);
    if (row.packedRa / 10_000_000 > maximumRa) { stopReason = 'past-upper-ra'; break; }
    if (index + 1 >= source.recordCount) { stopReason = 'band-eof'; break; }
    index++;
  }
  return Object.freeze({ scope: 'single-compact-band-read-trace' as const, sourceRecordCount: source.recordCount,
    roundedMinimumRaKey, searchIndex: midpoint, exactKeyMatch,
    probes: Object.freeze(probes), visits: Object.freeze(visits), stopReason });
}
