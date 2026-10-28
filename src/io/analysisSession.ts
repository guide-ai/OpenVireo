import{MAX_PROJECT_METADATA_GROWTH,projectBytesFit,projectTextFits}from'../core/projectMetadata';
import{projectMetadata,projectMarker}from'../core/projectMetadata';
import {readOpticalOptions,type OpticalOptions} from '../core/opticalOptions';
import {portableSiteOverrides,readSiteOverrides,type SiteOverrides} from '../core/observatorySite';
import {readMotionPreferences,TELESCOPE_MOTION_POLICY,TELESCOPE_MOTION_SHA256,type MotionPreferences} from '../core/telescopeMotion';
import {CLUSTER_SELECTION_POLICY,CLUSTER_SELECTION_SHA256,type ClusterSelectionWorkspace} from '../core/clusterSelection';
import {readClusterComparisonWorkspace,CLUSTER_COMPARISON_SHA256,CLUSTER_COMPARISON_POLICY,type ClusterComparisonWorkspace} from '../core/clusterComparison';
import {NATIVE_CLUSTER_POLICY,NATIVE_CLUSTER_SHA256} from '../core/nativeCluster';
import {readClusterDatabaseWorkspace,CLUSTER_DATABASE_POLICY,CLUSTER_DATABASE_SHA256,type ClusterDatabaseWorkspace} from '../core/clusterDatabase';
import {decodeSessionNumber,encodeSessionNumber} from '../core/sessionNumber';
import {galaxyTelescopeIndex} from '../core/galaxyTelescope';
import {OBSERVING_SKY_POLICY,OBSERVING_OPTICAL_POLICY,OBSERVING_GALAXY_POLICY,OBSERVING_MAYALL_POLICY,OBSERVING_CLOCK_POLICY,OBSERVING_DRIVE_POLICY,OBSERVING_ACCESS_POLICY,LIVE_GALAXY_IDS,CACHED_GALAXY_IDS,PEGASUS_GALAXY_IDS,emptyExposureWorkspace,isCachedGalaxyId,isPegasusGalaxyId,observingUsesCachedGalaxies,observingUsesPegasusGalaxies} from '../core/observingWorkspace';
import cachedSource from '../../data/hubble/corbor-cached-provenance.json';
import pegasusSource from '../../data/hubble/pegasus-cached-provenance.json';
import {starTelescopeIndex} from '../core/starTelescope';
import {portableOpticalWorkspace,readOpticalWorkspace,type OpticalWorkspace} from '../core/opticalTelescope';
import {readEditingWorkspace,EDITING_POLICY,editingWorkspacePolicy,type EditingWorkspace} from '../core/editingWorkspace';
import type {ObservingWorkspace} from '../core/observingWorkspace';
import type {PhotometerState} from '../core/photometer';
import {CLASSIFICATION_IMPORT_POLICY} from '../core/classificationImport';
import {restoreClassificationImportWorkspace} from './classificationImports';
import {parseClassificationSession,MAX_CLASSIFICATION_BYTES,CLASSIFICATION_PAYLOAD_BYTES} from './classificationSession';
import type {ClassificationState} from '../core/classification';
import {CLASSIFICATION_CATALOG,CLASSIFICATION_MAIN_FINGERPRINT,mainClassificationCompatible,classificationWorkspaceUsesNewAtlas,classificationWorkspaceHasFeatures,classificationExternalSources,portableClassificationWorkspace,legacyClassificationWorkspace,readClassificationWorkspace,currentClassification,type ClassificationWorkspace} from '../core/classification';
import {loadClassificationSources} from './classificationSources';
import {measurementGalaxyTarget} from '../core/galaxyIdentity';
import {LEGACY_MAX_ACQUISITION_ARCHIVE,MAX_ACQUISITION_ARCHIVE,MAX_ARCHIVE_EVENTS} from '../core/acquisitionArchive';
import {acquisitionObjectId,acquisitionJournalText,restoreAcquisitionObservation,type AcquisitionObservation} from './acquisitionObservation';
import {EMPTY_HUBBLE,readHubbleWorkspace,type HubbleWorkspace} from '../core/hubbleAnalysis';
import { createMeasurement, currentZ, type Measurement, type ShiftControl } from '../core/spectrum';
import { verifyImportedSpectrumText, type ImportedSpectrum } from './spectrumFiles';
import type {ObjectXSpectrumRecord} from './objectXSpectra';
import {OBJECT_X_INVESTIGATION_POLICY,ObjectXSessionError,admitObjectXInvestigation,portableObjectXInvestigation,type ObjectXInvestigation} from './objectXInvestigation';
import {FIELD_VARIABLE_JD_DOMAIN} from '../core/fieldEngine';
import {LSS_INVESTIGATION_POLICY,LssSessionError,admitLssInvestigation,lssFieldJdsOf,portableLssInvestigation,type LssFieldJds,type LssInvestigation} from './lssInvestigation';
import { RADIO_INVESTIGATION_POLICY, admitRadioInvestigation, portableRadioInvestigation, type RadioInvestigationRecord } from './radioInvestigation';
import {HUBBLE_EXTENDED_BANKS,HUBBLE_EXTENDED_TARGETS,isHubbleExtendedId} from '../core/hubbleEngineTargets';
import {EXTENDED_MAX_ACQUISITION_ARCHIVE} from '../core/acquisitionArchive';
import {observingUsesExtendedGalaxies} from '../core/observingWorkspace';
import umiCached from '../../data/hubble/umi-cached-provenance.json';

