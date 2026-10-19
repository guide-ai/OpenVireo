import type {StarObservation} from './starObservation';
import type {GalaxyObservation} from './galaxyObservation';
export type AcquisitionObservation=StarObservation|GalaxyObservation;
export const acquisitionJournalText=(a:AcquisitionObservation)=>a.kind==='catalog-star-acquisition'?a.starSessionText:a.journalText;
export const acquisitionObjectId=(a:AcquisitionObservation)=>a.kind==='catalog-star-acquisition'?'N0000.DAT@14428':a.targetId;
export const acquisitionReference=(a:AcquisitionObservation)=>a.kind==='catalog-star-acquisition'?'balmer' as const:'galaxy' as const;
export async function restoreAcquisitionObservation(id:unknown,journal:unknown):Promise<AcquisitionObservation>{
 if(journal&&typeof journal==='object'&&(journal as {format:unknown}).format==='OpenCLEA catalog galaxy exposure')return (await import('./galaxyObservation')).restoreGalaxyObservation(id,journal);
 return (await import('./starObservation')).restoreStarObservation(id,journal);
}

/** Only a replay-verified archive packet reaches this export from the analyser. */
export async function acquiredSpectrumBytes(a:AcquisitionObservation):Promise<Uint8Array>{
 const {starSpectrumBytes,galaxySpectrumBytes}=await import('../core/exposureSpectrum');
 return a.kind==='catalog-star-acquisition'?starSpectrumBytes(a.state):galaxySpectrumBytes(a.state);
}
