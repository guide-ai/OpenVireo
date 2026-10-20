import{roundNearestEven}from'./numericPolicy';
/** Static recovery: CLEA_VEO.exe 781bc970…c54c, 0x507a08,
 * 0x50a6e0/0x50a8c4/0x50aab4/0x50ac88/0x50ae60.
 * Bounded 3900–4500 profile. Number arithmetic, not an x87 oracle.
 * Diagnostic-line centering is a web adapter for the native cursor column. */
export type ClassificationViewport=Readonly<{minimum:number;maximum:number;zoom:1|2|4|8|16;center:number}>;
export const FULL_CLASSIFICATION_VIEW:ClassificationViewport=Object.freeze({minimum:3900,maximum:4500,zoom:1,center:4200});
function check(v:ClassificationViewport){if(!v||![1,2,4,8,16].includes(v.zoom)||!Number.isInteger(v.minimum)||!Number.isInteger(v.maximum)||v.minimum<3900||v.maximum>4500||v.minimum>=v.maximum||!Number.isFinite(v.center))throw new RangeError('Invalid classification viewport');}
function range(minimum:number,maximum:number,zoom:ClassificationViewport['zoom'],center:number):ClassificationViewport{
 minimum=roundNearestEven(minimum);maximum=roundNearestEven(maximum);const width=maximum-minimum;
 if(minimum<3900){minimum=3900;maximum=minimum+width;}else if(maximum>4500){maximum=4500;minimum=maximum-width;}
 const result=Object.freeze({minimum,maximum,zoom,center});check(result);return result;
}
export function viewportStep(v:ClassificationViewport){check(v);return(v.maximum-v.minimum)/500;}
/** Native marker columns 1..499; zero is the no-marker sentinel. */
export function visibleViewportMarker(v:ClassificationViewport,wavelength:number|null){check(v);if(wavelength===null||!Number.isFinite(wavelength))return null;const column=roundNearestEven((wavelength-v.minimum)/viewportStep(v));return column>0&&column<500?v.minimum+column*viewportStep(v):null;}
export function zoomClassification(v:ClassificationViewport,direction:'in'|'out',marker:number|null=null):ClassificationViewport{
 check(v);if(direction!=='in'&&direction!=='out')throw new RangeError('Invalid zoom direction');if(direction==='in'&&v.zoom===16||direction==='out'&&v.zoom===1)return v;
 const marked=visibleViewportMarker(v,marker),center=marked??(direction==='in'?(v.minimum+v.maximum)/2:v.center),half=(v.maximum-v.minimum)/(direction==='in'?4:1),zoom=(direction==='in'?v.zoom*2:v.zoom/2)as ClassificationViewport['zoom'];
 if(zoom===1)return Object.freeze({...FULL_CLASSIFICATION_VIEW,center});return range(center-half,center+half,zoom,center);
}
export function panClassification(v:ClassificationViewport,direction:'left'|'right'):ClassificationViewport{
 check(v);if(direction!=='left'&&direction!=='right')throw new RangeError('Invalid pan direction');if(v.zoom===1)return v;const width=v.maximum-v.minimum;
 const minimum=direction==='left'?Math.max(3900,roundNearestEven(v.minimum-width*.1)):Math.min(4500,roundNearestEven(v.maximum+width*.1))-width;
 return range(minimum,minimum+width,v.zoom,minimum+width/2);
}
export function viewportTicks(v:ClassificationViewport){check(v);return Array.from({length:7},(_,i)=>v.minimum+(v.maximum-v.minimum)*i/6);}
