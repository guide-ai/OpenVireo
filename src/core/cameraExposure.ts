/** CCD exposure composer (front C2): recipe + catalog selection + extra sources -> final Single plane.
 * Order recovered statically (NATIVE-CAMERA-FRONT-C-C0-01, docs/CAMERA-EXPOSURE.md):
 *  1. Field initialize 0x5220f4 clears the field source list. Select 0x5222d4 then calls 0x522718, which projects the
 *     moving-object (kind-2) records with 0x522560 (2 draws each, no bounds test), applies the filter offset table
 *     (NF/R -0.54, B +0.65, V 0, I -0.88; Extended 0x5228b8/0x5228c4/0x5228d0, stored Single) and appends them.
 *  2. Preparation 0x52154c calls the update 0x522454: each selected catalog row is projected by 0x522698
 *     (2 draws + inclusive bounds) and appended with kind 0 and its Single magnitude; then 0x5228dc appends field
 *     objects (kind 0) the same way.
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
import {addCameraPointSource,cameraPointPlan,type CameraPointStage} from './cameraPointSource';
import {addCameraExtendedSource,cameraExtendedPlan,type CameraSourcePlane} from './cameraExtendedSource';
import {compiledCameraFinalParameters,finalizeCameraPlane,type CameraFinalStage} from './cameraFinal';
import {cameraCatalogReference} from './cameraCatalogReference';
import {opticalIndex,type OpticalIndex} from './opticalTelescope';
import type {VizierSelection} from './vizierNomad';

/** Agreed with front X (asteroids). storedMag is the record magnitude before the filter offset. */
export type CameraExtraSource=Readonly<{raHours:number;decDeg:number;storedMag:number;kind:'point'|'pair';end?:Readonly<{raHours:number;decDeg:number}>}>;
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
 origin:'moving-start'|'moving-end'|'catalog'|'field-object';kind:0|2;
 identifier:string|null;raHours:number;decDegrees:number;magnitude:number;pixelX:number;pixelY:number;
}>;
export type CameraExposure=Readonly<{
 recipe:CameraExposureRecipe;plane:CameraFinalStage;records:readonly CameraFieldRecord[];
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
 'number-arithmetic: Number/Math with Single stores replaces x87 Extended',
]);
export const CAMERA_EXPOSURE_UNRECOVERED=Object.freeze([
 'field-object-colour-term-0x51ef38: point extras use storedMag as given (the caller supplies the band magnitude)',
 'field-object-merge-0x522a18: point extras are appended, never merged into a nearby catalog source',
 'shared-random-prefix: the native global stream state at Go',
]);

