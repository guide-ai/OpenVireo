/** E08 Object X orbit files (X0a/X2): the 162-byte records of ObjX_MPC.CMO (191293 records, the original default
 * ORBIT\OBJX_MPC.CMO at exe 0x5a2dc4) and ObjX_AST.CMO (29323 records), byte-exact from CLEA_Vireo.zip. Layout recovered
 * statically from CLEA_VEO.exe 781bc970…c54c: the in-memory reader 0x515f24 reads the first 156 bytes of a record (name
 * block, epoch, state vector, central body, magnitude block and coordinate-frame header); the 6 trailing flag bytes are
 * read by the asteroid list form (docs/OBJECT-X.md). Evidence: research notes-x0a.md (front-x-objectx-20261027).
 *
 * Each record holds a heliocentric state vector (km, km/s) in the J2000 ecliptic frame, not classical elements; the
 * ephemeris converts it with 0x517af8 (src/core/ephemeris.ts). Extended values are rounded once to binary64. Pure. */

export const ORBIT_RECORD_BYTES=162;
/** Bytes the original's in-memory record (0x515f24) carries; the rest are the 6 flag bytes. */
export const ORBIT_STATE_BYTES=156;
export type OrbitFileErrorCode='size'|'layout'|'index'|'text'|'number';
export class OrbitFileError extends Error{
 constructor(readonly code:OrbitFileErrorCode,readonly record=-1){super(`Orbit file ${code}${record>=0?` (record ${record})`:''}`);this.name='OrbitFileError';}
}
export type Vector3=readonly [number,number,number];
/** Coordinate-frame header at +0x8f (consumed by 0x4b98cc): type byte, sub byte, tag byte and the equinox JD. */
export type OrbitFrame=Readonly<{type:number;sub:number;tag:number;equinoxJd:number}>;
export type OrbitRecord=Readonly<{
 index:number;
 /** +0x00: copied to element byte +0xba by 0x515f24; meaning not recovered. */
 prefix:number;
 /** +0x01 ShortString[40] exactly as stored (MPC names are space-padded) and its display form without trailing spaces. */
 rawName:string;name:string;
 /** +0x2a ShortString[8] (asteroid number, may be empty). */
 number:string;
 /** +0x33 Extended epoch JD of the state vector. */
 epochJd:number;
 /** +0x3d position (km) and +0x5b velocity (km/s), three Extended each. */
 position:Vector3;velocity:Vector3;
 /** +0x79 central body: index into the GM table 0x5b57e0 (0 = Sun). */
 centralBody:number;
 /** +0x7a magnitude model (1 = H,G; 2 = comet H,K; other = magnitude 100), +0x7b H and +0x85 G (or K). */
 magnitudeModel:number;h:number;g:number;
 frame:OrbitFrame;
 /** +0x9c..+0xa1, not read by the ephemeris (asteroid list form). */
 flags:readonly number[];
}>;

const fail=(code:OrbitFileErrorCode,record=-1):never=>{throw new OrbitFileError(code,record);};

/** Number of records; the file must be a whole number of 162-byte records. */
export function orbitRecordCount(bytes:Uint8Array):number{
 if(!(bytes instanceof Uint8Array)||bytes.byteLength===0)return fail('size');
 if(bytes.byteLength%ORBIT_RECORD_BYTES)return fail('layout');
 return bytes.byteLength/ORBIT_RECORD_BYTES;
}

/** 80-bit Extended → binary64, rounded once to nearest-even: the 64-bit significand is formed as hi·2^32 + lo (one
 * rounding, the product is exact) and scaled by an exact power of two. Rejects NaN/Inf, pseudo-denormals, unnormals and
 * results outside the normal binary64 range (none occur in the bundled files). */
export function decodeExtended(bytes:Uint8Array,at:number,record=-1):number{
 const view=new DataView(bytes.buffer,bytes.byteOffset+at,10),lo=view.getUint32(0,true),hi=view.getUint32(4,true),se=view.getUint16(8,true);
 const exponent=se&0x7fff,sign=se&0x8000?-1:1;
 if(exponent===0&&hi===0&&lo===0)return sign*0;
 if(exponent===0x7fff||(hi&0x80000000)===0)return fail('number',record);
 const power=exponent-16383-63;
 if(power+63>1023||power+63<-1022)return fail('number',record);
 const significand=hi*4294967296+lo;
 // Split the scale so neither factor overflows; both factors are exact powers of two.
 const half=Math.trunc(power/2);
 return sign*significand*2**half*2**(power-half);
}

function shortString(bytes:Uint8Array,at:number,max:number,record:number):string{
 const length=bytes[at];
 if(length>max)return fail('text',record);
 let text='';
 for(let i=1;i<=length;i++){const c=bytes[at+i];if(c<32||c===127)return fail('text',record);text+=String.fromCharCode(c);}
 return text;
}

const vector=(bytes:Uint8Array,at:number,record:number):Vector3=>Object.freeze([decodeExtended(bytes,at,record),decodeExtended(bytes,at+10,record),decodeExtended(bytes,at+20,record)]) as Vector3;

/** Decodes one record (0-based index). */
export function readOrbitRecord(bytes:Uint8Array,index:number):OrbitRecord{
 const count=orbitRecordCount(bytes);
 if(!Number.isSafeInteger(index)||index<0||index>=count)return fail('index');
 const r=bytes.subarray(index*ORBIT_RECORD_BYTES,(index+1)*ORBIT_RECORD_BYTES);
 const rawName=shortString(r,0x01,40,index),number=shortString(r,0x2a,8,index);
 return Object.freeze({
  index,prefix:r[0],rawName,name:rawName.replace(/ +$/,''),number,
  epochJd:decodeExtended(r,0x33,index),position:vector(r,0x3d,index),velocity:vector(r,0x5b,index),
  centralBody:r[0x79],magnitudeModel:r[0x7a],h:decodeExtended(r,0x7b,index),g:decodeExtended(r,0x85,index),
  frame:Object.freeze({type:r[0x8f],sub:r[0x90],tag:r[0x91],equinoxJd:decodeExtended(r,0x92,index)}),
  flags:Object.freeze(Array.from(r.subarray(ORBIT_STATE_BYTES,ORBIT_RECORD_BYTES))),
 });
}

/** Name block only (cheap scan): number and display name of a record, without decoding numbers. */
export function orbitRecordLabel(bytes:Uint8Array,index:number):Readonly<{name:string;number:string}>{
 const count=orbitRecordCount(bytes);
 if(!Number.isSafeInteger(index)||index<0||index>=count)return fail('index');
 const at=index*ORBIT_RECORD_BYTES;
 return Object.freeze({name:shortString(bytes,at+0x01,40,index).replace(/ +$/,''),number:shortString(bytes,at+0x2a,8,index)});
}

/** First record whose asteroid number equals `number` exactly (no folding), or whose display name equals `name` when no
 * number is given; null when absent. Linear scan in file order. */
export function findOrbitRecord(bytes:Uint8Array,key:Readonly<{number?:string;name?:string}>):number|null{
 const count=orbitRecordCount(bytes);
 for(let i=0;i<count;i++){
  const label=orbitRecordLabel(bytes,i);
  if(key.number!==undefined?label.number===key.number:label.name===key.name)return i;
 }
 return null;
}
