// Front G (analysis/front-plans/front-g-gsc.md §4): a field pack for any pointing, assembled from the compact GSC tiles and
// the whole bundled CLEA_VStrs.dat, CLEA_QSO.DAT and GLIMAGES.LST. It uses the same evidence rule as the published packs
// (core/fieldPack.ts): every band read of the native search and scan (0x59af80..0x59b1f7) is recorded, as the whole 27-byte
// record when it lies inside the area and as its 8-byte position otherwise; every variable record and QSO position inside the
// area; and the GLIMAGES.LST indices inside it (packWithPhotographs). The field engine itself is unchanged and runs on the
// result. Pointings whose area wraps RA 0 h / 24 h or reaches |Dec| ≥ 89° are typed (G-RE1 / G-RE2 recover the native
// branches); nothing is approximated. Static reading only; no equivalence with the original program is claimed.
import {decodeFieldPack,FIELD_PACK_LIMITS,FIELD_PACK_SCHEMA,type FieldPack} from '../core/fieldPack';
import {freshFieldArea} from '../core/fieldEngine';
import {nativeCompactBandOrder,nativeRegionIds,NativeFieldError} from '../core/pinnedNativeField';
import {CompactBandReadOrderError,traceCompactGscBandRead} from '../core/compactGscReadOrder';
import {roundNearestEven} from '../core/numericPolicy';
import {planGscBandRead} from '../core/gscTilePlan';
import {packWithPhotographs,parseGlimagesPositions} from '../core/lssLists';
import {VARIABLE_RECORD_OFFSETS} from '../core/variableMerge';
import {VSTRS_RECORD_BYTES} from '../core/variableStars';
import {gscBandIndex,tiledBandSource,type GscIndex,type GscTileStore} from './gscTiles';

export class AssembledFieldError extends Error{
 constructor(readonly code:'ra-wrap'|'polar'|'input'|'regions'|'budget'|'source'){super(`Assembled field: ${code}`);this.name='AssembledFieldError';}
}
export type AssemblySources=Readonly<{index:GscIndex;tiles:GscTileStore;variables:Uint8Array;variablesSha256:string;qso:Uint8Array;qsoSha256:string;glimages:Uint8Array}>;
/** The adapter's per-band visit budget, as packStars (fieldEngine.ts). */
export const ASSEMBLED_SCAN_BUDGET=10_000;
const QSO_RECORD_BYTES=52,QSO_POSITION=18;
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

/** The fresh area for a pointing, or the typed reason freshFieldArea's guard stands for. */
export function assembledFieldArea(pointing:Readonly<{ra:number;dec:number}>){
 if(!pointing||!Number.isFinite(pointing.ra)||!Number.isFinite(pointing.dec)||pointing.ra<0||pointing.ra>=24||Math.abs(pointing.dec)>90)throw new AssembledFieldError('input');
 if(Math.abs(pointing.dec)>=89)throw new AssembledFieldError('polar');
 const hr=.375/(Math.cos(pointing.dec*Math.PI/180)*15);
 if(pointing.ra-hr<0||pointing.ra+hr>24)throw new AssembledFieldError('ra-wrap');
 return freshFieldArea(pointing);// identical arithmetic to every pack consumer
}
export async function assembleFieldPack(pointing:Readonly<{ra:number;dec:number}>,s:AssemblySources,signal?:AbortSignal):Promise<FieldPack>{
 const area=assembledFieldArea(pointing);
 let order:readonly string[];
 try{order=nativeCompactBandOrder(nativeRegionIds(area));}catch(e){if(e instanceof NativeFieldError)throw new AssembledFieldError('regions');throw e;}
 const key=roundNearestEven(area.minimumRa*1e7),inside=(ra:number,dec:number)=>ra>=area.minimumRa&&ra<=area.maximumRa&&dec>=area.minimumDec&&dec<=area.maximumDec;
 const bands=[];
 for(const name of order){
  const b=gscBandIndex(s.index,name),plan=planGscBandRead(b,key,area.maximumRa);
  const source=tiledBandSource(b,await s.tiles.tiles(b,plan.tiles,signal));
  let trace;
  try{trace=traceCompactGscBandRead(source,key,area.maximumRa,ASSEMBLED_SCAN_BUDGET);}
  catch(e){if(e instanceof CompactBandReadOrderError)throw new AssembledFieldError(e.code==='budget'?'budget':'source');throw e;}
  const reads=new Map<number,string>();
  for(const r of [...trace.probes,...trace.visits]){
   if(reads.has(r.recordIndex))continue;
   const p=new DataView(source.readPosition(r.recordIndex).buffer),ra=p.getInt32(0,true)/10_000_000,dec=p.getInt32(4,true)/100_000;
   reads.set(r.recordIndex,inside(ra,dec)?hex(source.readRecord(r.recordIndex)):hex(source.readPosition(r.recordIndex)));
  }
  if(reads.size>FIELD_PACK_LIMITS.readsPerBand)throw new AssembledFieldError('budget');
  bands.push({name,recordCount:b.records,sha256:b.sha256,reads:[...reads].sort((x,y)=>x[0]-y[0])});
 }
 // Whole-file scans with Double positions and inclusive bounds, as the published packs' offline witnesses.
 if(s.variables.byteLength%VSTRS_RECORD_BYTES||s.qso.byteLength%QSO_RECORD_BYTES)throw new AssembledFieldError('source');
 const vv=new DataView(s.variables.buffer,s.variables.byteOffset,s.variables.byteLength),variables=[];
 for(let i=0;i<s.variables.byteLength/VSTRS_RECORD_BYTES;i++){
  const at=i*VSTRS_RECORD_BYTES;
  if(inside(vv.getFloat64(at+VARIABLE_RECORD_OFFSETS.raDouble,true),vv.getFloat64(at+VARIABLE_RECORD_OFFSETS.decDouble,true)))variables.push({recordIndex:i,rawHex:hex(s.variables.subarray(at,at+VSTRS_RECORD_BYTES))});
 }
 const qv=new DataView(s.qso.buffer,s.qso.byteOffset,s.qso.byteLength),qso=[];
 for(let i=0;i<s.qso.byteLength/QSO_RECORD_BYTES;i++){
  const ra=qv.getFloat64(i*QSO_RECORD_BYTES+QSO_POSITION,true),dec=qv.getFloat64(i*QSO_RECORD_BYTES+QSO_POSITION+8,true);
  if(inside(ra,dec))qso.push({index:i,ra,dec});
 }
 const pack=decodeFieldPack({schema:FIELD_PACK_SCHEMA,id:'gsc-tiles',coverage:{minimumRa:area.minimumRa,maximumRa:area.maximumRa,minimumDec:area.minimumDec,maximumDec:area.maximumDec},
  pointings:[{ra:pointing.ra,dec:pointing.dec}],bands,
  variables:{sha256:s.variablesSha256,recordsChecked:s.variables.byteLength/VSTRS_RECORD_BYTES,entries:variables},
  qso:{sha256:s.qsoSha256,recordsChecked:s.qso.byteLength/QSO_RECORD_BYTES,entries:qso},
  photographs:{sha256:null,recordsChecked:1,entries:[]}});
 return packWithPhotographs(pack,parseGlimagesPositions(s.glimages));
}
