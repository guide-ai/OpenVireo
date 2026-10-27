/** CCD exposure composer (front C2): recipe + catalog selection + extra sources -> final Single plane.
 * Order recovered statically (NATIVE-CAMERA-FRONT-C-C0-01, docs/CAMERA-EXPOSURE.md):
 *  1. Field initialize 0x5220f4 clears the field source list. Select 0x5222d4 then calls 0x522718, which projects the
 *     moving-object (kind-2) records with 0x522560 (2 draws each, no bounds test), applies the filter offset table
 *     (NF/R -0.54, B +0.65, V 0, I -0.88; Extended 0x5228b8/0x5228c4/0x5228d0, stored Single) and appends them.
 *  2. Preparation 0x52154c calls the update 0x522454: each selected catalog row is projected by 0x522698
 *     (2 draws + inclusive bounds) and appended with kind 0 and its Single magnitude. Field objects (0x5228dc) are
 *     not ported: 0x522a18 always returns a record, so natively they only overwrite a magnitude (see doc).
 *  3. Background 0x521635: one draw per pixel, row-major (cameraBackground.ts).
 *  4. Optional CCD overlay (form+0x412): not supported here.
 *  5. Source loop 0x521a6f..0x521b35 in list order: kind 2 consumes the next record as its endpoint (extended
 *     0x524a6c); others are points (0x5245d0). Magnitude: NF subtracts Single 0.25 (0x521a8d).
 *  6. Well/gain/A-D (cameraFinal.ts).
 * Web choices [W] are listed in CameraExposure.adaptations. */
import {CameraRandomCursor} from './cameraRandom';
import {compiledCameraProjection,projectCameraSource,type CameraProjectionContext} from './cameraProjection';
import {cameraBackgroundStage,compiledCameraBackgroundParameters} from './cameraBackground';
import {compiledCameraSourceCalibration,cameraPointParametersFromCalibration} from './cameraSourceCalibration';
import {cameraPointPlan,type CameraPointPlan} from './cameraPointSource';
import {cameraExtendedPlan,CameraExtendedError,CAMERA_STREAK_VISIT_LIMIT,type CameraExtendedPlan} from './cameraExtendedSource';
import {cameraScalarJitter} from './cameraBackground';
import {compiledCameraFinalParameters,finalizeCameraPlane,type CameraFinalStage} from './cameraFinal';
import {cameraCatalogReference} from './cameraCatalogReference';
import {opticalIndex,type OpticalIndex} from './opticalTelescope';
import type {VizierSelection} from './vizierNomad';

/** Agreed with front X (asteroids): one moving object as a start/end pair of kind-2 records (0x522718).
 * storedMag is the record magnitude before the recovered filter offset, which the composer applies.
 * [W] Fixed-position field objects (native kind 0 via 0x5228dc) are not offered: see CAMERA_EXPOSURE_UNRECOVERED. */
export type CameraExtraSource=Readonly<{raHours:number;decDeg:number;storedMag:number;kind:'pair';end:Readonly<{raHours:number;decDeg:number}>}>;
export type CameraExposureRecipe=Readonly<{
 camera:'ccd';opticalIndex:OpticalIndex;filterPosition:number;seconds:number;gain:number;
 centerRaHours:number;centerDecDegrees:number;
 /** uint32 seed of the camera-private stream [W]. */
 seed:number;
}>;
export type CameraExposureErrorCode='recipe'|'extra'|'catalog'|'source-geometry';
export class CameraExposureError extends Error {
 constructor(readonly code:CameraExposureErrorCode,readonly detail=''){super(`Camera exposure: ${code}${detail?` (${detail})`:''}`);this.name='CameraExposureError';}
}
export type CameraFieldRecord=Readonly<{
 origin:'moving-start'|'moving-end'|'catalog';kind:0|2;
 /** Index into the caller's extras for moving records, else null. */
 extraIndex:number|null;
 identifier:string|null;raHours:number;decDegrees:number;magnitude:number;pixelX:number;pixelY:number;
}>;
export type CameraSkippedSource=Readonly<{extraIndex:number;reason:'moving-pair-off-detector'|'moving-pair-geometry'|'moving-pair-budget'}>;
export type CameraExposure=Readonly<{
 recipe:CameraExposureRecipe;plane:CameraFinalStage;records:readonly CameraFieldRecord[];skipped:readonly CameraSkippedSource[];
 drawsConsumed:number;finalRandomState:number;
 catalog:Readonly<{rows:number;selected:number;onDetector:number}>;
 adaptations:readonly string[];unrecovered:readonly string[];
}>;
/** Filter offsets of 0x522718's switch on the filter position. Extended constants, applied as mag - c. */
const MOVING_OFFSET:readonly number[]=Object.freeze([0.54,-0.65,0,0.54,0.88]);
export const CAMERA_EXPOSURE_ADAPTATIONS=Object.freeze([
 'private-seeded-stream: each exposure draws from its own uint32-seeded copy of the recovered Random step',
 'fresh-field-list: the list is rebuilt per exposure (initialize -> select -> update), and moving records are projected in the same stream just before catalog rows',
 'whole-sky-selection: the region bounds at [0x5b5b30] are not recovered; selection keeps the magnitude limit',
 'no-ccd-overlay: the optional bitmap overlay branch (form+0x412) is not offered',
 'moving-pair-off-detector: a pair whose projected pixel position exceeds 1e6 is skipped (its four draws are still consumed); the native FISTP overflow path is not recovered',
 'moving-pair-streak-limit: streak visits are bounded by the clipped 1024^2 rectangle plus a cross pass (CAMERA_STREAK_VISIT_LIMIT); a pair that still cannot be planned (budget or coincident endpoints) is skipped alone, with no draws for its streak',
 'number-arithmetic: Number/Math with Single stores replaces x87 Extended',
]);
export const CAMERA_EXPOSURE_UNRECOVERED=Object.freeze([
 'field-objects-0x5228dc: not ported. 0x522a18 always returns a record (the last one iterated, or the caller record when the field list is empty), so 0x5228dc only overwrites a magnitude with the colour-corrected value (0x51ef38) and its append branch 0x5229a4 is unreachable',
 'shared-random-prefix: the native global stream state at Go',
]);
/** Visit budget of one exposure is bounded by CAMERA_RANDOM_DRAW_LIMIT (cameraRandom.ts). */

