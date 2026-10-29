import {useEffect,useId,useLayoutEffect,useRef,useState,useSyncExternalStore,type KeyboardEvent,type ReactNode,type RefObject} from 'react';
import ResearchNotes from './ResearchNotes';
import './RadioPulsarParameters.css';
import {menuCaptionText} from '../core/radioControl';
import {isRadioLabModal,type RadioLabState,type RadioPointing} from '../core/radioAntenna';
import {parsePulsarCatalog,type PulsarCatalog,type PulsarCatalogError} from '../core/radioPulsarCatalog';
import {pulsarPickerCursor,pulsarSeedFromBuffer} from '../core/radioPulsarList';
import type {PulsarListCommandPrepared} from '../core/radioPulsarListCommand';
import type {RadioSourceBuffer} from '../core/radioReceiver';
import {
 PULSAR_FIND_CAPTIONS,PULSAR_PARAMETERS_CAPTIONS,PULSAR_PARAMETERS_CONSTANTS,PULSAR_PARAMETERS_WEB_POLICY,
 cancelPulsarFind,choosePulsarFindMode,confirmPulsarFind,dismissPulsarNotice,editPulsarDate,editPulsarDensity,editPulsarFindQuery,exitPulsarParameters,
 movePulsarListCursor,nextPulsar,openPulsarFind,openPulsarParameters,previousPulsar,pulsarParametersOpenRefusal,resetPulsarDerived,updatePulsarDerived,
 type PulsarParametersNotice,type PulsarParametersTransition,type PulsarParametersWindow,type PulsarSourceField,
} from '../core/radioPulsarParameters';
import {
 INITIAL_PULSAR_REFERENCE,PULSAR_REFERENCE_WEB_POLICY,beginPulsarReferenceRead,cancelPulsarReferenceRead,commitPulsarReferenceRead,failPulsarReferenceRead,
 type PulsarReferenceSource,type PulsarReferenceState,type PulsarReferenceTransition,
} from '../core/radioPulsarReferenceCatalog';
import {resourceSha256} from '../io/boundedResource';
import {BUNDLED_PULSAR_CATALOG,BundledPulsarCatalogError,fetchBundledPulsarCatalog,type BundledPulsarCatalogFailure} from '../io/bundledPulsarCatalog';
import {ignoreHeldKey,nativeModalOpen,noNativeModal,observeNativeModals,observeNothing,trapTab} from './radioModal';
import {t} from '../i18n';
import CleaHelp from '../clusters/CleaHelp';
import {HELP_FILES} from '../help/helpFiles';

const C=PULSAR_PARAMETERS_CAPTIONS,F=PULSAR_FIND_CAPTIONS;
type LoadStatus=Readonly<
 |{kind:'reading'|'too-large'|'read-error'|'cancelled';name:string}
 |{kind:'invalid';name:string;error:PulsarCatalogError}
 |{kind:'loaded'}
 |{kind:'refused';reason:'window-open'|'receiver-open'|'read-pending'|'inactive'}
 |{kind:'bundled-error';code:BundledPulsarCatalogFailure}
>;
/** Result of one bundled-catalog request: 'kept' when a catalog is already loaded (never replaced). */
export type BundledCatalogOutcome='loaded'|'kept'|'refused'|'error'|'cancelled'|'stale'|'invalid';
/** WEB-PP-LIST-01 handler-time refusal of Open, first failing gate in order; nothing changed. */
type OpenRefusal='inactive'|'no-catalog'|'reading'|'modal'|'close-box-open'|'record-dialog-open'|'unavailable';
type FocusTarget='heading'|'open'|'find'|'date'|'density';
type FieldRefusal='date'|'density'|null;
/** What File ▸ Pulsar List... wrote, from the command's own result: a hit (J2000 name `name`, possibly '') or a miss. */
type ListWrite=Readonly<Pick<PulsarListCommandPrepared,'source'|'name'>>;

