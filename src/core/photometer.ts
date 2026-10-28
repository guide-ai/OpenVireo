import {photometerTelescope,isPhotometerTelescopeIndex,isPhotometerTelescopeTarget,type PhotometerTelescopeIndex} from './photometerTelescope';
import {validPhotometerAperture} from './photometerAperture';
import {confirmNativeCluster,validNativeClusterParameters,sameNativeCluster,type NativeClusterParameters,type NativeClusterFit} from './nativeCluster';
import {confirmPleiadesFit,type PleiadesFit} from './pleiadesAnalysis';
import {TIMED_PHOTOMETER_POLICY,PHOTOMETER_SECONDS,PHOTOMETER_REPEATS,MAX_PHOTOMETER_CALLBACKS_PER_READING,LEGACY_PHOTOMETER_TIMING,photometerTiming,requiredPhotometerCallbacks,createPhotometerIntegration,advancePhotometerIntegration,photometerReplayCallbacks,MAX_PHOTOMETER_CALLBACKS,PHOTOMETER_CALLBACK_MS,type PhotometerTiming,type PhotometerIntegration} from './photometerIntegration';
import {randomDraw} from './acquisition';
import {PINNED_PLEIADES_V_TARGET,isExpandedPhotometerTarget,isAddedPhotometerTarget,isPhotometerTarget,type PleiadesFieldKind} from './photometerField';
import {drawPinnedPleiadesUbv,isPhotometerFilter,type PhotometerFilter} from './photometerUbvField';
import {reducePhotometerSky,reducePhotometerObject,photometricBMinusV} from './photometryReduction';
import {photometerJournalFits,EXPANDED_PHOTOMETER_POLICY,PHOTOMETER_POLICY,VARIABLE_FIELD_PHOTOMETER_POLICY} from './photometerJournal';
export {PHOTOMETER_POLICY,UBV_PHOTOMETER_POLICY,LEGACY_PHOTOMETER_POLICY} from './photometerJournal';
/** Journal event bound of the OpenVireo photometer session (a web format, not a native limit): integration-provenance.json
 * records it as browserPolicy.maximumEvents 256 next to the browser timer policy, and no CLEA address bounds the readings. Raised to
 * 512 on 2026-10-28 (coordinator decision) because the full 24-star B/V sample needs 251 events, leaving no room for retakes; the
 * 128 KiB byte bound (photometerJournalFits) and the callback bound are unchanged, and files within 256 events restore unchanged.
 * The provenance file keeps its recorded value (its SHA-256 is part of every v4+ header). */
export const MAX_PHOTOMETER_EVENTS=512;
export class PhotometerError extends Error {constructor(readonly code:'phase'|'sky'|'event'|'limit'|'entry'|'session'|'color'){super(`Photometer: ${code}`);this.name='PhotometerError';}}
export type PhotometerEvent=Readonly<{type:'activate'|'deactivate'|'start'|'stop'|'complete'}|{type:'telescope';index:PhotometerTelescopeIndex}|{type:'aperture';selector:number}|{type:'point';kind:PleiadesFieldKind}|{type:'record';readingId:number;value:number;note:string}|{type:'filter';filter:PhotometerFilter}|{type:'color';bReadingId:number;vReadingId:number}|{type:'target';targetId:string}|{type:'timing';secondsPerIntegration:number;integrations:number}|{type:'advance';callbacks:number}|{type:'clusterFit';modulus:number}|({type:'nativeClusterFit'}&NativeClusterParameters)>;
type Callback=Readonly<{sourceCount:number;skyCount:number;totalPhotonCount:number;initialSeed:number;seed:number;draws:number;nativeBaseCountSum:number;timerWaitMs:number}>;
export type PhotometerReading=Readonly<{id:number;telescopeIndex?:PhotometerTelescopeIndex;apertureSelector?:number;integration?:PhotometerTiming&Readonly<{callbacks:number;periodCounts:readonly number[]}>;kind:PleiadesFieldKind;filter:PhotometerFilter;targetId:string|null;fieldTargetId:string;contextId:number;callback:Callback;skyReadingId:number|null;reduction:ReturnType<typeof reducePhotometerObject>|null}>;
export type PhotometerEntry=Readonly<{readingId:number;value:number;note:string}>;
/** In-memory transition-family marker retained for API compatibility;minimal
 * persisted owner/policy is derived from history,not this legacy state label. */
