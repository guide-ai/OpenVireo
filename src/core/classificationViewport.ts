import{roundNearestEven}from'./numericPolicy';
/** Static recovery: CLEA_VEO.exe781bc970…c54c,0x507a08 and
 * 0x50a6e0/0x50a8c4/0x50aab4/0x50ac88/0x50ae60. Range dialog
 * 0x50c994..0x50cf78:3500+100*position,100minimum separation.
 * Number/display lifecycle adapters;not native x87/VCL equivalence. */
export type ClassificationRange=Readonly<{minimum:number;maximum:number}>;
export type ClassificationViewport=Readonly<{minimum:number;maximum:number;zoom:1|2|4|8|16;center:number;limits?:ClassificationRange}>;
const DEFAULT_BOUNDS=Object.freeze({minimum:3900,maximum:4500});
export const FULL_CLASSIFICATION_VIEW:ClassificationViewport=Object.freeze({...DEFAULT_BOUNDS,zoom:1,center:4200});
function validBounds(b:ClassificationRange){return b&&Number.isInteger(b.minimum)&&Number.isInteger(b.maximum)&&b.minimum>=3500&&b.maximum<=7400&&b.minimum%100===0&&b.maximum%100===0&&b.maximum-b.minimum>=100;}
function check(v:ClassificationViewport){const b=v?.limits??DEFAULT_BOUNDS;if(!validBounds(b)||!v||![1,2,4,8,16].includes(v.zoom)||!Number.isInteger(v.minimum)||!Number.isInteger(v.maximum)||v.minimum<b.minimum||v.maximum>b.maximum||v.minimum>=v.maximum||!Number.isFinite(v.center))throw new RangeError('Invalid classification viewport');}
export function classificationBounds(v:ClassificationViewport):ClassificationRange{check(v);return v.limits??DEFAULT_BOUNDS;}
/** Explicit range input retains native100Å choices;no source extrapolation. */
export function classificationRangeView(minimumText:string,maximumText:string):ClassificationViewport{
 if(typeof minimumText!=='string'||typeof maximumText!=='string'||!/^\d{4}$/.test(minimumText)||!/^\d{4}$/.test(maximumText))throw new RangeError('Invalid classification range');
 const b=Object.freeze({minimum:Number(minimumText),maximum:Number(maximumText)});if(!validBounds(b))throw new RangeError('Invalid classification range');
 return b.minimum===3900&&b.maximum===4500?FULL_CLASSIFICATION_VIEW:Object.freeze({...b,zoom:1 as const,center:(b.minimum+b.maximum)/2,limits:b});
}
export function resetClassificationView(v:ClassificationViewport){const b=classificationBounds(v);return classificationRangeView(String(b.minimum),String(b.maximum));}
function range(minimum:number,maximum:number,zoom:ClassificationViewport['zoom'],center:number,parent:ClassificationViewport):ClassificationViewport{
 const b=classificationBounds(parent);minimum=roundNearestEven(minimum);maximum=roundNearestEven(maximum);const width=maximum-minimum;
 if(minimum<b.minimum){minimum=b.minimum;maximum=minimum+width;}else if(maximum>b.maximum){maximum=b.maximum;minimum=maximum-width;}
 const result=Object.freeze({minimum,maximum,zoom,center,...(parent.limits?{limits:parent.limits}:{})});check(result);return result;
}
export function viewportStep(v:ClassificationViewport){check(v);return(v.maximum-v.minimum)/500;}
/** Native marker columns1..499;zero is the no-marker sentinel. */
export function visibleViewportMarker(v:ClassificationViewport,wavelength:number|null){check(v);if(wavelength===null||!Number.isFinite(wavelength))return null;const column=roundNearestEven((wavelength-v.minimum)/viewportStep(v));return column>0&&column<500?v.minimum+column*viewportStep(v):null;}
export function zoomClassification(v:ClassificationViewport,direction:'in'|'out',marker:number|null=null):ClassificationViewport{
 check(v);if(direction!=='in'&&direction!=='out')throw new RangeError('Invalid zoom direction');if(direction==='in'&&v.zoom===16||direction==='out'&&v.zoom===1)return v;
 const marked=visibleViewportMarker(v,marker),center=marked??(direction==='in'?(v.minimum+v.maximum)/2:v.center),half=(v.maximum-v.minimum)/(direction==='in'?4:1),zoom=(direction==='in'?v.zoom*2:v.zoom/2)as ClassificationViewport['zoom'];
 if(zoom===1)return Object.freeze({...resetClassificationView(v),center});return range(center-half,center+half,zoom,center,v);
}
export function panClassification(v:ClassificationViewport,direction:'left'|'right'):ClassificationViewport{
 const b=classificationBounds(v);if(direction!=='left'&&direction!=='right')throw new RangeError('Invalid pan direction');if(v.zoom===1)return v;const width=v.maximum-v.minimum;
 const minimum=direction==='left'?Math.max(b.minimum,roundNearestEven(v.minimum-width*.1)):Math.min(b.maximum,roundNearestEven(v.maximum+width*.1))-width;
 return range(minimum,minimum+width,v.zoom,minimum+width/2,v);
}
export function viewportTicks(v:ClassificationViewport){check(v);return Array.from({length:7},(_,i)=>v.minimum+(v.maximum-v.minimum)*i/6);}
/** Front S2 round 3 (D2): Classify shows VIREO's one active range (TSpClassify FormShow 0x507814 reads env+0x2bd4/+0x2bd8),
 * the page's spectrometer range, at 1×. */
export function classificationViewOfRange(r:ClassificationRange):ClassificationViewport{return classificationRangeView(String(r.minimum),String(r.maximum));}
