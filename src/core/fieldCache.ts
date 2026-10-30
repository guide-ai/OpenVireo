/** VIREO's cached-field reload rule (Front G G2 review 1 M2). The sky render keeps the loaded field while the 312-pixel viewport's
 * crop origin stays strictly inside the cached field, (0, (n−1)·312) on both axes with n = 3 (0x53af28; the render calls the
 * field load 0x53be70 only when this fails, the scale changed or a reload is forced, analysis/observatory/dossiers/sky-render.txt).
 * At load the origin is (n−1)·312/2 = 312, so the field is kept while the pointing's pixel offset from the loaded centre is
 * under 312 px (0.25° of the 0.75° field). The offset uses the web projection (hourDifference × 15 × cos Dec, rounded) [W]; the
 * native rounding of the crop origin is not reproduced at the exact boundary. */
import {hourDifference,type Pointing} from './sky';
export const FIELD_CACHE=Object.freeze({cached:936,viewport:312,multiplier:3,fieldDegrees:.75});
export function nativeFieldCacheHolds(loaded:Pointing,now:Pointing):boolean{
 if(![loaded?.ra,loaded?.dec,now?.ra,now?.dec].every(Number.isFinite))return false;
 const perDegree=FIELD_CACHE.cached/FIELD_CACHE.fieldDegrees,half=(FIELD_CACHE.multiplier-1)*FIELD_CACHE.viewport/2;
 const dx=Math.round(-hourDifference(loaded.ra,now.ra)*15*Math.cos(now.dec*Math.PI/180)*perDegree),dy=Math.round((now.dec-loaded.dec)*perDegree);
 const x=half+dx,y=half+dy,limit=(FIELD_CACHE.multiplier-1)*FIELD_CACHE.viewport;
 return x>0&&x<limit&&y>0&&y<limit;
}