export type PhotometerState=Readonly<{policy:typeof PHOTOMETER_POLICY|typeof TIMED_PHOTOMETER_POLICY|typeof EXPANDED_PHOTOMETER_POLICY|typeof VARIABLE_FIELD_PHOTOMETER_POLICY;telescopeIndex?:PhotometerTelescopeIndex;apertureSelector?:number;nativeClusterFit?:NativeClusterFit|null;clusterFit?:PleiadesFit|null;timing?:PhotometerTiming;work?:PhotometerIntegration|null;callbacksUsed?:number;targetId:string;colors:Readonly<Record<string,PhotometerColor>>;filter:PhotometerFilter;contextId:number;skies:Readonly<Record<PhotometerFilter,PhotometerReading|null>>;color:PhotometerColor|null;seedAtStart:number;seed:number;armed:boolean;pointing:PleiadesFieldKind;phase:'idle'|'running'|'stopped'|'complete';sky:PhotometerReading|null;current:PhotometerReading|null;readings:readonly PhotometerReading[];entries:readonly PhotometerEntry[];events:readonly PhotometerEvent[]}>;
/** Review 4 item 8: the state label follows the widest target set selected so far (added targets: the v11 label, the sixteen
 * expanded targets: the v5 label); it never narrows. The persisted owner/policy is still derived from history. */
function labelFor(current:PhotometerState['policy'],targetId:string):PhotometerState['policy']{
 if(isAddedPhotometerTarget(targetId)||current===VARIABLE_FIELD_PHOTOMETER_POLICY)return VARIABLE_FIELD_PHOTOMETER_POLICY;
 return isExpandedPhotometerTarget(targetId)?EXPANDED_PHOTOMETER_POLICY:current;
}
export function createPhotometer(seed:number):PhotometerState {randomDraw(seed);return Object.freeze({policy:PHOTOMETER_POLICY,targetId:PINNED_PLEIADES_V_TARGET.catalogId,colors:Object.freeze({}),filter:'V',contextId:0,skies:emptySkies(),color:null,seedAtStart:seed,seed,armed:false,pointing:'sky',phase:'idle',sky:null,current:null,readings:Object.freeze([]),entries:Object.freeze([]),events:Object.freeze([])});}
export type PhotometerColor=Readonly<{bReadingId:number;vReadingId:number;targetId:string;telescopeIndex?:PhotometerTelescopeIndex;apertureSelector?:number;acquired:number;transcribed:number}>;
const emptySkies=()=>Object.freeze({U:null,B:null,V:null});
function eventValid(e:PhotometerEvent):boolean {
 if(!e||typeof e!=='object'||Array.isArray(e))return false;
 const keys=e.type==='telescope'?['type','index']:e.type==='aperture'?['type','selector']:e.type==='nativeClusterFit'?['type','modulusTicks','ebvTicks','ageIndex','modelIndex','offsetTicks','extinctionCorrected','interpretation']:e.type==='clusterFit'?['type','modulus']:e.type==='timing'?['type','secondsPerIntegration','integrations']:e.type==='advance'?['type','callbacks']:e.type==='target'?['type','targetId']:e.type==='filter'?['type','filter']:e.type==='color'?['type','bReadingId','vReadingId']:e.type==='point'?['type','kind']:e.type==='record'?['type','readingId','value','note']:['type'];
 if(Object.keys(e).length!==keys.length||keys.some(k=>!Object.hasOwn(e,k)))return false;
 return e.type==='telescope'?isPhotometerTelescopeIndex(e.index):e.type==='aperture'?validPhotometerAperture(e.selector):e.type==='nativeClusterFit'?validNativeClusterParameters(e):e.type==='clusterFit'?(typeof e.modulus==='number'&&Number.isFinite(e.modulus)):e.type==='timing'?(PHOTOMETER_SECONDS.includes(e.secondsPerIntegration)&&PHOTOMETER_REPEATS.includes(e.integrations)):e.type==='advance'?(Number.isSafeInteger(e.callbacks)&&e.callbacks>=1&&e.callbacks<=MAX_PHOTOMETER_CALLBACKS_PER_READING):e.type==='target'?isPhotometerTarget(e.targetId):e.type==='filter'?isPhotometerFilter(e.filter):e.type==='color'?(Number.isSafeInteger(e.bReadingId)&&Number.isSafeInteger(e.vReadingId)):e.type==='point'?(e.kind==='sky'||e.kind==='object'):e.type==='record'?(Number.isSafeInteger(e.readingId)&&e.readingId>0&&Number.isFinite(e.value)&&e.value>=-50&&e.value<=100&&typeof e.note==='string'&&e.note.length<=500):['activate','deactivate','start','stop','complete'].includes(e.type);
}
/** Start reset/Stop/no-reduction match the pinned native branches. Context
 * release clears sky as a declared web boundary; admitted telescope changes require an inactive context.
 * Notebook confirmation is a separate manual web action, NOT native Record. */
