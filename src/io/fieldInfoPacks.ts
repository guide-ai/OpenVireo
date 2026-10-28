// Front O (docs/OBJECT-INFO-FORMS.md §Tiering): the certified field population behind Catalog Object and the Star Data List.
// A pointing is certified only when it is exactly a listed pointing of a bundled pack (packCovers): the four pinned snapshot
// fields, the Hubble engine Coma/Boötes packs and the nine LSS survey packs. Object X packs are excluded (hidden identities,
// unmodelled asteroids). The field engine is used read-only through its public functions; nothing is fetched from elsewhere.
import type {FieldPack} from '../core/fieldPack';
import {decodeFieldPack,fieldPackFromSnapshot,packCovers} from '../core/fieldPack';
import {buildFieldPopulation,freshFieldArea,type FieldOptions,type FieldPopulation,type FieldUnavailableReason} from '../core/fieldEngine';
import {LSS_ROWS} from '../core/lssFields';
import {GLIMAGES_LST,packWithPhotographs,parseGlimagesPositions} from '../core/lssLists';
import {nativePhotographRows} from '../core/photographicList';
import type {LssFieldNumber} from '../core/lssFields';

export type CertifiedPopulation=Readonly<{status:'ready';packId:string;population:FieldPopulation;reasons:readonly FieldUnavailableReason[]}|{status:'unavailable';reason:'field-not-certified'}|{status:'unavailable';reason:'population';detail:FieldUnavailableReason}>;
/** Reasons that leave no exact population (the others concern only the raster or the drawing). */
export const POPULATION_BLOCKING:readonly FieldUnavailableReason[]=Object.freeze(['outside-pack','qso-merge','variable-merge','merge-boundary']);
export type FieldInfoResources=Readonly<{
 snapshot:(id:SnapshotId)=>Promise<unknown>;engine:(id:'coma'|'bootes')=>Promise<unknown>;lss:(field:LssFieldNumber)=>Promise<FieldPack>;
 glx:()=>Promise<Uint8Array>;qso:()=>Promise<Readonly<{bytes:Uint8Array;sha256:string}>>;glimages:()=>Promise<Uint8Array>;
}>;
export type SnapshotId='36773'|'36747'|'54876'|'pegasus';
/** Pointings of the pinned snapshot fields (their domain pointing), checked against the files when loaded. */
const SNAPSHOT_IDS:readonly SnapshotId[]=['36773','36747','54876','pegasus'];

function browserResources():FieldInfoResources{
 const signal=new AbortController().signal;
 return {
  snapshot:async id=>(await (id==='36773'?import('../../data/hubble/pinned-galaxy-field.json'):id==='36747'?import('../../data/hubble/pinned-galaxy-36747-field.json'):id==='54876'?import('../../data/hubble/pinned-galaxy-54876-field.json'):import('../../data/hubble/pinned-pegasus-field.json'))).default,
  engine:async id=>(await (id==='coma'?import('../../data/hubble/engine-coma.json'):import('../../data/hubble/engine-bootes.json'))).default,
  lss:async field=>(await import('./lssPack')).loadLssPack(field),
  glx:async()=>(await import('./bundledGlxCatalog')).fetchBundledGlxCatalog(fetch,signal),
  qso:async()=>(await import('./bundledQsoCatalog')).fetchBundledQsoCatalog(fetch,signal),
  glimages:async()=>(await (await import('./bundledHotList')).fetchBundledHotList(fetch,signal,GLIMAGES_LST)).bytes,
 };
}
let resources:FieldInfoResources|null=null;
/** Test seam: replace the resource source (default: the bundled same-origin files). */
export function setFieldInfoResources(r:FieldInfoResources|null){resources=r;cache.clear();}
const cache=new Map<string,Promise<unknown>>();
function once<T>(key:string,load:()=>Promise<T>):Promise<T>{let p=cache.get(key) as Promise<T>|undefined;if(!p){p=load();cache.set(key,p);p.catch(()=>cache.delete(key));}return p;}
const res=()=>resources??(resources=browserResources());

async function candidatePacks(pointing:Readonly<{ra:number;dec:number}>):Promise<readonly FieldPack[]>{
 const r=res(),packs:FieldPack[]=[];
 for(const id of SNAPSHOT_IDS){
  const snap=await once('snap:'+id,r.snapshot.bind(null,id)) as {domain:{pointing:{ra:number;dec:number}}};
  if(snap.domain.pointing.ra===pointing.ra&&snap.domain.pointing.dec===pointing.dec)packs.push(await once('snappack:'+id,async()=>fieldPackFromSnapshot(`snapshot-${id}`,snap as Parameters<typeof fieldPackFromSnapshot>[1])));
 }
 for(const id of ['coma','bootes'] as const){
  const p=await once('engine:'+id,async()=>decodeFieldPack(await r.engine(id)));
  if(p.pointings.some(q=>q.ra===pointing.ra&&q.dec===pointing.dec))packs.push(p);
 }
 const fields=new Set(LSS_ROWS.filter(row=>row.ra===pointing.ra&&row.dec===pointing.dec).map(row=>row.field));
 for(const field of fields){
  const p=await once('lss:'+field,async()=>packWithPhotographs(await r.lss(field),parseGlimagesPositions(await once('glimages',r.glimages))));
  packs.push(p);
 }
 return packs;
}
/** The certified population at an exact pointing, or the typed reason. QSO 'merge' and the photograph renames are used when the
 * area needs them; variables use the recovered dispatch (as the exercises do). */
export async function findCertifiedPopulation(pointing:Readonly<{ra:number;dec:number}>):Promise<CertifiedPopulation>{
 let area;try{area=freshFieldArea(pointing);}catch{return Object.freeze({status:'unavailable',reason:'field-not-certified'});}
 const packs=(await candidatePacks(pointing)).filter(p=>packCovers(p,pointing,area));
 if(!packs.length)return Object.freeze({status:'unavailable',reason:'field-not-certified'});
 const r=res(),pack=packs[0],glx=await once('glx',r.glx);
 const options:{-readonly [K in keyof FieldOptions]:FieldOptions[K]}={variableDispatch:'recovered'};
 let built=buildFieldPopulation(pack,glx,pointing,options);
 if(built.reasons.includes('qso-merge')){options.qso='merge';options.qsoCatalog=await once('qso',r.qso);built=buildFieldPopulation(pack,glx,pointing,options);}
 if(built.reasons.includes('photographic-image')){options.photographs={rows:nativePhotographRows(await once('glimages',r.glimages)),bitmaps:new Map()};built=buildFieldPopulation(pack,glx,pointing,options);}
 const blocking=built.reasons.find(x=>POPULATION_BLOCKING.includes(x));
 if(blocking||!built.population)return Object.freeze({status:'unavailable',reason:'population',detail:blocking??'outside-pack'});
 return Object.freeze({status:'ready',packId:pack.id,population:built.population,reasons:Object.freeze([...built.reasons])});
}
