import {roundNearestEven} from './numericPolicy';
import type {NativeRectangle} from './detectorRaster';
/** Recovered cached-pan branch of the telescope view (CLEA_VEO.exe 781bc970…c54c; corbor-cached-provenance.json):
 * - cache initializer 0x53c198/anchor writer 0x53c1c3..0x53c236: anchor = viewport·multiplier/2 (936/2 = 468), offsets zeroed;
 * - fresh crop 0x53a810..0x53a83d stores origin = round(anchor − viewport/2) = 312 (0x53a798..0x53a7f0);
 * - projection 0x53c9d4..0x53ca46: offset = anchor − projected current pointing (fsubrp order kept);
 * - pan 0x53a6ca..0x53a723: source left/top = round(cached origin − offset), guard 0x53af28 on the UNROUNDED values,
 *   strict 0 < left < (multiplier−1)·viewport and 0 < top < (multiplier−1)·viewport;
 * - 0x53a741: same configuration and no forced refresh jump past loader 0x53be70 to CopyRect 0x53a845..0x53a8dd.
 * Anything else (refresh, other configuration, guard false) would reload a fresh field that is not available here, so it is
 * rejected; nothing is recentred, extended or filled. The slit query is the integer crop origin + viewport/2.
 * Number arithmetic with nearest-even rounding is the declared browser policy, not a measured x87 control word. */
export class CachedViewportError extends Error{
 constructor(readonly code:'cache'|'refresh'|'configuration'|'pointing'|'guard'|'coverage'){super(`Cached galaxy viewport: ${code}`);this.name='CachedViewportError';}
}
export type FieldCache=Readonly<{width:number;height:number;viewport:number;multiplier:number;anchor:Readonly<{x:number;y:number}>;origin:Readonly<{x:number;y:number}>;configuration:string}>;
export type CachedPan=Readonly<{offset:Readonly<{x:number;y:number}>;unrounded:Readonly<{left:number;top:number}>;rect:NativeRectangle;query:Readonly<{x:number;y:number}>}>;
const positive=(v:number)=>Number.isSafeInteger(v)&&v>0;
/** Explicit initialization from a fresh, verified base frame (the browser constructs this known state; it does not infer an
 * original process history). The configuration key binds telescope record, scale and field; any change is a refresh. */
export function initializeFieldCache(viewport:number,multiplier:number,configuration:string):FieldCache{
 if(!positive(viewport)||!positive(multiplier)||multiplier<2||viewport%2||typeof configuration!=='string'||!configuration||configuration.length>200)throw new CachedViewportError('cache');
 const width=viewport*multiplier,height=width;if(width>4096)throw new CachedViewportError('cache');
 const anchor=Object.freeze({x:width/2,y:height/2}),origin=Object.freeze({x:roundNearestEven(anchor.x-viewport/2),y:roundNearestEven(anchor.y-viewport/2)});
 return Object.freeze({width,height,viewport,multiplier,anchor,origin,configuration});
}
export function cachedPanViewport(cache:FieldCache,projectedPointing:Readonly<{x:number;y:number}>,request:Readonly<{needsRefresh:boolean;configuration:string}>):CachedPan{
 if(!cache||!positive(cache.viewport)||cache.width!==cache.viewport*cache.multiplier||cache.height!==cache.width)throw new CachedViewportError('cache');
 if(request.needsRefresh!==false)throw new CachedViewportError('refresh');
 if(request.configuration!==cache.configuration)throw new CachedViewportError('configuration');
 if(!projectedPointing||!Number.isFinite(projectedPointing.x)||!Number.isFinite(projectedPointing.y))throw new CachedViewportError('pointing');
 const offset=Object.freeze({x:cache.anchor.x-projectedPointing.x,y:cache.anchor.y-projectedPointing.y});
 const left=cache.origin.x-offset.x,top=cache.origin.y-offset.y,limit=(cache.multiplier-1)*cache.viewport;
 if(!(0<left&&left<limit&&0<top&&top<limit))throw new CachedViewportError('guard');
 const l=roundNearestEven(left),t=roundNearestEven(top),rect=Object.freeze({left:l,top:t,right:l+cache.viewport,bottom:t+cache.viewport});
 // Source coverage of the cached bitmap: the copy never reads outside it (no hole filling).
 if(rect.left<0||rect.top<0||rect.right>cache.width||rect.bottom>cache.height)throw new CachedViewportError('coverage');
 return Object.freeze({offset,unrounded:Object.freeze({left,top}),rect,query:Object.freeze({x:l+cache.viewport/2,y:t+cache.viewport/2})});
}
