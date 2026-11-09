import {useSpectrometerParameterGate} from '../useSpectrometerParameterGate';
import {vireo} from '../i18n/vireo';
import {useEffect,useId,useMemo,useReducer,useRef,useState,useContext} from 'react';
import {TestModeContext} from '../polish/testModeContext';
import {VireoOptionsContext} from '../vireoOptionsContext';
import {DEFAULT_SPECTRAL_RANGE,sameRange,type SpectralRange} from '../core/spectralRange';
import {multiSpecFieldPicture} from '../polish/PrintSkyImage';
import {createMultiSpecState,multiSpecReducer,type MultiSpecEntry} from '../core/multiSpec';
import {multiSpecClickPoint,multiSpecPick,multiSpecTargetSource,type MultiSpecField} from '../core/multiSpecSelect';
import {MULTISPEC_MESSAGES as N,MultiSpecFormatError,multiSpecCaption,multiSpecFileName,multiSpecInformationLines,multiSpecListItem,multiSpecPrintLines,multiSpecSspBytes,multiSpecZip,type MultiSpecTextOptions} from '../core/multiSpecFormat';
import {catalogRecords,galaxyTypeText} from '../core/catalogObject';
import type {FieldView,FieldTelescope} from '../core/fieldEngine';
import {opticalProfile} from '../core/opticalTelescope';
import type {AccessReason} from '../core/instrumentAccess';
import {multiSpecSpectra,multiSpecView,type MultiSpecFieldRequest,type MultiSpecView} from '../io/multiSpec';
import {fieldInfoReasonText} from '../observatory/FieldInfoMessages';
import {fieldReasonText,t} from '../i18n';
import MultiSpecControl,{MultiSpecBox} from './MultiSpecControl';
import MultiSpecFieldOverlay from './MultiSpecFieldOverlay';
import MultiSpecList from './MultiSpecList';
import MultiSpecDisplay,{type MultiSpecResult} from './MultiSpecDisplay';
import {multiSpecFieldKey} from './multiSpecFields';
import {multiSpecAccessText,multiSpecFibreMask,multiSpecNameOptions,multiSpecReasonText,type MultiSpecMaskPolicy} from './multiSpecText';
import './multispec.css';

/** Front M (M3): the Multi-Spec instrument as the observatory and the Object X lab mount it. The control form is the pure reducer
 * core/multiSpec.ts; this component only presents it, feeds it whole-second ticks from a page timer (SpecTimer, Interval 1000 ms)
 * and turns its entries into spectra through the Worker (io/multiSpec.ts).
 *  - Access (RdngBtnClick case 3, 0x53ce0c) shows the control form; Close Multi-Spec hides it (spectra are kept, as the native
 *    global forms; Access again = Window ▸ Multi-Spec).
 *  - `armed` is the caller's CRT1MouseDown gate (plan §1, decision D1): Edit Mode ∨ exercise mode ∈ {0, 1}, in the Telescope view.
 *  - `mask` is the Object X rule (plan §4): names, V, Edit Mode lines and typed reasons are replaced while it masks.
 *  - Web [W]: Save is a browser download (no folder / file-name-base dialogs); Save All is one STORE .zip of the byte-exact .SSP
 *    files (decision D4); Show Object ID / Show Object Mag are VIREO's global options (Front R4d; compiled default off); Test Mode
 *    from the page's instructor options (Front T3; D5 superseded); nothing is saved with the investigation (D6). A new field (pointing or telescope) is the native field regeneration
 *    (0x53a741 → Clear Objects). The native FormShow disables tracking and the Telescope menu; here a telescope change remounts
 *    the instrument (the caller keys it by telescope). */
