import legacyMain from '../../data/classification/legacy-main-inventory.json';
import catalog from '../../data/classification/catalog.json';
import type {Sample} from './spectrum';
import {readFeatures,type FeatureWorkspace} from './featureWidth';
import {classificationCoverage,classificationImportDifferenceAllowed,checkClassificationImports,type ClassificationImport} from './classificationImport';
export {classificationCoverage} from './classificationImport';
export const CLASSIFICATION_CATALOG=catalog;
export const MAX_CLASSIFICATIONS=100;
export const CLASSIFICATION_MAIN_FINGERPRINT=legacyMain.fingerprint;
export const mainClassificationCompatible=JSON.stringify(catalog.standards)===JSON.stringify(legacyMain.standards)&&JSON.stringify(catalog.practice)===JSON.stringify(legacyMain.practice)&&JSON.stringify(catalog.lines)===JSON.stringify(legacyMain.lines)&&catalog.lineListSha256===legacyMain.lineListSha256&&catalog.atlasSha256===legacyMain.atlasSha256;
export function classificationAtlas(id:string){const a=catalog.atlases.find(a=>a.id===id);if(!a)throw Error('Unknown original spectral atlas');return a;}

export type ClassificationDraft=Readonly<{unknownId:string;atlasId:string;pair:number;mode:'bracket'|'difference';line:number;proposed:string;reason:string}>;
export type ClassificationRecord=ClassificationDraft&Readonly<{id:number}>;
export type ClassificationState=ClassificationDraft&Readonly<{records:readonly ClassificationRecord[];features?:FeatureWorkspace}>;
export const INITIAL_CLASSIFICATION:ClassificationState=Object.freeze({unknownId:'u1',atlasId:'main',pair:0,mode:'bracket',line:-1,proposed:'',reason:'',records:Object.freeze([])});
export function practiceSpectrum(id:string){const found=catalog.practice.find(p=>p.id===id);if(!found)throw Error('Unknown practice spectrum');return found;}
export type ClassificationExternalSource=ClassificationAcquisition|ClassificationImport;
export type ClassificationAcquisition=Readonly<{kind:'catalog-star-acquisition';acquisitionId:string;sha256:string;name:string;samples:readonly Sample[]}>;
export function classificationSource(id:string,acquisitions:readonly ClassificationExternalSource[]=[]){
 if(id.startsWith('imported:')){const sha256=id.slice(9),p=acquisitions.find(p=>p.kind==='imported-spectrum'&&p.sha256===sha256);if(!p||p.kind!=='imported-spectrum')throw Error('Missing imported classification source');checkClassificationImports([p]);return {id,label:p.name,file:p.name,url:'',sha256:p.sha256,rows:p.samples.length,minimum:p.samples[0].wavelength,maximum:p.samples.at(-1)!.wavelength,kind:'imported-spectrum' as const,acquisitionId:''};}
 if(!id.startsWith('acquired:'))return {...practiceSpectrum(id),kind:'practice' as const,acquisitionId:''};
 const acquisitionId=id.slice(9),p=acquisitions.find(p=>p.kind==='catalog-star-acquisition'&&p.acquisitionId===acquisitionId);
 if(!/^[a-f0-9]{64}$/.test(acquisitionId)||!p||p.kind!=='catalog-star-acquisition'||!classificationCoverage(p.samples))throw Error('Unsupported acquired classification source');
 return {id,label:'N0000.DAT@14428 · '+acquisitionId.slice(0,12),file:p.name,url:'',sha256:p.sha256,rows:p.samples.length,minimum:p.samples[0].wavelength,maximum:p.samples.at(-1)!.wavelength,kind:'acquired-star' as const,acquisitionId};
}
function object(value:unknown,keys:readonly string[]):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid classification schema');return value as Record<string,unknown>;}
function text(value:unknown,max:number):string{if(typeof value!=='string'||value.length>max)throw Error('Invalid classification text');return value;}
const draftKeys=['unknownId','atlasId','pair','mode','line','proposed','reason'];
function draft(r:Record<string,unknown>,acquisitions:readonly ClassificationExternalSource[]):ClassificationDraft{
 const unknownId=text(r.unknownId,80),atlasId=text(r.atlasId,16),atlas=classificationAtlas(atlasId);const source=classificationSource(unknownId,acquisitions);
 if(source.kind==='imported-spectrum'&&r.mode==='difference'&&!classificationImportDifferenceAllowed(acquisitions.find(p=>p.kind==='imported-spectrum'&&p.sha256===source.sha256)!))throw Error('Imported grid difference is unsupported');
 if(source.kind==='acquired-star'&&r.mode!=='bracket')throw Error('Acquired grid difference is unsupported');
 if(!Number.isInteger(r.pair)||(r.pair as number)<0||(r.pair as number)>=atlas.standards.length-1||(r.mode!=='bracket'&&r.mode!=='difference')||!Number.isInteger(r.line)||(r.line as number)<-1||(r.line as number)>=catalog.lines.length)throw Error('Invalid classification display');
 return Object.freeze({unknownId,atlasId,pair:r.pair as number,mode:r.mode as ClassificationDraft['mode'],line:r.line as number,proposed:text(r.proposed,40),reason:text(r.reason,1000)});
}
export function readClassificationState(value:unknown,acquisitions:readonly ClassificationExternalSource[]=[],legacyMainOnly=false,allowFeatures=true):ClassificationState{
 const keys=legacyMainOnly?draftKeys.filter(k=>k!=='atlasId'):draftKeys;
 const hasFeatures=!!value&&typeof value==='object'&&Object.hasOwn(value,'features');
 if(hasFeatures&&(legacyMainOnly||!allowFeatures))throw Error('Feature context requires a new session schema');
 const r=object(value,[...keys,'records',...(hasFeatures?['features']:[])]),d=draft(legacyMainOnly?{...r,atlasId:'main'}:r,acquisitions);if(!Array.isArray(r.records)||r.records.length>MAX_CLASSIFICATIONS)throw Error('Classification log limit');
 let last=0;const records=r.records.map(value=>{const v=object(value,[...keys,'id']),record=draft(legacyMainOnly?{...v,atlasId:'main'}:v,acquisitions);if(!Number.isSafeInteger(v.id)||(v.id as number)<=last||(v.id as number)>=Number.MAX_SAFE_INTEGER||!record.proposed.trim()||!record.reason.trim())throw Error('Invalid classification record');last=v.id as number;return Object.freeze({...record,id:last});});
 if(hasFeatures&&(d.unknownId.startsWith('acquired:')||d.unknownId.startsWith('imported:')))throw Error('Acquired feature measurement is unsupported');
 return Object.freeze({...d,records:Object.freeze(records),...(hasFeatures?{features:readFeatures(r.features,catalog.practice.map(p=>p.id))}:{})});
}
/** Manual interpretation only. A reference choice is never an answer or grade. */
export function classificationRecord(state:ClassificationState,acquisitions:readonly ClassificationExternalSource[]=[]):ClassificationRecord{
 const s=readClassificationState(state,acquisitions),id=(s.records.at(-1)?.id??0)+1;
 if(s.records.length>=MAX_CLASSIFICATIONS||id>=Number.MAX_SAFE_INTEGER||!s.proposed.trim()||!s.reason.trim())throw Error('Supply a manual type and evidence before recording');
 return Object.freeze({unknownId:s.unknownId,atlasId:s.atlasId,pair:s.pair,mode:s.mode,line:s.line,proposed:s.proposed.trim(),reason:s.reason.trim(),id});
}
/** Manual-prescribed difference with a NEW bounded Number/no-interpolation
 * policy. These original assets share every printed wavelength. No residual
 * score, best-match search, auto classification, alignment or native oracle. */