function transition(s:PhotometerState,e:PhotometerEvent,live:boolean):PhotometerState {
 if(!eventValid(e))throw new PhotometerError('event');
 if(e.type==='telescope')e={type:'telescope',index:e.index===0?0:e.index};
 if(e.type==='nativeClusterFit'){e={...e,modulusTicks:e.modulusTicks+0,ebvTicks:e.ebvTicks+0,ageIndex:e.ageIndex+0,modelIndex:e.modelIndex+0,offsetTicks:e.offsetTicks+0};if(s.phase!=='running'&&sameNativeCluster(s.nativeClusterFit,e))return s;}
 if(e.type==='clusterFit'){e={...e,modulus:e.modulus+0};if(s.phase!=='running'&&s.clusterFit?.modulus===e.modulus)return s;}
 if(e.type==='telescope'&&!s.armed&&s.phase!=='running'&&(s.telescopeIndex??0)===e.index)return s;
 if(e.type==='aperture'&&s.armed&&s.phase!=='running'&&(s.apertureSelector??10)===e.selector)return s;
 if(e.type==='deactivate'&&!s.armed&&s.phase!=='running')return s;
 if(e.type==='stop'&&s.phase!=='running')return s;
 if(s.timing||e.type==='timing'){
  const coalesce=e.type==='advance'&&s.events.at(-1)?.type==='advance',needed=e.type==='start'?4:e.type==='advance'?(coalesce?2:3):e.type==='record'||e.type==='stop'?2:e.type==='deactivate'?1:e.type==='nativeClusterFit'||e.type==='clusterFit'?(s.armed?2:1):5;
  if(s.events.length+needed>MAX_PHOTOMETER_EVENTS)throw new PhotometerError('limit');
 }else if(s.events.length>=MAX_PHOTOMETER_EVENTS||(s.events.length>=MAX_PHOTOMETER_EVENTS-3&&!['stop','deactivate','complete'].includes(e.type)))throw new PhotometerError('limit');
 let next:PhotometerState=s;
 if(e.type==='activate'){
  if(s.armed||s.phase==='running')throw new PhotometerError('phase');
  next={...s,armed:true,contextId:s.contextId+1,skies:emptySkies(),pointing:'sky',sky:null,current:null,phase:'idle',...(s.timing?{work:null}:{})};
 }else if(e.type==='telescope'){
  if(s.armed||s.phase==='running')throw new PhotometerError('phase');
  const targetId=isPhotometerTelescopeTarget(s.targetId,e.index)?s.targetId:PINNED_PLEIADES_V_TARGET.catalogId;
  next={...s,telescopeIndex:e.index,targetId,pointing:'sky',skies:emptySkies(),sky:null,current:null,phase:'idle',color:s.colors[targetId]??null,...(s.timing?{work:null}:{})};
 }else if(e.type==='aperture'){
  if(!s.armed||s.phase==='running')throw new PhotometerError('phase');
  next={...s,apertureSelector:e.selector,current:null,phase:'idle',...(s.timing?{work:null}:{})};
 }else if(e.type==='timing'){
  if(!s.armed||s.phase==='running')throw new PhotometerError('phase');const timing=photometerTiming(e.secondsPerIntegration,e.integrations);
  next={...s,policy:s.policy===EXPANDED_PHOTOMETER_POLICY||s.policy===VARIABLE_FIELD_PHOTOMETER_POLICY?s.policy:TIMED_PHOTOMETER_POLICY,timing,callbacksUsed:s.callbacksUsed??s.readings.length,work:null,current:null,phase:'idle'};
 }else if(e.type==='deactivate')next={...s,armed:false,skies:emptySkies(),sky:null,phase:s.phase==='running'?'stopped':s.phase};
 else if(e.type==='target'){
  if(!s.armed||s.phase==='running')throw new PhotometerError('phase');
  if(!isPhotometerTelescopeTarget(e.targetId,s.telescopeIndex??0))throw new PhotometerError('event');
  next={...s,policy:labelFor(s.policy,e.targetId),targetId:e.targetId,pointing:'object',current:null,phase:'idle',...(s.timing?{work:null}:{}),color:s.colors[e.targetId]??null};
 }else if(e.type==='filter'){
  if(!s.armed||s.phase==='running')throw new PhotometerError('phase');
  next={...s,filter:e.filter,sky:s.skies[e.filter],current:null,phase:'idle',...(s.timing?{work:null}:{})};
 }else if(e.type==='nativeClusterFit'){
  next={...s,nativeClusterFit:confirmNativeCluster(s,e)};
 }else if(e.type==='clusterFit'){
  next={...s,clusterFit:confirmPleiadesFit(s,e.modulus)};
 }else if(e.type==='color'){
  if(s.phase==='running')throw new PhotometerError('phase');
  const color=photometerColor(s,e.bReadingId,e.vReadingId);
  next={...s,...(s.clusterFit?{clusterFit:null}:{}),...(s.nativeClusterFit?{nativeClusterFit:null}:{}),color,colors:Object.freeze({...s.colors,[color.targetId]:color})};
 }else if(e.type==='point'){
  if(!s.armed||s.phase==='running')throw new PhotometerError('phase');
  next={...s,pointing:e.kind,current:null,phase:'idle',...(s.timing?{work:null}:{})};
 }else if(e.type==='start'){
  if(!s.armed||s.phase==='running')throw new PhotometerError('phase');
  if(s.pointing==='object'&&(!s.sky||s.sky.filter!==s.filter||s.sky.contextId!==s.contextId||(s.sky.telescopeIndex??0)!==(s.telescopeIndex??0)))throw new PhotometerError('sky');
  if(s.timing&&(s.callbacksUsed??0)+requiredPhotometerCallbacks(s.timing)>MAX_PHOTOMETER_CALLBACKS)throw new PhotometerError('limit');
  next={...s,current:null,phase:'running',...(s.timing?{work:createPhotometerIntegration(s.timing,s.pointing,s.filter,s.targetId,s.seed,s.apertureSelector??10,s.telescopeIndex??0)}:{})};
 }else if(e.type==='stop')next={...s,phase:'stopped'};
 else if(e.type==='advance'){
  if(!s.timing||!s.work||!s.armed||s.phase!=='running')throw new PhotometerError('phase');
  if(s.pointing==='object'&&(!s.sky||s.sky.filter!==s.filter||s.sky.contextId!==s.contextId||(s.sky.telescopeIndex??0)!==(s.telescopeIndex??0)))throw new PhotometerError('sky');
  if((s.callbacksUsed??0)+e.callbacks>MAX_PHOTOMETER_CALLBACKS)throw new PhotometerError('limit');
  const work=advancePhotometerIntegration(s.work,e.callbacks);next={...s,work,seed:work.seed,callbacksUsed:(s.callbacksUsed??0)+e.callbacks};
  if(work.callbacks===requiredPhotometerCallbacks(s.timing)){
   const callback=Object.freeze({sourceCount:work.sourceCount,skyCount:work.skyCount,totalPhotonCount:work.totalPhotonCount,initialSeed:work.initialSeed,seed:work.seed,draws:work.draws,nativeBaseCountSum:work.nativeBaseCountSum,timerWaitMs:PHOTOMETER_CALLBACK_MS});
   next=finishReading(next,callback,Object.freeze({...s.timing,callbacks:work.callbacks,periodCounts:work.periodCounts}));
  }
 }else if(e.type==='complete'){
  if(s.timing)throw new PhotometerError('event');
  if(!s.armed||s.phase!=='running')throw new PhotometerError('phase');
  if(s.pointing==='object'&&(!s.sky||s.sky.filter!==s.filter||s.sky.contextId!==s.contextId||(s.sky.telescopeIndex??0)!==(s.telescopeIndex??0)))throw new PhotometerError('sky');
  const callback=drawPinnedPleiadesUbv(s.pointing,s.filter,s.seed,s.targetId,s.apertureSelector??10,s.telescopeIndex??0);
  next=finishReading({...s,seed:callback.seed},callback);
 }else if(e.type==='record'){
  if(!s.armed||s.phase!=='complete'||s.pointing!=='object'||s.current?.kind!=='object'||s.current.id!==e.readingId||s.current.targetId!==s.targetId||s.current.reduction?.status!=='available'||s.entries.some(r=>r.readingId===e.readingId))throw new PhotometerError('entry');
  next={...s,entries:Object.freeze([...s.entries,Object.freeze({readingId:e.readingId,value:e.value,note:e.note})])};
 }
 const last=s.events.at(-1),events=e.type==='advance'&&last?.type==='advance'?[...s.events.slice(0,-1),Object.freeze({type:'advance' as const,callbacks:last.callbacks+e.callbacks})]:[...s.events,Object.freeze({...e})];
 // Reserve the largest possible running suffix once,at Start. Advances then
 // only change up to four digits and reuse that admitted space;no full journal
 // is encoded on each100ms callback. All other live edits keep terminal release
 // bytes available. Replay admits the already bounded final history directly.
 if(live&&e.type!=='advance'){
  const future:PhotometerEvent[]=[...events];
  if(next.phase==='running'){
   if(next.timing){future.push({type:'advance',callbacks:requiredPhotometerCallbacks(next.timing)},{type:'stop'});}
   else future.push({type:'complete'});
  }
  if(next.armed)future.push({type:'deactivate'});
  if(!photometerJournalFits(next.seedAtStart,future))throw new PhotometerError('limit');
 }
 return Object.freeze({...next,events:Object.freeze(events)});
}
export function photometerEvent(s:PhotometerState,e:PhotometerEvent){return transition(s,e,true);}
export function releasePhotometer(s:PhotometerState){return photometerEvent(photometerEvent(s,{type:'stop'}),{type:'deactivate'});}
export function replayPhotometer(seed:number,events:readonly PhotometerEvent[]):PhotometerState {
 if(!Array.isArray(events)||events.length>MAX_PHOTOMETER_EVENTS)throw new PhotometerError('session');
 photometerReplayCallbacks(events);if(!photometerJournalFits(seed,events))throw new PhotometerError('session');let s=createPhotometer(seed);for(const e of events)s=transition(s,e,false);return s;
}

