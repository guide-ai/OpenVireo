// Same-origin bundled copies of the original Object X resources (docs/LOCAL-RESOURCES.json, docs/RESOURCE-PROVENANCE.json
// groups public/original/orbit and public/original/hotlists; approvals of 2026-10-26, 2026-10-27 and the later ObjX_MPC.CMO.sav
// approval in AGENTS.md). Web adapter,
// not an original contract: the original opens ORBIT\OBJX_MPC.CMO (default, exe 0x5a2dc4; settings+0x1ccc) or a file chosen in
// its options and ObjectX.HTL from its program folder. The orbit file is fetched lazily (31 MB for ObjX_MPC.CMO) only when an
// Object X investigation needs it; bytes are bounded to and checked for the exact recorded size and SHA-256 BEFORE parsing.
// Front REL1 [W] (user decision of 2026-11-07, decision 4): ObjX_MPC.CMO exceeds Cloudflare's 25 MiB per-file limit, so it is
// stored and served as three byte-exact record-aligned tiles of 65536 records (docs/LOCAL-RESOURCES.json assembled[]); each
// tile is checked for its size and SHA-256, then the assembled file for the whole file's size and SHA-256, before parsing.
// Verified bytes are kept in memory for the tab (Front F2); nothing is persisted or sent anywhere.
import {BundledHotListError,fetchBundledHotList,type BundledHotListBytes,type BundledHotListIdentity} from './bundledHotList';
import {checkResourceAbort,resourceSha256,verifiedSameOriginResource,verifiedSameOriginTiles,type SameOriginTile} from './boundedResource';

const ARCHIVE_SHA256='58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b';
export type BundledOrbitFileId='ObjX_MPC.CMO.sav'|'ObjX_MPC.CMO'|'ObjX_AST.CMO';
/** `path` is where the whole file is served; a tiled file (`tiles`, in order) is served only as its tiles and `path` is then
 * the tile directory, used only to key the verified bytes kept for the tab (never fetched). */
export type BundledOrbitFileIdentity=Readonly<{id:BundledOrbitFileId;path:string;bytes:number;records:number;sha256:string;archiveSha256:string;archiveMember:string;tiles?:readonly SameOriginTile[]}>;
/** Front REL1: tiles of 65536 162-byte records (10616832 bytes, the GSC tiles' record count), under 25 MiB with a wide margin.
 * Rule (review 1 L5): /original and /camera files are cached for a day by their file names (public/_headers), so the bytes at an
 * existing URL must never change. A file re-cut into other tiles, or a re-extracted file, gets a new path. */
