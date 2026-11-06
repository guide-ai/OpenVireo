// Front G (G3b, analysis/front-plans/front-g-gsc.md §10): photometer frames at a telescope pointing, built from the compact GSC
// tiles by the general field engine with the photometer field size (0.025°), then registered for the synchronous photometer
// journal (core/photometerField.ts). The Object X mask (2°, docs/OBJECT-INFO-FORMS.md) applies before anything is read. Same-
// origin files only; nothing is sent anywhere.
import {FIELD_HALF_DEGREES,FIELD_VARIABLE_STAGE_GATES,FieldEngineError,buildFieldPopulation,frozenObservatoryTime,type FieldVariableTime} from '../core/fieldEngine';
import {photometerFieldFromPopulation,registerTiledPhotometerField,tiledPhotometerTargetId,isTiledPhotometerTarget,type PhotometerTiledReason} from '../core/photometerField';
import type {PhotometerEvent} from '../core/photometer';
import type {Pointing} from '../core/sky';
import {AssembledFieldError,assembleFieldPack,type AssemblySources} from './assembledFieldPack';
import {GscTileError} from './gscTiles';
import {setTileSources,tileSources} from './tileAssembly';
import {objectXMasked} from './objectXMask';

export type PreparedTiledPhotometer=Readonly<{status:'ready';targetId:string;selectedName:string;/** Front PHTILED: the selected object's kind byte (0 star, 1 galaxy, 3 QSO). */selectedType:0|1|3;/** Front PHVAR: the frozen observatory-clock JD the frame was built at, present only when its variable stage needed it (the 'field' event then carries it). */jd?:number}|{status:'unavailable';reason:PhotometerTiledReason|'object-x-hidden'|'field-polar'|'field-tiles'|'field-unreadable';detail?:string}>;
export type PhotometerTileSources=Readonly<{assembly:AssemblySources;glx:Uint8Array}>;
/** Test seam (kept for the photometer tests): the photometer's sources; the shared loader supplies the rest. */
export function setPhotometerTileSources(load:(()=>Promise<PhotometerTileSources>)|null){
 setTileSources(load?async()=>{const s=await load();return {...s,qso:{bytes:s.assembly.qso,sha256:s.assembly.qsoSha256},glimages:s.assembly.glimages};}:null);
}
const sources=tileSources;
/** Builds and registers the photometer frame at a pointing (or gives the typed reason). An abort rejects with AbortError.
 * Front PHVAR (analysis/front-phvar/RECOVERY.md): VIREO's telescope load 0x53be70 builds the field when the Telescope view's cache
 * misses (0x53a6c0..0x53a75f: a new pointing or field size, or env+0x3812 set after the clock is changed, 0x58b413), and its variable
 * stage reads the observatory clock (0x487bcc at 0x5986ab and 0x59878b); no photometer method reads the clock or rebuilds the field
 * [D]. The web freezes the observatory clock when the student prepares the field (`currentJd`, read once at the call) [W]:
 * - the field is first built without a time; if that frame is ready, no reading depends on the time (a variable that needs it is
 *   neither selected nor within reach of any aperture) and the frame and its 'field' event carry no JD (unchanged ids and sessions);
 * - otherwise, when the frame was typed by a variable reason, it is built again at the frozen JD and carries it;
 * - `variableTime` (a restored session's stored JD) builds at that JD directly; the clock is then not read. */
