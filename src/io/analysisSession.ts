import {CLUSTER_SELECTION_POLICY,CLUSTER_SELECTION_SHA256,type ClusterSelectionWorkspace} from '../core/clusterSelection';
import {readClusterComparisonWorkspace,CLUSTER_COMPARISON_SHA256,CLUSTER_COMPARISON_POLICY,type ClusterComparisonWorkspace} from '../core/clusterComparison';
import {NATIVE_CLUSTER_POLICY,NATIVE_CLUSTER_SHA256} from '../core/nativeCluster';
import {readClusterDatabaseWorkspace,CLUSTER_DATABASE_POLICY,CLUSTER_DATABASE_SHA256,type ClusterDatabaseWorkspace} from '../core/clusterDatabase';
import {decodeSessionNumber,encodeSessionNumber} from '../core/sessionNumber';
import {galaxyTelescopeIndex} from '../core/galaxyTelescope';
import {OBSERVING_SKY_POLICY,OBSERVING_OPTICAL_POLICY,OBSERVING_GALAXY_POLICY,OBSERVING_MAYALL_POLICY,OBSERVING_CLOCK_POLICY,OBSERVING_DRIVE_POLICY,OBSERVING_ACCESS_POLICY} from '../core/observingWorkspace';
import {starTelescopeIndex} from '../core/starTelescope';
import {portableOpticalWorkspace,readOpticalWorkspace,type OpticalWorkspace} from '../core/opticalTelescope';
import {readEditingWorkspace,EDITING_POLICY,editingWorkspacePolicy,type EditingWorkspace} from '../core/editingWorkspace';
import type {ObservingWorkspace} from '../core/observingWorkspace';
import type {PhotometerState} from '../core/photometer';
import {CLASSIFICATION_IMPORT_POLICY} from '../core/classificationImport';
import {restoreClassificationImportWorkspace} from './classificationImports';
import {parseClassificationSession,MAX_CLASSIFICATION_BYTES} from './classificationSession';
import type {ClassificationState} from '../core/classification';
import {CLASSIFICATION_CATALOG,CLASSIFICATION_MAIN_FINGERPRINT,mainClassificationCompatible,classificationWorkspaceUsesNewAtlas,classificationWorkspaceHasFeatures,classificationExternalSources,portableClassificationWorkspace,legacyClassificationWorkspace,readClassificationWorkspace,currentClassification,type ClassificationWorkspace} from '../core/classification';
import {loadClassificationSources} from './classificationSources';
import {measurementGalaxyTarget} from '../core/galaxyIdentity';
import {LEGACY_MAX_ACQUISITION_ARCHIVE,MAX_ACQUISITION_ARCHIVE,MAX_ARCHIVE_EVENTS} from '../core/acquisitionArchive';
import {acquisitionObjectId,acquisitionJournalText,restoreAcquisitionObservation,type AcquisitionObservation} from './acquisitionObservation';
import {EMPTY_HUBBLE,readHubbleWorkspace,type HubbleWorkspace} from '../core/hubbleAnalysis';
import { createMeasurement, currentZ, type Measurement, type ShiftControl } from '../core/spectrum';
import { verifyImportedSpectrumText, type ImportedSpectrum } from './spectrumFiles';

/** New portable browser format, not the original CLEA saved-spectrum format. */
export const MAX_SESSION_BYTES=16*1024*1024;
export const MAX_SESSION_ROWS=1000;
const FORMAT='OpenCLEA analysis session', POLICY='Number_x87_equivalence_unvalidated';
const REFERENCES={galaxy:'GLXYLNS.LST',balmer:'BALMER.LST',qso:'AGN_QSO.LST'} as const;
export type SessionObservation=(ImportedSpectrum & Readonly<{name:string;kind?:undefined}>)|AcquisitionObservation;
export type AnalysisSession=Readonly<{
  observation:SessionObservation|null; control:ShiftControl; stepInput:string;
  reference:keyof typeof REFERENCES; wide:boolean; object:string; rows:readonly Measurement[]; hubble:HubbleWorkspace; acquisitions?:readonly AcquisitionObservation[];classification?:ClassificationWorkspace;photometry?:PhotometerState;observing?:ObservingWorkspace;editing?:EditingWorkspace;optical?:OpticalWorkspace;clusterDatabase?:ClusterDatabaseWorkspace;clusterComparison?:ClusterComparisonWorkspace;clusterSelection?:ClusterSelectionWorkspace;
}>;
export class AnalysisSessionError extends Error {
  constructor(readonly code:'size'|'format'|'state'|'measurements'|'observation') {super(`Analysis session: ${code}`);this.name='AnalysisSessionError';}
}
function fail(code:AnalysisSessionError['code']):never {throw new AnalysisSessionError(code);}
function record(value:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))fail('format');
  const r=value as Record<string,unknown>,actual=Object.keys(r);
  if(actual.length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))fail('format');
  return r;
}
function text(value:unknown,max:number,empty=true):string {
  if(typeof value!=='string'||value.length>max||(!empty&&!value.length))fail('format');return value;
}
function numeric(value:unknown):number {const n=decodeSessionNumber(value);if(!Number.isFinite(n))fail('state');return n;}

