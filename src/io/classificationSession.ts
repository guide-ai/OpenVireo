import legacy from '../../data/classification/legacy-v1-inventory.json';
import {CLASSIFICATION_CATALOG,CLASSIFICATION_MAIN_FINGERPRINT,mainClassificationCompatible,classificationUsesNewAtlas,legacyClassificationState,readClassificationState,type ClassificationState} from '../core/classification';
export const MAX_CLASSIFICATION_BYTES=1024*1024;
const FORMAT='OpenCLEA stellar classification session';
const LEGACY_INVENTORY=legacy.fingerprint;
const legacyCompatible=JSON.stringify(CLASSIFICATION_CATALOG.standards)===JSON.stringify(legacy.standards)&&JSON.stringify(CLASSIFICATION_CATALOG.practice.slice(0,3))===JSON.stringify(legacy.practice)&&CLASSIFICATION_CATALOG.lineListSha256===legacy.lineListSha256&&CLASSIFICATION_CATALOG.atlasSha256===legacy.atlasSha256;
/** New portable lab schema, separate from acquired/Hubble analysis sessions.
 * Source inventory fingerprint binds fixed practice/atlas choices; no imported
 * answer, expected type, sample array or cached computed result is trusted. */
export function parseClassificationSession(value:unknown):ClassificationState{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid classification session');
 const r=value as Record<string,unknown>,keys=['format','version','datasetFingerprint','state'];
 if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||r.format!==FORMAT||(r.version!==1&&r.version!==2&&r.version!==3)||(r.version!==1?r.datasetFingerprint!==CLASSIFICATION_CATALOG.fingerprint:!mainClassificationCompatible||(r.datasetFingerprint!==CLASSIFICATION_MAIN_FINGERPRINT&&r.datasetFingerprint!==LEGACY_INVENTORY)))throw Error('Unsupported classification session');
 const state=readClassificationState(r.state,[],r.version===1,r.version===3);
 if(r.datasetFingerprint===LEGACY_INVENTORY&&(!legacyCompatible||[state,...state.records].some(s=>!['u1','u2','u3'].includes(s.unknownId))))throw Error('Legacy inventory does not contain that practice');
 return state;
}
export function serializeClassificationSession(state:ClassificationState):string{
 const s=readClassificationState(state),modern=classificationUsesNewAtlas(s);
 return JSON.stringify({format:FORMAT,version:s.features?3:modern?2:1,datasetFingerprint:modern?CLASSIFICATION_CATALOG.fingerprint:CLASSIFICATION_MAIN_FINGERPRINT,state:modern?s:legacyClassificationState(s)},null,2)+'\n';
}
export async function readClassificationSession(file:File):Promise<ClassificationState>{
 if(file.size>MAX_CLASSIFICATION_BYTES)throw Error('Classification file too large');const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_CLASSIFICATION_BYTES)throw Error('Classification file too large');
 return parseClassificationSession(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
}
