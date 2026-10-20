import{roundNearestEven}from'./numericPolicy';import{classificationBounds,viewportStep,type ClassificationViewport}from'./classificationViewport';import{readComparisonFlux,type FluxChoice}from'./comparisonProbe';import{SpectrumProbeError}from'./spectrumProbe';
export type InspectionKind='photo'|'sampled-trace'|'printed-trace';
export type InspectionPosition=Readonly<{column:number;y:number}>;
/** Original 0x5094cc/0x509530/0x50956c held/read/release,
 * 0x5096dc +0x509eac pixel lambda and photo-vs-Y readout.
 * Fixed500 columns; responsive SVG mapping and printed trace ordinate are
 * browser adapters. Full provenance:docs/COMPARISON-INSPECTION.md. */
export function inspectionPosition(x:number,y:number,height:number,columnRule:'nearest'|'painted'='nearest'):InspectionPosition|null{
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(height)||height<=0||x<0||x>=500||y<0||y>height)return null;
 return Object.freeze({column:Math.min(499,columnRule==='painted'?Math.floor(x):roundNearestEven(x)),y:roundNearestEven(y)});
}
export function inspectComparison(choice:FluxChoice,view:ClassificationViewport,kind:InspectionKind,point:InspectionPosition,height:number){
 if(!['photo','sampled-trace','printed-trace'].includes(kind)||!Number.isInteger(point.column)||point.column<0||point.column>499||!Number.isInteger(point.y)||point.y<0||point.y>height||!Number.isFinite(height)||height<=0)throw new RangeError('Invalid inspection position');
 const wavelength=view.minimum+point.column*viewportStep(view),probe=choice.preparation.probe;if(!probe)throw new SpectrumProbeError(choice.preparation.error??'source');
 const intensity=kind==='photo'?readComparisonFlux(probe,String(wavelength),classificationBounds(view)).intensity:kind==='sampled-trace'?(height-point.y)/100:(height-point.y)/height;
 return Object.freeze({sourceId:choice.sourceId,sha256:probe.source.sha256,label:choice.label,role:choice.role,kind,wavelength,intensity,...point,minimum:view.minimum,maximum:view.maximum});
}
export type ComparisonInspection=ReturnType<typeof inspectComparison>;
export function moveInspectionPosition(point:InspectionPosition,key:'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown',height:number):InspectionPosition{
 return Object.freeze({column:Math.max(0,Math.min(499,point.column+(key==='ArrowLeft'?-1:key==='ArrowRight'?1:0))),y:Math.max(0,Math.min(height,point.y+(key==='ArrowUp'?-1:key==='ArrowDown'?1:0)))});
}

export function inspectionStart(view:ClassificationViewport,marker:number|null,height:number):InspectionPosition{const step=viewportStep(view);if(!Number.isFinite(height)||height<=0)throw new RangeError('Invalid inspection height');const column=marker===null||!Number.isFinite(marker)?0:roundNearestEven((marker-view.minimum)/step);return Object.freeze({column:column>=0&&column<500?column:0,y:roundNearestEven(height/2)});}

export type InspectionEntry=Readonly<{context:string;owner?:string;reading:ComparisonInspection}>;
export function inspectionInContext(entry:InspectionEntry|null,context:string):ComparisonInspection|null{return entry?.context===context?entry.reading:null;}