const finite=(v:unknown,limit:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=limit;
function checkRecipe(r:CameraExposureRecipe):CameraExposureRecipe {
 if(!r||typeof r!=='object'||r.camera!=='ccd')throw new CameraExposureError('recipe','camera');
 const index=opticalIndex(r.opticalIndex);cameraCatalogReference('ccd',r.filterPosition);
 if(!Number.isInteger(r.seconds)||r.seconds<1||r.seconds>3600)throw new CameraExposureError('recipe','seconds');
 if(![1,2,5].includes(r.gain))throw new CameraExposureError('recipe','gain');
 if(!finite(r.centerRaHours,24)||r.centerRaHours<0||!finite(r.centerDecDegrees,90))throw new CameraExposureError('recipe','center');
 if(!Number.isInteger(r.seed)||r.seed<0||r.seed>0xffff_ffff)throw new CameraExposureError('recipe','seed');
 return Object.freeze({camera:'ccd',opticalIndex:index,filterPosition:r.filterPosition,seconds:r.seconds,gain:r.gain,centerRaHours:r.centerRaHours,centerDecDegrees:r.centerDecDegrees,seed:r.seed});
}
function checkExtras(extras:readonly CameraExtraSource[]):readonly CameraExtraSource[] {
 if(!Array.isArray(extras)||extras.length>256)throw new CameraExposureError('extra','list');
 return Object.freeze(extras.map((e,i)=>{
  const at=(c:Readonly<{raHours:number;decDeg:number}>|undefined)=>!!c&&finite(c.raHours,48)&&finite(c.decDeg,180);
  if(!e||!at(e)||!finite(e.storedMag,50)||(e.kind!=='point'&&e.kind!=='pair'))throw new CameraExposureError('extra',String(i));
  if(e.kind==='pair'&&!at(e.end))throw new CameraExposureError('extra',`${i} end`);
  return Object.freeze({raHours:e.raHours,decDeg:e.decDeg,storedMag:e.storedMag,kind:e.kind,...(e.kind==='pair'?{end:Object.freeze({raHours:e.end!.raHours,decDeg:e.end!.decDeg})}:{})});
 }));
}
/** Continuous pixel position from the plane coordinates (0x5224d5..0x522518), with or without the bounds test. */
function pixel(context:CameraProjectionContext,planeX:number,planeY:number){
 return {pixelX:(planeX-context.originX)/context.stepX,pixelY:(planeY-context.originY)/context.stepY};
}

export function composeCameraExposure(recipeInput:CameraExposureRecipe,selection:VizierSelection,extrasInput:readonly CameraExtraSource[]=[]):CameraExposure {
 const recipe=checkRecipe(recipeInput),extras=checkExtras(extrasInput);
 if(!selection||!Array.isArray(selection.selectedEntries))throw new CameraExposureError('catalog');
 const stream=new CameraRandomCursor(recipe.seed);
 // CCD compiled record byte +0x5a = 1 (0x5a2bd8): seeing jitter enabled.
 const context=compiledCameraProjection('ccd',recipe.opticalIndex,{raHours:recipe.centerRaHours,decDegrees:recipe.centerDecDegrees},true);
 const records:CameraFieldRecord[]=[];
 // 1. Moving (kind-2) records: start and end are both kind 2; the end record's magnitude is never read.
 for(const e of extras)if(e.kind==='pair'){
  const magnitude=Math.fround(Math.fround(e.storedMag)-MOVING_OFFSET[recipe.filterPosition]);
  for(const [origin,c] of [['moving-start',{raHours:e.raHours,decDegrees:e.decDeg}],['moving-end',{raHours:e.end!.raHours,decDegrees:e.end!.decDeg}]] as const){
   const p=projectCameraSource(context,c,stream.take(2));
   records.push(Object.freeze({origin,kind:2 as const,identifier:null,raHours:c.raHours,decDegrees:c.decDegrees,magnitude,...pixel(context,p.planeX,p.planeY)}));
  }
 }
 // 2. Catalog rows in selected-list order; only rows inside the inclusive bounds are kept.
 let onDetector=0;
 for(const entry of selection.selectedEntries){
  const row=entry.result.row,p=projectCameraSource(context,{raHours:row.raHours,decDegrees:row.decDegrees},stream.take(2));
  if(!p.inside)continue;onDetector++;
  records.push(Object.freeze({origin:'catalog' as const,kind:0 as const,identifier:row.identifier,raHours:row.raHours,decDegrees:row.decDegrees,magnitude:row.selectedMagnitude,pixelX:p.pixelX!,pixelY:p.pixelY!}));
 }
 // 2b. Field objects (kind 0), after the catalog as in 0x5228dc.
 for(const e of extras)if(e.kind==='point'){
  const p=projectCameraSource(context,{raHours:e.raHours,decDegrees:e.decDeg},stream.take(2));
  if(!p.inside)continue;
  records.push(Object.freeze({origin:'field-object' as const,kind:0 as const,identifier:null,raHours:e.raHours,decDegrees:e.decDeg,magnitude:Math.fround(e.storedMag),pixelX:p.pixelX!,pixelY:p.pixelY!}));
 }
 // 3. Background.
 const background=compiledCameraBackgroundParameters('ccd',recipe.seconds,recipe.gain);
 let plane:CameraSourcePlane|CameraPointStage=cameraBackgroundStage(background,stream.take(background.width*background.height));
 // 5. Sources in list order.
 for(let i=0;i<records.length;i++){
  const r=records[i];
  if([r.pixelX,r.pixelY].some(v=>!Number.isFinite(v)||Math.abs(v)>1e6))throw new CameraExposureError('source-geometry',String(i));
  const calibration=compiledCameraSourceCalibration('ccd',recipe.opticalIndex,recipe.filterPosition,recipe.seconds,r.magnitude);
  if(r.kind===2){
   const end=records[i+1];
   if(!end)throw new CameraExposureError('source-geometry',`${i} pair end`);
   if([end.pixelX,end.pixelY].some(v=>!Number.isFinite(v)||Math.abs(v)>1e6))throw new CameraExposureError('source-geometry',String(i+1));
   let plan;
   try{plan=cameraExtendedPlan({width:calibration.width,height:calibration.height,x1:r.pixelX,y1:r.pixelY,x2:end.pixelX,y2:end.pixelY,sigmaX:calibration.sigmaX,sigmaY:calibration.sigmaY,referencePeak:calibration.referencePeak,exposureScale:calibration.exposureScale});}
   catch(e){throw new CameraExposureError('source-geometry',`${i} ${(e as Error).message}`);}
   plane=addCameraExtendedSource(plane,plan,stream.take(plan.indices.length));i++;
  }else{
   const plan=cameraPointPlan(cameraPointParametersFromCalibration(calibration,r.pixelX,r.pixelY));
   plane=addCameraPointSource(plane,plan,stream.take(plan.indices.length));
  }
 }
 const final=finalizeCameraPlane(plane,compiledCameraFinalParameters('ccd',recipe.gain));
 return Object.freeze({recipe,plane:final,records:Object.freeze(records),drawsConsumed:stream.drawsConsumed,finalRandomState:stream.finalState,
  catalog:Object.freeze({rows:selection.catalog?.entries.length??0,selected:selection.selectedEntries.length,onDetector}),
  adaptations:CAMERA_EXPOSURE_ADAPTATIONS,unrecovered:CAMERA_EXPOSURE_UNRECOVERED});
}
