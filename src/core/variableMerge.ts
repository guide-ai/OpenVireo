import {nativeMergeNearest,type MergeCandidate,type MergeRecord,type MergeTrace} from './catalogMerge';
/** Native variable-star merge entry for ONE recovered branch only (CLEA_VEO.exe 781bc970…c54c; contract and table hashes in
 * pegasus-field-provenance.json variableContract). It is not a variable-star model, light curve or phase:
 * - 0x598600/0x598602/0x598604 push three zero DWORDs before 0x598608 calls 0x59a2e0: the nearest merge uses reference
 *   magnitude 0 (no magnitude filter), with the existing runner prune and saved-index semantics of nativeMergeNearest;
 * - 0x4bc834 initializes class 3 and changes it only on an EXACT table match (0x406094/0x405f20/0x406258: full stored length,
 *   no prefix, case or separator folding); tables 0x5b0b68 (class 0), 0x5b0c7c (class 1), 0x5b0ca0 (class 2);
 * - 0x51ec95 with nonzero period and word48 dispatches class 3 to 0x51ee57, which returns false (0x51ee7c) without reaching
 *   any constructor, curve or evaluation;
 * - 0x5986c0: a false result restores the 95-byte hit record; a runner prune already performed is NOT rolled back;
 *   0x5987a1: a false result skips the miss insertion.
 * Everything else (classes 0/1/2, zero period or zero word48 (0x51ecb0 cmp WORD,0 / jne: any nonzero value, either sign), an unsafe saved index, a null lookup or a boundary needing more
 * precision) is rejected, never repaired. Number/Math is the declared adapter policy, not x87 equivalence. */
export class VariableMergeError extends Error{
 constructor(readonly code:'record'|'table'|'variable-model-unsupported'|'dispatch-unsupported'|'unsafe-saved-index'|'native-null-lookup'|'precision-required'){super(`Native variable merge: ${code}`);this.name='VariableMergeError';}
}
/** CLEA_VStrs.dat 92-byte record layout of this contract: short strings name@0 (≤10) and classification@27 (≤10: length byte + 10 characters at 27..37, PStrNCat 27 at 0x52ce11; flag byte at 38), Double
 * RA hours@11 and Dec degrees@19, Single magnitude@39, Extended period@62 and word@72 (record+0x48, the signed 16-bit M−m/D word: FILD m16 at its read sites; 0x51ecb0 tests it for nonzero). */
export const VARIABLE_RECORD_BYTES=92;
export const VARIABLE_RECORD_OFFSETS=Object.freeze({name:0,raDouble:11,decDouble:19,classification:27,magnitudeSingle:39,periodExtended:62,word48:72});
export type NativeVariable=Readonly<{recordIndex:number;name:string;ra:number;dec:number;classification:string;magnitude:number;periodNonzero:boolean;word48:number;rawHex:string}>;
export type VariableClassTable=Readonly<{class:number;values:readonly string[]}>;
function shortString(raw:Uint8Array,at:number,max:number):string{
 const length=raw[at];if(length>max)throw new VariableMergeError('record');
 const bytes=raw.subarray(at+1,at+1+length);if(bytes.some(b=>b<0x20||b>0x7e))throw new VariableMergeError('record');
 return String.fromCharCode(...bytes);
}
/** Zero (either sign) or a normal finite Extended only; denormal, unnormal, infinite and NaN encodings are unsupported here. */
function extendedNonzero(raw:Uint8Array,at:number):boolean{
 const mantissaZero=raw.subarray(at,at+8).every(b=>b===0),exponent=((raw[at+9]&0x7f)<<8)|raw[at+8];
 if(exponent===0&&mantissaZero)return false;
 if(exponent===0||exponent===0x7fff||(raw[at+7]&0x80)===0)throw new VariableMergeError('record');
 return true;
}
export function decodeNativeVariableRecord(rawHex:string,recordIndex:number):NativeVariable{
 if(typeof rawHex!=='string'||!new RegExp(`^[a-f0-9]{${VARIABLE_RECORD_BYTES*2}}$`).test(rawHex)||!Number.isSafeInteger(recordIndex)||recordIndex<0)throw new VariableMergeError('record');
 const raw=Uint8Array.from(rawHex.match(/../g)!,v=>parseInt(v,16)),view=new DataView(raw.buffer),o=VARIABLE_RECORD_OFFSETS;
 const ra=view.getFloat64(o.raDouble,true),dec=view.getFloat64(o.decDouble,true),magnitude=view.getFloat32(o.magnitudeSingle,true);
 if(!Number.isFinite(ra)||ra<0||ra>24||!Number.isFinite(dec)||Math.abs(dec)>90||!Number.isFinite(magnitude))throw new VariableMergeError('record');
 return Object.freeze({recordIndex,name:shortString(raw,o.name,10),ra,dec,classification:shortString(raw,o.classification,10),magnitude,periodNonzero:extendedNonzero(raw,o.periodExtended),word48:view.getInt16(o.word48,true),rawHex});
}
/** 0x4bc834: exact stored-string equality against the three recovered tables in their class order; default class 3. */
export function nativeVariableClass(classification:string,tables:readonly VariableClassTable[]):0|1|2|3{
 if(typeof classification!=='string'||classification.length>255||!Array.isArray(tables)||tables.length!==3||tables.some((t,i)=>!t||t.class!==i||!Array.isArray(t.values)||!t.values.length||t.values.some((v:unknown)=>typeof v!=='string'||!v||v.length>255)))throw new VariableMergeError('table');
 for(const t of tables)if(t.values.includes(classification))return t.class as 0|1|2;
 return 3;
}
function awayFromBoundary(value:number,boundary:number):void{
 // Same conservative support exclusion as catalogMerge.ts; not a measured x87 error bound.
 if(Math.abs(value-boundary)<=8*Number.EPSILON*Math.max(1,Math.abs(value),Math.abs(boundary)))throw new VariableMergeError('precision-required');
}
export type VariableMergeResult=Readonly<{
 rows:readonly MergeRecord[];trace:MergeTrace;hit:boolean;classification:3;timeUpdateResult:false;recordRestored:boolean;inserted:false;callerTarget:MergeRecord|null;
}>;
/** One variable against the ordered stellar list. Distances are supplied explicitly (catalogMergeDistance, variable as query).
 * Hit: STRICT best·3600 < 30″. Returned rows are the merge rows: the hit star keeps its record unchanged (restored), a runner
 * pruned before the hit test stays removed, nothing is inserted on a miss. */
