import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
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
import type {PreparedFieldSpectrum} from './io/fieldSpectrometer';
import {fieldSpectrumFailure,type FieldSpectrumShown} from './io/fieldSpectrumFailure';

/** Front G (G4a, analysis/front-plans/front-g-gsc.md §11): VIREO's single-slit spectrometer wherever the telescope points. The
 * field is read from the compact GSC tiles; the slit takes the nearest object (0x59a0fc) and the engine's star, galaxy and QSO
 * branches give the spectrum, or a typed reason. Exercise routes and their counts are not affected. */
/** currentJd: the observatory clock's JD reader (a stable function); it is read once, when the student presses Use (G4a review 1
 * M1), and recorded in the policy. */
export type FieldSpectrometerLink=Readonly<{active:boolean;pointing:Pointing;gate:Readonly<{tracking:boolean;moving:boolean;finder:boolean;domeOpen:boolean}>;telescope:FieldTelescope;hidden:Pointing|null;currentJd?:()=>number}>;
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
function Acquisition({prepared,fieldMatches,active,hidden,onAdopt,restored}:{prepared:Ready;fieldMatches:boolean;active:boolean;hidden:Pointing|null;onAdopt:(p:Ready,s:JournalState)=>void;restored:JournalState|null}){
 const heading=useRef<HTMLHeadingElement>(null),engine=useMemo(()=>engineFor(prepared,hidden,onAdopt),[prepared,hidden,onAdopt]);
 const {state,seed,setSeed,notice,setNotice,error,busy,running,armed,activate,start,stop,save,restore,reset,cancel,newSeed}=useBoundedExposure({engine,active,fieldMatches,onActivate:()=>{},heading,
  ...(restored?{initialWorkspace:{state:restored,seedText:String(restored.seedAtReset)}}:{})});
 useEffect(()=>{if(restored)setNotice(t('fieldSpec.restored'));},[]);// eslint-disable-line react-hooks/exhaustive-deps
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
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
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
 const [restored,setRestored]=useState<Readonly<{policy:string;state:JournalState}>|null>(null);
 const adopt=useCallback((p:Ready,s:JournalState)=>{setRestored({policy:p.policy,state:s});setPrepared(p);},[]);
 const ready=prepared?.status==='ready'?prepared:null;
 const same=!!ready&&ready.pointing.ra===link.pointing.ra&&ready.pointing.dec===link.pointing.dec&&ready.telescope===link.telescope;
 const access=instrumentAccess({...link.gate,configurationAvailable:true,pointingMatches:same});
 const r=ready?.result,kind=r?kindOf(r):null,object=r?.qsoTarget??r?.starTarget??r?.target??null;
 return <section className="card field-spectrometer" aria-labelledby="field-spec-title" data-testid="field-spectrometer">
  <h2 id="field-spec-title">{t('fieldSpec.title')}</h2><p>{t('fieldSpec.help')}</p>
  <p role="status" data-testid="field-spec-access" data-access={access}>{t(`instrumentAccess.${access}`)}</p>
  <button type="button" className="primary-button" data-testid="field-spec-use" disabled={loading||link.gate.moving} onClick={()=>void useHere()}>{t('fieldSpec.use')}</button>
  {loading&&<p role="status">{t('fieldSpec.loading')}</p>}
  {prepared?.status==='unavailable'&&<p role="status" data-testid="field-spec-status" data-reason={prepared.reason}>{prepared.reason==='internal'?t('fieldSpec.internalError'):prepared.reason==='object-x-hidden'||prepared.reason==='load-error'?fieldInfoReasonText(prepared.reason):fieldInfoReasonText(prepared.reason,'detail' in prepared?prepared.detail??'':'')}</p>}
  {ready&&<div data-testid="field-spec-field" data-kind={kind??'none'}>
   <p>{t('fieldSpec.field',{ra:ready.pointing.ra,dec:ready.pointing.dec,telescope:ready.telescope})}</p>
   <p data-testid="field-spec-object">{object?t('fieldSpec.object',{kind:t(`fieldSpec.kind.${kind!}`),id:object.id,magnitude:scientific(object.magnitude,4,true)}):t('fieldSpec.noObject')}</p>
   {r!.calibration&&<p>{t('lss.exposure.slit',{level:r!.calibration.pixelLevel,fraction:scientific(r!.calibration.fraction,6,true)})}</p>}
   {r!.reasons.length>0&&<p role="status" data-testid="field-spec-reasons" data-reasons={r!.reasons.join(' ')}>{t('fieldSpec.reasons',{reasons:r!.reasons.map(x=>t(`fieldSpec.reason.${x}` as 'fieldSpec.reason.slit-empty')).join('; ')})}</p>}
   {!same&&<p role="status">{t('fieldSpec.moved')}</p>}
  </div>}
  {ready&&!r!.reasons.length&&r!.calibration&&<Acquisition key={ready.policy} prepared={ready} fieldMatches={access==='ready'} active={link.active} hidden={link.hidden} onAdopt={adopt} restored={restored?.policy===ready.policy?restored.state:null}/>}
 </section>;
}
