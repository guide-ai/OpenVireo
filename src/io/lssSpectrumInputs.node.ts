// Front L2: the LSS row inputs read from the repository files, for tests and research harnesses (Node only; never imported by
// the app). Each file is checked against its recorded SHA-256, as the browser loader (lssSpectrumInputs.ts) does.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LSS_OWN_SPECTRA,type LssSpectrumInputs} from '../core/lssExposure';
import {GLIMAGES_LST,parseGlxyspNames} from '../core/lssLists';
import {nativePhotographRows} from '../core/photographicList';
import {decodeBitmap8} from '../core/photographDraw';
import {APPROVED_PHOTOGRAPHS} from '../core/approvedPhotographs';
import {parseLibrarySpectrum} from '../core/spectrum';
import {QSO_CATALOG} from '../core/qsoMerge';

const original=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
export function repositoryLssSpectrumInputs():LssSpectrumInputs{
 const qso=original('catalogs/CLEA_QSO.DAT');if(sha(qso)!==QSO_CATALOG.sha256)throw new Error('CLEA_QSO.DAT');
 const ownSpectra=new Map(LSS_OWN_SPECTRA.map(s=>{const b=original('spectra/'+s.file);if(b.byteLength!==s.bytes||sha(b)!==s.sha256)throw new Error(s.file);return [s.file,parseLibrarySpectrum(new TextDecoder('latin1').decode(b))] as const;}));
 const checked=(path:string,bytes:number,sum:string)=>{const b=original(path.replace(/^\/original\//,''));if(b.byteLength!==bytes||sha(b)!==sum)throw new Error(path);return b;};
 const rows=nativePhotographRows(checked(GLIMAGES_LST.path,GLIMAGES_LST.bytes,GLIMAGES_LST.sha256));
 const bitmaps=new Map(APPROVED_PHOTOGRAPHS.map(p=>[p.file,decodeBitmap8(checked(p.path,p.bytes,p.sha256))] as const));
 return Object.freeze({names:parseGlxyspNames(original('spectra/GLXYSP.LST')),qsoCatalog:Object.freeze({bytes:qso,sha256:QSO_CATALOG.sha256}),ownSpectra,photographs:Object.freeze({rows,bitmaps})});
}
