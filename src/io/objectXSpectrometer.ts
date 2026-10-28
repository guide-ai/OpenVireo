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
import {nativePhotographRows} from '../core/photographicList';
import {decodeBitmap8,type Bitmap8} from '../core/photographDraw';
import {decodeStarIndexList,starTemplateSpectrum,JSPEC2_SPI} from '../core/starTemplates';
import {parseLibrarySpectrum} from '../core/spectrum';
import type {UniformSpectrum} from '../core/acquisition';
/** Star templates that the Object X star rows select through JSPEC2.SPI (0x50d660), each byte-exact and hash-checked, with the
 * star that requires it: row 9 N3730.DAT@513845 (50105000, exact) → A0000044; row 5 N0730.DAT@472049 (60005000, exact) →
 * A0000052; row 4 N6000.DAT@209199 (30005000, no entry: walk-back to the nearest lower bucket-50 entry 20805000) → A0000018 (these
 * three already published in public/original/classification, byte-identical to their jspect2 originals); row 12
 * N3000.DAT@483032 (50305000, exact) → A0000046 (bundled under public/original/spectra/jspect2). Galaxy own spectra (GLXYSP.LST
 * matches of the Object X galaxies) are already published in public/original/spectra. */
const STAR_TEMPLATES=Object.freeze([
 {file:'A0000018.SP',path:'/original/classification/A0000018.SP',bytes:55980,sha256:'ee65da16e6884d93af66df7c6285664c9dddde3cf1e747c4638af6a36711698a'},
 {file:'A0000044.SP',path:'/original/classification/A0000044.SP',bytes:55980,sha256:'6d49365b7b52266afd3477df21f30c123d89f5d1cf0771f2c6264487c37800c4'},
 {file:'A0000046.SP',path:'/original/spectra/jspect2/A0000046.SP',bytes:55980,sha256:'ed50d12a757da8eb063188e6f2da3c7e7842a68b21c4eb4e35c5a1cff654414c'},
 {file:'A0000052.SP',path:'/original/classification/A0000052.SP',bytes:55980,sha256:'3214b6c401c865bd0b6a2e7e8e175aae88dd2999512a97606be86c4d5828f897'}].map(x=>Object.freeze(x)));
const GALAXY_SPECTRA=Object.freeze([
 {file:'NGC4262.SP',path:'/original/spectra/NGC4262.SP',bytes:27616,sha256:'f26683c9b84fa039c8bbc1ff615a422a7d30e655a872b29f975fb764f2adfa7a'},
 {file:'NGC4449.SP',path:'/original/spectra/NGC4449.SP',bytes:27617,sha256:'04bf5a4ce4c96b8069a5063a6638a1f14d96f4e93dc315f1bb684bf24bff1da9'},
 {file:'NGC4631.SP',path:'/original/spectra/NGC4631.SP',bytes:27616,sha256:'d333d4a709457869315a2dcefdf0908033c65c40ed623c2554f8f341326bcad8'}]);
/** The four approved photographs that GLIMAGES.LST associates with Object X areas (user approval of 2026-10-28), byte-exact. */
export const OBJECT_X_PHOTOGRAPHS=Object.freeze([
 {file:'NGC2403.BMP',path:'/original/images/NGC2403.BMP',bytes:75852,sha256:'d490142539a2dfaade1780d0ad73918076f15141ca6fc0f6f93ccb3f627e1394'},
 {file:'NGC4262.BMP',path:'/original/images/NGC4262.BMP',bytes:3952,sha256:'ac967f4472d20e1ff2e8ac5f5b6dc20d643fea8305f800bf7271883940559ea1'},
 {file:'NGC4631.BMP',path:'/original/images/NGC4631.BMP',bytes:53864,sha256:'0cba75c792d0aac7aa56541e958f87e3fe3e37f5893896e4fc12a84bad729d9e'},
 {file:'NGC4656.BMP',path:'/original/images/NGC4656.BMP',bytes:76016,sha256:'0c94936472f13a87e26c5156e49ae491869f47818df61c8f94b6f0249601028d'}].map(x=>Object.freeze(x)));
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
 const photographRows=nativePhotographRows(glimages),photographs=photographRows.map(r=>({index:r.index,ra:r.ra,dec:r.dec})),packs=new Map<string,FieldPack>();
 for(const id of new Set(OBJECT_X_SPECTRUM_ROWS.map(r=>r.pack))){const p=decodeFieldPack((await PACKS[id]()).default);if(p.id!==id)throw new ObjectXSpectrometerError('pack');packs.set(id,packWithPhotographs(p,photographs));}
 const bitmaps=new Map<string,Bitmap8>();for(const b of OBJECT_X_PHOTOGRAPHS)bitmaps.set(b.file,decodeBitmap8(await checked(b.path,b.bytes,b.sha256)));
 const rows=parseHtl(htl),rowPointings=new Map(OBJECT_X_SPECTRUM_ROWS.map(r=>[r.row,Object.freeze({ra:rows[r.row].ra,dec:rows[r.row].dec})]));
 for(const r of OBJECT_X_SPECTRUM_ROWS){const p=rowPointings.get(r.row)!;if(!packs.get(r.pack)!.pointings.some(x=>x.ra===p.ra&&x.dec===p.dec))throw new ObjectXSpectrometerError('pack');}
 const glxyspLines=latin1(glxysp).replace(/\x1a$/,'').split('\r\n').filter(l=>l!=='');
 return Object.freeze({packs,glx,qsoCatalog,qsoSpectrum:decodeQsoSpectrumFile(qsoBytes),rowPointings,starIndex:decodeStarIndexList(spi),starTemplates,glxyspLines,galaxySpectra,photographs:Object.freeze({rows:photographRows,bitmaps})});
}
/** The typed entry point for Front X's spectrometer branch. */
export async function observeObjectXSpectrum(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Promise<ObjectXSpectrometerResult>{
 pending??=load().catch(e=>{pending=null;throw e;});
 return objectXSpectrometerAt(await pending,pointing,telescope);
}
