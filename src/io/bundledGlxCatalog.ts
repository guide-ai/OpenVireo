// Same-origin bundled copy of the original VIREO CLEA_GLX.DAT (docs/LOCAL-RESOURCES.json, docs/RESOURCE-PROVENANCE.json; second
// user approval of 2026-10-26 in AGENTS.md). Web adapter, not an original contract: the original reads the file itself (reader
// 0x598acc). The bytes are fetched only from this origin, bounded to and checked for the exact recorded size and SHA-256 BEFORE
// the field engine (core/fieldEngine.ts) reads any record. Catalogue values only, never observations.
import {GLX_CATALOG} from '../core/glxCatalog';
import {checkResourceAbort,resourceSha256,verifiedSameOriginResource} from './boundedResource';

export type BundledGlxCatalogIdentity=Readonly<{path:string;name:string;bytes:number;sha256:string}>;
export const BUNDLED_GLX_CATALOG:BundledGlxCatalogIdentity=Object.freeze({path:'/original/catalogs/CLEA_GLX.DAT',name:GLX_CATALOG.name,bytes:GLX_CATALOG.bytes,sha256:GLX_CATALOG.sha256});
/** download: the request failed or answered without a body; size: not exactly the recorded byte count; sha256: other bytes. */
export type BundledGlxCatalogFailure='download'|'size'|'sha256';
export class BundledGlxCatalogError extends Error{
 constructor(readonly code:BundledGlxCatalogFailure){super(`Bundled galaxy catalog: ${code}`);this.name='BundledGlxCatalogError';}
}
/** Exact identity check of bytes already read: size first, then SHA-256. Throws BundledGlxCatalogError. */
export async function verifyBundledGlxCatalog(buffer:ArrayBuffer,expected:BundledGlxCatalogIdentity=BUNDLED_GLX_CATALOG,signal?:AbortSignal):Promise<Uint8Array>{
 if(buffer.byteLength!==expected.bytes)throw new BundledGlxCatalogError('size');
 const sha256=await resourceSha256(buffer);
 checkResourceAbort(signal);
 if(sha256!==expected.sha256)throw new BundledGlxCatalogError('sha256');
 return new Uint8Array(buffer);
}
/** Fetches and verifies the bundled catalogue. An abort rejects with the DOMException AbortError, which callers ignore; every
 * other failure is a BundledGlxCatalogError. Nothing is persisted or sent anywhere; verified bytes are kept in memory for the tab
 * and re-checked on reuse (verifiedSameOriginResource, Front F2). */
export function fetchBundledGlxCatalog(fetcher:typeof fetch,signal:AbortSignal,expected:BundledGlxCatalogIdentity=BUNDLED_GLX_CATALOG):Promise<Uint8Array>{
 return verifiedSameOriginResource(fetcher,signal,expected.path,expected.bytes,buffer=>verifyBundledGlxCatalog(buffer,expected,signal),code=>new BundledGlxCatalogError(code));
}
