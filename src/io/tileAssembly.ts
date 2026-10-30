// Front G: the same-origin sources every tiled field needs (tile index and store, CLEA_VStrs.dat, CLEA_QSO.DAT, GLIMAGES.LST
// and CLEA_GLX.DAT), loaded once and only when a tiled field is first needed; shared by the photometer (G3b) and the
// spectrometer (G4a). Each file is checked for its recorded size and SHA-256 by its own loader.
import type {AssemblySources} from './assembledFieldPack';
import {createGscTileStore,loadGscIndex} from './gscTiles';

export type TileSources=Readonly<{assembly:AssemblySources;glx:Uint8Array;qso:Readonly<{bytes:Uint8Array;sha256:string}>;glimages:Uint8Array}>;
let override:(()=>Promise<TileSources>)|null=null,shared:Promise<TileSources>|null=null;
/** Test seam: replace the same-origin sources. */
export function setTileSources(load:(()=>Promise<TileSources>)|null){override=load;shared=null;}
async function browserSources():Promise<TileSources>{
 const signal=new AbortController().signal;
 const [{fetchBundledVariableFile,BUNDLED_VARIABLE_STARS},{fetchBundledQsoCatalog},{fetchBundledHotList},{GLIMAGES_LST},{fetchBundledGlxCatalog}]=await Promise.all([import('./bundledVariableStars'),import('./bundledQsoCatalog'),import('./bundledHotList'),import('../core/lssLists'),import('./bundledGlxCatalog')]);
 const [index,variables,qso,glimages,glx]=await Promise.all([loadGscIndex(),fetchBundledVariableFile(fetch,signal,BUNDLED_VARIABLE_STARS),fetchBundledQsoCatalog(fetch,signal),fetchBundledHotList(fetch,signal,GLIMAGES_LST),fetchBundledGlxCatalog(fetch,signal)]);
 return {assembly:{index,tiles:createGscTileStore(),variables,variablesSha256:BUNDLED_VARIABLE_STARS.sha256,qso:qso.bytes,qsoSha256:qso.sha256,glimages:glimages.bytes},glx,qso,glimages:glimages.bytes};
}
export function tileSources():Promise<TileSources>{
 shared??=(override??browserSources)();shared.catch(()=>{shared=null;});
 return shared;
}
