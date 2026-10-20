import{markFeatureDraft,type FeatureCursorPoint}from'./featureCursor';import type{FeatureDraft}from'./featureWidth';import{comparisonFeatureGeometry}from'./comparisonFeatureGeometry';import{viewportStep,type ClassificationViewport}from'./classificationViewport';import type{InspectionKind}from'./comparisonInspection';
export type ComparisonMarkAction='center'|'shoulder';
export class ComparisonMarkError extends Error{constructor(readonly code:'origin'|'input'|'stale'){super(code);}}
/** Native0x509c50 same-panel Y guard;0x5096dc clears old shoulders when
 * the new center selects another panel. Ephemeral pane IDs replace global
 * Win32 Y here;numeric/separate-tool inputs have no proven shared origin. */
export function applyComparisonMark(draft:FeatureDraft,originPane:string|null,pane:string,action:ComparisonMarkAction,point:FeatureCursorPoint){
 if(typeof pane!=='string'||!pane||pane.length>128||!['center','shoulder'].includes(action))throw new ComparisonMarkError('input');
 if(action==='shoulder'&&originPane!==pane)throw new ComparisonMarkError('origin');
 if(!Number.isFinite(point.wavelength)||!Number.isFinite(point.intensity)||point.intensity<0||point.intensity>1.25)throw new ComparisonMarkError('input');
 const base=action==='center'&&originPane!==pane?{...draft,left:'',right:'',leftContinuum:'',rightContinuum:''}:draft;
 try{return Object.freeze({draft:markFeatureDraft(base,action,action==='center'?{...point,intensity:.5}:point),originPane:pane});}catch{throw new ComparisonMarkError('input');}
}
const empty:FeatureDraft=Object.freeze({unknownId:'',center:'',left:'',right:'',leftContinuum:'',rightContinuum:''});
export function comparisonMarkPoint(x:number,y:number,kind:InspectionKind,view:ClassificationViewport):FeatureCursorPoint|null{
 const{frame}=comparisonFeatureGeometry(empty,kind,view);if(!Number.isFinite(x)||!Number.isFinite(y)||x<frame.x||x>frame.x+frame.width||y<frame.y||y>frame.y+frame.height)return null;
 return Object.freeze({wavelength:view.minimum+(x-frame.x)/frame.width*viewportStep(view)*500,intensity:kind==='printed-trace'?(306-y)/250:(frame.baseline-y)/100});
}
export function comparisonMarkLocation(point:FeatureCursorPoint,kind:InspectionKind,view:ClassificationViewport){
 if(!Number.isFinite(point.wavelength)||!Number.isFinite(point.intensity))throw new ComparisonMarkError('input');
 const{frame}=comparisonFeatureGeometry(empty,kind,view);return Object.freeze({x:frame.x+(point.wavelength-view.minimum)/(viewportStep(view)*500)*frame.width,y:kind==='printed-trace'?306-250*point.intensity:frame.baseline-100*point.intensity});
}
/** Browser keyboard adapter:one visible column and.01manual level;Shift10. */
export function moveComparisonMark(point:FeatureCursorPoint,key:'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown',kind:InspectionKind,view:ClassificationViewport,large=false){
 if(!Number.isFinite(point.wavelength)||!Number.isFinite(point.intensity)||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key))throw new ComparisonMarkError('input');
 const{frame}=comparisonFeatureGeometry(empty,kind,view),factor=large?10:1,top=kind==='printed-trace'?1:frame.baseline/100,bottom=kind==='printed-trace'?0:(frame.baseline-frame.height)/100;
 return Object.freeze({wavelength:Math.max(view.minimum,Math.min(view.maximum,point.wavelength+(key==='ArrowLeft'?-1:key==='ArrowRight'?1:0)*viewportStep(view)*factor)),intensity:Math.max(bottom,Math.min(top,point.intensity+(key==='ArrowUp'?1:key==='ArrowDown'?-1:0)*.01*factor))});
}
