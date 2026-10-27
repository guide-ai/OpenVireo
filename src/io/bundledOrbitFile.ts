// Same-origin bundled copies of the original Object X resources (docs/LOCAL-RESOURCES.json, docs/RESOURCE-PROVENANCE.json
// groups public/original/orbit and public/original/hotlists; approvals of 2026-10-26 and 2026-10-27 in AGENTS.md). Web adapter,
// not an original contract: the original opens ORBIT\OBJX_MPC.CMO (default, exe 0x5a2dc4; settings+0x1ccc) or a file chosen in
// its options and ObjectX.HTL from its program folder. The orbit file is fetched lazily (31 MB for ObjX_MPC.CMO) only when an
// Object X investigation needs it; bytes are bounded to and checked for the exact recorded size and SHA-256 BEFORE parsing.
// Nothing is cached, persisted or sent anywhere.
import {BundledHotListError,fetchBundledHotList,type BundledHotListBytes,type BundledHotListIdentity} from './bundledHotList';
import {BoundedResourceError,boundedResourceBody,checkResourceAbort,resourceSha256} from './boundedResource';

const ARCHIVE_SHA256='58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b';
export type BundledOrbitFileId='ObjX_MPC.CMO'|'ObjX_AST.CMO';
export type BundledOrbitFileIdentity=Readonly<{id:BundledOrbitFileId;path:string;bytes:number;records:number;sha256:string;archiveSha256:string;archiveMember:string}>;
export const BUNDLED_ORBIT_FILES:Readonly<Record<BundledOrbitFileId,BundledOrbitFileIdentity>>=Object.freeze({
 'ObjX_MPC.CMO':Object.freeze({id:'ObjX_MPC.CMO',path:'/original/orbit/ObjX_MPC.CMO',bytes:30989466,records:191293,
  sha256:'b41e03f14dcef5a54dea67e156e0e7cf2b654432a85bf6d10611ed8e6d25802e',archiveSha256:ARCHIVE_SHA256,archiveMember:'program files/CLEA/VIREO/Orbit/ObjX_MPC.CMO'}),
 'ObjX_AST.CMO':Object.freeze({id:'ObjX_AST.CMO',path:'/original/orbit/ObjX_AST.CMO',bytes:4750326,records:29323,
  sha256:'341134bf9033989fa2c7fa9008551fa8ef015ee158ec5a25c04754696e58ba12',archiveSha256:ARCHIVE_SHA256,archiveMember:'program files/CLEA/VIREO/Orbit/ObjX_AST.CMO'}),
});
/** The original default orbit file. */
export const DEFAULT_ORBIT_FILE:BundledOrbitFileId='ObjX_MPC.CMO';
/** ObjectX.HTL: 17 records of 86 bytes. Its remarks reveal each target's identity; callers must not show them before the reveal. */
export const BUNDLED_OBJECT_X_HOT_LIST:BundledHotListIdentity=Object.freeze({path:'/original/hotlists/ObjectX.HTL',name:'ObjectX.HTL',bytes:1462,
 sha256:'fd9e68e4c1cd1c89584581be329c157af1edf139aabc7591f397fd49858243b3'});

export type BundledOrbitFileFailure='download'|'size'|'sha256';
export class BundledOrbitFileError extends Error{
 constructor(readonly code:BundledOrbitFileFailure){super(`Bundled orbit file: ${code}`);this.name='BundledOrbitFileError';}
}
export type BundledOrbitFileBytes=Readonly<{id:BundledOrbitFileId;bytes:Uint8Array;sha256:string}>;

/** Exact identity check of bytes already read: size first, then SHA-256. */
export async function verifyBundledOrbitFile(buffer:ArrayBuffer,id:BundledOrbitFileId=DEFAULT_ORBIT_FILE,signal?:AbortSignal):Promise<BundledOrbitFileBytes>{
 const expected=BUNDLED_ORBIT_FILES[id];
 if(buffer.byteLength!==expected.bytes)throw new BundledOrbitFileError('size');
 const sha256=await resourceSha256(buffer);
 checkResourceAbort(signal);
 if(sha256!==expected.sha256)throw new BundledOrbitFileError('sha256');
 return Object.freeze({id,bytes:new Uint8Array(buffer),sha256});
}

/** Fetches one orbit file from this origin (bounded), then verifies it. Abort rejects with the DOMException AbortError; every
 * other failure is a BundledOrbitFileError. */
export async function fetchBundledOrbitFile(fetcher:typeof fetch,signal:AbortSignal,id:BundledOrbitFileId=DEFAULT_ORBIT_FILE):Promise<BundledOrbitFileBytes>{
 const expected=BUNDLED_ORBIT_FILES[id];
 if(!expected)throw new BundledOrbitFileError('download');
 checkResourceAbort(signal);
 let buffer:ArrayBuffer;
 try{
  const response=await fetcher(expected.path,{signal,credentials:'same-origin'});
  buffer=await boundedResourceBody(response,expected.bytes,signal);
 }catch(error){
  checkResourceAbort(signal);
  if(error instanceof BoundedResourceError)throw new BundledOrbitFileError(error.code==='size'?'size':'download');
  throw new BundledOrbitFileError('download');
 }
 checkResourceAbort(signal);
 return verifyBundledOrbitFile(buffer,id,signal);
}

/** ObjectX.HTL through the existing hot-list adapter (size and SHA-256 before parsing). Not offered in the observatory's
 * exercise-list buttons, which would show the remarks. */
export function fetchObjectXHotList(fetcher:typeof fetch,signal:AbortSignal):Promise<BundledHotListBytes>{
 return fetchBundledHotList(fetcher,signal,BUNDLED_OBJECT_X_HOT_LIST);
}
export {BundledHotListError};
