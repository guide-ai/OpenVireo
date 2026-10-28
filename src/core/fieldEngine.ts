/** General fresh-field engine (audit item 2.1). Pure: pointing + telescope record + evidence pack (fieldPack.ts) + the whole
 * bundled CLEA_GLX.DAT bytes → ordered native population → scene → 936² raster → 312² crop → slit selection → calibration →
 * journal factory. It composes the same recovered stages as the per-field builders (pinnedGalaxyField.ts, pinnedPegasusField.ts)
 * and galaxyExposure.ts, without changing them:
 *  1. area: pointing ± 0.375° Dec, ± 0.375/(15·cos Dec) h RA, limiting magnitude 20 (fresh 15′ field ×3);
 *  2. regions 0x5977e0/0x5978c0, band order 0x59ae16, per-band seek/read 0x59af80 and admission 0x599e08 from the pack reads;
 *  3. QSO: option qso 'gate' (default; E02 LSS is byte-identical) makes any QSO position inside the area a typed unavailable
 *     gate; 'merge' runs the recovered loader 0x5987e4 and merge 0x597f90 (qsoMerge.ts) on the bundled CLEA_QSO.DAT, after the
 *     variable stage and before the galaxies, and the galaxy cleanup then also takes its type-3 branches (keep both, or delete
 *     the galaxy). Photographic-list association: a typed unavailable gate, or with the photographs option the ported draw;
 *  4. variables: none, or exactly one class-3 record through the recovered false-merge branch (variableMerge.ts); otherwise gated;
 *  5. galaxies: whole-file CLEA_GLX.DAT admission in source order, each inserted by the GLX loader (call 0x599128) through the
 *     cursor-relative linked-list insert 0x492728 with the strict RA/Dec-greater comparator 0x5969e0 (nativeCursorInsert);
 *     each galaxy then cleans the star list (0x5980cc) in that order;
 *  6. scene/raster/crop/slit/calibration exactly as galaxyExposure.ts (fresh path), with the selection taken at the frame
 *     centre by the recovered nearest rule (0x59a0fc). A nonzero sub-pixel residual (rounded hot-list pointing) is allowed.
 * Every condition outside the recovered domain is reported as a typed unavailable reason; evidence inconsistencies throw.
 * Web adaptations: a fresh field per pointing (no cache pan), nearest-centre raster, fixed 4000–5000 Å, Number not x87. */
