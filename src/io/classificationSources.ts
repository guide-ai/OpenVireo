import {classificationAtlas,classificationSource,classificationCoverage,type ClassificationExternalSource,type ClassificationState} from '../core/classification';
import {loadVerifiedLibrarySpectrum} from './spectrumFiles';
/** No resampling or quantitative residual against acquired600-bin data. */
export async function loadClassificationSources(state:ClassificationState,acquisitions:readonly ClassificationExternalSource[],signal?:AbortSignal){
 const source=classificationSource(state.unknownId,acquisitions),atlas=classificationAtlas(state.atlasId);
 const [upper,lower]=await Promise.all([atlas.standards[state.pair],atlas.standards[state.pair+1]].map(p=>loadVerifiedLibrarySpectrum(p,signal)));
 const unknown=source.kind==='practice'?await loadVerifiedLibrarySpectrum(source,signal):acquisitions.find(p=>source.kind==='imported-spectrum'?p.kind==='imported-spectrum'&&p.sha256===source.sha256:p.kind==='catalog-star-acquisition'&&p.acquisitionId===source.acquisitionId)!;
 if(state.mode==='difference'&&source.kind==='imported-spectrum'&&(upper.samples.length!==unknown.samples.length||upper.samples.some((p,i)=>p.wavelength!==unknown.samples[i].wavelength)))throw Error('Imported printed grid differs');
 if(!classificationCoverage(upper.samples)||!classificationCoverage(unknown.samples)||!classificationCoverage(lower.samples))throw Error('Common spectral interval unavailable');
 return {upper,unknown,lower};
}