/** New portable browser format, not the original CLEA saved-spectrum format. */
export const SESSION_PAYLOAD_BYTES=16*1024*1024,MAX_SESSION_BYTES=SESSION_PAYLOAD_BYTES+MAX_PROJECT_METADATA_GROWTH;
export const MAX_SESSION_ROWS=1000;
const FORMAT='OpenVireo analysis session', POLICY='Number_x87_equivalence_unvalidated';
const REFERENCES={galaxy:'GLXYLNS.LST',balmer:'BALMER.LST',qso:'AGN_QSO.LST'} as const;
export type SessionObservation=(ImportedSpectrum & Readonly<{name:string;kind?:undefined}>)|AcquisitionObservation;
export type AnalysisSession=Readonly<{
  observation:SessionObservation|null; control:ShiftControl; stepInput:string;
  reference:keyof typeof REFERENCES; wide:boolean; object:string; rows:readonly Measurement[]; hubble:HubbleWorkspace; acquisitions?:readonly AcquisitionObservation[];classification?:ClassificationWorkspace;photometry?:PhotometerState;observing?:ObservingWorkspace;editing?:EditingWorkspace;optical?:OpticalWorkspace;clusterDatabase?:ClusterDatabaseWorkspace;clusterComparison?:ClusterComparisonWorkspace;clusterSelection?:ClusterSelectionWorkspace;motion?:MotionPreferences;
  /** Phase 1 item 1.5 (v23): the Radio workspace, current pulsar dataset and pulsar measurements. Absent in v1..22 files. */
  radio?:RadioInvestigationRecord;
  /** Front B (v26): optical observatory options and student site overrides. Absent in v1..25 files (compiled defaults). */
  observatory?:ObservatorySession;
  /** Front A M6 (v27): the E02 LSS survey (lssInvestigation.ts). Absent in v1..26 files. */
  lss?:LssInvestigation;
  /** Front X X5 (v28): the E08 Object X investigation (objectXInvestigation.ts). Absent in v1..27 files. */
  objectX?:ObjectXInvestigation;
}>;
/** Front F (v29): the extended Hubble.HTL targets (hubbleEngineTargets.ts). A v29 file wraps an unchanged v1..28 base,
 * outermost, and carries the extended-target policy, the binary hash and the banks of every (telescope, target) key in table
 * order (observing.extendedGalaxies). Only inside a v29 may the base archive hold more than 12 (up to 16) acquisitions, and
 * acquisitions, banks or context of extended targets are rejected in any file outside v29; a v29 is never nested. */
export const HUBBLE_EXTENDED_SESSION_POLICY='openvireo-hubble-extended-targets-v29';
function acquisitionIsExtended(a:AcquisitionObservation){return a.kind==='catalog-galaxy-acquisition'&&isHubbleExtendedId(a.targetId);}
function sessionUsesExtended(session:AnalysisSession){if(session.objectX?.spectra?.length)return true;const a=session.acquisitions??[];return a.length>MAX_ACQUISITION_ARCHIVE||a.some(acquisitionIsExtended)||!!session.observing&&(session.observing.extendedGalaxies!==undefined||observingUsesExtendedGalaxies(session.observing));}
/** Front B B10 (v26): Optical Simulation Options (Limit Slewing) and per-telescope site overrides (clocks/horizon only,
 * WEB-ST-01). A v26 file wraps an unchanged v1..25 base, outermost; a v26 is never nested. */
export type ObservatorySession=Readonly<{options:OpticalOptions;siteOverrides:SiteOverrides}>;
export const OBSERVATORY_SESSION_POLICY='openvireo-optical-observatory-options-sites-v26';
/** Phase 2 B1 (v24): cached-pan targets (54875/54891, 0.4 m only). A v24 file wraps an unchanged v1..23 base and adds the
 * cached field policy, the unchanged base field snapshot and binary hashes and the 0.4 m banks of those targets
 * (observing.cachedGalaxies). Acquisitions, banks or context of these targets are rejected in any file outside v24. */
function acquisitionIsCached(a:AcquisitionObservation){return a.kind==='catalog-galaxy-acquisition'&&isCachedGalaxyId(a.targetId);}
/** Phase 2 B2 (v25): Pegasus targets (fresh NGC 7501, cached NGC 7499/7503, 0.4 m only). A v25 file wraps an unchanged
 * v1..24 base (so it combines with the CorBor v24 wrapper) and adds the Pegasus field policy, the NGC 7501 field snapshot and
 * binary hashes and the 0.4 m banks of these targets (observing.pegasusGalaxies). Acquisitions, banks or context of these
 * targets are rejected in any file outside v25; a v25 is never nested. */
function acquisitionIsPegasus(a:AcquisitionObservation){return a.kind==='catalog-galaxy-acquisition'&&isPegasusGalaxyId(a.targetId);}
/** Count ALL v24/v25 replay inputs before any replay: unwrap 25 → 24 → 19..23 to the base, then the base archive and slots
 * plus every wrapper bank group against one budget. Wrapper metadata does not consume events; archive references are counted
 * once in the archive, while inline old, cached and Pegasus journals each incur their actual replay cost. */