export type PulsarParametersHostInput=Readonly<{
 /** The route is shown. */
 active:boolean;
 /** A project operation runs. */
 busy:boolean;
 /** An antenna dialog or box (or the hot list) is open: the card is behind it and the Find dialog and box yield to it. */
 antennaModal:boolean;
 /** The Set Date/Time, ID dialog is open: the card is behind it. */
 dateOpen:boolean;
 /** Latest accepted antenna and date-dialog states, read in handlers (WEB-PP-LIST-01: a dialog or box that opened earlier in
  * the same task refuses Open even before the rendered props catch up). */
 antennaNow:()=>RadioLabState;
 dateOpenNow:()=>boolean;
 /** WEB-PP-CLK-01: JD of the radio clock scenario now, or null without an ok reading. Read only at Open and Reset. */
 readClockJD:()=>number|null;
 /** WEB-PP-LIST-03/ACT-01/FIND-04: the receiver session's live +0x5f7 buffer (null: no session), read only. */
 sharedSource:()=>RadioSourceBuffer|null;
 /** WEB-PP-LIST-01: the receiver close box or a Record prompt/finish dialog is modal over the windows (null: none or no
  * session), read only. */
 receiverBoxNow:()=>'close-box-open'|'record-dialog-open'|null;
 /** WEB-RX-CAT-01: receiver windows exist, so Load is refused (rendered state; catalogLockedNow is checked at the click
  * and when the read begins). */
 catalogLocked:boolean;
 catalogLockedNow:()=>boolean;
 /** Phase 1 item 1.5: the reference catalog restored from an investigation file (read once, at mount; no read pending). */
 initialReference?:PulsarReferenceState|null;
}>;
export type PulsarParametersHost=Readonly<{
 /** The Find dialog or a box exists (presented or not). */
 open:boolean;
 /** It would be presented on this route outside a project operation. */
 pending:boolean;
 /** It is presented: the host and the other radio surfaces are behind it. */
 presented:boolean;
 card:ReactNode;
 layer:ReactNode;
 /** The loaded reference catalog (rendered state) and whether a read is pending. */
 catalog:PulsarCatalog|null;
 catalogReading:boolean;
 /** The latest accepted catalog, for callbacks (the receivers read it at Open and at clock reassociation). */
 currentCatalog:()=>PulsarCatalog|null;
 /** Phase 1 item 1.5: the latest reference state (catalog, source and pending read), read by Save investigation. */
 referenceNow:()=>PulsarReferenceState;
 /** The loaded catalog's identity (recorded original bytes or user-supplied), rendered state. */
 source:PulsarReferenceSource|null;
 /** WEB-PP-SRC-04: read the bundled same-origin Pulsars.dat through the same begin/commit token flow, only while no catalog
  * is loaded (a loaded catalog is never replaced) and Load is admitted. Size and SHA-256 are checked before the parse. */
 loadBundled:()=>Promise<BundledCatalogOutcome>;
 /** The last bundled request failed (shown with a retry); null otherwise. */
 bundledError:BundledPulsarCatalogFailure|null;
 /** WEB-PP-CUR-01: the picker ran on the catalog owner with this catalog and pointing (Receiver Open or a clock
  * reassociation); the open window's shared cursor follows, without any display. Uses refs only. */
 pickerMoved:(catalog:PulsarCatalog|null,pointing:RadioPointing)=>void;
 /** R-RX8 (WEB-PP-LIST-04): the latest admitted catalog, pending read and window, for File ▸ Pulsar List... (refs only). */
 listSnapshot:()=>Readonly<{catalog:PulsarCatalog|null;reading:boolean;window:PulsarParametersWindow|null}>;
 /** Commits the command's prepared activation only while `expected` is still the latest window (false otherwise, nothing
  * changed); the heading takes focus. No picker cursor move follows: the activation's scan is the final cursor. `written`
  * is the command's hit/miss and J2000 name, for the seed note (the seed alone cannot tell a miss from an unnamed hit). */
 commitListActivation:(expected:PulsarParametersWindow|null,next:PulsarParametersWindow,written:ListWrite)=>boolean;
}>;

/** A target that can take focus: connected, enabled, rendered and not under an inert ancestor. */
const canTakeFocus=(el:HTMLElement|null):el is HTMLElement=>
 !!el&&el.isConnected&&!(el as HTMLButtonElement).disabled&&el.getClientRects().length>0&&!el.closest('[inert]');

/**
 * WEB host of the Pulsar Parameters utility (docs/RADIO-PULSAR-PARAMETERS.md): a reference catalog the learner loads into
 * memory (WEB-PP-SRC-01..03) and the TPlsrDataForm1 window as a non-modal card, with its Find dialog and boxes as
 * application-modal surfaces (WEB-PP-PRES-01). Never sent anywhere; Phase 1 item 1.5 Save investigation keeps only the
 * loaded catalog (initialReference restores it), never the window. Every
 * change goes through the pure transitions; steps run on the latest accepted state (refs), as stepDate does.
 */
