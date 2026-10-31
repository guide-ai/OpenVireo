// Front G5: one build of the field the observatory's sky view draws (io/skyField.ts is the shared, cancellable front end). It runs
// in the Worker io/skyFieldWorker.ts in the browser (review 1 M4: no long task on the page) and in process in tests. The pack
// comes from io/fieldInfoPacks.ts (a certified pack at its listed pointings, otherwise the compact GSC tiles); the telescope view
// is fieldEngine.evaluateFieldView (0x53be70, paint 0x53b390), the finder view evaluateFinderView (0x53bae4, FSCFieldObj, paint
// 0x53b058). Every typed reason is returned, never approximated. Same-origin files only; nothing is sent anywhere.
import {evaluateFieldView,evaluateFinderView,type FieldOptions,type FieldPopulation,type FieldTelescope,type FieldUnavailableReason,type FieldVariableTime} from '../core/fieldEngine';
import type {NativeSelectionScene} from '../core/objectSelection';
import type {RgbImage} from '../core/photons';
import type {Pointing} from '../core/sky';
import {nativePhotographRows} from '../core/photographicList';
import {decodeBitmap8,type Bitmap8} from '../core/photographDraw';
import {skyFieldPack,skyFieldInputs,type SkyPackFailure} from './fieldInfoPacks';
import {yieldTask} from './yieldTask';

export type SkyFieldView='telescope'|'finder';
export type SkyFieldReason='object-x-hidden'|'object-x-unreadable'|SkyPackFailure['reason']|'field-reason';
export type SkyField=Readonly<{status:'ready';view:SkyFieldView;anchor:Pointing;telescope:FieldTelescope;packId:string;raster:RgbImage;population:FieldPopulation;scene:NativeSelectionScene;
 /** Front C6, telescope view: the CCD overlay's source (fieldEngine `galaxyLayer`) and the galaxies the paint left out. */
 galaxyRed?:Uint8Array;unpaintedGalaxies?:number}>
 |Readonly<{status:'unavailable';view:SkyFieldView;anchor:Pointing;reason:SkyFieldReason;detail?:string}>;
/** What one build needs (plain data, so it can cross to the Worker). The JD is frozen by the caller. */
export type SkyFieldBuildRequest=Readonly<{view:SkyFieldView;anchor:Pointing;telescope:FieldTelescope;finderMagnitudeLimit:number;variableTime?:FieldVariableTime}>;

let photographBitmaps:Promise<ReadonlyMap<string,Bitmap8>>|null=null;
/** Every approved photograph (core/approvedPhotographs.ts: the Object X four and the LSS five). One that cannot be loaded is left
 * out, so only a field that draws it stays photographic-image. */
function bitmaps():Promise<ReadonlyMap<string,Bitmap8>>{
 photographBitmaps??=(async()=>{
  const [{APPROVED_PHOTOGRAPHS},{fetchBundledHotList}]=await Promise.all([import('../core/approvedPhotographs'),import('./bundledHotList')]);
  const signal=new AbortController().signal,out=new Map<string,Bitmap8>();
  await Promise.all(APPROVED_PHOTOGRAPHS.map(async p=>{try{out.set(p.file,decodeBitmap8((await fetchBundledHotList(fetch,signal,{name:p.file,path:p.path,bytes:p.bytes,sha256:p.sha256})).bytes));}catch{/* left out: its field stays photographic-image */}}));
  return out;
 })();
 return photographBitmaps;
}

export async function buildSkyField(r:SkyFieldBuildRequest,signal?:AbortSignal):Promise<SkyField>{
 const {view,anchor}=r,unavailable=(reason:SkyFieldReason,detail?:string):SkyField=>Object.freeze({status:'unavailable',view,anchor,reason,...(detail?{detail}:{})});
 const step=async()=>{signal?.throwIfAborted();await yieldTask();signal?.throwIfAborted();};
 const pack=await skyFieldPack(anchor,view,signal);
 if(pack.status!=='ready')return unavailable(pack.reason,'detail' in pack?pack.detail:undefined);
 const inputs=await skyFieldInputs();await step();
 const base={variableDispatch:'recovered' as const,...(r.variableTime?{variableTime:r.variableTime}:{}),...(signal?{signal}:{})};
 if(view==='finder'){
  const f=evaluateFinderView(pack.pack,inputs.glx,anchor,r.telescope,{...base,finderMagnitudeLimit:r.finderMagnitudeLimit});
  return f.reasons.length||!f.raster||!f.population||!f.scene?unavailable('field-reason',f.reasons[0]??'outside-pack')
   :Object.freeze({status:'ready',view,anchor,telescope:r.telescope,packId:pack.pack.id,raster:f.raster,population:f.population,scene:f.scene});
 }
 // G5 closure N4 (theoretical, none found in 45 pointings): evaluateFieldView leaves a TRUE variable with unavailable values
 // unpainted when its stamp misses the central 312² crop, but this view pans across the 936² cache, where such a star would be
 // missing silently; the finder applies the whole-cache rule (evaluateFinderView).
 const options:{-readonly [K in keyof FieldOptions]:FieldOptions[K]}={...base,galaxyLayer:true};
 let v=evaluateFieldView(pack.pack,inputs.glx,anchor,r.telescope,options);
 const retry=async(reason:FieldUnavailableReason)=>{
  if(reason==='qso-merge'){options.qso='merge';options.qsoCatalog=inputs.qso;}
  else if(reason==='photographic-image'){options.photographs={rows:nativePhotographRows(inputs.glimages),bitmaps:await bitmaps()};}
  else return false;
  await step();v=evaluateFieldView(pack.pack,inputs.glx,anchor,r.telescope,options);return true;
 };
 for(let i=0;i<2&&v.reasons.length&&await retry(v.reasons[0]);i++);
 return v.reasons.length||!v.raster||!v.population||!v.scene?unavailable('field-reason',v.reasons[0]??'outside-pack')
  :Object.freeze({status:'ready',view,anchor,telescope:r.telescope,packId:pack.pack.id,raster:v.raster,population:v.population,scene:v.scene,
   ...(v.galaxyRed?{galaxyRed:v.galaxyRed}:{}),unpaintedGalaxies:v.outsideViewGalaxies?.length??0});
}
