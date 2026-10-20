import{classificationImportDifferenceAllowed}from'./classificationImport';
import{roundNearestEven}from'./numericPolicy';import{samplePhotographicSpectrum,PhotoSpectrumError}from'./photoSpectrum';import type{FluxChoice}from'./comparisonProbe';import type{ClassificationViewport}from'./classificationViewport';
type Sampled=ReturnType<typeof samplePhotographicSpectrum>;
export const SAMPLED_DIFFERENCE_POLICY='VIREO-sampled-difference-Number-v1';
export class SampledDifferenceError extends Error{constructor(readonly code:'samples'|'peak'|'height'){super('Sampled difference: '+code);this.name='SampledDifferenceError';}}
/** CLEA_VEO.exe781bc970…c54c,0x509068–0x5093b5. Separate positive
 * maxima;subtract unrounded normalized samples before100/FISTP. Native
 * lowerzero325,top250 =>localzero75;topclamp plusMoveTo forclippedruns.
 * Number/int32/SVG bounds aredeclared adapters;not x87/GDI equality.
 * Evidence:docs/SAMPLED-DIFFERENCE-PROVENANCE.json. */
export function sampledDifference(standard:Sampled,unknown:Sampled){
 if(!standard||!unknown||standard.columns.length!==500||unknown.columns.length!==500)throw new SampledDifferenceError('samples');
 if(!Number.isFinite(standard.peak)||!Number.isFinite(unknown.peak)||standard.peak<=0||unknown.peak<=0)throw new SampledDifferenceError('peak');
 if(standard.peak!==Math.max(0,...standard.columns.map(p=>p.intensity))||unknown.peak!==Math.max(0,...unknown.columns.map(p=>p.intensity)))throw new SampledDifferenceError('samples');
 let previousY=0;
 const columns=standard.columns.map((s,i)=>{const u=unknown.columns[i];if(s.index!==i||u.index!==i||s.wavelength!==u.wavelength||!Number.isFinite(s.wavelength)||i>0&&s.wavelength<=standard.columns[i-1].wavelength||!Number.isFinite(s.intensity)||!Number.isFinite(u.intensity))throw new SampledDifferenceError('samples');const standardNormalized=s.intensity/standard.peak,unknownNormalized=u.intensity/unknown.peak,difference=standardNormalized-unknownNormalized,height=roundNearestEven(difference*100),unclippedY=75-height;if(!Number.isSafeInteger(height)||!Number.isSafeInteger(unclippedY)||height< -2147483648||height>2147483647||unclippedY< -2147483648||unclippedY>2147483647)throw new SampledDifferenceError('height');const y=Math.max(0,unclippedY),command=i>0&&(y>0||previousY>0)?'L' as const:'M' as const;previousY=y;return Object.freeze({index:i,wavelength:s.wavelength,standardIntensity:s.intensity,unknownIntensity:u.intensity,standardNormalized,unknownNormalized,difference,height,unclippedY,y,command});});
 return Object.freeze({policy:SAMPLED_DIFFERENCE_POLICY,standardPeak:standard.peak,unknownPeak:unknown.peak,columns:Object.freeze(columns)});
}
/** Association gate only;IO owns byte hashes/reparse andacquisition replay.
 * Derive samples directly fromeach bound probe,not an independently supplied
 * unlabelled buffer thatcould be paired withthewrong source metadata. */
export function prepareSampledDifference(standard:FluxChoice,unknown:FluxChoice,view:ClassificationViewport){
 if(standard.role!=='upper'||unknown.role!=='unknown'||standard.preparation.probe?.source.kind!=='standard')return Object.freeze({trace:null,error:'source' as const});
 for(const c of[standard,unknown]){const p=c.preparation.probe;if(!p||c.sourceId!==p.source.probeId||c.spectrum?.sha256!==p.source.sha256)return Object.freeze({trace:null,error:c.preparation.error==='grid'?'grid' as const:'source' as const});}
 if(!classificationImportDifferenceAllowed(standard.spectrum!)||!classificationImportDifferenceAllowed(unknown.spectrum!))return Object.freeze({trace:null,error:'grid' as const});
 try{return Object.freeze({trace:sampledDifference(samplePhotographicSpectrum(standard.preparation.probe!.grid,view),samplePhotographicSpectrum(unknown.preparation.probe!.grid,view)),error:null});}catch(error){return Object.freeze({trace:null,error:error instanceof PhotoSpectrumError?error.code:error instanceof SampledDifferenceError?error.code:'display'});}
}
