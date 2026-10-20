import{useId}from'react';import{globalComparisonGeometry}from'./core/comparisonPaneSource';import type{FeatureComparisonDraft}from'./core/comparisonFeatureGeometry';import type{InspectionKind}from'./core/comparisonInspection';import type{ClassificationViewport}from'./core/classificationViewport';
/** One retained manual wavelength across primary panes;cross only at its origin.
 * SVG pane/caption gaps,clipping and outline colors are presentation adapters. */
export default function ComparisonGlobalMark({binding,pane,kind,view}:{binding:FeatureComparisonDraft|null|undefined;pane:string;kind:InspectionKind;view:ClassificationViewport}){
 const id=useId(),g=globalComparisonGeometry(binding??null,pane,kind,view);if(!g)return null;const{frame,x,cross}=g;
 const line=(x1:number,y1:number,x2:number,y2:number)=><><line x1={x1} y1={y1} x2={x2} y2={y2} className="photo-mark-back" vectorEffect="non-scaling-stroke"/><line x1={x1} y1={y1} x2={x2} y2={y2} className="photo-mark-front" vectorEffect="non-scaling-stroke"/></>;
 return <g className="comparison-global-marker" data-global-source={binding!.choice.sourceId} data-global-pane={pane} pointerEvents="none"><defs><clipPath id={id}><path d={`M${frame.x},${frame.y}h${frame.width}v${frame.height}h${-frame.width}Z`}/></clipPath></defs><g clipPath={`url(#${id})`}><g data-global-vertical="true">{line(x,frame.y,x,frame.y+frame.height)}</g>{cross&&<g data-global-cross="true">{line(cross.x1,cross.y,cross.x2,cross.y)}</g>}</g></g>;
}
