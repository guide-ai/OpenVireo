// Phase 1 item 1.5 (WEB): the asynchronous part of the Radio/Pulsar investigation codec (src/core/radioInvestigation.ts).
// The consistency digest is the SHA-256 of the canonical compact JSON of the validated `radio` part: it detects edits that
// do not also rewrite the digest; it is not authentication. Restore re-admits a stored .PLR text with the existing reader
// and recomputes its SHA-256, and re-fetches the bundled Pulsars.dat (size and SHA-256 checked before the parse, and the
// bytes re-hashed here) for a recorded catalog; the stored identity never replaces that fetch. Everything is checked, and
// the restored objects are built, before the caller applies anything.
import {
 RADIO_INVESTIGATION_POLICY,RadioInvestigationError,pulsarFileBytes,radioInvestigationJson,radioInvestigationText,readRadioInvestigation,rebuildRadioInvestigation,
 type RadioInvestigation,type RebuiltRadioInvestigation,
} from '../core/radioInvestigation';
import {admitPlrRecording,type PlrRecording} from '../core/pulsarRecording';
import {parsePulsarCatalog,type PulsarCatalog} from '../core/radioPulsarCatalog';
import {RECORDED_VIREO_PULSARS_DAT} from '../core/radioPulsarReferenceCatalog';
import {encodeSessionNumber} from '../core/sessionNumber';
import {resourceSha256} from './boundedResource';
import {fetchBundledPulsarCatalog,type BundledPulsarCatalogBytes} from './bundledPulsarCatalog';

export {RADIO_INVESTIGATION_POLICY};
/** The restored objects, built before anything is applied; fileSha256: the recomputed SHA-256 of a restored .PLR. */
export type PreparedRadioInvestigation=RebuiltRadioInvestigation&Readonly<{fileSha256:string|null}>;
/** prepared: null in a check that skips the source fetch (the Save self-check). */
export type RadioInvestigationRecord=Readonly<{snapshot:RadioInvestigation;prepared:PreparedRadioInvestigation|null}>;
export type BundledCatalogLoader=()=>Promise<BundledPulsarCatalogBytes>;
const defaultLoader:BundledCatalogLoader=()=>fetchBundledPulsarCatalog(fetch,new AbortController().signal);
const HEX64=/^[0-9a-f]{64}$/;
const textSha256=(text:string)=>resourceSha256(new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>);

/** The `radio` JSON and its digest for a snapshot. A .PLR text gets its SHA-256 here. The tree is read back strictly first,
 * so Save never writes a part Restore would refuse. */
export async function portableRadioInvestigation(s:RadioInvestigation):Promise<Readonly<{radio:unknown;digest:string;snapshot:RadioInvestigation}>>{
 const d=s.data;
 const snapshot:RadioInvestigation=d.kind==='file'&&d.sha256===null?Object.freeze({...s,data:Object.freeze({...d,sha256:await resourceSha256(pulsarFileBytes(d.text))})}):s;
 const radio=radioInvestigationJson(snapshot);
 readRadioInvestigation(JSON.parse(JSON.stringify(radio,(_k,v)=>encodeSessionNumber(v))));
 return Object.freeze({radio,digest:await textSha256(radioInvestigationText(snapshot)),snapshot});
}

/** Strict read, digest, source checks and rebuild. Throws (RadioInvestigationError, or the loader's error) on any failure. */
export async function admitRadioInvestigation(value:unknown,digest:unknown,options:Readonly<{verifySources:boolean;loadBundled?:BundledCatalogLoader}>):Promise<RadioInvestigationRecord>{
 if(typeof digest!=='string'||!HEX64.test(digest))throw new RadioInvestigationError('digest');
 const snapshot=readRadioInvestigation(value);
 if(await textSha256(radioInvestigationText(snapshot))!==digest)throw new RadioInvestigationError('digest');
 let plr:PlrRecording|null=null,fileSha256:string|null=null;
 if(snapshot.data.kind==='file'){
  const admission=admitPlrRecording(pulsarFileBytes(snapshot.data.text),snapshot.data.fileName);
  if(admission.status!=='admitted')throw new RadioInvestigationError('data-file');
  fileSha256=await resourceSha256(admission.recording.bytes);
  if(fileSha256!==snapshot.data.sha256)throw new RadioInvestigationError('data-file');
  plr=admission.recording;
 }
 let recordedCatalog:PulsarCatalog|null=null;
 if(options.verifySources&&snapshot.workspace?.catalog?.kind==='recorded'){
  const loaded=await (options.loadBundled??defaultLoader)();
  if(loaded.buffer.byteLength!==RECORDED_VIREO_PULSARS_DAT.bytes||await resourceSha256(loaded.buffer)!==RECORDED_VIREO_PULSARS_DAT.sha256)throw new RadioInvestigationError('catalog-identity');
  const parsed=parsePulsarCatalog(new Uint8Array(loaded.buffer));
  if(!parsed.ok)throw new RadioInvestigationError('catalog');
  recordedCatalog=parsed.catalog;
 }
 const rebuilt=rebuildRadioInvestigation(snapshot,{plr,recordedCatalog});
 return Object.freeze({snapshot,prepared:options.verifySources?Object.freeze({...rebuilt,fileSha256}):null});
}
