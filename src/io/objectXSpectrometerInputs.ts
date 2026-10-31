// Front F → E08: loads and checks every input of the Object X spectrometer (core/objectXSpectrometer.ts). Runs inside the Worker
// io/objectXSpectrometerWorker.ts in the browser and in process under tests. Bounded packs data/objectx/spectra-*.json (each
// checked against its recorded SHA-256 in data/objectx/PROVENANCE.json, review 2 finding 11), the bundled CLEA_GLX.DAT,
// CLEA_QSO.DAT, QSOSpect.dat, GLIMAGES.LST, ObjectX.HTL, JSPEC2.SPI, GLXYSP.LST, the star templates, galaxy spectra and the four
// approved photographs (each checked for size and SHA-256). Nothing is persisted or sent anywhere.
import he0353 from '../../data/objectx/spectra-he0353.json';
import ngc2403 from '../../data/objectx/spectra-ngc2403.json';
import ngc4262 from '../../data/objectx/spectra-ngc4262.json';
import ngc4449 from '../../data/objectx/spectra-ngc4449.json';
import c3c273 from '../../data/objectx/spectra-3c273.json';
import ngc4631 from '../../data/objectx/spectra-ngc4631.json';
import hs1603 from '../../data/objectx/spectra-hs1603.json';
import provenance from '../../data/objectx/PROVENANCE.json';
import {decodeFieldPack,type FieldPack} from '../core/fieldPack';
import {OBJECT_X_SPECTRUM_ROWS,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import {decodeQsoSpectrumFile,QSO_SPECTRUM_FILE} from '../core/qsoSpectrum';
import {parseHtl} from '../core/hotList';
import {objectXCode} from '../core/objectXLab';
import {packWithPhotographs,GLIMAGES_LST,GLXYSP_LST} from '../core/lssLists';
import {nativePhotographRows} from '../core/photographicList';
import {decodeBitmap8,type Bitmap8} from '../core/photographDraw';
import {OBJECT_X_PHOTOGRAPHS} from '../core/approvedPhotographs';
import {decodeStarIndexList,starTemplateSpectrum,JSPEC2_SPI} from '../core/starTemplates';
import {parseLibrarySpectrum} from '../core/spectrum';
import type {UniformSpectrum} from '../core/acquisition';
import {boundedResourceBody,resourceSha256} from './boundedResource';
import {fetchBundledGlxCatalog} from './bundledGlxCatalog';
import {fetchBundledQsoCatalog} from './bundledQsoCatalog';
import {fetchObjectXHotList} from './bundledOrbitFile';

/** Star templates the Object X star rows select through JSPEC2.SPI (0x50d660), each byte-exact and hash-checked, with the star that
 * requires it: row 9 N3730.DAT@513845 (50105000, exact) → A0000044; row 5 N0730.DAT@472049 (60005000, exact) → A0000052; row 4
 * N6000.DAT@209199 (30005000, no entry: walk-back to the nearest lower bucket-50 entry 20805000) → A0000018 (these three already
 * published in public/original/classification, byte-identical to their jspect2 originals); row 12 N3000.DAT@483032 (50305000,
 * exact) → A0000046 (bundled under public/original/spectra/jspect2). */
export const OBJECT_X_STAR_TEMPLATES=Object.freeze([
 {file:'A0000018.SP',path:'/original/classification/A0000018.SP',bytes:55980,sha256:'ee65da16e6884d93af66df7c6285664c9dddde3cf1e747c4638af6a36711698a'},
 {file:'A0000044.SP',path:'/original/classification/A0000044.SP',bytes:55980,sha256:'6d49365b7b52266afd3477df21f30c123d89f5d1cf0771f2c6264487c37800c4'},
 {file:'A0000046.SP',path:'/original/spectra/jspect2/A0000046.SP',bytes:55980,sha256:'ed50d12a757da8eb063188e6f2da3c7e7842a68b21c4eb4e35c5a1cff654414c'},
 {file:'A0000052.SP',path:'/original/classification/A0000052.SP',bytes:55980,sha256:'3214b6c401c865bd0b6a2e7e8e175aae88dd2999512a97606be86c4d5828f897'}].map(x=>Object.freeze(x)));
/** Own spectra of the Object X galaxies that GLXYSP.LST names (0x55eb64), already published in public/original/spectra. */
export const OBJECT_X_GALAXY_SPECTRA=Object.freeze([
 {file:'NGC4262.SP',path:'/original/spectra/NGC4262.SP',bytes:27616,sha256:'f26683c9b84fa039c8bbc1ff615a422a7d30e655a872b29f975fb764f2adfa7a'},
 {file:'NGC4449.SP',path:'/original/spectra/NGC4449.SP',bytes:27617,sha256:'04bf5a4ce4c96b8069a5063a6638a1f14d96f4e93dc315f1bb684bf24bff1da9'},
 {file:'NGC4631.SP',path:'/original/spectra/NGC4631.SP',bytes:27616,sha256:'d333d4a709457869315a2dcefdf0908033c65c40ed623c2554f8f341326bcad8'}].map(x=>Object.freeze(x)));
/** The four approved photographs that GLIMAGES.LST associates with Object X areas (user approval of 2026-10-28), byte-exact. */
export {OBJECT_X_PHOTOGRAPHS};
/** The packs; each is checked against the file SHA-256 recorded in data/objectx/PROVENANCE.json (see packDigest). */
const PACKS:Readonly<Record<string,unknown>>={'objectx-he0353':he0353,'objectx-ngc2403':ngc2403,'objectx-ngc4262':ngc4262,'objectx-ngc4449':ngc4449,'objectx-3c273':c3c273,'objectx-ngc4631':ngc4631,'objectx-hs1603':hs1603};
export class ObjectXSpectrometerError extends Error{constructor(readonly code:'pack'|'resource'){super(`Object X spectrometer: ${code}`);this.name='ObjectXSpectrometerError';}}
/** Raw same-origin resources (test seam: recorded local bytes). Each is checked for its recorded size and SHA-256 here. */
export type ObjectXSpectrometerResources=Readonly<{glx:()=>Promise<Uint8Array>;qsoCatalog:()=>Promise<Readonly<{bytes:Uint8Array;sha256:string}>>;file:(path:string,bytes:number)=>Promise<Uint8Array>;objectXHotList:()=>Promise<Uint8Array>}>;
const latin1=(b:Uint8Array)=>{let t='';for(const x of b)t+=String.fromCharCode(x);return t;};
/** The digest of an imported pack: the pack files are compact JSON plus a final newline, so SHA-256 of JSON.stringify(module)+'\n'
 * is the file's own SHA-256 (the value data/objectx/PROVENANCE.json records); any edit of the data changes it. */
export async function packDigest(raw:unknown):Promise<string>{return resourceSha256(new TextEncoder().encode(JSON.stringify(raw)+'\n').buffer as ArrayBuffer);}
const PACK_DIGESTS:Readonly<Record<string,string>>=Object.fromEntries(Object.values(provenance.packs as Record<string,{id:string;sha256:string}>).map(p=>[p.id,p.sha256]));
export async function loadObjectXSpectrometerInputs(r:ObjectXSpectrometerResources):Promise<ObjectXSpectrometerInputs>{
 const checked=async(path:string,bytes:number,sha256:string)=>{const b=await r.file(path,bytes);if(b.byteLength!==bytes||await resourceSha256(b.slice().buffer as ArrayBuffer)!==sha256)throw new ObjectXSpectrometerError('resource');return b;};
 const [glx,qsoCatalog,qsoBytes,glimages,htl,spi,glxysp]=await Promise.all([r.glx(),r.qsoCatalog(),checked(QSO_SPECTRUM_FILE.path,QSO_SPECTRUM_FILE.bytes,QSO_SPECTRUM_FILE.sha256),checked(GLIMAGES_LST.path,GLIMAGES_LST.bytes,GLIMAGES_LST.sha256),r.objectXHotList(),checked(JSPEC2_SPI.path,JSPEC2_SPI.bytes,JSPEC2_SPI.sha256),checked(GLXYSP_LST.path,GLXYSP_LST.bytes,GLXYSP_LST.sha256)]);
 const starTemplates=new Map<string,UniformSpectrum>(),galaxySpectra=new Map<string,ReturnType<typeof parseLibrarySpectrum>>(),bitmaps=new Map<string,Bitmap8>();
 for(const t of OBJECT_X_STAR_TEMPLATES)starTemplates.set(t.file,starTemplateSpectrum(latin1(await checked(t.path,t.bytes,t.sha256))));
 for(const g of OBJECT_X_GALAXY_SPECTRA)galaxySpectra.set(g.file,parseLibrarySpectrum(latin1(await checked(g.path,g.bytes,g.sha256))));
 for(const b of OBJECT_X_PHOTOGRAPHS)bitmaps.set(b.file,decodeBitmap8(await checked(b.path,b.bytes,b.sha256)));
 // The photographic list as the original keeps it (photographicList.ts: malformed rows such as NGC 4449's are dropped).
 const photographRows=nativePhotographRows(glimages),photographs=photographRows.map(x=>({index:x.index,ra:x.ra,dec:x.dec})),packs=new Map<string,FieldPack>();
 for(const id of new Set(OBJECT_X_SPECTRUM_ROWS.map(x=>x.pack))){
  const raw=PACKS[id];if(!raw||PACK_DIGESTS[id]===undefined||await packDigest(raw)!==PACK_DIGESTS[id])throw new ObjectXSpectrometerError('pack');
  const p=decodeFieldPack(raw);if(p.id!==id)throw new ObjectXSpectrometerError('pack');packs.set(id,packWithPhotographs(p,photographs));
 }
 const rows=parseHtl(htl),rowPointings=new Map(OBJECT_X_SPECTRUM_ROWS.map(x=>[x.row,Object.freeze({ra:rows[x.row].ra,dec:rows[x.row].dec})])),rowCodes=new Map(OBJECT_X_SPECTRUM_ROWS.map(x=>[x.row,objectXCode(rows[x.row].id)]));
 for(const x of OBJECT_X_SPECTRUM_ROWS){const p=rowPointings.get(x.row)!;if(!packs.get(x.pack)!.pointings.some(q=>q.ra===p.ra&&q.dec===p.dec))throw new ObjectXSpectrometerError('pack');}
 const glxyspLines=latin1(glxysp).replace(/\x1a$/,'').split('\r\n').filter(l=>l!=='');
 return Object.freeze({packs,glx,qsoCatalog,qsoSpectrum:decodeQsoSpectrumFile(qsoBytes),rowPointings,rowCodes,starIndex:decodeStarIndexList(spi),starTemplates,glxyspLines,galaxySpectra,photographs:Object.freeze({rows:photographRows,bitmaps})});
}
export function browserObjectXResources():ObjectXSpectrometerResources{
 return Object.freeze({
  glx:()=>fetchBundledGlxCatalog(fetch,new AbortController().signal),
  qsoCatalog:()=>fetchBundledQsoCatalog(fetch,new AbortController().signal),
  file:async(path:string,bytes:number)=>{const res=await fetch(path,{credentials:'same-origin'});return new Uint8Array(await boundedResourceBody(res,bytes));},
  objectXHotList:async()=>(await fetchObjectXHotList(fetch,new AbortController().signal)).bytes,
 });
}
