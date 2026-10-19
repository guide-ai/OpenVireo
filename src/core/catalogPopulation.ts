import { roundNearestEven } from './numericPolicy';

/** Bounded predicates/stages recovered from VIREO, not a complete catalog
 * loader or a population-completeness attestation. No preview cutoff/default
 * field, missing record, image, source spectrum or acquisition is synthesized. */
export class CatalogPopulationError extends Error {
  constructor(readonly code: 'region' | 'record' | 'mode' | 'level' | 'range') {
    super(`Native catalog population contract: ${code}`); this.name = 'CatalogPopulationError';
  }
}
export type NativeCatalogRegion = Readonly<{
  minimumRa: number; maximumRa: number; minimumDec: number; maximumDec: number; limitingMagnitude: number;
}>;
export type NativeCatalogPosition = Readonly<{ ra: number; dec: number; magnitude: number }>;
function singleMagnitude(value: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new CatalogPopulationError('record');
  return Math.fround(value);
}
function int32(value: number): boolean { return Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff; }

/** 0x599e08..0x599f18, called by both 27-byte GSC readers. RA/Dec are
 * already stored Double; record/limit magnitudes are stored Single. Bounds
 * are inclusive. Equal RA endpoints take the wrapped OR branch (all RA),
 * not a zero-width field. Quality flags/type are not read by this predicate.
 * Caller supplies the actual rectangle; construction/region enumeration,
 * IO ordering and later QSO/variable/galaxy reconciliation are separate. */
export function nativeCatalogAdmission(record: NativeCatalogPosition, region: NativeCatalogRegion): boolean {
  if (!region || ![region.minimumRa, region.maximumRa, region.minimumDec, region.maximumDec, region.limitingMagnitude].every(Number.isFinite) ||
      region.minimumRa < 0 || region.minimumRa > 24 || region.maximumRa < 0 || region.maximumRa > 24 ||
      region.minimumDec > region.maximumDec || !Number.isFinite(Math.fround(region.limitingMagnitude))) throw new CatalogPopulationError('region');
  if (!record || !Number.isFinite(record.ra) || record.ra < 0 || record.ra > 24 || !Number.isFinite(record.dec) || Math.abs(record.dec) > 90) throw new CatalogPopulationError('record');
  const magnitude = singleMagnitude(record.magnitude);
  const raInside = region.minimumRa < region.maximumRa
    ? record.ra >= region.minimumRa && record.ra <= region.maximumRa
    : record.ra >= region.minimumRa || record.ra <= region.maximumRa;
  return raInside && record.dec >= region.minimumDec && record.dec <= region.maximumDec && magnitude <= Math.fround(region.limitingMagnitude);
}

/** 0x597d9e..0x597e1b modifies a COPY of the rectangle, then passes it
 * through VMT+0xc to the GALAXY loader. It does not alter the preceding
 * stellar reader's limit. Mode0 caps galaxy limit at12; mode1 floors it at16.
 * Native FSCFieldObj initializes mode0; NewGSCFieldObj retains mode1.
 * No fallback/default mode is chosen for an unknown edition or caller. */
export function galaxyLoadMagnitudeLimit(mode: 0 | 1, requestedLimit: number): number {
  if (mode !== 0 && mode !== 1) throw new CatalogPopulationError('mode');
  const limit = singleMagnitude(requestedLimit);
  return mode === 0 ? Math.min(limit, 12) : Math.max(limit, 16);
}

/** 0x594908 converts magnitude, subtracts bank offset and clamps below0;
 * 0x53cae0 sign-extends AL into cached record+0x57. Bank state must be
 * explicit: telescope parameter setup0x53c5cf uses offset+1/flag0 BEFORE
 * projecting records; compositor0x53b712 later sets offset-2/flag0 without
 * recomputing those cached levels. Do not infer a universal offset-2 rule.
 * Nearest-even is the adapter policy, not a measured original x87 CW.
 */
export function nativeStoredStellarLevel(magnitude: number, bankOffset: number, conversion: 'round' | 'truncate'): number {
  if (!int32(bankOffset) || (conversion !== 'round' && conversion !== 'truncate')) throw new CatalogPopulationError('level');
  const single = singleMagnitude(magnitude);
  const converted = conversion === 'round' ? roundNearestEven(single) : Math.trunc(single);
  if (!int32(converted) || !int32(converted - bankOffset)) throw new CatalogPopulationError('range');
  const stored = Math.max(0, converted - bankOffset);
  // Do not silently simulate a wrapped signed-byte magnitude as a physical
  // brightness. This new guard bounds the adapter before the native AL store.
  if (stored > 127) throw new CatalogPopulationError('range');
  return stored;
}
/** 0x53b748..0x53b77c: painted types0/2/3, CACHED record+0x57 minus
 * explicit observatory+0x6f8, clamp0..14. Do not recalculate magnitude from
 * the current bank here or discard a faint admitted object. Selection's
 * unfiltered first collection and per-pixel painter thresholds are separate.
 */
export function nativeStellarPaintLevel(type: number, storedLevel: number, magnitudeShift: number): number | null {
  if (!Number.isInteger(type) || type < 0 || type > 255 || !int32(magnitudeShift) || !int32(storedLevel)) throw new CatalogPopulationError('level');
  if (type !== 0 && type !== 2 && type !== 3) return null;
  if (!int32(storedLevel - magnitudeShift)) throw new CatalogPopulationError('range');
  return Math.max(0, Math.min(14, storedLevel - magnitudeShift));
}
