// Front G (analysis/front-plans/front-g-gsc.md §4): a field pack for any pointing, assembled from the compact GSC tiles and
// the whole bundled CLEA_VStrs.dat, CLEA_QSO.DAT and GLIMAGES.LST. It uses the same evidence rule as the published packs
// (core/fieldPack.ts): every band read of the native search and scan (0x59af80..0x59b1f7) is recorded, as the whole 27-byte
// record when it lies inside the area and as its 8-byte position otherwise; every variable record and QSO position inside the
// area; and the GLIMAGES.LST indices inside it (packWithPhotographs). The field engine itself is unchanged and runs on the
// result. A field across 0 h is read as VIREO does (G1b, §G-RE1: two star reads [min, 24] and [0, max] per band, recorded in
// that order; coverage RA 0..24 so the whole-source lists cover both sides). A folded RA bound outside 0..24 h is the typed
// 'polar' (§G-RE2); nothing is approximated. Static reading only; no equivalence with the original program is claimed.
import {decodeFieldPack,FIELD_PACK_LIMITS,FIELD_PACK_SCHEMA,type FieldPack} from '../core/fieldPack';
import {FIELD_SCAN_BUDGET,FieldEngineError,fieldAreaWraps,fieldSubAreas,freshFieldArea} from '../core/fieldEngine';
import {nativeCompactBandOrder,nativeRegionIds,NativeFieldError} from '../core/pinnedNativeField';
import {CompactBandReadOrderError,traceCompactGscBandRead} from '../core/compactGscReadOrder';
import {roundNearestEven} from '../core/numericPolicy';
import {planGscBandRead} from '../core/gscTilePlan';
import {packWithPhotographs} from '../core/lssLists';
import {nativePhotographRows} from '../core/photographicList';
import {VARIABLE_RECORD_OFFSETS} from '../core/variableMerge';
import {VSTRS_RECORD_BYTES} from '../core/variableStars';
import {yieldTask} from './yieldTask';
import {GscTileError,gscBandIndex,tiledBandSource,type GscIndex,type GscTileStore} from './gscTiles';

/** polar: a folded RA bound outside 0..24 h (about |Dec| ≥ 89.94°), a web limit [W] (FieldEngineError explains; §G-RE2); regions: more than 100 regions; budget: more than the visit budget in a
 * band; band-end: the native search runs past a band's last record (the minimum RA key is above every record), where VIREO
 * reads past EOF and raises an I/O error (Front O RECOVERY-E §4) — nothing to approximate; plan: a read outside the planned
 * tiles (a planning bug, never a skipped record); source: a malformed bundled file. Tile fetch and integrity failures stay
 * GscTileError ('fetch' / 'integrity'), and an abort is the DOMException AbortError. */
export class AssembledFieldError extends Error{
 constructor(readonly code:'polar'|'input'|'regions'|'budget'|'band-end'|'plan'|'source'){super(`Assembled field: ${code}`);this.name='AssembledFieldError';}
}
export type AssemblySources=Readonly<{index:GscIndex;tiles:GscTileStore;variables:Uint8Array;variablesSha256:string;qso:Uint8Array;qsoSha256:string;glimages:Uint8Array}>;
/** The adapter's per-band visit budget, the same as packStars (fieldEngine.ts FIELD_SCAN_BUDGET). */
export const ASSEMBLED_SCAN_BUDGET=FIELD_SCAN_BUDGET;
const QSO_RECORD_BYTES=52,QSO_POSITION=18;
const HEX=Array.from({length:256},(_,b)=>b.toString(16).padStart(2,'0'));
const hex=(bytes:Uint8Array)=>{let out='';for(let i=0;i<bytes.length;i++)out+=HEX[bytes[i]];return out;};

/** The fresh area for a pointing, or the typed reason freshFieldArea's guard stands for. */
export function assembledFieldArea(pointing:Readonly<{ra:number;dec:number}>,halfDegrees?:number){
 try{return freshFieldArea(pointing,halfDegrees);}// identical arithmetic to every pack consumer
 catch(e){if(e instanceof FieldEngineError)throw new AssembledFieldError(e.code==='polar'?'polar':'input');throw e;}
}
/** Yield to the event loop between band reads, every 4096 recorded reads and before the whole-file scans, so the page stays
 * responsive, and stop there on an abort (G1b review 1 L3). */