export function classificationDifference(standard:readonly Sample[],unknown:readonly Sample[]):readonly Sample[]{
 if(standard.length!==unknown.length||!standard.length)throw Error('Difference requires an identical printed grid');
 return Object.freeze(standard.map((p,i)=>{const q=unknown[i];if(p.wavelength!==q.wavelength||!Number.isFinite(p.intensity)||!Number.isFinite(q.intensity))throw Error('Difference requires an identical finite printed grid');const intensity=p.intensity-q.intensity;if(!Number.isFinite(intensity))throw Error('Difference outside supported range');return Object.freeze({wavelength:p.wavelength,intensity});}));
}
function cell(s:string|number){if(typeof s==='number')return String(s);const value=/^[\s\u0000-\u001f]*[=+\-@]/.test(s)?"'"+s:s;return '"'+value.replaceAll('"','""')+'"';}
/** Atlas membership and hash belong to each recorded comparison, not the
 * currently selected atlas. No luminosity/temperature/distance formula is added. */
export function classificationCsv(state:ClassificationState,acquisitions:readonly ClassificationExternalSource[]=[]):string{
 const s=readClassificationState(state,acquisitions),acquired=s.records.some(r=>r.unknownId.startsWith('acquired:')),imported=s.records.some(r=>r.unknownId.startsWith('imported:')),luminosity=s.records.some(r=>r.atlasId!=='main');
 const header='schema,id,'+(imported?'source_object,source_file,source_sha256':'practice_object,practice_file,practice_sha256')+',proposed_type,evidence,upper_standard,lower_standard,mode,marker_wavelength_A,marker_label,atlas_sha256,dataset_fingerprint,policy'+(imported?',source_kind,source_identity':acquired?',source_kind,acquisition_id':'')+(luminosity||imported?',atlas_id,atlas_label,atlas_file':'');
 return [header,...s.records.map(r=>{const p=classificationSource(r.unknownId,acquisitions),a=classificationAtlas(r.atlasId);return [imported?4:luminosity?3:acquired?2:1,r.id,p.label,p.file,p.sha256,r.proposed,r.reason,a.standards[r.pair].label,a.standards[r.pair+1].label,r.mode,r.line<0?'':catalog.lines[r.line].wavelength,r.line<0?'':catalog.lines[r.line].label,a.sha256,luminosity||imported?catalog.fingerprint:CLASSIFICATION_MAIN_FINGERPRINT,p.kind==='imported-spectrum'?'manual_response_not_graded;imported_printed_grid_no_resampling':p.kind==='practice'?'manual_response_not_graded;printed_grid_Number_difference_unverified':'manual_response_not_graded;acquired_printed_grid_no_resampling',...(acquired||imported?[p.kind,p.kind==='imported-spectrum'?r.unknownId:p.acquisitionId]:[]),...(luminosity||imported?[a.id,a.label,a.file]:[])].map(cell).join(',');})].join('\r\n')+'\r\n';
}
export function classificationUsesNewAtlas(s:ClassificationState):boolean{return !!s.features||!mainClassificationCompatible||[s,...s.records].some(r=>r.atlasId!=='main');}
/** Explicit downgrade only for unchanged main-sequence data. Old schemas
 * never carried an atlas key and may not claim a luminosity comparison. */
