// Front LSSFREE (session v34, a new OpenVireo format, not an original CLEA file): the LSS list's free-pointing records
// (core/lssFreeRecord.ts). The hot-list records stay in the unchanged v27–v31 layers, renumbered 1..m in list order; this part
// holds each free record with its list position, the shift control that gave its z, its typed velocity and remarks, and the
// field spectrometer's exposure behind it (field-spectrum policy, seed, compact events). Restore never trusts stored results:
// every exposure is replayed on the field the compact GSC tiles give at the policy's pointing, telescope, JD and range, the
// .SSP is rebuilt, its header pointing and the ID re-derived, z re-derived from the control and checked by the dialog rule, and
// a SHA-256 over those derivatives must equal the stored digest. Any failure rejects the whole file.
import {FIELD_SPECTRUM_FORMAT,parseFieldSpectrumPolicy} from '../core/fieldSpectrometer';
import {lssFreeSource} from '../core/lssFreeRecord';
import {LSS_LIMITS,decodeLssEvents,encodeLssEvents,lssEventTotal,lssJournalKey,type LssRecord} from '../core/lssSurvey';
import {lssDialogRecordValid} from '../core/lssRedshiftDialog';
import {currentZ} from '../core/spectrum';
import {MAX_JOURNAL_EVENTS,type JournalEvent} from '../core/exposureJournal';
import {LSS_SESSION_LIMITS,lssPayloadLength,readLssSessionControl,type LssInvestigation} from './lssInvestigation';
import {LssSessionError} from './lssSessionError';
import {resourceSha256} from './boundedResource';

export const LSS_FREE_SESSION_POLICY='openvireo-lss-free-records-v34';
const fail=(code:LssSessionError['code']):never=>{throw new LssSessionError(code);};
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function exact(v:unknown,keys:readonly string[]):Record<string,unknown>{if(!isObject(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))return fail('format');return v;}
const RECORD_KEYS=['at','object','jd','ra','dec','zHex','velocityHex','remarks','control','exposure'] as const;

/** The hot-list records as an ordinary v27 investigation (ids 1..m in list order) and the free records with their positions. */
export function splitLssInvestigation(i:LssInvestigation):Readonly<{rows:LssInvestigation;free:readonly Readonly<{at:number;record:LssRecord}>[]}>{
 const rows:LssRecord[]=[],free:{at:number;record:LssRecord}[]=[];
 i.records.forEach((r,index)=>{if(r.free)free.push({at:index+1,record:r});else rows.push(Object.freeze({...r,id:rows.length+1}));});
 return Object.freeze({rows:Object.freeze({...i,records:Object.freeze(rows)}),free:Object.freeze(free)});
}
/** What the replay derives for one free record (the digest's input). */
function derivatives(at:number,r:LssRecord,counts:string){return {at,object:r.object,ra:r.ra,dec:r.dec,zHex:r.zHex,velocityHex:r.velocityHex,counts};}
const countsDigest=(counts:readonly number[])=>resourceSha256(new TextEncoder().encode(counts.join(',')));

/** Save: the part and its digest, which comes from replaying the stored journals exactly as Restore will. */
export async function portableLssFreeRecords(i:LssInvestigation):Promise<Readonly<{rows:LssInvestigation;part:unknown;digest:string}>>{
 const {rows,free}=splitLssInvestigation(i);
 if(!free.length)fail('record');
 const records=free.map(({at,record:r})=>{
  if(!r.nativeDialog||r.fieldJd!==undefined)fail('record');
  return {at,object:r.object,jd:r.jd,ra:r.ra,dec:r.dec,zHex:r.zHex,velocityHex:r.velocityHex,remarks:r.remarks,control:r.control,exposure:{policy:r.acquisitionPolicy,seedAtReset:r.journal.seedAtReset,events:encodeLssEvents(r.journal.events)}};
 });
 const part={policy:LSS_FREE_SESSION_POLICY,records};
 if(JSON.stringify(part).length>LSS_SESSION_LIMITS.bytes-lssPayloadLength(rows))fail('bounds');
 // Save's self-check: the stored part admits on this page and gives the digest Restore will compare.
 const admitted=await deriveLssFree(JSON.parse(JSON.stringify(part)),rows);
 return Object.freeze({rows,part,digest:admitted.digest});
}

