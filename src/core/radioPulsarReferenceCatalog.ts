// WEB-PP-SRC-01..03: admission of a learner-chosen reference catalog for the Pulsar Parameters utility. Pure web adapter
// (no original contract): the original reads Pulsars.dat itself in TRadioLab FormCreate 0x5647a7, with no chooser; its
// failure box (0x564d08..) and conditional quit request (0x47df9c) are not reproduced. The caller reads a chosen file into
// memory only; nothing is uploaded, copied or persisted (the bundled copy: src/io/bundledPulsarCatalog.ts). See docs/RADIO-PULSAR-PARAMETERS.md.
import {PULSAR_CATALOG_WEB_POLICY,type PulsarCatalog,type PulsarCatalogError,type PulsarCatalogParse} from './radioPulsarCatalog';

/** Identity of the VIREO 1.504 Pulsars.dat, bundled byte-exact since the second user approval (2026-10-26;
 * docs/LOCAL-RESOURCES.json). A match identifies bytes, not original runtime authority. */
export const RECORDED_VIREO_PULSARS_DAT=Object.freeze({sha256:'ba94ee94c359e2afd4acce940266d69983d24a93893719cca20d3e23ef3dceaa',bytes:285692,rows:558});
export const PULSAR_REFERENCE_WEB_POLICY=Object.freeze({maxBytes:PULSAR_CATALOG_WEB_POLICY.maxBytes,nameMaxLength:128});

export type PulsarReferenceSource=Readonly<{name:string;bytes:number;sha256:string;rows:number;
 /** The SHA-256 and size equal the recorded original file; otherwise a user-supplied reference catalog. */
 recorded:boolean;
 /** Phase 1 item 1.5: a supplied catalog restored from an investigation file as its stored values only. The name, size,
  * SHA-256 and row count are the historical claims written at Save; the original bytes were not kept or re-checked, so
  * such a source is never `recorded`, whatever SHA-256 it claims. */
 valuesOnly?:true}>;
export type PulsarReferenceState=Readonly<{
 catalog:PulsarCatalog|null;
 source:PulsarReferenceSource|null;
 /** The pending read: only its token may commit. */
 read:Readonly<{token:number;name:string}>|null;
 nextToken:number;
}>;
export const INITIAL_PULSAR_REFERENCE:PulsarReferenceState=Object.freeze({catalog:null,source:null,read:null,nextToken:1});

export type PulsarReferenceOutcome=
 |'reading'|'window-open'|'receiver-open'|'read-pending'
 |'loaded'|'invalid'|'too-large'|'read-error'|'cancelled'|'stale';
export type PulsarReferenceTransition=Readonly<{state:PulsarReferenceState;outcome:PulsarReferenceOutcome;changed:boolean;token?:number;error?:PulsarCatalogError}>;
const keep=(state:PulsarReferenceState,outcome:PulsarReferenceOutcome):PulsarReferenceTransition=>Object.freeze({state,outcome,changed:false});
const next=(state:PulsarReferenceState,outcome:PulsarReferenceOutcome,extra:Partial<Pick<PulsarReferenceTransition,'token'|'error'>>={}):PulsarReferenceTransition=>
 Object.freeze({state:Object.freeze(state),outcome,changed:true,...extra});

/** Display name: at most 128 characters, rendered as text only. */
export const pulsarReferenceName=(name:string)=>Array.from(typeof name==='string'?name:'').slice(0,PULSAR_REFERENCE_WEB_POLICY.nameMaxLength).join('');

/** Start a read. Refused while the utility window is open (its catalog is never replaced under it), while any receiver
 * window exists (WEB-RX-CAT-01: the receivers read this catalog at Open and at each clock reassociation) or another
 * read is pending. */
export function beginPulsarReferenceRead(s:PulsarReferenceState,name:string,windowOpen:boolean,receiverOpen=false):PulsarReferenceTransition{
 if(windowOpen)return keep(s,'window-open');
 if(receiverOpen)return keep(s,'receiver-open');
 if(s.read!==null)return keep(s,'read-pending');
 const token=s.nextToken;
 return next({...s,read:Object.freeze({token,name:pulsarReferenceName(name)}),nextToken:token+1},'reading',{token});
}
const owns=(s:PulsarReferenceState,token:number)=>s.read!==null&&s.read.token===token;
/** Completion of the pending read: an accepted parse replaces catalog and source together; a refused parse keeps both. */
export function commitPulsarReferenceRead(s:PulsarReferenceState,token:number,parse:PulsarCatalogParse,sha256:string,bytes:number):PulsarReferenceTransition{
 if(!owns(s,token))return keep(s,'stale');
 const name=s.read!.name;
 if(!parse.ok)return next({...s,read:null},'invalid',{error:parse.error});
 const recorded=sha256===RECORDED_VIREO_PULSARS_DAT.sha256&&bytes===RECORDED_VIREO_PULSARS_DAT.bytes;
 const source=Object.freeze({name,bytes,sha256,rows:parse.catalog.length,recorded});
 return next({...s,catalog:parse.catalog,source,read:null},'loaded');
}
/** A size refusal before reading or a browser read error: the previous catalog stays. */
export function failPulsarReferenceRead(s:PulsarReferenceState,token:number,reason:'too-large'|'read-error'):PulsarReferenceTransition{
 return owns(s,token)?next({...s,read:null},reason):keep(s,'stale');
}
/** Cancel (button, route hidden, project operation, page hidden, unmount): the previous catalog stays and a late
 * completion of this token is ignored. */
export function cancelPulsarReferenceRead(s:PulsarReferenceState,token:number):PulsarReferenceTransition{
 return owns(s,token)?next({...s,read:null},'cancelled'):keep(s,'stale');
}
