import{comparisonFeatureDraft,type FeatureComparisonDraft}from'./comparisonFeatureGeometry';
import{comparisonPanHidesShoulders,type ComparisonPanPaint}from'./comparisonPanPaint';
import{viewportStep,type ClassificationViewport}from'./classificationViewport';
import{FEATURE_DRAFT_FIELDS,type FeatureDraft}from'./featureWidth';import{hasFeatureCenter}from'./featureCursor';import type{FluxChoice}from'./comparisonProbe';
export type WidthCoordinateBlock='pan-cleared'|'center-x-zero'|'center-y-zero';
export type WidthComparisonFrame=Readonly<{view:ClassificationViewport;paint:ComparisonPanPaint|null;printed:boolean;choices:readonly FluxChoice[]}>;
/** OK0x50668b..0x5066fc rejects ANY zero among six coordinate flags
 * before source resolution/integration. We know only these concrete zero
 * cases in the bounded browser state;null is NOT native coordinate validity.
 * Exact endpoints/upper sampled top only;no integer rounding/Yflag emulation. */
export function knownWidthCoordinateBlock(binding:FeatureComparisonDraft|null,view:ClassificationViewport,paint:ComparisonPanPaint|null,followsWindow=true):WidthCoordinateBlock|null{
 viewportStep(view);if(!followsWindow||!binding?.marker||!binding.marker.pane||!hasFeatureCenter(binding.draft)||!comparisonFeatureDraft(binding,binding.choice))return null;
 const{point,pane}=binding.marker;if(!Number.isFinite(point.intensity)||point.intensity<0||point.intensity>1.25||point.wavelength!==Number(binding.draft.center))return null;
 if(comparisonPanHidesShoulders(paint,binding,view))return'pan-cleared';
 if(point.wavelength===view.minimum)return'center-x-zero';
 // Upper125-row pane baseline125,manual C=(baseline-Y)/100 => Y0.
 // Printed SVG has a different authored axis;shared exact pane boundaries
 // and rounded near-zero columns/rows are deliberately not inferred.
 if(binding.choice.role==='upper'&&pane==='upper:sampled-trace'&&point.intensity===1.25)return'center-y-zero';
 return null;
}
export type WidthReviewSnapshot=Readonly<{draft:FeatureDraft;revision:number;context:string|undefined}>;
/** Browser two-phase review:OK rechecks live inputs/coordinate block rather
 * than approving a result computed before a new mark or input change. */
export function captureWidthReview(draft:FeatureDraft,revision:number,context:string|undefined):WidthReviewSnapshot{
 if(!Number.isSafeInteger(revision)||revision<0||['unknownId',...FEATURE_DRAFT_FIELDS].some(k=>typeof draft[k as keyof FeatureDraft]!=='string'))throw new RangeError('Invalid width review snapshot');return Object.freeze({draft:Object.freeze({...draft}),revision,context});
}
export function widthReviewMatches(snapshot:WidthReviewSnapshot,draft:FeatureDraft,revision:number,context:string|undefined):boolean{
 return snapshot.revision===revision&&snapshot.context===context&&['unknownId',...FEATURE_DRAFT_FIELDS].every(k=>snapshot.draft[k as keyof FeatureDraft]===draft[k as keyof FeatureDraft]);
}
