import type {PhotometerState} from './photometer';

/** Prefix of tiled photometer target ids (Front G G3b): `gsc:<ra>,<dec>`. Kept here, dependency-free, so the E04 summary does
 * not pull the photometer field modules into the main bundle. */
export const TILED_PHOTOMETER_PREFIX='gsc:';
/** G3 review 1 L3 (web rule [W]): an object reading counts toward the Pleiades exercise only when it was reduced with a sky
 * reading taken at a bundled Pleiades field. VIREO keeps one sky per filter and telescope wherever it was read, so the reading
 * itself stays valid here; only E04's count and its cluster points leave out skies taken at a tiled telescope pointing.
 * Front T6 (web rule [W]): nor do they take an object or sky reading measured with instructor parameters (typed
 * uncertified-parameter: the pinned Pleiades fields and their witnesses hold for the compiled values only). */
export function pleiadesSkyContext(s:Pick<PhotometerState,'readings'>,r:PhotometerState['readings'][number]):boolean{
 const sky=r.skyReadingId===null?undefined:s.readings.find(x=>x.id===r.skyReadingId);
 return !!sky&&!sky.fieldTargetId.startsWith(TILED_PHOTOMETER_PREFIX)&&!r.parameters&&!sky.parameters;
}
