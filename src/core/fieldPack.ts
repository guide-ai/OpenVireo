/** Bounded, typed field evidence pack for the general field engine (fieldEngine.ts). A pack carries only what one or more
 * fresh pointings read from whole original sources, for an explicit coverage rectangle:
 *  - compact-GSC band reads by record index (binary-search probes and the sequential scan of every pointing): the whole
 *    27-byte record for any record inside a listed pointing's area, otherwise a position-only witness (the first 8 bytes,
 *    packed Int32 RA and Dec), which is all the trace and the admission predicate read from a record rejected by position;
 *  - every CLEA_VStrs.dat record whose Double position lies inside the coverage (92-byte raw records);
 *  - every CLEA_QSO.DAT position inside the coverage (index and Double position only);
 *  - per listed pointing, the GLIMAGES.LST record indices whose position lies inside its area (indices only; the byte-exact
 *    GLIMAGES.LST, approved 2026-10-27, is shipped separately and lssLists.ts can rebuild these entries from it).
 * Completeness of the source lists is an offline witness (whole-source scans, analysis/lss-packs), not something the browser
 * can prove; the pack records the source SHA-256 and record counts those witnesses used. Galaxies are not in the pack: the
 * engine reads the bundled CLEA_GLX.DAT whole. A pack certifies only its listed pointings (exact binary64 equality): its band
 * reads are the probes and scans of exactly those pointings, so any other pointing is outside the pack. The four existing verified fields are adapted from their stored snapshots
 * (fieldPackFromSnapshot), unchanged. Nothing is repaired, sorted or deduplicated; invalid input is a typed error. */
import type {NativeCatalogRegion} from './catalogPopulation';

export class FieldPackError extends Error{
 constructor(readonly code:'schema'|'bounds'|'record'|'order'|'identity'){super(`Field pack: ${code}`);this.name='FieldPackError';}
}
export const FIELD_PACK_SCHEMA='openvireo-field-pack-v1';
/** variables: a field across 0 h covers the whole RA ring of its Dec band (Front G G1b); the most CLEA_VStrs.dat records in any
 * 0.75° ring is 549. */
export const FIELD_PACK_LIMITS=Object.freeze({pointings:500,bands:24,readsPerBand:400_000,variables:1000,qso:2000,photographs:200});
const GSC_BANDS=/^([NS])(0000|0730|1500|2230|3000|3730|4500|5230|6000|6730|7500|8230)$/;
export type FieldPackRect=Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number}>;
export type FieldPackBand=Readonly<{name:string;recordCount:number;sha256:string|null;reads:ReadonlyMap<number,string>}>;
export type FieldPackPhotographMatch=Readonly<{pointing:number;indices:readonly number[]}>;
export type FieldPackPosition=Readonly<{index:number;ra:number;dec:number}>;
export type FieldPackSource<T>=Readonly<{sha256:string|null;recordsChecked:number;entries:readonly T[]}>;
export type FieldPack=Readonly<{
 schema:typeof FIELD_PACK_SCHEMA;id:string;coverage:FieldPackRect;pointings:readonly Readonly<{ra:number;dec:number}>[];bands:readonly FieldPackBand[];
 variables:FieldPackSource<Readonly<{recordIndex:number;rawHex:string}>>;qso:FieldPackSource<FieldPackPosition>;photographs:FieldPackSource<FieldPackPhotographMatch>;
}>;
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const fail=(code:FieldPackError['code']):never=>{throw new FieldPackError(code);};
const sha=(v:unknown,optional=false)=>v===null&&optional?null:typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)?v:fail('identity');
const count=(v:unknown,max=0x3fff_ffff)=>Number.isSafeInteger(v)&&(v as number)>=0&&(v as number)<=max?v as number:fail('bounds');
function rect(v:unknown):FieldPackRect{
 if(!isObject(v))return fail('schema');
 const r={minimumRa:v.minimumRa,maximumRa:v.maximumRa,minimumDec:v.minimumDec,maximumDec:v.maximumDec};
 if(!Object.values(r).every(x=>typeof x==='number'&&Number.isFinite(x)))return fail('bounds');
 const q=r as {minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number};
 // Dec may pass ±90 by up to the field half-height: the native area is not clamped at the poles (Front G, §G-RE2).
 if(q.minimumRa<0||q.maximumRa>24||q.minimumRa>=q.maximumRa||q.minimumDec<-91||q.maximumDec>91||q.minimumDec>=q.maximumDec)return fail('bounds');
 return Object.freeze(q);
}
function position(v:unknown,last:number):FieldPackPosition{
 if(!isObject(v))return fail('schema');
 const index=count(v.index),ra=v.ra,dec=v.dec;
 if(index<=last||typeof ra!=='number'||typeof dec!=='number'||!Number.isFinite(ra)||!Number.isFinite(dec)||ra<0||ra>24||Math.abs(dec)>90)return fail(index<=last?'order':'record');
 return Object.freeze({index,ra,dec});
}
function source<T>(v:unknown,max:number,entry:(v:unknown,last:number)=>T,key:(e:T)=>number,checkedIndex=true):FieldPackSource<T>{
 if(!isObject(v)||!Array.isArray(v.entries))return fail('schema');
 if(v.entries.length>max)return fail('bounds');
 let last=-1;const entries=v.entries.map(e=>{const r=entry(e,last);last=key(r);return r;});
 const recordsChecked=count(v.recordsChecked);if(recordsChecked<=0||checkedIndex&&entries.some(e=>key(e)>=recordsChecked))return fail('bounds');
 return Object.freeze({sha256:sha(v.sha256,true),recordsChecked,entries:Object.freeze(entries)});
}
/** Decodes and bounds-checks a pack (JSON value). Band reads are strictly increasing record indices with 54 (whole record) or
 * 16 (position-only witness) hex digits. */
