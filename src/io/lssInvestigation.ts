// E02 part of the investigation file (session v27, a new OpenVireo format, not an original CLEA file). It holds the chosen field
// and telescope, every Record Z row with the exposure journal behind it (seed + events) and the shift control that gave its z,
// the free-text description and the committed wedge options. Restore never trusts stored results: each journal is replayed
// through the field engine on its bundled pack, z and velocity are re-derived from the control, and a SHA-256 over those
// derivatives must equal the stored digest. Any failure rejects the whole file (the caller applies nothing).
import {evaluateLssRow,lssExposureEngine,lssPolicy} from '../core/lssExposure';
import {lssFieldRows,type LssFieldNumber} from '../core/lssFields';
import {LSS_LIMITS,decodeLssEvents,encodeLssEvents,lssJournalKey,type LssRecord} from '../core/lssSurvey';
import {hubbleVelocity} from '../core/hubbleVelocity';
import {currentZ,type ShiftControl} from '../core/spectrum';
import {MAX_JOURNAL_EVENTS,type JournalEvent} from '../core/exposureJournal';
import type {LssRowStatus} from '../core/lssExposure';
import {validWedgeOptions,type WedgeOptions} from '../core/wedgePlot';
import type {FieldPack} from '../core/fieldPack';
import {GLIMAGES_LST,GLXYSP_LST,packWithPhotographs,parseGlimagesPositions,parseGlxyspNames} from '../core/lssLists';
import {resourceSha256} from './boundedResource';

export const LSS_INVESTIGATION_POLICY='openvireo-lss-investigation-v27';
/** Own bounds: 250 records; 150 000 journal events over the distinct exposures (records of one exposure share its journal);
 * a 4000-character description. Events are stored as one compact string per journal (encodeLssEvents: about 4–9 bytes per
 * event even when every tick differs), and the serialized E02 part is capped at 4 MiB, so it always leaves at least 12 MiB of
 * the 16 MiB session cap to the rest of the investigation. */