type Replayed=Readonly<{object:string;ra:number;dec:number;telescope:0|1|2;counts:string}>;
/** Validates the part, replays every distinct exposure once, and merges the records into the base list (ids renumbered). */
async function deriveLssFree(value:unknown,base:LssInvestigation):Promise<Readonly<{investigation:LssInvestigation;digest:string}>>{
 const v=exact(value,['policy','records']);
 if(v.policy!==LSS_FREE_SESSION_POLICY||!Array.isArray(v.records)||v.records.length<1)fail('format');
 const raw=v.records as unknown[],total=base.records.length+raw.length;
 if(total>LSS_LIMITS.records)fail('bounds');
 if(JSON.stringify(value).length>LSS_SESSION_LIMITS.bytes-lssPayloadLength(base))fail('bounds');
 if(base.records.some((r,i)=>r.free||r.id!==i+1))fail('record');
 const {readFieldSpectrumSession}=await import('./fieldSpectrometer');
 const replays=new Map<string,Replayed>(),free:{at:number;record:LssRecord}[]=[],digests:unknown[]=[];let last=0;
 for(const item of raw){
  const r=exact(item,RECORD_KEYS);
  const at=r.at;if(!Number.isInteger(at)||(at as number)<=last||(at as number)>total)fail('record');last=at as number;
  const e=exact(r.exposure,['policy','seedAtReset','events']);
  const policy=parseFieldSpectrumPolicy(e.policy);
  if(!policy||!Number.isInteger(e.seedAtReset)||(e.seedAtReset as number)<0||(e.seedAtReset as number)>0xffff_ffff||typeof e.events!=='string')fail('record');
  let events:readonly JournalEvent[];try{events=decodeLssEvents(e.events as string,MAX_JOURNAL_EVENTS);}catch{return fail('bounds');}
  if(encodeLssEvents(events)!==e.events)fail('record');
  if(typeof r.object!=='string'||!r.object||r.object.length>LSS_LIMITS.object||typeof r.remarks!=='string'||r.remarks.length>LSS_LIMITS.remarks||/[\u0000-\u001f\u007f]/.test(r.object+r.remarks))fail('record');
  const jd=typeof r.jd==='number'&&Number.isFinite(r.jd)&&r.jd>=2415020.5&&r.jd<=2488069.5?r.jd:fail('record');
  let control;try{control=readLssSessionControl(r.control);}catch{return fail('record');}
  const z=currentZ(control);if(!Number.isFinite(z)||Math.fround(z)<=-1)fail('record');
  const dialog=typeof r.zHex==='string'&&typeof r.velocityHex==='string'?lssDialogRecordValid(z,r.zHex,r.velocityHex):null;
  if(!dialog)fail('record');
  const key=lssJournalKey(e.policy as string,{seedAtReset:e.seedAtReset as number,events});
  if(!replays.has(key)){
   // The standalone field-spectrum session object (io/fieldSpectrometer.ts) at this policy: the field is prepared again from the
   // tiles (with the Object X mask) and the journal replayed. A tile that did not arrive propagates as itself (a resource).
   const text=JSON.stringify({format:FIELD_SPECTRUM_FORMAT,version:1,policy:e.policy,seedAtReset:e.seedAtReset,events});
   const restored=await readFieldSpectrumSession(text);
   let source;try{source=lssFreeSource(restored.state,restored.prepared.result,restored.prepared.pointing);}catch{return fail('replay');}
   replays.set(key,Object.freeze({object:source.object,ra:source.ra,dec:source.dec,telescope:source.telescope,counts:await countsDigest(restored.state.exposure.counts)}));
  }
  const replayed=replays.get(key)!;
  if(replayed.object!==r.object||replayed.ra!==r.ra||replayed.dec!==r.dec)fail('replay');
  const record:LssRecord=Object.freeze({id:at as number,field:null,row:null,free:true as const,telescope:replayed.telescope,object:replayed.object,jd,ra:replayed.ra,dec:replayed.dec,zSingle:dialog!.zSingle,zHex:r.zHex as string,velocitySingle:dialog!.velocitySingle,velocityHex:r.velocityHex as string,remarks:r.remarks as string,acquisitionPolicy:e.policy as string,journal:Object.freeze({seedAtReset:e.seedAtReset as number,events}),control,nativeDialog:true as const});
  free.push({at:at as number,record});digests.push(derivatives(at as number,record,replayed.counts));
 }
 // Merge: free records at their positions, the hot-list records in order around them; every id is its list position.
 const merged:LssRecord[]=[];let row=0,f=0;
 for(let id=1;id<=total;id++){
  const next=f<free.length&&free[f].at===id?free[f++].record:base.records[row++];
  if(!next)fail('record');merged.push(Object.freeze({...next,id}));
 }
 if(row!==base.records.length||f!==free.length)fail('record');
 if(lssEventTotal(merged)>LSS_LIMITS.events)fail('bounds');
 const digest=await resourceSha256(new TextEncoder().encode(JSON.stringify({policy:LSS_FREE_SESSION_POLICY,derivatives:digests})));
 return Object.freeze({investigation:Object.freeze({...base,records:Object.freeze(merged)}),digest});
}
/** Restore: replays everything and rejects on any mismatch, including the stored digest. `base` is the restored v27 layer. */
export async function admitLssFreeRecords(value:unknown,digest:unknown,base:LssInvestigation):Promise<LssInvestigation>{
 if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('digest');
 const d=await deriveLssFree(value,base);if(d.digest!==digest)fail('digest');return d.investigation;
}
/** Save's own re-read: the part's shape only (the exposures were replayed when the part was written). */
export function checkLssFreeShape(value:unknown):void{
 const v=exact(value,['policy','records']);
 if(v.policy!==LSS_FREE_SESSION_POLICY||!Array.isArray(v.records)||v.records.length<1||v.records.length>LSS_LIMITS.records)fail('format');
 for(const item of v.records as unknown[]){const r=exact(item,RECORD_KEYS);exact(r.exposure,['policy','seedAtReset','events']);}
}
