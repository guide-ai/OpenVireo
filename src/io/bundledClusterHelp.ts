// Same-origin bundled copies of the original VIREO HRAnalHlp.LST and HRAnalHlp.TXT (docs/LOCAL-RESOURCES.json,
// docs/RESOURCE-PROVENANCE.json group public/original/cluster-help; user approval of 2026-10-28 in AGENTS.md).
// Web adapter, not an original contract: VIREO opens the files from its help directory (options +0x6b4+0x26c, default not
// traced). Bytes are fetched only from this origin, bounded to and checked for the exact recorded size and SHA-256 BEFORE
// they are parsed. Nothing is cached, persisted or sent anywhere.
import {HELP_FILES} from '../help/helpFiles';
import {BoundedResourceError,boundedResourceBody,checkResourceAbort,resourceSha256} from './boundedResource';

export type BundledClusterHelpIdentity=Readonly<{path:string;name:string;bytes:number;sha256:string;archiveMember:string}>;
export const BUNDLED_CLUSTER_HELP_ARCHIVE_SHA256='58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b';
/** The identities come from src/help/helpFiles.ts, the single source of every bundled help file (review 1 I1). */
export const BUNDLED_CLUSTER_HELP_LIST:BundledClusterHelpIdentity=HELP_FILES['HRANALHLP.LST'];
export const BUNDLED_CLUSTER_HELP_TEXT:BundledClusterHelpIdentity=HELP_FILES['HRANALHLP.TXT'];
/** download: the request failed or answered without a body; size: not exactly the recorded byte count; sha256: other bytes. */
export type BundledClusterHelpFailure='download'|'size'|'sha256';
export class BundledClusterHelpError extends Error{
 constructor(readonly code:BundledClusterHelpFailure){super(`Bundled cluster help file: ${code}`);this.name='BundledClusterHelpError';}
}
/** An abort rejects with the DOMException AbortError; every other failure is a BundledClusterHelpError. */
export async function fetchBundledClusterHelp(fetcher:typeof fetch,signal:AbortSignal,expected:BundledClusterHelpIdentity):Promise<Uint8Array>{
 checkResourceAbort(signal);
 let buffer:ArrayBuffer;
 try{
  const response=await fetcher(expected.path,{signal,credentials:'same-origin'});
  buffer=await boundedResourceBody(response,expected.bytes,signal);
 }catch(error){
  checkResourceAbort(signal);
  if(error instanceof BoundedResourceError)throw new BundledClusterHelpError(error.code==='size'?'size':'download');
  throw new BundledClusterHelpError('download');
 }
 checkResourceAbort(signal);
 if(buffer.byteLength!==expected.bytes)throw new BundledClusterHelpError('size');
 const sha256=await resourceSha256(buffer);
 checkResourceAbort(signal);
 if(sha256!==expected.sha256)throw new BundledClusterHelpError('sha256');
 return new Uint8Array(buffer);
}