export function usePulsarParametersHost({active,busy,antennaModal,dateOpen,antennaNow,dateOpenNow,readClockJD,sharedSource,receiverBoxNow,catalogLocked,catalogLockedNow,initialReference}:PulsarParametersHostInput):PulsarParametersHost{
 const id=useId();
 const [reference,setReference]=useState<PulsarReferenceState>(()=>initialReference&&initialReference.read===null?initialReference:INITIAL_PULSAR_REFERENCE);
 const referenceRef=useRef(reference);
 const [load,setLoad]=useState<LoadStatus|null>(null);
 const [win,setWin]=useState<PulsarParametersWindow|null>(null);
 const winRef=useRef(win);
 /** Which entry ran the window's last activation: the read-only reference Open or File ▸ Pulsar List... (the seed note). */
 const [activatedBy,setActivatedBy]=useState<'open'|ListWrite>('open');
 const [fieldRefusal,setFieldRefusal]=useState<FieldRefusal>(null);
 const [findRefused,setFindRefused]=useState(false);
 const [openRefusal,setOpenRefusal]=useState<OpenRefusal|null>(null);
 const [focusRequest,setFocusRequest]=useState<Readonly<{target:FocusTarget;serial:number}>|null>(null);
 const serial=useRef(0);
 const requestFocus=(target:FocusTarget)=>setFocusRequest({target,serial:++serial.current});
 const latest=useRef({active,busy,readClockJD,antennaNow,dateOpenNow,sharedSource,receiverBoxNow,catalogLockedNow});
 useLayoutEffect(()=>{latest.current={active,busy,readClockJD,antennaNow,dateOpenNow,sharedSource,receiverBoxNow,catalogLockedNow};});
 const stepReference=(step:(s:PulsarReferenceState)=>PulsarReferenceTransition)=>{
  const result=step(referenceRef.current);if(result.changed){referenceRef.current=result.state;setReference(result.state);}return result;
 };
 const stepWindow=(step:(w:PulsarParametersWindow)=>PulsarParametersTransition)=>{
  const current=winRef.current;if(current===null)return null;
  const result=step(current);if(result.changed){winRef.current=result.window;setWin(result.window);}return result;
 };

 // ---- Reference catalog (WEB-PP-SRC-01..03): size → arrayBuffer → SHA-256 → parsePulsarCatalog → commit. Every await
 // re-checks the token and the gates; a late completion of a cancelled or replaced read changes nothing.
 const fileRef=useRef<HTMLInputElement>(null);
 const loadOpen=()=>latest.current.active&&!latest.current.busy&&document.visibilityState!=='hidden';
 /** The pending bundled request, aborted with its read. */
 const bundledAbort=useRef<AbortController|null>(null);
 const cancelRead=()=>{
  bundledAbort.current?.abort();bundledAbort.current=null;
  const read=referenceRef.current.read;if(read===null)return;
  if(stepReference(s=>cancelPulsarReferenceRead(s,read.token)).outcome==='cancelled')setLoad({kind:'cancelled',name:read.name});
 };
 /** WEB-PP-SRC-04: begin (token) → same-origin fetch bounded to the recorded size → exact size and SHA-256 → parse → commit.
  * The token is taken before the request; after every await the token and the gates are checked again, so a cancel, a
  * hidden route, a project operation, a hidden page or an unmount discards the late result. */
 const loadBundled=async():Promise<BundledCatalogOutcome>=>{
  if(!loadOpen()){setLoad({kind:'refused',reason:'inactive'});return 'refused';}
  if(referenceRef.current.catalog!==null)return 'kept';
  const begun=stepReference(s=>beginPulsarReferenceRead(s,BUNDLED_PULSAR_CATALOG.name,winRef.current!==null,latest.current.catalogLockedNow()));
  if(begun.token===undefined){setLoad({kind:'refused',reason:begun.outcome==='window-open'||begun.outcome==='receiver-open'?begun.outcome:'read-pending'});return 'refused';}
  const token=begun.token,name=begun.state.read!.name,alive=()=>referenceRef.current.read?.token===token;
  const abort=new AbortController();bundledAbort.current=abort;
  setLoad({kind:'reading',name});
  try{
   const verified=await fetchBundledPulsarCatalog(fetch,abort.signal);
   if(!alive())return 'stale';if(!loadOpen()){cancelRead();return 'cancelled';}
   const result=stepReference(s=>commitPulsarReferenceRead(s,token,parsePulsarCatalog(new Uint8Array(verified.buffer)),verified.sha256,verified.buffer.byteLength));
   if(result.outcome==='loaded'){setLoad({kind:'loaded'});return 'loaded';}
   if(result.outcome==='invalid'&&result.error){setLoad({kind:'invalid',name,error:result.error});return 'invalid';}
   return 'stale';
  }catch(error){
   if(!alive())return error instanceof DOMException&&error.name==='AbortError'?'cancelled':'stale';
   stepReference(s=>failPulsarReferenceRead(s,token,'read-error'));
   setLoad({kind:'bundled-error',code:error instanceof BundledPulsarCatalogError?error.code:'download'});
   return 'error';
  }finally{if(bundledAbort.current===abort)bundledAbort.current=null;}
 };
 const loadFile=async(file:File|undefined)=>{
  if(!file)return;
  if(!loadOpen()){setLoad({kind:'refused',reason:'inactive'});return;}
  const begun=stepReference(s=>beginPulsarReferenceRead(s,file.name,winRef.current!==null,latest.current.catalogLockedNow()));
  if(begun.token===undefined){setLoad({kind:'refused',reason:begun.outcome==='window-open'||begun.outcome==='receiver-open'?begun.outcome:'read-pending'});return;}
  const token=begun.token,name=begun.state.read!.name,alive=()=>referenceRef.current.read?.token===token;
  setLoad({kind:'reading',name});
  try{
   if(file.size>PULSAR_REFERENCE_WEB_POLICY.maxBytes){stepReference(s=>failPulsarReferenceRead(s,token,'too-large'));setLoad({kind:'too-large',name});return;}
   const buffer=await file.arrayBuffer();
   if(!alive())return;if(!loadOpen()){cancelRead();return;}
   const sha256=await resourceSha256(buffer);
   if(!alive())return;if(!loadOpen()){cancelRead();return;}
   const result=stepReference(s=>commitPulsarReferenceRead(s,token,parsePulsarCatalog(new Uint8Array(buffer)),sha256,buffer.byteLength));
   if(result.outcome==='loaded')setLoad({kind:'loaded'});
   else if(result.outcome==='invalid'&&result.error)setLoad({kind:'invalid',name,error:result.error});
  }catch{
   if(!alive())return;
   stepReference(s=>failPulsarReferenceRead(s,token,'read-error'));setLoad({kind:'read-error',name});
  }
 };
 // Cancellation causes of a pending read: the route hidden, a project operation, a hidden page and unmount.
 useEffect(()=>{if(!active||busy)cancelRead();},[active,busy]);// refs and stable setters only
 useEffect(()=>{
  const hide=()=>{if(document.visibilityState==='hidden')cancelRead();};
  document.addEventListener('visibilitychange',hide);return ()=>document.removeEventListener('visibilitychange',hide);
 },[]);
 useEffect(()=>()=>{bundledAbort.current?.abort();const read=referenceRef.current.read;if(read!==null)referenceRef.current=cancelPulsarReferenceRead(referenceRef.current,read.token).state;},[]);

 // ---- Window transitions (WEB-PP-OPEN-01 … WEB-PP-EXIT-01).
 const openRef=useRef<HTMLButtonElement>(null),headingRef=useRef<HTMLHeadingElement>(null),findRef=useRef<HTMLButtonElement>(null);
 const dateRef=useRef<HTMLInputElement>(null),densityRef=useRef<HTMLInputElement>(null);
 /** WEB-PP-LIST-01: the web reference Open (an explicit adaptation, distinct from File ▸ Pulsar List..., WEB-PP-LIST-04).
  * Every gate is checked on the latest state at the press, in order, before any window change; a refusal moves no cursor or
  * window. Open writes nothing: the activation reads the receiver session's live buffer, still initial until Receiver Open,
  * a clock reassociation or File ▸ Pulsar List... writes it (WEB-PP-LIST-02), and no picker runs. */
 const open=()=>{
  const l=latest.current,{catalog,read}=referenceRef.current,a=l.antennaNow();
  const refusal:OpenRefusal|null=!loadOpen()?'inactive':catalog===null?'no-catalog':read!==null?'reading'
   :(pulsarParametersOpenRefusal(winRef.current)??((isRadioLabModal(a)||l.dateOpenNow()||nativeModalOpen())?'modal':null)??l.receiverBoxNow());
  if(refusal!==null||catalog===null){setOpenRefusal(refusal);return;}
  const buffer=l.sharedSource();
  if(buffer===null&&a.activated){setOpenRefusal('unavailable');return;}
  const result=openPulsarParameters(winRef.current,catalog,pulsarSeedFromBuffer(buffer),l.readClockJD());
  if(result.changed){winRef.current=result.window;setWin(result.window);setActivatedBy('open');setOpenRefusal(null);setFieldRefusal(null);requestFocus('heading');}
 };
 const listSnapshot=()=>Object.freeze({catalog:referenceRef.current.catalog,reading:referenceRef.current.read!==null,window:winRef.current});
 const commitListActivation=(expected:PulsarParametersWindow|null,next:PulsarParametersWindow,written:ListWrite)=>{
  if(winRef.current!==expected)return false;
  winRef.current=next;setWin(next);setActivatedBy(Object.freeze({source:written.source,name:written.name}));setOpenRefusal(null);setFieldRefusal(null);setFindRefused(false);requestFocus('heading');
  return true;
 };
 const pickerMoved=(catalog:PulsarCatalog|null,pointing:RadioPointing)=>{
  stepWindow(w=>movePulsarListCursor(w,catalog,catalog===w.catalog?pulsarPickerCursor(catalog,pointing):null));
 };
 const run=(step:(w:PulsarParametersWindow)=>PulsarParametersTransition,focus?:FocusTarget)=>{
  const result=stepWindow(step);if(result?.changed&&focus)requestFocus(focus);return result;
 };
 const edit=(field:'date'|'density',text:string)=>{
  const result=stepWindow(w=>(field==='date'?editPulsarDate:editPulsarDensity)(w,text));
  setFieldRefusal(result?.outcome==='field-too-long'?field:null);
 };
 const update=()=>{setFieldRefusal(null);run(updatePulsarDerived);};
 const dismiss=(notice:PulsarParametersNotice)=>run(dismissPulsarNotice,notice.kind==='not-found'?'find':notice.field);
 const exit=()=>{const result=run(exitPulsarParameters,'open');if(result?.changed)setFieldRefusal(null);};
 useEffect(()=>{
  if(focusRequest===null||nativeModalOpen())return;
  const el={heading:headingRef,open:openRef,find:findRef,date:dateRef,density:densityRef}[focusRequest.target].current;
  if(canTakeFocus(el))el.focus();
 },[focusRequest]);

 // ---- Presentation (WEB-PP-PRES-01): only on the active route, outside a project operation, with no native modal
 // <dialog> of the page and no antenna surface open; otherwise the Find dialog and boxes keep their state unpresented.
 const surfaceOpen=win!==null&&(win.find!==null||win.notice!==null);
 const pending=surfaceOpen&&active&&!busy;
 const foreign=useSyncExternalStore(pending?observeNativeModals:observeNothing,pending?nativeModalOpen:noNativeModal,noNativeModal);
 const presented=pending&&!foreign&&!antennaModal;

 const catalog=reference.catalog,source=reference.source,reading=reference.read!==null;
 const openReason=catalog===null?t('pulsarParameters.open.noCatalog'):reading?t('pulsarParameters.open.reading'):t('pulsarParameters.open.available');
 const card=<section className="card radio-control radio-control-env pulsar-params" aria-labelledby={`${id}-title`} data-testid="pulsar-params-card"
  inert={antennaModal||dateOpen||surfaceOpen||undefined}>
  <h2 id={`${id}-title`}>{t('pulsarParameters.heading')}</h2>
  <p className="radio-control-note">{t('pulsarParameters.intro')}</p>
  <p className="radio-control-note" data-testid="pulsar-params-persistence">{t('pulsarParameters.persistence')}</p>
  <div className="pulsar-params-reference" data-testid="pulsar-ref">
   <h3 className="pulsar-params-subheading">{t('pulsarParameters.reference.heading')}</h3>
   <ResearchNotes><p className="radio-control-note">{t('pulsarParameters.reference.help',{max:PULSAR_REFERENCE_WEB_POLICY.maxBytes})}</p></ResearchNotes>
   <input ref={fileRef} type="file" hidden data-testid="pulsar-ref-file" aria-label={t('pulsarParameters.reference.fileLabel')}
    onChange={e=>{const file=e.target.files?.[0];e.target.value='';void loadFile(file);}}/>
   <div className="button-row">
    <button type="button" className="secondary-button" data-testid="pulsar-ref-load" disabled={reading||win!==null||catalogLocked} aria-describedby={`${id}-load-reason`}
     onClick={()=>{if(latest.current.catalogLockedNow()){setLoad({kind:'refused',reason:'receiver-open'});return;}fileRef.current?.click();}}>{t('pulsarParameters.reference.load')}</button>
    <button type="button" className="secondary-button" data-testid="pulsar-ref-bundled" disabled={reading||win!==null||catalogLocked||catalog!==null} aria-describedby={`${id}-bundled-help`}
     onClick={()=>{void loadBundled();}}>{t('pulsarParameters.reference.bundled')}</button>
    {reading&&<button type="button" className="secondary-button" data-testid="pulsar-ref-cancel" onClick={cancelRead}>{t('pulsarParameters.reference.cancel')}</button>}
   </div>
   <p id={`${id}-bundled-help`} className="radio-control-note" data-testid="pulsar-ref-bundled-help">{t('pulsarParameters.reference.bundledHelp')}</p>
   <p id={`${id}-load-reason`} className="radio-control-note" data-testid="pulsar-ref-load-reason">
    {win!==null?t('pulsarParameters.reference.windowOpen'):catalogLocked?t('pulsarParameters.reference.receiverOpen'):''}</p>
   {source===null?<p data-testid="pulsar-ref-none">{t('pulsarParameters.reference.none')}</p>:<dl className="radio-control-state pulsar-params-source">
    <dt>{t('pulsarParameters.reference.name')}</dt><dd data-testid="pulsar-ref-name" style={{overflowWrap:'anywhere'}}>{source.name}</dd>
    <dt>{t('pulsarParameters.reference.bytes')}</dt><dd data-testid="pulsar-ref-bytes">{source.bytes}</dd>
    <dt>{t('pulsarParameters.reference.sha')}</dt><dd data-testid="pulsar-ref-sha" style={{overflowWrap:'anywhere'}}>{source.sha256}</dd>
    <dt>{t('pulsarParameters.reference.rows')}</dt><dd data-testid="pulsar-ref-rows">{source.rows}</dd>
    <dt>{t('pulsarParameters.reference.identity')}</dt><dd data-testid="pulsar-ref-identity" data-recorded={source.recorded} data-values-only={source.valuesOnly===true||undefined}>
     {source.recorded?t('pulsarParameters.reference.recorded'):source.valuesOnly?t('pulsarParameters.reference.valuesOnly'):t('pulsarParameters.reference.supplied')}</dd>
   </dl>}
   <p className="radio-control-status" role="status" aria-live="polite" data-testid="pulsar-ref-status" data-kind={load?.kind}>{loadText(load)}</p>
  </div>
  <div className="button-row">
   <button ref={openRef} type="button" className="primary-button" data-testid="pulsar-params-open" disabled={catalog===null||reading} aria-describedby={`${id}-open-reason`}
    onKeyDown={ignoreHeldKey} onClick={open}>{t('pulsarParameters.open.button')}</button>
  </div>
  <p id={`${id}-open-reason`} className="radio-control-note" data-testid="pulsar-params-open-reason">{openReason}</p>
  <p className="radio-control-status" role="status" aria-live="polite" data-testid="pulsar-params-open-status" data-reason={openRefusal??undefined}>
   {openRefusal===null?'':t(`pulsarParameters.open.refused.${openRefusal}`)}</p>
  {win!==null&&<PulsarParametersWindowView win={win} activatedBy={activatedBy} fieldRefusal={fieldRefusal} headingRef={headingRef} findRef={findRef} dateRef={dateRef} densityRef={densityRef}
   onPrev={()=>run(previousPulsar)} onNext={()=>run(nextPulsar)} onEdit={edit} onUpdate={update} onReset={()=>{setFieldRefusal(null);run(w=>resetPulsarDerived(w,latest.current.readClockJD()));}}
   onFind={()=>{setFindRefused(false);run(w=>openPulsarFind(w,pulsarSeedFromBuffer(latest.current.sharedSource())));}} onExit={exit}/>}
 </section>;
 const layer=<div className="radio-control" style={{display:'contents'}} data-testid="pulsar-params-layer" data-modal-pending={pending} data-modal-presented={presented}>
  {presented&&win?.find&&<PulsarFindDialog draft={win.find} refused={findRefused}
   onEdit={text=>setFindRefused(stepWindow(w=>editPulsarFindQuery(w,text))?.outcome==='find-too-long')}
   onMode={mode=>stepWindow(w=>choosePulsarFindMode(w,mode))}
   onOk={()=>{setFindRefused(false);run(confirmPulsarFind,'find');}} onCancel={()=>{setFindRefused(false);run(cancelPulsarFind,'find');}}/>}
  {presented&&win?.notice&&<PulsarNoticeBox notice={win.notice} onDismiss={()=>dismiss(win.notice!)}/>}
 </div>;
 return {open:surfaceOpen,pending,presented,card,layer,catalog,catalogReading:reading,currentCatalog:()=>referenceRef.current.catalog,referenceNow:()=>referenceRef.current,pickerMoved,
  listSnapshot,commitListActivation,source,loadBundled,bundledError:load?.kind==='bundled-error'?load.code:null};
}

