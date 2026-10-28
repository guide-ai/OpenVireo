// Front F → Front X: asynchronous loader for the Object X spectrometer (core/objectXSpectrometer.ts). Loads the bounded packs
// data/objectx/spectra-*.json (lazily imported modules, decoded and bounds-checked), the bundled CLEA_GLX.DAT, CLEA_QSO.DAT and
// QSOSpect.dat and ObjectX.HTL (each checked for size and SHA-256), with the photographic gate from the byte-exact GLIMAGES.LST.
// One shared attempt; a failure rejects (typed) and a later call retries. Nothing is persisted or sent anywhere.
import {decodeFieldPack,type FieldPack} from '../core/fieldPack';
import {OBJECT_X_SPECTRUM_ROWS,objectXSpectrometerAt,type ObjectXSpectrometerInputs,type ObjectXSpectrometerResult} from '../core/objectXSpectrometer';
import type {FieldTelescope} from '../core/fieldEngine';
import {decodeQsoSpectrumFile,QSO_SPECTRUM_FILE} from '../core/qsoSpectrum';
import {parseHtl} from '../core/hotList';
import {packWithPhotographs,GLIMAGES_LST,GLXYSP_LST} from '../core/lssLists';
import {nativePhotographPositions} from '../core/photographicList';
import {decodeStarIndexList,starTemplateSpectrum,JSPEC2_SPI} from '../core/starTemplates';
import {parseLibrarySpectrum} from '../core/spectrum';
import type {UniformSpectrum} from '../core/acquisition';
/** Star templates that the observable Object X star rows select through JSPEC2.SPI (row 9: N3730.DAT@513845, index 50105000 →
 * A0000044.sp), each the already-published byte-exact file in public/original/classification; galaxy own spectra (GLXYSP.LST
 * matches of the Object X galaxies) already published in public/original/spectra. */
const STAR_TEMPLATES=Object.freeze([{file:'A0000044.SP',path:'/original/classification/A0000044.SP',bytes:55980,sha256:'6d49365b7b52266afd3477df21f30c123d89f5d1cf0771f2c6264487c37800c4'}]);
const GALAXY_SPECTRA=Object.freeze([
 {file:'NGC4262.SP',path:'/original/spectra/NGC4262.SP',bytes:27616,sha256:'f26683c9b84fa039c8bbc1ff615a422a7d30e655a872b29f975fb764f2adfa7a'},
 {file:'NGC4449.SP',path:'/original/spectra/NGC4449.SP',bytes:27617,sha256:'04bf5a4ce4c96b8069a5063a6638a1f14d96f4e93dc315f1bb684bf24bff1da9'},
 {file:'NGC4631.SP',path:'/original/spectra/NGC4631.SP',bytes:27616,sha256:'d333d4a709457869315a2dcefdf0908033c65c40ed623c2554f8f341326bcad8'}]);
const latin1=(b:Uint8Array)=>{let t='';for(const x of b)t+=String.fromCharCode(x);return t;};
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
 const [glx,qsoCatalog,qsoBytes,glimages,htl,spi,glxysp]=await Promise.all([resources.glx(),resources.qsoCatalog(),checked(QSO_SPECTRUM_FILE.path,QSO_SPECTRUM_FILE.bytes,QSO_SPECTRUM_FILE.sha256),checked(GLIMAGES_LST.path,GLIMAGES_LST.bytes,GLIMAGES_LST.sha256),resources.objectXHotList(),checked(JSPEC2_SPI.path,JSPEC2_SPI.bytes,JSPEC2_SPI.sha256),checked(GLXYSP_LST.path,GLXYSP_LST.bytes,GLXYSP_LST.sha256)]);
 const starTemplates=new Map<string,UniformSpectrum>(),galaxySpectra=new Map<string,ReturnType<typeof parseLibrarySpectrum>>();
 for(const t of STAR_TEMPLATES)starTemplates.set(t.file,starTemplateSpectrum(latin1(await checked(t.path,t.bytes,t.sha256))));
 for(const g of GALAXY_SPECTRA)galaxySpectra.set(g.file,parseLibrarySpectrum(latin1(await checked(g.path,g.bytes,g.sha256))));
 // The photographic list as the original keeps it (photographicList.ts: malformed rows such as NGC 4449's are dropped).
 const photographs=nativePhotographPositions(glimages),packs=new Map<string,FieldPack>();
 for(const id of new Set(OBJECT_X_SPECTRUM_ROWS.map(r=>r.pack))){const p=decodeFieldPack((await PACKS[id]()).default);if(p.id!==id)throw new ObjectXSpectrometerError('pack');packs.set(id,packWithPhotographs(p,photographs));}
 const rows=parseHtl(htl),rowPointings=new Map(OBJECT_X_SPECTRUM_ROWS.map(r=>[r.row,Object.freeze({ra:rows[r.row].ra,dec:rows[r.row].dec})]));
 for(const r of OBJECT_X_SPECTRUM_ROWS){const p=rowPointings.get(r.row)!;if(!packs.get(r.pack)!.pointings.some(x=>x.ra===p.ra&&x.dec===p.dec))throw new ObjectXSpectrometerError('pack');}
 const glxyspLines=latin1(glxysp).replace(/\x1a$/,'').split('\r\n').filter(l=>l!=='');
 return Object.freeze({packs,glx,qsoCatalog,qsoSpectrum:decodeQsoSpectrumFile(qsoBytes),rowPointings,starIndex:decodeStarIndexList(spi),starTemplates,glxyspLines,galaxySpectra});
}
/** The typed entry point for Front X's spectrometer branch. */
export async function observeObjectXSpectrum(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Promise<ObjectXSpectrometerResult>{
 pending??=load().catch(e=>{pending=null;throw e;});
 return objectXSpectrometerAt(await pending,pointing,telescope);
}