function control(value:unknown):ShiftControl {
  const r=record(value,['base','position','factor','step']);
  const s={base:numeric(r.base),position:numeric(r.position),factor:numeric(r.factor),step:numeric(r.step)};
  if(!Number.isInteger(s.position)||s.position < -100||s.position>100||!(s.factor===1||s.factor===10)||s.step<0||s.step>1)fail('state');
  if(s.step===0&&(s.base!==0||s.position!==0))fail('state');
  const z=currentZ(s as ShiftControl);
  if(!Number.isFinite(z)||z<=-1)fail('state');
  return Object.freeze(s as ShiftControl);
}
function measurement(value:unknown,previousId:number,acquisitions:readonly AcquisitionObservation[]):Measurement {
  const hasOrigin=!!value&&typeof value==='object'&&Object.hasOwn(value,'origin');
  const r=record(value,['id','object','file','sha256','control','reference','zFloat32Hex',...(hasOrigin?['origin']:[])]);
  let origin:Measurement['origin'];
  if(hasOrigin){const o=record(r.origin,['kind','acquisitionId',...(r.origin&&typeof r.origin==='object'&&Object.hasOwn(r.origin,'targetId')?['targetId']:[])]);if(!['catalog-star-acquisition','catalog-galaxy-acquisition'].includes(String(o.kind))||typeof o.acquisitionId!=='string')fail('measurements');origin={kind:o.kind as NonNullable<Measurement['origin']>['kind'],acquisitionId:o.acquisitionId,...(Object.hasOwn(o,'targetId')?{targetId:o.targetId as string}:{})};}
  const id=numeric(r.id);
  if(!Number.isSafeInteger(id)||id<=previousId||id>=Number.MAX_SAFE_INTEGER)fail('measurements');
  const object=text(r.object,80,false),file=text(r.file,1024,false),sha256=text(r.sha256,64,false),reference=text(r.reference,32,false);
  if(!Object.values(REFERENCES).includes(reference as typeof REFERENCES[keyof typeof REFERENCES]))fail('measurements');
  let row:Measurement;
  try{row=createMeasurement(id,object,file,sha256,control(r.control),reference,origin);}catch{fail('measurements');}
  if(!origin&&acquisitions.some(a=>a.sha256===sha256))fail('measurements');
  if(origin){const linked=acquisitions.find(a=>a.acquisitionId===origin!.acquisitionId);if(!linked||linked.kind!==origin.kind||(origin.kind==='catalog-galaxy-acquisition'&&acquisitionObjectId(linked)!==measurementGalaxyTarget(origin))||linked.sha256!==sha256||linked.name!==file)fail('measurements');}
  if(row.object!==object||row.zFloat32Hex!==r.zFloat32Hex)fail('measurements');
  return row;
}
async function restore(value:unknown,verifySources=true):Promise<AnalysisSession> {
  if(!value||typeof value!=='object')fail('format');
  const version=(value as {version:unknown}).version;
  if(version===21){
    const r=record(value,['format','version','numericalPolicy','base','clusterComparisonPolicy','clusterComparisonSHA256','nativeClusterPolicy','nativeClusterContractSHA256','clusterSelectionPolicy','clusterSelectionSHA256','clusterSelection']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.clusterComparisonPolicy!==CLUSTER_COMPARISON_POLICY||r.clusterComparisonSHA256!==CLUSTER_COMPARISON_SHA256||r.nativeClusterPolicy!==NATIVE_CLUSTER_POLICY||r.nativeClusterContractSHA256!==NATIVE_CLUSTER_SHA256||r.clusterSelectionPolicy!==CLUSTER_SELECTION_POLICY||r.clusterSelectionSHA256!==CLUSTER_SELECTION_SHA256||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>18)fail('format');
    const base=await restore(r.base,verifySources);let clusterSelection:ClusterSelectionWorkspace;try{clusterSelection=await(await import('./clusterSelection')).admitClusterSelection(r.clusterSelection);}catch{fail('state');}return Object.freeze({...base,clusterSelection});
  }
  if(version===20){
    const r=record(value,['format','version','numericalPolicy','base','clusterComparisonPolicy','clusterComparisonSHA256','nativeClusterPolicy','nativeClusterContractSHA256','clusterComparison']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.clusterComparisonPolicy!==CLUSTER_COMPARISON_POLICY||r.clusterComparisonSHA256!==CLUSTER_COMPARISON_SHA256||r.nativeClusterPolicy!==NATIVE_CLUSTER_POLICY||r.nativeClusterContractSHA256!==NATIVE_CLUSTER_SHA256||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>18)fail('format');
    let clusterComparison:ClusterComparisonWorkspace;try{clusterComparison=readClusterComparisonWorkspace(r.clusterComparison);}catch{fail('state');}const base=await restore(r.base,verifySources);if(verifySources){const{loadClusterDataset}=await import('./clusterComparison');await Promise.all(Object.keys(clusterComparison.notebooks).map(id=>loadClusterDataset(id as NonNullable<ClusterComparisonWorkspace['activeId']>)));}return Object.freeze({...base,clusterComparison});
  }
  if(version===19){
    const r=record(value,['format','version','numericalPolicy','base','clusterDatabasePolicy','clusterDatabaseSHA256','nativeClusterPolicy','nativeClusterContractSHA256','clusterDatabase']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.clusterDatabasePolicy!==CLUSTER_DATABASE_POLICY||r.clusterDatabaseSHA256!==CLUSTER_DATABASE_SHA256||r.nativeClusterPolicy!==NATIVE_CLUSTER_POLICY||r.nativeClusterContractSHA256!==NATIVE_CLUSTER_SHA256||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>18)fail('format');
    let clusterDatabase:ClusterDatabaseWorkspace;try{clusterDatabase=readClusterDatabaseWorkspace(r.clusterDatabase);}catch{fail('state');}
    const base=await restore(r.base,verifySources);if(verifySources&&clusterDatabase.loaded)await(await import('./clusterDatabase')).loadM67Dataset();return Object.freeze({...base,clusterDatabase});
  }
  if(version!==1&&version!==2&&version!==3&&version!==4&&version!==5&&version!==6&&version!==7&&version!==8&&version!==9&&version!==10&&version!==11&&version!==12&&version!==13&&version!==14&&version!==15&&version!==16&&version!==17&&version!==18)fail('format');
  const r=record(value,['format','version','numericalPolicy','observation','adjustment','measurements',...(version>=2?['hubble']:[]),...(version>=3?['acquisitions']:[]),...(version>=4?['classification']:[]),...(version>=8?['photometry']:[]),...(version>=9?['observing']:[]),...(version>=10?['editingPolicy','editing']:[]),...(version>=11?['optical']:[]) ]);
  if(r.format!==FORMAT||r.numericalPolicy!==POLICY)fail('format');
  const a=record(r.adjustment,['control','stepInput','reference','wide','object']),s=control(a.control);
  if(typeof a.reference!=='string'||!Object.hasOwn(REFERENCES,a.reference)||typeof a.wide!=='boolean')fail('state');
  const stepInput=text(a.stepInput,80),object=text(a.object,80);
  if(!Array.isArray(r.measurements)||r.measurements.length>MAX_SESSION_ROWS)fail('measurements');
  if(version>=9){const policy=r.observing&&typeof r.observing==='object'?(r.observing as {policy?:unknown}).policy:null;if(version===18?policy!==OBSERVING_SKY_POLICY:version===17?policy!==OBSERVING_ACCESS_POLICY:version===16?policy!==OBSERVING_DRIVE_POLICY:version===15?policy!==OBSERVING_CLOCK_POLICY:version===14?policy!==OBSERVING_MAYALL_POLICY:version===13?policy!==OBSERVING_GALAXY_POLICY:version===12?policy!==OBSERVING_OPTICAL_POLICY:policy===OBSERVING_OPTICAL_POLICY||policy===OBSERVING_GALAXY_POLICY||policy===OBSERVING_MAYALL_POLICY||policy===OBSERVING_CLOCK_POLICY||policy===OBSERVING_DRIVE_POLICY||policy===OBSERVING_ACCESS_POLICY||policy===OBSERVING_SKY_POLICY)fail('state');}
  const acquisitions:AcquisitionObservation[]=[];
  if(version>=3){
    if(!Array.isArray(r.acquisitions)||r.acquisitions.length>(version>=14?MAX_ACQUISITION_ARCHIVE:LEGACY_MAX_ACQUISITION_ARCHIVE))fail('observation');
    let eventCount=0;
    for(const value of r.acquisitions){
      const a=record(value,['id','journal']);
      if(!a.journal||typeof a.journal!=='object'||!Array.isArray((a.journal as {events:unknown}).events))fail('observation');
      eventCount+=((a.journal as {events:unknown[]}).events.length);if(eventCount>MAX_ARCHIVE_EVENTS)fail('size');
      let verified:AcquisitionObservation;try{verified=await restoreAcquisitionObservation(a.id,a.journal);}catch{fail('observation');}
      if(acquisitions.some(a=>a.acquisitionId===verified.acquisitionId))fail('observation');acquisitions.push(verified);
    }
  }
  let lastId=0;const rows=r.measurements.map(v=>{const row=measurement(v,lastId,acquisitions);lastId=row.id;return row;});
  let hubble:HubbleWorkspace=EMPTY_HUBBLE;
  if(version>=2){try{hubble=readHubbleWorkspace(r.hubble,rows);}catch{fail('state');}}
  let observation:SessionObservation|null=null;
  if(r.observation!==null&&typeof r.observation==='object'&&['catalog-star-acquisition','catalog-galaxy-acquisition'].includes(String((r.observation as {kind:unknown}).kind))){
    const o=record(r.observation,['kind','acquisitionId']);observation=acquisitions.find(a=>a.acquisitionId===o.acquisitionId)??null;if(!observation||observation.kind!==o.kind)fail('observation');
  }else if(r.observation!==null){
    const o=record(r.observation,['name','sha256','sourceText']),name=text(o.name,1024,false),sha256=text(o.sha256,64,false);
    if(!/^[a-f0-9]{64}$/.test(sha256))fail('observation');
    const sourceText=text(o.sourceText,2*1024*1024,false);
    try{
      const verified=await verifyImportedSpectrumText(sourceText,sha256);
      if(!verified.samples.some(p=>p.wavelength>=3650&&p.wavelength<=7000))fail('observation');
      if(acquisitions.some(a=>a.sha256===sha256))fail('observation');observation=Object.freeze({...verified,name});
    }catch{fail('observation');}
  }
  let classification:ClassificationWorkspace|undefined;
  if(version>=4&&!(version>=8&&r.classification===null)){
    const profileVersion=version>=8?(r.classification as {profileVersion?:unknown}|null)?.profileVersion:version;
    if(profileVersion!==4&&profileVersion!==5&&profileVersion!==6&&profileVersion!==7)fail('state');
    const c=record(r.classification,['datasetFingerprint','workspace',...(profileVersion===7?['importPolicy']:[]),...(version>=8?['profileVersion']:[])]);
    if(profileVersion===7&&c.importPolicy!==CLASSIFICATION_IMPORT_POLICY)fail('state');
    if(profileVersion===4?(!mainClassificationCompatible||c.datasetFingerprint!==CLASSIFICATION_MAIN_FINGERPRINT):c.datasetFingerprint!==CLASSIFICATION_CATALOG.fingerprint)fail('state');
    try{const stars=acquisitions.filter(a=>a.kind==='catalog-star-acquisition');classification=readClassificationWorkspace(profileVersion===7?await restoreClassificationImportWorkspace(c.workspace):c.workspace,stars,profileVersion===4,profileVersion>=6,profileVersion===7);if(verifySources)await loadClassificationSources(currentClassification(classification),classificationExternalSources(classification,stars));}catch{fail('state');}
  }
  let photometry:PhotometerState|undefined;
  if(version>=8&&!(version>=9&&r.photometry===null)){try{const{parsePhotometerSession,serializePhotometerSession,MAX_PHOTOMETER_SESSION_BYTES}=await import('./photometerSession');if(new TextEncoder().encode(JSON.stringify(r.photometry)).length>MAX_PHOTOMETER_SESSION_BYTES)fail('size');photometry=parsePhotometerSession(r.photometry);serializePhotometerSession(photometry);}catch{fail('state');}}
  let observing:ObservingWorkspace|undefined;
  if(version>=9){try{observing=(await import('./observingWorkspace')).restoreObservingWorkspace(r.observing,acquisitions);}catch{fail('state');}}
  let editing:EditingWorkspace|undefined;
  if(version>=10){try{editing=readEditingWorkspace(r.editing,photometry,rows,r.editingPolicy);}catch{fail('state');}}
  let optical:OpticalWorkspace|undefined;
  if(version>=11){try{optical=readOpticalWorkspace(r.optical);}catch{fail('state');}}
  if(version<14&&acquisitions.some(a=>a.kind==='catalog-star-acquisition'?starTelescopeIndex(a.state)===2:galaxyTelescopeIndex(a.state)===2))fail('observation');
  if(version<13&&acquisitions.some(a=>a.kind==='catalog-galaxy-acquisition'&&galaxyTelescopeIndex(a.state)===1))fail('observation');
  if(version<12&&acquisitions.some(a=>a.kind==='catalog-star-acquisition'&&starTelescopeIndex(a.state)===1))fail('observation');
  return Object.freeze({...(optical?{optical}:{}),...(editing?{editing}:{}),...(observing?{observing}:{}),...(photometry?{photometry}:{}),...(classification?{classification}:{}),observation,control:s,stepInput,reference:a.reference as keyof typeof REFERENCES,wide:a.wide,object,rows:Object.freeze(rows),hubble,...(version>=3?{acquisitions:Object.freeze(acquisitions)}:{})});
}
async function portable(session:AnalysisSession):Promise<unknown> {
  if(session.clusterSelection!==undefined){if(session.clusterComparison!==undefined||session.clusterDatabase!==undefined)fail('state');const clusterSelection=await(await import('./clusterSelection')).admitClusterSelection(session.clusterSelection);return {format:FORMAT,version:21,numericalPolicy:POLICY,base:await portable({...session,clusterSelection:undefined}),clusterComparisonPolicy:CLUSTER_COMPARISON_POLICY,clusterComparisonSHA256:CLUSTER_COMPARISON_SHA256,nativeClusterPolicy:NATIVE_CLUSTER_POLICY,nativeClusterContractSHA256:NATIVE_CLUSTER_SHA256,clusterSelectionPolicy:CLUSTER_SELECTION_POLICY,clusterSelectionSHA256:CLUSTER_SELECTION_SHA256,clusterSelection};}
  if(session.clusterComparison!==undefined){if(session.clusterDatabase!==undefined)fail('state');const clusterComparison=readClusterComparisonWorkspace(session.clusterComparison);return {format:FORMAT,version:20,numericalPolicy:POLICY,base:await portable({...session,clusterComparison:undefined}),clusterComparisonPolicy:CLUSTER_COMPARISON_POLICY,clusterComparisonSHA256:CLUSTER_COMPARISON_SHA256,nativeClusterPolicy:NATIVE_CLUSTER_POLICY,nativeClusterContractSHA256:NATIVE_CLUSTER_SHA256,clusterComparison};}
  if(session.clusterDatabase!==undefined){const clusterDatabase=readClusterDatabaseWorkspace(session.clusterDatabase);return {format:FORMAT,version:19,numericalPolicy:POLICY,base:await portable({...session,clusterDatabase:undefined}),clusterDatabasePolicy:CLUSTER_DATABASE_POLICY,clusterDatabaseSHA256:CLUSTER_DATABASE_SHA256,nativeClusterPolicy:NATIVE_CLUSTER_POLICY,nativeClusterContractSHA256:NATIVE_CLUSTER_SHA256,clusterDatabase};}
  const acquisitions=session.acquisitions??[];if(!session.observing?.star4m&&acquisitions.some(a=>a.kind==='catalog-star-acquisition'?starTelescopeIndex(a.state)===2:galaxyTelescopeIndex(a.state)===2))fail('state');if(!session.observing?.galaxies09&&acquisitions.some(a=>a.kind==='catalog-galaxy-acquisition'&&galaxyTelescopeIndex(a.state)===1))fail('state');if(!session.observing?.star09&&acquisitions.some(a=>a.kind==='catalog-star-acquisition'&&starTelescopeIndex(a.state)===1))fail('state');const profileVersion=session.classification?(session.classification.imports?.length?7:classificationWorkspaceHasFeatures(session.classification)?6:classificationWorkspaceUsesNewAtlas(session.classification)?5:4):0,version=session.observing?.sky09?18:session.observing?.operationalAccess?17:session.observing?.clockDrive?16:session.observing?.siteClock?15:session.observing?.star4m?14:session.observing?.galaxies09?13:session.observing?.star09?12:session.optical?11:session.editing?10:session.observing?9:session.photometry?8:profileVersion||(acquisitions.length?3:2);
  if(session.observing?.star09&&!session.optical||session.editing&&!session.observing||session.optical&&(!session.observing||!session.editing))fail('state');
  const editingPolicy=session.editing?editingWorkspacePolicy(session.editing):EDITING_POLICY;
  const editing=session.editing?readEditingWorkspace(session.editing,session.photometry,session.rows,editingPolicy):undefined;
  const photometry=session.photometry?JSON.parse((await import('./photometerSession')).serializePhotometerSession(session.photometry)):undefined;
  const observing=session.observing?(await import('./observingWorkspace')).portableObservingWorkspace(session.observing,acquisitions):undefined;
  return {format:FORMAT,version,...(version>=11?{optical:portableOpticalWorkspace(session.optical!)}:{}),...(version>=10?{editingPolicy,editing}:{}),...(version>=9?{observing}:{}),...(version>=8?{photometry:photometry??null}:{}),...(version>=4?{classification:session.classification?{...(version>=8?{profileVersion}:{}),...(profileVersion===7?{importPolicy:CLASSIFICATION_IMPORT_POLICY}:{}),datasetFingerprint:profileVersion===4?CLASSIFICATION_MAIN_FINGERPRINT:CLASSIFICATION_CATALOG.fingerprint,workspace:profileVersion===4?legacyClassificationWorkspace(session.classification):portableClassificationWorkspace(session.classification)}:null}:{}),...(version>=3?{acquisitions:acquisitions.map(a=>({id:a.acquisitionId,journal:JSON.parse(acquisitionJournalText(a))}))}:{}),hubble:session.hubble,numericalPolicy:POLICY,
    observation:session.observation?.kind?{kind:session.observation.kind,acquisitionId:session.observation.acquisitionId}:session.observation?{name:session.observation.name,sha256:session.observation.sha256,sourceText:session.observation.sourceText}:null,
    adjustment:{control:session.control,stepInput:session.stepInput,reference:session.reference,wide:session.wide,object:session.object},
    measurements:session.rows.map(({id,object,file,sha256,control,reference,zFloat32Hex,origin})=>({id,object,file,sha256,control,reference,zFloat32Hex,...(origin?{origin}:{})}))};
}
export async function serializeAnalysisSession(session:AnalysisSession):Promise<string> {
  const result=JSON.stringify(await portable(session),(_key,value)=>encodeSessionNumber(value),2)+'\n';
  if(new TextEncoder().encode(result).byteLength>MAX_SESSION_BYTES)fail('size');
  await restore(JSON.parse(result),false);return result;
}
/** File.size check precedes arrayBuffer; validation is atomic and has no UI
 * side effects. Rows are re-derived, not trusted cached numerical results. */
export async function readAnalysisSession(file:File):Promise<AnalysisSession> {
  if(file.size>MAX_SESSION_BYTES)fail('size');
  const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_SESSION_BYTES)fail('size');
  let value:unknown;
  try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('format');}
  return restore(value);
}

/** One UI entry can restore a complete analysis or merge a supported legacy
 * practice-only file. The caller applies practice-only state without replacing
 * acquisitions/measurements; unknown formats never gain partial acceptance. */
export async function readInvestigationSession(file:File):Promise<{kind:'analysis';session:AnalysisSession}|{kind:'practice';state:ClassificationState}>{
 if(file.size>MAX_SESSION_BYTES)fail('size');const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_SESSION_BYTES)fail('size');
 let value:unknown;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('format');}
 if(value&&typeof value==='object'&&(value as {format:unknown}).format==='OpenCLEA stellar classification session'){
  if(bytes.byteLength>MAX_CLASSIFICATION_BYTES)fail('size');return {kind:'practice',state:parseClassificationSession(value)};
 }
 return {kind:'analysis',session:await restore(value)};
}
