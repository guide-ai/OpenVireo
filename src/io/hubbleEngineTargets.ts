// Front F: asynchronous, hash-checked preparation of the general-field-engine Hubble targets (core/hubbleEngineTargets.ts,
// core/hubbleEnginePrepare.ts). Loads the bounded derived packs (lazily imported modules), the bundled CLEA_GLX.DAT and
// CLEA_QSO.DAT (size and SHA-256 checked) and each target's own library spectrum (SHA-256 checked), prepares every recorded
// telescope, checks the crop digest against data/hubble/engine-targets.json and only then registers the definitions into
// core/galaxyExposure.ts. One shared attempt; a failure is reported and a later call retries. Nothing is persisted or sent.
import {decodeFieldPack,type FieldPack} from '../core/fieldPack';
import {HUBBLE_ENGINE_RECORD,HUBBLE_EXTENDED_TARGETS,HubbleEngineError} from '../core/hubbleEngineTargets';
import type {FieldQsoCatalog,FieldLibrarySpectrum} from '../core/fieldEngine';
import {resourceSha256} from './boundedResource';

const PACKS:Record<string,()=>Promise<{default:unknown}>>={
 'hubble-engine-coma':()=>import('../../data/hubble/engine-coma.json'),
 'hubble-engine-bootes':()=>import('../../data/hubble/engine-bootes.json'),
};
export type HubbleEngineResources=Readonly<{glx:()=>Promise<Uint8Array>;qso:()=>Promise<FieldQsoCatalog>;spectrum:(file:string,sha256:string)=>Promise<FieldLibrarySpectrum['samples']>}>;
const browserResources:HubbleEngineResources={
 glx:async()=>(await import('./bundledGlxCatalog')).fetchBundledGlxCatalog(fetch,new AbortController().signal),
 qso:async()=>(await import('./bundledQsoCatalog')).fetchBundledQsoCatalog(fetch,new AbortController().signal),
 spectrum:async(file,sha256)=>(await (await import('./spectrumFiles')).loadVerifiedLibrarySpectrum({url:`/original/spectra/${file}`,sha256})).samples,
};
let resources:HubbleEngineResources=browserResources,pending:Promise<void>|null=null,done=false;
/** Test seam (recorded local bytes instead of same-origin fetches); null restores the browser loaders. */
export function setHubbleEngineResources(r:HubbleEngineResources|null){resources=r??browserResources;pending=null;done=false;}
export function hubbleEngineTargetsReady():boolean{return done;}
async function run():Promise<void>{
 // Only targets enabled on some telescope are prepared (a recorded-unavailable target, e.g. Boötes, needs no field here).
 const targets=HUBBLE_ENGINE_RECORD.targets.filter(t=>HUBBLE_EXTENDED_TARGETS.some(x=>x.route==='engine'&&x.id===t.id));
 const packs=new Map<string,FieldPack>();
 for(const id of new Set(targets.map(t=>t.pack))){const load=PACKS[id];if(!load)throw new HubbleEngineError('pack');const p=decodeFieldPack((await load()).default);if(p.id!==id)throw new HubbleEngineError('pack');packs.set(id,p);}
 const [glx,qsoCatalog,{prepareHubbleEngineTarget},{registerEngineGalaxy}]=await Promise.all([resources.glx(),resources.qso(),import('../core/hubbleEnginePrepare'),import('../core/galaxyExposure')]);
 const librarySpectra=new Map<string,FieldLibrarySpectrum['samples']>();
 for(const t of targets)if(t.librarySpectrum)librarySpectra.set(t.librarySpectrum.file,await resources.spectrum(t.librarySpectrum.file,t.librarySpectrum.sha256));
 const prepared=targets.map(t=>prepareHubbleEngineTarget(t.id,{packs,glx,qsoCatalog,librarySpectra}));
 for(const p of prepared)for(const e of p.entries){
  const recorded=(HUBBLE_ENGINE_RECORD.targets.find(t=>t.id===p.id)!.telescopes as readonly {telescope:number;cropSHA256?:string}[]).find(x=>x.telescope===e.definition.domain.telescopeRecord);
  if(!recorded||await resourceSha256(e.configuration.viewport.rgb as Uint8Array<ArrayBuffer>)!==recorded.cropSHA256)throw new HubbleEngineError('evidence');
 }
 for(const p of prepared)for(const e of p.entries)registerEngineGalaxy(e.definition,e.configuration);
 done=true;
}
/** Resolves when every engine target is registered; rejects with a typed error (and allows a retry) otherwise. */
export function ensureHubbleEngineTargets():Promise<void>{
 if(done)return Promise.resolve();
 pending??=run().catch(e=>{pending=null;throw e;});
 return pending;
}