import galaxyProvenance from '../../data/hubble/galaxy-exposure-provenance.json';
import galaxySource from '../../data/hubble/galaxy-source.json';
import pegasusProvenance from '../../data/hubble/pegasus-field-provenance.json';
import {decodeNativeCompactRecord,nativeRegionIds,nativeCompactBandOrder,type NativeFieldStar} from './pinnedNativeField';
import {nativeCatalogAdmission,nativeStellarPaintLevel,nativeStoredStellarLevel,type NativeCatalogRegion} from './catalogPopulation';
import {traceCompactGscBandRead} from './compactGscReadOrder';
import {catalogMergeDistance,cleanNativeGalaxy,nativeMergeNearest,CatalogMergeError} from './catalogMerge';
import {decodeNativeVariableRecord,nativeVariableClass,nativeVariableDispatchFalse,nativeVariableFalseMerge,VariableMergeError,type NativeVariable} from './variableMerge';
import {decodeGlxRecord,GLX_CATALOG} from './glxCatalog';
import type {NativeGalaxy} from './pinnedGalaxyField';
import {galaxyCatalogAxes,catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import {paintAdaptedGalaxy,galaxyStampGeometry} from './galaxyScene';
import {createNativeSelectionScene,selectCatalogObject,type NativeSelectionScene,type ObjectSelection} from './objectSelection';
import {cropNativeFrame,freshNativeViewport,paintNativeStar} from './detectorRaster';
import {prepareNativeStarProfile} from './starProfiles';
import {photonAmplitudes,slitPixelLevel,telescopeZeroPoint,type PhotonAmplitudes,type RgbImage} from './photons';
import {nativeObjectSlitFraction} from './slitThroughput';
import {prepareGalaxyProfile} from './galaxySpectrum';
import {roundNearestEven} from './numericPolicy';
import {createJournalExposure,type JournalState,type JournalSourcePreparer} from './exposureJournal';
import {prepareCatalogGalaxyChannels,prepareCatalogGalaxyExtension} from './galaxyContinuum';
import {galaxyLibrarySpectrum,galaxyChannelGrid} from './galaxySpectrum';
import {sampleUniformSpectrum,type UniformSpectrum} from './acquisition';
import {packCovers,type FieldPack} from './fieldPack';
import {prepareQsoProfile,QsoSpectrumError,type QsoSpectrumFile} from './qsoSpectrum';
import {loadNativeQsoList,nativeQsoMerge,QsoMergeError,QSO_CATALOG,type NativeQso,type QsoMergeWitness} from './qsoMerge';
import {associatePhotograph,drawNativePhotograph,nativeGalaxyName,scaleNativePhotograph,type Bitmap8} from './photographDraw';
import type {PhotographRow} from './photographicList';

export class FieldEngineError extends Error{
 constructor(readonly code:'input'|'evidence'){super(`Field engine: ${code}`);this.name='FieldEngineError';}
}
export type FieldTelescope=0|1|2;
/** Calibration per telescope record, as galaxyExposure.ts: base and sky from the verified 0.4 m definition; the 0.9 m uses
 * correction/shift 0 and the 4 m 3/3. Zero points 4/6/9. The mean bound is the existing per-record rejection guard. */
const base=galaxyProvenance.calibration;
export const FIELD_CALIBRATIONS=Object.freeze([
 Object.freeze({baseZeroPoint:base.baseZeroPoint,telescopeCorrection:base.telescopeCorrection,skyMagnitude:base.skyMagnitude,magnitudeShift:base.magnitudeShift,zeroPoint:4,meanBound:12}),
 Object.freeze({baseZeroPoint:base.baseZeroPoint,telescopeCorrection:0,skyMagnitude:base.skyMagnitude,magnitudeShift:0,zeroPoint:6,meanBound:12}),
 Object.freeze({baseZeroPoint:base.baseZeroPoint,telescopeCorrection:3,skyMagnitude:base.skyMagnitude,magnitudeShift:3,zeroPoint:9,meanBound:1_000_000}),
]);
export const FIELD_MULTIPLIER=base.multiplier;
/** Why a pointing cannot be acquired in this version (never a fabricated substitute). */
export type FieldUnavailableReason=
 |'outside-pack'|'qso-merge'|'photographic-image'|'variable-merge'|'axis-fallback'|'merge-boundary'|'stamp-bound'
 |'no-galaxy-selected'|'star-selected'|'slit-empty'|'spectrum-range'|'mean-bound'|'spectrum-mapping'
 /** Front F, 'merge' mode only: the slit selects a merged QSO record (type 3); a QSO observation is another branch. */
 |'qso-selected';
/** QSO stage: 'gate' (default) or the recovered merge on the caller-verified bundled catalogue (bytes and their SHA-256). */
export type FieldQsoMode='gate'|'merge';
export type FieldQsoCatalog=Readonly<{bytes:Uint8Array;sha256:string}>;
/** A selected galaxy's own library spectrum (GLXYSP.LST match, lookup 0x55eb64): used only when the slit selects that target,
 * through the matched branch of 0x55e55c (wavelength factor 1); any other selection keeps the GLXYTMPL.SP fallback. */
export type FieldLibrarySpectrum=Readonly<{targetId:string;file:string;samples:readonly Readonly<{wavelength:number;intensity:number}>[]}>;
/** Variable stage: 'gate' (default) keeps classes 0/1/2 as the typed variable-merge reason. 'outside-view' (Front F, coordinator
 * decision for RS Boo) accepts exactly one class 0/1/2 variable whose nearest merge (0x59a2e0, reference 0) hits a catalogue
 * star strictly inside 30″ with a safe saved index, when the 99×99 star footprint at both the variable's and the hit star's
 * projected positions lies wholly outside the 312² view and no galaxy or QSO lies within the 2′ merge radius of either
 * position. Its light curve (0x51ec95 class dispatch) is not modelled: the hit record keeps its place in the list, is not
 * painted and is reported; nothing it could become is visible or reaches another merge. */
export type FieldVariableMode='gate'|'outside-view';
/** 'class-3' (default): the verified HI Peg dispatch only. 'recovered' (Front F, Object X): one variable whose time update the
 * dispatch 0x51ec48 returns false for without side effects (zero period, zero word unless class 1, or class 3:
 * variableMerge.ts nativeVariableDispatchFalse) takes the same false-merge branch. Existing exercises keep 'class-3'. */
export type FieldVariableDispatch='class-3'|'recovered';
/** A selected merged QSO record (type 3) is observed only when the caller supplies the decoded QSOSpect.dat (qsoSpectrum.ts)
 * and the spectrometer interval explicitly (the active range env+0x2bd4/0x2bd8; see objectXSpectrometer.ts). Without it a QSO
 * selection stays the typed qso-selected reason. */
export type FieldQsoObservation=Readonly<{file:QsoSpectrumFile;minimum:number;maximum:number}>;
/** 'start-time' (Front F, Boötes): a selected galaxy whose shifted template misses the 4000–5000 Å grid is prepared with the
 * recovered continuation (galaxyContinuum.ts, 0x55e97c), drawn from the exposure's own random state at each Go that follows no
 * integration (exposureJournal.ts JournalSourcePreparer). Availability uses the deterministic upper bound (every continuation
 * uniform → 1) against the existing mean bound. Without it such a galaxy stays spectrum-range. */
export type FieldContinuationMode='none'|'start-time';
/** A selected GSC star (type 0) is observed only when the caller resolves its spectral index (record offset 8) to a template
 * (starTemplates.ts: JSPEC2.SPI exact match, no fallback); a miss stays star-selected. */
export type FieldStarObservation=Readonly<{templateFor:(spectralIndex:number)=>Readonly<{file:string;spectrum:UniformSpectrum}>|null}>;
/** The spectrometer interval of the galaxy, continuation and star paths. Default 4000–5000 Å: the Hubble domain of every existing
 * galaxy acquisition (unchanged). The normal spectrometer's interval (3700–4700 Å) is passed explicitly by its callers. */
export type FieldSpectralInterval=Readonly<{minimum:number;maximum:number}>;
/** Photographic images (Front F, Object X): the kept GLIMAGES.LST rows (photographicList.ts, with the native names) and the
 * decoded bitmaps the caller verified, by file name. With this option a photograph in the area no longer gates the field by
 * itself: each admitted galaxy takes the first photograph of the area's sublist whose name contains the galaxy's native name
 * (0x5990a3, Pos), is renamed to it (0x59911b) and is drawn from the bitmap rescaled for the telescope (0x597290) instead of the
 * synthetic stamp (0x597470); an associated photograph without a bitmap keeps the typed photographic-image reason.
 * Without the option every photograph in the area stays that typed reason (unchanged). */
export type FieldPhotographs=Readonly<{rows:readonly PhotographRow[];bitmaps:ReadonlyMap<string,Bitmap8>}>;
export type FieldPhotographAssociation=Readonly<{recordIndex:number;galaxyName:string;photograph:number;name:string;file:string}>;
export type FieldOptions=Readonly<{variableDispatch?:FieldVariableDispatch;photographs?:FieldPhotographs;spectralInterval?:FieldSpectralInterval;starObservation?:FieldStarObservation;continuation?:FieldContinuationMode;qso?:FieldQsoMode;qsoCatalog?:FieldQsoCatalog;librarySpectrum?:FieldLibrarySpectrum;variables?:FieldVariableMode;qsoObservation?:FieldQsoObservation}>;
/** hitId: the nearest record (the merge winner); resolvedId: the record at the unrepaired saved index that the unmodelled update
 * would act on (a runner pruned below the winner shifts it onto another record); removedRunner: pruned as natively. */
export type FieldOutsideViewVariable=Readonly<{variable:number;name:string;classification:string;hitId:string;resolvedId:string;hitArcseconds:number;removedRunner:string|null}>;
export type FieldStar=NativeFieldStar|NativeQso;
export type FieldMergeWitness=Readonly<{galaxy:string;removed:readonly string[];savedWinnerIndex:number;runnerIndex:number;winnerId:string|null;galaxyDeleted?:true}>;
export type FieldPopulation=Readonly<{
 area:NativeCatalogRegion;regionIds:readonly number[];bandOrder:readonly string[];initialStarIds:readonly string[];
 variables:readonly NativeVariable[];variableRemoved:readonly string[];galaxies:readonly NativeGalaxy[];galaxyAdmissionIds:readonly number[];
 mergeWitnesses:readonly FieldMergeWitness[];stars:readonly FieldStar[];qsoMatches:readonly number[];photographMatches:readonly number[];
 /** Present in 'merge' mode only: records read by the ordered QSO scan and one witness per merged QSO. */
 qsoStage?:Readonly<{recordsRead:number;witnesses:readonly QsoMergeWitness[]}>;
 /** 'outside-view' only: the accepted variable and the star record it hit (not painted). */
 outsideViewVariable?:FieldOutsideViewVariable;
 /** 'photographs' option only: one entry per galaxy that took a photograph, in admission order. */
 photographAssociations?:readonly FieldPhotographAssociation[];
}>;
export type FieldCalibration=Readonly<{sourcePreparer?:JournalSourcePreparer;continuationDraws?:'start-time';sourceFile:string;zeroPoint:number;pixelLevel:number;fraction:number;amplitude:PhotonAmplitudes;instrumentMagnitude:number;sourceMeans:readonly number[];sourceValues:readonly number[];wavelengths:readonly number[]}>;
export type FieldResult=Readonly<{
 /** 'outside-view' only: galaxies outside the browser stamp bound that were not painted because they miss the crop. */
 outsideViewGalaxies?:readonly Readonly<{galaxy:string;margin:number}>[];
 pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope;reasons:readonly FieldUnavailableReason[];population:FieldPopulation|null;
 /** The selected QSO record when a QSO observation was prepared (qsoObservation option). */
 qsoTarget?:NativeQso;
 /** The selected GSC star when a star observation was attempted (starObservation option). */
 starTarget?:NativeFieldStar;
 scene:NativeSelectionScene|null;viewport:RgbImage|null;selection:ObjectSelection|null;target:NativeGalaxy|null;calibration:FieldCalibration|null;
}>;
const FRAME=Object.freeze({width:936,height:936,fieldDegrees:.75,anchor:468,viewport:312});
/** Fresh native area for a pointing (identical arithmetic to the pinned builders). */
export function freshFieldArea(pointing:Readonly<{ra:number;dec:number}>):NativeCatalogRegion{
 if(!pointing||!Number.isFinite(pointing.ra)||!Number.isFinite(pointing.dec)||pointing.ra<0||pointing.ra>=24||Math.abs(pointing.dec)>=89)throw new FieldEngineError('input');
 const h=.375,hr=h/(Math.cos(pointing.dec*Math.PI/180)*15);
 const area={minimumRa:pointing.ra-hr,maximumRa:pointing.ra+hr,minimumDec:pointing.dec-h,maximumDec:pointing.dec+h,limitingMagnitude:20};
 if(area.minimumRa<0||area.maximumRa>24)throw new FieldEngineError('input');// RA wrap branch not supported here
 return Object.freeze(area);
}
const inside=(p:Readonly<{ra:number;dec:number}>,a:NativeCatalogRegion)=>p.ra>=a.minimumRa&&p.ra<=a.maximumRa&&p.dec>=a.minimumDec&&p.dec<=a.maximumDec;
const hexBytes=(hex:string)=>Uint8Array.from(hex.match(/../g)!,x=>parseInt(x,16));
/** Stars of one area from the pack: band order, recorded seek/read trace and admission. A read the trace needs but the pack lacks
 * is an evidence error (the pack is incomplete for this pointing), never a skipped record. */
function packStars(pack:FieldPack,area:NativeCatalogRegion,order:readonly string[]):NativeFieldStar[]{
 const stars:NativeFieldStar[]=[],key=roundNearestEven(area.minimumRa*1e7);
 for(const name of order){
  const band=pack.bands.find(b=>b.name===name);if(!band)throw new FieldEngineError('evidence');
  const rows=new Map<number,NativeFieldStar>();
  const hex=(index:number)=>{const h=band.reads.get(index);if(!h)throw new FieldEngineError('evidence');return h;};
  const full=(index:number)=>{let r=rows.get(index);if(!r){r=decodeNativeCompactRecord(hex(index),name,index);rows.set(index,r);}return r;};
  let trace;
  try{trace=traceCompactGscBandRead({recordCount:band.recordCount,readPackedRa(index){return new DataView(hexBytes(hex(index).slice(0,8)).buffer).getInt32(0,true);}},key,area.maximumRa,10000);}
  catch(e){if(e instanceof FieldEngineError)throw e;throw new FieldEngineError('evidence');}
  for(const visit of trace.visits){
   const h=hex(visit.recordIndex);
   if(h.length===16){
    // Position-only witness: same x87-divided Double position as the decoder; it must be rejected by position alone.
    const v=new DataView(hexBytes(h).buffer),ra=v.getInt32(0,true)/10_000_000,dec=v.getInt32(4,true)/100_000;
    if(ra>=area.minimumRa&&ra<=area.maximumRa&&dec>=area.minimumDec&&dec<=area.maximumDec)throw new FieldEngineError('evidence');
    continue;
   }
   const r=full(visit.recordIndex);if(nativeCatalogAdmission(r,area))stars.push(r);
  }
 }
 return stars;
}
/** 0x492728, a sorted insert into a doubly linked list relative to its cursor (helpers 0x492708 empty, 0x492710/0x49271c
 * cursor at head/tail, 0x492634 next, 0x492668 prev, 0x492574 insert after cursor, 0x492528 prepend). Every insert leaves the
 * cursor on the new node; the list starts empty with no cursor (0x4924d4/0x4924fc). If the new key is greater than the cursor,
 * walk forward past every item not greater than it (so it goes AFTER equal keys); otherwise walk backward to the first item it
 * is greater than and insert after that one (so it goes BEFORE equal keys) — except that a backward walk reaching a head equal
 * to the new key inserts after the head, and one reaching a head greater than the new key prepends.
 * Static evidence: independent review 1 of Front A (analysis/reviews/front-a-review-1.md). Order therefore depends on the read
 * sequence, not on a fixed tie key. */
export function nativeCursorInsert<T>(items:readonly T[],greater:(a:T,b:T)=>boolean):readonly T[]{
 const list:T[]=[];let cursor=-1;
 for(const item of items){
  if(cursor<0){list.push(item);cursor=0;continue;}
  let at:number;
  if(greater(item,list[cursor])){at=cursor;while(at+1<list.length&&!greater(list[at+1],item))at++;at++;}
  else{
   let p=cursor;
   for(;;){
    if(p===0){at=greater(list[0],item)?0:1;break;}// head: equal → after the head; head greater → prepend
    p--;if(greater(item,list[p])){at=p+1;break;}
   }
  }
  list.splice(at,0,item);cursor=at;
 }
 return list;
}
const galaxyGreater=(a:NativeGalaxy,b:NativeGalaxy)=>a.ra>b.ra||a.ra===b.ra&&a.dec>b.dec;
/** Whole-file galaxy admission (source order), then the native cursor insert 0x492728 (comparator 0x5969e0). */
export function admitFieldGalaxies(glx:Uint8Array,area:NativeCatalogRegion):Readonly<{admission:readonly number[];galaxies:readonly NativeGalaxy[]}>{
 if(!(glx instanceof Uint8Array)||glx.byteLength!==GLX_CATALOG.bytes)throw new FieldEngineError('input');
 const view=new DataView(glx.buffer,glx.byteOffset,glx.byteLength),admission:number[]=[],read:NativeGalaxy[]=[];
 for(let i=0;i<GLX_CATALOG.records;i++){
  const at=i*59,ra=view.getFloat64(at,true),dec=view.getFloat64(at+8,true),magnitude=view.getFloat32(at+24,true);
  if(!Number.isFinite(ra)||!Number.isFinite(dec)||!Number.isFinite(magnitude)||ra<0||ra>24||Math.abs(dec)>90)continue;// outside any area: never admitted
  if(!nativeCatalogAdmission({ra,dec,magnitude},area))continue;
  const raw=glx.subarray(at,at+59),r=decodeGlxRecord(raw,i);
  const g:NativeGalaxy=Object.freeze({id:r.id,recordIndex:i,ra:r.ra,dec:r.dec,majorArcminutes:r.majorArcminutes,minorArcminutes:r.minorArcminutes,magnitude:r.magnitude,redshift:r.redshift,positionAngleDegrees:r.positionAngleDegrees,morphology:r.morphology,rawHex:Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('')});
  admission.push(i);read.push(g);
 }
 return Object.freeze({admission:Object.freeze(admission),galaxies:Object.freeze(nativeCursorInsert(read,galaxyGreater))});
}
/** The recovered class tables and dispatch contract, from the verified Pegasus provenance (HI Peg). */
const VARIABLE_TABLES=pegasusProvenance.variableContract.tables;
function axesSupported(g:NativeGalaxy):boolean{try{galaxyCatalogAxes(g);catalogGalaxyMagnitude(g);return true;}catch{return false;}}
/** Population stages 1–5. Gates are collected; stages that cannot run under a gate are skipped. */
/** In 'merge' mode the caller's catalogue must be the approved CLEA_QSO.DAT and agree with the pack's own QSO list inside its
 * coverage (the pack's whole-source witness); anything else is an evidence error. */
function checkedQsoCatalog(pack:FieldPack,options:FieldOptions):Uint8Array{
 const c=options.qsoCatalog;
 if(!c||!(c.bytes instanceof Uint8Array)||c.bytes.byteLength!==QSO_CATALOG.bytes||c.sha256!==QSO_CATALOG.sha256)throw new FieldEngineError('input');
 if(pack.qso.sha256!==null&&pack.qso.sha256!==c.sha256||pack.qso.recordsChecked!==QSO_CATALOG.records)throw new FieldEngineError('evidence');
 const v=new DataView(c.bytes.buffer,c.bytes.byteOffset,c.bytes.byteLength),inCoverage:number[]=[];
 for(let i=0;i<QSO_CATALOG.records;i++){const ra=v.getFloat64(i*52+0x12,true),dec=v.getFloat64(i*52+0x1a,true);if(inside({ra,dec},{...pack.coverage,limitingMagnitude:20}))inCoverage.push(i);}
 if(inCoverage.join()!==pack.qso.entries.map(e=>e.index).join()||pack.qso.entries.some(e=>e.ra!==v.getFloat64(e.index*52+0x12,true)||e.dec!==v.getFloat64(e.index*52+0x1a,true)))throw new FieldEngineError('evidence');
 return c.bytes;
}
/** 0x5980cc over the ordered galaxies. A galaxy deleted by a type-3 hit (QSO within 30″ and 1 mag) leaves the list cursor on its
 * predecessor (0x4925dc) and iteration continues. A precision boundary stops the stage with the typed merge-boundary reason; the
 * galaxy list is then returned unchanged (only a completed loop replaces it), as before the QSO merge existed. */
export function cleanFieldGalaxies(stars:readonly FieldStar[],galaxies:readonly NativeGalaxy[],mode:FieldQsoMode):Readonly<{stars:FieldStar[];galaxies:readonly NativeGalaxy[];witnesses:FieldMergeWitness[];boundary:boolean}>{
 let current=[...stars];const kept:NativeGalaxy[]=[],witnesses:FieldMergeWitness[]=[];
 for(const g of galaxies){
  try{
   const before=current,result=cleanNativeGalaxy(before.map(s=>({record:s,distanceDegrees:catalogMergeDistance(g,s)})),g.magnitude);
   if(!result.galaxyKept&&mode==='gate')throw new FieldEngineError('evidence');// GSC stars are type 0; a type-3 hit needs 'merge'
   const ids=new Set(result.rows.map(s=>s.id));current=before.filter(s=>ids.has(s.id));
   if(result.galaxyKept)kept.push(g);
   witnesses.push(Object.freeze({galaxy:g.id,removed:Object.freeze(before.filter(s=>!ids.has(s.id)).map(s=>s.id)),savedWinnerIndex:result.trace.savedWinnerIndex,runnerIndex:result.trace.runnerIndex,winnerId:result.trace.winner?.id??null,...(result.galaxyKept?{}:{galaxyDeleted:true as const})}));
  }catch(e){if(e instanceof CatalogMergeError)return {stars:current,galaxies,witnesses,boundary:true};throw e;}
 }
 return {stars:current,galaxies:kept.length===galaxies.length?galaxies:Object.freeze(kept),witnesses,boundary:false};
}
export function buildFieldPopulation(pack:FieldPack,glx:Uint8Array,pointing:Readonly<{ra:number;dec:number}>,options:FieldOptions={}):Readonly<{population:FieldPopulation|null;reasons:FieldUnavailableReason[]}>{
 const mode=options.qso??'gate';if(mode!=='gate'&&mode!=='merge')throw new FieldEngineError('input');
 const area=freshFieldArea(pointing),reasons:FieldUnavailableReason[]=[];
 if(!packCovers(pack,pointing,area))return {population:null,reasons:['outside-pack']};
 const qsoCatalog=mode==='merge'?checkedQsoCatalog(pack,options):null;
 const regionIds=nativeRegionIds(area),bandOrder=nativeCompactBandOrder(regionIds);
 let stars:FieldStar[]=packStars(pack,area,bandOrder);const initialStarIds=Object.freeze(stars.map(s=>s.id));
 const qsoMatches=pack.qso.entries.filter(p=>inside(p,area)).map(p=>p.index),photographMatches=pack.photographs.entries.find(e=>pack.pointings[e.pointing].ra===pointing.ra&&pack.pointings[e.pointing].dec===pointing.dec)?.indices??[];
 if(qsoMatches.length&&mode==='gate')reasons.push('qso-merge');
 if(photographMatches.length&&!options.photographs)reasons.push('photographic-image');
 let variables:NativeVariable[];
 try{variables=pack.variables.entries.map(v=>decodeNativeVariableRecord(v.rawHex,v.recordIndex)).filter(v=>inside(v,area));}catch{throw new FieldEngineError('evidence');}
 let variableRemoved:string[]=[];
 let outsideViewVariable:FieldOutsideViewVariable|undefined;
 const dispatch=options.variableDispatch??'class-3',falseDispatch=(v:NativeVariable)=>dispatch==='recovered'?nativeVariableDispatchFalse(v,VARIABLE_TABLES):nativeVariableClass(v.classification,VARIABLE_TABLES)===3;
 if(variables.length===1&&options.variables==='outside-view'&&!falseDispatch(variables[0])){
  const v=variables[0];
  try{
   const trace=nativeMergeNearest(stars.map(s=>({record:{id:s.id,type:s.type,magnitude:s.magnitude},distanceDegrees:catalogMergeDistance(v,s)})),0),arcseconds=trace.bestDistanceDegrees*3600;
   const target=trace.resolvedSavedIndex;
   if(arcseconds>=30||!target||!trace.winner)reasons.push('variable-merge');
   else{const kept=new Set(trace.rows.map(r=>r.id));variableRemoved=stars.filter(s=>!kept.has(s.id)).map(s=>s.id);stars=stars.filter(s=>kept.has(s.id));
    outsideViewVariable=Object.freeze({variable:v.recordIndex,name:v.name,classification:v.classification,hitId:trace.winner!.id,resolvedId:target.id,hitArcseconds:arcseconds,removedRunner:trace.removedRunner?.id??null});}
  }catch(e){if(e instanceof CatalogMergeError)reasons.push('variable-merge');else throw e;}
 }
 else if(variables.length>1||variables.some(v=>!falseDispatch(v)))reasons.push('variable-merge');
 else if(variables.length===1){
  try{
   const merged=nativeVariableFalseMerge((stars as NativeFieldStar[]).map(s=>({record:s,distanceDegrees:catalogMergeDistance(variables[0],s)})),variables[0],VARIABLE_TABLES,dispatch);
   const kept=new Set(merged.rows.map(r=>r.id));variableRemoved=stars.filter(s=>!kept.has(s.id)).map(s=>s.id);stars=stars.filter(s=>kept.has(s.id));
  }catch(e){if(e instanceof VariableMergeError||e instanceof CatalogMergeError)reasons.push('variable-merge');else throw e;}
 }
 let qsoStage:FieldPopulation['qsoStage'];
 if(qsoCatalog&&!reasons.includes('variable-merge')){
  const load=loadNativeQsoList(qsoCatalog,area);
  if(load.qsos.map(q=>q.recordIndex).join()!==qsoMatches.join())throw new FieldEngineError('evidence');// the scan and the pack agree
  if(load.qsos.length){
   try{const merged=nativeQsoMerge(stars,load.qsos);stars=[...merged.rows];qsoStage=Object.freeze({recordsRead:load.recordsRead,witnesses:merged.witnesses});}
   catch(e){if(e instanceof QsoMergeError){reasons.push('merge-boundary');}else throw e;}
  }else qsoStage=Object.freeze({recordsRead:load.recordsRead,witnesses:Object.freeze([])});
 }
 const {admission,galaxies:admitted}=admitFieldGalaxies(glx,area);let galaxies=admitted;
 let photographAssociations:FieldPhotographAssociation[]|undefined;
 if(options.photographs){
  // 0x598ed2..0x599128: at load, before the cursor insert; the population order does not change.
  const byIndex=new Map(options.photographs.rows.map(r=>[r.index,r])),sublist=photographMatches.map(i=>byIndex.get(i));
  if(sublist.some(r=>!r))throw new FieldEngineError('evidence');// the pack's matches must be kept rows
  photographAssociations=[];
  galaxies=Object.freeze(galaxies.map(g=>{
   const galaxyName=nativeGalaxyName(hexBytes(g.rawHex)),photo=associatePhotograph(galaxyName,sublist as PhotographRow[]);
   if(!photo)return g;
   photographAssociations!.push(Object.freeze({recordIndex:g.recordIndex,galaxyName,photograph:photo.index,name:photo.name,file:photo.file}));
   if(!options.photographs!.bitmaps.has(photo.file)&&!reasons.includes('photographic-image'))reasons.push('photographic-image');
   return photo.name===g.id?g:Object.freeze({...g,id:photo.name});
  }));
 }
 if(galaxies.some(g=>!axesSupported(g)))reasons.push('axis-fallback');
 const mergeWitnesses:FieldMergeWitness[]=[];
 if(!reasons.includes('variable-merge')&&!reasons.includes('merge-boundary')){
  const cleaned=cleanFieldGalaxies(stars,galaxies,mode);stars=cleaned.stars;galaxies=cleaned.galaxies;mergeWitnesses.push(...cleaned.witnesses);
  if(cleaned.boundary)reasons.push('merge-boundary');
 }
 return {reasons,population:Object.freeze({area,regionIds,bandOrder,initialStarIds,variables:Object.freeze(variables),variableRemoved:Object.freeze(variableRemoved),galaxies,galaxyAdmissionIds:admission,mergeWitnesses:Object.freeze(mergeWitnesses),stars:Object.freeze(stars),qsoMatches:Object.freeze(qsoMatches),photographMatches:Object.freeze(photographMatches),...(qsoStage?{qsoStage}:{}),...(outsideViewVariable?{outsideViewVariable}:{}),...(photographAssociations?{photographAssociations:Object.freeze(photographAssociations)}:{})})};
}
type Calibration=(typeof FIELD_CALIBRATIONS)[number];
/** Same paint order and levels as galaxyExposure.ts: galaxies first (rounded projected centres), then stars by stored level. */
/** The 'outside-view' conditions that need the projected scene: both footprints outside the 312² crop (every pixel of the 99×99
 * stamp around the rounded centre lies outside rows/columns 312..623), and no galaxy or QSO within the 2′ merge radius. */
export const OUTSIDE_VIEW=Object.freeze({stampHalf:49,crop:Object.freeze({first:FRAME.anchor-FRAME.viewport/2,last:FRAME.anchor+FRAME.viewport/2-1}),mergeRadiusDegrees:0.03333333333333333});
export function outsideViewMargin(p:Readonly<{x:number;y:number}>):number{
 const x=roundNearestEven(p.x),y=roundNearestEven(p.y),{first,last}=OUTSIDE_VIEW.crop,h=OUTSIDE_VIEW.stampHalf;
 return Math.max(first-(x+h),x-h-last,first-(y+h),y-h-last);// > 0: the whole stamp misses the crop by that many pixels
}
function outsideViewHolds(population:FieldPopulation,scene:NativeSelectionScene):boolean{
 const o=population.outsideViewVariable!,v=population.variables.find(x=>x.recordIndex===o.variable)!,project=(p:Readonly<{ra:number;dec:number}>)=>createNativeSelectionScene([{id:'position',ra:p.ra,dec:p.dec}],[],scene.frame).stars[0];
 const affected:Readonly<{ra:number;dec:number}>[]=[v];
 for(const id of [o.hitId,o.resolvedId]){const i=population.stars.findIndex(s=>s.id===id);if(i<0)return false;affected.push(population.stars[i]);}
 if(o.removedRunner){const r=population.initialStarIds.indexOf(o.removedRunner);if(r<0)return false;}
 if(affected.some(p=>outsideViewMargin(project(p))<=0))return false;
 for(const p of affected){
  if(population.galaxies.some(g=>catalogMergeDistance(g,p)<OUTSIDE_VIEW.mergeRadiusDegrees))return false;
  if(population.stars.some(s=>s.type===3&&catalogMergeDistance(s,p)<OUTSIDE_VIEW.mergeRadiusDegrees))return false;
 }
 return true;
}
function paintField(population:FieldPopulation,scene:NativeSelectionScene,c:Calibration,unpainted:ReadonlySet<number>=new Set(),photographs?:Readonly<{telescope:FieldTelescope;options:FieldPhotographs}>):RgbImage{
 let raster:RgbImage={width:FRAME.width,height:FRAME.height,rgb:new Uint8Array(FRAME.width*FRAME.height*3)};
 const taken=new Map((population.photographAssociations??[]).map(a=>[a.recordIndex,a]));
 for(let i=0;i<population.galaxies.length;i++){if(unpainted.has(i))continue;const p=scene.galaxies[i],a=taken.get(population.galaxies[i].recordIndex);
  if(a&&photographs){
   // 0x53b5d5..0x53b61c → 0x597470: the rescaled bitmap, its listed centre on the rounded projected position (overwrite).
   const row=photographs.options.rows.find(r=>r.index===a.photograph)!,bmp=photographs.options.bitmaps.get(a.file);if(!bmp)throw new FieldEngineError('evidence');
   if(bmp.width!==row.width||bmp.height!==row.height)throw new FieldEngineError('evidence');
   raster=drawNativePhotograph(raster,scaleNativePhotograph(bmp,photographs.telescope),p,{x:row.centreX,y:row.centreY});continue;
  }
  raster=paintAdaptedGalaxy(raster,population.galaxies[i],{x:roundNearestEven(p.x),y:roundNearestEven(p.y)},c.magnitudeShift).image;}
 const profiles=new Map<number,Uint8Array>();
 for(let i=0;i<population.stars.length;i++){
  const record=population.stars[i],p=scene.stars[i];
  if(record.id===population.outsideViewVariable?.hitId||record.id===population.outsideViewVariable?.resolvedId)continue;// unmodelled variable update, wholly outside the view (outsideViewHolds)
  const stored=nativeStoredStellarLevel(record.magnitude,1,'round');
  const level=nativeStellarPaintLevel(record.type,stored,c.magnitudeShift);if(level===null)throw new FieldEngineError('evidence');
  if(!profiles.has(level))profiles.set(level,prepareNativeStarProfile(level));
  raster=paintNativeStar(raster,profiles.get(level)!,{x:roundNearestEven(p.x),y:roundNearestEven(p.y)});
 }
 return raster;
}
/** Complete fresh-field evaluation for one pointing and telescope record. */
export function evaluateField(pack:FieldPack,glx:Uint8Array,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope,options:FieldOptions={}):FieldResult{
 if(telescope!==0&&telescope!==1&&telescope!==2)throw new FieldEngineError('input');
 const c=FIELD_CALIBRATIONS[telescope],at=Object.freeze({ra:pointing.ra,dec:pointing.dec});
 const empty={pointing:at,telescope,scene:null,viewport:null,selection:null,target:null,calibration:null};
 const {population,reasons}=buildFieldPopulation(pack,glx,at,options);
 if(!population||reasons.length)return Object.freeze({...empty,population,reasons:Object.freeze(reasons)});
 const scene=createNativeSelectionScene(population.stars,population.galaxies,{width:FRAME.width,height:FRAME.height,fieldDegrees:FRAME.fieldDegrees,center:at,population:{coverage:'complete',provenance:`Field pack ${pack.id}; native CRT1 and field table verified`}});
 // The bounded browser stamp (galaxyScene.ts: 3 ≤ major ≤ 100 px, 1 ≤ minor ≤ major) is the only gate here; any other error throws.
 // 'outside-view' only: a galaxy outside the browser stamp bound whose largest footprint (rounded centre ± (rounded radius + 1),
 // radius ≤ 100 px) misses the 312² crop is recorded and not painted; anything else stays the typed stamp-bound reason.
 const unpainted=new Set<number>(),outsideViewGalaxies:{galaxy:string;margin:number}[]=[];
 const photographed=new Set((population.photographAssociations??[]).map(a=>a.recordIndex));
 for(const [i,g] of population.galaxies.entries()){if(photographed.has(g.recordIndex))continue;// drawn from its photograph, not the stamp
  try{galaxyStampGeometry(g,c.magnitudeShift);}catch(e){
  if(!(e instanceof Error&&e.message==='Outside bounded galaxy stamp.'))throw e;
  const radius=roundNearestEven(Math.max(3,galaxyCatalogAxes(g).major*(FRAME.width/FRAME.fieldDegrees/60)/2)),margin=outsideViewMargin(scene.galaxies[i])+OUTSIDE_VIEW.stampHalf-(radius+1);
  if(options.variables!=='outside-view'||radius>100||margin<=0)return Object.freeze({...empty,population,scene,reasons:Object.freeze(['stamp-bound' as const])});
  unpainted.add(i);outsideViewGalaxies.push({galaxy:g.id,margin});
 }}
 if(population.outsideViewVariable&&!outsideViewHolds(population,scene))return Object.freeze({...empty,population,scene,reasons:Object.freeze(['variable-merge' as const])});
 const raster=paintField(population,scene,c,unpainted,options.photographs?{telescope,options:options.photographs}:undefined);
 const viewport=cropNativeFrame(raster,freshNativeViewport(FRAME.viewport,FRAME.viewport,{x:FRAME.anchor,y:FRAME.anchor})),pixelLevel=slitPixelLevel(viewport);
 let selection=selectCatalogObject(scene,FRAME.anchor,FRAME.anchor);
 if(selection.kind==='throughput-required'){
  // 0x59a0fc: the galaxy is chosen iff the star's throughput is zero (strict raw-coordinate cuts at this pointing and level).
  const star=population.stars[selection.star.index];
  selection=selectCatalogObject(scene,FRAME.anchor,FRAME.anchor,nativeObjectSlitFraction({objectPresent:true,objectType:star.type,pixelLevel,object:{raHours:star.ra,decDegrees:star.dec},pointing:{raHours:at.ra,decDegrees:at.dec}}));
 }
 const base={...empty,population,scene,viewport,selection,...(outsideViewGalaxies.length?{outsideViewGalaxies:Object.freeze(outsideViewGalaxies.map(x=>Object.freeze(x)))}:{})};
 if(selection.kind==='star'&&population.stars[selection.star.index].type===3&&options.qsoObservation){
  // 0x50e7b0/0x55e330/0x55e52c: QSOSpect.dat at the QSO's own Single z; point-source throughput as the star path (type 3).
  const q=population.stars[selection.star.index] as NativeQso;
  const fraction=nativeObjectSlitFraction({objectPresent:true,objectType:3,pixelLevel,object:{raHours:q.ra,decDegrees:q.dec},pointing:{raHours:at.ra,decDegrees:at.dec}});
  if(fraction<=0)return Object.freeze({...base,qsoTarget:q,reasons:Object.freeze(['slit-empty' as const])});
  const zeroPoint=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection);if(zeroPoint!==c.zeroPoint)throw new FieldEngineError('evidence');
  const amplitude=photonAmplitudes(q.magnitude,c.skyMagnitude,zeroPoint,fraction);
  let profile;try{profile=prepareQsoProfile(options.qsoObservation.file,q.redshift,options.qsoObservation.minimum,options.qsoObservation.maximum);}
  catch(e){if(e instanceof QsoSpectrumError)return Object.freeze({...base,qsoTarget:q,reasons:Object.freeze(['spectrum-range' as const])});throw e;}
  const sourceMeans=Object.freeze(profile.values.map(v=>v*amplitude.source));
  const calibration=Object.freeze({sourceFile:'QSOSpect.dat',zeroPoint,pixelLevel,fraction,amplitude,instrumentMagnitude:q.magnitude,sourceMeans,sourceValues:profile.values,wavelengths:profile.wavelengths});
  if(Math.max(...sourceMeans)*FIELD_MULTIPLIER*1000>=c.meanBound)return Object.freeze({...base,qsoTarget:q,calibration,reasons:Object.freeze(['mean-bound' as const])});
  return Object.freeze({...base,qsoTarget:q,calibration,reasons:Object.freeze([])});
 }
 if(selection.kind==='star'&&population.stars[selection.star.index].type===0&&options.starObservation){
  // Star path (starExposure.ts generalized): template by spectral index, point-source throughput with the star's own position.
  const st=population.stars[selection.star.index] as NativeFieldStar,raw=Uint8Array.from(st.rawHex.match(/../g)!,x=>parseInt(x,16)),spectralIndex=new DataView(raw.buffer).getInt32(8,true);
  const template=options.starObservation.templateFor(spectralIndex);
  if(!template)return Object.freeze({...base,starTarget:st,reasons:Object.freeze(['star-selected' as const])});
  const fraction=nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel,object:{raHours:st.ra,decDegrees:st.dec},pointing:{raHours:at.ra,decDegrees:at.dec}});
  if(fraction<=0)return Object.freeze({...base,starTarget:st,reasons:Object.freeze(['slit-empty' as const])});
  const zeroPoint=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection);if(zeroPoint!==c.zeroPoint)throw new FieldEngineError('evidence');
  const amplitude=photonAmplitudes(st.magnitude,c.skyMagnitude,zeroPoint,fraction),{minimum,maximum}=options.spectralInterval??{minimum:4000,maximum:5000};
  const grid=galaxyChannelGrid(minimum,maximum),values:number[]=[];
  for(const w of grid.wavelengths){const v=sampleUniformSpectrum(template.spectrum,w);if(!v.valid||!(v.value>=0))return Object.freeze({...base,starTarget:st,reasons:Object.freeze(['spectrum-range' as const])});values.push(v.value);}
  const sourceMeans=Object.freeze(values.map(v=>v*amplitude.source));
  const calibration=Object.freeze({sourceFile:template.file,zeroPoint,pixelLevel,fraction,amplitude,instrumentMagnitude:st.magnitude,sourceMeans,sourceValues:Object.freeze(values),wavelengths:grid.wavelengths});
  if(Math.max(...sourceMeans)*FIELD_MULTIPLIER*1000>=c.meanBound)return Object.freeze({...base,starTarget:st,calibration,reasons:Object.freeze(['mean-bound' as const])});
  return Object.freeze({...base,starTarget:st,calibration,reasons:Object.freeze([])});
 }
 if(selection.kind!=='galaxy')return Object.freeze({...base,reasons:Object.freeze([selection.kind==='star'?population.stars[selection.star.index].type===3?'qso-selected' as const:'star-selected' as const:'no-galaxy-selected' as const])});
 const target=population.galaxies[selection.galaxy.index];
 const fraction=nativeObjectSlitFraction({objectPresent:true,objectType:1,pixelLevel});
 if(fraction<=0)return Object.freeze({...base,target,reasons:Object.freeze(['slit-empty' as const])});
 const instrumentMagnitude=catalogGalaxyMagnitude(target).magnitude,zeroPoint=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection);
 if(zeroPoint!==c.zeroPoint)throw new FieldEngineError('evidence');
 const amplitude=photonAmplitudes(instrumentMagnitude,c.skyMagnitude,zeroPoint,fraction);
 let profile;
 const own=options.librarySpectrum?.targetId===target.id?options.librarySpectrum:null,{minimum:lo,maximum:hi}=options.spectralInterval??{minimum:4000,maximum:5000};
 try{profile=own?prepareGalaxyProfile(own.samples,true,target.redshift,lo,hi):prepareGalaxyProfile(galaxySource.samples.map(([wavelength,intensity])=>({wavelength,intensity})),galaxySource.matched,target.redshift,lo,hi);}
 catch{
  if(options.continuation!=='start-time')return Object.freeze({...base,target,reasons:Object.freeze(['spectrum-range' as const])});
  const samples=own?own.samples:galaxySource.samples.map(([wavelength,intensity])=>({wavelength,intensity})),matched=own?true:galaxySource.matched;
  let bound:number[],wavelengths:readonly number[];
  try{
   const {source}=galaxyLibrarySpectrum(samples,matched,target.redshift),ext=prepareCatalogGalaxyExtension(source,target.morphology,target.redshift,lo,hi);
   const grid=prepareCatalogGalaxyChannels(samples,matched,target.morphology,target.redshift,lo,hi,1);wavelengths=grid.wavelengths;
   // Upper bound of 0x55e97c: blue (U·0.16+0.92)·C·corr ≤ 1.08·C·corr, red (U·0.08+0.96)·C·corr ≤ 1.04·C·corr; in-template exact.
   bound=grid.wavelengths.map(w=>{if(w>=ext.source.minimum&&w<=ext.source.maximum)return sampleUniformSpectrum(ext.source,w).value;const blue=w<ext.source.minimum,c=sampleUniformSpectrum(ext.continuum,w).value;return (blue?1.08:1.04)*c*(blue?ext.blueCorrection:ext.redCorrection);});
  }catch{return Object.freeze({...base,target,reasons:Object.freeze(['spectrum-range' as const])});}
  const boundMeans=Object.freeze(bound.map(v=>v*amplitude.source));
  const sourcePreparer:JournalSourcePreparer=seed=>{const p=prepareCatalogGalaxyChannels(samples,matched,target.morphology,target.redshift,lo,hi,seed);return Object.freeze({means:Object.freeze(p.values.map(v=>v*amplitude.source)),seed:p.seed,draws:p.draws});};
  const calibration=Object.freeze({sourcePreparer,continuationDraws:'start-time' as const,sourceFile:own?own.file:galaxySource.file,zeroPoint,pixelLevel,fraction,amplitude,instrumentMagnitude,sourceMeans:boundMeans,sourceValues:Object.freeze(bound),wavelengths});
  if(Math.max(...boundMeans)*FIELD_MULTIPLIER*1000>=c.meanBound)return Object.freeze({...base,target,calibration,reasons:Object.freeze(['mean-bound' as const])});
  return Object.freeze({...base,target,calibration,reasons:Object.freeze([])});
 }
 const sourceMeans=Object.freeze(profile.values.map(v=>v*amplitude.source));
 const calibration=Object.freeze({sourceFile:own?own.file:galaxySource.file,zeroPoint,pixelLevel,fraction,amplitude,instrumentMagnitude,sourceMeans,sourceValues:profile.values,wavelengths:profile.wavelengths});
 if(Math.max(...sourceMeans)*FIELD_MULTIPLIER*1000>=c.meanBound)return Object.freeze({...base,target,calibration,reasons:Object.freeze(['mean-bound' as const])});
 return Object.freeze({...base,target,calibration,reasons:Object.freeze([])});
}
/** Journal factory for an available field result (same journal as the galaxy exposure; policy chosen by the caller). */
export function createFieldExposure(result:FieldResult,policy:string,seed:number):JournalState{
 if(!result||result.reasons.length||!result.calibration)throw new FieldEngineError('input');
 return createJournalExposure(policy,result.calibration.sourceMeans,result.calibration.amplitude.sky,FIELD_MULTIPLIER,seed,result.calibration.sourcePreparer);
}
