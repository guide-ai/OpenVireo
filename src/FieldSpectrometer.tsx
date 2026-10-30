import {useCallback,useEffect,useImperativeHandle,useMemo,useRef,useState,type Ref} from 'react';
import {t,scientific} from './i18n';
import {useBoundedExposure,type ExposureEngine} from './useBoundedExposure';
import {instrumentAccess} from './core/instrumentAccess';
import {lssExposureEngine} from './core/lssExposure';
import {JournalError} from './core/exposureJournal';
import {frozenObservatoryTime,type FieldResult,type FieldTelescope} from './core/fieldEngine';
import {fieldSpectrumCsv,parseFieldSpectrumPolicy,serializeFieldSpectrumSession} from './core/fieldSpectrometer';
import type {JournalState} from './core/exposureJournal';
import type {Pointing} from './core/sky';
import {fieldInfoReasonText} from './observatory/FieldInfoMessages';
import type {FieldSpectrumRecord,PreparedFieldSpectrum} from './io/fieldSpectrometer';
import {fieldSpectrumBytes,fieldSpectrumFileName} from './core/exposureSpectrum';
import type {ClassificationImport} from './core/classificationImport';
import type {ExposureWorkspace} from './core/observingWorkspace';
import {FieldSpectrumSave} from './observatory/RouteSpectrumSave';
import {fieldSpectrumFailure,fieldSpectrumHiddenMasked,type FieldSpectrumShown} from './io/fieldSpectrumFailure';

/** Front G (G4a, analysis/front-plans/front-g-gsc.md §11): VIREO's single-slit spectrometer wherever the telescope points. The
 * field is read from the compact GSC tiles; the slit takes the nearest object (0x59a0fc) and the engine's star, galaxy and QSO
 * branches give the spectrum, or a typed reason. Exercise routes and their counts are not affected. */
/** currentJd: the observatory clock's JD reader (a stable function); it is read once, when the student presses Use (G4a review 1
 * M1), and recorded in the policy. */
/** G4c: onClassify/onAnalyze receive the field spectrum's own .SSP read back as a saved file; onRecord receives the field and its
 * exposure whenever either changes (null when there is none or it is masked); controllerRef lets the investigation Save take a
 * paused snapshot; restore (a new token) replaces the field with an investigation's record, or clears it. All stable. */
export type FieldSpectrometerController=Readonly<{snapshot:()=>FieldSpectrumRecord|null}>;
export type FieldSpectrometerLink=Readonly<{active:boolean;pointing:Pointing;gate:Readonly<{tracking:boolean;moving:boolean;finder:boolean;domeOpen:boolean}>;telescope:FieldTelescope;hidden:Pointing|null;currentJd?:()=>number;
 onClassify?:(source:ClassificationImport)=>void;onAnalyze?:(source:ClassificationImport)=>void;onRecord?:(record:FieldSpectrumRecord|null)=>void;
 controllerRef?:Ref<FieldSpectrometerController>;restore?:Readonly<{token:number;record:FieldSpectrumRecord|null}>|null;projectBusy?:boolean}>;
type Ready=Extract<PreparedFieldSpectrum,{status:'ready'}>;
type Shown=FieldSpectrumShown;
const failure=fieldSpectrumFailure;
const kindOf=(r:FieldResult)=>r.qsoTarget?'qso':r.starTarget?'star':r.target?'galaxy':null;
/** onAdopt: a session taken at this pointing and telescope at another observatory time re-prepares its own field (its JD); the
 * page then shows that field with the restored journal (G4a closure N2). */
