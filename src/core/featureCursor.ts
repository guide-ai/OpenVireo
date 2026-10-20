import type {ClassificationRange} from './classificationViewport';
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
export type FeatureCursorWindow=ClassificationRange;
/** Independent manual SVG geometry over the recovered display interval.
 * No native500-column quantization/sentinel is applied to scientific inputs. */
function checkWindow(view:FeatureCursorWindow){if(!view||!Number.isFinite(view.minimum)||!Number.isFinite(view.maximum)||view.minimum<FEATURE_WAVELENGTH_MIN||view.maximum>FEATURE_WAVELENGTH_MAX||view.minimum>=view.maximum)throw new FeatureCursorError();}
export function featureCursorAnchor(view:FeatureCursorWindow,center:number|null):FeatureCursorPoint{
 checkWindow(view);return Object.freeze({wavelength:center!==null&&Number.isFinite(center)&&center>=view.minimum&&center<=view.maximum?center:(view.minimum+view.maximum)/2,intensity:.5});
}
export function featureCursorPoint(x:number,y:number,view:FeatureCursorWindow=FEATURE_CURSOR_FRAME):FeatureCursorPoint|null{
 checkWindow(view);
 const f=FEATURE_CURSOR_FRAME;if(!Number.isFinite(x)||!Number.isFinite(y)||x<f.left||x>f.right||y<f.top||y>f.bottom)return null;
 return Object.freeze({wavelength:view.minimum+(x-f.left)/(f.right-f.left)*(view.maximum-view.minimum),intensity:(f.bottom-y)/(f.bottom-f.top)});
}
export function featureCursorLocation(p:FeatureCursorPoint,view:FeatureCursorWindow=FEATURE_CURSOR_FRAME):Readonly<{x:number;y:number}>|null{
 checkWindow(view);if(!validPoint(p)||p.wavelength<view.minimum||p.wavelength>view.maximum)return null;const f=FEATURE_CURSOR_FRAME;return Object.freeze({x:f.left+(p.wavelength-view.minimum)/(view.maximum-view.minimum)*(f.right-f.left),y:f.bottom-p.intensity*(f.bottom-f.top)});
}
export function moveFeatureCursor(p:FeatureCursorPoint,key:'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown',large=false,view:FeatureCursorWindow=FEATURE_CURSOR_FRAME):FeatureCursorPoint{
 checkWindow(view);if(!validPoint(p))throw new FeatureCursorError();const horizontal=large?10:1,vertical=large ? .1 : .01;
 return Object.freeze({wavelength:Math.max(view.minimum,Math.min(view.maximum,p.wavelength+(key==='ArrowLeft'?-horizontal:key==='ArrowRight'?horizontal:0))),intensity:Math.max(0,Math.min(1,p.intensity+(key==='ArrowUp'?vertical:key==='ArrowDown'?-vertical:0)))});
}
const decimal=(value:number)=>Number(value.toFixed(6)).toString();
const draftNumber=(text:string)=>{try{return featureDraftNumber(text);}catch{return NaN;}};
export function hasFeatureCenter(draft:FeatureDraft):boolean{const center=draftNumber(draft.center);return Number.isFinite(center)&&center>FEATURE_CURSOR_FRAME.minimum&&center<FEATURE_CURSOR_FRAME.maximum;}
/** Original0x5096fd..0x509745 calls the shared guard0x509c50 right first,
 * then left after the right coordinate may have been cleared. In this bounded
 * single-source wavelength adapter,valid pairs stand for present same-panel
 * marks;invalidated X/Y is represented by a blank input pair. Native integer
 * pixels/sentinels and retained Extended scalars are not reproduced.
 * docs/CONDITIONAL-SHOULDERS-PROVENANCE.json. */
export function retainFeatureShoulders(draft:FeatureDraft,center:number){
 if(!Number.isFinite(center)||center<=FEATURE_CURSOR_FRAME.minimum||center>=FEATURE_CURSOR_FRAME.maximum)throw new FeatureCursorError();
 const pair=(w:string,i:string)=>{const p={wavelength:draftNumber(w),intensity:draftNumber(i)};return validPoint(p)&&p.intensity>0?p:null;};
 let left=pair(draft.left,draft.leftContinuum),right=pair(draft.right,draft.rightContinuum);
 const valid=(candidate:FeatureCursorPoint|null)=>!!candidate&&(!right||center<right.wavelength)&&(!left||center>left.wavelength);
 if(!valid(right))right=null;
 if(!valid(left))left=null;
 return Object.freeze({left:left?draft.left:'',leftContinuum:left?draft.leftContinuum:'',right:right?draft.right:'',rightContinuum:right?draft.rightContinuum:''});
}
/** Original measurement uses left center/right shoulder. Explicit tool buttons
 * retain primary-button touch/keyboard use;inspect keeps its context menu. */
export function featurePointerAction(mode:FeatureCursorMode,button:number):FeatureCursorMode|null{if(!['inspect','center','shoulder'].includes(mode))return null;return button===0?mode:button===2&&mode!=='inspect'?'shoulder':null;}
/** Explicit user marks only;confirmed width records are untouched. */
export function markFeatureDraft(draft:FeatureDraft,mode:'center'|'shoulder',point:FeatureCursorPoint):FeatureDraft{
 if(!validPoint(point))throw new FeatureCursorError();
 const wavelength=decimal(point.wavelength),intensity=decimal(point.intensity),w=Number(wavelength),i=Number(intensity);
 if(mode==='center'){
  if(w<=FEATURE_CURSOR_FRAME.minimum||w>=FEATURE_CURSOR_FRAME.maximum)throw new FeatureCursorError();
  return Object.freeze({...draft,center:wavelength,...retainFeatureShoulders(draft,w)});
 }
 const center=draftNumber(draft.center);if(!hasFeatureCenter(draft)||i<=0||w===center)throw new FeatureCursorError();
 return Object.freeze(w<center?{...draft,left:wavelength,leftContinuum:intensity}:{...draft,right:wavelength,rightContinuum:intensity});
}
export function featureDraftMarkers(draft:FeatureDraft):Readonly<{center:number|null;left:FeatureCursorPoint|null;right:FeatureCursorPoint|null}>{
 const point=(w:string,i:string)=>{const p={wavelength:draftNumber(w),intensity:draftNumber(i)};return validPoint(p)&&p.intensity>0?Object.freeze(p):null;};
 return Object.freeze({center:hasFeatureCenter(draft)?draftNumber(draft.center):null,left:point(draft.left,draft.leftContinuum),right:point(draft.right,draft.rightContinuum)});
}
