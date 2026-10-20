import {featureDraftNumber,FEATURE_WAVELENGTH_MIN,FEATURE_WAVELENGTH_MAX,type FeatureDraft} from './featureWidth';
/** Trace-height/manual shoulders:VIREO-EW-ST-07[0x5094cc,0x5096dc),
 * VIREO-EW-ST-08[0x5096dc,0x509f24),with end-exclusive source ranges.
 * These SVG dimensions and six-decimal draft text are authored presentation,
 * not original Win32 pixel geometry,x87 arithmetic or sampled flux. */
export const FEATURE_CURSOR_FRAME=Object.freeze({left:60,right:920,top:56,bottom:306,minimum:FEATURE_WAVELENGTH_MIN,maximum:FEATURE_WAVELENGTH_MAX});
export type FeatureCursorPoint=Readonly<{wavelength:number;intensity:number}>;
export type FeatureCursorMode='inspect'|'center'|'shoulder';
export class FeatureCursorError extends Error{}
export const DEFAULT_FEATURE_CURSOR:FeatureCursorPoint=Object.freeze({wavelength:(FEATURE_CURSOR_FRAME.minimum+FEATURE_CURSOR_FRAME.maximum)/2,intensity:.5});
const validPoint=(p:FeatureCursorPoint)=>Number.isFinite(p.wavelength)&&Number.isFinite(p.intensity)&&p.wavelength>=FEATURE_CURSOR_FRAME.minimum&&p.wavelength<=FEATURE_CURSOR_FRAME.maximum&&p.intensity>=0&&p.intensity<=1;
export function featureCursorPoint(x:number,y:number):FeatureCursorPoint|null{
 const f=FEATURE_CURSOR_FRAME;if(!Number.isFinite(x)||!Number.isFinite(y)||x<f.left||x>f.right||y<f.top||y>f.bottom)return null;
 return Object.freeze({wavelength:f.minimum+(x-f.left)/(f.right-f.left)*(f.maximum-f.minimum),intensity:(f.bottom-y)/(f.bottom-f.top)});
}
export function featureCursorLocation(p:FeatureCursorPoint):Readonly<{x:number;y:number}>|null{
 if(!validPoint(p))return null;const f=FEATURE_CURSOR_FRAME;return Object.freeze({x:f.left+(p.wavelength-f.minimum)/(f.maximum-f.minimum)*(f.right-f.left),y:f.bottom-p.intensity*(f.bottom-f.top)});
}
export function moveFeatureCursor(p:FeatureCursorPoint,key:'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown',large=false):FeatureCursorPoint{
 if(!validPoint(p))throw new FeatureCursorError();const horizontal=large?10:1,vertical=large ? .1 : .01;
 return Object.freeze({wavelength:Math.max(FEATURE_CURSOR_FRAME.minimum,Math.min(FEATURE_CURSOR_FRAME.maximum,p.wavelength+(key==='ArrowLeft'?-horizontal:key==='ArrowRight'?horizontal:0))),intensity:Math.max(0,Math.min(1,p.intensity+(key==='ArrowUp'?vertical:key==='ArrowDown'?-vertical:0)))});
}
const decimal=(value:number)=>Number(value.toFixed(6)).toString();
const draftNumber=(text:string)=>{try{return featureDraftNumber(text);}catch{return NaN;}};
export function hasFeatureCenter(draft:FeatureDraft):boolean{const center=draftNumber(draft.center);return Number.isFinite(center)&&center>FEATURE_CURSOR_FRAME.minimum&&center<FEATURE_CURSOR_FRAME.maximum;}
/** Explicit user marks only. A new center clears draft shoulders to avoid
 * carrying a different region forward;confirmed width records are untouched. */
export function markFeatureDraft(draft:FeatureDraft,mode:'center'|'shoulder',point:FeatureCursorPoint):FeatureDraft{
 if(!validPoint(point))throw new FeatureCursorError();
 const wavelength=decimal(point.wavelength),intensity=decimal(point.intensity),w=Number(wavelength),i=Number(intensity);
 if(mode==='center'){
  if(w<=FEATURE_CURSOR_FRAME.minimum||w>=FEATURE_CURSOR_FRAME.maximum)throw new FeatureCursorError();
  return Object.freeze({...draft,center:wavelength,left:'',leftContinuum:'',right:'',rightContinuum:''});
 }
 const center=draftNumber(draft.center);if(!hasFeatureCenter(draft)||i<=0||w===center)throw new FeatureCursorError();
 return Object.freeze(w<center?{...draft,left:wavelength,leftContinuum:intensity}:{...draft,right:wavelength,rightContinuum:intensity});
}
export function featureDraftMarkers(draft:FeatureDraft):Readonly<{center:number|null;left:FeatureCursorPoint|null;right:FeatureCursorPoint|null}>{
 const point=(w:string,i:string)=>{const p={wavelength:draftNumber(w),intensity:draftNumber(i)};return validPoint(p)&&p.intensity>0?Object.freeze(p):null;};
 return Object.freeze({center:hasFeatureCenter(draft)?draftNumber(draft.center):null,left:point(draft.left,draft.leftContinuum),right:point(draft.right,draft.rightContinuum)});
}
