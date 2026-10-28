// Same-origin bundled copies of the original VIREO CLEA_VStrs.dat and VarTypeHlp.TXT (docs/LOCAL-RESOURCES.json,
// docs/RESOURCE-PROVENANCE.json group public/original/variables; user approvals of 2026-10-26 and 2026-10-27 in AGENTS.md).
// Web adapter, not an original contract: the original opens the files from its program folder. Bytes are fetched only from this
// origin, bounded to and checked for the exact recorded size and SHA-256 BEFORE any record is decoded. Nothing is cached,
// persisted or sent anywhere.
import {VSTRS_FILE_BYTES} from '../core/variableStars';
import {BoundedResourceError,boundedResourceBody,checkResourceAbort,resourceSha256} from './boundedResource';

export type BundledVariableFileIdentity=Readonly<{path:string;name:string;bytes:number;sha256:string;archiveMember:string}>;
export const BUNDLED_VARIABLE_ARCHIVE_SHA256='58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b';
export const BUNDLED_VARIABLE_STARS:BundledVariableFileIdentity=Object.freeze({path:'/original/variables/CLEA_VStrs.dat',name:'CLEA_VStrs.dat',bytes:VSTRS_FILE_BYTES,
 sha256:'55b7e3c392caf7d9df729b8222c4f2164fc0e23bde5da7c4e6c05ff679dc87de',archiveMember:'program files/CLEA/VIREO/CLEA_VStrs.dat'});
export const BUNDLED_VARIABLE_TYPE_HELP:BundledVariableFileIdentity=Object.freeze({path:'/original/variables/VarTypeHlp.TXT',name:'VarTypeHlp.TXT',bytes:743,
 sha256:'d92f4a14aa7a2923d2921d4ab7fe90a38870e8667b7274629884b69bb6c5f445',archiveMember:'program files/CLEA/VIREO/VarTypeHlp.TXT'});
/** download: the request failed or answered without a body; size: not exactly the recorded byte count; sha256: other bytes. */
export type BundledVariableFileFailure='download'|'size'|'sha256';
export class BundledVariableFileError extends Error{
 constructor(readonly code:BundledVariableFileFailure){super(`Bundled variable-star file: ${code}`);this.name='BundledVariableFileError';}
}
export async function verifyBundledVariableFile(buffer:ArrayBuffer,expected:BundledVariableFileIdentity,signal?:AbortSignal):Promise<Uint8Array>{
 if(buffer.byteLength!==expected.bytes)throw new BundledVariableFileError('size');
 const sha256=await resourceSha256(buffer);
 checkResourceAbort(signal);
 if(sha256!==expected.sha256)throw new BundledVariableFileError('sha256');
 return new Uint8Array(buffer);
}
/** An abort rejects with the DOMException AbortError; every other failure is a BundledVariableFileError. */
export async function fetchBundledVariableFile(fetcher:typeof fetch,signal:AbortSignal,expected:BundledVariableFileIdentity):Promise<Uint8Array>{
 checkResourceAbort(signal);
 let buffer:ArrayBuffer;
 try{
  const response=await fetcher(expected.path,{signal,credentials:'same-origin'});
  buffer=await boundedResourceBody(response,expected.bytes,signal);
 }catch(error){
  checkResourceAbort(signal);
  if(error instanceof BoundedResourceError)throw new BundledVariableFileError(error.code==='size'?'size':'download');
  throw new BundledVariableFileError('download');
 }
 checkResourceAbort(signal);
 return verifyBundledVariableFile(buffer,expected,signal);
}
