// Front L2: the LSS row inputs beyond the pack and CLEA_GLX.DAT (core/lssExposure.ts LssSpectrumInputs): GLXYSP.LST names, the
// bundled CLEA_QSO.DAT for the recovered QSO merge, the bundled own library spectra NGC4670.SP / NGC4889.SP and (Front F3)
// GLIMAGES.LST with the five LSS photographs (none of the Object X four lies in the strip; F3 review 1 I3). Same-origin, each
// checked for its recorded size and SHA-256 before use; nothing is persisted or sent anywhere.
import {LSS_OWN_SPECTRA,type LssSpectrumInputs} from '../core/lssExposure';
import {GLIMAGES_LST,GLXYSP_LST,parseGlxyspNames} from '../core/lssLists';
import {nativePhotographRows} from '../core/photographicList';
import {decodeBitmap8} from '../core/photographDraw';
import {LSS_PHOTOGRAPHS} from '../core/approvedPhotographs';
import {fetchBundledHotList} from './bundledHotList';
import {fetchBundledQsoCatalog} from './bundledQsoCatalog';
import {loadVerifiedLibrarySpectrum} from './spectrumFiles';

export async function fetchLssSpectrumInputs(fetcher:typeof fetch,signal:AbortSignal):Promise<LssSpectrumInputs>{
 const [names,qsoCatalog,glimages,bitmaps,...own]=await Promise.all([
  fetchBundledHotList(fetcher,signal,GLXYSP_LST).then(b=>parseGlxyspNames(b.bytes)),
  fetchBundledQsoCatalog(fetcher,signal),
  fetchBundledHotList(fetcher,signal,GLIMAGES_LST).then(b=>nativePhotographRows(b.bytes)),
  // One photograph that cannot be loaded leaves only its own rows photographic-image (its bitmap is absent); an abort still stops.
  Promise.all(LSS_PHOTOGRAPHS.map(p=>fetchBundledHotList(fetcher,signal,{name:p.file,path:p.path,bytes:p.bytes,sha256:p.sha256}).then(b=>[p.file,decodeBitmap8(b.bytes)] as const,(e:unknown)=>{if(signal.aborted)throw e;return null;}))).then(list=>list.filter(x=>x!==null)),
  ...LSS_OWN_SPECTRA.map(s=>loadVerifiedLibrarySpectrum({url:`/original/spectra/${s.file}`,sha256:s.sha256},signal)),
 ]);
 return Object.freeze({names:names as ReadonlySet<string>,qsoCatalog:qsoCatalog as LssSpectrumInputs['qsoCatalog'],
  ownSpectra:new Map(LSS_OWN_SPECTRA.map((s,i)=>[s.file,(own[i] as Awaited<ReturnType<typeof loadVerifiedLibrarySpectrum>>).samples])),
  photographs:Object.freeze({rows:glimages as LssSpectrumInputs['photographs']['rows'],bitmaps:new Map(bitmaps as readonly (readonly [string,ReturnType<typeof decodeBitmap8>])[])})});
}
