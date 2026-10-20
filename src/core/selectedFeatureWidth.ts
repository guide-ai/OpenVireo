import{readComparisonFlux,type FluxChoice}from'./comparisonProbe';import{featureRegion,measureFeature,type FeatureRegion}from'./featureWidth';
/** Original OK0x50670f..0x506819 selects unknown/upper/lower before
 * constructing the same integrand0x506851..0x5068b5. IO owns actual hashes,
 * SP/SSP parsing and acquired replay. This gate checks retained associations;
 * it cannot establish original byte authority from a claimed hash alone.
 * docs/SELECTED-SOURCE-WIDTH-PROVENANCE.json;no native runtime oracle. */
export class SelectedFeatureSourceError extends Error{constructor(readonly code:'source'|'grid'){super('Equivalent-width source '+code);this.name='SelectedFeatureSourceError';}}
export function selectedFeatureSource(choice:FluxChoice){
 const p=choice?.preparation?.probe,s=choice?.spectrum;
 if(!p||!s)throw new SelectedFeatureSourceError(choice?.preparation?.error==='grid'?'grid':'source');
 if(!['upper','unknown','lower'].includes(choice.role)||choice.sourceId!==p.source.probeId||s.sha256!==p.source.sha256)throw new SelectedFeatureSourceError('source');
 if('policy'in p){if(choice.role!=='unknown'||!choice.external||choice.external.kind!==p.source.kind||choice.external.samples!==s.samples||choice.external.sha256!==s.sha256)throw new SelectedFeatureSourceError('source');}
 else if(choice.external||p.source.kind!==(choice.role==='unknown'?'practice':'standard'))throw new SelectedFeatureSourceError('source');
 // Avoid accidental pairing of a prepared source with another displayed array.
 if(s.samples.length!==p.grid.intensities.length||s.samples[0]?.wavelength!==p.grid.minimum||s.samples.at(-1)?.wavelength!==p.grid.maximum||s.samples.some((row,i)=>row.intensity!==p.grid.intensities[i]))throw new SelectedFeatureSourceError('source');
 try{readComparisonFlux(p,'3900');readComparisonFlux(p,'4500');}catch{throw new SelectedFeatureSourceError('grid');}
 return Object.freeze({sourceId:choice.sourceId,sha256:p.source.sha256,file:p.source.file,label:choice.label,role:choice.role,kind:p.source.kind,samples:s.samples});
}
/** Same existing pure Number integration;no visible-peak display transfer,
 * continuum fit,automatic region,source change,PRNG or portable output field. */
export function measureSelectedFeature(choice:FluxChoice,input:FeatureRegion){const source=selectedFeatureSource(choice),region=featureRegion(input),result=measureFeature(source.samples,region);return Object.freeze({source,region,result});}
