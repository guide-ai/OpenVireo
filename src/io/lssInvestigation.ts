// E02 part of the investigation file (session v27, a new OpenVireo format, not an original CLEA file). It holds the chosen field
// and telescope, every Record Z row with the exposure journal behind it (seed + events) and the shift control that gave its z,
// the free-text description and the committed wedge options. Restore never trusts stored results: each journal is replayed
// through the field engine on its bundled pack, z and velocity are re-derived from the control, and a SHA-256 over those
// derivatives must equal the stored digest. Any failure rejects the whole file (the caller applies nothing).
import {evaluateLssRow,lssExposureEngine,lssPolicy} from '../core/lssExposure';
import {lssFieldRows,type LssFieldNumber} from '../core/lssFields';
import {LSS_LIMITS,type LssRecord} from '../core/lssSurvey';
import {hubbleVelocity} from '../core/hubbleVelocity';
import {currentZ,type ShiftControl} from '../core/spectrum';
import {MAX_JOURNAL_EVENTS,type JournalEvent} from '../core/exposureJournal';
import {validWedgeOptions,type WedgeOptions} from '../core/wedgePlot';
import type {FieldPack} from '../core/fieldPack';
import {GLIMAGES_LST,GLXYSP_LST,packWithPhotographs,parseGlimagesPositions,parseGlxyspNames} from '../core/lssLists';
import {resourceSha256} from './boundedResource';

