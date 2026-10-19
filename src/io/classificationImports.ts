import {readImportedSpectrum,verifyImportedSpectrumText,type ImportedSpectrum} from './spectrumFiles';
import {checkClassificationImports,MAX_CLASSIFICATION_IMPORTS,MAX_CLASSIFICATION_IMPORT_BYTES,type ClassificationImport} from '../core/classificationImport';
export function classificationImportFromDecoded(name:string,decoded:ImportedSpectrum):ClassificationImport{const s=Object.freeze({...decoded,name,kind:'imported-spectrum' as const});checkClassificationImports([s]);return s;}
export async function readClassificationImport(file:File):Promise<ClassificationImport>{return classificationImportFromDecoded(file.name,await readImportedSpectrum(file));}
function object(v:unknown,keys:string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))throw Error('Invalid imported classification schema');return v as Record<string,unknown>;}
/** Session imports accept bytes and input state only. Never trust saved samples,
 * header claims, grids or a computed digest; reparse using the existing parser. */
export async function restoreClassificationImportWorkspace(value:unknown):Promise<unknown>{
 if(!value||typeof value!=='object'||!Object.hasOwn(value,'imports'))throw Error('Missing classification imports');
 const imports=(value as {imports:unknown}).imports;
 if(!Array.isArray(imports)||imports.length<1||imports.length>MAX_CLASSIFICATION_IMPORTS)throw Error('Classification import archive limit');
 let bytes=0;const entries=[];
 for(const input of imports){const e=object(input,['source','state']),s=object(e.source,['name','sha256','sourceText']);if(typeof s.name!=='string'||typeof s.sha256!=='string'||typeof s.sourceText!=='string')throw Error('Invalid classification import');bytes+=new TextEncoder().encode(s.sourceText).byteLength;if(bytes>MAX_CLASSIFICATION_IMPORT_BYTES)throw Error('Classification import byte budget');const source=classificationImportFromDecoded(s.name,await verifyImportedSpectrumText(s.sourceText,s.sha256));entries.push({source,state:e.state});}
 checkClassificationImports(entries.map(e=>e.source));return {...value,imports:entries};
}
