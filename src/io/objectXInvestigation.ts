// E08 Object X part of the investigation file (session v28, a new OpenVireo format, not an original CLEA file). It holds the
// student's ID, the hidden target's opaque code, the start date, the orbit file and list date, one recipe per camera exposure
// (time, length, filter, gain, telescope, pointing, seed, catalog source and hash, the list date its asteroids came from and
// the SHA-256 of the FITS the app wrote), the measuring marks (pixels only), the answer, the description and whether the
// identity was revealed. Images are not stored: the student keeps the saved FITS and reopens them to see the marks again.
//
// Restore never trusts stored results: the bundled orbit file is fetched and checked, every asteroid list is rebuilt at its
// date, the moving pairs of every exposure are re-derived and must give the stored pair count, and a SHA-256 over those
// derivatives must equal the stored digest. Any failure rejects the whole file (the caller applies nothing).
import {buildObservableList,movingPairs,orbitFileType,type ObservableList} from '../core/asteroidField';
import {MEASUREMENT_LIMIT,addMeasurement,type Measurement,type MeasurementLog} from '../core/astrometryMeasure';
import {OBJECT_X_ID_MAX,OBJECT_X_KINDS,type ObjectXKind} from '../core/objectXLab';
import {parseClockUTC} from '../core/siteClock';
import {CAMERA_MAX_SECONDS} from '../core/cameraExposure';
import {BUNDLED_ORBIT_FILES,SELECTABLE_ORBIT_FILES,fetchBundledOrbitFile,type BundledOrbitFileId} from './bundledOrbitFile';
import {resourceSha256} from './boundedResource';

export const OBJECT_X_INVESTIGATION_POLICY='openvireo-objectx-investigation-v28';
/** Own bounds: 64 exposures, 16 image references, 8 distinct list dates, 4000-character description, 1 MiB serialized. */
export const OBJECT_X_SESSION_LIMITS=Object.freeze({exposures:64,images:16,lists:8,description:4000,bytes:1024*1024});
export class ObjectXSessionError extends Error{
 constructor(readonly code:'format'|'bounds'|'record'|'replay'|'digest'){super(`Object X investigation: ${code}`);this.name='ObjectXSessionError';}
}
export type ObjectXExposure=Readonly<{
 jd:number;seconds:number;filter:number;gain:number;telescope:0|1|2;ra:number;dec:number;seed:number;
 catalogMode:'static'|'live';catalogSha256:string;extractId:string|null;
 /** Date of the asteroid list whose entries were offered to this exposure, or null when no list was built. */
 listJd:number|null;pairs:number;
 /** Moving pairs the camera skipped, by typed reason (CameraSkippedSource.reason; its extra list holds only the lab's pairs). */
 skipped:readonly ObjectXSkipReason[];fitsSha256:string;
}>;
export const OBJECT_X_SKIP_REASONS=['moving-pair-off-detector','moving-pair-geometry','moving-pair-budget'] as const;
export type ObjectXSkipReason=(typeof OBJECT_X_SKIP_REASONS)[number];
export type ObjectXImageRef=Readonly<{sha256:string;label:string;jd:number;exposure:number|null}>;
export type ObjectXInvestigation=Readonly<{
 orbitFile:BundledOrbitFileId;id:string;target:string|null;startUtc:string;clockSet:boolean;listJd:number|null;limit:number;
 exposures:readonly ObjectXExposure[];images:readonly ObjectXImageRef[];measure:Readonly<{first:number;second:number}>|null;log:MeasurementLog;
 answer:ObjectXKind|null;description:string;revealed:boolean;
}>;
/** Where restore gets the orbit file (browser: same-origin, size/SHA-checked; tests: the repository files). */
export type ObjectXResources=Readonly<{orbit:(id:BundledOrbitFileId)=>Promise<Uint8Array>}>;
function browserResources():ObjectXResources{
 return {orbit:async id=>(await fetchBundledOrbitFile(fetch,new AbortController().signal,id)).bytes};
}
let resources:ObjectXResources|null=null;
/** Test seam: replace the resource source. */
export function setObjectXResources(r:ObjectXResources|null){resources=r;}