/** Same recovered reduction/identity binding for legacy and timed completion. */
function finishReading(s:PhotometerState,callback:Callback,integration?:PhotometerReading['integration']):PhotometerState{
 const telescopeIndex=integration?(s.work?.telescopeIndex??0):(s.telescopeIndex??0);
 if(integration&&telescopeIndex!==(s.telescopeIndex??0))throw new PhotometerError('phase');
 const apertureSelector=integration?(s.work?.apertureSelector??10):(s.apertureSelector??10);
 if(integration&&(!s.work||apertureSelector!==(s.apertureSelector??10)))throw new PhotometerError('phase');
 const base={...(integration??LEGACY_PHOTOMETER_TIMING),apertureSelector},skyTiming=s.sky?.integration??LEGACY_PHOTOMETER_TIMING;
 const reduction=s.pointing==='object'?reducePhotometerObject({...base,totalPhotonCount:callback.totalPhotonCount,nativeBaseCountSum:callback.nativeBaseCountSum,zeroPointMagnitude:photometerTelescope(telescopeIndex).zeroPoint,skyAtReferenceAperture:reducePhotometerSky({...skyTiming,apertureSelector:s.sky!.apertureSelector??10,totalPhotonCount:s.sky!.callback.totalPhotonCount}).skyAtReferenceAperture}):null;
 const reading=Object.freeze({id:s.readings.length+1,...(s.telescopeIndex!==undefined?{telescopeIndex}:{}),...(s.apertureSelector!==undefined?{apertureSelector}:{}),...(integration?{integration}:{}),kind:s.pointing,filter:s.filter,targetId:s.pointing==='object'?s.targetId:null,fieldTargetId:s.targetId,contextId:s.contextId,callback,skyReadingId:s.pointing==='object'?s.sky!.id:null,reduction});
 return {...s,phase:'complete',current:reading,sky:s.pointing==='sky'?reading:s.sky,skies:s.pointing==='sky'?Object.freeze({...s.skies,[s.filter]:reading}):s.skies,readings:Object.freeze([...s.readings,reading])};
}

