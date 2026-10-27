/** General fresh-field engine (audit item 2.1). Pure: pointing + telescope record + evidence pack (fieldPack.ts) + the whole
 * bundled CLEA_GLX.DAT bytes → ordered native population → scene → 936² raster → 312² crop → slit selection → calibration →
 * journal factory. It composes the same recovered stages as the per-field builders (pinnedGalaxyField.ts, pinnedPegasusField.ts)
 * and galaxyExposure.ts, without changing them:
 *  1. area: pointing ± 0.375° Dec, ± 0.375/(15·cos Dec) h RA, limiting magnitude 20 (fresh 15′ field ×3);
 *  2. regions 0x5977e0/0x5978c0, band order 0x59ae16, per-band seek/read 0x59af80 and admission 0x599e08 from the pack reads;
 *  3. QSO (0x597f90) and photographic-list association: any position inside the area is a typed unavailable gate (not ported);
 *  4. variables: none, or exactly one class-3 record through the recovered false-merge branch (variableMerge.ts); otherwise gated;
 *  5. galaxies: whole-file CLEA_GLX.DAT admission in source order, then the 0x492728 sorted insert with the strict RA/Dec-greater
 *     comparator 0x5969e0, which inserts BEFORE equal keys (generator multi-galaxy-recovery/*\/generate.py: key (RA, Dec,
 *     −recordIndex)); each galaxy then cleans the star list (0x5980cc) in that order;
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
import {catalogMergeDistance,cleanNativeGalaxy,CatalogMergeError} from './catalogMerge';
import {decodeNativeVariableRecord,nativeVariableClass,nativeVariableFalseMerge,VariableMergeError,type NativeVariable} from './variableMerge';
import {decodeGlxRecord,GLX_CATALOG} from './glxCatalog';
import type {NativeGalaxy} from './pinnedGalaxyField';
import {galaxyCatalogAxes,catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import {paintAdaptedGalaxy} from './galaxyScene';
import {createNativeSelectionScene,selectCatalogObject,type NativeSelectionScene,type ObjectSelection} from './objectSelection';
import {cropNativeFrame,freshNativeViewport,paintNativeStar} from './detectorRaster';
import {prepareNativeStarProfile} from './starProfiles';
import {photonAmplitudes,slitPixelLevel,telescopeZeroPoint,type PhotonAmplitudes,type RgbImage} from './photons';
import {nativeObjectSlitFraction} from './slitThroughput';
import {prepareGalaxyProfile} from './galaxySpectrum';
import {roundNearestEven} from './numericPolicy';
import {createJournalExposure,type JournalState} from './exposureJournal';
import {packCovers,type FieldPack} from './fieldPack';

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
 |'no-galaxy-selected'|'star-selected'|'slit-empty'|'spectrum-range'|'mean-bound';
export type FieldMergeWitness=Readonly<{galaxy:string;removed:readonly string[];savedWinnerIndex:number;runnerIndex:number;winnerId:string|null}>;
export type FieldPopulation=Readonly<{
 area:NativeCatalogRegion;regionIds:readonly number[];bandOrder:readonly string[];initialStarIds:readonly string[];
 variables:readonly NativeVariable[];variableRemoved:readonly string[];galaxies:readonly NativeGalaxy[];galaxyAdmissionIds:readonly number[];
 mergeWitnesses:readonly FieldMergeWitness[];stars:readonly NativeFieldStar[];qsoMatches:readonly number[];photographMatches:readonly number[];
}>;
export type FieldCalibration=Readonly<{zeroPoint:number;pixelLevel:number;fraction:number;amplitude:PhotonAmplitudes;instrumentMagnitude:number;sourceMeans:readonly number[];sourceValues:readonly number[];wavelengths:readonly number[]}>;
export type FieldResult=Readonly<{
 pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope;reasons:readonly FieldUnavailableReason[];population:FieldPopulation|null;
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
/** Whole-file galaxy admission (source order) and the native sorted insert (strict greater comparator, before equal keys). */
export function admitFieldGalaxies(glx:Uint8Array,area:NativeCatalogRegion):Readonly<{admission:readonly number[];galaxies:readonly NativeGalaxy[]}>{
 if(!(glx instanceof Uint8Array)||glx.byteLength!==GLX_CATALOG.bytes)throw new FieldEngineError('input');
 const view=new DataView(glx.buffer,glx.byteOffset,glx.byteLength),admission:number[]=[],sorted:NativeGalaxy[]=[];
 for(let i=0;i<GLX_CATALOG.records;i++){
  const at=i*59,ra=view.getFloat64(at,true),dec=view.getFloat64(at+8,true),magnitude=view.getFloat32(at+24,true);
  if(!Number.isFinite(ra)||!Number.isFinite(dec)||!Number.isFinite(magnitude)||ra<0||ra>24||Math.abs(dec)>90)continue;// outside any area: never admitted
  if(!nativeCatalogAdmission({ra,dec,magnitude},area))continue;
  const raw=glx.subarray(at,at+59),r=decodeGlxRecord(raw,i);
  const g:NativeGalaxy=Object.freeze({id:r.id,recordIndex:i,ra:r.ra,dec:r.dec,majorArcminutes:r.majorArcminutes,minorArcminutes:r.minorArcminutes,magnitude:r.magnitude,redshift:r.redshift,positionAngleDegrees:r.positionAngleDegrees,morphology:r.morphology,rawHex:Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('')});
  admission.push(i);
  let j=0;while(j<sorted.length&&(g.ra>sorted[j].ra||g.ra===sorted[j].ra&&g.dec>sorted[j].dec))j++;
  sorted.splice(j,0,g);
 }
 return Object.freeze({admission:Object.freeze(admission),galaxies:Object.freeze(sorted)});
}
/** The recovered class tables and dispatch contract, from the verified Pegasus provenance (HI Peg). */
const VARIABLE_TABLES=pegasusProvenance.variableContract.tables;
function axesSupported(g:NativeGalaxy):boolean{try{galaxyCatalogAxes(g);catalogGalaxyMagnitude(g);return true;}catch{return false;}}
/** Population stages 1–5. Gates are collected; stages that cannot run under a gate are skipped. */
export function buildFieldPopulation(pack:FieldPack,glx:Uint8Array,pointing:Readonly<{ra:number;dec:number}>):Readonly<{population:FieldPopulation|null;reasons:FieldUnavailableReason[]}>{
 const area=freshFieldArea(pointing),reasons:FieldUnavailableReason[]=[];
 if(!packCovers(pack,pointing,area))return {population:null,reasons:['outside-pack']};
 const regionIds=nativeRegionIds(area),bandOrder=nativeCompactBandOrder(regionIds);
 let stars=packStars(pack,area,bandOrder);const initialStarIds=Object.freeze(stars.map(s=>s.id));
 const qsoMatches=pack.qso.entries.filter(p=>inside(p,area)).map(p=>p.index),photographMatches=pack.photographs.entries.find(e=>pack.pointings[e.pointing].ra===pointing.ra&&pack.pointings[e.pointing].dec===pointing.dec)?.indices??[];
 if(qsoMatches.length)reasons.push('qso-merge');
 if(photographMatches.length)reasons.push('photographic-image');
 let variables:NativeVariable[];
 try{variables=pack.variables.entries.map(v=>decodeNativeVariableRecord(v.rawHex,v.recordIndex)).filter(v=>inside(v,area));}catch{throw new FieldEngineError('evidence');}
 let variableRemoved:string[]=[];
 if(variables.length>1||variables.some(v=>nativeVariableClass(v.classification,VARIABLE_TABLES)!==3))reasons.push('variable-merge');
 else if(variables.length===1){
  try{
   const merged=nativeVariableFalseMerge(stars.map(s=>({record:s,distanceDegrees:catalogMergeDistance(variables[0],s)})),variables[0],VARIABLE_TABLES);
   const kept=new Set(merged.rows.map(r=>r.id));variableRemoved=stars.filter(s=>!kept.has(s.id)).map(s=>s.id);stars=stars.filter(s=>kept.has(s.id));
  }catch(e){if(e instanceof VariableMergeError||e instanceof CatalogMergeError)reasons.push('variable-merge');else throw e;}
 }
 const {admission,galaxies}=admitFieldGalaxies(glx,area);
 if(galaxies.some(g=>!axesSupported(g)))reasons.push('axis-fallback');
 const mergeWitnesses:FieldMergeWitness[]=[];
 if(!reasons.includes('variable-merge'))for(const g of galaxies){
  try{
   const before=stars,result=cleanNativeGalaxy(before.map(s=>({record:s,distanceDegrees:catalogMergeDistance(g,s)})),g.magnitude);
   if(!result.galaxyKept)throw new FieldEngineError('evidence');// GSC stars are type 0; a type-3 hit is outside this domain
   const ids=new Set(result.rows.map(s=>s.id));stars=before.filter(s=>ids.has(s.id));
   mergeWitnesses.push(Object.freeze({galaxy:g.id,removed:Object.freeze(before.filter(s=>!ids.has(s.id)).map(s=>s.id)),savedWinnerIndex:result.trace.savedWinnerIndex,runnerIndex:result.trace.runnerIndex,winnerId:result.trace.winner?.id??null}));
  }catch(e){if(e instanceof CatalogMergeError){reasons.push('merge-boundary');break;}throw e;}
 }
 return {reasons,population:Object.freeze({area,regionIds,bandOrder,initialStarIds,variables:Object.freeze(variables),variableRemoved:Object.freeze(variableRemoved),galaxies,galaxyAdmissionIds:admission,mergeWitnesses:Object.freeze(mergeWitnesses),stars:Object.freeze(stars),qsoMatches:Object.freeze(qsoMatches),photographMatches:Object.freeze(photographMatches)})};
}
type Calibration=(typeof FIELD_CALIBRATIONS)[number];
/** Same paint order and levels as galaxyExposure.ts: galaxies first (rounded projected centres), then stars by stored level. */
function paintField(population:FieldPopulation,scene:NativeSelectionScene,c:Calibration):RgbImage{
 let raster:RgbImage={width:FRAME.width,height:FRAME.height,rgb:new Uint8Array(FRAME.width*FRAME.height*3)};
 for(let i=0;i<population.galaxies.length;i++){const p=scene.galaxies[i];raster=paintAdaptedGalaxy(raster,population.galaxies[i],{x:roundNearestEven(p.x),y:roundNearestEven(p.y)},c.magnitudeShift).image;}
 const profiles=new Map<number,Uint8Array>();
 for(let i=0;i<population.stars.length;i++){
  const record=population.stars[i],p=scene.stars[i],stored=nativeStoredStellarLevel(record.magnitude,1,'round');
  const level=nativeStellarPaintLevel(record.type,stored,c.magnitudeShift);if(level===null)throw new FieldEngineError('evidence');
  if(!profiles.has(level))profiles.set(level,prepareNativeStarProfile(level));
  raster=paintNativeStar(raster,profiles.get(level)!,{x:roundNearestEven(p.x),y:roundNearestEven(p.y)});
 }
 return raster;
}
/** Complete fresh-field evaluation for one pointing and telescope record. */
export function evaluateField(pack:FieldPack,glx:Uint8Array,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):FieldResult{
 if(telescope!==0&&telescope!==1&&telescope!==2)throw new FieldEngineError('input');
 const c=FIELD_CALIBRATIONS[telescope],at=Object.freeze({ra:pointing.ra,dec:pointing.dec});
 const empty={pointing:at,telescope,scene:null,viewport:null,selection:null,target:null,calibration:null};
 const {population,reasons}=buildFieldPopulation(pack,glx,at);
 if(!population||reasons.length)return Object.freeze({...empty,population,reasons:Object.freeze(reasons)});
 const scene=createNativeSelectionScene(population.stars,population.galaxies,{width:FRAME.width,height:FRAME.height,fieldDegrees:FRAME.fieldDegrees,center:at,population:{coverage:'complete',provenance:`Field pack ${pack.id}; native CRT1 and field table verified`}});
 let raster:RgbImage;
 try{raster=paintField(population,scene,c);}catch(e){if(e instanceof FieldEngineError)throw e;return Object.freeze({...empty,population,scene,reasons:Object.freeze(['stamp-bound' as const])});}
 const viewport=cropNativeFrame(raster,freshNativeViewport(FRAME.viewport,FRAME.viewport,{x:FRAME.anchor,y:FRAME.anchor})),pixelLevel=slitPixelLevel(viewport);
 let selection=selectCatalogObject(scene,FRAME.anchor,FRAME.anchor);
 if(selection.kind==='throughput-required'){
  // 0x59a0fc: the galaxy is chosen iff the star's throughput is zero (strict raw-coordinate cuts at this pointing and level).
  const star=population.stars[selection.star.index];
  selection=selectCatalogObject(scene,FRAME.anchor,FRAME.anchor,nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel,object:{raHours:star.ra,decDegrees:star.dec},pointing:{raHours:at.ra,decDegrees:at.dec}}));
 }
 const base={...empty,population,scene,viewport,selection};
 if(selection.kind!=='galaxy')return Object.freeze({...base,reasons:Object.freeze([selection.kind==='star'?'star-selected' as const:'no-galaxy-selected' as const])});
 const target=population.galaxies[selection.galaxy.index];
 const fraction=nativeObjectSlitFraction({objectPresent:true,objectType:1,pixelLevel});
 if(fraction<=0)return Object.freeze({...base,target,reasons:Object.freeze(['slit-empty' as const])});
 const instrumentMagnitude=catalogGalaxyMagnitude(target).magnitude,zeroPoint=telescopeZeroPoint(c.baseZeroPoint,c.telescopeCorrection);
 if(zeroPoint!==c.zeroPoint)throw new FieldEngineError('evidence');
 const amplitude=photonAmplitudes(instrumentMagnitude,c.skyMagnitude,zeroPoint,fraction);
 let profile;
 try{profile=prepareGalaxyProfile(galaxySource.samples.map(([wavelength,intensity])=>({wavelength,intensity})),galaxySource.matched,target.redshift,4000,5000);}
 catch{return Object.freeze({...base,target,reasons:Object.freeze(['spectrum-range' as const])});}
 const sourceMeans=Object.freeze(profile.values.map(v=>v*amplitude.source));
 const calibration=Object.freeze({zeroPoint,pixelLevel,fraction,amplitude,instrumentMagnitude,sourceMeans,sourceValues:profile.values,wavelengths:profile.wavelengths});
 if(Math.max(...sourceMeans)*FIELD_MULTIPLIER*1000>=c.meanBound)return Object.freeze({...base,target,calibration,reasons:Object.freeze(['mean-bound' as const])});
 return Object.freeze({...base,target,calibration,reasons:Object.freeze([])});
}
/** Journal factory for an available field result (same journal as the galaxy exposure; policy chosen by the caller). */
export function createFieldExposure(result:FieldResult,policy:string,seed:number):JournalState{
 if(!result||result.reasons.length||!result.calibration)throw new FieldEngineError('input');
 return createJournalExposure(policy,result.calibration.sourceMeans,result.calibration.amplitude.sky,FIELD_MULTIPLIER,seed);
}
