/** VIREO's cached-field reload rule (Front G G2 review 1 M2). The sky render keeps the loaded field while the 312-pixel viewport's
 * crop origin stays strictly inside the cached field, (0, (n−1)·312) on both axes with n = 3 (0x53af28; the render calls the
 * field load 0x53be70 only when this fails, the scale changed or a reload is forced, analysis/observatory/dossiers/sky-render.txt).
 * At load the origin is (n−1)·312/2 = 312, so the field is kept while the pointing's pixel offset from the loaded centre is
 * under 312 px (0.25° of the 0.75° field). The offset uses the web projection (hourDifference × 15 × cos Dec, rounded) [W]; the
 * native rounding of the crop origin is not reproduced at the exact boundary. */
import {hourDifference,type Pointing} from './sky';
export type FieldCacheSpec=Readonly<{cached:number;viewport:number;multiplier:number;fieldDegrees:number}>;
export const FIELD_CACHE:FieldCacheSpec=Object.freeze({cached:936,viewport:312,multiplier:3,fieldDegrees:.75});
/** Front G5: the finder view's cache (0x53bae4/0x53b058): the same 3 × 312 px, for 3 × Finder Field 2.50° = 7.5°. */
export const FINDER_FIELD_CACHE:FieldCacheSpec=Object.freeze({...FIELD_CACHE,fieldDegrees:7.5});
export function nativeFieldCacheHolds(loaded:Pointing,now:Pointing,cache:FieldCacheSpec=FIELD_CACHE):boolean{
 if(![loaded?.ra,loaded?.dec,now?.ra,now?.dec].every(Number.isFinite))return false;
 const FIELD_CACHE=cache,perDegree=FIELD_CACHE.cached/FIELD_CACHE.fieldDegrees,half=(FIELD_CACHE.multiplier-1)*FIELD_CACHE.viewport/2;
 const dx=Math.round(-hourDifference(loaded.ra,now.ra)*15*Math.cos(now.dec*Math.PI/180)*perDegree),dy=Math.round((now.dec-loaded.dec)*perDegree);
 const x=half+dx,y=half+dy,limit=(FIELD_CACHE.multiplier-1)*FIELD_CACHE.viewport;
 return x>0&&x<limit&&y>0&&y<limit;
}
/** Front G5: the viewport crop of a cached field at the current pointing (0x53a40c's BitBlt from the 3W×3H cache): the current
 * pointing's position in the loaded raster (the same projection the raster was painted with, objectSelection.ts) minus half the
 * viewport, rounded [W: the native origin's x87 rounding is not reproduced]. Null when the cache no longer holds. */
export function nativeFieldCacheOrigin(loaded:Pointing,now:Pointing,cache:FieldCacheSpec=FIELD_CACHE):Readonly<{x:number;y:number}>|null{
 if(!nativeFieldCacheHolds(loaded,now,cache))return null;
 const perDegree=cache.cached/cache.fieldDegrees,centre=cache.cached/2,half=cache.viewport/2;
 return Object.freeze({x:Math.round(centre+hourDifference(loaded.ra,now.ra)*15*Math.cos(now.dec*Math.PI/180)*perDegree-half),y:Math.round(centre+(loaded.dec-now.dec)*perDegree-half)});
}
