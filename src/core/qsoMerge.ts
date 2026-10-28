/** QSO catalogue loader and merge of CLEA_VEO.exe (781bc970…c54c), static reading only (docs/FIELD-ENGINE.md, Front F M2).
 *
 * Loader 0x5987e4..0x598a5f (called once from the population assembler 0x597ac8 at 0x597ddb, catalogue mode 1 only, with the
 * unsplit area): reads CLEA_QSO.DAT sequentially from record 0 as 52-byte records (Assign/Reset 0x403a20/0x404228 with size
 * 0x34). For each record it calls the position predicate 0x59677c with RA (+0x12 Double) and Dec (+0x1a Double):
 *  - non-wrapping area (maxRA > minRA): inside RA iff minRA ≤ RA ≤ maxRA; ordered-scan stop iff RA > maxRA;
 *  - wrapping area: RA < 12 → inside iff RA ≤ maxRA, stop iff RA > maxRA; otherwise inside iff RA ≥ minRA, no stop;
 *  - inside also requires minDec ≤ Dec ≤ maxDec. There is no magnitude test.
 * An inside record becomes a 95-byte object (name ShortString copied with limit 0x18, RA +0x19, Dec +0x21, the 16 bytes
 * +0x22..+0x31 → +0x29..+0x38 (V Single, B−V, U−B, z), +0x39/+0x3a = 0, flag bytes +0x32/+0x33 → +0x3b/+0x3c, type +0x3d = 3,
 * +0x43 = 99) inserted after the list cursor (0x492574: so the QSO list keeps read order). The loop ends after the stop record
 * or at end of file.
 *
 * Merge 0x597f90..0x5980c3 (only when the QSO list is not empty), for each QSO in list order:
 *  - 0x59a2e0 with the QSO RA, Dec and its V Single as the reference magnitude (catalogMerge.ts nativeMergeNearest: nearest
 *    within 2′ among records with |V − magnitude| < 1, then at most one runner deleted when the two nearest are ≤ 0.006° apart);
 *  - winner found: the cursor goes to the saved winner index (GetAt 0x492688; the index is not repaired after the runner
 *    deletion); if the best distance × 3600 < 30 the QSO's 95 bytes overwrite that record (it becomes the QSO, type 3);
 *  - no winner: the cursor goes to the head (0x492628, 0x492634);
 *  - not replaced: walk forward while the cursor RA ≤ QSO RA and not at the tail, then backward while the cursor RA > QSO RA and
 *    not at the head, then insert after the cursor (0x492574). A QSO west of the head is therefore inserted after the head.
 * Uncertainty (review 1, item 5): the loader's 95-byte object at ebp−0x210 is never cleared, so bytes +0x3e..+0x42 and
 * +0x47..+0x5e hold stack residue; the replace branch (0x598026..0x598037) copies all 95 bytes into the star record, and native
 * code reads +0x3e (for example 0x596858, a classification/label byte). This port models only the fields the merge, cleanup,
 * paint and selection read (name, RA, Dec, V, B−V, U−B, z, flags, type 3); what the residue bytes would do downstream is unknown.
 * Unsupported native paths are typed errors, never repaired: an empty star list or a null GetAt (both dereference null natively)
 * and distances too close to the 30″ boundary for the declared Number policy. */
import {catalogMergeDistance,nativeMergeNearest,CatalogMergeError} from './catalogMerge';

