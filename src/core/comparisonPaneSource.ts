import{hasFeatureCenter}from'./featureCursor';
import type{FluxChoice}from'./comparisonProbe';import{comparisonFeatureDraft,type FeatureComparisonDraft}from'./comparisonFeatureGeometry';import{comparisonFeatureGeometry}from'./comparisonFeatureGeometry';import{comparisonMarkLocation}from'./comparisonFeatureEditing';import type{InspectionKind}from'./comparisonInspection';import type{ClassificationViewport}from'./classificationViewport';
/** Native0x50670f..0x506819 resolves pane baseline to actual unknown or
 * current/next atlas row. Categorical roles replace global nativeY. The
 * combined bottom renders unknown but this resolver still selects lower;
 * automatic switching there is intentionally not inferred. */
export function automaticPaneRole(pane:string):'upper'|'unknown'|'lower'|null{
 const[role,kind,...rest]=pane.split(':');return !rest.length&&['upper','unknown','lower'].includes(role)&&['photo','sampled-trace','printed-trace'].includes(kind)?role as 'upper'|'unknown'|'lower':null;
}
export function automaticPaneTarget(binding:FeatureComparisonDraft|null,choice:FluxChoice,pane:string):boolean{
 return !!(binding?.editing?.autoSource&&binding.editing.mode==='center'&&automaticPaneRole(pane)===choice.role&&binding.editing.targets?.includes(choice));
}
/** Native0x509cf4..0x509d90:vertical across three125-row panes,
 * horizontal X+-10 in the center's pane. Separate SVGs/continuous coordinates,
 * geometric clipping and existing normalized printed axis are browser adapters. */
export function globalComparisonGeometry(binding:FeatureComparisonDraft|null,pane:string,kind:InspectionKind,view:ClassificationViewport){
 if(!binding?.marker||!hasFeatureCenter(binding.draft)||!comparisonFeatureDraft(binding,binding.choice))return null;
 const marker=binding.marker;if(!marker.pane||!Number.isFinite(marker.point.wavelength)||!Number.isFinite(marker.point.intensity)||marker.point.intensity<0||marker.point.intensity>1.25||Number(binding.draft.center)!==marker.point.wavelength)return null;
 const{frame}=comparisonFeatureGeometry(binding.draft,kind,view),point=comparisonMarkLocation(marker.point,kind,view);
 if(point.x<frame.x||point.x>frame.x+frame.width)return null;
 return Object.freeze({frame,x:point.x,cross:marker.pane===pane?Object.freeze({x1:point.x-frame.width/50,x2:point.x+frame.width/50,y:point.y}):null});
}