function loadText(load:LoadStatus|null):string{
 if(load===null||load.kind==='loaded')return load?t('pulsarParameters.reference.status.loaded'):'';
 if(load.kind==='bundled-error')return t(`pulsarParameters.reference.status.bundled.${load.code}`,{name:BUNDLED_PULSAR_CATALOG.name});
 if(load.kind==='refused')return t(`pulsarParameters.reference.status.refused.${load.reason}`);
 if(load.kind==='invalid'){
  const e=load.error,reason=e.line===null?t(`pulsarParameters.reference.error.${e.kind}`,{line:'',field:''}):t(`pulsarParameters.reference.error.${e.kind}`,{line:e.line,field:e.field??''});
  return t('pulsarParameters.reference.status.invalid',{name:load.name,reason});
 }
 return t(`pulsarParameters.reference.status.${load.kind}`,{name:load.name,max:PULSAR_REFERENCE_WEB_POLICY.maxBytes});
}

type WindowViewProps=Readonly<{win:PulsarParametersWindow;activatedBy:'open'|ListWrite;fieldRefusal:FieldRefusal;
 headingRef:RefObject<HTMLHeadingElement|null>;findRef:RefObject<HTMLButtonElement|null>;dateRef:RefObject<HTMLInputElement|null>;densityRef:RefObject<HTMLInputElement|null>;
 onPrev:()=>void;onNext:()=>void;onEdit:(field:'date'|'density',text:string)=>void;onUpdate:()=>void;onReset:()=>void;onFind:()=>void;onExit:()=>void}>;
