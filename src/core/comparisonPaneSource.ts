import{hasFeatureCenter}from'./featureCursor';
import type{FluxChoice}from'./comparisonProbe';import{comparisonFeatureDraft,type FeatureComparisonDraft}from'./comparisonFeatureGeometry';import{comparisonFeatureGeometry}from'./comparisonFeatureGeometry';import{comparisonMarkLocation}from'./comparisonFeatureEditing';import type{InspectionKind}from'./comparisonInspection';import type{ClassificationViewport}from'./classificationViewport';
/** Native0x50670f..0x506819 resolves pane baseline to actual unknown or
 * current/next atlas row. Categorical roles replace global nativeY. The
 * combined bottom renders unknown but resolves the next atlas row. Width
 * entry uses normal Show;combined mode remains an unguarded later action. */
export function automaticPaneRole(pane:string):'upper'|'unknown'|'lower'|null{
 if(pane==='unknown:combined-trace')return'lower';
 const[role,kind,...rest]=pane.split(':');return !rest.length&&['upper','unknown','lower'].includes(role)&&['photo','sampled-trace','printed-trace'].includes(kind)?role as 'upper'|'unknown'|'lower':null;
}
function renderedAssociation(choice:FluxChoice){const p=choice.preparation.probe,s=choice.spectrum;return !!(p&&s&&choice.sourceId===p.source.probeId&&s.sha256===p.source.sha256);}
/** Actual width source selected by native pane,not necessarily displayed flux. */
export function automaticWidthChoice(binding:FeatureComparisonDraft|null,rendered:FluxChoice,pane:string):FluxChoice|null{
 const e=binding?.editing;if(!e?.autoSource||e.mode!=='center')return null;
 if(pane==='unknown:combined-trace')return rendered.role==='unknown'&&renderedAssociation(rendered)?e.targets?.find(c=>c.role==='lower')??null:null;
 return automaticPaneRole(pane)===rendered.role&&e.targets?.includes(rendered)?rendered:null;
}
export function automaticPaneTarget(binding:FeatureComparisonDraft|null,choice:FluxChoice,pane:string):boolean{return !!automaticWidthChoice(binding,choice,pane);}
/** Retained lower-source marks belong only to the bound bottom representation.
 * The same unknown's photograph must never inherit a lower-standard draft. */
export function combinedLowerBinding(binding:FeatureComparisonDraft|null|undefined,rendered:FluxChoice,pane='unknown:combined-trace'):boolean{
 return !!(binding?.marker?.pane===pane&&pane==='unknown:combined-trace'&&binding.choice.role==='lower'&&rendered.role==='unknown'&&renderedAssociation(rendered)&&comparisonFeatureDraft(binding,binding.choice));
}
export function comparisonEditingChoice(binding:FeatureComparisonDraft|null,rendered:FluxChoice,pane:string):FluxChoice|null{
 if(!binding?.editing)return null;const target=automaticWidthChoice(binding,rendered,pane);if(pane==='unknown:combined-trace'&&binding.editing.autoSource&&binding.editing.mode==='center')return target;if(target)return target;
 if(combinedLowerBinding(binding,rendered,pane)&&binding.editing.originPane===pane)return binding.choice;
 return comparisonFeatureDraft(binding,rendered)?rendered:null;
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
