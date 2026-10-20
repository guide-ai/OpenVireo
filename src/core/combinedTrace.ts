import{roundNearestEven}from'./numericPolicy';
import type{samplePhotographicSpectrum}from'./photoSpectrum';
/** CLEA_VEO.exe781bc970…c54c,0x508678–0x5088b4. Combined mode
 * uses the unknown's500sample positive maximum,then100pixel amplitude.
 * Reverse-display writes photo flags only;this trace stays uninverted.
 * Source/range hashes and Number/GDI limits:docs/COMBINED-SPECTRUM.md. */
export const COMBINED_TRACE_POLICY='VIREO-combined-trace-Number-v1';
export class CombinedTraceError extends Error{constructor(){super('Combined trace height outside admitted integer range');this.name='CombinedTraceError';}}
export function combinedTrace(sampled:ReturnType<typeof samplePhotographicSpectrum>){
 if(!sampled||!Number.isFinite(sampled.peak)||sampled.peak<=0||sampled.columns.length!==500)throw new CombinedTraceError();
 const columns=sampled.columns.map(p=>{const height=roundNearestEven(p.intensity/sampled.peak*100),y=125-height;if(!Number.isSafeInteger(height)||!Number.isSafeInteger(y)||height< -2147483648||height>2147483647||y< -2147483648||y>2147483647)throw new CombinedTraceError();return Object.freeze({...p,height,y});});
 return Object.freeze({policy:COMBINED_TRACE_POLICY,peak:sampled.peak,columns:Object.freeze(columns)});
}

/** Same recovered100pixel transfer for upper/unknown/lower in native mode0;
 * standard0x508b88–0x508dc0,unknown0x508678. Initial trace flags remainfalse.
 * Dossier:docs/SAMPLED-INTENSITY-TRACES-PROVENANCE.json. */
export const SAMPLED_TRACE_POLICY='VIREO-sampled-trace-Number-v1';
export function sampledIntensityTrace(sampled:ReturnType<typeof samplePhotographicSpectrum>){const trace=combinedTrace(sampled);return Object.freeze({...trace,policy:SAMPLED_TRACE_POLICY});}