function checkCombinedReplayBudget(wrapper:unknown,extended=false):void{
 let inner=wrapper as Record<string,unknown>;const groups:(readonly [readonly string[],unknown])[]=[];
 // v26..v30 carry no galaxy banks of their own except v29's extended group; they are walked through to the base.
 for(let depth=0;Number(inner.version)>=19&&Number(inner.version)<=30;depth++){
  if(depth>=12||!inner.base||typeof inner.base!=='object'||Array.isArray(inner.base))fail('format');
  if(inner.version===29){extended=true;groups.push([HUBBLE_EXTENDED_BANKS,inner.extendedGalaxies]);}
  if(inner.version===25)groups.push([PEGASUS_GALAXY_IDS,inner.pegasusGalaxies]);
  if(inner.version===24)groups.push([CACHED_GALAXY_IDS,inner.cachedGalaxies]);
  inner=inner.base as Record<string,unknown>;
 }
 let events=0;
 function journal(value:unknown){
  if(!value||typeof value!=='object'||!Array.isArray((value as {events?:unknown}).events))fail('state');
  events+=((value as {events:unknown[]}).events.length);if(events>MAX_ARCHIVE_EVENTS)fail('size');
 }
 if(inner.acquisitions!==undefined){
  if(!Array.isArray(inner.acquisitions)||inner.acquisitions.length>(extended?EXTENDED_MAX_ACQUISITION_ARCHIVE:MAX_ACQUISITION_ARCHIVE))fail('observation');
  for(const a of inner.acquisitions){if(!a||typeof a!=='object')fail('observation');journal((a as {journal?:unknown}).journal);}
 }
 function slot(value:unknown){
  if(!value||typeof value!=='object')return;
  const source=(value as {source?:unknown}).source;
  if(source&&typeof source==='object'&&(source as {kind?:unknown}).kind==='journal')journal((source as {journal?:unknown}).journal);
 }
 const o=inner.observing;
 if(o&&typeof o==='object'&&!Array.isArray(o)){
  const w=o as Record<string,unknown>;
  for(const key of ['sky','star','sky09','sky4m','star09','star4m'])slot(w[key]);
  for(const key of ['galaxies','galaxies09','galaxies4m']){const group=w[key];if(group&&typeof group==='object')for(const id of LIVE_GALAXY_IDS)slot((group as Record<string,unknown>)[id]);}
 }
 for(const [ids,banks] of groups)if(banks&&typeof banks==='object')for(const id of ids)slot((banks as Record<string,unknown>)[id]);
}
function sessionUsesCached(session:AnalysisSession){return (session.acquisitions??[]).some(acquisitionIsCached)||!!session.observing&&(session.observing.cachedGalaxies!==undefined||observingUsesCachedGalaxies(session.observing));}
function sessionUsesPegasus(session:AnalysisSession){return (session.acquisitions??[]).some(acquisitionIsPegasus)||!!session.observing&&(session.observing.pegasusGalaxies!==undefined||observingUsesPegasusGalaxies(session.observing));}
export class AnalysisSessionError extends Error {
  constructor(readonly code:'size'|'format'|'state'|'measurements'|'observation'|'resources') {super(`Analysis session: ${code}`);this.name='AnalysisSessionError';}
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
/** E08 kept spectra admitted from a v29 wrapper are attached to the restored Object X investigation (which must exist). */
/** E08 kept spectra, already shape- and budget-checked (readObjectXSpectra, before the base replay), replayed here and attached
 * to the restored Object X investigation (which must exist). */
async function withObjectXSpectra(base:AnalysisSession,list:readonly ObjectXSpectrumRecord[]|null):Promise<AnalysisSession>{
  if(list===null)return base;if(!base.objectX)fail('state');
  let spectra:readonly ObjectXSpectrumRecord[];
  try{spectra=await (await import('./objectXSpectra')).admitObjectXSpectra(list);}catch(e){if(e instanceof Error&&(e as {code?:string}).code==='resources')fail('resources');fail('state');}
  return Object.freeze({...base,objectX:Object.freeze({...base.objectX!,spectra:spectra!})});
}
/** Review 4 item 8: lets the page say that a restore is preparing fields (engine Hubble fields or kept Object X spectra, both in
 * Workers) before the base replays; called at most once, only by the outermost v29 wrapper. */
export type RestoreHooks=Readonly<{onPreparingFields?:()=>void;
 /** Front T (v30): the per-record frozen field JDs for the LSS layer, and a flag the v27 layer sets when it consumed them. */
 variableTime?:Readonly<{lssFieldJds:LssFieldJds;consumed:{done:boolean}}>}>;
/** Front T (v30): the observatory-clock JD frozen when each LSS record's field list was built (the variable stage's time, recovered
 * 0x487bcc; the original reads host Now + the user offset, which is not deterministic, so the web freezes the observatory clock at
 * field build and the file records it). A v30 file wraps an unchanged v1..29 base that must contain the v27 LSS layer; it is never
 * nested. Older files carry no JD: a row whose field needs one fails closed on restore (variable-time-required). */
export const VARIABLE_TIME_SESSION_POLICY='openvireo-variable-time-v30';
async function restore(value:unknown,verifySources=true,migrated=false,cached=false,pegasus=false,underLss=false,underObjectX=false,extended=false,hooks:RestoreHooks={}):Promise<AnalysisSession> {
 if(!migrated&&!hooks.variableTime){try{value=projectMetadata(value);}catch{fail('format');}}
  if(!value||typeof value!=='object')fail('format');
  const version=(value as {version:unknown}).version;
  if(version===30){
    if(migrated||hooks.variableTime)fail('format');
    const r=record(value,['format','version','numericalPolicy','base','variableTimePolicy','lssFieldJds']);
    const baseVersion=r.base&&typeof r.base==='object'?(r.base as {version?:unknown}).version:null;
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.variableTimePolicy!==VARIABLE_TIME_SESSION_POLICY||!Number.isInteger(baseVersion)||Number(baseVersion)<27||Number(baseVersion)>29)fail('format');
    // [[record id, JD], …] with strictly increasing ids; each JD finite and inside the site clock's JD domain.
    if(!Array.isArray(r.lssFieldJds)||r.lssFieldJds.length<1||r.lssFieldJds.length>MAX_SESSION_ROWS)fail('format');
    const lssFieldJds=new Map<number,number>();let last=0;
    for(const e of r.lssFieldJds as unknown[]){
     if(!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||e[0]<=last||typeof e[1]!=='number'||!Number.isFinite(e[1])||e[1]<FIELD_VARIABLE_JD_DOMAIN.minimum||e[1]>FIELD_VARIABLE_JD_DOMAIN.maximum)fail('format');
     lssFieldJds.set(e[0],e[1]);last=e[0];
    }
    const consumed={done:false};
    const base=await restore(r.base,verifySources,false,false,false,false,false,false,{...hooks,variableTime:{lssFieldJds,consumed}});
    if(!consumed.done)fail('format');// the JDs must belong to the LSS layer of this file
    return base;
  }
  if(version===29){
    // Front F: the extended Hubble targets over an unchanged v1..28 base, outermost; a v29 is never nested.
    if(migrated)fail('format');
    // E08 kept spectra (objectXSpectra.ts) ride in the v29 wrapper under objectXSpectra; a v29 without them has no such key.
    const withSpectra=!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,'objectXSpectra');
    const r=record(value,['format','version','numericalPolicy','base','extendedPolicy','binarySHA256','extendedGalaxies',...(withSpectra?['objectXSpectra']:[])]);
    const baseVersion=r.base&&typeof r.base==='object'?(r.base as {version?:unknown}).version:null;
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.extendedPolicy!==HUBBLE_EXTENDED_SESSION_POLICY||r.binarySHA256!==umiCached.binarySHA256||!Number.isInteger(baseVersion)||Number(baseVersion)<1||Number(baseVersion)>28)fail('format');
    checkCombinedReplayBudget(value,true);
    // Review 3 finding 3: the kept spectra's own bounds (8 records, the per-journal limit and 24000 events in total) are checked
    // here, before any engine-field preparation or base replay. Their budget stays separate from the combined one: those
    // journals replay against their own Object X fields, not the observing banks, so a v29 replays at most 24000 + 24000 events.
    let keptSpectra:readonly ObjectXSpectrumRecord[]|null=null;
    if(withSpectra){if(r.objectXSpectra===null)fail('format');try{keptSpectra=(await import('./objectXSpectra')).readObjectXSpectra(r.objectXSpectra);}catch{fail('format');}}
    // Engine targets need their asynchronous, hash-checked field preparation before any of their journals can replay.
    // Only the (target, telescope) fields whose policies the file names are prepared (review 2 findings 1 and 9): a transient
    // preparation failure is the retryable 'resources' error, never an invalid-session verdict.
    const text=JSON.stringify(value),needed=HUBBLE_EXTENDED_TARGETS.filter(t=>t.route==='engine').flatMap(t=>t.telescopes.filter(i=>{const p=t.policies[i];return p!==undefined&&text.includes(JSON.stringify(p));}).map(i=>[t.id,i] as const));
    if(needed.length||keptSpectra)hooks.onPreparingFields?.();
    if(needed.length){const io=await import('./hubbleEngineTargets');try{await io.ensureHubbleEngineTargets(needed);}catch(e){if(e instanceof io.HubbleEngineLoadError)fail('resources');fail('state');}}
    const base=await withObjectXSpectra(await restore(r.base,verifySources,true,false,false,true,true,true,{variableTime:hooks.variableTime}),keptSpectra);
    if((r.extendedGalaxies===null)!==!base.observing)fail('state');
    if(!base.observing)return base;
    let extendedGalaxies:NonNullable<ObservingWorkspace['extendedGalaxies']>;try{extendedGalaxies=(await import('./observingWorkspace')).restoreExtendedGalaxies(r.extendedGalaxies,base.acquisitions??[]);}catch{fail('state');}
    return Object.freeze({...base,observing:Object.freeze({...base.observing,extendedGalaxies})});
  }
  if(version===28){
    // Front X X5: an E08 wrapper over an unchanged v1..27 base; nested only directly under a v29 (Front F).
    if(migrated&&!extended)fail('format');
    const r=record(value,['format','version','numericalPolicy','base','objectXPolicy','objectXDigestSHA256','objectX']);
    const baseVersion=r.base&&typeof r.base==='object'?(r.base as {version?:unknown}).version:null;
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.objectXPolicy!==OBJECT_X_INVESTIGATION_POLICY||!Number.isInteger(baseVersion)||Number(baseVersion)<1||Number(baseVersion)>27)fail('format');
    let objectX:ObjectXInvestigation;try{objectX=await admitObjectXInvestigation(r.objectX,r.objectXDigestSHA256);}catch{fail('state');}
    const base=await restore(r.base,verifySources,true,false,false,true,true,extended,{variableTime:hooks.variableTime});return Object.freeze({...base,objectX});
  }
  if(version===27){
    // Front A M6: an E02 wrapper over an unchanged v1..26 base; nested only directly under a v28.
    if(migrated&&!underObjectX&&!extended)fail('format');
    const r=record(value,['format','version','numericalPolicy','base','lssPolicy','lssDigestSHA256','lss']);
    const baseVersion=r.base&&typeof r.base==='object'?(r.base as {version?:unknown}).version:null;
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.lssPolicy!==LSS_INVESTIGATION_POLICY||!Number.isInteger(baseVersion)||Number(baseVersion)<1||Number(baseVersion)>26)fail('format');
    const variableTime=hooks.variableTime;if(variableTime)variableTime.consumed.done=true;
    let lss:LssInvestigation;try{lss=await admitLssInvestigation(r.lss,r.lssDigestSHA256,variableTime?.lssFieldJds);}catch{fail('state');}
    const base=await restore(r.base,verifySources,true,false,false,true,false,extended);return Object.freeze({...base,lss});
  }
  if(version===26){
    if(migrated&&!underLss&&!extended)fail('format');
    const r=record(value,['format','version','numericalPolicy','base','observatoryPolicy','observatory']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.observatoryPolicy!==OBSERVATORY_SESSION_POLICY||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>25)fail('format');
    let observatory:ObservatorySession;try{const o=record(r.observatory,['options','siteOverrides']);observatory=Object.freeze({options:readOpticalOptions(o.options),siteOverrides:readSiteOverrides(o.siteOverrides)});}catch{fail('state');}
    const base=await restore(r.base,verifySources,true,false,false,false,false,extended);return Object.freeze({...base,observatory});
  }
  if(version===25){
    if(cached||pegasus)fail('format');
    const r=record(value,['format','version','numericalPolicy','base','pegasusFieldPolicy','pegasusBaseFieldSHA256','binarySHA256','pegasusGalaxies']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.pegasusFieldPolicy!==pegasusSource.policy||r.pegasusBaseFieldSHA256!==pegasusSource.baseFieldSnapshotSHA256||r.binarySHA256!==pegasusSource.binarySHA256||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>24)fail('format');
    checkCombinedReplayBudget(value,extended);
    const base=await restore(r.base,verifySources,true,false,true,false,false,extended);
    if((r.pegasusGalaxies===null)!==!base.observing)fail('state');
    if(!base.observing)return base;
    let pegasusGalaxies:NonNullable<ObservingWorkspace['pegasusGalaxies']>;try{pegasusGalaxies=(await import('./observingWorkspace')).restorePegasusGalaxies(r.pegasusGalaxies,base.acquisitions??[]);}catch{fail('state');}
    return Object.freeze({...base,observing:Object.freeze({...base.observing,pegasusGalaxies})});
  }
  if(version===24){
    if(cached)fail('format');
    const r=record(value,['format','version','numericalPolicy','base','cachedFieldPolicy','cachedBaseFieldSHA256','binarySHA256','cachedGalaxies']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.cachedFieldPolicy!==cachedSource.policy||r.cachedBaseFieldSHA256!==cachedSource.baseFieldSnapshotSHA256||r.binarySHA256!==cachedSource.binarySHA256||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>23)fail('format');
    checkCombinedReplayBudget(value,extended);
    const base=await restore(r.base,verifySources,true,true,pegasus,false,false,extended);
    if((r.cachedGalaxies===null)!==!base.observing)fail('state');
    if(!base.observing)return base;
    let cachedGalaxies:NonNullable<ObservingWorkspace['cachedGalaxies']>;try{cachedGalaxies=(await import('./observingWorkspace')).restoreCachedGalaxies(r.cachedGalaxies,base.acquisitions??[]);}catch{fail('state');}
    return Object.freeze({...base,observing:Object.freeze({...base.observing,cachedGalaxies})});
  }
  if(version===23){
    const r=record(value,['format','version','numericalPolicy','base','radioPolicy','radioDigestSHA256','radio']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.radioPolicy!==RADIO_INVESTIGATION_POLICY||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>22)fail('format');
    const base=await restore(r.base,verifySources,true,cached,pegasus,false,false,extended);
    let radio:RadioInvestigationRecord;try{radio=await admitRadioInvestigation(r.radio,r.radioDigestSHA256,{verifySources});}catch{fail('state');}
    return Object.freeze({...base,radio});
  }
  if(version===22){
    const r=record(value,['format','version','numericalPolicy','base','motionPolicy','motionProofSHA256','motion']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.motionPolicy!==TELESCOPE_MOTION_POLICY||r.motionProofSHA256!==TELESCOPE_MOTION_SHA256||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>21)fail('format');
    let motion:MotionPreferences;try{motion=readMotionPreferences(r.motion);}catch{fail('state');}const base=await restore(r.base,verifySources,true,cached,pegasus,false,false,extended);return Object.freeze({...base,motion});
  }
  if(version===21){
    const r=record(value,['format','version','numericalPolicy','base','clusterComparisonPolicy','clusterComparisonSHA256','nativeClusterPolicy','nativeClusterContractSHA256','clusterSelectionPolicy','clusterSelectionSHA256','clusterSelection']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.clusterComparisonPolicy!==CLUSTER_COMPARISON_POLICY||r.clusterComparisonSHA256!==CLUSTER_COMPARISON_SHA256||r.nativeClusterPolicy!==NATIVE_CLUSTER_POLICY||r.nativeClusterContractSHA256!==NATIVE_CLUSTER_SHA256||r.clusterSelectionPolicy!==CLUSTER_SELECTION_POLICY||r.clusterSelectionSHA256!==CLUSTER_SELECTION_SHA256||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>18)fail('format');
    const base=await restore(r.base,verifySources,true,cached,pegasus,false,false,extended);let clusterSelection:ClusterSelectionWorkspace;try{clusterSelection=await(await import('./clusterSelection')).admitClusterSelection(r.clusterSelection);}catch{fail('state');}return Object.freeze({...base,clusterSelection});
  }
  if(version===20){
    const r=record(value,['format','version','numericalPolicy','base','clusterComparisonPolicy','clusterComparisonSHA256','nativeClusterPolicy','nativeClusterContractSHA256','clusterComparison']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.clusterComparisonPolicy!==CLUSTER_COMPARISON_POLICY||r.clusterComparisonSHA256!==CLUSTER_COMPARISON_SHA256||r.nativeClusterPolicy!==NATIVE_CLUSTER_POLICY||r.nativeClusterContractSHA256!==NATIVE_CLUSTER_SHA256||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>18)fail('format');
    let clusterComparison:ClusterComparisonWorkspace;try{clusterComparison=readClusterComparisonWorkspace(r.clusterComparison);}catch{fail('state');}const base=await restore(r.base,verifySources,true,cached,pegasus,false,false,extended);if(verifySources){const{loadClusterDataset}=await import('./clusterComparison');await Promise.all(Object.keys(clusterComparison.notebooks).map(id=>loadClusterDataset(id as NonNullable<ClusterComparisonWorkspace['activeId']>)));}return Object.freeze({...base,clusterComparison});
  }
  if(version===19){
    const r=record(value,['format','version','numericalPolicy','base','clusterDatabasePolicy','clusterDatabaseSHA256','nativeClusterPolicy','nativeClusterContractSHA256','clusterDatabase']);
    if(r.format!==FORMAT||r.numericalPolicy!==POLICY||r.clusterDatabasePolicy!==CLUSTER_DATABASE_POLICY||r.clusterDatabaseSHA256!==CLUSTER_DATABASE_SHA256||r.nativeClusterPolicy!==NATIVE_CLUSTER_POLICY||r.nativeClusterContractSHA256!==NATIVE_CLUSTER_SHA256||!r.base||typeof r.base!=='object'||!Number.isInteger((r.base as {version?:unknown}).version)||Number((r.base as {version?:unknown}).version)<1||Number((r.base as {version?:unknown}).version)>18)fail('format');
    let clusterDatabase:ClusterDatabaseWorkspace;try{clusterDatabase=readClusterDatabaseWorkspace(r.clusterDatabase);}catch{fail('state');}
    const base=await restore(r.base,verifySources,true,cached,pegasus,false,false,extended);if(verifySources&&clusterDatabase.loaded)await(await import('./clusterDatabase')).loadM67Dataset();return Object.freeze({...base,clusterDatabase});
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
    if(!Array.isArray(r.acquisitions)||r.acquisitions.length>(extended?EXTENDED_MAX_ACQUISITION_ARCHIVE:version>=14?MAX_ACQUISITION_ARCHIVE:LEGACY_MAX_ACQUISITION_ARCHIVE))fail('observation');
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
  if(!cached&&acquisitions.some(acquisitionIsCached))fail('observation');
  if(!cached&&observing&&observingUsesCachedGalaxies(observing))fail('state');
  if(!pegasus&&acquisitions.some(acquisitionIsPegasus))fail('observation');
  if(!pegasus&&observing&&observingUsesPegasusGalaxies(observing))fail('state');
  if(!extended&&acquisitions.some(acquisitionIsExtended))fail('observation');
  if(!extended&&observing&&observingUsesExtendedGalaxies(observing))fail('state');
  return Object.freeze({...(optical?{optical}:{}),...(editing?{editing}:{}),...(observing?{observing}:{}),...(photometry?{photometry}:{}),...(classification?{classification}:{}),observation,control:s,stepInput,reference:a.reference as keyof typeof REFERENCES,wide:a.wide,object,rows:Object.freeze(rows),hubble,...(version>=3?{acquisitions:Object.freeze(acquisitions)}:{})});
}
/** wrapped: the wrapper levels already emitted above this call (v25 Pegasus outermost, then v24 cached). */
type Wrapped=Readonly<{cached?:true;pegasus?:true;extended?:true;variableTime?:true}>;
async function portable(session:AnalysisSession,wrapped:Wrapped={}):Promise<unknown> {
  if(!wrapped.variableTime&&session.lss!==undefined){
    const jds=lssFieldJdsOf(session.lss);
    if(jds.size)return {format:FORMAT,version:30,numericalPolicy:POLICY,base:await portable(session,{...wrapped,variableTime:true}),variableTimePolicy:VARIABLE_TIME_SESSION_POLICY,lssFieldJds:[...jds].sort((a,b)=>a[0]-b[0])};
  }
  if(!wrapped.extended&&sessionUsesExtended(session)){
    const observing=session.observing,acquisitions=session.acquisitions??[];let banks:unknown=null,base:ObservingWorkspace|undefined;
    if(acquisitions.length>EXTENDED_MAX_ACQUISITION_ARCHIVE)fail('observation');
    if(observing){const {extendedGalaxies,...plain}=observing;base=plain;banks=(await import('./observingWorkspace')).portableExtendedGalaxies(extendedGalaxies??Object.fromEntries(HUBBLE_EXTENDED_BANKS.map(key=>[key,emptyExposureWorkspace()])),acquisitions);}
    const result={format:FORMAT,version:29,numericalPolicy:POLICY,base:await portable({...session,...(base?{observing:base}:{})},{...wrapped,extended:true}),extendedPolicy:HUBBLE_EXTENDED_SESSION_POLICY,binarySHA256:umiCached.binarySHA256,extendedGalaxies:banks,
      ...(session.objectX?.spectra?.length?{objectXSpectra:(await import('./objectXSpectra')).portableObjectXSpectra(session.objectX.spectra)}:{})};
    checkCombinedReplayBudget(result);return result;
  }
  if(session.objectX!==undefined){
    let objectX:unknown,digest:string;try{({objectX,digest}=await portableObjectXInvestigation(session.objectX));}catch(e){if(e instanceof ObjectXSessionError)throw e;fail('state');}
    return {format:FORMAT,version:28,numericalPolicy:POLICY,base:await portable({...session,objectX:undefined},wrapped),objectXPolicy:OBJECT_X_INVESTIGATION_POLICY,objectXDigestSHA256:digest,objectX};
  }
  if(session.lss!==undefined){
    let lss:unknown,digest:string;try{({lss,digest}=await portableLssInvestigation(session.lss));}catch(e){if(e instanceof LssSessionError)throw e;fail('state');}
    return {format:FORMAT,version:27,numericalPolicy:POLICY,base:await portable({...session,lss:undefined},wrapped),lssPolicy:LSS_INVESTIGATION_POLICY,lssDigestSHA256:digest,lss};
  }
  if(session.observatory!==undefined){
    let observatory:unknown;try{observatory={options:readOpticalOptions(session.observatory.options),siteOverrides:portableSiteOverrides(readSiteOverrides(portableSiteOverrides(session.observatory.siteOverrides)))};}catch{fail('state');}
    return {format:FORMAT,version:26,numericalPolicy:POLICY,base:await portable({...session,observatory:undefined},wrapped),observatoryPolicy:OBSERVATORY_SESSION_POLICY,observatory};
  }
  if(!wrapped.pegasus&&sessionUsesPegasus(session)){
    const observing=session.observing,acquisitions=session.acquisitions??[];let banks:unknown=null,base:ObservingWorkspace|undefined;
    if(observing){const {pegasusGalaxies,...plain}=observing;base=plain;banks=(await import('./observingWorkspace')).portablePegasusGalaxies(pegasusGalaxies??Object.fromEntries(PEGASUS_GALAXY_IDS.map(id=>[id,emptyExposureWorkspace()]))as NonNullable<ObservingWorkspace['pegasusGalaxies']>,acquisitions);}
    const result={format:FORMAT,version:25,numericalPolicy:POLICY,base:await portable({...session,...(base?{observing:base}:{})},{...wrapped,pegasus:true}),pegasusFieldPolicy:pegasusSource.policy,pegasusBaseFieldSHA256:pegasusSource.baseFieldSnapshotSHA256,binarySHA256:pegasusSource.binarySHA256,pegasusGalaxies:banks};
    checkCombinedReplayBudget(result,!!wrapped.extended);return result;
  }
  if(!wrapped.cached&&sessionUsesCached(session)){
    const observing=session.observing,acquisitions=session.acquisitions??[];let banks:unknown=null,base:ObservingWorkspace|undefined;
    if(observing){const {cachedGalaxies,...plain}=observing;base=plain;banks=(await import('./observingWorkspace')).portableCachedGalaxies(cachedGalaxies??Object.fromEntries(CACHED_GALAXY_IDS.map(id=>[id,emptyExposureWorkspace()]))as NonNullable<ObservingWorkspace['cachedGalaxies']>,acquisitions);}
    const result={format:FORMAT,version:24,numericalPolicy:POLICY,base:await portable({...session,...(base?{observing:base}:{})},{...wrapped,cached:true}),cachedFieldPolicy:cachedSource.policy,cachedBaseFieldSHA256:cachedSource.baseFieldSnapshotSHA256,binarySHA256:cachedSource.binarySHA256,cachedGalaxies:banks};
    checkCombinedReplayBudget(result,!!wrapped.extended);return result;
  }
  if(session.radio!==undefined){const {radio,digest}=await portableRadioInvestigation(session.radio.snapshot);return {format:FORMAT,version:23,numericalPolicy:POLICY,base:await portable({...session,radio:undefined},wrapped),radioPolicy:RADIO_INVESTIGATION_POLICY,radioDigestSHA256:digest,radio};}
  if(session.motion!==undefined){let motion:MotionPreferences;try{motion=readMotionPreferences(session.motion);}catch{fail('state');}return {format:FORMAT,version:22,numericalPolicy:POLICY,base:await portable({...session,motion:undefined},wrapped),motionPolicy:TELESCOPE_MOTION_POLICY,motionProofSHA256:TELESCOPE_MOTION_SHA256,motion};}
  if(session.clusterSelection!==undefined){if(session.clusterComparison!==undefined||session.clusterDatabase!==undefined)fail('state');const clusterSelection=await(await import('./clusterSelection')).admitClusterSelection(session.clusterSelection);return {format:FORMAT,version:21,numericalPolicy:POLICY,base:await portable({...session,clusterSelection:undefined},wrapped),clusterComparisonPolicy:CLUSTER_COMPARISON_POLICY,clusterComparisonSHA256:CLUSTER_COMPARISON_SHA256,nativeClusterPolicy:NATIVE_CLUSTER_POLICY,nativeClusterContractSHA256:NATIVE_CLUSTER_SHA256,clusterSelectionPolicy:CLUSTER_SELECTION_POLICY,clusterSelectionSHA256:CLUSTER_SELECTION_SHA256,clusterSelection};}
  if(session.clusterComparison!==undefined){if(session.clusterDatabase!==undefined)fail('state');const clusterComparison=readClusterComparisonWorkspace(session.clusterComparison);return {format:FORMAT,version:20,numericalPolicy:POLICY,base:await portable({...session,clusterComparison:undefined},wrapped),clusterComparisonPolicy:CLUSTER_COMPARISON_POLICY,clusterComparisonSHA256:CLUSTER_COMPARISON_SHA256,nativeClusterPolicy:NATIVE_CLUSTER_POLICY,nativeClusterContractSHA256:NATIVE_CLUSTER_SHA256,clusterComparison};}
  if(session.clusterDatabase!==undefined){const clusterDatabase=readClusterDatabaseWorkspace(session.clusterDatabase);return {format:FORMAT,version:19,numericalPolicy:POLICY,base:await portable({...session,clusterDatabase:undefined},wrapped),clusterDatabasePolicy:CLUSTER_DATABASE_POLICY,clusterDatabaseSHA256:CLUSTER_DATABASE_SHA256,nativeClusterPolicy:NATIVE_CLUSTER_POLICY,nativeClusterContractSHA256:NATIVE_CLUSTER_SHA256,clusterDatabase};}
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
  if(!projectTextFits(result,SESSION_PAYLOAD_BYTES))fail('size');
  await restore(JSON.parse(result),false);return result;
}
/** File.size check precedes arrayBuffer; validation is atomic and has no UI
 * side effects. Rows are re-derived, not trusted cached numerical results. */
