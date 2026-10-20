/** CLEA_VEO.exe 781bc970…c54c: reader0x5903d8/save0x5919b4 use typed files
 * of0x56bytes. Selection0x591e24 copies Extended at+0x19/+0x23. See HTL-CONTRACT.md.
 * Browser edits use Number;unchanged fields retain all original bytes. */
export const HTL_RECORD_BYTES=86;
export const HTL_MAX_RECORDS=1000;
export const HTL_MAX_BYTES=HTL_RECORD_BYTES*HTL_MAX_RECORDS;
export type HtlErrorCode='size'|'layout'|'text'|'number'|'coordinates'|'index'|'limit';
export class HtlError extends Error{
 readonly code:HtlErrorCode;readonly row:number;
 constructor(code:HtlErrorCode,row=0){super(`HTL ${code}`);this.name='HtlError';this.code=code;this.row=row;}
}
export type HtlFields=Readonly<{id:string;remarks:string;ra:number;dec:number}>;
const original=Symbol('original HTL record');
export type HtlRecord=HtlFields&Readonly<{[original]:readonly number[]}>;
export type HtlList=readonly HtlRecord[];
export type HtlEditor=Readonly<{list:HtlList;selected:number|null;previous:Readonly<{list:HtlList;selected:number|null}>|null}>;
const fail=(code:HtlErrorCode,row=0):never=>{throw new HtlError(code,row);};
function roundShift(value:bigint,shift:number){
 if(shift<=0)return value<<BigInt(-shift);
 const n=BigInt(shift),whole=value>>n,remainder=value-(whole<<n),half=1n<<(n-1n);
 return whole+(remainder>half||remainder===half&&(whole&1n)!==0n?1n:0n);
}
/** Exact integer rounding to binary64,nearest/even;not x87 execution. */
export function decodeHtlExtended(bytes:Uint8Array):number{
 if(bytes.length!==10)return fail('number');
 const view=new DataView(bytes.buffer,bytes.byteOffset,10),significand=view.getBigUint64(0,true),se=view.getUint16(8,true),exp=se&0x7fff,sign=BigInt(se>>>15)<<63n;
 if(exp===0x7fff||exp===0&&(significand>>63n)!==0n||exp!==0&&(significand>>63n)!==1n)return fail('number');
 let bits=sign;
 if(significand){
  const high=significand.toString(2).length-1,power=(exp?exp-16383:1-16383)-63;let e=high+power;
  if(e>1023)return fail('number');
  if(e>=-1022){let m=roundShift(significand,high-52);if(m===1n<<53n){m>>=1n;e++;}if(e>1023)return fail('number');bits|=BigInt(e+1023)<<52n|m-(1n<<52n);}
  else{const m=roundShift(significand,-power-1074);if(m===0n)return fail('number');bits|=m;}
 }
 const output=new DataView(new ArrayBuffer(8));output.setBigUint64(0,bits,true);return output.getFloat64(0,true);
}
/** Canonical Extended representation of the exact binary64 edit value. */
export function encodeHtlExtended(value:number):Uint8Array{
 if(!Number.isFinite(value))return fail('number');
 const source=new DataView(new ArrayBuffer(8));source.setFloat64(0,value,true);const bits=source.getBigUint64(0,true),sign=Number(bits>>63n)<<15,e=Number(bits>>52n&0x7ffn),fraction=bits&((1n<<52n)-1n);let exp=0,m=0n;
 if(e){exp=e-1023+16383;m=((1n<<52n)|fraction)<<11n;}
 else if(fraction){const length=fraction.toString(2).length;exp=length-1-1074+16383;m=fraction<<BigInt(64-length);}
 const output=new Uint8Array(10),view=new DataView(output.buffer);view.setBigUint64(0,m,true);view.setUint16(8,sign|exp,true);return output;
}
function coordinates(ra:number,dec:number,row=0){if(!Number.isFinite(ra)||!Number.isFinite(dec)||ra<0||ra>=24||Math.abs(dec)>90)return fail('coordinates',row);}
function readText(bytes:Uint8Array,at:number,max:number,row:number){const n=bytes[at];if(n>max)return fail('text',row);let text='';for(const value of bytes.subarray(at+1,at+1+n)){if(value<32||value>=127&&value<160)return fail('text',row);text+=String.fromCharCode(value);}return text;}
function record(bytes:Uint8Array,row:number):HtlRecord{
 const id=readText(bytes,0,24,row),remarks=readText(bytes,45,40,row);let ra:number,dec:number;
 try{ra=decodeHtlExtended(bytes.subarray(25,35));dec=decodeHtlExtended(bytes.subarray(35,45));}catch(error){if(error instanceof HtlError)return fail(error.code,row);throw error;}
 coordinates(ra,dec,row);
 return Object.freeze({id,remarks,ra,dec,[original]:Object.freeze([...bytes])});
}
export function parseHtl(bytes:Uint8Array):HtlList{
 if(!(bytes instanceof Uint8Array)||bytes.byteLength>HTL_MAX_BYTES)return fail('size');
 if(bytes.byteLength%HTL_RECORD_BYTES)return fail('layout');
 return Object.freeze(Array.from({length:bytes.byteLength/HTL_RECORD_BYTES},(_,i)=>record(bytes.subarray(i*86,(i+1)*86),i+1)));
}
export function serializeHtl(list:HtlList):Uint8Array{
 if(list.length>HTL_MAX_RECORDS)return fail('limit');
 const bytes=new Uint8Array(list.length*86);list.forEach((row,index)=>{if(!row[original]||row[original].length!==86)return fail('layout',index+1);bytes.set(row[original],index*86);});return bytes;
}
function writeText(bytes:Uint8Array,at:number,max:number,text:string,row:number){
 if(typeof text!=='string'||text.length>max||!/^[\x20-\x7e]*$/.test(text))return fail('text',row);
 // Preserve bytes after the new short-string value;their native semantics are unknown.
 bytes[at]=text.length;for(let i=0;i<text.length;i++)bytes[at+1+i]=text.charCodeAt(i);
}
export function updateHtlRecord(source:HtlRecord|null,fields:HtlFields,row=1):HtlRecord{
 if(typeof fields.id!=='string'||!fields.id.trim())return fail('text',row);coordinates(fields.ra,fields.dec,row);
 const bytes=source?Uint8Array.from(source[original]):new Uint8Array(86);
 if(!source||source.id!==fields.id)writeText(bytes,0,24,fields.id,row);
 if(!source||source.remarks!==fields.remarks)writeText(bytes,45,40,fields.remarks,row);
 if(!source||!Object.is(source.ra,fields.ra))bytes.set(encodeHtlExtended(fields.ra),25);
 if(!source||!Object.is(source.dec,fields.dec))bytes.set(encodeHtlExtended(fields.dec),35);
 return record(bytes,row);
}
export const newHtlEditor=(list:HtlList=Object.freeze([])):HtlEditor=>Object.freeze({list,selected:list.length?0:null,previous:null});
function selectedRow(state:HtlEditor,index:number){if(!Number.isInteger(index)||index<0||index>=state.list.length)return fail('index');return state.list[index];}
export function selectHtlRow(state:HtlEditor,index:number):HtlEditor{selectedRow(state,index);return Object.freeze({...state,selected:index});}
function commit(state:HtlEditor,list:HtlList,selected:number|null):HtlEditor{return Object.freeze({list:Object.freeze(list),selected,previous:Object.freeze({list:state.list,selected:state.selected})});}
export function editHtlRow(state:HtlEditor,index:number,fields:HtlFields):HtlEditor{const source=selectedRow(state,index),next=updateHtlRecord(source,fields,index+1);return commit(state,state.list.map((r,i)=>i===index?next:r),index);}
export function addHtlRow(state:HtlEditor,fields:HtlFields):HtlEditor{if(state.list.length>=HTL_MAX_RECORDS)return fail('limit');return commit(state,[...state.list,updateHtlRecord(null,fields,state.list.length+1)],state.list.length);}
export function removeHtlRow(state:HtlEditor,index:number):HtlEditor{selectedRow(state,index);const list=state.list.filter((_,i)=>i!==index);return commit(state,list,list.length?Math.min(index,list.length-1):null);}
export function undoHtl(state:HtlEditor):HtlEditor{return state.previous?Object.freeze({...state.previous,previous:null}):state;}
export function parseHtlCoordinate(text:string):number{if(typeof text!=='string'||text.length>80||!text.trim()||!/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i.test(text))return fail('coordinates');const value=Number(text);if(!Number.isFinite(value))return fail('coordinates');return value;}
export function htlNumberDraft(value:number):string{return Object.is(value,-0)?'-0':value.toString();}
/** Identifier matches never certify a changed coordinate or supported acquisition. */
export function htlCatalogMatch<T extends Readonly<{id:string;ra:number;dec:number}>>(row:HtlFields,catalog:readonly T[]):T|undefined{
 const key=(s:string)=>s.toUpperCase().replace(/\s+/g,'');const matches=catalog.filter(target=>key(target.id)===key(row.id)&&target.ra===row.ra&&target.dec===row.dec);return matches.length===1?matches[0]:undefined;
}
