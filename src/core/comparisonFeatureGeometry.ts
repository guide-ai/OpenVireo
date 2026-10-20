import{featureDraftMarkers}from'./featureCursor';
import{FEATURE_DRAFT_FIELDS,type FeatureDraft,type FeatureRegion}from'./featureWidth';
import type{FluxChoice}from'./comparisonProbe';
import{viewportStep,type ClassificationViewport}from'./classificationViewport';
import type{InspectionKind}from'./comparisonInspection';
/** Source-bound presentation snapshot; created only after width-source admission.
 * Exact retained choice identity prevents an old asynchronous snapshot from
 * drawing on a replaced source,role,atlas or loaded preparation. */
export type FeatureComparisonDraft=Readonly<{choice:FluxChoice;draft:FeatureDraft}>;
export function comparisonFeatureDraft(binding:FeatureComparisonDraft|null,choice:FluxChoice):FeatureDraft|undefined{
 const p=choice.preparation.probe,s=choice.spectrum;
 return binding?.choice===choice&&p&&s&&choice.sourceId===p.source.probeId&&s.sha256===p.source.sha256?binding.draft:undefined;
}
export function featureRegionDraft(region:FeatureRegion):FeatureDraft{return Object.freeze({unknownId:'',...Object.fromEntries(FEATURE_DRAFT_FIELDS.map(k=>[k,String(region[k])]))})as FeatureDraft;}
/** Native shoulder C=(paneBottom-Y)/100:0x509a63..0x509af8,
 * 0x509eac..0x509f24. Photo band is paneTop+25..paneBottom-15:
 * 0x508a62..0x508a94 /0x508f3c..0x508f6b. Hence local photo
 * Y=100-100*C; sampled trace Y=125-100*C. Printed SVG retains
 * its authored0..1 normalized axis. Continuous projection/clipping is a
 * browser adapter,not native integer-X/sentinel/pan/repaint lifecycle. */
export function comparisonFeatureGeometry(draft:FeatureDraft,kind:InspectionKind,view:ClassificationViewport){
 const step=viewportStep(view);if(!['photo','sampled-trace','printed-trace'].includes(kind))throw new RangeError('Invalid feature projection');
 const printed=kind==='printed-trace',frame=Object.freeze(printed?{x:60,y:56,width:860,height:250,baseline:306}:kind==='photo'?{x:0,y:0,width:500,height:85,baseline:100}:{x:0,y:0,width:500,height:125,baseline:125}),marks=featureDraftMarkers(draft),x=(w:number)=>frame.x+(w-view.minimum)/(step*500)*frame.width,y=(c:number)=>printed?306-250*c:frame.baseline-100*c;
 const left=marks.left?Object.freeze({x:x(marks.left.wavelength),y:y(marks.left.intensity)}):null,right=marks.right?Object.freeze({x:x(marks.right.wavelength),y:y(marks.right.intensity)}):null,center=marks.center===null?null:x(marks.center),connected=!!(marks.left&&marks.right&&marks.center!==null&&marks.left.wavelength<marks.center&&marks.center<marks.right.wavelength);
 return Object.freeze({frame,center,left,right,connected});
}
