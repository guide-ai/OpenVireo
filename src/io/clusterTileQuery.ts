// Front G5: the Cluster Data query 0x534254 for any centre, on the compact GSC tiles (user approval of 2026-10-29, decision 2).
// Static reading of CLEA_VEO.exe (781bc970…c54c); plan analysis/front-plans/front-g5.md §2.
// [D] TClstrDlgForm1 OK (0x5361f8..0x53634a) builds the area at 0x5bca3f: halfDec = 1.1·Diam/60, RA half-width
//     halfDec/(cos Dec·15), each RA bound folded once, Dec unclamped, the limit as a Single (clusterDialogValidate already does
//     this). 0x534254 then makes a NewGSCFieldObj, enumerates regions with 0x5977e0 (wrap branch included) and makes ONE
//     VMT+8 read (0x59ad98) over that area per selected band: the binary search on Round(min·1e7), the scan with admission
//     0x599e08 and the stop RA > max. The area is not split as 0x597ac8 splits a field, and nothing is merged (no QSO, variable
//     or galaxy). In a wrapped area each band's scan therefore stops after its first visited record (deterministic; ported as
//     is). Each admitted star then needs 0x59a49c(centre, star)·60 ≤ Diam and a clear B−V-assigned flag (+0x3b); the report
//     sorts them by the dialog's Sort By (clusterRecordsReport).
// [W] A folded RA bound outside 0..24 h or equal bounds (G1b's polar rule), more than 100 regions, a band visit budget or a
//     band-end read are typed reasons, never approximated. Nothing is persisted or sent anywhere.
import {nativeCatalogAdmission} from '../core/catalogPopulation';
import {catalogMergeDistance} from '../core/catalogMerge';
import {catalogRecordFromStar,type CatalogStarRecord} from '../core/catalogObject';
import {CompactBandReadOrderError,traceCompactGscBandRead} from '../core/compactGscReadOrder';
import {FIELD_SCAN_BUDGET} from '../core/fieldEngine';
import {planGscBandRead} from '../core/gscTilePlan';
import {roundNearestEven} from '../core/numericPolicy';
import {decodeNativeCompactRecord,nativeCompactBandOrder,nativeRegionIds,NativeFieldError} from '../core/pinnedNativeField';
import {GscTileError,gscBandIndex,tiledBandSource,type GscIndex,type GscTileStore} from './gscTiles';
import {yieldTask} from './yieldTask';

export type ClusterQueryArea=Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number}>;
export type ClusterQueryInput=Readonly<{ra:number;dec:number;diam:number;limit:number;area:ClusterQueryArea}>;
export type ClusterQueryReason='polar'|'regions'|'budget'|'band-end'|'plan';
export class ClusterQueryError extends Error{constructor(readonly code:ClusterQueryReason){super(`Cluster query: ${code}`);this.name='ClusterQueryError';}}
export type ClusterQueryResult=Readonly<{
 /** Stars the reader admitted (0x599e08), in read order: empty is VIREO's "No Stars Found in Field!" (0x53435b). */
 readCount:number;
 /** After the 0x59a49c distance and B−V filters, in read order. */
 records:readonly CatalogStarRecord[];
 /** Parallel to records: `<band>.DAT@<record index>`, the published banks' point ids. */sourceIds:readonly string[];
 bands:readonly string[];
}>;
const HEX=Array.from({length:256},(_,b)=>b.toString(16).padStart(2,'0'));
const hex=(bytes:Uint8Array)=>{let out='';for(let i=0;i<bytes.length;i++)out+=HEX[bytes[i]];return out;};

export async function queryClusterTiles(q:ClusterQueryInput,s:Readonly<{index:GscIndex;tiles:GscTileStore}>,signal?:AbortSignal):Promise<ClusterQueryResult>{
 signal?.throwIfAborted();
 const a=q.area;
 // G1b's polar rule: a bound the single fold leaves outside 0..24 h, or equal bounds (0x5978c0 and the reader disagree there).
 if(!(a.minimumRa>=0&&a.minimumRa<=24&&a.maximumRa>=0&&a.maximumRa<=24)||a.minimumRa===a.maximumRa)throw new ClusterQueryError('polar');
 let order:readonly string[];
 try{order=nativeCompactBandOrder(nativeRegionIds(a));}catch(e){if(e instanceof NativeFieldError)throw new ClusterQueryError('regions');throw e;}
 const region={...a,limitingMagnitude:Math.fround(q.limit)},key=roundNearestEven(a.minimumRa*1e7),centre={ra:q.ra,dec:q.dec};
 const admitted:{record:CatalogStarRecord;source:string}[]=[];
 for(const name of order){
  const b=gscBandIndex(s.index,name),plan=planGscBandRead(b,key,a.maximumRa);
  const source=tiledBandSource(b,await s.tiles.tiles(b,plan.tiles,signal));
  signal?.throwIfAborted();await yieldTask();signal?.throwIfAborted();
  let trace;
  try{trace=traceCompactGscBandRead(source,key,a.maximumRa,FIELD_SCAN_BUDGET);}
  catch(e){
   if(e instanceof CompactBandReadOrderError)throw new ClusterQueryError(e.code==='budget'?'budget':e.code==='read-boundary'?'band-end':'plan');
   if(e instanceof GscTileError&&e.code==='missing-tile')throw new ClusterQueryError('plan');
   throw e;
  }
  for(const v of trace.visits){
   const star=decodeNativeCompactRecord(hex(source.readRecord(v.recordIndex)),name,v.recordIndex);
   if(nativeCatalogAdmission({ra:star.ra,dec:star.dec,magnitude:star.magnitude},region))admitted.push({record:catalogRecordFromStar(star),source:star.id});
  }
 }
 // 0x5344d3..0x534527: distance from the dialog centre ×60 (strictly greater than Diam is dropped), then B−V known (+0x3b clear).
 const kept=admitted.filter(({record:r})=>catalogMergeDistance(centre,r)*60<=Math.fround(q.diam)&&!r.flags.bv);
 return Object.freeze({readCount:admitted.length,records:Object.freeze(kept.map(k=>k.record)),sourceIds:Object.freeze(kept.map(k=>k.source)),bands:order});
}
