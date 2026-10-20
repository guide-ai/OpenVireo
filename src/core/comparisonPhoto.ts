import type{ProbePreparation}from'./comparisonProbe';import type{ClassificationViewport}from'./classificationViewport';import{samplePhotographicSpectrum,PhotoSpectrumError}from'./photoSpectrum';
export type ComparisonPhoto=Readonly<{value:ReturnType<typeof samplePhotographicSpectrum>|null;error:'source'|'grid'|'peak'|'display'|null}>;
/** One immutable sampling result shared by unknown photo and combined trace.
 * Identity failures fail closed; display-domain failures retain labelled fallback. */
export function prepareComparisonPhoto(preparation:ProbePreparation,view:ClassificationViewport):ComparisonPhoto{
 if(!preparation.probe)return Object.freeze({value:null,error:preparation.error==='grid'?'grid':'source'});
 try{return Object.freeze({value:samplePhotographicSpectrum(preparation.probe.grid,view),error:null});}catch(error){return Object.freeze({value:null,error:error instanceof PhotoSpectrumError?(error.code==='tone'?'display':error.code):'display'});}
}
