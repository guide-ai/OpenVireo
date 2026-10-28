// Same-origin bundled copy of the original VIREO CLEA_QSO.DAT (docs/LOCAL-RESOURCES.json, docs/RESOURCE-PROVENANCE.json; second
// user approval of 2026-10-26 in AGENTS.md). Web adapter, not an original contract: the original reads the file itself (loader
// 0x5987e4). The bytes are fetched only from this origin, bounded to and checked for the exact recorded size and SHA-256 BEFORE
// the field engine's QSO merge (core/qsoMerge.ts) reads any record. Catalogue values only, never observations.
import {QSO_CATALOG} from '../core/qsoMerge';
import type {FieldQsoCatalog} from '../core/fieldEngine';
import {BoundedResourceError,boundedResourceBody,checkResourceAbort,resourceSha256} from './boundedResource';

export const BUNDLED_QSO_CATALOG=Object.freeze({path:'/original/catalogs/CLEA_QSO.DAT',name:QSO_CATALOG.name,bytes:QSO_CATALOG.bytes,sha256:QSO_CATALOG.sha256});
export class BundledQsoCatalogError extends Error{
 constructor(readonly code:'download'|'size'|'sha256'){super(`Bundled QSO catalog: ${code}`);this.name='BundledQsoCatalogError';}
}
/** Exact identity check of bytes already read: size first, then SHA-256. */
export async function verifyBundledQsoCatalog(buffer:ArrayBuffer,signal?:AbortSignal):Promise<FieldQsoCatalog>{
 if(buffer.byteLength!==BUNDLED_QSO_CATALOG.bytes)throw new BundledQsoCatalogError('size');
 const sha256=await resourceSha256(buffer);checkResourceAbort(signal);
 if(sha256!==BUNDLED_QSO_CATALOG.sha256)throw new BundledQsoCatalogError('sha256');
 return Object.freeze({bytes:new Uint8Array(buffer),sha256});
}
/** Fetches and verifies the bundled catalogue. An abort rejects with the DOMException AbortError; every other failure is a
 * BundledQsoCatalogError. Nothing is cached, persisted or sent anywhere. */
export async function fetchBundledQsoCatalog(fetcher:typeof fetch,signal:AbortSignal):Promise<FieldQsoCatalog>{
 checkResourceAbort(signal);let buffer:ArrayBuffer;
 try{const response=await fetcher(BUNDLED_QSO_CATALOG.path,{signal,credentials:'same-origin'});buffer=await boundedResourceBody(response,BUNDLED_QSO_CATALOG.bytes,signal);}
 catch(error){checkResourceAbort(signal);if(error instanceof BoundedResourceError)throw new BundledQsoCatalogError(error.code==='size'?'size':'download');throw new BundledQsoCatalogError('download');}
 checkResourceAbort(signal);return verifyBundledQsoCatalog(buffer,signal);
}