export function decodeFieldPack(value:unknown):FieldPack{
 if(!isObject(value)||value.schema!==FIELD_PACK_SCHEMA||typeof value.id!=='string'||!/^[A-Za-z0-9_.:-]{1,80}$/.test(value.id)||!Array.isArray(value.bands))return fail('schema');
 if(value.bands.length<1||value.bands.length>FIELD_PACK_LIMITS.bands)return fail('bounds');
 const names=new Set<string>();
 const bands=value.bands.map(b=>{
  if(!isObject(b)||typeof b.name!=='string'||!GSC_BANDS.test(b.name)||names.has(b.name)||!Array.isArray(b.reads))return fail('schema');
  names.add(b.name);
  const recordCount=count(b.recordCount);if(b.reads.length>FIELD_PACK_LIMITS.readsPerBand)return fail('bounds');
  const reads=new Map<number,string>();let last=-1;
  for(const r of b.reads){
   if(!Array.isArray(r)||r.length!==2)return fail('schema');
   const index=count(r[0]);if(index<=last)return fail('order');if(index>=recordCount)return fail('bounds');
   if(typeof r[1]!=='string'||!/^(?:[a-f0-9]{54}|[a-f0-9]{16})$/.test(r[1]))return fail('record');
   reads.set(index,r[1]);last=index;
  }
  return Object.freeze({name:b.name,recordCount,sha256:sha(b.sha256,true),reads});
 });
 const variables=source(value.variables,FIELD_PACK_LIMITS.variables,(e,last)=>{
  if(!isObject(e)||typeof e.rawHex!=='string'||!/^[a-f0-9]{184}$/.test(e.rawHex))return fail('record');
  const recordIndex=count(e.recordIndex);if(recordIndex<=last)return fail('order');return Object.freeze({recordIndex,rawHex:e.rawHex});
 },e=>e.recordIndex);
 if(!Array.isArray(value.pointings)||value.pointings.length<1||value.pointings.length>FIELD_PACK_LIMITS.pointings)return fail('bounds');
 const pointings=value.pointings.map(p=>{if(!isObject(p)||typeof p.ra!=='number'||typeof p.dec!=='number'||!Number.isFinite(p.ra)||!Number.isFinite(p.dec)||p.ra<0||p.ra>=24||Math.abs(p.dec)>90)return fail('record');return Object.freeze({ra:p.ra,dec:p.dec});});
 return Object.freeze({schema:FIELD_PACK_SCHEMA,id:value.id,coverage:rect(value.coverage),pointings:Object.freeze(pointings),bands:Object.freeze(bands),variables,
  qso:source(value.qso,FIELD_PACK_LIMITS.qso,position,e=>e.index),photographs:source(value.photographs,FIELD_PACK_LIMITS.photographs,(e,last)=>{
   if(!isObject(e)||!Array.isArray(e.indices)||e.indices.length<1||e.indices.length>FIELD_PACK_LIMITS.photographs)return fail('record');
   const at=count(e.pointing);if(at<=last)return fail('order');if(at>=pointings.length)return fail('bounds');
   let previous=-1;const indices=e.indices.map(i=>{const n=count(i,0xffff);if(n<=previous)return fail('order');previous=n;return n;});
   return Object.freeze({pointing:at,indices:Object.freeze(indices)});
  },e=>e.pointing,false)});
}
type Snapshot=Readonly<{
 domain:Readonly<{pointing:Readonly<{ra:number;dec:number}>}>;area:NativeCatalogRegion;bands:readonly Readonly<{name:string;recordCount:number;sha256?:string;reads:readonly Readonly<{index:number;rawHex:string}>[]}>[];
 absenceCertificates:readonly Readonly<{file:string;recordsChecked:number;allPositionMatches:readonly number[];sha256?:string}>[];
 variables?:readonly Readonly<{recordIndex:number;rawHex:string}>[];variableSourceAdmission?:Readonly<{recordsChecked:number;allPositionMatches:readonly number[];sha256:string}>;
 sources:readonly Readonly<{path?:string;archiveMember?:string;sha256:string}>[];
}>;
/** The stored whole-source-checked snapshot of an existing verified field (pinned-galaxy-*.json, pinned-pegasus-field.json) as a
 * pack whose coverage is exactly its own area. Absence certificates become empty source lists; the Pegasus HI Peg record is the
 * one variable entry. A snapshot with any other position match is rejected (it was never verified here). */
