/** CLEA_GLX.DAT typed 59-byte galaxy records (reader 0x598acc; CLEA_Vireo.zip member program files/CLEA/VIREO/CLEA_GLX.DAT,
 * SHA-256 4c1c9c99…f753, second user approval of 2026-10-26 in AGENTS.md). Pure decoder only: the whole catalogue keeps its
 * source order; no sort, deduplication, tie rejection or insertion order is applied here. An enabled field's galaxy order comes
 * from its own whole-source-checked snapshot (pinnedGalaxyField.ts), never from this parser. Offsets are the ones already used by
 * the pinned field builder: Double RA/Dec at 0/8, Single axes/magnitude/z at 16..28, Int16 PA at 32, Int8 morphology at 34, name
 * kind at 38 (0 NGC, 1 IC) with short string at 39, otherwise short string at 47. Number/TextDecoder policy, not x87 execution. */
export const GLX_CATALOG=Object.freeze({name:'CLEA_GLX.DAT',recordBytes:59,records:24069,bytes:1420071,
 sha256:'4c1c9c99babaae19e22834df9bfcfa375a659257c4b7dd267a9da7d8ef16f753',reader:'0x598acc'});
export class GlxCatalogError extends Error{
 constructor(readonly code:'size'|'record'|'name'|'number',readonly index=-1){super(`CLEA_GLX.DAT ${code}${index>=0?' @'+index:''}`);this.name='GlxCatalogError';}
}
export type GlxRecord=Readonly<{id:string;ra:number;dec:number;majorArcminutes:number;minorArcminutes:number;magnitude:number;redshift:number;positionAngleDegrees:number;morphology:number}>;
export type IndexedGlxRecord=GlxRecord&Readonly<{recordIndex:number}>;
/** One 59-byte record. Name kind 0/1 prefixes NGC/IC to the string at 39; any other kind reads the string at 47.
 * Short-string lengths beyond the record or non-finite numeric fields are rejected for this record only. */
export function decodeGlxRecord(raw:Uint8Array,index=-1):GlxRecord{
 if(!(raw instanceof Uint8Array)||raw.length!==GLX_CATALOG.recordBytes)throw new GlxCatalogError('record',index);
 const v=new DataView(raw.buffer,raw.byteOffset,raw.byteLength),catalogued=raw[38]<2,at=catalogued?40:48,length=raw[at-1];
 if(at+length>raw.length)throw new GlxCatalogError('name',index);
 const text=new TextDecoder().decode(raw.slice(at,at+length)).trim(),id=catalogued?(raw[38]===0?'NGC ':'IC ')+text:text;
 const record={id,ra:v.getFloat64(0,true),dec:v.getFloat64(8,true),majorArcminutes:v.getFloat32(16,true),minorArcminutes:v.getFloat32(20,true),magnitude:v.getFloat32(24,true),redshift:v.getFloat32(28,true),positionAngleDegrees:v.getInt16(32,true),morphology:v.getInt8(34)};
 if(![record.ra,record.dec,record.majorArcminutes,record.minorArcminutes,record.magnitude,record.redshift].every(Number.isFinite))throw new GlxCatalogError('number',index);
 return Object.freeze(record);
}
/** Whole file: exactly 24069 records. The caller verifies size and SHA-256 of the bytes before calling (identity first). */
export function parseGlxCatalog(bytes:Uint8Array):readonly IndexedGlxRecord[]{
 if(!(bytes instanceof Uint8Array)||bytes.byteLength!==GLX_CATALOG.bytes)throw new GlxCatalogError('size');
 return Object.freeze(Array.from({length:GLX_CATALOG.records},(_,i)=>Object.freeze({...decodeGlxRecord(bytes.subarray(i*59,(i+1)*59),i),recordIndex:i})));
}
export function glxRecordAt(bytes:Uint8Array,index:number):IndexedGlxRecord{
 if(!(bytes instanceof Uint8Array)||bytes.byteLength!==GLX_CATALOG.bytes)throw new GlxCatalogError('size');
 if(!Number.isInteger(index)||index<0||index>=GLX_CATALOG.records)throw new GlxCatalogError('record',index);
 return Object.freeze({...decodeGlxRecord(bytes.subarray(index*59,(index+1)*59),index),recordIndex:index});
}