/** Only explicit, confirmed notebook entries backed by acquired object readings
 * from the same pinned target. No catalog color or newest-row inference. */
export function photometerColor(s:PhotometerState,bReadingId:number,vReadingId:number):PhotometerColor {
 const b=s.readings.find(r=>r.id===bReadingId),v=s.readings.find(r=>r.id===vReadingId),be=s.entries.find(e=>e.readingId===bReadingId),ve=s.entries.find(e=>e.readingId===vReadingId);
 if(!b||!v||!be||!ve||b.kind!=='object'||v.kind!=='object'||b.filter!=='B'||v.filter!=='V'||(b.telescopeIndex??0)!==(v.telescopeIndex??0)||(b.apertureSelector??10)!==(v.apertureSelector??10)||b.targetId!==v.targetId||!isPhotometerTarget(b.targetId)||b.targetId!==s.targetId||b.reduction?.status!=='available'||v.reduction?.status!=='available')throw new PhotometerError('color');
 return Object.freeze({bReadingId,vReadingId,targetId:b.targetId,...(b.telescopeIndex!==undefined||v.telescopeIndex!==undefined?{telescopeIndex:b.telescopeIndex??0}:{}),...(b.apertureSelector!==undefined||v.apertureSelector!==undefined?{apertureSelector:b.apertureSelector??10}:{}),acquired:photometricBMinusV(b.reduction.magnitude,v.reduction.magnitude),transcribed:photometricBMinusV(be.value,ve.value)});
}
