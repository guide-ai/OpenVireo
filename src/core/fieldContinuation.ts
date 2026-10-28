/** The start-time continuation source of a field-engine galaxy (fieldEngine.ts 'start-time', 0x55e97c via galaxyContinuum.ts) as
 * plain data, so a field prepared in a Worker can rebuild its journal source preparer on the main thread. */
import {prepareCatalogGalaxyChannels} from './galaxyContinuum';
import type {JournalSourcePreparer} from './exposureJournal';
export type FieldContinuationSource=Readonly<{samples:readonly Readonly<{wavelength:number;intensity:number}>[];matched:boolean;morphology:number;redshift:number;minimum:number;maximum:number;amplitudeSource:number}>;
export function continuationSourcePreparer(c:FieldContinuationSource):JournalSourcePreparer{
 return seed=>{const p=prepareCatalogGalaxyChannels(c.samples,c.matched,c.morphology,c.redshift,c.minimum,c.maximum,seed);return Object.freeze({means:Object.freeze(p.values.map(v=>v*c.amplitudeSource)),seed:p.seed,draws:p.draws});};
}
