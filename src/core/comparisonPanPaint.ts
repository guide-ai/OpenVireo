import{comparisonFeatureDraft,type FeatureComparisonDraft}from'./comparisonFeatureGeometry';
import{FEATURE_DRAFT_FIELDS,regionFromDraft,type FeatureDraft}from'./featureWidth';
import{panClassification,viewportStep,type ClassificationViewport}from'./classificationViewport';
/** Native pan0x50abe8..0x50ac64 /0x50adc0..0x50ae3c clears BOTH
 * shoulder Xflags unless right<=maximum AND left>=minimum; retained
 * wavelength/continuum scalars are untouched. This snapshot implements that
 * pair predicate for an unchanged complete pane-bound browser region only.
 * It is not the native integerX/Y,paint-guard or Extended lifecycle. */
export type ComparisonPanPaint=Readonly<{choice:FeatureComparisonDraft['choice'];draft:FeatureDraft;point:NonNullable<FeatureComparisonDraft['marker']>['point'];pane:string;revision:number|undefined;context:string|undefined;view:ClassificationViewport;hideShoulders:boolean}>;
export function panComparisonPaint(binding:FeatureComparisonDraft|null,view:ClassificationViewport):ComparisonPanPaint|null{
 viewportStep(view);if(!binding?.marker||!binding.marker.pane||!comparisonFeatureDraft(binding,binding.choice))return null;
 try{const r=regionFromDraft(binding.draft);if(binding.marker.point.wavelength!==r.center||!Number.isFinite(binding.marker.point.intensity)||binding.marker.point.intensity<0||binding.marker.point.intensity>1.25)return null;return Object.freeze({choice:binding.choice,draft:Object.freeze({...binding.draft}),point:binding.marker.point,pane:binding.marker.pane,revision:binding.markRevision,context:binding.context,view,hideShoulders:r.right>view.maximum||r.left<view.minimum});}catch{return null;}
}
/** The retained numeric draft is never replaced by this presentation state.
 * Any explicit new mark/numeric/source/context/view transition retires it;
 * repaint,Inspect,reverse and scrolling alone do not. */
export function comparisonPanHidesShoulders(paint:ComparisonPanPaint|null,binding:FeatureComparisonDraft|null,view:ClassificationViewport):boolean{
 return !!(paint?.hideShoulders&&binding?.marker&&paint.view===view&&paint.choice===binding.choice&&paint.context===binding.context&&paint.point===binding.marker.point&&paint.pane===binding.marker.pane&&paint.revision===binding.markRevision&&comparisonFeatureDraft(binding,binding.choice)&&['unknownId',...FEATURE_DRAFT_FIELDS].every(k=>paint.draft[k as keyof FeatureDraft]===binding.draft[k as keyof FeatureDraft]));
}

/** One pure owner keeps successive/batched view actions and paint snapshots
 * synchronized. No-op zoom preserves the existing paint state. */
export type ComparisonPaintWindow=Readonly<{view:ClassificationViewport;paint:ComparisonPanPaint|null}>;
export function setComparisonWindow(state:ComparisonPaintWindow,update:ClassificationViewport|((view:ClassificationViewport)=>ClassificationViewport)):ComparisonPaintWindow{
 const view=typeof update==='function'?update(state.view):update;viewportStep(view);return view===state.view?state:Object.freeze({view,paint:null});
}
export function panComparisonWindow(state:ComparisonPaintWindow,binding:FeatureComparisonDraft|null,direction:'left'|'right'):ComparisonPaintWindow{
 const view=panClassification(state.view,direction);return view.minimum===state.view.minimum&&view.maximum===state.view.maximum?state:Object.freeze({view,paint:panComparisonPaint(binding,view)});
}