export async function readAnalysisSession(file:File):Promise<AnalysisSession> {
  if(file.size>MAX_SESSION_BYTES)fail('size');
  const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_SESSION_BYTES)fail('size');
  let value:unknown;
  try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('format');}
  try{if(!projectBytesFit(bytes.byteLength,value,SESSION_PAYLOAD_BYTES))fail('size');}catch{fail('size');}return restore(value);
}

/** One UI entry can restore a complete analysis or merge a supported legacy
 * practice-only file. The caller applies practice-only state without replacing
 * acquisitions/measurements; unknown formats never gain partial acceptance. */
export async function readInvestigationSession(file:File,hooks:RestoreHooks={}):Promise<{kind:'analysis';session:AnalysisSession}|{kind:'practice';state:ClassificationState}>{
 if(file.size>MAX_SESSION_BYTES)fail('size');const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_SESSION_BYTES)fail('size');
 let value:unknown;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('format');}
 try{if(!projectBytesFit(bytes.byteLength,value,SESSION_PAYLOAD_BYTES))fail('size');}catch{fail('size');}
 if(value&&typeof value==='object'&&projectMarker((value as {format:unknown}).format)==='OpenVireo stellar classification session'){
  if(bytes.byteLength>MAX_CLASSIFICATION_BYTES)fail('size');try{if(!projectBytesFit(bytes.byteLength,value,CLASSIFICATION_PAYLOAD_BYTES))fail('size');}catch{fail('size');}return {kind:'practice',state:parseClassificationSession(value)};
 }
 return {kind:'analysis',session:await restore(value,true,false,false,false,false,false,false,hooks)};
}
