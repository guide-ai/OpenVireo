import type {FeatureDraft} from './featureWidth';
/** Trace-height/manual shoulders:VIREO-EW-ST-07/08,0x5096dc–0x509f20.
 * These SVG dimensions and six-decimal draft text are authored presentation,
 * not original Win32 pixel geometry,x87 arithmetic or sampled flux. */
export const FEATURE_CURSOR_FRAME=Object.freeze({left:60,right:920,top:56,bottom:306,minimum:3900,maximum:4500});
export type FeatureCursorPoint=Readonly<{wavelength:number;intensity:number}>;
export type FeatureCursorMode='inspect'|'center'|'shoulder';
export class FeatureCursorError extends Error{}
export const DEFAULT_FEATURE_CURSOR:FeatureCursorPoint=Object.freeze({wavelength:4200,intensity:.5});
const validPoint=(p:FeatureCursorPoint)=>Number.isFinite(p.wavelength)&&Number.isFinite(p.intensity)&&p.wavelength>=3900&&p.wavelength<=4500&&p.intensity>=0&&p.intensity<=1;
export function featureCursorPoint(x:number,y:number):FeatureCursorPoint|null{
 const f=FEATURE_CURSOR_FRAME;if(!Number.isFinite(x)||!Number.isFinite(y)||x<f.left||x>f.right||y<f.top||y>f.bottom)return null;
 return Object.freeze({wavelength:f.minimum+(x-f.left)/(f.right-f.left)*(f.maximum-f.minimum),intensity:(f.bottom-y)/(f.bottom-f.top)});
}
export function featureCursorLocation(p:FeatureCursorPoint):Readonly<{x:number;y:number}>|null{
 if(!validPoint(p))return null;const f=FEATURE_CURSOR_FRAME;return Object.freeze({x:f.left+(p.wavelength-f.minimum)/(f.maximum-f.minimum)*(f.right-f.left),y:f.bottom-p.intensity*(f.bottom-f.top)});
}
export function moveFeatureCursor(p:FeatureCursorPoint,key:'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown',large=false):FeatureCursorPoint{
 if(!validPoint(p))throw new FeatureCursorError();const horizontal=large?10:1,vertical=large ? .1 : .01;
 return Object.freeze({wavelength:Math.max(3900,Math.min(4500,p.wavelength+(key==='ArrowLeft'?-horizontal:key==='ArrowRight'?horizontal:0))),intensity:Math.max(0,Math.min(1,p.intensity+(key==='ArrowUp'?vertical:key==='ArrowDown'?-vertical:0)))});
}
const decimal=(value:number)=>Number(value.toFixed(6)).toString();
const draftNumber=(text:string)=>/^\+?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)?Number(text):NaN;
export function hasFeatureCenter(draft:FeatureDraft):boolean{const center=draftNumber(draft.center);return Number.isFinite(center)&&center>3900&&center<4500;}
/** Explicit user marks only. A new center clears draft shoulders to avoid
 * carrying a different region forward;confirmed width records are untouched. */
export function markFeatureDraft(draft:FeatureDraft,mode:'center'|'shoulder',point:FeatureCursorPoint):FeatureDraft{
 if(!validPoint(point))throw new FeatureCursorError();
 const wavelength=decimal(point.wavelength),intensity=decimal(point.intensity),w=Number(wavelength),i=Number(intensity);
 if(mode==='center'){
  if(w<=3900||w>=4500)throw new FeatureCursorError();
  return Object.freeze({...draft,center:wavelength,left:'',leftContinuum:'',right:'',rightContinuum:''});
 }
 const center=draftNumber(draft.center);if(!hasFeatureCenter(draft)||i<=0||w===center)throw new FeatureCursorError();
 return Object.freeze(w<center?{...draft,left:wavelength,leftContinuum:intensity}:{...draft,right:wavelength,rightContinuum:intensity});
}
export function featureDraftMarkers(draft:FeatureDraft):Readonly<{center:number|null;left:FeatureCursorPoint|null;right:FeatureCursorPoint|null}>{
 const point=(w:string,i:string)=>{const p={wavelength:draftNumber(w),intensity:draftNumber(i)};return validPoint(p)&&p.intensity>0?Object.freeze(p):null;};
 return Object.freeze({center:hasFeatureCenter(draft)?draftNumber(draft.center):null,left:point(draft.left,draft.leftContinuum),right:point(draft.right,draft.rightContinuum)});
}
