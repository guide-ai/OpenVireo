import {diagnosticError} from '../core/diagnostics';
import {deactivateStar,verifiedStarConfiguration,starTelescopeIndex,type StarState} from '../core/starExposure';
import {parseStarSession,serializeStarSession,starSessionIdentityText} from './starSession';
import {starSpectrumBytes} from '../core/exposureSpectrum';
import {parseSpectrum,type Sample} from '../core/spectrum';
import type {ImportedSpectrum} from './spectrumFiles';
export {MAX_ACQUISITION_ARCHIVE,MAX_ARCHIVE_EVENTS} from '../core/acquisitionArchive';
export type StarObservation=ImportedSpectrum&Readonly<{name:string;kind:'catalog-star-acquisition';acquisitionId:string;starSessionText:string;state:StarState;templateSamples:readonly Sample[]}>;
async function digest(text:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
/** New bridge: recovered save normalization/decimal output feeds the existing
 * normalized analyser; exact raw counts/RNG/ticks remain in the bound journal.
 * A source template or imported curve never acquires this provenance. */
async function build(state:StarState,starSessionText:string):Promise<StarObservation>{
 const e=state.exposure;
 if(!e.draws||!e.counts.some(n=>n>0))throw diagnosticError('error.transferPositive');
 const acquisitionId=await digest(starSessionIdentityText(state));
 const saved=starSpectrumBytes(state);
 // Retain the existing headerless curve identity for linked measurements and
 // sessions. Native SSP export uses the same full recovered save profile.
 const sourceText=new TextDecoder().decode(saved).split('\r\n').slice(1).join('\r\n');
 const samples=Object.freeze(parseSpectrum(sourceText).map(p=>Object.freeze(p))),sha256=await digest(sourceText),c=verifiedStarConfiguration(starTelescopeIndex(state));
 return Object.freeze({kind:'catalog-star-acquisition',name:`catalog-star-${acquisitionId.slice(0,12)}.sp`,sha256,samples,sourceText,acquisitionId,starSessionText,state,templateSamples:Object.freeze(c.wavelengths.map((w,i)=>Object.freeze({wavelength:w,intensity:c.sourceValues[i]})))});
}
export async function createStarObservation(input:StarState):Promise<StarObservation>{
 if(input.exposure.phase==='running')throw diagnosticError('error.transferPause');
 const stopped=deactivateStar(input),text=serializeStarSession(stopped),replayed=parseStarSession(JSON.parse(text));
 // Replay binds the derived curve to verified scientific inputs, not just a
 // supplied in-memory counter object carrying the same policy string.
 if(JSON.stringify(replayed.exposure)!==JSON.stringify(stopped.exposure))throw diagnosticError('error.transferJournal');
 return build(replayed,text);
}
export async function restoreStarObservation(id:unknown,journal:unknown):Promise<StarObservation>{
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw diagnosticError('error.transferIdentity');
 const state=parseStarSession(journal),result=await build(state,serializeStarSession(state));
 if(result.acquisitionId!==id)throw diagnosticError('error.transferMismatch');return result;
}
