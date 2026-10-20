import {CLASSIFICATION_CATALOG} from './classification';
import {sampleUniformSpectrum,type UniformSpectrum} from './acquisition';
import {featureSpectrum,featureDraftNumber,FEATURE_WAVELENGTH_MIN,FEATURE_WAVELENGTH_MAX} from './featureWidth';
import type {Sample} from './spectrum';
/** Original selected-source calls0x50983d/0x509876/0x5098c5 ->0x55dfe0.
 * VIREO-EW-ST-08 [0x5096dc,0x509f24); SHA781bc970…c54c.
 * Full hashes/role mapping: docs/SAMPLED-FLUX-PROVENANCE.json.
 * Numeric entry replaces native pixel selection;no photographic renderer orx87 oracle. */
export const SPECTRUM_PROBE_POLICY='VIREO-original-flux-Number-v1';
export const practiceProbeId=(id:string)=>`practice:${id}`;
export const standardProbeId=(atlasId:string,id:string)=>`standard:${atlasId}:${id}`;
export const ORIGINAL_PROBE_SOURCES=Object.freeze([
 ...CLASSIFICATION_CATALOG.practice.map(p=>Object.freeze({...p,probeId:practiceProbeId(p.id),kind:'practice' as const})),
 ...CLASSIFICATION_CATALOG.atlases.flatMap(a=>a.standards.map(p=>Object.freeze({...p,probeId:standardProbeId(a.id,p.id),kind:'standard' as const})))
]);
export type OriginalProbeSource=typeof ORIGINAL_PROBE_SOURCES[number];
export type VerifiedProbeSpectrum=Readonly<{samples:readonly Sample[];sha256:string}>;
const brand=Symbol('verified original flux probe');
export type OriginalFluxProbe=Readonly<{[brand]:true;source:OriginalProbeSource;grid:UniformSpectrum}>;
export class SpectrumProbeError extends Error{
 readonly code:'source'|'wavelength'|'grid';constructor(code:'source'|'wavelength'|'grid'){super(`Spectrum probe ${code}`);this.name='SpectrumProbeError';this.code=code;}
}
/** Byte verification belongs to loadVerifiedLibrarySpectrum. These checks also
 * prevent accidental slot/hash/grid association. The caller must supply a trusted
 * library-loader result for this catalog identity;this pure API cannot establish
 * byte origin. The UI routes imported/acquired unknowns through the separate loaded policy. */
export function prepareOriginalFluxProbe(id:string,verified:VerifiedProbeSpectrum):OriginalFluxProbe{
 const source=ORIGINAL_PROBE_SOURCES.find(s=>s.probeId===id);
 if(!source||verified.sha256!==source.sha256||verified.samples.length!==source.rows||verified.samples[0]?.wavelength!==source.minimum||verified.samples.at(-1)?.wavelength!==source.maximum)throw new SpectrumProbeError('source');
 try{return Object.freeze({[brand]:true as const,source,grid:featureSpectrum(verified.samples)});}catch{throw new SpectrumProbeError('source');}
}
/** Reuses the original quadratic endpoint-grid sampler,including its1e-5
 * nearest-grid snap. Finite overshoot is reported without normalization/clipping. */
export function sampleOriginalFlux(probe:OriginalFluxProbe,wavelengthText:string){
 if(!probe||probe[brand]!==true)throw new SpectrumProbeError('source');
 return Object.freeze({policy:SPECTRUM_PROBE_POLICY,sourceId:probe.source.probeId,sha256:probe.source.sha256,...sampleFluxGrid(probe.grid,wavelengthText)});
}
/** Shared bounded read only;source authority is supplied by each preparation API. */
export function sampleFluxGrid(grid:UniformSpectrum,wavelengthText:string){
 let wavelength:number;
 try{if(typeof wavelengthText!=='string'||wavelengthText.length>24)throw Error();wavelength=featureDraftNumber(wavelengthText);}catch{throw new SpectrumProbeError('wavelength');}
 if(!Number.isFinite(wavelength)||wavelength<FEATURE_WAVELENGTH_MIN||wavelength>FEATURE_WAVELENGTH_MAX||wavelength<grid.minimum||wavelength>grid.maximum)throw new SpectrumProbeError('wavelength');
 let result;try{result=sampleUniformSpectrum(grid,wavelength);}catch{throw new SpectrumProbeError('wavelength');}if(!result.valid||!Number.isFinite(result.value))throw new SpectrumProbeError('wavelength');
 return Object.freeze({wavelength,intensity:result.value});
}