/** TPlsrDataForm1 as a card region: every catalog field is a read-only input (DFM ReadOnly=True); only Date (MJD) and
 * Electron Density are editable (WEB-PP-PRES-01). Captions are the raw DFM strings; menu accelerators are stripped. */
function PulsarParametersWindowView({win,activatedBy,fieldRefusal,headingRef,findRef,dateRef,densityRef,onPrev,onNext,onEdit,onUpdate,onReset,onFind,onExit}:WindowViewProps){
 const id=useId(),s=win.source;
 // WEB-PP-PRES-02: the shown record, the shared list cursor and the restored pointer are named separately when they differ.
 // The notes are plain text (no live region): a clock tick that moves the cursor redraws nothing and announces nothing.
 const cursorMoved=win.listCursor!==win.shownIndex,pointerMoved=win.index!==win.shownIndex;
 const nameAt=(i:number)=>win.catalog[i].primaryName===''?win.catalog[i].legacyName:win.catalog[i].primaryName;
 // WEB-PP-PRES-02: the shared name the last activation read: Open never changes it; File ▸ Pulsar List... had just written
 // it (WEB-PP-LIST-04), and the record shown can be an earlier prefix or duplicate match than the one written. After the
 // command the note follows the command's own hit/miss and name, never the seed: a miss and a hit on a record with an
 // empty J2000 name both leave no seed.
 const seedText=activatedBy==='open'
  ?win.seed===null?t('pulsarParameters.window.shared.none'):t('pulsarParameters.window.shared.name',{name:win.seed.primaryName})
  :activatedBy.source==='miss'?t('pulsarParameters.window.shared.commandNone')
  :activatedBy.name===''||activatedBy.name===null?t('pulsarParameters.window.shared.commandUnnamed')
  :t('pulsarParameters.window.shared.commandName',{name:activatedBy.name});
 const readOnly=(name:PulsarSourceField|'j2000'|'b1950'|'derivedPeriod'|'distance',value:string,labelledBy:string)=>
  <input id={`${id}-${name}`} type="text" readOnly value={value} aria-labelledby={labelledBy} data-testid={`pulsar-params-field-${name}`} className="pulsar-params-value"/>;
 const plain=(name:PulsarSourceField|'j2000'|'b1950',caption:string,value:string)=><div className="antenna-field">
  <span id={`${id}-${name}-label`} className="radio-control-native">{caption}</span>{readOnly(name,value,`${id}-${name}-label`)}
 </div>;
 const sexagesimal=(row:'ra'|'dec',caption:string,parts:readonly [PulsarSourceField,string][])=><div className="pulsar-params-row" role="group" aria-labelledby={`${id}-${row}-label`}>
  <span id={`${id}-${row}-label`} className="radio-control-native pulsar-params-row-label">{caption}</span>
  {parts.map(([field,unit])=><span key={field} className="pulsar-params-part">
   {readOnly(field,s[field],`${id}-${row}-label ${id}-${field}-unit`)}<span id={`${id}-${field}-unit`} className="radio-control-native">{unit}</span>
  </span>)}
 </div>;
 const editKey=(e:KeyboardEvent<HTMLInputElement>)=>{
  // WEB-PP-KEY-01: Enter runs Update only while it is enabled; a held Enter does nothing more.
  if(ignoreHeldKey(e))return;
  if(e.key==='Enter'&&win.updateEnabled){e.preventDefault();onUpdate();}
 };
 const derivedNotes=win.derivedIssues.map(issue=>t(`pulsarParameters.window.issue.${issue}`));
 return <div className="pulsar-params-window" role="region" aria-labelledby={`${id}-heading`} data-testid="pulsar-params-window" data-index={win.index}
  data-shown={win.shownIndex} data-cursor={win.listCursor}>
  <h3 ref={headingRef} id={`${id}-heading`} tabIndex={-1} className="radio-control-native" data-testid="pulsar-params-heading">{C.form}</h3>
  <div className="pulsar-params-menu" role="group" aria-labelledby={`${id}-file`}>
   <span id={`${id}-file`} className="radio-control-native">{menuCaptionText(C.file)}</span>
   <button ref={findRef} type="button" className="secondary-button" data-testid="pulsar-params-find" onKeyDown={ignoreHeldKey} onClick={onFind}>{menuCaptionText(C.find)}</button>
   <button type="button" className="secondary-button" data-testid="pulsar-params-exit" onKeyDown={ignoreHeldKey} onClick={onExit}>{menuCaptionText(C.exit)}</button>
   {/* TPlsrDataForm1 Help1Click 0x569690: the shared help viewer over PLSLSHLP.LST (pulsar options +0x68c; docs/CLEA-HELP.md). */}
   <CleaHelp list={HELP_FILES['PLSLSHLP.LST']} label={menuCaptionText(C.help)} testId="pulsar-params-help"/>
  </div>
  <p className="radio-control-note">{t('pulsarParameters.window.readOnly')}</p>
  <div className="pulsar-params-grid">
   {plain('b1950',C.b1950,s.b1950)}{plain('j2000',C.j2000,s.j2000)}
  </div>
  {sexagesimal('ra',C.ra,[['raHours',C.hours],['raMinutes',C.minutes],['raSeconds',C.seconds]])}
  {sexagesimal('dec',C.dec,[['decDegrees',C.degrees],['decMinutes',C.minutes],['decSeconds',C.seconds]])}
  <div className="pulsar-params-grid">
   {plain('period',C.period,s.period)}{plain('periodDot',C.periodDot,s.periodDot)}
   {plain('epoch',C.epoch,s.epoch)}{plain('sky',C.sky,s.sky)}
   {plain('dm',C.dm,s.dm)}{plain('width',C.width,s.width)}
  </div>
  <div className="pulsar-params-group" role="group" aria-labelledby={`${id}-flux`}>
   <span id={`${id}-flux`} className="radio-control-native">{C.flux}</span>
   <div className="pulsar-params-grid">{plain('s400',C.s400,s.s400)}{plain('s600',C.s600,s.s600)}{plain('s1400',C.s1400,s.s1400)}</div>
  </div>
  {s.issues.length>0&&<p className="radio-control-note" data-testid="pulsar-params-source-issues">{t('pulsarParameters.window.sourceDomain')}</p>}
  <div className="button-row">
   <button type="button" className="secondary-button" data-testid="pulsar-params-prev" aria-describedby={cursorMoved?`${id}-cursor`:undefined} onKeyDown={ignoreHeldKey} onClick={onPrev}>{menuCaptionText(C.prev)}</button>
   <button type="button" className="secondary-button" data-testid="pulsar-params-next" aria-describedby={cursorMoved?`${id}-cursor`:undefined} onKeyDown={ignoreHeldKey} onClick={onNext}>{menuCaptionText(C.next)}</button>
  </div>
  <p data-testid="pulsar-params-position">{t('pulsarParameters.window.position',{position:win.shownIndex+1,count:win.catalog.length})}</p>
  {cursorMoved&&<p id={`${id}-cursor`} className="radio-control-note" data-testid="pulsar-params-cursor-note" style={{overflowWrap:'anywhere'}}>
   {t('pulsarParameters.window.cursorNote',{position:win.listCursor+1,name:nameAt(win.listCursor)})}</p>}
  <p className="radio-control-status" role="status" aria-live="polite" data-testid="pulsar-params-boundary" data-boundary={win.boundary??undefined}>
   {win.boundary===null?'':t(`pulsarParameters.window.boundary.${win.boundary}`)}</p>
  <div className="pulsar-params-group" role="group" aria-labelledby={`${id}-derived`} data-testid="pulsar-params-derived">
   <span id={`${id}-derived`} className="radio-control-native">{C.derived}</span>
   <div className="button-row">
    <button type="button" className="secondary-button" data-testid="pulsar-params-reset" aria-describedby={pointerMoved?`${id}-pointer`:undefined} onKeyDown={ignoreHeldKey} onClick={onReset}>{menuCaptionText(C.reset)}</button>
    <button type="button" className="primary-button" data-testid="pulsar-params-update" aria-describedby={pointerMoved?`${id}-pointer`:undefined} disabled={!win.updateEnabled} onKeyDown={ignoreHeldKey} onClick={onUpdate}>{menuCaptionText(C.update)}</button>
   </div>
   {pointerMoved&&<p id={`${id}-pointer`} className="radio-control-note" data-testid="pulsar-params-pointer-note" style={{overflowWrap:'anywhere'}}>
    {t('pulsarParameters.window.pointerNote',{position:win.index+1,name:nameAt(win.index),shown:win.shownIndex+1})}</p>}
   <div className="pulsar-params-grid">
    <div className="antenna-field">
     <label htmlFor={`${id}-date`} className="radio-control-native">{C.date}</label>
     <input ref={dateRef} id={`${id}-date`} type="text" autoComplete="off" spellCheck={false} value={win.dateText} data-testid="pulsar-params-field-date"
      aria-describedby={`${id}-date-hint ${id}-refusal`} aria-invalid={fieldRefusal==='date'||undefined} onChange={e=>onEdit('date',e.target.value)} onKeyDown={editKey}/>
     <span id={`${id}-date-hint`} className="radio-control-note">{C.dateHint}</span>
    </div>
    <div className="antenna-field">
     <label htmlFor={`${id}-density`} className="radio-control-native">{C.density}</label>
     <input ref={densityRef} id={`${id}-density`} type="text" autoComplete="off" spellCheck={false} value={win.densityText} data-testid="pulsar-params-field-density"
      aria-describedby={`${id}-density-hint ${id}-refusal`} aria-invalid={fieldRefusal==='density'||undefined} onChange={e=>onEdit('density',e.target.value)} onKeyDown={editKey}/>
     <span id={`${id}-density-hint`} className="radio-control-note">{C.densityHint}</span>
    </div>
    <div className="antenna-field">
     <span id={`${id}-derivedPeriod-label`} className="radio-control-native">{C.derivedPeriod}</span>{readOnly('derivedPeriod',win.periodText,`${id}-derivedPeriod-label`)}
    </div>
    <div className="antenna-field">
     <span id={`${id}-distance-label`} className="radio-control-native">{C.distance}</span>{readOnly('distance',win.distanceText,`${id}-distance-label`)}
    </div>
   </div>
   <p id={`${id}-refusal`} className="radio-control-note" role="status" aria-live="polite" data-testid="pulsar-params-field-refusal">
    {fieldRefusal===null?'':t('pulsarParameters.window.fieldTooLong',{max:PULSAR_PARAMETERS_WEB_POLICY.fieldMaxLength})}</p>
   {derivedNotes.length>0&&<ul className="radio-control-note" data-testid="pulsar-params-derived-issues">{derivedNotes.map(text=><li key={text}>{text}</li>)}</ul>}
   <p className="radio-control-note">{t('pulsarParameters.window.epochNote')}</p>
  </div>
  <p className="radio-control-note" data-testid="pulsar-params-seed" data-seed={win.seed===null?'none':'name'} data-activation={activatedBy==='open'?'open':'command'} style={{overflowWrap:'anywhere'}}>{seedText}</p>
 </div>;
}