export class QsoMergeError extends Error{
 constructor(readonly code:'input'|'record'|'empty-star-list'|'native-null-lookup'|'precision-required'){super(`QSO merge: ${code}`);this.name='QsoMergeError';}
}
export const QSO_CATALOG=Object.freeze({name:'CLEA_QSO.DAT',recordBytes:52,records:2269,bytes:117988,sha256:'69ecc5bf1aea34a40507de326d39ee47d23c810d49baa53d5732c064edef90b5'});
export type NativeQso=Readonly<{id:string;name:string;recordIndex:number;ra:number;dec:number;magnitude:number;colorBV:number;colorUB:number;redshift:number;flags:readonly [number,number];type:3;rawHex:string}>;
export type QsoArea=Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number}>;
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
/** One 52-byte record. The name is the length-prefixed String[17]; the 95-byte object keeps at most 24 characters (0x403c5c). */
export function decodeQsoRecord(raw:Uint8Array,index:number):NativeQso{
 if(!(raw instanceof Uint8Array)||raw.byteLength!==52||!Number.isSafeInteger(index)||index<0)throw new QsoMergeError('record');
 const v=new DataView(raw.buffer,raw.byteOffset,52),length=raw[0];if(length>17)throw new QsoMergeError('record');
 let name='';for(let i=1;i<=length;i++)name+=String.fromCharCode(raw[i]);
 const ra=v.getFloat64(0x12,true),dec=v.getFloat64(0x1a,true);
 if(!Number.isFinite(ra)||!Number.isFinite(dec)||ra<0||ra>24||Math.abs(dec)>90)throw new QsoMergeError('record');
 return Object.freeze({id:`CLEA_QSO.DAT@${index}`,name:name.trimEnd(),recordIndex:index,ra,dec,magnitude:v.getFloat32(0x22,true),colorBV:v.getFloat32(0x26,true),colorUB:v.getFloat32(0x2a,true),redshift:v.getFloat32(0x2e,true),flags:Object.freeze([raw[0x32],raw[0x33]] as [number,number]),type:3 as const,rawHex:hex(raw)});
}
/** 0x59677c: [inside, stop]. */
export function qsoPositionPredicate(area:QsoArea,ra:number,dec:number):readonly [boolean,boolean]{
 let inRa:boolean,stop:boolean;
 if(area.maximumRa>area.minimumRa){inRa=ra>=area.minimumRa&&ra<=area.maximumRa;stop=ra>area.maximumRa;}
 else if(ra<12){inRa=ra<=area.maximumRa;stop=ra>area.maximumRa;}
 else{inRa=ra>=area.minimumRa;stop=false;}
 return [inRa&&dec>=area.minimumDec&&dec<=area.maximumDec,stop];
}
export type QsoLoad=Readonly<{qsos:readonly NativeQso[];recordsRead:number}>;
/** 0x5987e4: the ordered sequential scan of the whole catalogue for one area. */
export function loadNativeQsoList(catalog:Uint8Array,area:QsoArea):QsoLoad{
 if(!(catalog instanceof Uint8Array)||catalog.byteLength===0||catalog.byteLength%52)throw new QsoMergeError('input');
 for(const x of [area?.minimumRa,area?.maximumRa,area?.minimumDec,area?.maximumDec])if(typeof x!=='number'||!Number.isFinite(x))throw new QsoMergeError('input');
 const qsos:NativeQso[]=[],n=catalog.byteLength/52;let i=0;
 for(;i<n;i++){
  const raw=catalog.subarray(i*52,i*52+52),v=new DataView(raw.buffer,raw.byteOffset,52),[inside,stop]=qsoPositionPredicate(area,v.getFloat64(0x12,true),v.getFloat64(0x1a,true));
  if(inside)qsos.push(decodeQsoRecord(raw,i));
  if(stop){i++;break;}
 }
 return Object.freeze({qsos:Object.freeze(qsos),recordsRead:i});
}
export type QsoMergeable=Readonly<{id:string;type:number;magnitude:number;ra:number;dec:number}>;
export type QsoMergeWitness=Readonly<{qso:string;winnerId:string|null;savedWinnerIndex:number;removedRunner:string|null;bestArcseconds:number;operation:'replace'|'insert';replacedId:string|null;position:number}>;
/** Conservative support exclusion near a strict comparison (not a measured x87 error bound), as catalogMerge.ts. */
function awayFromBoundary(value:number,boundary:number){if(Math.abs(value-boundary)<=8*Number.EPSILON*Math.max(1,Math.abs(value),Math.abs(boundary)))throw new QsoMergeError('precision-required');}
/** 0x597f90 over an ordered star list (GSC stars after the variable stage). Returns the new ordered list and one witness per QSO. */
export function nativeQsoMerge<T extends QsoMergeable>(stars:readonly T[],qsos:readonly NativeQso[]):Readonly<{rows:readonly (T|NativeQso)[];witnesses:readonly QsoMergeWitness[]}>{
 if(!Array.isArray(stars)||!Array.isArray(qsos))throw new QsoMergeError('input');
 let rows:(T|NativeQso)[]=[...stars];const witnesses:QsoMergeWitness[]=[];
 for(const q of qsos){
  let trace;
  try{trace=nativeMergeNearest(rows.map(r=>({record:{id:r.id,type:r.type,magnitude:r.magnitude},distanceDegrees:catalogMergeDistance(q,r)})),q.magnitude);}
  catch(e){if(e instanceof CatalogMergeError)throw new QsoMergeError(e.code==='precision-required'?'precision-required':'input');throw e;}
  const byId=new Map(rows.map(r=>[r.id,r]));rows=trace.rows.map(r=>byId.get(r.id)!);
  const arcseconds=trace.bestDistanceDegrees*3600;let cursor:number,replacedId:string|null=null;
  if(trace.winner){
   cursor=trace.savedWinnerIndex;if(cursor<0||cursor>=rows.length)throw new QsoMergeError('native-null-lookup');
   awayFromBoundary(arcseconds,30);
   if(arcseconds<30){replacedId=rows[cursor].id;rows[cursor]=q;witnesses.push(Object.freeze({qso:q.id,winnerId:trace.winner.id,savedWinnerIndex:trace.savedWinnerIndex,removedRunner:trace.removedRunner?.id??null,bestArcseconds:arcseconds,operation:'replace',replacedId,position:cursor}));continue;}
  }else{if(!rows.length)throw new QsoMergeError('empty-star-list');cursor=0;}
  while(!(rows[cursor].ra>q.ra)&&cursor<rows.length-1)cursor++;
  while(rows[cursor].ra>q.ra&&cursor>0)cursor--;
  rows.splice(cursor+1,0,q);
  witnesses.push(Object.freeze({qso:q.id,winnerId:trace.winner?.id??null,savedWinnerIndex:trace.savedWinnerIndex,removedRunner:trace.removedRunner?.id??null,bestArcseconds:arcseconds,operation:'insert',replacedId,position:cursor+1}));
 }
 return Object.freeze({rows:Object.freeze(rows),witnesses:Object.freeze(witnesses)});
}
