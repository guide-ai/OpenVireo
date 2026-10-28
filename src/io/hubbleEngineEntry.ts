// Front F: preparation of ONE engine Hubble target on ONE recorded-available telescope (core/hubbleEnginePrepare.ts), with its
// bounded pack, the bundled CLEA_GLX.DAT and CLEA_QSO.DAT (size and SHA-256 checked) and its own library spectrum (SHA-256
// checked). Runs in the Worker io/hubbleEngineWorker.ts in the browser (review 2 finding 1: never on the main thread), and in
// process under tests through a resource seam. Resources are cached per resource source; a failure is not cached.
import comaPack from '../../data/hubble/engine-coma.json';
import bootesPack from '../../data/hubble/engine-bootes.json';
import {decodeFieldPack,type FieldPack} from '../core/fieldPack';
import {prepareHubbleEngineTarget,type PreparedEngineTarget} from '../core/hubbleEnginePrepare';
import {hubbleEngineRecord,HubbleEngineError,type ExtendedTelescope} from '../core/hubbleEngineTargets';
import type {FieldQsoCatalog,FieldLibrarySpectrum} from '../core/fieldEngine';
import {fetchBundledGlxCatalog} from './bundledGlxCatalog';
import {fetchBundledQsoCatalog} from './bundledQsoCatalog';
import {loadVerifiedLibrarySpectrum} from './spectrumFiles';

const PACKS:Readonly<Record<string,unknown>>={'hubble-engine-coma':comaPack,'hubble-engine-bootes':bootesPack};
export type HubbleEngineResources=Readonly<{glx:()=>Promise<Uint8Array>;qso:()=>Promise<FieldQsoCatalog>;spectrum:(file:string,sha256:string)=>Promise<FieldLibrarySpectrum['samples']>}>;
export const browserEngineResources:HubbleEngineResources=Object.freeze({
 glx:()=>fetchBundledGlxCatalog(fetch,new AbortController().signal),
 qso:()=>fetchBundledQsoCatalog(fetch,new AbortController().signal),
 spectrum:async(file:string,sha256:string)=>(await loadVerifiedLibrarySpectrum({url:`/original/spectra/${file}`,sha256})).samples,
});
const caches=new WeakMap<HubbleEngineResources,Map<string,Promise<unknown>>>();
function cached<T>(r:HubbleEngineResources,key:string,load:()=>Promise<T>):Promise<T>{
 let m=caches.get(r);if(!m){m=new Map();caches.set(r,m);}
 let p=m.get(key) as Promise<T>|undefined;if(!p){p=load();m.set(key,p);p.catch(()=>m!.delete(key));}
 return p;
}
const packs=new Map<string,FieldPack>();
function pack(id:string):FieldPack{
 let p=packs.get(id);if(p)return p;
 const raw=PACKS[id];if(!raw)throw new HubbleEngineError('pack');p=decodeFieldPack(raw);if(p.id!==id)throw new HubbleEngineError('pack');packs.set(id,p);return p;
}
export type PreparedEngineEntry=PreparedEngineTarget['entries'][number];
export async function prepareEngineEntry(id:string,telescope:ExtendedTelescope,r:HubbleEngineResources):Promise<PreparedEngineEntry>{
 const rec=hubbleEngineRecord(id);
 const [glx,qsoCatalog]=await Promise.all([cached(r,'glx',r.glx),cached(r,'qso',r.qso)]);
 const librarySpectra=new Map<string,FieldLibrarySpectrum['samples']>();
 if(rec.librarySpectrum)librarySpectra.set(rec.librarySpectrum.file,await cached(r,'spectrum:'+rec.librarySpectrum.file,()=>r.spectrum(rec.librarySpectrum!.file,rec.librarySpectrum!.sha256)));
 const prepared=prepareHubbleEngineTarget(id,{packs:new Map([[rec.pack,pack(rec.pack)]]),glx,qsoCatalog,librarySpectra},telescope);
 if(prepared.entries.length!==1)throw new HubbleEngineError('evidence');
 return prepared.entries[0];
}