/** TSearchInput1 (bsDialog, fsStayOnTop): the name field takes focus with its text selected; OK is the Default button
 * (Enter in a field), Cancel and Escape (the close box, WEB-PP-FIND-01) commit nothing. */
function PulsarFindDialog({draft,refused,onEdit,onMode,onOk,onCancel}:Readonly<{draft:{text:string;mode:1|2};refused:boolean;onEdit:(text:string)=>void;onMode:(mode:1|2)=>void;onOk:()=>void;onCancel:()=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),field=useRef<HTMLInputElement>(null);
 useEffect(()=>{field.current?.focus();field.current?.select();},[]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(ignoreHeldKey(e))return;
  if(e.key==='Escape'){e.preventDefault();onCancel();return;}
  if(e.key==='Enter'&&(e.target as HTMLElement).tagName==='INPUT'){e.preventDefault();onOk();return;}
  trapTab(e,root.current);
 };
 return <div className="antenna-backdrop">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-bounds`} className="antenna-dialog" data-testid="pulsar-find-dialog" onKeyDown={onKeyDown}>
   <h3 id={`${id}-title`} className="radio-control-native">{F.form}</h3>
   <div className="antenna-field">
    <label htmlFor={`${id}-name`} className="radio-control-native">{F.name}</label>
    <input ref={field} id={`${id}-name`} type="text" autoComplete="off" spellCheck={false} value={draft.text} data-testid="pulsar-find-query"
     aria-describedby={`${id}-bounds ${id}-refusal`} aria-invalid={refused||undefined} onChange={e=>onEdit(e.target.value)}/>
   </div>
   <fieldset className="antenna-group">
    <legend className="radio-control-native">{F.type}</legend>
    <label><input type="radio" name={`${id}-mode`} checked={draft.mode===1} data-testid="pulsar-find-b1950" onChange={()=>onMode(1)}/> {F.b1950}</label>
    <label><input type="radio" name={`${id}-mode`} checked={draft.mode===2} data-testid="pulsar-find-j2000" onChange={()=>onMode(2)}/> {F.j2000}</label>
   </fieldset>
   <p id={`${id}-bounds`} className="radio-control-note">{t('pulsarParameters.find.bounds',{max:PULSAR_PARAMETERS_WEB_POLICY.findDraftMaxLength,searched:PULSAR_PARAMETERS_CONSTANTS.queryMaxLength})}</p>
   <p id={`${id}-refusal`} className="radio-control-note" role="status" aria-live="polite" data-testid="pulsar-find-refusal">
    {refused?t('pulsarParameters.find.tooLong',{max:PULSAR_PARAMETERS_WEB_POLICY.findDraftMaxLength}):''}</p>
   <div className="button-row">
    <button type="button" className="secondary-button" data-testid="pulsar-find-cancel" onClick={onCancel}>{menuCaptionText(F.cancel)}</button>
    <button type="button" className="primary-button" data-testid="pulsar-find-ok" onClick={onOk}>{menuCaptionText(F.ok)}</button>
   </div>
  </div>
 </div>;
}

/** The not-found box (WEB-PP-FIND-02; literals 0x5694d8/0x5694dc statically recovered, not reproduced) and the update-error box (WEB-PP-UPD-01): authored text;
 * Enter or Escape closes only the box. */
function PulsarNoticeBox({notice,onDismiss}:Readonly<{notice:PulsarParametersNotice;onDismiss:()=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{button.current?.focus();},[]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(ignoreHeldKey(e))return;
  if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();onDismiss();return;}
  trapTab(e,root.current);
 };
 const body=notice.kind==='not-found'?t('pulsarParameters.notice.notFound.body',{query:notice.query,type:notice.mode===2?F.j2000:F.b1950})
  :t(`pulsarParameters.notice.update.${notice.field}`,{text:notice.text});
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} className="antenna-dialog antenna-notice" data-testid="pulsar-params-notice"
   data-kind={notice.kind} data-field={notice.kind==='update-error'?notice.field:undefined} onKeyDown={onKeyDown}>
   <h3 id={`${id}-title`}>{notice.kind==='not-found'?t('pulsarParameters.notice.notFound.title'):t('pulsarParameters.notice.update.title')}</h3>
   <p id={`${id}-body`} data-testid="pulsar-params-notice-text" style={{overflowWrap:'anywhere',whiteSpace:'pre-wrap'}}>{body}</p>
   <p className="radio-control-note">{notice.kind==='not-found'?t('pulsarParameters.notice.notFound.note'):t('pulsarParameters.notice.update.note')}</p>
   <div className="button-row">
    <button ref={button} type="button" className="primary-button" data-testid="pulsar-params-notice-ok" onClick={onDismiss}>{t('pulsarParameters.notice.ok')}</button>
   </div>
  </div>
 </div>;
}
