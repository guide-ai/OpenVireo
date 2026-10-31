// Front G5 (analysis/front-plans/front-g5.md §1): the field the observatory's sky view draws at any pointing, as VIREO's render
// 0x53a40c does: the telescope view loads the instrument field (0x53be70) and paints its 3 × 312 px cache (0x53b390, the field
// engine's paintField); the finder view loads the finder field (0x53bae4, FSCFieldObj on the same compact GSC bands) and paints
// it with 0x53b058 (fieldEngine.evaluateFinderView). The pack comes from io/fieldInfoPacks.ts (a certified pack at its listed
// pointings, otherwise the compact GSC tiles). The 2° Object X mask uses the field's farthest corner (G merge review rule). A
// typed reason is returned where the field cannot be drawn exactly; the caller then keeps its ≤ 12 mag preview [W]. Each build
// yields to the page between stages and stops on the caller's abort. Same-origin files only; nothing is sent anywhere.
import {evaluateFieldView,evaluateFinderView,frozenObservatoryTime,type FieldOptions,type FieldPopulation,type FieldTelescope,type FieldUnavailableReason,type FieldVariableTime} from '../core/fieldEngine';
import type {NativeSelectionScene} from '../core/objectSelection';
import type {RgbImage} from '../core/photons';
import type {Pointing} from '../core/sky';
import {nativePhotographRows} from '../core/photographicList';
import {decodeBitmap8,type Bitmap8} from '../core/photographDraw';
import {fieldMaskReach,objectXMasked} from './objectXMask';
import {skyFieldPack,skyFieldInputs,type SkyPackFailure} from './fieldInfoPacks';
import {yieldTask} from './yieldTask';

export type SkyFieldView='telescope'|'finder';
export type SkyFieldReason='object-x-hidden'|SkyPackFailure['reason']|'field-reason';
export type SkyField=Readonly<{status:'ready';view:SkyFieldView;anchor:Pointing;telescope:FieldTelescope;packId:string;raster:RgbImage;population:FieldPopulation;scene:NativeSelectionScene}>
 |Readonly<{status:'unavailable';view:SkyFieldView;anchor:Pointing;reason:SkyFieldReason;detail?:string}>;
export type SkyFieldRequest=Readonly<{view:SkyFieldView;anchor:Pointing;telescope:FieldTelescope;hidden:Pointing|null;finderMagnitudeLimit:number;signal?:AbortSignal;
 /** The observatory clock; its JD is frozen when the field is built (frozenObservatoryTime), as the other field consumers do. */currentJd?:()=>number;variableTime?:FieldVariableTime}>;
/** Half-heights used for the Object X reach (fieldEngine.FIELD_HALF_DEGREES). */
const HALF={telescope:.375,finder:3.75} as const;

/** The last few built fields, so leaving and re-entering a view or the observatory does not rebuild (a pointing change past the
 * cache or a view change builds anew, as 0x53a40c reloads). */
const built=new Map<string,SkyField>();
/** The JD is frozen at the first build of a field and kept with it (VIREO keeps a loaded field until it reloads). */
const keyOf=(r:SkyFieldRequest)=>[r.view,r.anchor.ra,r.anchor.dec,r.telescope,r.view==='finder'?Math.fround(r.finderMagnitudeLimit):'',r.hidden?`${r.hidden.ra},${r.hidden.dec}`:''].join('|');
export function clearSkyFieldCache(){built.clear();}

let photographBitmaps:Promise<ReadonlyMap<string,Bitmap8>>|null=null;
/** The approved photographs (Object X four; Front F3 adds the LSS five through approvedPhotographs.ts after it merges). */
function bitmaps():Promise<ReadonlyMap<string,Bitmap8>>{
 photographBitmaps??=(async()=>{
  const [{OBJECT_X_PHOTOGRAPHS},{boundedResourceBody,resourceSha256}]=await Promise.all([import('./objectXSpectrometerInputs'),import('./boundedResource')]);
  const out=new Map<string,Bitmap8>();
  for(const p of OBJECT_X_PHOTOGRAPHS){
   const response=await fetch(p.path);if(!response.ok)throw new Error('photograph');
   const body=await boundedResourceBody(response,p.bytes);
   if(body.byteLength!==p.bytes||await resourceSha256(body)!==p.sha256)throw new Error('photograph');
   out.set(p.file,decodeBitmap8(new Uint8Array(body)));
  }
  return out;
 })();
 photographBitmaps.catch(()=>{photographBitmaps=null;});
 return photographBitmaps;
}

export async function loadSkyField(request:SkyFieldRequest):Promise<SkyField>{
 const variableTime=request.variableTime??frozenObservatoryTime(request.currentJd),r:SkyFieldRequest={...request,...(variableTime?{variableTime}:{})};
 const key=keyOf(r),hit=built.get(key);if(hit){built.delete(key);built.set(key,hit);return hit;}
 const {view,anchor,signal}=r,unavailable=(reason:SkyFieldReason,detail?:string):SkyField=>Object.freeze({status:'unavailable',view,anchor,reason,...(detail?{detail}:{})});
 const step=async()=>{signal?.throwIfAborted();await yieldTask();signal?.throwIfAborted();};
 if(await objectXMasked(r.hidden,anchor,fieldMaskReach(anchor,HALF[view])))return unavailable('object-x-hidden');
 await step();
 const pack=await skyFieldPack(anchor,view,signal);
 if(pack.status!=='ready')return unavailable(pack.reason,'detail' in pack?pack.detail:undefined);
 const inputs=await skyFieldInputs();await step();
 let result:SkyField;
 if(view==='finder'){
  const f=evaluateFinderView(pack.pack,inputs.glx,anchor,r.telescope,{variableDispatch:'recovered',finderMagnitudeLimit:r.finderMagnitudeLimit,...(r.variableTime?{variableTime:r.variableTime}:{}),...(signal?{signal}:{})});
  result=f.reasons.length||!f.raster||!f.population||!f.scene?unavailable('field-reason',f.reasons[0]??'outside-pack')
   :Object.freeze({status:'ready',view,anchor,telescope:r.telescope,packId:pack.pack.id,raster:f.raster,population:f.population,scene:f.scene});
 }else{
  const options:{-readonly [K in keyof FieldOptions]:FieldOptions[K]}={variableDispatch:'recovered',...(r.variableTime?{variableTime:r.variableTime}:{}),...(signal?{signal}:{})};
  let v=evaluateFieldView(pack.pack,inputs.glx,anchor,r.telescope,options);
  const retry=async(reason:FieldUnavailableReason)=>{
   if(reason==='qso-merge'){options.qso='merge';options.qsoCatalog=inputs.qso;}
   else if(reason==='photographic-image'){options.photographs={rows:nativePhotographRows(inputs.glimages),bitmaps:await bitmaps()};}
   else return false;
   await step();v=evaluateFieldView(pack.pack,inputs.glx,anchor,r.telescope,options);return true;
  };
  for(let i=0;i<2&&v.reasons.length&&await retry(v.reasons[0]);i++);
  result=v.reasons.length||!v.raster||!v.population||!v.scene?unavailable('field-reason',v.reasons[0]??'outside-pack')
   :Object.freeze({status:'ready',view,anchor,telescope:r.telescope,packId:pack.pack.id,raster:v.raster,population:v.population,scene:v.scene});
 }
 signal?.throwIfAborted();
 built.set(key,result);while(built.size>4)built.delete(built.keys().next().value!);
 return result;
}
