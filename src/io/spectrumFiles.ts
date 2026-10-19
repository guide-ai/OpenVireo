import {boundedResourceBody,BoundedResourceError,resourceSha256} from './boundedResource';
import {parseLegacySpectrumFile,LegacySpectrumFileError,type LegacySpectrumHeader} from '../core/legacySpectrumFile';
import {diagnosticError} from '../core/diagnostics';
import { MAX_FILE_BYTES, parseLibrarySpectrum, parseSpectrum, type Sample } from '../core/spectrum';

export class SpectrumFileError extends Error {
  constructor(readonly code:'source'|'download'|'size'|'digest') { super(`Spectrum file: ${code}`); this.name='SpectrumFileError'; }
}
export type VerifiedSpectrum = Readonly<{ samples:readonly Sample[]; sha256:string }>;
export type ImportedSpectrum = VerifiedSpectrum & Readonly<{sourceText:string;legacyHeader?:LegacySpectrumHeader}>;
const cache=new Map<string,VerifiedSpectrum>();
function checkAbort(signal?:AbortSignal) { if(signal?.aborted) throw new DOMException('Source loading was cancelled','AbortError'); }
/** Shared byte boundary; preserves library flux>1 and the distinct normalized
 * user-observation parser. Copy first so a caller cannot change bytes between
 * hashing and parsing. No imported observation enters the library cache. */
async function decode(bytes:ArrayBuffer,kind:'library'|'observation',expectedSha256?:string):Promise<ImportedSpectrum> {
  if(bytes.byteLength>MAX_FILE_BYTES) throw new SpectrumFileError('size');
  const copy=new Uint8Array(bytes).slice();
  const sha256=await resourceSha256(copy);
  if(expectedSha256 && sha256!==expectedSha256.toLowerCase()) throw new SpectrumFileError('digest');
  // Preserve a UTF8 BOM in the retained text so session round trips hash the
  // exact imported bytes. The numeric parser explicitly handles the BOM.
  const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(copy);
  // The marker, never the extension, selects the bounded ASCII SSP contract.
  // Retain/hash all original bytes. Header claims do not grant acquisition origin.
  let legacy=null;
  if(kind==='observation'&&text.replace(/^\uFEFF/,'').trimStart().startsWith('*SpHdr*')){
    try{legacy=parseLegacySpectrumFile(copy);}
    catch(error){if(error instanceof LegacySpectrumFileError)throw diagnosticError('ssp.invalid',{code:error.code});throw error;}
  }
  if(legacy?.samples.some(p=>p.intensity>1||p.intensity< -2147483648))throw diagnosticError('ssp.intensity');
  const samples=legacy?.samples??(kind==='library'?parseLibrarySpectrum:parseSpectrum)(text);
  return Object.freeze({sha256,sourceText:text,...(legacy?.header?{legacyHeader:legacy.header}:{}),samples:Object.freeze(samples.map(sample=>Object.freeze({...sample})))});
}
async function boundedBody(response:Response,signal?:AbortSignal):Promise<ArrayBuffer>{try{return await boundedResourceBody(response,MAX_FILE_BYTES,signal);}catch(error){if(error instanceof BoundedResourceError)throw new SpectrumFileError(error.code);throw error;}}
/** Fixed local original-resource URLs only. Known Content-Length is checked
 * before reading; streamed byte count is authoritative even without the header.
 * Completed verified samples have a bounded8-entry content-hash LRU cache. */
export async function loadVerifiedLibrarySpectrum(source:Readonly<{url:string;sha256:string}>,signal?:AbortSignal):Promise<VerifiedSpectrum> {
  if(!/^\/original\/[A-Za-z0-9_./-]+$/.test(source.url) || source.url.split('/').some(part=>part==='..'||part==='.') || !/^[a-f0-9]{64}$/i.test(source.sha256)) throw new SpectrumFileError('source');
  checkAbort(signal);const key=source.sha256.toLowerCase(),hit=cache.get(key);
  if(hit){cache.delete(key);cache.set(key,hit);return hit;}
  const response=await fetch(source.url,{signal});if(!response.ok){try{await response.body?.cancel();}catch{/* Keep the HTTP failure. */}throw new SpectrumFileError('download');}
  const bytes=await boundedBody(response,signal),decoded=await decode(bytes,'library',key);checkAbort(signal);
  const verified=Object.freeze({samples:decoded.samples,sha256:decoded.sha256});
  cache.set(key,verified);while(cache.size>8)cache.delete(cache.keys().next().value!);
  return verified;
}
/** File.size is a browser-supplied byte bound, checked before arrayBuffer(). */
export async function readImportedSpectrum(file:File):Promise<ImportedSpectrum> {
  if(file.size>MAX_FILE_BYTES)throw new SpectrumFileError('size');
  return decode(await file.arrayBuffer(),'observation');
}
/** Session text is untrusted: re-encode, hash and parse again. Never restore
 * precomputed samples or trust a stored digest as proof of original authorship. */
export async function verifyImportedSpectrumText(sourceText:string,sha256:string):Promise<ImportedSpectrum> {
  if(sourceText.length>MAX_FILE_BYTES)throw new SpectrumFileError('size');
  return decode(new TextEncoder().encode(sourceText).buffer,'observation',sha256);
}