export function legacyClassificationState(s:ClassificationState){if(classificationUsesNewAtlas(s))throw Error('Legacy schema cannot identify this atlas/feature context');const {atlasId,records,...current}=s;void atlasId;return {...current,records:records.map(({atlasId,...r})=>{void atlasId;return r;})};}



export type ClassificationWorkspace=Readonly<{practice:ClassificationState;imports?:readonly Readonly<{source:ClassificationImport;state:ClassificationState}>[];acquired:readonly Readonly<{acquisitionId:string;state:ClassificationState}>[];active:string}>;
export const EMPTY_CLASSIFICATION_WORKSPACE:ClassificationWorkspace=Object.freeze({practice:INITIAL_CLASSIFICATION,acquired:Object.freeze([]),active:'practice'});
export function currentClassification(w:ClassificationWorkspace):ClassificationState{return w.active==='practice'?w.practice:w.active.startsWith('imported:')?w.imports!.find(e=>'imported:'+e.source.sha256===w.active)!.state:w.acquired.find(a=>a.acquisitionId===w.active)!.state;}
export function readClassificationWorkspace(value:unknown,acquisitions:readonly ClassificationAcquisition[],legacyMainOnly=false,allowFeatures=true,allowImports=true):ClassificationWorkspace{
 const hasImports=!!value&&typeof value==='object'&&Object.hasOwn(value,'imports');if(hasImports&&(!allowImports||legacyMainOnly))throw Error('Imports require a new session schema');
 const w=object(value,['practice','acquired','active',...(hasImports?['imports']:[])]);const practice=readClassificationState(w.practice,[],legacyMainOnly,allowFeatures);
 if(!Array.isArray(w.acquired)||w.acquired.length>8||typeof w.active!=='string')throw Error('Invalid classification archive');
 const seen=new Set<string>();const acquired=w.acquired.map(v=>{const a=object(v,['acquisitionId','state']);if(typeof a.acquisitionId!=='string'||seen.has(a.acquisitionId))throw Error('Invalid classification link');seen.add(a.acquisitionId);const state=readClassificationState(a.state,acquisitions,legacyMainOnly,allowFeatures);if(state.unknownId!=='acquired:'+a.acquisitionId||state.records.some(r=>r.unknownId!==state.unknownId))throw Error('Mismatched classification link');return Object.freeze({acquisitionId:a.acquisitionId,state});});
 let imports:NonNullable<ClassificationWorkspace['imports']>|undefined;
 if(hasImports){if(!Array.isArray(w.imports)||!w.imports.length)throw Error('Missing import archive');const entries=w.imports.map(v=>object(v,['source','state']));checkClassificationImports(entries.map(e=>e.source as ClassificationImport));imports=Object.freeze(entries.map(e=>{const source=e.source as ClassificationImport,state=readClassificationState(e.state,[source],false,false);if(state.unknownId!=='imported:'+source.sha256||state.records.some(r=>r.unknownId!==state.unknownId))throw Error('Mismatched import response');return Object.freeze({source,state});}));}
 if(w.active!=='practice'&&!imports?.some(e=>'imported:'+e.source.sha256===w.active)&&!seen.has(w.active))throw Error('Missing classification selection');
 if(practice.records.length+acquired.reduce((n,a)=>n+a.state.records.length,0)+(imports?.reduce((n,e)=>n+e.state.records.length,0)??0)>MAX_CLASSIFICATIONS)throw Error('Classification log limit');
 return Object.freeze({practice,acquired:Object.freeze(acquired),active:w.active,...(imports?{imports}:{})});
}
export function openAcquiredClassification(w:ClassificationWorkspace,p:ClassificationAcquisition):ClassificationWorkspace{
 classificationSource('acquired:'+p.acquisitionId,[p]);
 return {...w,active:p.acquisitionId,acquired:w.acquired.some(a=>a.acquisitionId===p.acquisitionId)?w.acquired:[...w.acquired,{acquisitionId:p.acquisitionId,state:{...INITIAL_CLASSIFICATION,unknownId:'acquired:'+p.acquisitionId}}]};
}
export function updateClassification(w:ClassificationWorkspace,state:ClassificationState):ClassificationWorkspace{return w.active==='practice'?{...w,practice:state}:w.active.startsWith('imported:')?{...w,imports:w.imports!.map(e=>'imported:'+e.source.sha256===w.active?{...e,state}:e)}:{...w,acquired:w.acquired.map(a=>a.acquisitionId===w.active?{...a,state}:a)};}
export function classificationWorkspaceUsed(w:ClassificationWorkspace):boolean{return w.active!=='practice'||!!w.acquired.length||!!w.imports?.length||JSON.stringify(w.practice)!==JSON.stringify(INITIAL_CLASSIFICATION);}