async function pause(signal?:AbortSignal){signal?.throwIfAborted();await yieldTask();signal?.throwIfAborted();}
/** halfDegrees: the field's half-height (FIELD_HALF_DEGREES; default the instrument field, 0.375°). */
export async function assembleFieldPack(pointing:Readonly<{ra:number;dec:number}>,s:AssemblySources,signal?:AbortSignal,halfDegrees?:number):Promise<FieldPack>{
 signal?.throwIfAborted();const area=assembledFieldArea(pointing,halfDegrees);
 let order:readonly string[];
 try{order=nativeCompactBandOrder(nativeRegionIds(area));}catch(e){if(e instanceof NativeFieldError)throw new AssembledFieldError('regions');throw e;}
 // Coverage: the area itself, or the whole RA ring of its Dec band for a field across 0 h (FieldPackRect needs min < max).
 const coverage=fieldAreaWraps(area)?{minimumRa:0,maximumRa:24,minimumDec:area.minimumDec,maximumDec:area.maximumDec}:{minimumRa:area.minimumRa,maximumRa:area.maximumRa,minimumDec:area.minimumDec,maximumDec:area.maximumDec};
 const inside=(ra:number,dec:number)=>ra>=coverage.minimumRa&&ra<=coverage.maximumRa&&dec>=coverage.minimumDec&&dec<=coverage.maximumDec;
 const reads=new Map<string,Map<number,string>>(order.map(n=>[n,new Map()]));
 for(const sub of fieldSubAreas(area))for(const name of order){
  const key=roundNearestEven(sub.minimumRa*1e7),b=gscBandIndex(s.index,name),plan=planGscBandRead(b,key,sub.maximumRa),band=reads.get(name)!;
  // A record is whole when it lies inside this read's (sub-)area, as the published packs' rule for each listed read.
  const within=(ra:number,dec:number)=>ra>=sub.minimumRa&&ra<=sub.maximumRa&&dec>=sub.minimumDec&&dec<=sub.maximumDec;
  const source=tiledBandSource(b,await s.tiles.tiles(b,plan.tiles,signal));await pause(signal);
  let trace;
  try{trace=traceCompactGscBandRead(source,key,sub.maximumRa,ASSEMBLED_SCAN_BUDGET);}
  catch(e){
   if(e instanceof CompactBandReadOrderError)throw new AssembledFieldError(e.code==='budget'?'budget':e.code==='read-boundary'?'band-end':'source');
   if(e instanceof GscTileError&&e.code==='missing-tile')throw new AssembledFieldError('plan');
   throw e;
  }
  let n=0;
  for(const r of [...trace.probes,...trace.visits]){
   if(++n%4096===0)await pause(signal);// a whole polar band is ~95,000 reads
   if(band.get(r.recordIndex)?.length===54)continue;
   try{
    const p=new DataView(source.readPosition(r.recordIndex).buffer),ra=p.getInt32(0,true)/10_000_000,dec=p.getInt32(4,true)/100_000;
    band.set(r.recordIndex,within(ra,dec)?hex(source.readRecord(r.recordIndex)):hex(source.readPosition(r.recordIndex)));
   }catch(e){if(e instanceof GscTileError&&e.code==='missing-tile')throw new AssembledFieldError('plan');throw e;}
  }
  if(band.size>FIELD_PACK_LIMITS.readsPerBand)throw new AssembledFieldError('budget');
 }
 const bands=order.map(name=>{const b=gscBandIndex(s.index,name);return {name,recordCount:b.records,sha256:b.sha256,reads:[...reads.get(name)!].sort((x,y)=>x[0]-y[0])};});
 await pause(signal);
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
 const pack=decodeFieldPack({schema:FIELD_PACK_SCHEMA,id:'gsc-tiles',coverage,
  pointings:[{ra:pointing.ra,dec:pointing.dec}],bands,
  variables:{sha256:s.variablesSha256,recordsChecked:s.variables.byteLength/VSTRS_RECORD_BYTES,entries:variables},
  qso:{sha256:s.qsoSha256,recordsChecked:s.qso.byteLength/QSO_RECORD_BYTES,entries:qso},
  photographs:{sha256:null,recordsChecked:1,entries:[]}});
 // The photographic list as VIREO keeps it (0x596bd0/0x596da8: a row that fails to parse is dropped whole, e.g. NGC 4449's),
 // so the matches are rows the 'photographs' option can resolve (G4a: the evidence check at fieldEngine's photograph stage).
 return packWithPhotographs(pack,nativePhotographRows(s.glimages).map(r=>({index:r.index,ra:r.ra,dec:r.dec})),halfDegrees);
}
