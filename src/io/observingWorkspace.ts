import {skyTelescopeIndex,portableSkyProfilesProof,readSkyProfilesProof} from '../core/skyTelescope';
import {portableInstrumentAccess,readInstrumentAccess} from '../core/instrumentAccess';
import {portableClockDrive,readClockDrive,clockDrivePointing,type ClockDriveWorkspace} from '../core/clockDrive';
import {portableSiteClock,readSiteClock} from '../core/siteClock';
import {galaxyTelescopeIndex} from '../core/galaxyTelescope';
import {starTelescopeIndex} from '../core/starTelescope';
import {OBSERVING_SKY_POLICY,OBSERVING_EDITION,OBSERVING_POLICY,OBSERVING_OPTICAL_POLICY,OBSERVING_GALAXY_POLICY,OBSERVING_MAYALL_POLICY,OBSERVING_CLOCK_POLICY,OBSERVING_DRIVE_POLICY,OBSERVING_ACCESS_POLICY,LIVE_GALAXY_IDS,workspaceRecord,readObservatoryWorkspace,seedDraft,type ExposureWorkspace,type ObservingWorkspace} from '../core/observingWorkspace';
import {MAX_ARCHIVE_EVENTS} from '../core/acquisitionArchive';
import type {JournalState} from '../core/exposureJournal';
import {acquisitionJournalText,type AcquisitionObservation} from './acquisitionObservation';
import {parseSkySession,serializeSkySession,MAX_SKY_SESSION_BYTES} from './skySession';
import {parseStarSession,serializeStarSession,MAX_STAR_SESSION_BYTES} from './starSession';
import {parseGalaxySession,serializeGalaxySession,MAX_GALAXY_SESSION_BYTES} from './galaxySession';
import {galaxyStateDefinition} from '../core/galaxyExposure';
const specifications={sky:{read:parseSkySession,write:serializeSkySession,limit:MAX_SKY_SESSION_BYTES},star:{read:parseStarSession,write:serializeStarSession,limit:MAX_STAR_SESSION_BYTES},galaxy:{read:parseGalaxySession,write:serializeGalaxySession,limit:MAX_GALAXY_SESSION_BYTES}};
function checkDrive(d:ClockDriveWorkspace|undefined,w:Pick<ObservingWorkspace,'siteClock'|'context'>){if(!d)return;const p=clockDrivePointing(d);if(!w.siteClock||w.siteClock.utc!==d.utc||!Object.is(p.ra,w.context.pointing.ra)||!Object.is(p.dec,w.context.pointing.dec))throw new Error('Unbound clock drive');}
type Slot='sky'|'star'|'galaxy';
function matches(a:AcquisitionObservation,kind:Slot,id?:string,index=0){return kind==='star'?a.kind==='catalog-star-acquisition'&&starTelescopeIndex(a.state)===(id==='mayall'?2:id==='kpno09'?1:0):kind==='galaxy'&&a.kind==='catalog-galaxy-acquisition'&&a.targetId===id&&galaxyTelescopeIndex(a.state)===index;}
function stopped(s:JournalState){if(s.armed||s.exposure.phase==='running')throw new Error('Observing snapshot must be stopped and released');return s;}
export function portableObservingWorkspace(value:ObservingWorkspace,archive:readonly AcquisitionObservation[]):unknown{
 if((!!value.sky09)!==!!value.sky4m||value.sky09&&!value.operationalAccess)throw new Error('Missing sky optical context');if(value.operationalAccess&&!value.clockDrive)throw new Error('Missing instrument clock context');checkDrive(value.clockDrive,value);let events=archive.reduce((n,a)=>n+a.state.events.length,0);if(events>MAX_ARCHIVE_EVENTS)throw new Error('Project replay budget');
 function slot(w:ExposureWorkspace,kind:Slot,id?:string,index=0):unknown{
  const draft=seedDraft(w.seedText);if(!w.state)return {seedText:draft,source:{kind:'empty'}};
  const s=stopped(w.state),spec=specifications[kind],text=spec.write(s);if(kind==='sky'&&skyTelescopeIndex(s)!==(id==='mayall'?2:id==='kpno09'?1:0))throw new Error('Wrong sky telescope');if(kind==='star'&&starTelescopeIndex(s)!==(id==='mayall'?2:id==='kpno09'?1:0))throw new Error('Wrong stellar telescope');if(kind==='galaxy'&&(galaxyStateDefinition(s).target.id!==id||galaxyTelescopeIndex(s)!==index))throw new Error('Wrong exposure target');
  const same=archive.find(a=>matches(a,kind,id,index)&&acquisitionJournalText(a)===text);
  if(same)return {seedText:draft,source:{kind:'archive',acquisitionId:same.acquisitionId}};
  events+=s.events.length;if(events>MAX_ARCHIVE_EVENTS)throw new Error('Project replay budget');return {seedText:draft,source:{kind:'journal',journal:JSON.parse(text)}};
 }
 if(value.siteClock&&!value.star4m)throw new Error('Missing clock optical context');if((!!value.star4m)!==!!value.galaxies4m||value.star4m&&(!value.galaxies09||!value.star09))throw new Error('Missing Mayall context');if(value.galaxies09&&!value.star09)throw new Error('Missing optical workspace');return {...(value.sky09?{skyProfilesProof:portableSkyProfilesProof(),sky09:slot(value.sky09,'sky','kpno09'),sky4m:slot(value.sky4m!,'sky','mayall')}:{}),...(value.operationalAccess?{operationalAccess:portableInstrumentAccess()}:{}),...(value.clockDrive?{clockDrive:portableClockDrive(value.clockDrive)}:{}),...(value.siteClock?{siteClock:portableSiteClock(value.siteClock)}:{}),policy:value.sky09?OBSERVING_SKY_POLICY:value.operationalAccess?OBSERVING_ACCESS_POLICY:value.clockDrive?OBSERVING_DRIVE_POLICY:value.siteClock?OBSERVING_CLOCK_POLICY:value.star4m?OBSERVING_MAYALL_POLICY:value.galaxies09?OBSERVING_GALAXY_POLICY:value.star09?OBSERVING_OPTICAL_POLICY:OBSERVING_POLICY,...(value.star4m?{star4m:slot(value.star4m,'star','mayall'),galaxies4m:Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,slot(value.galaxies4m![id],'galaxy',id,2)]))}:{}),...(value.galaxies09?{galaxies09:Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,slot(value.galaxies09![id],'galaxy',id,1)]))}:{}),...(value.star09?{star09:slot(value.star09,'star','kpno09')}:{}),edition:OBSERVING_EDITION,context:readObservatoryWorkspace(value.context),sky:slot(value.sky,'sky'),star:slot(value.star,'star'),galaxies:Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,slot(value.galaxies[id],'galaxy',id)]))};
}
export function restoreObservingWorkspace(value:unknown,archive:readonly AcquisitionObservation[]):ObservingWorkspace{
 const policy=value&&typeof value==='object'?(value as {policy?:unknown}).policy:null,hasSky=policy===OBSERVING_SKY_POLICY,hasAccess=hasSky||policy===OBSERVING_ACCESS_POLICY,hasDrive=hasAccess||policy===OBSERVING_DRIVE_POLICY,hasClock=hasDrive||policy===OBSERVING_CLOCK_POLICY,hasMayall=hasClock||policy===OBSERVING_MAYALL_POLICY,hasGal09=hasMayall||policy===OBSERVING_GALAXY_POLICY,has09=hasGal09||policy===OBSERVING_OPTICAL_POLICY;const r=workspaceRecord(value,['policy','edition','context','sky','star','galaxies',...(hasSky?['skyProfilesProof','sky09','sky4m']:[]),...(hasAccess?['operationalAccess']:[]),...(hasDrive?['clockDrive']:[]),...(hasClock?['siteClock']:[]),...(has09?['star09']:[]),...(hasGal09?['galaxies09']:[]),...(hasMayall?['star4m','galaxies4m']:[])]),e=workspaceRecord(r.edition,['program','version','binarySHA256']);if(r.policy!==(hasSky?OBSERVING_SKY_POLICY:hasAccess?OBSERVING_ACCESS_POLICY:hasDrive?OBSERVING_DRIVE_POLICY:hasClock?OBSERVING_CLOCK_POLICY:hasMayall?OBSERVING_MAYALL_POLICY:hasGal09?OBSERVING_GALAXY_POLICY:has09?OBSERVING_OPTICAL_POLICY:OBSERVING_POLICY)||Object.entries(OBSERVING_EDITION).some(([key,v])=>e[key]!==v))throw new Error('Unsupported observing edition');
 if(hasSky)readSkyProfilesProof(r.skyProfilesProof);
 const operationalAccess=hasAccess?readInstrumentAccess(r.operationalAccess):undefined,clockDrive=hasDrive?readClockDrive(r.clockDrive):undefined,siteClock=hasClock?readSiteClock(r.siteClock):undefined,context=readObservatoryWorkspace(r.context),galaxies=workspaceRecord(r.galaxies,LIVE_GALAXY_IDS),galaxies09=hasGal09?workspaceRecord(r.galaxies09,LIVE_GALAXY_IDS):undefined,galaxies4m=hasMayall?workspaceRecord(r.galaxies4m,LIVE_GALAXY_IDS):undefined;let events=archive.reduce((n,a)=>n+a.state.events.length,0);if(events>MAX_ARCHIVE_EVENTS)throw new Error('Project replay budget');
 checkDrive(clockDrive,{siteClock,context});
 // Count all raw journals before any replay. Archive references have already
 // been replayed by the enclosing reader and do not consume the budget twice.
 for(const value of [r.sky,...(hasSky?[r.sky09,r.sky4m]:[]),r.star,...(has09?[r.star09]:[]),...LIVE_GALAXY_IDS.map(id=>galaxies[id]),...(galaxies09?LIVE_GALAXY_IDS.map(id=>galaxies09[id]):[]),...(galaxies4m?[r.star4m,...LIVE_GALAXY_IDS.map(id=>galaxies4m[id])]:[])]){
  const w=workspaceRecord(value,['seedText','source']);
  if(w.source&&typeof w.source==='object'&&(w.source as {kind?:unknown}).kind==='journal'){
   const a=workspaceRecord(w.source,['kind','journal']),journal=a.journal as {events?:unknown};
   if(!journal||!Array.isArray(journal.events))throw new Error('Invalid segment journal');
   events+=journal.events.length;if(events>MAX_ARCHIVE_EVENTS)throw new Error('Project replay budget');
  }
 }
 function slot(value:unknown,kind:Slot,id?:string,index=0):ExposureWorkspace{
  const w=workspaceRecord(value,['seedText','source']),draft=seedDraft(w.seedText);if(!w.source||typeof w.source!=='object')throw new Error('Invalid segment source');const type=(w.source as {kind?:unknown}).kind;let state:JournalState|null=null;
  if(type==='empty')workspaceRecord(w.source,['kind']);
  else if(type==='archive'){
   const a=workspaceRecord(w.source,['kind','acquisitionId']),entry=archive.find(s=>s.acquisitionId===a.acquisitionId&&matches(s,kind,id,index));if(!entry)throw new Error('Invalid segment archive reference');state=stopped(entry.state);
  }else if(type==='journal'){
   const a=workspaceRecord(w.source,['kind','journal']),spec=specifications[kind];if(new TextEncoder().encode(JSON.stringify(a.journal)).length>spec.limit)throw new Error('Segment byte limit');const journal=a.journal as {events?:unknown};if(!journal||!Array.isArray(journal.events))throw new Error('Invalid segment journal');state=stopped(spec.read(journal));spec.write(state);if(kind==='sky'&&skyTelescopeIndex(state)!==(id==='mayall'?2:id==='kpno09'?1:0))throw new Error('Wrong sky telescope');if(kind==='star'&&starTelescopeIndex(state)!==(id==='mayall'?2:id==='kpno09'?1:0))throw new Error('Wrong stellar telescope');if(kind==='galaxy'&&(galaxyStateDefinition(state).target.id!==id||galaxyTelescopeIndex(state)!==index))throw new Error('Wrong exposure target');
  }else throw new Error('Unsupported segment source');
  return Object.freeze({state,seedText:draft});
 }
 return Object.freeze({...(hasSky?{sky09:slot(r.sky09,'sky','kpno09'),sky4m:slot(r.sky4m,'sky','mayall')}:{}),...(operationalAccess?{operationalAccess}:{}),...(clockDrive?{clockDrive}:{}),...(siteClock?{siteClock}:{}),...(galaxies4m?{star4m:slot(r.star4m,'star','mayall'),galaxies4m:Object.freeze(Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,slot(galaxies4m[id],'galaxy',id,2)]))as NonNullable<ObservingWorkspace['galaxies4m']>)}:{}),...(galaxies09?{galaxies09:Object.freeze(Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,slot(galaxies09[id],'galaxy',id,1)]))as NonNullable<ObservingWorkspace['galaxies09']>)}:{}),...(has09?{star09:slot(r.star09,'star','kpno09')}:{}),context,sky:slot(r.sky,'sky'),star:slot(r.star,'star'),galaxies:Object.freeze(Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,slot(galaxies[id],'galaxy',id)]))as ObservingWorkspace['galaxies'])});
}
