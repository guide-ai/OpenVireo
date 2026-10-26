// Same-origin bundled copy of the recorded VIREO 1.504 Pulsars.dat (docs/LOCAL-RESOURCES.json, docs/RESOURCE-PROVENANCE.json
// group public/original/radio; second user approval of 2026-10-26 in AGENTS.md). Web adapter, not an original contract: the
// original reads this file itself in TRadioLab FormCreate 0x5647a7. The bytes are fetched only from this origin, checked for
// the exact recorded size and SHA-256 BEFORE any parse, and then handed to the existing reference-catalog commit
// (radioPulsarReferenceCatalog.ts), which classifies them by the same identity. Reference values only, never observations.
import {RECORDED_VIREO_PULSARS_DAT} from '../core/radioPulsarReferenceCatalog';
import {BoundedResourceError,boundedResourceBody,checkResourceAbort,resourceSha256} from './boundedResource';

export type BundledPulsarCatalogIdentity=Readonly<{path:string;name:string;bytes:number;sha256:string}>;
export const BUNDLED_PULSAR_CATALOG:BundledPulsarCatalogIdentity=Object.freeze({
 path:'/original/radio/Pulsars.dat',name:'Pulsars.dat',bytes:RECORDED_VIREO_PULSARS_DAT.bytes,sha256:RECORDED_VIREO_PULSARS_DAT.sha256,
});

/** download: the request failed or answered without a body; size: not exactly the recorded byte count; sha256: other bytes. */
export type BundledPulsarCatalogFailure='download'|'size'|'sha256';
export class BundledPulsarCatalogError extends Error{
 constructor(readonly code:BundledPulsarCatalogFailure){super(`Bundled pulsar catalog: ${code}`);this.name='BundledPulsarCatalogError';}
}
export type BundledPulsarCatalogBytes=Readonly<{buffer:ArrayBuffer;sha256:string}>;

/** Exact identity check of bytes already read: size first, then SHA-256. Throws BundledPulsarCatalogError. */
export async function verifyBundledPulsarCatalog(buffer:ArrayBuffer,expected:BundledPulsarCatalogIdentity=BUNDLED_PULSAR_CATALOG,signal?:AbortSignal):Promise<BundledPulsarCatalogBytes>{
 if(buffer.byteLength!==expected.bytes)throw new BundledPulsarCatalogError('size');
 const sha256=await resourceSha256(buffer);
 checkResourceAbort(signal);
 if(sha256!==expected.sha256)throw new BundledPulsarCatalogError('sha256');
 return Object.freeze({buffer,sha256});
}

/**
 * Fetches the bundled catalog from this origin, bounded to the recorded size, and verifies it. An abort (cancel, route
 * hidden, project operation, unmount) rejects with the DOMException AbortError, which callers ignore; every other failure
 * is a BundledPulsarCatalogError. Nothing is parsed, cached, persisted or sent anywhere.
 */
export async function fetchBundledPulsarCatalog(fetcher:typeof fetch,signal:AbortSignal,expected:BundledPulsarCatalogIdentity=BUNDLED_PULSAR_CATALOG):Promise<BundledPulsarCatalogBytes>{
 checkResourceAbort(signal);
 let buffer:ArrayBuffer;
 try{
  const response=await fetcher(expected.path,{signal,credentials:'same-origin'});
  buffer=await boundedResourceBody(response,expected.bytes,signal);
 }catch(error){
  checkResourceAbort(signal);
  if(error instanceof BoundedResourceError)throw new BundledPulsarCatalogError(error.code==='size'?'size':'download');
  throw new BundledPulsarCatalogError('download');
 }
 checkResourceAbort(signal);
 return verifyBundledPulsarCatalog(buffer,expected,signal);
}