export const LSS_SESSION_LIMITS=Object.freeze({records:LSS_LIMITS.records,events:LSS_LIMITS.events,description:LSS_LIMITS.description,bytes:4*1024*1024});
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
const text_=(v:unknown,max:number,lines=false)=>typeof v==='string'&&v.length<=max&&!(lines?/[\u0000-\u0008\u000b-\u001f\u007f]/:/[\u0000-\u001f\u007f]/).test(v)?v:fail('record');
const hex32=(v:number)=>{const b=new DataView(new ArrayBuffer(4));b.setFloat32(0,v,false);return b.getUint32(0,false).toString(16).padStart(8,'0');};
function control(v:unknown):ShiftControl{
 const c=exact(v,['base','position','factor','step']),base=finite(c.base),position=finite(c.position),step=finite(c.step);
 if(!Number.isInteger(position)||position<-100||position>100||(c.factor!==1&&c.factor!==10)||step<=0||step>1)fail('record');
 return Object.freeze({base,position,factor:c.factor as 1|10,step});
}
/** Plain JSON form (what the file stores): a table of distinct journals and records pointing at them. */
function portablePayload(i:LssInvestigation){
 const keys=new Map<string,number>(),journals:{policy:string;seedAtReset:number;events:string}[]=[];
 const records=i.records.map(r=>{
  const key=lssJournalKey(r.acquisitionPolicy,r.journal);let at=keys.get(key);
  if(at===undefined){at=journals.length;keys.set(key,at);journals.push({policy:r.acquisitionPolicy,seedAtReset:r.journal.seedAtReset,events:encodeLssEvents(r.journal.events)});}
  return {id:r.id,field:r.field,row:r.row,telescope:r.telescope,object:r.object,jd:r.jd,ra:r.ra,dec:r.dec,zHex:r.zHex,velocityHex:r.velocityHex,remarks:r.remarks,acquisitionPolicy:r.acquisitionPolicy,journal:at,control:r.control};
 });
 return {policy:LSS_INVESTIGATION_POLICY,field:i.field,telescope:i.telescope,journals,records,description:i.description,wedgeOptions:i.wedgeOptions};
}
type Derived=Readonly<{investigation:LssInvestigation;digest:string}>;
/** The last verified payload (exact text): Save's self-check restore of the same bytes does not verify them twice. */
let lastVerified:Readonly<{text:string;result:Derived}>|null=null;
/** Validates, replays and re-derives a stored payload. Returns the investigation and the digest of its derivatives. */
async function derive(value:unknown):Promise<Derived>{
 const text=JSON.stringify(value);
 if(text.length>LSS_SESSION_LIMITS.bytes)fail('bounds');
 if(lastVerified&&lastVerified.text===text)return lastVerified.result;
 const v=exact(value,['policy','field','telescope','journals','records','description','wedgeOptions']);
 if(v.policy!==LSS_INVESTIGATION_POLICY)fail('format');
 const field=v.field===null?null:Number.isInteger(v.field)&&(v.field as number)>=1&&(v.field as number)<=9?v.field as LssFieldNumber:fail('record');
 const telescope=v.telescope===0||v.telescope===1||v.telescope===2?v.telescope:fail('record');
 const description=text_(v.description,LSS_SESSION_LIMITS.description,true);
 const wedgeOptions=v.wedgeOptions===null?null:validWedgeOptions(v.wedgeOptions)?Object.freeze({...v.wedgeOptions}) as WedgeOptions:fail('record');
 if(!Array.isArray(v.records)||v.records.length>LSS_SESSION_LIMITS.records||!Array.isArray(v.journals)||v.journals.length>v.records.length)fail('bounds');
 // Decode every journal and enforce the event budget before any replay.
 let total=0;
 const journals=(v.journals as unknown[]).map(j=>{
  const r=exact(j,['policy','seedAtReset','events']);
  if(typeof r.policy!=='string'||!Number.isInteger(r.seedAtReset)||(r.seedAtReset as number)<0||(r.seedAtReset as number)>0xffff_ffff||typeof r.events!=='string')fail('record');
  let evs:readonly JournalEvent[];try{evs=decodeLssEvents(r.events as string,MAX_JOURNAL_EVENTS);}catch{return fail('bounds');}
  total+=evs.length;if(total>LSS_SESSION_LIMITS.events)fail('bounds');
  if(encodeLssEvents(evs)!==r.events)fail('record');
  return Object.freeze({policy:r.policy as string,seedAtReset:r.seedAtReset as number,events:evs});
 });
 const raw=v.records as unknown[],used=new Set<number>();
 const src=resources??(resources=browserResources());
 const glx=raw.length?await src.glx():null,spectra=raw.length?await src.spectra():null,packs=new Map<LssFieldNumber,FieldPack>();
 // Memoised: one field evaluation per (field,row,telescope) and one replay per journal.
 const statuses=new Map<string,LssRowStatus>(),replays=new Map<number,Readonly<{counts:string}>>();
 const records:LssRecord[]=[],derivatives:unknown[]=[];
 for(const [i,item] of raw.entries()){
  const r=exact(item,['id','field','row','telescope','object','jd','ra','dec','zHex','velocityHex','remarks','acquisitionPolicy','journal','control']);
  if(r.id!==i+1)fail('record');
  const f=Number.isInteger(r.field)&&(r.field as number)>=1&&(r.field as number)<=9?r.field as LssFieldNumber:fail('record');
  const rows=lssFieldRows(f),rowIndex=Number.isInteger(r.row)&&(r.row as number)>=0&&(r.row as number)<rows.length?r.row as number:fail('record'),row=rows[rowIndex];
  const t=r.telescope===0||r.telescope===1||r.telescope===2?r.telescope:fail('record');
  if(r.acquisitionPolicy!==lssPolicy(f,rowIndex,t)||r.ra!==row.ra||r.dec!==row.dec)fail('record');
  const ji=Number.isInteger(r.journal)&&(r.journal as number)>=0&&(r.journal as number)<journals.length?r.journal as number:fail('record'),journal=journals[ji];
  if(journal.policy!==r.acquisitionPolicy)fail('record');used.add(ji);
  const jd=finite(r.jd);if(jd<2415020.5||jd>2488069.5)fail('record');
  const c=control(r.control),z=currentZ(c);if(!Number.isFinite(z)||Math.fround(z)<=-1)fail('record');
  const zSingle=Math.fround(z),velocity=hubbleVelocity(z);
  if(r.zHex!==hex32(zSingle)||r.velocityHex!==velocity.storedHex)fail('record');
  const key=`${f}:${rowIndex}:${t}`;
  if(!statuses.has(key)){
   if(!packs.has(f))packs.set(f,await src.pack(f));
   let evaluated:LssRowStatus|null=null;try{evaluated=evaluateLssRow(packs.get(f)!,glx!,row,t,spectra!);}catch{evaluated=null;}
   if(!evaluated)return fail('replay');statuses.set(key,evaluated);
  }
  const status=statuses.get(key)!;
  if(status.kind==='unavailable'||status.selectedId!==r.object)return fail('replay');
  if(!replays.has(ji)){
   let replayed:ReturnType<ReturnType<typeof lssExposureEngine>['replay']>|null=null;
   try{replayed=lssExposureEngine(status.result,journal.policy).replay(journal.seedAtReset,journal.events);}catch{replayed=null;}
   if(!replayed||replayed.exposure.phase==='running'||!replayed.exposure.counts.some(n=>n>0))return fail('replay');
   replays.set(ji,{counts:await resourceSha256(new TextEncoder().encode(replayed.exposure.counts.join(',')))});
  }
  const remarks=text_(r.remarks,LSS_LIMITS.remarks);
  records.push(Object.freeze({id:i+1,field:f,row:rowIndex,telescope:t,object:status.selectedId,jd,ra:row.ra,dec:row.dec,zSingle,zHex:r.zHex as string,velocitySingle:velocity.storedKmS,velocityHex:velocity.storedHex,remarks,acquisitionPolicy:r.acquisitionPolicy as string,journal:Object.freeze({seedAtReset:journal.seedAtReset,events:journal.events}),control:c}));
  derivatives.push({id:i+1,selected:status.selectedIndex,pixelLevel:status.result.calibration!.pixelLevel,counts:replays.get(ji)!.counts,zHex:r.zHex,velocityHex:velocity.storedHex});
 }
 if(used.size!==journals.length)fail('record');// every stored journal belongs to a record
 const digest=await resourceSha256(new TextEncoder().encode(JSON.stringify({policy:LSS_INVESTIGATION_POLICY,derivatives})));
 const result=Object.freeze({investigation:Object.freeze({field,telescope,records:Object.freeze(records),description,wedgeOptions}),digest});
 lastVerified={text,result};return result;
}
/** Save: the portable payload plus its derivative digest (the payload is replayed once to compute it). */
export async function portableLssInvestigation(i:LssInvestigation):Promise<Readonly<{lss:unknown;digest:string}>>{
 const lss=portablePayload(i),{digest}=await derive(JSON.parse(JSON.stringify(lss)));return Object.freeze({lss,digest});
}
/** Restore: replays everything and rejects on any mismatch, including the stored digest. */
export async function admitLssInvestigation(value:unknown,digest:unknown):Promise<LssInvestigation>{
 if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('digest');
 const d=await derive(value);if(d.digest!==digest)fail('digest');return d.investigation;
}