export function fieldPackFromSnapshot(id:string,snapshot:Snapshot):FieldPack{
 const file=(name:string)=>snapshot.sources.find(s=>(s.archiveMember??s.path??'').endsWith('/'+name))?.sha256??null;
 const cert=(name:string)=>snapshot.absenceCertificates.find(c=>c.file===name);
 const absent=(name:string)=>{const c=cert(name);if(!c)return null;if(c.allPositionMatches.length)return fail('identity');return {sha256:c.sha256??file(name),recordsChecked:c.recordsChecked,entries:[]};};
 const vs=snapshot.variableSourceAdmission;
 const variables=absent('CLEA_VStrs.dat')??(vs&&snapshot.variables&&vs.allPositionMatches.join()===snapshot.variables.map(v=>v.recordIndex).join()?{sha256:vs.sha256,recordsChecked:vs.recordsChecked,entries:snapshot.variables.map(v=>({recordIndex:v.recordIndex,rawHex:v.rawHex}))}:fail('identity'));
 const qso=absent('CLEA_QSO.DAT')??fail('identity'),photographs=absent('GLIMAGES.LST')??fail('identity');
 const a=snapshot.area;
 return decodeFieldPack({schema:FIELD_PACK_SCHEMA,id,coverage:{minimumRa:a.minimumRa,maximumRa:a.maximumRa,minimumDec:a.minimumDec,maximumDec:a.maximumDec},pointings:[snapshot.domain.pointing],
  bands:snapshot.bands.map(b=>({name:b.name,recordCount:b.recordCount,sha256:b.sha256??file(`${b.name}.DAT`),reads:b.reads.map(r=>[r.index,r.rawHex])})),variables,qso,photographs});
}
/** A listed pointing whose area lies inside the pack coverage (the pack's certificates speak only for its coverage). */
/** A wrapped area (min > max: [min, 24] and [0, max], Front G G1b) is covered only by a coverage spanning RA 0..24 (review 1 L4). */
export function packCovers(pack:FieldPack,pointing:Readonly<{ra:number;dec:number}>,area:FieldPackRect):boolean{
 const c=pack.coverage,ra=area.minimumRa>area.maximumRa?c.minimumRa<=0&&c.maximumRa>=24:area.minimumRa>=c.minimumRa&&area.maximumRa<=c.maximumRa;
 return pack.pointings.some(p=>p.ra===pointing.ra&&p.dec===pointing.dec)&&ra&&area.minimumDec>=c.minimumDec&&area.maximumDec<=c.maximumDec;
}
