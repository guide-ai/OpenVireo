/** Front LSSFREE (analysis/front-lssfree/RECOVERY.md; plan analysis/front-plans/front-lssfree.md): a spectrum taken at a free
 * telescope pointing reaching the LSS "Measured Redshift Data" list. Static reading of CLEA_VEO.exe (SHA-256 781bc970…c54c);
 * nothing executed or emulated; no equivalence with the original program is claimed.
 *
 * [D] VIREO's only Record Z is the measuring engine's (RecordZ1Click 0x58383c), enabled by Load Saved Spectrum (0x582a70). Outside
 * exercises 3, 4 and 7 it calls the LSS find-or-add 0x57c918 with the loaded file's ID (`loadedSpectrumId`) and time, the header's
 * RA/Dec and the engine's z. Nothing tests the object's kind, the pointing or a hot list, so a star, a galaxy on no hot-list row
 * or a QSO reaches the list as a hot-list galaxy does. Entering mode 5 sets Show Object ID on (0x58aabe), so Save proposes the
 * current object's name (0x50fb1c), which the load rule gives back as the ID; Preferences OK/Cancel can restore it to off
 * (0x588737), and then Save proposes UNKNOWN.SSP or ObjX-<student>.SSP. [W] The ID here always uses the object's name.
 * [W] The web hands the field spectrometer's own .SSP to the analyser (Analyze) instead of a save and a load; the ID is that of the
 * proposed name, and the time is the observatory clock at Record Z (as for hot-list rows), not a file time. Pure: no React. */
import type {FieldResult} from './fieldEngine';
import type {JournalState} from './exposureJournal';
import {fieldSpectrumBytes,fieldSpectrumHeaderName} from './exposureSpectrum';
import {parseFieldSpectrumPolicy} from './fieldSpectrometer';
import {parseLegacySpectrumFile} from './legacySpectrumFile';
import {loadedSpectrumId} from './observationMetadata';
import type {LssDraftInput,LssJournal} from './lssSurvey';
import {currentZ,type ShiftControl} from './spectrum';

export class LssFreeRecordError extends Error{constructor(){super('LSS free record');this.name='LssFreeRecordError';}}
const fail=():never=>{throw new LssFreeRecordError();};

/** The name VIREO's Save proposes with Show Object ID on (0x50fb1c: the current object's name, trimmed, + the extension), as the
 * load rule 0x582a70 turns it back into an ID. The current object is the slit object's VIREO name (Front RE6 U6:
 * `fieldSpectrumHeaderName`, or a QSO's CLEA_QSO.DAT name). [W] Characters a Windows file name cannot hold become '_' (as the
 * web's own Save names them, Front R4d); where no VIREO name can be built the record locator is the ID unchanged. */
export function lssFreeObjectId(result:FieldResult):string{
 const named=fieldSpectrumHeaderName(result)??result.qsoTarget?.id??null;
 if(named===null||!/^[\x20-\x7e]+$/.test(named.replace(/ +$/,''))){const o=result.starTarget??result.target;return o?.id||fail();}
 const id=loadedSpectrumId(named.replace(/ +$/,'').replace(/[\\/:*?"<>|]/g,'_')+'.SSP');
 return id||fail();
}

/** The text a free record's counts digest is computed over. */
export const lssFreeCountsText=(counts:readonly number[])=>counts.join(',');
/** What a free-pointing exposure brings to Record Z: the ID, the header's pointing (RA 6 decimals in hours, Dec 5 decimals in
 * degrees, as 0x510090 writes them and 0x55ee14 reads them back), the telescope, and the exposure itself (its field-spectrum
 * policy and journal), which the investigation file replays. */
export type LssFreeSource=Readonly<{object:string;ra:number;dec:number;telescope:0|1|2;acquisitionPolicy:string;journal:LssJournal;countsSha256:string}>;
/** countsSha256: SHA-256 of `state.exposure.counts.join(',')` (the caller hashes; this module stays synchronous). */
export function lssFreeSource(state:JournalState,result:FieldResult,pointing:Readonly<{ra:number;dec:number}>,countsSha256:string):LssFreeSource{
 if(typeof countsSha256!=='string'||!/^[0-9a-f]{64}$/.test(countsSha256))fail();
 const p=parseFieldSpectrumPolicy(state?.policy);
 if(!p||p.pointing.ra!==pointing.ra||p.pointing.dec!==pointing.dec||state.exposure.phase==='running'||!state.exposure.counts.some(n=>n>0))fail();
 let header;try{header=parseLegacySpectrumFile(fieldSpectrumBytes(state,result,pointing)).header;}catch{return fail();}
 if(!header)fail();
 const ra=header!.pointingRa,dec=header!.pointingDec;
 if(!(ra>=0&&ra<24&&Math.abs(dec)<=90))fail();
 return Object.freeze({object:lssFreeObjectId(result),ra,dec,telescope:p!.telescope,acquisitionPolicy:state.policy,journal:Object.freeze({seedAtReset:state.seedAtReset,events:Object.freeze([...state.events])}),countsSha256});
}
/** The Record Z draft of a free-pointing measurement: the source, the analyser's shift control (z) and the Record time. */
export function lssFreeDraft(source:LssFreeSource,control:ShiftControl,jd:number):LssDraftInput{
 return Object.freeze({free:true as const,field:null,row:null,countsSha256:source.countsSha256,telescope:source.telescope,object:source.object,jd,ra:source.ra,dec:source.dec,z:currentZ(control),control,journal:source.journal,acquisitionPolicy:source.acquisitionPolicy});
}
