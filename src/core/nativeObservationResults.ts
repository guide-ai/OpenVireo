import{formatObservationType}from'./observationResults';
/** Recovered144-byte typed records. Inspection only: no edits, FPU execution,
 * calendar/velocity conversion, source promotion or reconstructed writer. */
export const NATIVE_RESULT_BYTES=144,NATIVE_RESULT_MAX_RECORDS=1000,NATIVE_RESULT_MAX_BYTES=NATIVE_RESULT_BYTES*NATIVE_RESULT_MAX_RECORDS;
export class NativeObservationError extends Error{constructor(readonly code:'size'|'layout'|'text'|'owner',readonly row=0){super('Native observation '+code);this.name='NativeObservationError';}}
export type StoredNumberKind='zero'|'normal'|'subnormal'|'infinity'|'nan'|'pseudo-denormal'|'unsupported';
export type StoredNumber=Readonly<{storage:'binary32'|'binary64'|'extended80';hex:string;kind:StoredNumberKind;negative:boolean;coefficient:string|null;power:number|null;binary:string|null;decimal:string|null}>;
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
/** Bounded exact decimal rendering of an integer times a power of two. No
 * binary64 cast;long exponents retain their exact binary expression instead. */
function exactDecimal(coefficient:bigint,power:number):string|null{
 if(power>=0){if(power>256)return null;const s=(coefficient<<BigInt(power)).toString();return s.length<=120?s:null;}
 const places=-power;if(places>96)return null;const s=(coefficient*5n**BigInt(places)).toString().padStart(places+1,'0');return(s.slice(0,-places)+'.'+s.slice(-places)).replace(/0+$/,'').replace(/\.$/,'');
}
/** IEEE memory-field decoding following IntelSDMVol1§4.8/§8.2.2. Unsupported
 * Extended patterns are classified/preserved,never evaluated as operands. */
export function inspectStoredNumber(bytes:Uint8Array):StoredNumber{
 if(![4,8,10].includes(bytes.length))throw new NativeObservationError('layout');const storage=bytes.length===4?'binary32':bytes.length===8?'binary64':'extended80',width=bytes.length*8,fractionBits=bytes.length===4?23:bytes.length===8?52:63,exponentBits=bytes.length===4?8:bytes.length===8?11:15,bias=2**(exponentBits-1)-1;
 let bits=0n;for(let i=bytes.length-1;i>=0;i--)bits=bits<<8n|BigInt(bytes[i]);const negative=!!(bits>>BigInt(width-1)),exp=Number((bits>>BigInt(bytes.length===10?64:fractionBits))&((1n<<BigInt(exponentBits))-1n)),fraction=bits&((1n<<BigInt(fractionBits))-1n),explicit=bytes.length===10,integer=explicit?Number(bits>>63n&1n):exp?1:0;
 let kind:StoredNumberKind,coefficient:bigint|null=null,power:number|null=null;
 if(exp===(1<<exponentBits)-1)kind=explicit&&!integer?'unsupported':fraction?'nan':'infinity';
 else if(exp===0&&explicit&&integer)kind='pseudo-denormal';
 else if(exp!==0&&explicit&&!integer)kind='unsupported';
 else{coefficient=(integer?1n<<BigInt(fractionBits):0n)|fraction;power=(exp||1)-bias-fractionBits;kind=coefficient===0n?'zero':exp===0?'subnormal':'normal';}
 let decimal:string|null=null,binary:string|null=null;if(coefficient!==null&&power!==null){if(coefficient===0n){decimal=negative?'-0':'0';binary=decimal;}else{while((coefficient&1n)===0n){coefficient>>=1n;power++;}binary=(negative?'-':'')+coefficient.toString()+' × 2^'+power;const exact=exactDecimal(coefficient,power);decimal=exact===null?null:(negative?'-':'')+exact;}}
 return Object.freeze({storage,hex:hex(bytes),kind,negative,coefficient:coefficient?.toString()??null,power,binary,decimal});
}
export type NativeResultFieldId='time'|'ra'|'dec'|'u'|'b'|'v'|'r'|'i'|'redshift'|'velocity';
export type NativeNumericField=Readonly<{id:NativeResultFieldId;offset:number;value:StoredNumber}>;
export type NativeObservationRecord=Readonly<{index:number;object:string;remarks:string;kind:number;spectralCode:number;spectralLabel:string|null;fields:readonly NativeNumericField[]}>;
export type NativeObservationData=Readonly<{records:readonly NativeObservationRecord[]}>;
const originalBytes=new WeakMap<NativeObservationData,readonly number[]>();
const cp1252='€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
function shortText(bytes:Uint8Array,offset:number,maximum:number,row:number):string{const count=bytes[offset];if(count>maximum)throw new NativeObservationError('text',row);let result='';for(const n of bytes.subarray(offset+1,offset+1+count)){const c=n>=128&&n<160?cp1252[n-128]:String.fromCharCode(n);result+=n<32||n===127||[129,141,143,144,157].includes(n)?'\\x'+n.toString(16).padStart(2,'0'):c;}return result;}
const numericLayout:readonly(readonly[NativeResultFieldId,number,number])[]=[['time',16,8],['ra',24,10],['dec',34,10],['u',44,10],['b',54,10],['v',64,10],['r',74,10],['i',84,10],['redshift',99,4],['velocity',103,4]];
export function parseNativeObservationResults(bytes:Uint8Array):NativeObservationData{
 if(!(bytes instanceof Uint8Array)||bytes.byteLength>NATIVE_RESULT_MAX_BYTES)throw new NativeObservationError('size');if(bytes.byteLength%NATIVE_RESULT_BYTES!==0)throw new NativeObservationError('layout');const owned=Uint8Array.from(bytes),records:NativeObservationRecord[]=[];
 for(let offset=0;offset<owned.length;offset+=144){const row=owned.subarray(offset,offset+144),view=new DataView(row.buffer,row.byteOffset,144),spectralCode=view.getInt32(95,true);let spectralLabel:string|null=null;try{spectralLabel=formatObservationType(spectralCode);}catch{/* Preserve unknown stored int32 without evaluating native table access. */}
  records.push(Object.freeze({index:records.length+1,object:shortText(row,0,15,records.length+1),remarks:shortText(row,107,36,records.length+1),kind:row[94],spectralCode,spectralLabel,fields:Object.freeze(numericLayout.map(([id,at,size])=>Object.freeze({id,offset:at,value:inspectStoredNumber(row.subarray(at,at+size))})))}));
 }const result=Object.freeze({records:Object.freeze(records)});originalBytes.set(result,Object.freeze([...owned]));return result;
}
/** Download only bytes actually read. No numeric/text field is re-encoded. */
export function nativeObservationBytes(data:NativeObservationData):Uint8Array{const bytes=originalBytes.get(data);if(!bytes)throw new NativeObservationError('owner');return Uint8Array.from(bytes);}
