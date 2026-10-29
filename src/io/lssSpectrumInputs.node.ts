// Front L2: the LSS row inputs read from the repository files, for tests and research harnesses (Node only; never imported by
// the app). Each file is checked against its recorded SHA-256, as the browser loader (lssSpectrumInputs.ts) does.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LSS_OWN_SPECTRA,type LssSpectrumInputs} from '../core/lssExposure';
import {parseGlxyspNames} from '../core/lssLists';
import {parseLibrarySpectrum} from '../core/spectrum';
import {QSO_CATALOG} from '../core/qsoMerge';

const original=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
export function repositoryLssSpectrumInputs():LssSpectrumInputs{
 const qso=original('catalogs/CLEA_QSO.DAT');if(sha(qso)!==QSO_CATALOG.sha256)throw new Error('CLEA_QSO.DAT');
 const ownSpectra=new Map(LSS_OWN_SPECTRA.map(s=>{const b=original('spectra/'+s.file);if(b.byteLength!==s.bytes||sha(b)!==s.sha256)throw new Error(s.file);return [s.file,parseLibrarySpectrum(new TextDecoder('latin1').decode(b))] as const;}));
 return Object.freeze({names:parseGlxyspNames(original('spectra/GLXYSP.LST')),qsoCatalog:Object.freeze({bytes:qso,sha256:QSO_CATALOG.sha256}),ownSpectra});
}
