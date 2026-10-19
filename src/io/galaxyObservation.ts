import {diagnosticError} from '../core/diagnostics';
import template from '../../data/hubble/galaxy-source.json';
import {galaxyTelescopeIndex,deactivateGalaxy,galaxyStateDefinition,verifiedGalaxyConfiguration,type GalaxyState} from '../core/galaxyExposure';
import {parseGalaxySession,serializeGalaxySession} from './galaxySession';
import {galaxySpectrumBytes} from '../core/exposureSpectrum';
import {parseSpectrum,type Sample} from '../core/spectrum';
import type {ImportedSpectrum} from './spectrumFiles';
export {MAX_ACQUISITION_ARCHIVE,MAX_ARCHIVE_EVENTS} from '../core/acquisitionArchive';
export type GalaxyObservation=ImportedSpectrum&Readonly<{targetId:string;name:string;kind:'catalog-galaxy-acquisition';acquisitionId:string;journalText:string;state:GalaxyState;templateSamples:readonly Sample[]}>;
async function digest(text:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
/** New bridge: recovered save normalization/decimal output feeds the existing
 * normalized analyser; exact raw counts/RNG/ticks remain in the bound journal.
 * A source template or imported curve never acquires this provenance. */
async function build(state:GalaxyState,journalText:string):Promise<GalaxyObservation>{
 const e=state.exposure,GALAXY_TARGET=galaxyStateDefinition(state).target;
 if(!e.draws||!e.counts.some(n=>n>0))throw diagnosticError('error.transferPositive');
 const acquisitionId=await digest(journalText);
 const saved=galaxySpectrumBytes(state);
 // Retain the existing headerless curve identity for linked measurements and
 // sessions. Native SSP export uses the same full recovered save profile.
 const sourceText=new TextDecoder().decode(saved).split('\r\n').slice(1).join('\r\n');
 const samples=Object.freeze(parseSpectrum(sourceText).map(p=>Object.freeze(p))),sha256=await digest(sourceText);verifiedGalaxyConfiguration(GALAXY_TARGET.id,galaxyTelescopeIndex(state));
 return Object.freeze({kind:'catalog-galaxy-acquisition',targetId:GALAXY_TARGET.id,name:`catalog-galaxy-${GALAXY_TARGET.id==='36773'?'':GALAXY_TARGET.id+'-'}${acquisitionId.slice(0,12)}.sp`,sha256,samples,sourceText,acquisitionId,journalText,state,templateSamples:Object.freeze(template.samples.map(([wavelength,intensity])=>Object.freeze({wavelength,intensity})))});
}
export async function createGalaxyObservation(input:GalaxyState):Promise<GalaxyObservation>{
 if(input.exposure.phase==='running')throw diagnosticError('error.transferPause');
 const stopped=deactivateGalaxy(input),text=serializeGalaxySession(stopped),replayed=parseGalaxySession(JSON.parse(text));
 // Replay binds the derived curve to verified scientific inputs, not just a
 // supplied in-memory counter object carrying the same policy string.
 if(JSON.stringify(replayed.exposure)!==JSON.stringify(stopped.exposure))throw diagnosticError('error.transferJournal');
 return build(replayed,text);
}
export async function restoreGalaxyObservation(id:unknown,journal:unknown):Promise<GalaxyObservation>{
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw diagnosticError('error.transferIdentity');
 const state=parseGalaxySession(journal),result=await build(state,serializeGalaxySession(state));
 if(result.acquisitionId!==id)throw diagnosticError('error.transferMismatch');return result;
}
