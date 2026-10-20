import{prepareOriginalFluxProbe,sampleOriginalFlux,SpectrumProbeError,type OriginalFluxProbe,type VerifiedProbeSpectrum}from'./spectrumProbe';
import{prepareLoadedFluxProbe,sampleLoadedFlux,type LoadedFluxProbe}from'./loadedSpectrumProbe';
import type{ClassificationExternalSource}from'./classification';
export type ComparisonProbe=OriginalFluxProbe|LoadedFluxProbe;
export type FluxChoiceInput=Readonly<{role:'upper'|'unknown'|'lower'|'unknown-trace';sourceId:string;spectrum:VerifiedProbeSpectrum|null;external?:ClassificationExternalSource;label:string}>;
export type ProbePreparation=Readonly<{probe:ComparisonProbe|null;error:SpectrumProbeError['code']|null}>;
export type FluxChoice=FluxChoiceInput&Readonly<{preparation:ProbePreparation}>;
/** Shared trusted-IO association boundary for numerical readout and photo.
 * The parent memoizes one preparation per actual source;neither a name nor a
 * header/hash claim independently establishes original/acquired authority. */
export function prepareFluxChoice(input:FluxChoiceInput):FluxChoice{
 let preparation:ProbePreparation;
 if(!input.spectrum)preparation=Object.freeze({probe:null,error:null});
 else try{
  if(input.external){const expected=input.external.kind==='catalog-star-acquisition'?'acquired:'+input.external.acquisitionId:'imported:'+input.external.sha256;if(input.sourceId!==expected||input.spectrum.sha256!==input.external.sha256||input.spectrum.samples!==input.external.samples)throw new SpectrumProbeError('source');}
  const probe=input.external?prepareLoadedFluxProbe(input.external):prepareOriginalFluxProbe(input.sourceId,input.spectrum);preparation=Object.freeze({probe,error:null});
 }catch(value){preparation=Object.freeze({probe:null,error:value instanceof SpectrumProbeError?value.code:'source'});}
 return Object.freeze({...input,preparation});
}
export function readComparisonFlux(probe:ComparisonProbe,text:string){return 'policy'in probe?sampleLoadedFlux(probe,text):sampleOriginalFlux(probe,text);}
