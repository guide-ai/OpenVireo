import{resourceSha256}from'./boundedResource';
import{WEDGE_LIMITS}from'../core/wedgeLssText';
/** Browser read of one user-selected LSS saved-data file: size bound before reading,
 * exact bytes and SHA-256 retained. No network, worker or storage is used. */
export class WedgeFileError extends Error{constructor(readonly code:'size'|'read'|'aborted'){super('LSS file '+code);this.name='WedgeFileError';}}
export type WedgeFileBytes=Readonly<{name:string;sha256:string;bytes:Uint8Array}>;
export async function readWedgeLssFile(file:Blob&{name:string},signal?:AbortSignal):Promise<WedgeFileBytes>{
 if(signal?.aborted)throw new WedgeFileError('aborted');
 if(file.size>WEDGE_LIMITS.fileBytes)throw new WedgeFileError('size');
 let buffer:ArrayBuffer;
 try{buffer=await file.arrayBuffer();}catch{throw new WedgeFileError('read');}
 if(signal?.aborted)throw new WedgeFileError('aborted');
 if(buffer.byteLength>WEDGE_LIMITS.fileBytes)throw new WedgeFileError('size');
 const bytes=new Uint8Array(buffer),sha256=await resourceSha256(bytes);
 if(signal?.aborted)throw new WedgeFileError('aborted');
 return Object.freeze({name:file.name,sha256,bytes});
}
/** Revocation waits 1000 ms like the project's other downloads (compatibility-policy
 * alignment; no failure with an immediate revoke was reproduced). */
export function downloadWedgeText(name:string,text:string,type='text/csv;charset=utf-8'){
 const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