export function classificationWorkspaceUsesNewAtlas(w:ClassificationWorkspace):boolean{return classificationUsesNewAtlas(w.practice)||w.acquired.some(a=>classificationUsesNewAtlas(a.state));}
export function legacyClassificationWorkspace(w:ClassificationWorkspace){if(w.imports?.length)throw Error('Cannot downgrade imported classification');return {practice:legacyClassificationState(w.practice),acquired:w.acquired.map(a=>({acquisitionId:a.acquisitionId,state:legacyClassificationState(a.state)})),active:w.active};}

export function classificationWorkspaceHasFeatures(w:ClassificationWorkspace):boolean{return !!w.practice.features||w.acquired.some(a=>!!a.state.features);}

export function classificationExternalSources(w:ClassificationWorkspace,acquisitions:readonly ClassificationAcquisition[]):readonly ClassificationExternalSource[]{return [...acquisitions,...(w.imports??[]).map(e=>e.source)];}
export function openImportedClassification(w:ClassificationWorkspace,source:ClassificationImport):ClassificationWorkspace{const existing=w.imports?.find(e=>e.source.sha256===source.sha256);const imports=existing?w.imports!:[...(w.imports??[]),{source,state:{...INITIAL_CLASSIFICATION,unknownId:'imported:'+source.sha256}}];checkClassificationImports(imports.map(e=>e.source));return {...w,imports,active:'imported:'+source.sha256};}
export function portableClassificationWorkspace(w:ClassificationWorkspace){return w.imports?.length?{...w,imports:w.imports.map(e=>({state:e.state,source:{name:e.source.name,sha256:e.source.sha256,sourceText:e.source.sourceText}}))}:w;}
