// Same-origin bundled copy of the original VIREO PLEIADES.HTL (docs/LOCAL-RESOURCES.json, docs/RESOURCE-PROVENANCE.json group
// public/original/hotlists; second user approval of 2026-10-26 in AGENTS.md). Web adapter, not an original contract: the
// original opens hot lists from its own file dialog. The bytes are fetched only from this origin, bounded to and checked for
// the exact recorded size and SHA-256 BEFORE the caller parses them with the existing parseHtl. Identities only, never photons.
// The same adapter serves the original Hubble.HTL (13 entries, same approval and manifest group).
import {PLEIADES_HTL} from '../core/pleiadesHotList';
import {HUBBLE_HTL} from '../core/hubbleHotList';
import {BoundedResourceError,boundedResourceBody,checkResourceAbort,resourceSha256} from './boundedResource';

export type BundledHotListIdentity=Readonly<{path:string;name:string;bytes:number;sha256:string}>;
export const BUNDLED_PLEIADES_HOT_LIST:BundledHotListIdentity=Object.freeze({path:PLEIADES_HTL.path,name:PLEIADES_HTL.name,bytes:PLEIADES_HTL.bytes,sha256:PLEIADES_HTL.sha256});
export const BUNDLED_HUBBLE_HOT_LIST:BundledHotListIdentity=Object.freeze({path:HUBBLE_HTL.path,name:HUBBLE_HTL.name,bytes:HUBBLE_HTL.bytes,sha256:HUBBLE_HTL.sha256});
/** Front P: byte-exact original Pulsars.HTL (CLEA_Vireo.zip program files/CLEA/VIREO/Pulsars.HTL, 8 records; second user
 * approval of 2026-10-26 in AGENTS.md). Offered by the radio Slew › Hot List only; the optical editor's exercise buttons
 * are unchanged. */
export const BUNDLED_PULSARS_HOT_LIST:BundledHotListIdentity=Object.freeze({path:'/original/hotlists/Pulsars.HTL',name:'Pulsars.HTL',bytes:688,sha256:'9dfba54887a0bf493ca665f53e69f48c13f3a54f7aa4f878912914468e28a439'});
/** Caption of an exercise-list button or its load error: an existing catalog key, or plain text (for lists added by other
 * fronts without editing the shared catalog). Keys are resolved by the editor; io stays independent of the catalog. */
export type BundledHotListText=Readonly<{key:string}|{text:string}>;
export type BundledExerciseHotList=Readonly<{identity:BundledHotListIdentity;label:BundledHotListText;error:BundledHotListText}>;
/** The explicit "Load exercise list" buttons of the observatory HTL editor, in display order. Append an entry to offer another
 * bundled original list; the editor renders and loads every entry the same way (size and SHA-256 first, then parseHtl). */
export const BUNDLED_EXERCISE_HOT_LISTS:readonly BundledExerciseHotList[]=Object.freeze([
 Object.freeze({identity:BUNDLED_PLEIADES_HOT_LIST,label:Object.freeze({key:'htl.exerciseLoad'}),error:Object.freeze({key:'htl.exerciseError'})}),
 Object.freeze({identity:BUNDLED_HUBBLE_HOT_LIST,label:Object.freeze({key:'htl.hubbleLoad'}),error:Object.freeze({key:'htl.hubbleError'})}),
] as const satisfies readonly BundledExerciseHotList[]);

/** download: the request failed or answered without a body; size: not exactly the recorded byte count; sha256: other bytes. */
export type BundledHotListFailure='download'|'size'|'sha256';
export class BundledHotListError extends Error{
 constructor(readonly code:BundledHotListFailure){super(`Bundled hot list: ${code}`);this.name='BundledHotListError';}
}
export type BundledHotListBytes=Readonly<{bytes:Uint8Array;sha256:string}>;

/** Exact identity check of bytes already read: size first, then SHA-256. Throws BundledHotListError. */
export async function verifyBundledHotList(buffer:ArrayBuffer,expected:BundledHotListIdentity=BUNDLED_PLEIADES_HOT_LIST,signal?:AbortSignal):Promise<BundledHotListBytes>{
 if(buffer.byteLength!==expected.bytes)throw new BundledHotListError('size');
 const sha256=await resourceSha256(buffer);
 checkResourceAbort(signal);
 if(sha256!==expected.sha256)throw new BundledHotListError('sha256');
 return Object.freeze({bytes:new Uint8Array(buffer),sha256});
}

/**
 * Fetches the bundled list from this origin, bounded to the recorded size, and verifies it. An abort (cancel, hidden tab,
 * inactive editor, project operation, unmount) rejects with the DOMException AbortError, which callers ignore; every other
 * failure is a BundledHotListError. Nothing is parsed, cached, persisted or sent anywhere.
 */
export async function fetchBundledHotList(fetcher:typeof fetch,signal:AbortSignal,expected:BundledHotListIdentity=BUNDLED_PLEIADES_HOT_LIST):Promise<BundledHotListBytes>{
 checkResourceAbort(signal);
 let buffer:ArrayBuffer;
 try{
  const response=await fetcher(expected.path,{signal,credentials:'same-origin'});
  buffer=await boundedResourceBody(response,expected.bytes,signal);
 }catch(error){
  checkResourceAbort(signal);
  if(error instanceof BoundedResourceError)throw new BundledHotListError(error.code==='size'?'size':'download');
  throw new BundledHotListError('download');
 }
 checkResourceAbort(signal);
 return verifyBundledHotList(buffer,expected,signal);
}
