// Front G (G3b, analysis/front-plans/front-g-gsc.md §10): photometer frames at a telescope pointing, built from the compact GSC
// tiles by the general field engine with the photometer field size (0.025°), then registered for the synchronous photometer
// journal (core/photometerField.ts). The Object X mask (2°, docs/OBJECT-INFO-FORMS.md) applies before anything is read. Same-
// origin files only; nothing is sent anywhere.
import {FIELD_HALF_DEGREES,FieldEngineError,buildFieldPopulation} from '../core/fieldEngine';
import {photometerFieldFromPopulation,registerTiledPhotometerField,tiledPhotometerTargetId,isTiledPhotometerTarget,type PhotometerTiledReason} from '../core/photometerField';
import type {PhotometerEvent} from '../core/photometer';
import type {Pointing} from '../core/sky';
import {AssembledFieldError,assembleFieldPack,type AssemblySources} from './assembledFieldPack';
import {GscTileError} from './gscTiles';
import {setTileSources,tileSources} from './tileAssembly';
import {objectXMasked} from './objectXMask';

export type PreparedTiledPhotometer=Readonly<{status:'ready';targetId:string;selectedName:string}|{status:'unavailable';reason:PhotometerTiledReason|'object-x-hidden'|'field-polar'|'field-tiles'|'field-unreadable';detail?:string}>;
export type PhotometerTileSources=Readonly<{assembly:AssemblySources;glx:Uint8Array}>;
/** Test seam (kept for the photometer tests): the photometer's sources; the shared loader supplies the rest. */
export function setPhotometerTileSources(load:(()=>Promise<PhotometerTileSources>)|null){
 setTileSources(load?async()=>{const s=await load();return {...s,qso:{bytes:s.assembly.qso,sha256:s.assembly.qsoSha256},glimages:s.assembly.glimages};}:null);
}
const sources=tileSources;
/** Builds and registers the photometer frame at a pointing (or gives the typed reason). An abort rejects with AbortError. */
export async function preparePhotometerTiledField(pointing:Pointing,options:Readonly<{signal?:AbortSignal;hidden?:Pointing|null}>={}):Promise<PreparedTiledPhotometer>{
 const {signal}=options;signal?.throwIfAborted();
 if(await objectXMasked(options.hidden??null,pointing))return Object.freeze({status:'unavailable',reason:'object-x-hidden'});
 let pack;const s=await sources();signal?.throwIfAborted();
 try{pack=await assembleFieldPack(pointing,s.assembly,signal,FIELD_HALF_DEGREES.photometer);}
 catch(e){
  if(e instanceof GscTileError)return Object.freeze({status:'unavailable',reason:'field-tiles',detail:e.code});
  if(e instanceof AssembledFieldError)return Object.freeze(e.code==='polar'?{status:'unavailable',reason:'field-polar'}:{status:'unavailable',reason:'field-unreadable',detail:e.code});
  throw e;
 }
 let built;
 try{built=buildFieldPopulation(pack,s.glx,pointing,{fieldHalfDegrees:FIELD_HALF_DEGREES.photometer,variableDispatch:'recovered',...(signal?{signal}:{})});}
 catch(e){if(e instanceof FieldEngineError)return Object.freeze({status:'unavailable',reason:'field-unreadable',detail:e.code});throw e;}
 const r=photometerFieldFromPopulation(built.population,built.reasons,pointing,'object');
 if(!r.field)return Object.freeze({status:'unavailable',reason:r.reason,...(r.detail?{detail:r.detail}:{})});
 return Object.freeze({status:'ready',targetId:registerTiledPhotometerField(r.field),selectedName:r.field.selected.nativeName});
}
/** Before a session with 'field' events is parsed (synchronously), prepare every frame it names. Any that cannot be prepared
 * leaves the session unreadable (the parser then refuses it); nothing is approximated. */
export async function preparePhotometerSessionFields(events:unknown,signal?:AbortSignal):Promise<boolean>{
 if(!Array.isArray(events))return true;
 const pointings=new Map<string,Pointing>();
 for(const e of events as PhotometerEvent[])if(e?.type==='field'&&typeof e.ra==='number'&&typeof e.dec==='number'){const p={ra:e.ra,dec:e.dec};let id;try{id=tiledPhotometerTargetId(p);}catch{return false;}pointings.set(id,p);}
 for(const [id,p] of pointings){if(isTiledPhotometerTarget(id))continue;const r=await preparePhotometerTiledField(p,{signal});if(r.status!=='ready')return false;}
 return true;
}
