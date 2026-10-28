// Front F → Front X: asynchronous loader for the Object X spectrometer (core/objectXSpectrometer.ts). Loads the bounded packs
// data/objectx/spectra-*.json (lazily imported modules, decoded and bounds-checked), the bundled CLEA_GLX.DAT, CLEA_QSO.DAT and
// QSOSpect.dat and ObjectX.HTL (each checked for size and SHA-256), with the photographic gate from the byte-exact GLIMAGES.LST.
// One shared attempt; a failure rejects (typed) and a later call retries. Nothing is persisted or sent anywhere.
import {decodeFieldPack,type FieldPack} from '../core/fieldPack';
import {OBJECT_X_SPECTRUM_ROWS,objectXSpectrometerAt,type ObjectXSpectrometerInputs,type ObjectXSpectrometerResult} from '../core/objectXSpectrometer';
import type {FieldTelescope} from '../core/fieldEngine';
import {decodeQsoSpectrumFile,QSO_SPECTRUM_FILE} from '../core/qsoSpectrum';
import {parseHtl} from '../core/hotList';
import {packWithPhotographs,parseGlimagesPositions,GLIMAGES_LST} from '../core/lssLists';
import {boundedResourceBody,resourceSha256} from './boundedResource';

const PACKS:Record<string,()=>Promise<{default:unknown}>>={
 'objectx-he0353':()=>import('../../data/objectx/spectra-he0353.json'),'objectx-ngc2403':()=>import('../../data/objectx/spectra-ngc2403.json'),
 'objectx-ngc4262':()=>import('../../data/objectx/spectra-ngc4262.json'),'objectx-ngc4449':()=>import('../../data/objectx/spectra-ngc4449.json'),
 'objectx-3c273':()=>import('../../data/objectx/spectra-3c273.json'),'objectx-ngc4631':()=>import('../../data/objectx/spectra-ngc4631.json'),
 'objectx-hs1603':()=>import('../../data/objectx/spectra-hs1603.json'),
};
export class ObjectXSpectrometerError extends Error{constructor(readonly code:'pack'|'resource'){super(`Object X spectrometer: ${code}`);this.name='ObjectXSpectrometerError';}}
/** Raw same-origin resources (test seam: recorded local bytes). Each is checked for its recorded size and SHA-256 here. */
export type ObjectXSpectrometerResources=Readonly<{glx:()=>Promise<Uint8Array>;qsoCatalog:()=>Promise<Readonly<{bytes:Uint8Array;sha256:string}>>;file:(path:string,bytes:number)=>Promise<Uint8Array>;objectXHotList:()=>Promise<Uint8Array>}>;
const browser:ObjectXSpectrometerResources={
 glx:async()=>(await import('./bundledGlxCatalog')).fetchBundledGlxCatalog(fetch,new AbortController().signal),
 qsoCatalog:async()=>(await import('./bundledQsoCatalog')).fetchBundledQsoCatalog(fetch,new AbortController().signal),
 file:async(path,bytes)=>{const r=await fetch(path,{credentials:'same-origin'});return new Uint8Array(await boundedResourceBody(r,bytes));},
 objectXHotList:async()=>(await (await import('./bundledOrbitFile')).fetchObjectXHotList(fetch,new AbortController().signal)).bytes,
};
let resources=browser,pending:Promise<ObjectXSpectrometerInputs>|null=null;
export function setObjectXSpectrometerResources(r:ObjectXSpectrometerResources|null){resources=r??browser;pending=null;}
async function checked(path:string,bytes:number,sha256:string):Promise<Uint8Array>{
 const b=await resources.file(path,bytes);if(b.byteLength!==bytes||await resourceSha256(b.slice())!==sha256)throw new ObjectXSpectrometerError('resource');return b;
}
async function load():Promise<ObjectXSpectrometerInputs>{
 const [glx,qsoCatalog,qsoBytes,glimages,htl]=await Promise.all([resources.glx(),resources.qsoCatalog(),checked(QSO_SPECTRUM_FILE.path,QSO_SPECTRUM_FILE.bytes,QSO_SPECTRUM_FILE.sha256),checked(GLIMAGES_LST.path,GLIMAGES_LST.bytes,GLIMAGES_LST.sha256),resources.objectXHotList()]);
 const photographs=parseGlimagesPositions(glimages),packs=new Map<string,FieldPack>();
 for(const id of new Set(OBJECT_X_SPECTRUM_ROWS.map(r=>r.pack))){const p=decodeFieldPack((await PACKS[id]()).default);if(p.id!==id)throw new ObjectXSpectrometerError('pack');packs.set(id,packWithPhotographs(p,photographs));}
 const rows=parseHtl(htl),rowPointings=new Map(OBJECT_X_SPECTRUM_ROWS.map(r=>[r.row,Object.freeze({ra:rows[r.row].ra,dec:rows[r.row].dec})]));
 for(const r of OBJECT_X_SPECTRUM_ROWS){const p=rowPointings.get(r.row)!;if(!packs.get(r.pack)!.pointings.some(x=>x.ra===p.ra&&x.dec===p.dec))throw new ObjectXSpectrometerError('pack');}
 return Object.freeze({packs,glx,qsoCatalog,qsoSpectrum:decodeQsoSpectrumFile(qsoBytes),rowPointings});
}
/** The typed entry point for Front X's spectrometer branch. */
export async function observeObjectXSpectrum(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Promise<ObjectXSpectrometerResult>{
 pending??=load().catch(e=>{pending=null;throw e;});
 return objectXSpectrometerAt(await pending,pointing,telescope);
}
