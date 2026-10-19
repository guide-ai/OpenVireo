import {AcquisitionError} from './core/acquisition';
import type {ExposureWorkspace} from './core/observingWorkspace';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {t} from './i18n';
import {JournalError,MAX_JOURNAL_TICK_MS,parseJournalSeed as parseSkySeed,type JournalState} from './core/exposureJournal';
export type ExposureController=Readonly<{snapshot:()=>ExposureWorkspace;replace:(w:ExposureWorkspace)=>void}>;
export type ExposureEngine=Readonly<{
 maximumTickMS?:number;create:(seed:number)=>JournalState;activate:(s:JournalState)=>JournalState;start:(s:JournalState)=>JournalState;tick:(s:JournalState,delta:number)=>JournalState;pause:(s:JournalState)=>JournalState;deactivate:(s:JournalState)=>JournalState;reset:(s:JournalState)=>JournalState;cancel:(s:JournalState)=>JournalState;
 csv:(s:JournalState)=>string;serialize:(s:JournalState)=>string;read:(file:File)=>Promise<JournalState>;basename:string;activated:string;started:string;restored:string;
}>;
function exposureMessage(e:unknown,limit=MAX_JOURNAL_TICK_MS):string {
 if(e instanceof AcquisitionError&&e.code==='precision')return t('skyExposure.precisionGap');
 if(e instanceof JournalError){if(e.code==='time-gap')return t('skyExposure.clockGap',{limit});
 if(e.code==='journal-limit')return t('skyExposure.pausedThisSegmentReachedItsEvent');
 if(e.code==='seed')return t('skyExposure.enterAWholeNumberSeedFrom');
 if(e.code==='proof')return t('skyExposure.theSupportedFieldCouldNotBe');}
 return t('skyExposure.thisOperationCouldNotBeCompleted');
}
function download(text:string,name:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function useBoundedExposure({engine,active,fieldMatches,onActivate,onStart,canIntegrate,heading,initialWorkspace,onWorkspaceChange,projectBusy=false,configurationAvailable=true}:{configurationAvailable?:boolean;initialWorkspace?:ExposureWorkspace;onWorkspaceChange?:(w:ExposureWorkspace)=>void;projectBusy?:boolean;engine:ExposureEngine;active:boolean;fieldMatches:boolean;onActivate:()=>void;onStart?:()=>boolean;canIntegrate?:()=>boolean;heading:RefObject<HTMLHeadingElement|null>}){
 const permitted=useRef(canIntegrate);permitted.current=canIntegrate;
 const message=(e:unknown)=>exposureMessage(e,engine.maximumTickMS);
 const [state,setState]=useState<JournalState|null>(initialWorkspace?.state??null),[seed,setSeedState]=useState(initialWorkspace?.seedText??'1'),[notice,setNotice]=useState(''),[error,setError]=useState(''),[localBusy,setBusy]=useState(false);
 const busy=localBusy||projectBusy,seedCurrent=useRef(seed);
 const current=useRef(state),available=useRef(active&&fieldMatches&&configurationAvailable),timer=useRef<ReturnType<typeof setInterval>|null>(null),epoch=useRef(0),generation=useRef(0),pendingRestore=useRef(false);
 available.current=active&&fieldMatches&&configurationAvailable;
 const publish=()=>onWorkspaceChange?.(Object.freeze({state:current.current,seedText:seedCurrent.current}));
 const commit=(next:JournalState)=>{current.current=next;setState(next);publish();};
 function setSeed(text:string){seedCurrent.current=text;setSeedState(text);publish();}
 function stopClock(){epoch.current++;if(timer.current!==null)clearInterval(timer.current);timer.current=null;}
 function stop(){stopClock();const s=current.current;if(!s)return null;const next=engine.pause(s);commit(next);return next;}
 function action(fn:(s:JournalState)=>JournalState){setError('');try{stopClock();if(current.current)commit(fn(current.current));}catch(e){setError(message(e));}}
 const running=state?.exposure.phase==='running',armed=state?.armed===true;
 useEffect(()=>{if(active)heading.current?.focus();},[active]);
 useEffect(()=>{
  if(active&&fieldMatches&&configurationAvailable)return;
  const cancelled=pendingRestore.current;pendingRestore.current=false;generation.current++;setBusy(false);stopClock();const s=current.current;
  if(s?.armed||s?.exposure.phase==='running'){commit(engine.deactivate(s));setNotice(t('skyExposure.pausedAndDeactivatedAfterLeavingThe'));}if(cancelled)setNotice(t('exposureIO.cancelled'));
 },[active,fieldMatches,configurationAvailable]);
 useEffect(()=>{
  if(!active||!fieldMatches||!configurationAvailable||!armed||!running||busy)return;
  const id=++epoch.current;let last=Math.floor(performance.now());
  const handle=setInterval(()=>{
   if(epoch.current!==id||!available.current)return;
   const s=current.current;if(!s?.armed||s.exposure.phase!=='running')return;
   const now=Math.floor(performance.now()),delta=now-last;last=now;
   try{if(permitted.current&&!permitted.current())throw new JournalError('time-gap');commit(engine.tick(s,delta));}catch(e){stopClock();commit(engine.pause(s));setNotice(t('skyExposure.pausedCountsAndTheRandomState'));setError(message(e));}
  },100);timer.current=handle;
  return()=>{clearInterval(handle);if(epoch.current===id){epoch.current++;timer.current=null;}};
 },[active,fieldMatches,armed,running,busy,configurationAvailable]);
 useEffect(()=>{const hide=()=>{if(document.visibilityState==='hidden'&&current.current?.exposure.phase==='running'){stop();setNotice(t('skyExposure.pausedWhileThisTabWasHidden'));}};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);stopClock();generation.current++;};},[]);
 function activate(useCurrent=false){setError('');try{if(!configurationAvailable||useCurrent&&!available.current)throw new JournalError('phase');const next=engine.activate(current.current??engine.create(parseSkySeed(seed)));if(!useCurrent)onActivate();commit(next);setNotice(engine.activated);}catch(e){setError(message(e));}}
 function start(){setError('');try{if(!available.current||!current.current)throw new JournalError('phase');const next=engine.start(current.current);if(onStart&&!onStart())throw new JournalError('phase');commit(next);setNotice(engine.started);}catch(e){setError(message(e));}}
 function save(kind:'csv'|'json'){setError('');try{const s=stop();if(!s)return;download(kind==='csv'?engine.csv(s):engine.serialize(s),`${engine.basename}.${kind}`,kind==='csv'?'text/csv;charset=utf-8':'application/json');setNotice(t('exposureIO.saved'));}catch(e){setError(message(e));}}
 async function restore(file:File){setError('');stop();setNotice(t('exposureIO.loading'));const ticket=++generation.current;pendingRestore.current=true;setBusy(true);try{const s=await engine.read(file);if(ticket!==generation.current)return;commit(s);setSeed(String(s.seedAtReset));setNotice(engine.restored);}catch(e){if(ticket===generation.current){setError(message(e));setNotice(t('exposureIO.kept'));}}finally{if(ticket===generation.current){pendingRestore.current=false;setBusy(false);}}}
 function snapshot():ExposureWorkspace{const cancelled=pendingRestore.current;pendingRestore.current=false;stopClock();generation.current++;setBusy(false);if(current.current){const wasActive=current.current.armed||current.current.exposure.phase==='running';commit(engine.deactivate(current.current));if(wasActive)setNotice(t('skyExposure.pausedCountsAndTheRandomState'));}if(cancelled)setNotice(t('exposureIO.cancelled'));return Object.freeze({state:current.current,seedText:seedCurrent.current});}
 function replace(w:ExposureWorkspace){pendingRestore.current=false;stopClock();generation.current++;setBusy(false);const next=w.state?engine.deactivate(w.state):null;current.current=next;seedCurrent.current=w.seedText;setState(next);setSeedState(w.seedText);publish();setError('');setNotice(next?engine.restored:t('exposureIO.empty'));}
 function restoreSnapshot(s:JournalState){replace({state:s,seedText:String(s.seedAtReset)});}
 return {restoreSnapshot,snapshot,replace,state,seed,setSeed,notice,setNotice,error,setError,busy,running,armed,activate:()=>activate(false),activateCurrent:()=>activate(true),start,stop,save,restore,reset:()=>action(engine.reset),cancel:()=>action(engine.cancel),newSeed:()=>{setError('');try{const next=engine.create(parseSkySeed(seed));stopClock();commit(next);setNotice(t('skyExposure.newSeededSegmentPreparedPreviousCounts'));}catch(e){setError(message(e));}}};
}