function engineFor(prepared:Ready,hidden:Pointing|null,onAdopt:(p:Ready,s:JournalState)=>void):ExposureEngine{
 const e=lssExposureEngine(prepared.result,prepared.policy),c=prepared.result.calibration!;
 return {...e,
  csv:s=>fieldSpectrumCsv(s,c.wavelengths),
  serialize:serializeFieldSpectrumSession,
  read:async(file:File)=>{
   if(file.size>2*1024*1024)throw new JournalError('session');
   const {readFieldSpectrumSession}=await import('./io/fieldSpectrometer');
   // A session belongs to one pointing and telescope: it restores only there, at the session's own observatory time.
   const text=await file.text();let policy:unknown;try{policy=(JSON.parse(text) as {policy?:unknown}).policy;}catch{throw new JournalError('session');}
   const p=parseFieldSpectrumPolicy(policy);
   if(!p||p.pointing.ra!==prepared.pointing.ra||p.pointing.dec!==prepared.pointing.dec||p.telescope!==prepared.telescope)throw new JournalError('session');
   const r=await readFieldSpectrumSession(text,{hidden});
   if(r.prepared.policy!==prepared.policy)onAdopt(r.prepared,r.state);
   return r.state;
  },
  basename:`openvireo-field-spectrum-${prepared.pointing.ra}_${prepared.pointing.dec}_T${prepared.telescope}`,activated:t('fieldSpec.activated'),started:t('fieldSpec.started'),restored:t('fieldSpec.restored')};
}
type AcquisitionHandle=Readonly<{snapshot:()=>JournalState|null}>;
function Acquisition({prepared,fieldMatches,active,hidden,onAdopt,restored,onWorkspaceChange,handle,onClassify,onAnalyze,projectBusy}:{prepared:Ready;fieldMatches:boolean;active:boolean;hidden:Pointing|null;onAdopt:(p:Ready,s:JournalState)=>void;restored:JournalState|null;
 onWorkspaceChange:(w:ExposureWorkspace)=>void;handle:Ref<AcquisitionHandle>;onClassify?:(source:ClassificationImport)=>void;onAnalyze?:(source:ClassificationImport)=>void;projectBusy:boolean}){
 const heading=useRef<HTMLHeadingElement>(null),engine=useMemo(()=>engineFor(prepared,hidden,onAdopt),[prepared,hidden,onAdopt]);
 const {state,seed,setSeed,notice,setNotice,error,setError,busy,running,armed,activate,start,stop,save,restore,reset,cancel,newSeed,snapshot}=useBoundedExposure({engine,active,fieldMatches,onActivate:()=>{},heading,onWorkspaceChange,projectBusy,
  ...(restored?{initialWorkspace:{state:restored,seedText:String(restored.seedAtReset)}}:{})});
 useEffect(()=>{if(restored)setNotice(t('fieldSpec.restored'));},[]);// eslint-disable-line react-hooks/exhaustive-deps
 useImperativeHandle(handle,()=>({snapshot:()=>snapshot().state}));
 // G4c: Classify and Analyze read the exposure's own .SSP back, as if the student had opened the saved file.
 async function handOff(to:(source:ClassificationImport)=>void){
  setError('');try{const s=stop();if(!s)return;const o=prepared.result.qsoTarget??prepared.result.starTarget??prepared.result.target!;
   const bytes=fieldSpectrumBytes(s,prepared.result,prepared.pointing),{readClassificationImport}=await import('./io/classificationImports');
   to(await readClassificationImport(new File([bytes.slice().buffer],fieldSpectrumFileName(o.id),{type:'text/plain'})));}
  catch{setError(t('fieldSpec.handOffError'));}
 }
 const stopped=!!state&&!running&&(state.exposure.draws>0);
 const e=state?.exposure,total=(e?.sourceTotal??0)+(e?.skyTotal??0),max=Math.max(1,...(e?.counts??[]));
 const points=e?.counts.map((n,i)=>`${55+i*890/599},${235-n*180/max}`).join(' ')??'';
 return <section className="card" aria-labelledby="field-spec-acquire" data-testid="field-spec-acquisition">
  <h3 id="field-spec-acquire" ref={heading} tabIndex={-1}>{t('fieldSpec.acquireTitle')}</h3>
  <div className="sky-actions"><button className="primary-button" disabled={running||busy||armed||!fieldMatches} onClick={activate}>{t('fieldSpec.activate')}</button><button className="primary-button" disabled={!armed||running||busy||!fieldMatches} onClick={start}>{t('fieldSpec.start')}</button><button className="secondary-button" disabled={!running||busy} onClick={()=>{stop();setNotice(t('skyExposure.pausedCountsAndTheRandomState'));}}>{t('fieldSpec.pause')}</button><button className="secondary-button" disabled={!state||busy} onClick={reset}>{t('skyExposure.resetCounts')}</button><button className="secondary-button" disabled={!state||busy} onClick={cancel}>{t('skyExposure.cancelAndDiscard')}</button></div>
  <p role="status" data-testid="field-spec-phase">{running?t('skyExposure.exposing'):armed?t('skyExposure.readyPaused'):t('skyExposure.deactivated')}</p>
  <dl className="lss-totals"><dt>{t('skyExposure.committedExposure')}</dt><dd data-testid="field-spec-elapsed">{t('lss.exposure.elapsed',{ms:e?.elapsedMs??0})}</dd><dt>{t('galaxyExposure.totalCounts')}</dt><dd data-testid="field-spec-total">{total}</dd></dl>
  <label htmlFor="field-spec-seed">{t('skyExposure.browserRandomSeedUint32')}</label><input id="field-spec-seed" inputMode="numeric" maxLength={80} value={seed} disabled={running||busy} onChange={event=>setSeed(event.target.value)}/><button className="secondary-button" disabled={running||busy} onClick={newSeed}>{t('skyExposure.newSeededExposure')}</button>
  <div className="sky-actions"><button className="secondary-button" disabled={!e?.draws||busy} onClick={()=>save('csv')}>{t('fieldSpec.saveCsv')}</button><button className="secondary-button" disabled={!state||busy} onClick={()=>save('json')}>{t('fieldSpec.saveJson')}</button></div>
  <label htmlFor="field-spec-session">{t('fieldSpec.restore')}</label><input id="field-spec-session" type="file" accept=".json,application/json" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void restore(file);}}/>
  <svg className="source-spectrum" viewBox="0 0 1000 290" role="img" aria-label={t('fieldSpec.chart')}><line x1="55" x2="945" y1="235" y2="235"/><line x1="55" x2="55" y1="45" y2="235"/>{e&&<polyline points={points} fill="none"/>}</svg>
  {(onClassify||onAnalyze)&&<div className="sky-actions">{onAnalyze&&<button className="secondary-button" data-testid="field-spec-analyze" disabled={!stopped||busy} onClick={()=>void handOff(onAnalyze)}>{t('fieldSpec.analyze')}</button>}{onClassify&&<button className="secondary-button" data-testid="field-spec-classify" disabled={!stopped||busy} onClick={()=>void handOff(onClassify)}>{t('fieldSpec.classify')}</button>}</div>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  <FieldSpectrumSave state={state} result={prepared.result} pointing={prepared.pointing} telescope={prepared.telescope} active={active} busy={busy}/>
 </section>;
}
export default function FieldSpectrometer({link}:{link:FieldSpectrometerLink}){
 const [prepared,setPrepared]=useState<Shown|null>(null),[loading,setLoading]=useState(false),request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 useEffect(()=>{if(!link.active){request.current?.abort();setLoading(false);}},[link.active]);
 async function useHere(){
  request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);
  try{const {prepareFieldSpectrum}=await import('./io/fieldSpectrometer');const variableTime=frozenObservatoryTime(link.currentJd);const r=await prepareFieldSpectrum({ra:link.pointing.ra,dec:link.pointing.dec},link.telescope,{signal:controller.signal,hidden:link.hidden,...(variableTime?{variableTime}:{})});if(!controller.signal.aborted)setPrepared(r);}
  catch(e){if(!controller.signal.aborted)setPrepared(failure(e));}
  finally{if(request.current===controller){request.current=null;setLoading(false);}}
 }
 const [restored,setRestored]=useState<Readonly<{policy:string;state:JournalState;token:number}>|null>(null),tokens=useRef(0);
 const adopt=useCallback((p:Ready,s:JournalState)=>{setRestored({policy:p.policy,state:s,token:++tokens.current});setPrepared(p);},[]);
 // G4c: an investigation's record replaces the field (or clears it) when its token changes.
 const restoreToken=link.restore?.token;
 useEffect(()=>{if(restoreToken===undefined||!link.restore)return;request.current?.abort();setLoading(false);const r=link.restore.record;
  if(r){setPrepared(r.prepared);setRestored({policy:r.prepared.policy,state:r.state,token:++tokens.current});}else{setPrepared(null);setRestored(null);}},[restoreToken]);// eslint-disable-line react-hooks/exhaustive-deps
 // G4c: a hidden Object X target chosen after the field was prepared masks it from then on (every output is withheld).
 const masked=prepared?.status==='ready'&&fieldSpectrumHiddenMasked(prepared.pointing,link.hidden);
 const shown:Shown|null=masked?Object.freeze({status:'unavailable',reason:'object-x-hidden'}):prepared;
 const ready=shown?.status==='ready'?shown:null;
 const acquisition=useRef<AcquisitionHandle>(null),readyRef=useRef(ready);readyRef.current=ready;
 const {onRecord}=link;
 const publish=useCallback((w:ExposureWorkspace)=>{const p=readyRef.current;onRecord?.(p&&w.state?Object.freeze({prepared:p,state:w.state}):null);},[onRecord]);
 // The record follows the shown field: none, or the restored journal until the student changes it.
 const restoredState=ready&&restored?.policy===ready.policy?restored.state:null;
 useEffect(()=>{onRecord?.(ready&&restoredState?Object.freeze({prepared:ready,state:restoredState}):null);},[ready,restoredState,onRecord]);
 useImperativeHandle(link.controllerRef,()=>({snapshot:()=>{const p=readyRef.current;if(!p)return null;const s=acquisition.current?.snapshot()??null;return s?Object.freeze({prepared:p,state:s}):null;}}),[]);
 const same=!!ready&&ready.pointing.ra===link.pointing.ra&&ready.pointing.dec===link.pointing.dec&&ready.telescope===link.telescope;
 const access=instrumentAccess({...link.gate,configurationAvailable:true,pointingMatches:same});
 const r=ready?.result,kind=r?kindOf(r):null,object=r?.qsoTarget??r?.starTarget??r?.target??null;
 return <section className="card field-spectrometer" aria-labelledby="field-spec-title" data-testid="field-spectrometer">
  <h2 id="field-spec-title">{t('fieldSpec.title')}</h2><p>{t('fieldSpec.help')}</p>
  <p role="status" data-testid="field-spec-access" data-access={access}>{t(`instrumentAccess.${access}`)}</p>
  <button type="button" className="primary-button" data-testid="field-spec-use" disabled={loading||link.gate.moving} onClick={()=>void useHere()}>{t('fieldSpec.use')}</button>
  {loading&&<p role="status">{t('fieldSpec.loading')}</p>}
  {shown?.status==='unavailable'&&<p role="status" data-testid="field-spec-status" data-reason={shown.reason}>{shown.reason==='internal'?t('fieldSpec.internalError'):shown.reason==='object-x-hidden'||shown.reason==='load-error'?fieldInfoReasonText(shown.reason):fieldInfoReasonText(shown.reason,'detail' in shown?shown.detail??'':'')}</p>}
  {ready&&<div data-testid="field-spec-field" data-kind={kind??'none'}>
   <p>{t('fieldSpec.field',{ra:ready.pointing.ra,dec:ready.pointing.dec,telescope:ready.telescope})}</p>
   <p data-testid="field-spec-object">{object?t('fieldSpec.object',{kind:t(`fieldSpec.kind.${kind!}`),id:object.id,magnitude:scientific(object.magnitude,4,true)}):t('fieldSpec.noObject')}</p>
   {r!.calibration&&<p>{t('lss.exposure.slit',{level:r!.calibration.pixelLevel,fraction:scientific(r!.calibration.fraction,6,true)})}</p>}
   {r!.reasons.length>0&&<p role="status" data-testid="field-spec-reasons" data-reasons={r!.reasons.join(' ')}>{t('fieldSpec.reasons',{reasons:r!.reasons.map(x=>t(`fieldSpec.reason.${x}` as 'fieldSpec.reason.slit-empty')).join('; ')})}</p>}
   {!same&&<p role="status">{t('fieldSpec.moved')}</p>}
  </div>}
  {ready&&!r!.reasons.length&&r!.calibration&&<Acquisition key={`${ready.policy}#${restored?.policy===ready.policy?restored.token:0}`} handle={acquisition} prepared={ready} fieldMatches={access==='ready'} active={link.active} hidden={link.hidden} onAdopt={adopt} restored={restored?.policy===ready.policy?restored.state:null} onWorkspaceChange={publish} onClassify={link.onClassify} onAnalyze={link.onAnalyze} projectBusy={!!link.projectBusy}/>}
 </section>;
}
