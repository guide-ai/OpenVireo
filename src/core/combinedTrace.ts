import{roundNearestEven}from'./numericPolicy';
import type{samplePhotographicSpectrum}from'./photoSpectrum';
/** CLEA_VEO.exe781bc970…c54c,0x508678–0x5088b4. Combined mode
 * uses the unknown's500sample positive maximum,then100pixel amplitude.
 * Trace flag+496 (unknown,0x508796–0x5087c1) takes Single1.0 minus the
 * normalized value before ×100/rounding;photo reverse (+495/+497) is separate.
 * Source/range hashes and Number/GDI limits:docs/COMBINED-SPECTRUM.md. */
export const COMBINED_TRACE_POLICY='VIREO-combined-trace-Number-v1';
export class CombinedTraceError extends Error{constructor(){super('Combined trace height outside admitted integer range');this.name='CombinedTraceError';}}
export function combinedTrace(sampled:ReturnType<typeof samplePhotographicSpectrum>,reverse=false){
 if(typeof reverse!=='boolean'||!sampled||!Number.isFinite(sampled.peak)||sampled.peak<=0||sampled.columns.length!==500)throw new CombinedTraceError();
 const columns=sampled.columns.map(p=>{const height=reverse?roundNearestEven((1-p.intensity/sampled.peak)*100):roundNearestEven(p.intensity/sampled.peak*100),y=125-height;if(!Number.isSafeInteger(height)||!Number.isSafeInteger(y)||height< -2147483648||height>2147483647||y< -2147483648||y>2147483647)throw new CombinedTraceError();return Object.freeze({...p,height,y});});
 return Object.freeze({policy:COMBINED_TRACE_POLICY,peak:sampled.peak,columns:Object.freeze(columns)});
}

/** Same recovered100pixel transfer for upper/unknown/lower in native mode0;
 * standard0x508b88–0x508dc0,unknown0x508678. Trace flags start false;the
 * optional reverse display branch (+498 standards,0x508c87–0x508cb0) is the
 * same display routine,so policy IDs are unchanged.
 * Dossier:docs/SAMPLED-INTENSITY-TRACES-PROVENANCE.json. */
export const SAMPLED_TRACE_POLICY='VIREO-sampled-trace-Number-v1';
export function sampledIntensityTrace(sampled:ReturnType<typeof samplePhotographicSpectrum>,reverse=false){const trace=combinedTrace(sampled,reverse);return Object.freeze({...trace,policy:SAMPLED_TRACE_POLICY});}