export type MultiSpecInstrumentProps=Readonly<{
 field:MultiSpecFieldRequest|null;telescope:FieldTelescope;access:AccessReason;armed:boolean;armedText:string;
 mask:MultiSpecMaskPolicy;editMode:boolean;busy:boolean;active:boolean;title:string;help:string;heading?:'h2'|'h3';
 /** Text when `field` is null (no bundled field at this position). */noFieldText:string;
 /** Front S3: the page's spectrometer range; each entry keeps the range current when its spectrum was first taken [W]. */spectralRange?:SpectralRange;
 /** Front S2: why the page's spectrometer range cannot be used here (Multi-Spec reads it, 0x526e7f); null when it can. */rangeBlock?:string|null;
}>;
type ViewState=Readonly<{status:'none'}|{status:'loading'}|{status:'error'}|{status:'ready';view:FieldView}|{status:'reasons';view:FieldView}|{status:'read';read:NonNullable<MultiSpecView['fieldRead']>}>;
type Result=Readonly<{status:'loading'}|{status:'error'}|{status:'done';exposure:Awaited<ReturnType<typeof multiSpecSpectra>>[number];galaxyType:string|null}>;
const entryKey=(e:Pick<MultiSpecEntry,'idx'|'seed'>)=>`${e.idx}:${e.seed}`;
const pageSeed=()=>{try{return crypto.getRandomValues(new Uint32Array(1))[0];}catch{return Math.floor(Math.random()*0x1_0000_0000)>>>0;}};
function download(name:string,bytes:Uint8Array,type:string){
 const url=URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>],{type})),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0);
}
/** A file name the browser and the zip writer accept (ASCII, no path separators) [W]. */
const safeName=(s:string)=>s.replace(/[^\x20-\x7e]|[\\/:*?"<>|]/g,'_');

export default function MultiSpecInstrument({field,telescope,access,armed,armedText,mask,editMode,busy,active,title,help,noFieldText,rangeBlock=null,heading:Heading='h2',spectralRange}:MultiSpecInstrumentProps){
 const id=useId(),fieldWrap=useRef<HTMLDivElement>(null);
 const [state,dispatch]=useReducer(multiSpecReducer,undefined,()=>createMultiSpecState(telescope,pageSeed()));
 // Front T6: Multi-Spec reads BaseMag, SpSky, SpBase and SpTimer (0x527013, 0x52702c, 0x52727a..0x527290); instructor values refuse it.
 const parameterRefusal=useSpectrometerParameterGate('multispec');
 // Review 1 L5: an open Multi-Spec stops exposing when instructor values appear, and Init / Go stay refused while they last.
 useEffect(()=>{if(parameterRefusal&&state.running)dispatch({type:'parameter-stop'});},[parameterRefusal,state.running]);// no Terminate question (it would loop: No resumes)
 const [view,setView]=useState<ViewState>({status:'none'}),[viewTry,setViewTry]=useState(0);
 const [results,setResults]=useState<ReadonlyMap<string,Result>>(new Map());
 // Front R4d: VIREO's global Show Object ID / Show Object Mag (env+0x2e81 / +0x2e80), no longer two local check boxes.
 const {showObjectId,showObjectMag}=useContext(VireoOptionsContext);
 const [selected,setSelected]=useState<number|null>(null),[shown,setShown]=useState<readonly string[]>([]);
 const [scanning,setScanning]=useState(false),[rate,setRate]=useState(1),[noItem,setNoItem]=useState<'show'|'close'|null>(null),[notice,setNotice]=useState('');
 const fieldKey=multiSpecFieldKey(field),fieldRef=useRef(field);fieldRef.current=field;
 const viewRef=useRef<FieldView|null>(null);viewRef.current=view.status==='ready'?view.view:null;
 const lastKey=useRef(fieldKey);
 // Object X (review M1): the record a click at the target itself selects; only that fibre carries the ObjX label.
 const targetSource=useMemo(()=>{
  if(view.status!=='ready'||!mask.target||!view.view.population||!view.view.scene)return null;
  try{return multiSpecTargetSource({population:view.view.population,scene:view.view.scene} as MultiSpecField,mask.target);}catch{return null;}
 },[view,mask.target]);

 // A new field regenerates it (Clear Objects when the selection is not empty).
 useEffect(()=>{if(lastKey.current!==fieldKey){lastKey.current=fieldKey;dispatch({type:'field-regenerated'});}},[fieldKey]);
 // The field is built in the Worker once the form is shown (Front G G4b: every pointing has a field, so nothing is read for a
 // student who never opens Multi-Spec) and again for each new field while it is shown.
 useEffect(()=>{
  if(!field){setView({status:'none'});return;}
  if(!state.open)return;
  // A newer field or closing the form aborts the build in the Worker (G4b review 1 M1).
  let current=true;const stop=new AbortController();setView({status:'loading'});
  multiSpecView(field,stop.signal).then(v=>{if(current)setView(v.fieldRead?{status:'read',read:v.fieldRead}:v.viewport&&v.population&&v.scene&&!v.reasons.length?{status:'ready',view:v}:{status:'reasons',view:v});}).catch(()=>{if(current)setView({status:'error'});});
  return()=>{current=false;stop.abort();};
 },[fieldKey,viewTry,state.open]);// eslint-disable-line react-hooks/exhaustive-deps
 // SpecTimer: one tick per whole second of the page clock while exposing. Front T3: Test Mode (env+0x2e7c) is read at each
 // tick (0x52a1c4); on, the first tick ends the exposure.
 const testMode=useContext(TestModeContext),testModeRef=useRef(testMode);testModeRef.current=testMode;
 useEffect(()=>{if(!state.running)return;const h=window.setInterval(()=>dispatch({type:'tick',testMode:testModeRef.current}),1000);return()=>window.clearInterval(h);},[state.running]);
 // Spectra of new entries (AddSpectrum), from the field current when they were taken.
 const pending=useRef(new Set<string>()),entryRanges=useRef(new Map<string,SpectralRange>()),rangeNow=useRef(spectralRange);rangeNow.current=spectralRange;
 useEffect(()=>{
  const f=fieldRef.current,v=viewRef.current;
  // S3 review 1 L3: a removed or cleared entry drops its frozen range with it.
  {const live=new Set(state.entries.map(entryKey));for(const k of [...entryRanges.current.keys()])if(!live.has(k))entryRanges.current.delete(k);}
  const missing=state.entries.filter(e=>!results.has(entryKey(e))&&!pending.current.has(entryKey(e)));
  if(!missing.length)return;
  for(const e of missing){pending.current.add(entryKey(e));if(rangeNow.current&&!entryRanges.current.has(entryKey(e)))entryRanges.current.set(entryKey(e),rangeNow.current);}
  const put=(m:Map<string,Result>,e:MultiSpecEntry,r:Result)=>{pending.current.delete(entryKey(e));m.set(entryKey(e),r);};
  setResults(r=>{const m=new Map(r);for(const e of missing)m.set(entryKey(e),{status:'loading'});return m;});
  if(!f){setResults(r=>{const m=new Map(r);for(const e of missing)put(m,e,{status:'error'});return m;});return;}
  // Front S3: the range is frozen per entry; VIREO's display reads the global range when it is created (0x526e7f) [W: web takes it
  // when the spectrum is first requested]. The default leaves the request unchanged.
  const intervalOf=(e:MultiSpecEntry)=>{const r=entryRanges.current.get(entryKey(e));return r&&!sameRange(r,DEFAULT_SPECTRAL_RANGE)?{interval:Object.freeze({minimum:r.minimum,maximum:r.maximum})}:{};};
  multiSpecSpectra(f,missing.map(e=>({selection:e.selection,seed:e.seed,seconds:e.seconds,...intervalOf(e)}))).then(list=>{
   setResults(r=>{const m=new Map(r);missing.forEach((e,i)=>{
    let galaxyType:string|null=null;
    if(e.selection.source.kind==='galaxy'&&v?.population){try{galaxyType=galaxyTypeText(catalogRecords(v.population).galaxies[e.selection.source.index]);}catch{galaxyType=null;}}
    put(m,e,list[i]?{status:'done',exposure:list[i],galaxyType}:{status:'error'});});return m;});
  }).catch(()=>setResults(r=>{const m=new Map(r);for(const e of missing)put(m,e,{status:'error'});return m;}));
 },[state.entries]);// eslint-disable-line react-hooks/exhaustive-deps
 // Clear All empties the list: displays, selection and scan go with it.
 useEffect(()=>{if(!state.entries.length){setShown([]);setSelected(null);setScanning(false);setResults(r=>r.size?new Map():r);}},[state.entries.length]);
 // Scan (ScanTimer, Interval := spin × 1000 ms): each tick closes the current spectrum and shows the next one (wrapping).
 const scanAt=useRef(0);
 useEffect(()=>{
  if(!scanning)return;
  const h=window.setInterval(()=>{const n=state.entries.length;if(!n)return;scanAt.current=(scanAt.current+1)%n;setSelected(scanAt.current);setShown([entryKey(state.entries[scanAt.current])]);},rate*1000);
  return()=>window.clearInterval(h);
 },[scanning,rate,state.entries]);

 const textOptions:MultiSpecTextOptions={showObjectId,showObjectMagnitude:showObjectMag,editMode};
 const nameOptions=multiSpecNameOptions(mask,textOptions);
 const items=useMemo(()=>state.entries.map(e=>multiSpecListItem(e.idx,e.selection.name,e.saved,nameOptions)),[state.entries,nameOptions.showObjectId]);// eslint-disable-line react-hooks/exhaustive-deps
 const fileOf=(e:MultiSpecEntry)=>safeName(multiSpecFileName(e.idx,e.selection.name,nameOptions));
 const readyOf=(e:MultiSpecEntry)=>{const r=results.get(entryKey(e));return r?.status==='done'&&r.exposure.status==='ready'?r.exposure.spectrum:null;};
 function resultOf(e:MultiSpecEntry):MultiSpecResult{
  const r=results.get(entryKey(e));
  if(!r||r.status==='loading')return {status:'loading'};
  if(r.status==='error')return mask.masked?{status:'unavailable',text:t('multispec.neutral')}:{status:'error'};
  if(r.exposure.status==='unavailable')return {status:'unavailable',text:mask.masked?t('multispec.neutral'):multiSpecReasonText(r.exposure.reason)};
  return {status:'ready',spectrum:r.exposure.spectrum,galaxyType:r.galaxyType};
 }
 function save(e:MultiSpecEntry){
  const s=readyOf(e);if(!s)return;
  try{const name=fileOf(e);download(name,multiSpecSspBytes(s),'text/plain');dispatch({type:'saved',idx:[e.idx]});setNotice(t('multispec.saved',{file:name}));}
  catch(x){if(x instanceof MultiSpecFormatError)setNotice(t(x.code==='wrapped-maximum'?'multispec.saveErrorWrapped':'multispec.saveError'));else throw x;}
 }
 function saveAll(){
  // Every entry not yet saved, in list order; a later file of the same name replaces an earlier one (the native overwrite).
  const files=new Map<string,Uint8Array>(),done:number[]=[];
  for(const e of state.entries){if(e.saved)continue;const s=readyOf(e);if(!s)continue;try{const b=multiSpecSspBytes(s);const name=fileOf(e);files.delete(name);files.set(name,b);done.push(e.idx);}catch(x){if(!(x instanceof MultiSpecFormatError))throw x;}}
  if(!files.size){setNotice(t('multispec.saveAllNone'));return;}
  const zip='MultiSpec_Spectra.zip';
  download(zip,multiSpecZip([...files].map(([name,bytes])=>({name,bytes}))),'application/zip');
  dispatch({type:'saved',idx:done});setNotice(t('multispec.savedAll',{count:done.length,file:zip}));
 }
 const canSaveAll=state.entries.some(e=>!e.saved&&!!readyOf(e));
 const show=(k:string)=>setShown(s=>s.includes(k)?s:[...s,k]);
 function startScan(){
  if(!state.entries.length)return;
  const i=selected??0;scanAt.current=i;setSelected(i);setShown([entryKey(state.entries[i])]);setScanning(true);
 }

 const ready=view.status==='ready'?view.view:null;
 const removing=state.question?.kind==='remove'?state.question.index:null;
 const box=state.question?.kind==='remove'?{caption:vireo(N.caption),text:N.removeQuestion(state.numberingBase+state.question.index,fragment=>vireo(fragment,'fragment')),question:true}
  :state.question?.kind==='terminate'?{caption:vireo(N.terminate.caption),text:vireo(N.terminate.text),question:true}
  :state.question?.kind==='clear-all'?{caption:vireo(N.clearAll.caption),text:vireo(N.clearAll.text),question:true}
  :state.message==='select-hint'?{caption:vireo(N.caption),text:vireo(N.selectHint),question:false}
  :state.message==='cannot-remove'?{caption:vireo(N.cannotRemove.caption),text:vireo(N.cannotRemove.text),question:false}
  :state.message==='invalid-exposure'?{caption:vireo(N.invalidExposure.caption),text:vireo(N.invalidExposure.text),question:false}
  :state.message==='no-spectra'?{caption:vireo(N.noSpectra.caption),text:vireo(N.noSpectra.text),question:false}
  :state.message==='cannot-close'?{caption:vireo(N.caption),text:t('multispec.cannotClose'),question:false}
  :noItem?{caption:vireo(N.noItem.caption),text:vireo(noItem==='show'?N.noItem.show:N.noItem.close),question:false}:null;
 const answer=(yes:boolean)=>{if(state.question)dispatch({type:'answer',yes});else if(state.message)dispatch({type:'dismiss'});else setNoItem(null);};
 const fieldStatus=!field?noFieldText:view.status==='loading'?t('multispec.fieldLoading'):view.status==='error'?(mask.masked?t('multispec.fieldNeutral'):t('multispec.fieldError'))
  :view.status==='reasons'?(mask.masked?t('multispec.fieldNeutral'):t('multispec.fieldReasons',{reasons:view.view.reasons.map(fieldReasonText).join('; ')}))
  :view.status==='read'?(mask.masked?t('multispec.fieldNeutral'):view.read.reason==='internal'?t('multispec.fieldInternal'):'detail' in view.read?fieldInfoReasonText(view.read.reason,view.read.detail):fieldInfoReasonText(view.read.reason)):'';
 const usable=active&&!busy&&!rangeBlock;

 return <section className="card ms-card" aria-labelledby={`${id}-title`} data-testid="ms-card">
  <Heading id={`${id}-title`}>{title}</Heading>
  <p className="observatory-note">{help}</p>
  <div className="button-row">
   <button type="button" className="primary-button" disabled={!usable||access!=='ready'||state.open||!!parameterRefusal} onClick={()=>dispatch({type:'show'})} data-testid="ms-access">{t('multispec.access')}</button>{parameterRefusal&&<p role="status" data-testid="ms-parameters-refused" data-reason="uncertified-parameter">{parameterRefusal}</p>}
  </div>
  <p role="status" data-testid="ms-access-status">{state.open?t('multispec.accessOpen'):access!=='ready'?multiSpecAccessText(access):''}</p>{rangeBlock&&<p role="status" data-testid="ms-range-block">{rangeBlock}</p>}
  {state.open&&<div className="ms-body">
   <div className="ms-top">
    <MultiSpecControl blockExposure={!!parameterRefusal} state={state} dispatch={dispatch} busy={!usable} masked={mask.masked} printField={ready&&field?{pointing:field.pointing,telescope:opticalProfile(telescope).name,clone:()=>multiSpecFieldPicture(fieldWrap.current)}:null}/>
    <div className="ms-field-wrap">
     <p className="observatory-note" data-testid="ms-armed">{armedText}</p>
     <div ref={fieldWrap}>{ready?<MultiSpecFieldOverlay image={ready.viewport!} selections={state.selections} base={state.numberingBase} removing={removing} armed={armed&&usable&&state.selecting}
       onSelect={(x,y)=>{const p=multiSpecClickPoint(x,y);dispatch({type:'add',selection:multiSpecPick({population:ready.population!,scene:ready.scene!},p.x,p.y)});}}
       onRemove={(x,y)=>{const p=multiSpecClickPoint(x,y);dispatch({type:'remove-at',x:p.x,y:p.y});}}/>
      :<p role="status" data-testid="ms-field-status">{fieldStatus}</p>}</div>
     {(view.status==='error'||view.status==='read'&&view.read.reason==='field-tiles')&&!mask.masked&&<button type="button" className="secondary-button" onClick={()=>setViewTry(n=>n+1)}>{t('multispec.retry')}</button>}
     <p className="observatory-note">{t('multispec.fieldAdaptation')}</p>
    </div>
   </div>
   <div className="ms-options"><p className="observatory-note" data-testid="ms-options-note">{t('multispec.optionsHelp')}</p>
    {mask.masked&&<p className="observatory-note" data-testid="ms-masked-note">{t('multispec.optionsMasked')}</p>}</div>
   {state.listShown&&<MultiSpecList items={items} selected={selected} onSelected={setSelected} busy={!usable}
     onShow={()=>{if(selected===null||!state.entries[selected]){setNoItem('show');return;}show(entryKey(state.entries[selected]));}}
     onHide={()=>{if(selected===null||!state.entries[selected]){setNoItem('close');return;}const k=entryKey(state.entries[selected]);setShown(s=>s.filter(x=>x!==k));}}
     onOpenAll={()=>setShown(state.entries.map(entryKey))} onCloseAll={()=>setShown([])}
     scanning={scanning} rate={rate} onRate={setRate} onScan={startScan} onStopScan={()=>setScanning(false)}
     canSaveAll={canSaveAll} onSaveAll={saveAll} onClearAll={()=>dispatch({type:'clear-all'})} onExit={()=>{setScanning(false);dispatch({type:'list-closed'});}}/>}
   {state.listShown&&<p className="observatory-note">{t('multispec.saveNote')}</p>}
   <p role="status" data-testid="ms-notice">{notice}</p>
   <div className="ms-spectra">
    {state.entries.filter(e=>shown.includes(entryKey(e))).map(e=>{
     const m=multiSpecFibreMask(mask,e.selection,targetSource),caption=multiSpecCaption(e.idx,e.selection.name,nameOptions);
     return <MultiSpecDisplay key={entryKey(e)} caption={caption} result={resultOf(e)}
      information={()=>{const s=readyOf(e)!,r=results.get(entryKey(e));return multiSpecInformationLines(e,s,{...textOptions,mask:m,galaxyType:r?.status==='done'?r.galaxyType:null,galaxyRedshiftMask:t('multispec.zMasked')},vireo);}}
      printLines={()=>multiSpecPrintLines(e,readyOf(e)!,{...nameOptions,mask:m},vireo)}
      onSave={()=>save(e)} onClose={()=>{const k=entryKey(e);setShown(s=>s.filter(x=>x!==k));}}/>;
    })}
   </div>
  </div>}
  {box&&<MultiSpecBox key={`${box.caption}|${box.text}`} caption={box.caption} text={box.text} question={box.question} onAnswer={answer}/>}
 </section>;
}