const finite=(v:unknown,limit:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=limit;
function checkRecipe(r:CameraExposureRecipe):CameraExposureRecipe {
 if(!r||typeof r!=='object'||r.camera!=='ccd')throw new CameraExposureError('recipe','camera');
 const index=opticalIndex(r.opticalIndex);cameraCatalogReference('ccd',r.filterPosition);
 if(!Number.isInteger(r.seconds)||r.seconds<1||r.seconds>CAMERA_MAX_SECONDS)throw new CameraExposureError('recipe','seconds');
 if(![1,2,5].includes(r.gain))throw new CameraExposureError('recipe','gain');
 if(!finite(r.centerRaHours,24)||r.centerRaHours<0||!finite(r.centerDecDegrees,90))throw new CameraExposureError('recipe','center');
 if(!Number.isInteger(r.seed)||r.seed<0||r.seed>0xffff_ffff)throw new CameraExposureError('recipe','seed');
 return Object.freeze({camera:'ccd',opticalIndex:index,filterPosition:r.filterPosition,seconds:r.seconds,gain:r.gain,centerRaHours:r.centerRaHours,centerDecDegrees:r.centerDecDegrees,seed:r.seed});
}
/** [W] Web bound on one exposure (the original editor limit is not recovered). The camera form uses the same value. */
export const CAMERA_MAX_SECONDS=3600;
function checkExtras(extras:readonly CameraExtraSource[]):readonly CameraExtraSource[] {
 if(!Array.isArray(extras)||extras.length>256)throw new CameraExposureError('extra','list');
 const at=(c:Readonly<{raHours:number;decDeg:number}>|undefined)=>!!c&&finite(c.raHours,24)&&c.raHours>=0&&finite(c.decDeg,90);
 return Object.freeze(extras.map((e,i)=>{
  if(!e||e.kind!=='pair'||!at(e)||!at(e.end)||!finite(e.storedMag,50))throw new CameraExposureError('extra',String(i));
  return Object.freeze({raHours:e.raHours,decDeg:e.decDeg,storedMag:e.storedMag,kind:'pair' as const,end:Object.freeze({raHours:e.end.raHours,decDeg:e.end.decDeg})});
 }));
}
/** Continuous pixel position from the plane coordinates (0x5224d5..0x522518), with or without the bounds test. */
function pixel(context:CameraProjectionContext,planeX:number,planeY:number){
 return {pixelX:(planeX-context.originX)/context.stepX,pixelY:(planeY-context.originY)/context.stepY};
}
const placeable=(r:{pixelX:number;pixelY:number})=>Number.isFinite(r.pixelX)&&Number.isFinite(r.pixelY)&&Math.abs(r.pixelX)<=1e6&&Math.abs(r.pixelY)<=1e6;
/** Same arithmetic as addCameraPointSource/addCameraExtendedSource (one uniform per ordered visit, Single store after
 * each addition), applied in place to one owned Float32Array: a Float32Array store rounds exactly like Math.fround. */
function applyPlan(plane:Float32Array,plan:CameraPointPlan|CameraExtendedPlan,stream:CameraRandomCursor){
 const {indices,means}=plan;
 for(let i=0;i<indices.length;i++){const at=indices[i];plane[at]=plane[at]+cameraScalarJitter(means[i],stream.next());}
}

export function composeCameraExposure(recipeInput:CameraExposureRecipe,selection:VizierSelection,extrasInput:readonly CameraExtraSource[]=[]):CameraExposure {
 const recipe=checkRecipe(recipeInput),extras=checkExtras(extrasInput);
 if(!selection||!Array.isArray(selection.selectedEntries))throw new CameraExposureError('catalog');
 const stream=new CameraRandomCursor(recipe.seed);
 // CCD compiled record byte +0x5a = 1 (0x5a2bd8): seeing jitter enabled.
 const context=compiledCameraProjection('ccd',recipe.opticalIndex,{raHours:recipe.centerRaHours,decDegrees:recipe.centerDecDegrees},true);
 const records:CameraFieldRecord[]=[],skipped:CameraSkippedSource[]=[];
 // 1. Moving (kind-2) records: start and end are both kind 2; the end record's magnitude is never read.
 extras.forEach((e,extraIndex)=>{
  const magnitude=Math.fround(Math.fround(e.storedMag)-MOVING_OFFSET[recipe.filterPosition]),pair:CameraFieldRecord[]=[];
  for(const [origin,c] of [['moving-start',{raHours:e.raHours,decDegrees:e.decDeg}],['moving-end',{raHours:e.end.raHours,decDegrees:e.end.decDeg}]] as const){
   const p=projectCameraSource(context,c,[stream.next(),stream.next()]);
   pair.push(Object.freeze({origin,kind:2 as const,extraIndex,identifier:null,raHours:c.raHours,decDegrees:c.decDegrees,magnitude,...pixel(context,p.planeX,p.planeY)}));
  }
  if(pair.every(placeable))records.push(...pair);else skipped.push(Object.freeze({extraIndex,reason:'moving-pair-off-detector' as const}));
 });
 // 2. Catalog rows in selected-list order; only rows inside the inclusive bounds are kept.
 let onDetector=0;
 for(const entry of selection.selectedEntries){
  const row=entry.result.row,p=projectCameraSource(context,{raHours:row.raHours,decDegrees:row.decDegrees},[stream.next(),stream.next()]);
  if(!p.inside)continue;onDetector++;
  records.push(Object.freeze({origin:'catalog' as const,kind:0 as const,extraIndex:null,identifier:row.identifier,raHours:row.raHours,decDegrees:row.decDegrees,magnitude:row.selectedMagnitude,pixelX:p.pixelX!,pixelY:p.pixelY!}));
 }
 // 3. Background.
 const background=compiledCameraBackgroundParameters('ccd',recipe.seconds,recipe.gain);
 const initial=cameraBackgroundStage(background,stream.take(background.width*background.height));
 const plane=Float32Array.from(initial.pixels);
 // 5. Sources in list order.
 for(let i=0;i<records.length;i++){
  const r=records[i];
  const calibration=compiledCameraSourceCalibration('ccd',recipe.opticalIndex,recipe.filterPosition,recipe.seconds,r.magnitude);
  if(r.kind===2){
   const end=records[i+1];
   let plan:CameraExtendedPlan|null=null;
   try{plan=cameraExtendedPlan({width:calibration.width,height:calibration.height,x1:r.pixelX,y1:r.pixelY,x2:end.pixelX,y2:end.pixelY,sigmaX:calibration.sigmaX,sigmaY:calibration.sigmaY,referencePeak:calibration.referencePeak,exposureScale:calibration.exposureScale},CAMERA_STREAK_VISIT_LIMIT);}
   catch(e){
    if(!(e instanceof CameraExtendedError))throw e;
    // [W] Only this pair is skipped (no draws consumed for it); the native code has no such guard.
    skipped.push(Object.freeze({extraIndex:r.extraIndex!,reason:e.code==='budget'?'moving-pair-budget' as const:'moving-pair-geometry' as const}));
   }
   if(plan)applyPlan(plane,plan,stream);i++;
  }else applyPlan(plane,cameraPointPlan(cameraPointParametersFromCalibration(calibration,r.pixelX,r.pixelY)),stream);
 }
 const final=finalizeCameraPlane({phase:'point-sources-before-clipping',width:initial.width,height:initial.height,localDrawsConsumed:0,pixels:Array.from(plane),histogram:initial.histogram},compiledCameraFinalParameters('ccd',recipe.gain));
 return Object.freeze({recipe,plane:final,records:Object.freeze(records),skipped:Object.freeze(skipped),drawsConsumed:stream.drawsConsumed,finalRandomState:stream.finalState,
  catalog:Object.freeze({rows:selection.catalog?.entries.length??0,selected:selection.selectedEntries.length,onDetector}),
  adaptations:CAMERA_EXPOSURE_ADAPTATIONS,unrecovered:CAMERA_EXPOSURE_UNRECOVERED});
}
