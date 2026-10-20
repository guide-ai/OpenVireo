import type{ClassificationRange}from'./classificationViewport';
import {classificationCoverage,type ClassificationExternalSource} from './classification';
import {featureSpectrum} from './featureWidth';
import {sampleFluxGrid,SpectrumProbeError} from './spectrumProbe';
import type {UniformSpectrum} from './acquisition';
/** Reuses VIREO-EW-ST-08/09/10;see docs/LOADED-FLUX.md for hashes,
 * native endpoint/selected-unknown calls and browser admission differences. */
export const LOADED_FLUX_POLICY='VIREO-loaded-flux-Number-v1';
// Two-decimal independent rounding of endpoints/interior coordinates contributes
// at most0.01Å displacement from the reconstructed endpoint line. The tiny
// absolute allowance handles Number subtraction. A separate1%channel cap keeps
// fine-grid offsets small;both admission limits are new,not native.
export const LOADED_GRID_TOLERANCE=.01,LOADED_GRID_CHANNEL_FRACTION=.01,LOADED_GRID_ROUNDOFF=1e-9;
const brand=Symbol('loaded spectral flux probe');
export type LoadedFluxProbe=Readonly<{[brand]:true;policy:typeof LOADED_FLUX_POLICY;grid:UniformSpectrum;source:Readonly<{probeId:string;kind:ClassificationExternalSource['kind'];label:string;file:string;sha256:string;acquisitionId?:string}>}>;
/** Trusted IO must hash/reparse imported bytes or replay an acquisition journal
 * before calling this pure adapter. Header/name/hash alone never grants acquired
 * or original-practice origin. Identity is constructed from explicit source kind. */
export function prepareLoadedFluxProbe(input:ClassificationExternalSource):LoadedFluxProbe{
 if(!input||!['imported-spectrum','catalog-star-acquisition'].includes(input.kind)||typeof input.sha256!=='string'||!/^[a-f0-9]{64}$/.test(input.sha256)||typeof input.name!=='string'||!input.name.length||input.name.length>1024)throw new SpectrumProbeError('source');
 const acquired=input.kind==='catalog-star-acquisition';
 if(acquired&&!/^[a-f0-9]{64}$/.test(input.acquisitionId))throw new SpectrumProbeError('source');
 if(!classificationCoverage(input.samples)||input.samples.length<3)throw new SpectrumProbeError('grid');
 let grid:UniformSpectrum;try{grid=featureSpectrum(input.samples);}catch{throw new SpectrumProbeError('grid');}
 const tolerance=Math.min(LOADED_GRID_TOLERANCE,LOADED_GRID_CHANNEL_FRACTION*grid.step)+LOADED_GRID_ROUNDOFF;
 if(input.samples.some((p,i)=>Math.abs(p.wavelength-(grid.minimum+i*grid.step))>tolerance))throw new SpectrumProbeError('grid');
 const source=Object.freeze({probeId:acquired?'acquired:'+input.acquisitionId:'imported:'+input.sha256,kind:input.kind,label:input.name,file:input.name,sha256:input.sha256,...(acquired?{acquisitionId:input.acquisitionId}:{})});
 return Object.freeze({[brand]:true as const,policy:LOADED_FLUX_POLICY,source,grid});
}
export function sampleLoadedFlux(probe:LoadedFluxProbe,wavelengthText:string,bounds?:ClassificationRange){
 if(!probe||probe[brand]!==true)throw new SpectrumProbeError('source');
 return Object.freeze({policy:LOADED_FLUX_POLICY,sourceId:probe.source.probeId,sourceKind:probe.source.kind,sha256:probe.source.sha256,...(probe.source.acquisitionId?{acquisitionId:probe.source.acquisitionId}:{}),...sampleFluxGrid(probe.grid,wavelengthText,bounds)});
}