/** The time-update dispatch 0x51ec48..0x51ecdb as far as it returns false without any side effect (the path to 0x51ee57 only
 * builds the classification string and its class): a zero period (0x51ec9a fcomp 0 / je), a zero word with a class other
 * than 1 (0x51ecb0..0x51ecba), or class 3 (0x51eccb). Any other combination reaches a light-curve constructor (not modelled). */
export function nativeVariableDispatchFalse(variable:Readonly<{classification:string;periodNonzero:boolean;word48:number}>,tables:readonly VariableClassTable[]):boolean{
 if(!variable||typeof variable!=='object'||typeof variable.periodNonzero!=='boolean'||!Number.isInteger(variable.word48)||variable.word48< -0x8000||variable.word48>0x7fff)throw new VariableMergeError('record');
 const c=nativeVariableClass(variable.classification,tables);
 return !variable.periodNonzero||variable.word48===0&&c!==1||c===3;
}
/** dispatch 'class-3' (default, the verified HI Peg contract): only class 3 with nonzero period and word. 'recovered' (Front F,
 * Object X): any variable for which nativeVariableDispatchFalse holds; the merge itself is the same. */
export function nativeVariableFalseMerge(candidates:readonly MergeCandidate[],variable:Readonly<{classification:string;periodNonzero:boolean;word48:number}>,tables:readonly VariableClassTable[],dispatch:'class-3'|'recovered'='class-3'):VariableMergeResult{
 if(!variable||typeof variable!=='object')throw new VariableMergeError('record');
 if(dispatch==='recovered'){if(!nativeVariableDispatchFalse(variable,tables))throw new VariableMergeError('variable-model-unsupported');}
 else{
 if(nativeVariableClass(variable.classification,tables)!==3)throw new VariableMergeError('variable-model-unsupported');
 if(variable.periodNonzero!==true||!Number.isInteger(variable.word48)||variable.word48===0||variable.word48< -0x8000||variable.word48>0x7fff)throw new VariableMergeError('dispatch-unsupported');
 }
 const trace=nativeMergeNearest(candidates,0),arcseconds=trace.bestDistanceDegrees*3600;awayFromBoundary(arcseconds,30);
 if(arcseconds>=30)return Object.freeze({rows:trace.rows,trace,hit:false,classification:3 as const,timeUpdateResult:false as const,recordRestored:false,inserted:false as const,callerTarget:null});
 const target=trace.resolvedSavedIndex;if(!target)throw new VariableMergeError('native-null-lookup');
 // A prune below the saved winner shifts the saved position onto another record before the restore: not supported.
 if(trace.removedRunner&&trace.runnerIndex<trace.savedWinnerIndex)throw new VariableMergeError('unsafe-saved-index');
 return Object.freeze({rows:trace.rows,trace,hit:true,classification:3 as const,timeUpdateResult:false as const,recordRestored:true,inserted:false as const,callerTarget:target});
}