const fail=(code:ObjectXSessionError['code']):never=>{throw new ObjectXSessionError(code);};
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function exact(v:unknown,keys:readonly string[]):Record<string,unknown>{if(!isObject(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))return fail('format');return v;}
const num=(v:unknown,lo:number,hi:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi?v:fail('record');
const int=(v:unknown,lo:number,hi:number)=>Number.isInteger(v)?num(v,lo,hi):fail('record');
const jd=(v:unknown)=>num(v,2415020.5,2488069.5);
const hex64=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)?v:fail('record');
const str=(v:unknown,max:number,lines=false)=>typeof v==='string'&&v.length<=max&&!(lines?/[\u0000-\u0008\u000b-\u001f\u007f]/:/[\u0000-\u001f\u007f]/).test(v)?v:fail('record');

function readSkipped(v:unknown,pairs:number):readonly ObjectXSkipReason[]{
 if(!Array.isArray(v)||v.length>pairs)return fail('record');
 return Object.freeze(v.map(r=>OBJECT_X_SKIP_REASONS.includes(r as ObjectXSkipReason)?r as ObjectXSkipReason:fail('record')));
}
function readExposure(v:unknown):ObjectXExposure{
 const r=exact(v,['jd','seconds','filter','gain','telescope','ra','dec','seed','catalogMode','catalogSha256','extractId','listJd','pairs','skipped','fitsSha256']);
 if(r.catalogMode!=='static'&&r.catalogMode!=='live')fail('record');
 if(![1,2,5].includes(r.gain as number))fail('record');
 const pairs=int(r.pairs,0,256);
 return Object.freeze({jd:jd(r.jd),seconds:int(r.seconds,1,CAMERA_MAX_SECONDS),filter:int(r.filter,0,4),gain:r.gain as number,telescope:int(r.telescope,0,2) as 0|1|2,
  ra:num(r.ra,0,24),dec:num(r.dec,-90,90),seed:int(r.seed,0,0xffff_ffff),catalogMode:r.catalogMode as 'static'|'live',catalogSha256:hex64(r.catalogSha256),
  extractId:r.extractId===null?null:str(r.extractId,80),listJd:r.listJd===null?null:jd(r.listJd),pairs,skipped:readSkipped(r.skipped,pairs),fitsSha256:hex64(r.fitsSha256)});
}
function readImage(v:unknown,exposures:number):ObjectXImageRef{
 const r=exact(v,['sha256','label','jd','exposure']);
 return Object.freeze({sha256:hex64(r.sha256),label:str(r.label,120),jd:jd(r.jd),exposure:r.exposure===null?null:int(r.exposure,0,exposures-1)});
}
function readLog(v:unknown,frames:number):MeasurementLog{
 if(!Array.isArray(v)||v.length>MEASUREMENT_LIMIT)return fail('bounds');
 let log:MeasurementLog=Object.freeze([]);
 for(const item of v){
  const keys=isObject(item)&&Object.hasOwn(item,'catalog')?['frame','role','x','y','jd','catalog']:['frame','role','x','y','jd'];
  const r=exact(item,keys);
  if(r.role!=='target'&&r.role!=='reference')fail('record');
  const m:Measurement={frame:int(r.frame,0,frames-1),role:r.role as 'target'|'reference',x:num(r.x,-1e4,1e4),y:num(r.y,-1e4,1e4),jd:jd(r.jd),
   ...(r.catalog!==undefined?{catalog:(()=>{const c=exact(r.catalog,['raHours','decDeg']);return Object.freeze({raHours:num(c.raHours,0,24),decDeg:num(c.decDeg,-90,90)});})()}:{})};
  try{log=addMeasurement(log,m);}catch{fail('record');}
 }
 return log;
}
function portablePayload(i:ObjectXInvestigation){
 return {policy:OBJECT_X_INVESTIGATION_POLICY,orbitFile:i.orbitFile,id:i.id,target:i.target,startUtc:i.startUtc,clockSet:i.clockSet,listJd:i.listJd,limit:i.limit,
  exposures:i.exposures.map(e=>({...e,skipped:[...e.skipped]})),images:i.images.map(m=>({...m})),measure:i.measure?{...i.measure}:null,
  log:i.log.map(m=>({frame:m.frame,role:m.role,x:m.x,y:m.y,jd:m.jd,...(m.catalog?{catalog:{raHours:m.catalog.raHours,decDeg:m.catalog.decDeg}}:{})})),
  answer:i.answer,description:i.description,revealed:i.revealed};
}
type Derived=Readonly<{investigation:ObjectXInvestigation;digest:string}>;
let lastVerified:Readonly<{text:string;result:Derived}>|null=null;
async function derive(value:unknown):Promise<Derived>{
 const text=JSON.stringify(value);
 if(text.length>OBJECT_X_SESSION_LIMITS.bytes)fail('bounds');
 if(lastVerified&&lastVerified.text===text)return lastVerified.result;
 const v=exact(value,['policy','orbitFile','id','target','startUtc','clockSet','listJd','limit','exposures','images','measure','log','answer','description','revealed']);
 if(v.policy!==OBJECT_X_INVESTIGATION_POLICY)fail('format');
 if(!SELECTABLE_ORBIT_FILES.includes(v.orbitFile as BundledOrbitFileId))fail('record');
 const orbitFile=v.orbitFile as BundledOrbitFileId;
 const id=str(v.id,OBJECT_X_ID_MAX),target=v.target===null?null:typeof v.target==='string'&&/^X-[0-9A-Z]{5}$/.test(v.target)?v.target:fail('record');
 const startUtc=str(v.startUtc,19);try{parseClockUTC(startUtc);}catch{fail('record');}
 if(typeof v.clockSet!=='boolean'||typeof v.revealed!=='boolean')fail('record');
 const listJd=v.listJd===null?null:jd(v.listJd),limit=num(v.limit,-5,30);
 if(!Array.isArray(v.exposures)||v.exposures.length>OBJECT_X_SESSION_LIMITS.exposures||!Array.isArray(v.images)||v.images.length>OBJECT_X_SESSION_LIMITS.images)fail('bounds');
 const exposures=Object.freeze((v.exposures as unknown[]).map(readExposure));
 const images=Object.freeze((v.images as unknown[]).map(m=>readImage(m,exposures.length)));
 let measure:{first:number;second:number}|null=null;
 if(v.measure!==null){const m=exact(v.measure,['first','second']);measure=Object.freeze({first:int(m.first,0,images.length-1),second:int(m.second,0,images.length-1)});if(measure.first===measure.second)fail('record');}
 const log=readLog(v.log,measure?2:0);
 const answer=v.answer===null?null:OBJECT_X_KINDS.includes(v.answer as ObjectXKind)?v.answer as ObjectXKind:fail('record');
 const description=str(v.description,OBJECT_X_SESSION_LIMITS.description,true);
 if(v.revealed&&answer===null)fail('record');// the reveal comes after the answer
 // Replay: rebuild each list and re-derive each exposure's moving pairs.
 const dates=[...new Set(exposures.map(e=>e.listJd).filter((d):d is number=>d!==null))];
 if(dates.length>OBJECT_X_SESSION_LIMITS.lists)fail('bounds');
 const derivatives:unknown[]=[];
 if(dates.length){
  const src=resources??(resources=browserResources());
  let bytes:Uint8Array;try{bytes=await src.orbit(orbitFile);}catch{return fail('replay');}
  const lists=new Map<number,ObservableList>();
  for(const d of dates){const l=buildObservableList(bytes,orbitFileType(BUNDLED_ORBIT_FILES[orbitFile].id),d,limit);if(!l)return fail('replay');lists.set(d,l);}
  for(const [i,e] of exposures.entries()){
   if(e.listJd===null){if(e.pairs)fail('replay');derivatives.push({i,pairs:[]});continue;}
   const r=movingPairs(bytes,lists.get(e.listJd)!,{ra:e.ra,dec:e.dec},e.jd,e.seconds);
   if(r.pairs.length!==e.pairs)fail('replay');
   derivatives.push({i,list:lists.get(e.listJd)!.entries.length,pairs:r.pairs.map(p=>[p.index,p.source.raHours,p.source.decDeg,p.source.storedMag,p.source.end.raHours,p.source.end.decDeg])});
  }
 }
 const digest=await resourceSha256(new TextEncoder().encode(JSON.stringify({policy:OBJECT_X_INVESTIGATION_POLICY,derivatives})));
 const result=Object.freeze({investigation:Object.freeze({orbitFile,id,target,startUtc,clockSet:v.clockSet as boolean,listJd,limit,exposures,images,measure,log,answer,description,revealed:v.revealed as boolean}),digest});
 lastVerified={text,result};return result;
}
/** Save: the portable payload plus its derivative digest. */
export async function portableObjectXInvestigation(i:ObjectXInvestigation):Promise<Readonly<{objectX:unknown;digest:string}>>{
 const objectX=portablePayload(i),{digest}=await derive(JSON.parse(JSON.stringify(objectX)));return Object.freeze({objectX,digest});
}
/** Restore: replays and rejects on any mismatch, including the stored digest. */
export async function admitObjectXInvestigation(value:unknown,digest:unknown):Promise<ObjectXInvestigation>{
 if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('digest');
 const d=await derive(value);if(d.digest!==digest)fail('digest');return d.investigation;
}