export const LSS_INVESTIGATION_POLICY='openvireo-lss-investigation-v27';
/** Own bounds, well inside the 16 MiB session cap: 250 records, 150 000 journal events in total, 4000-character description. */
export const LSS_SESSION_LIMITS=Object.freeze({records:LSS_LIMITS.records,events:150_000,description:4000});
export class LssSessionError extends Error{
 constructor(readonly code:'format'|'bounds'|'record'|'replay'|'digest'){super(`LSS investigation: ${code}`);this.name='LssSessionError';}
}
export type LssInvestigation=Readonly<{field:LssFieldNumber|null;telescope:0|1|2;records:readonly LssRecord[];description:string;wedgeOptions:WedgeOptions|null}>;
/** Where restore gets the bundled field evidence (browser: same-origin, size/SHA-checked; tests: the repository files). */
export type LssResources=Readonly<{pack:(field:LssFieldNumber)=>Promise<FieldPack>;glx:()=>Promise<Uint8Array>;spectra:()=>Promise<ReadonlySet<string>>}>;
function browserResources():LssResources{
 const signal=new AbortController().signal;
 const lists=async()=>{const {fetchBundledHotList}=await import('./bundledHotList');return fetchBundledHotList;};
 return {
  pack:async field=>{const [{loadLssPack},fetchList]=await Promise.all([import('./lssPack'),lists()]);return packWithPhotographs(await loadLssPack(field),parseGlimagesPositions((await fetchList(fetch,signal,GLIMAGES_LST)).bytes));},
  glx:async()=>(await import('./bundledGlxCatalog')).fetchBundledGlxCatalog(fetch,signal),
  spectra:async()=>parseGlxyspNames((await (await lists())(fetch,signal,GLXYSP_LST)).bytes),
 };
}
let resources:LssResources|null=null;
/** Test seam: replace the resource source (the default reads the bundled same-origin files). */
export function setLssResources(r:LssResources|null){resources=r;}
const fail=(code:LssSessionError['code']):never=>{throw new LssSessionError(code);};
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function exact(v:unknown,keys:readonly string[]):Record<string,unknown>{if(!isObject(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))return fail('format');return v;}
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:fail('record');
const text=(v:unknown,max:number,lines=false)=>typeof v==='string'&&v.length<=max&&!(lines?/[\u0000-\u0008\u000b-\u001f\u007f]/:/[\u0000-\u001f\u007f]/).test(v)?v:fail('record');
const hex32=(v:number)=>{const b=new DataView(new ArrayBuffer(4));b.setFloat32(0,v,false);return b.getUint32(0,false).toString(16).padStart(8,'0');};
function control(v:unknown):ShiftControl{
 const c=exact(v,['base','position','factor','step']),base=finite(c.base),position=finite(c.position),step=finite(c.step);
 if(!Number.isInteger(position)||position<-100||position>100||(c.factor!==1&&c.factor!==10)||step<=0||step>1)fail('record');
 return Object.freeze({base,position,factor:c.factor as 1|10,step});
}
function events(v:unknown):readonly JournalEvent[]{
 if(!Array.isArray(v)||v.length>MAX_JOURNAL_EVENTS)fail('bounds');
 return Object.freeze((v as unknown[]).map(e=>{const r=isObject(e)?e:fail('record');if(r.kind==='start'||r.kind==='pause'){exact(r,['kind']);return Object.freeze({kind:r.kind});}exact(r,['kind','deltaMs']);if(r.kind!=='tick')fail('record');return Object.freeze({kind:'tick' as const,deltaMs:finite(r.deltaMs)});}));
}
/** Plain JSON form of one record (what the file stores). */
function portableRecord(r:LssRecord){
 return {id:r.id,field:r.field,row:r.row,telescope:r.telescope,object:r.object,jd:r.jd,ra:r.ra,dec:r.dec,zHex:r.zHex,velocityHex:r.velocityHex,remarks:r.remarks,acquisitionPolicy:r.acquisitionPolicy,journal:{seedAtReset:r.journal.seedAtReset,events:r.journal.events},control:r.control};
}
/** Validates, replays and re-derives a stored payload. Returns the investigation and the digest of its derivatives. */
async function derive(value:unknown):Promise<Readonly<{investigation:LssInvestigation;digest:string}>>{
 const v=exact(value,['policy','field','telescope','records','description','wedgeOptions']);
 if(v.policy!==LSS_INVESTIGATION_POLICY)fail('format');
 const field=v.field===null?null:Number.isInteger(v.field)&&(v.field as number)>=1&&(v.field as number)<=9?v.field as LssFieldNumber:fail('record');
 const telescope=v.telescope===0||v.telescope===1||v.telescope===2?v.telescope:fail('record');
 const description=text(v.description,LSS_SESSION_LIMITS.description,true);
 const wedgeOptions=v.wedgeOptions===null?null:validWedgeOptions(v.wedgeOptions)?Object.freeze({...v.wedgeOptions}) as WedgeOptions:fail('record');
 if(!Array.isArray(v.records)||v.records.length>LSS_SESSION_LIMITS.records)fail('bounds');
 const raw=v.records as unknown[];
 let total=0;for(const r of raw){const j=isObject(r)&&isObject(r.journal)?r.journal.events:null;if(!Array.isArray(j))fail('format');total+=(j as unknown[]).length;}
 if(total>LSS_SESSION_LIMITS.events)fail('bounds');
 const src=resources??(resources=browserResources());
 const glx=raw.length?await src.glx():null,spectra=raw.length?await src.spectra():null,packs=new Map<LssFieldNumber,FieldPack>();
 const records:LssRecord[]=[],derivatives:unknown[]=[];
 for(const [i,item] of raw.entries()){
  const r=exact(item,['id','field','row','telescope','object','jd','ra','dec','zHex','velocityHex','remarks','acquisitionPolicy','journal','control']);
  if(r.id!==i+1)fail('record');
  const f=Number.isInteger(r.field)&&(r.field as number)>=1&&(r.field as number)<=9?r.field as LssFieldNumber:fail('record');
  const rows=lssFieldRows(f),rowIndex=Number.isInteger(r.row)&&(r.row as number)>=0&&(r.row as number)<rows.length?r.row as number:fail('record'),row=rows[rowIndex];
  const t=r.telescope===0||r.telescope===1||r.telescope===2?r.telescope:fail('record');
  if(r.acquisitionPolicy!==lssPolicy(f,rowIndex,t)||r.ra!==row.ra||r.dec!==row.dec)fail('record');
  const jd=finite(r.jd);if(jd<2415020.5||jd>2488069.5)fail('record');
  const c=control(r.control),z=currentZ(c);if(!Number.isFinite(z)||Math.fround(z)<=-1)fail('record');
  const zSingle=Math.fround(z),velocity=hubbleVelocity(z);
  if(r.zHex!==hex32(zSingle)||r.velocityHex!==velocity.storedHex)fail('record');
  const journal=exact(r.journal,['seedAtReset','events']),seed=journal.seedAtReset;
  if(!Number.isInteger(seed)||(seed as number)<0||(seed as number)>0xffff_ffff)fail('record');
  const evs=events(journal.events);
  // Replay: the row must still be observable with the same selected galaxy, and the journal must reproduce paused counts.
  if(!packs.has(f))packs.set(f,await src.pack(f));
  let evaluated:ReturnType<typeof evaluateLssRow>|null=null;try{evaluated=evaluateLssRow(packs.get(f)!,glx!,row,t,spectra!);}catch{evaluated=null;}
  if(!evaluated||evaluated.kind==='unavailable'||evaluated.selectedId!==r.object)return fail('replay');
  const status=evaluated;
  let replayed:ReturnType<ReturnType<typeof lssExposureEngine>['replay']>|null=null;
  try{replayed=lssExposureEngine(status.result,r.acquisitionPolicy as string).replay(seed as number,evs);}catch{replayed=null;}
  if(!replayed||replayed.exposure.phase==='running'||!replayed.exposure.counts.some(n=>n>0))return fail('replay');
  const state=replayed;
  const remarks=text(r.remarks,LSS_LIMITS.remarks);
  records.push(Object.freeze({id:i+1,field:f,row:rowIndex,telescope:t,object:status.selectedId,jd,ra:row.ra,dec:row.dec,zSingle,zHex:r.zHex as string,velocitySingle:velocity.storedKmS,velocityHex:velocity.storedHex,remarks,acquisitionPolicy:r.acquisitionPolicy as string,journal:Object.freeze({seedAtReset:seed as number,events:evs}),control:c}));
  derivatives.push({id:i+1,selected:status.selectedIndex,pixelLevel:status.result.calibration!.pixelLevel,counts:await resourceSha256(new TextEncoder().encode(state.exposure.counts.join(','))),zHex:r.zHex,velocityHex:velocity.storedHex});
 }
 const digest=await resourceSha256(new TextEncoder().encode(JSON.stringify({policy:LSS_INVESTIGATION_POLICY,derivatives})));
 return Object.freeze({investigation:Object.freeze({field,telescope,records:Object.freeze(records),description,wedgeOptions}),digest});
}
/** Save: the portable payload plus its derivative digest (the payload is replayed once to compute it). */
export async function portableLssInvestigation(i:LssInvestigation):Promise<Readonly<{lss:unknown;digest:string}>>{
 const lss={policy:LSS_INVESTIGATION_POLICY,field:i.field,telescope:i.telescope,records:i.records.map(portableRecord),description:i.description,wedgeOptions:i.wedgeOptions};
 const {digest}=await derive(JSON.parse(JSON.stringify(lss)));return Object.freeze({lss,digest});
}
/** Restore: replays everything and rejects on any mismatch, including the stored digest. */
export async function admitLssInvestigation(value:unknown,digest:unknown):Promise<LssInvestigation>{
 if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('digest');
 const d=await derive(value);if(d.digest!==digest)fail('digest');return d.investigation;
}
