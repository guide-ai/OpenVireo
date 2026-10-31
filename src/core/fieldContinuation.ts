/** The start-time continuation source of a field-engine galaxy (fieldEngine.ts 'start-time', 0x55e97c via galaxyContinuum.ts) as
 * plain data, so a field prepared in a Worker can rebuild its journal source preparer on the main thread. */
import {prepareCatalogGalaxyChannels,prepareCatalogGalaxyExtension} from './galaxyContinuum';
import {galaxyLibrarySpectrum,prepareGalaxyProfile} from './galaxySpectrum';
import {sampleUniformSpectrum} from './acquisition';
import type {JournalSourcePreparer} from './exposureJournal';
export type FieldContinuationSource=Readonly<{samples:readonly Readonly<{wavelength:number;intensity:number}>[];matched:boolean;morphology:number;redshift:number;minimum:number;maximum:number;amplitudeSource:number}>;
export function continuationSourcePreparer(c:FieldContinuationSource):JournalSourcePreparer{
 return seed=>{const p=prepareCatalogGalaxyChannels(c.samples,c.matched,c.morphology,c.redshift,c.minimum,c.maximum,seed);return Object.freeze({means:Object.freeze(p.values.map(v=>v*c.amplitudeSource)),seed:p.seed,draws:p.draws});};
}
/** The galaxy source values on a spectrometer interval, shared by the field engine and the pinned galaxy routes (Front S2):
 * the shifted template sampled exactly where it covers the grid ('profile'); otherwise, with the start-time continuation, the
 * deterministic upper bound of 0x55e97c used for the mean bound and the continuation source the journal draws at each Go
 * ('continuation'); 'range' when neither applies. */
export type GalaxySourceValues=
 |Readonly<{kind:'profile';values:readonly number[];wavelengths:readonly number[]}>
 |Readonly<{kind:'continuation';values:readonly number[];wavelengths:readonly number[];continuationSource:FieldContinuationSource}>
 |Readonly<{kind:'range'}>;
export function galaxySourceValues(samples:readonly Readonly<{wavelength:number;intensity:number}>[],matched:boolean,morphology:number,redshift:number,minimum:number,maximum:number,amplitudeSource:number,continuation:boolean):GalaxySourceValues{
 try{const p=prepareGalaxyProfile(samples,matched,redshift,minimum,maximum);return Object.freeze({kind:'profile' as const,values:p.values,wavelengths:p.wavelengths});}
 catch{
  if(!continuation)return Object.freeze({kind:'range' as const});
  try{
   const {source}=galaxyLibrarySpectrum(samples,matched,redshift),ext=prepareCatalogGalaxyExtension(source,morphology,redshift,minimum,maximum);
   const grid=prepareCatalogGalaxyChannels(samples,matched,morphology,redshift,minimum,maximum,1);
   // Upper bound of 0x55e97c: blue (U·0.16+0.92)·C·corr ≤ 1.08·C·corr, red (U·0.08+0.96)·C·corr ≤ 1.04·C·corr; in-template exact.
   const values=grid.wavelengths.map(w=>{if(w>=ext.source.minimum&&w<=ext.source.maximum)return sampleUniformSpectrum(ext.source,w).value;const blue=w<ext.source.minimum,c=sampleUniformSpectrum(ext.continuum,w).value;return (blue?1.08:1.04)*c*(blue?ext.blueCorrection:ext.redCorrection);});
   return Object.freeze({kind:'continuation' as const,values:Object.freeze(values),wavelengths:grid.wavelengths,continuationSource:Object.freeze({samples,matched,morphology,redshift,minimum,maximum,amplitudeSource})});
  }catch{return Object.freeze({kind:'range' as const});}
 }
}
