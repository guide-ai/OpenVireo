// Front L2: the LSS row inputs beyond the pack and CLEA_GLX.DAT (core/lssExposure.ts LssSpectrumInputs): GLXYSP.LST names, the
// bundled CLEA_QSO.DAT for the recovered QSO merge and the bundled own library spectra NGC4670.SP / NGC4889.SP. Same-origin, each
// checked for its recorded size and SHA-256 before use; nothing is persisted or sent anywhere.
import {LSS_OWN_SPECTRA,type LssSpectrumInputs} from '../core/lssExposure';
import {GLXYSP_LST,parseGlxyspNames} from '../core/lssLists';
import {fetchBundledHotList} from './bundledHotList';
import {fetchBundledQsoCatalog} from './bundledQsoCatalog';
import {loadVerifiedLibrarySpectrum} from './spectrumFiles';

export async function fetchLssSpectrumInputs(fetcher:typeof fetch,signal:AbortSignal):Promise<LssSpectrumInputs>{
 const [names,qsoCatalog,...own]=await Promise.all([
  fetchBundledHotList(fetcher,signal,GLXYSP_LST).then(b=>parseGlxyspNames(b.bytes)),
  fetchBundledQsoCatalog(fetcher,signal),
  ...LSS_OWN_SPECTRA.map(s=>loadVerifiedLibrarySpectrum({url:`/original/spectra/${s.file}`,sha256:s.sha256},signal)),
 ]);
 return Object.freeze({names:names as ReadonlySet<string>,qsoCatalog:qsoCatalog as LssSpectrumInputs['qsoCatalog'],
  ownSpectra:new Map(LSS_OWN_SPECTRA.map((s,i)=>[s.file,(own[i] as Awaited<ReturnType<typeof loadVerifiedLibrarySpectrum>>).samples]))});
}