export async function preparePhotometerTiledField(pointing:Pointing,options:Readonly<{signal?:AbortSignal;hidden?:Pointing|null;currentJd?:()=>number;variableTime?:FieldVariableTime}>={}):Promise<PreparedTiledPhotometer>{
 const {signal}=options;signal?.throwIfAborted();
 const frozen=options.variableTime?undefined:frozenObservatoryTime(options.currentJd);
 if(await objectXMasked(options.hidden??null,pointing))return Object.freeze({status:'unavailable',reason:'object-x-hidden'});
 let pack;const s=await sources();signal?.throwIfAborted();
 try{pack=await assembleFieldPack(pointing,s.assembly,signal,FIELD_HALF_DEGREES.photometer);}
 catch(e){
  if(e instanceof GscTileError)return Object.freeze({status:'unavailable',reason:'field-tiles',detail:e.code});
  if(e instanceof AssembledFieldError)return Object.freeze(e.code==='polar'?{status:'unavailable',reason:'field-polar'}:{status:'unavailable',reason:'field-unreadable',detail:e.code});
  throw e;
 }
 // Front PHTILED: the telescope field object [0x5b56ac] has mode 1, which loads and merges the QSOs (0x597db0..0x597df3), as for the
 // spectrometer at any pointing.
 const frame=(variableTime:FieldVariableTime|undefined)=>{
  let built;
  try{built=buildFieldPopulation(pack,s.glx,pointing,{fieldHalfDegrees:FIELD_HALF_DEGREES.photometer,variableDispatch:'recovered',qso:'merge',qsoCatalog:{bytes:s.assembly.qso,sha256:s.assembly.qsoSha256},...(variableTime?{variableTime}:{}),...(signal?{signal}:{})});}
  catch(e){if(e instanceof FieldEngineError)return e.code;throw e;}
  return photometerFieldFromPopulation(built.population,built.reasons,pointing,'object',{qso:s.assembly.qso,glx:s.glx});
 };
 let r=frame(options.variableTime);
 if(typeof r!=='string'&&frozen&&needsTime(r))r=frame(frozen);
 if(typeof r==='string')return Object.freeze({status:'unavailable',reason:'field-unreadable',detail:r});
 if(!r.field)return Object.freeze({status:'unavailable',reason:r.reason,...(r.detail?{detail:r.detail}:{})});
 return Object.freeze({status:'ready',targetId:registerTiledPhotometerField(r.field),selectedName:r.field.selected.nativeName,selectedType:r.field.selected.type,...(r.field.variableTime?{jd:r.field.variableTime.jd}:{})});
}
/** A frame typed by the variable stage: a kept variable without values that a reading would read, or a stage gate that a JD may
 * resolve (a spectrum range not decided at every time; the model fault is retried too and stays typed). */
function needsTime(r:ReturnType<typeof photometerFieldFromPopulation>):boolean{
 if(r.reason==='photometer-variable')return true;
 return r.reason==='photometer-population'&&(r.detail??'').split(',').some(d=>(FIELD_VARIABLE_STAGE_GATES as readonly string[]).includes(d));
}
/** Before a session with 'field' events is parsed (synchronously), prepare every frame it names. Any that cannot be prepared
 * leaves the session unreadable (the parser then refuses it); nothing is approximated. */
export async function preparePhotometerSessionFields(events:unknown,signal?:AbortSignal):Promise<boolean>{
 if(!Array.isArray(events))return true;
 const pointings=new Map<string,Readonly<{p:Pointing;jd?:number}>>();
 for(const e of events as PhotometerEvent[])if(e?.type==='field'&&typeof e.ra==='number'&&typeof e.dec==='number'){
  // Front PHVAR: a stored JD rebuilds the frame at that JD; an event without one is built with no time, as before (the clock is
  // never read on restore).
  const p={ra:e.ra,dec:e.dec},jd=Object.hasOwn(e,'jd')?e.jd:undefined;let id;try{id=tiledPhotometerTargetId(p,jd);}catch{return false;}
  if(Object.hasOwn(e,'jd')&&typeof jd!=='number')return false;pointings.set(id,jd===undefined?{p}:{p,jd});
 }
 for(const [id,{p,jd}] of pointings){
  if(isTiledPhotometerTarget(id))continue;
  const r=await preparePhotometerTiledField(p,{signal,...(jd!==undefined?{variableTime:Object.freeze({jd,source:'observatory-clock' as const})}:{})});
  if(r.status!=='ready'||r.targetId!==id)return false;
 }
 return true;
}