export const ORBIT_TILE_RECORDS=65536;
export const BUNDLED_ORBIT_FILES:Readonly<Record<BundledOrbitFileId,BundledOrbitFileIdentity>>=Object.freeze({
 'ObjX_MPC.CMO.sav':Object.freeze({id:'ObjX_MPC.CMO.sav',path:'/original/orbit/ObjX_MPC.CMO.sav',bytes:4798116,records:29618,
  sha256:'efd665a75dbd1d8afeb68b4c7b947d82304ffe2b6355cd2c7e74e58347124030',archiveSha256:ARCHIVE_SHA256,archiveMember:'program files/CLEA/VIREO/Orbit/ObjX_MPC.CMO.sav'}),
 'ObjX_MPC.CMO':Object.freeze({id:'ObjX_MPC.CMO',path:'/original/orbit/ObjX_MPC/',bytes:30989466,records:191293,
  sha256:'b41e03f14dcef5a54dea67e156e0e7cf2b654432a85bf6d10611ed8e6d25802e',archiveSha256:ARCHIVE_SHA256,archiveMember:'program files/CLEA/VIREO/Orbit/ObjX_MPC.CMO',
  tiles:Object.freeze([
   Object.freeze({path:'/original/orbit/ObjX_MPC/000.bin',bytes:10616832,sha256:'c38c7a452ce5199c414d507624cacd36a34ec88794687e8f223754b3d34b6d7b'}),
   Object.freeze({path:'/original/orbit/ObjX_MPC/001.bin',bytes:10616832,sha256:'196f8adef4c7650cc2b900645e16b5fbe558e93f4f2feaaff047c59a4bfb607e'}),
   Object.freeze({path:'/original/orbit/ObjX_MPC/002.bin',bytes:9755802,sha256:'84b4ce5ae83f45b68e6ea0c12d04e8d2f477776505771acf19d0ac1a6308d159'}),
  ])}),
 'ObjX_AST.CMO':Object.freeze({id:'ObjX_AST.CMO',path:'/original/orbit/ObjX_AST.CMO',bytes:4750326,records:29323,
  sha256:'341134bf9033989fa2c7fa9008551fa8ef015ee158ec5a25c04754696e58ba12',archiveSha256:ARCHIVE_SHA256,archiveMember:'program files/CLEA/VIREO/Orbit/ObjX_AST.CMO'}),
});
/** The original options default (ORBIT\OBJX_MPC.CMO). */
export const ORIGINAL_DEFAULT_ORBIT_FILE:BundledOrbitFileId='ObjX_MPC.CMO';
/** Web choice (coordinator decision): ObjX_MPC.CMO.sav reproduces the three ObjectX.HTL moving rows at the original default
 * 2009-06-01 04:00 UT (Eros 0.04″, Pluto 1.4″, 1994 CC 0.04″), while the shipped ObjX_MPC.CMO misses 1994 CC by 0.86°
 * (docs/OBJECT-X.md). */
export const DEFAULT_ORBIT_FILE:BundledOrbitFileId='ObjX_MPC.CMO.sav';
/** Selection order offered to the student. */
export const SELECTABLE_ORBIT_FILES:readonly BundledOrbitFileId[]=Object.freeze(['ObjX_MPC.CMO.sav','ObjX_MPC.CMO','ObjX_AST.CMO']);
/** ObjectX.HTL: 17 records of 86 bytes. Both the identifier ("(433) Eros", "NGC 2403", "0329+54", …) and the remarks reveal
 * each target's identity: callers show only an opaque label and the coordinates until the reveal. Hiding is presentation-level
 * only — the file is publicly fetchable from this origin. */
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

/** Fetches one orbit file from this origin (bounded; a tiled file tile by tile, each tile verified), then verifies it. Abort rejects with the DOMException AbortError; every
 * other failure is a BundledOrbitFileError. Verified bytes are kept in memory for the tab and re-checked on reuse
 * (verifiedSameOriginResource, Front F2), so Save's replay of an Object X investigation needs no new download. */
export async function fetchBundledOrbitFile(fetcher:typeof fetch,signal:AbortSignal,id:BundledOrbitFileId=DEFAULT_ORBIT_FILE):Promise<BundledOrbitFileBytes>{
 const expected=BUNDLED_ORBIT_FILES[id];
 if(!expected)throw new BundledOrbitFileError('download');
 if(expected.tiles)return verifiedSameOriginTiles(fetcher,signal,expected.path,expected.tiles,buffer=>verifyBundledOrbitFile(buffer,id,signal),code=>new BundledOrbitFileError(code));
 return verifiedSameOriginResource(fetcher,signal,expected.path,expected.bytes,buffer=>verifyBundledOrbitFile(buffer,id,signal),code=>new BundledOrbitFileError(code));
}

/** ObjectX.HTL through the existing hot-list adapter (size and SHA-256 before parsing). Not offered in the observatory's
 * exercise-list buttons, which would show identifiers and remarks. */
export function fetchObjectXHotList(fetcher:typeof fetch,signal:AbortSignal):Promise<BundledHotListBytes>{
 return fetchBundledHotList(fetcher,signal,BUNDLED_OBJECT_X_HOT_LIST);
}
export {BundledHotListError};
