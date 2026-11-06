import PhotometerDomainExplanation from './PhotometerDomainExplanation';
import ResearchNotes from './components/ResearchNotes';
import {photometerFullDomainExclusion,photometerTargetUnavailableReason,photometerTelescope,photometerTelescopeTargets,isPhotometerTelescopeIndex,isPhotometerTelescopeTarget} from './core/photometerTelescope';
import {opticalProfile,type OpticalIndex} from './core/opticalTelescope';
import {PHOTOMETER_APERTURE_RANGE,photometerApertureGeometry,validPhotometerAperture} from './core/photometerAperture';
import NativeClusterAnalysis from './NativeClusterAnalysis';
import {NativeClusterError,type NativeClusterDraft,type NativeClusterParameters} from './core/nativeCluster';
import {PleiadesAnalysisError,samePleiadesPairSource} from './core/pleiadesAnalysis';
import PleiadesAnalysis from './PleiadesAnalysis';
import {AcquisitionError} from './core/acquisition';
import {PHOTOMETER_SECONDS,PHOTOMETER_REPEATS,LEGACY_PHOTOMETER_TIMING,requiredPhotometerCallbacks,admitPhotometerCallback,MAX_PHOTOMETER_GAP_MS,PHOTOMETER_CALLBACK_MS,PhotometerIntegrationError} from './core/photometerIntegration';
import {reconcilePhotometryDraft,defaultPhotometryDraft,type PhotometryDraft} from './core/editingWorkspace';
import {memo,useContext,useEffect,useMemo,useRef,useState,useImperativeHandle,type Ref} from 'react';
import {createPhotometer,photometerEvent,photometerStructReading,releasePhotometer,skyReplaceAsked,photometerDetectSkyEvent,photometerDetectSkyPinnedRefusal,PhotometerError,type PhotometerState,type PhotometerEvent} from './core/photometer';
import {VireoOptionsContext} from './vireoOptionsContext';
import {photometerNativeOk,photometerStructBands,photometerStructRecordable,photometerStructUnrecorded,validPhotometerNativeInput,PHOTOMETER_NATIVE_KIND,PHOTOMETER_RECORD_LITERALS as RL,type PhotometerNativeInput,type PhotometerStructReading} from './core/photometerNativeRecord';
import {migrateObservationList,observationListActivate,observationListData,observationListFindOrAdd,observationListOk,observationListPhotometer,ObservationListError,type ObservationList} from './core/sharedObservationList';
import {ObservationListContext,ObservationListValue} from './observationListContext';
import {observationalDataFields,type ObservationalDataFields} from './core/clusterNativeHrSelect';
import ObservationalDataDialog from './clusters/ObservationalDataDialog';
import RecordedResultsWindow from './clusters/RecordedResultsWindow';
import {menuCaptionText} from './core/radioControl';
import {queryPhotometerNeighbors,buildPhotometerTargetField,photometerTargetView,isTiledPhotometerTarget,PLEIADES_PHOTOMETER_CHOICES,PLEIADES_PHOTOMETER_TARGETS,PINNED_PLEIADES_V_TARGET as defaultTarget} from './core/photometerField';
import {createNativeSelectionScene} from './core/objectSelection';
import {readPhotometerSession,serializePhotometerSession} from './io/photometerSession';
import {PHOTOMETER_FILTERS,PHOTOMETER_SKY_REPLACE,photometerGalaxySkyGate,tiledPhotometerReason,type PhotometerFilter} from './core/photometerUbvField';
import {pleiadesStarAt,photometerPointingAccess,type PhotometerPointingAccess,type PleiadesHotListRow} from './core/pleiadesHotList';
import {pleiadesExerciseSummary,samePleiadesExerciseSummary,type PleiadesExerciseSummary} from './core/pleiadesLab';
import type {FieldMode,Pointing} from './core/sky';
import {fieldReasonText,formatNumber,t} from './i18n';
import './photometer.css';
import CleaHelp from './clusters/CleaHelp';
import {fieldInfoReasonText} from './observatory/FieldInfoMessages';
import {TILED_PHOTOMETER_PREFIX} from './core/pleiadesSkyContext';
import {HELP_FILES} from './help/helpFiles';
import {PHOTOMETER_ID_LITERALS,photometerIdText,photometerRecordedName,shownCurrentObject} from './core/currentObject';
import {loadedObjectXPositions,objectXMaskState,objectXNear,type ObjectXMaskState} from './io/objectXMask';
import {OBJECT_X_LAB_EN} from './objectx/ObjectXMessages';
const OBJECT_X_HIDDEN_NAME=OBJECT_X_LAB_EN.hiddenName;
const num=(value:number)=>formatNumber(value,{maximumFractionDigits:9,useGrouping:false});
/** A native message box (MessageBox) of the Record/Review path, as a modal dialog. Escape answers with the last button. */
function NativeMessage({caption,lines,testId,buttons}:{caption:string;lines:readonly string[];testId:string;buttons:readonly Readonly<{label:string;testId:string;onClick:()=>void}>[]}){
 const ref=useRef<HTMLDialogElement>(null),first=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();first.current?.focus();}},[]);
 return <dialog ref={ref} className="photometer-sky-dialog" aria-labelledby={`${testId}-title`} data-testid={testId} onCancel={e=>{e.preventDefault();buttons.at(-1)?.onClick();}}><h3 id={`${testId}-title`}>{caption}</h3>{lines.map((l,i)=><p key={i}>{l}</p>)}<div className="button-row">{buttons.map((b,i)=><button key={b.testId} ref={i===0?first:undefined} type="button" className={i===0?'primary-button':'secondary-button'} data-testid={b.testId} onClick={b.onClick}>{b.label}</button>)}</div></dialog>;
}
type NativeBox=Readonly<{kind:'moved';id:string}|{kind:'notSaved'}|{kind:'saved';then:'start'|null}>;
type NativeReview=Readonly<{fields:ObservationalDataFields;readingId:number;input:PhotometerNativeInput;from:'menu'|'start';
 /** Front ONERESULTS review 1 L2: the shared list the dialog opened on and that list with Record1Click's writes. */base:ObservationList;shared:Readonly<{list:ObservationList;index:number}>}>;
/** [W] Without an observatory clock (a bench-only embedding) the record time is the host clock, as VIREO's Now. */
const hostJd=()=>Date.now()/86400000+2440587.5;
/** Front PHVAR review 1 L3: the UT date and time of a frozen field JD (to the second), shown next to it. */
const utOfJd=(jd:number)=>new Date(Math.round((jd-2440587.5)*86400)*1000).toISOString().slice(0,19).replace('T',' ');
function download(text:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='openvireo-pleiades-photometer.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
/** Own-observation confirmation result: "refused" when a guard (stale source, pending read, busy or running work) declines
 * with nothing changed; "failed" when the core rejected the existing nativeClusterFit event (journal limit or other error). */
export type NativeClusterConfirmation=Readonly<{status:'confirmed';state:PhotometerState}|{status:'refused'}|{status:'failed';reason:'limit'|'error'}>;
/** confirmNativeCluster: the own-observation HR view's confirmation. It returns the canonical state after the existing
 * nativeClusterFit event, or a refusal/failure (nothing changes, no Photometer alert) for the view to report itself. */
export type PhotometerController=Readonly<{snapshot:()=>PhotometerState|null;replace:(s:PhotometerState|null)=>void;confirmNativeCluster:(expected:PhotometerState|null,p:NativeClusterParameters)=>NativeClusterConfirmation}>;
/** WEB orchestration (not a recovered native photometer rule): the App owns the actual telescope point; Activate and target or
 * Sky/Object changes prepare this bench's verified field through onPreparePoint, and Start/callbacks require that point. An
 * embedding without a telescope (no `telescope` prop) keeps the earlier bench-only behaviour. */
export type PhotometerTelescopeLink=Readonly<{pointing:Pointing;domeOpen:boolean;mode:FieldMode;moving:boolean;onPreparePoint:(p:Pointing)=>void;/** G3 review 1 M1: the student pointed the telescope themself (not this bench's own prepared field nor the initial pointing). */studentPointed?:boolean;/** The Object X lab's hidden target (G3 review 1 L2), masked like the ObjectX.HTL positions. */hidden?:Pointing|null;/** Front R4: Show Object ID (env+0x2e81) for the IDText label. */showObjectId?:boolean;/** Front P3: the Object X ID for the recorded name (0x4fffd4), Time-Dependent Data (env+0x2e8c) and the observatory clock's JD. */objectXId?:string;timeDependentData?:boolean;currentJd?:()=>number;/** G3 review 1 M2: the Observatory's checked pointing (Limit Slewing refusals; the dome is never opened here). */onPoint?:(p:Pointing)=>'moved'|'dome'|'limit'}>;
const unavailableReason=(row:PleiadesHotListRow)=>row.admitted?'':t(row.reason==='mixed-variable-field'?'ph.unavailableMixed':'ph.unavailableAssociation');
function Photometer({active,initialState=null,controllerRef,onStateChange,investigationBusy=false,drafts,onDraftsChange,configurationAvailable=true,telescopeIndex=0,telescope,onExerciseSummary,onPairSource,onOpenHr,scopeUse}:{/** Front T5: the telescope's Request Time allotment at an Object Start (core/scopeAccess.ts); false refuses it. */scopeUse?:(instrument:'photometer')=>boolean;telescopeIndex?:OpticalIndex;configurationAvailable?:boolean;drafts:PhotometryDraft;onDraftsChange:(d:PhotometryDraft)=>void;active:boolean;initialState?:PhotometerState|null;controllerRef?:Ref<PhotometerController>;onStateChange?:(s:PhotometerState)=>void;investigationBusy?:boolean;telescope?:PhotometerTelescopeLink;onExerciseSummary?:(s:PleiadesExerciseSummary)=>void;onPairSource?:(s:PhotometerState|null)=>void;onOpenHr?:()=>void}){
 const [state,setState]=useState<PhotometerState|null>(initialState),[notice,setNotice]=useState(''),[error,setError]=useState(''),[localBusy,setBusy]=useState(false);
 const busy=localBusy||investigationBusy,busyNow=useRef(busy);busyNow.current=busy;
 const apertureDialog=useRef<HTMLDialogElement>(null),apertureButton=useRef<HTMLButtonElement>(null),apertureCancel=useRef<HTMLButtonElement>(null);
 const [apertureText,setApertureText]=useState('10'),apertureDraft=Number(apertureText),apertureDraftValid=apertureText.trim()!==''&&validPhotometerAperture(apertureDraft);
 // Front G (G3b): a field at the current telescope pointing, built from the compact GSC tiles; and VIREO's sky question.
 const [tiledStatus,setTiledStatus]=useState<Readonly<{status:'loading'}|{status:'error';text:string}>|null>(null),[pointDraft,setPointDraft]=useState<Readonly<{ra:string;dec:string}>|null>(null),tiledAbort=useRef<AbortController|null>(null);
 const skyDialog=useRef<HTMLDialogElement>(null);
 const aperture=state?.apertureSelector??10,geometry=photometerApertureGeometry(aperture);
 const benchIndex=state?(state.telescopeIndex??0):(isPhotometerTelescopeIndex(telescopeIndex)?telescopeIndex:0),bench=photometerTelescope(benchIndex),targetCount=photometerTelescopeTargets(benchIndex).filter(x=>photometerFullDomainExclusion(x.catalogId,benchIndex)===null).length;
 function closeAperture(){apertureDialog.current?.close();}

 const latestDrafts=useRef(drafts);latestDrafts.current=drafts;
 const current=useRef(state),available=useRef(active),clock=useRef<ReturnType<typeof setTimeout>|null>(null),epoch=useRef(0),loadEpoch=useRef(0),pendingLoad=useRef(false);
 const heading=useRef<HTMLHeadingElement>(null),dialog=useRef<HTMLDialogElement>(null),entryButton=useRef<HTMLButtonElement>(null),manualInput=useRef<HTMLInputElement>(null);
 const seed=drafts.seedText,bReading=drafts.bReadingId===null?'':String(drafts.bReadingId),vReading=drafts.vReadingId===null?'':String(drafts.vReadingId);
 function setSeed(seedText:string){onDraftsChange({...drafts,seedText});}
 function setNativeDraft(draft:NativeClusterDraft|null){const next={...latestDrafts.current};if(draft===null)delete next.nativeClusterDraft;else next.nativeClusterDraft=draft;latestDrafts.current=next;onDraftsChange(next);}
 function setClusterText(text:string|null){const next={...latestDrafts.current};if(text===null)delete next.clusterModulusText;else next.clusterModulusText=text;latestDrafts.current=next;onDraftsChange(next);}
 const [draft,setDraft]=useState<{readingId:number;value:string;note:string}|null>(null),[entryError,setEntryError]=useState('');
 // Front P3: the recorded name fixed at Start (0x4fffd4) and the completion time of each reading of this activation; the
 // Record/Review dialog, the native message boxes and the results list window.
 // Front ONERESULTS: Record/Review writes VIREO's one results list (shared with Classification Results and Hubble Record).
 const results=useContext(ObservationListContext),shownList=useContext(ObservationListValue);
 // Front T4: Detect Sky (env+0x2e83 → TPhotometer+0x6b1, core/photometerTabOptions.ts), read at each activation through a ref.
 const detectSky=useContext(VireoOptionsContext).detectSky,detectSkyRef=useRef(detectSky);detectSkyRef.current=detectSky;
 // Review 1 L2: VIREO's FormActivate reads +0x6b1 at activation, so the lock (selector, note, pinned Start refusal) follows the
 // option as the last activation read it, not the live option; the next activation updates it in both directions.
 const [detectLatched,setDetectLatchedState]=useState(false),detectLatchedRef=useRef(false);
 const latchDetectSky=()=>{const on=detectSkyRef.current;detectLatchedRef.current=on;setDetectLatchedState(on);return on;};
 const structMeta=useRef(new Map<number,Readonly<{name:string;jd:number}>>()),startName=useRef<string|null>(null),firstOk=useRef(true);
 const [review,setReview]=useState<NativeReview|null>(null),[nativeBox,setNativeBox]=useState<NativeBox|null>(null),[resultsOpen,setResultsOpen]=useState(false);
 useEffect(()=>{if(draft&&dialog.current?.open)manualInput.current?.focus();},[draft?.readingId]);
 available.current=active;
 const link=useRef(telescope),access=useRef<PhotometerPointingAccess>('ready'),reported=useRef<PleiadesExerciseSummary|null>(null);link.current=telescope;
 const commit=(s:PhotometerState)=>{if(s===current.current)return;const before=latestDrafts.current,next=reconcilePhotometryDraft(before,current.current,s);current.current=s;setState(s);onStateChange?.(s);if(next!==before){latestDrafts.current=next;onDraftsChange(next);}};
 function stopClock(){epoch.current++;if(clock.current!==null)clearTimeout(clock.current);clock.current=null;}
 function stop(){stopClock();if(current.current)commit(photometerEvent(current.current,{type:'stop'}));}
 function release(){setReview(null);setNativeBox(null);tiledAbort.current?.abort();tiledAbort.current=null;setTiledStatus(null);skyDialog.current?.close();closeAperture();const cancelled=pendingLoad.current;pendingLoad.current=false;stopClock();loadEpoch.current++;setBusy(false);if(current.current)commit(releasePhotometer(current.current));if(cancelled)setNotice(t('ph.cancelledLoad'));return cancelled;}
 function snapshot(){release();dialog.current?.close();setDraft(null);return current.current;}
 function replace(s:PhotometerState|null){structMeta.current.clear();setResultsOpen(false);closeAperture();pendingLoad.current=false;stopClock();loadEpoch.current++;setBusy(false);dialog.current?.close();setDraft(null);current.current=s;setState(s);if(s)onStateChange?.(s);setError('');setNotice(t(s?'project.photometryRestored':'project.photometryCleared'));}
 /** Own-observation confirmation: the latest canonical state, no pending file read, no busy or running work, and the same
  * source identity as the view's expectation (samePleiadesPairSource). The core still checks two pairs and the journal budget. */
 function confirmNativeCluster(expected:PhotometerState|null,p:NativeClusterParameters):NativeClusterConfirmation{
  const s=current.current;
  if(!s||!expected||pendingLoad.current||busyNow.current||s.phase==='running'||clock.current!==null||!samePleiadesPairSource(expected,s))return {status:'refused'};
  // Not act(): a failure is reported by the visible own view, never as an alert on this hidden route.
  setError('');
  try{commit(photometerEvent(s,{type:'nativeClusterFit',...p}));return {status:'confirmed',state:current.current!};}
  catch(e){return {status:'failed',reason:e instanceof PhotometerError&&e.code==='limit'?'limit':'error'};}
 }
 useImperativeHandle(controllerRef,()=>({snapshot,replace,confirmNativeCluster}));
 // Live pair source for the own HR view: reported only when pairs, readings, fit, phase or seed change (not per callback).
 const pairSource=useRef(onPairSource);pairSource.current=onPairSource;
 useEffect(()=>{pairSource.current?.(current.current);},[state?.colors,state?.entries,state?.readings,state?.nativeClusterFit,state?.native,state?.phase,state?.seedAtStart,state===null]);
 // The telescope's latest pointing: a bench move sets it at once, a move elsewhere when the App re-renders (L1).
 const latestPointing=useRef<Pointing|null>(telescope?.pointing??null);
 useEffect(()=>{if(telescope)latestPointing.current=telescope.pointing;},[telescope?.pointing.ra,telescope?.pointing.dec]);
 useEffect(()=>{if(active)heading.current?.focus();else{release();dialog.current?.close();}},[active]);
 useEffect(()=>{if(current.current?.armed&&(current.current.telescopeIndex??0)!==telescopeIndex){release();setNotice(t('ph.released'));}},[telescopeIndex]);
 useEffect(()=>{const hide=()=>{if(document.visibilityState==='hidden'){if(!release())setNotice(t('ph.released'));}};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);stopClock();loadEpoch.current++;};},[]);
 function failure(e:unknown){if(e instanceof NativeClusterError){setError(t('nc.error'));return;}if(e instanceof PleiadesAnalysisError){setError(t('pa.confirmError'));return;}if(e instanceof AcquisitionError&&e.code==='precision'){setError(t('ph.seriesPrecision'));return;}setError(t(e instanceof PhotometerError&&e.code==='sky'?'ph.needSky':e instanceof PhotometerError&&e.code==='color'?'ph.colorError':(e instanceof PhotometerError||e instanceof PhotometerIntegrationError)&&e.code==='limit'?(current.current?.timing?'ph.seriesLimit':'ph.limitError'):e instanceof PhotometerIntegrationError?'ph.seriesError':'ph.error',{filter:current.current?.filter??'V'}));}
 // Controlled target and Sky/Object changes move the App telescope to the new verified field without releasing this context.
 function preparePoint(s:PhotometerState){link.current?.onPreparePoint(buildPhotometerTargetField(s.targetId,s.pointing).pointing);}
 function act(e:PhotometerEvent){setError('');try{if(!current.current)return false;commit(photometerEvent(current.current,e));if((e.type==='target'||e.type==='point')&&!isTiledPhotometerTarget(current.current.targetId))preparePoint(current.current);return true;}catch(e){failure(e);return false;}}
 /** G3b: measure wherever the telescope points (VIREO's free photometer). The field is read from the tiles; a typed reason is shown
  * when it cannot be reproduced. Sky or Object stays the student's choice; moving the telescope later needs this again. */
 /** G3b, routed through the Observatory's checked pointing (G3 review 1 M2): move to a clean patch of sky and back without
  * leaving the bench, which would release it. A refusal moves nothing. */
 function pointTelescope(){
  const d=pointDraft,ra=Number(d?.ra),dec=Number(d?.dec);setError('');
  if(!d||!/^\s*[0-9.]+\s*$/.test(d.ra)||!/^\s*[-+]?[0-9.]+\s*$/.test(d.dec)||!(ra>=0&&ra<24)||!(dec>=-90&&dec<=90)){setError(t('ph.tiledPointInvalid'));return;}
  const r=link.current?.onPoint?.({ra,dec});if(!r)return;
  if(r!=='moved'){setError(t(r==='dome'?'ph.tiledPointDome':'ph.tiledPointLimit'));return;}
  latestPointing.current={ra,dec};setTiledStatus(null);if(current.current?.armed)void useTelescopePointing({ra,dec});
 }
 async function useTelescopePointing(at?:Pointing){
  const p=at??link.current?.pointing,s=current.current;if(!p||!s?.armed||s.phase==='running'||busyNow.current)return;
  tiledAbort.current?.abort();const controller=new AbortController();tiledAbort.current=controller;setTiledStatus({status:'loading'});setError('');
  try{
   const {preparePhotometerTiledField}=await import('./io/photometerTiledFields'),r=await preparePhotometerTiledField({ra:p.ra,dec:p.dec},{signal:controller.signal,hidden:link.current?.hidden??null,...(link.current?.currentJd?{currentJd:link.current.currentJd}:{})});
   if(controller.signal.aborted)return;tiledAbort.current=null;
   // G3 review 1 L1: a field read for a pointing the telescope has since left is dropped, never applied to the new pointing.
   const now=latestPointing.current;if(!now||now.ra!==p.ra||now.dec!==p.dec){setTiledStatus({status:'error',text:t('ph.tiledMoved')});return;}
   if(r.status!=='ready'){setTiledStatus({status:'error',text:r.reason==='field-tiles'||r.reason==='field-unreadable'?fieldInfoReasonText(r.reason,r.detail??''):t(`ph.tiledReason.${r.reason}`,{detail:r.reason==='photometer-variable'?fieldReasonText(r.detail??''):r.detail??''})});return;}
   setTiledStatus(null);const before=current.current;
   // Front T4: with Detect Sky on, this re-activation sets the detected mode (FormActivate 0x4ff94c) with one slider event.
   const detected=()=>{const after=current.current;const d=latchDetectSky()&&before&&after?photometerDetectSkyEvent(before,after):null;return !d||act(d);};
   if(act({type:'field',ra:p.ra,dec:p.dec,...(r.jd!==undefined?{jd:r.jd}:{})})&&detected())setNotice(t(r.selectedType===1?'ph.tiledReadyGalaxy':r.selectedType===3?'ph.tiledReadyQso':'ph.tiledReady',{name:r.selectedName.trimEnd()}));
  }catch(e){
   if(controller.signal.aborted)return;
   // Only a failed request is "a catalogue piece did not arrive"; anything else is reported as a load error (G3 review 1 L6).
   setTiledStatus({status:'error',text:e instanceof TypeError&&/fetch|network/i.test(e.message)?fieldInfoReasonText('field-tiles','fetch'):fieldInfoReasonText('load-error')});
  }
 }
 function freshPhotometer(){if(!configurationAvailable||!isPhotometerTelescopeIndex(telescopeIndex))throw new PhotometerError('phase');return photometerEvent(createPhotometer(parsedSeed()),{type:'telescope',index:telescopeIndex});}
 function parsedSeed(){if(!/^\d{1,10}$/.test(seed)||Number(seed)>0xffffffff)throw new Error('seed');return Number(seed);}
 /** One commit. A telescope pointed exactly at an admitted PLEIADES.HTL row selects that target (object position); a pointed
  * unadmitted row, or an admitted row outside the selected telescope's checked domain, blocks with no event and no fallback.
  * Any other pointing keeps the bench's current target and moves the telescope explicitly to that known field. */
 function activate(here=false){setError('');try{if(!configurationAvailable||!isPhotometerTelescopeIndex(telescopeIndex))throw new PhotometerError('phase');
  const row=link.current?pleiadesStarAt(link.current.pointing):null;
  if(row&&(!row.admitted||!isPhotometerTelescopeTarget(row.catalogId,telescopeIndex))){setNotice('');setError(t('ph.pointedBlocked',{label:row.id,number:row.index+1}));return;}
  const prepared=photometerEvent(current.current??createPhotometer(parsedSeed()),{type:'telescope',index:telescopeIndex});const changedTarget=!row&&current.current!==null&&prepared.targetId!==current.current.targetId;
  let next=photometerEvent(prepared,{type:'activate'});
  if(row?.admitted)next=photometerEvent(next,row.catalogId===next.targetId?{type:'point',kind:'object'}:{type:'target',targetId:row.catalogId});
  // G3 review 1 M1: VIREO's FormActivate (0x4ff8b0) never moves the telescope; it selects the nearest object where the telescope
  // points (0x53cf94). A pointing the student chose is kept and its field read from the tiles; otherwise (the initial pointing
  // or this bench's own field) the web E04 bench still moves to its known Pleiades field, as before.
  const keep=!row&&(here||!!link.current?.studentPointed);
  // Front T4: with Detect Sky on, FormActivate's mode is the detected one (a tiled field; pinned targets keep their positions).
  // A kept pointing is re-read below, and that read detects again (useTelescopePointing).
  if(latchDetectSky()&&!keep){const detected=photometerDetectSkyEvent(prepared,next);if(detected)next=photometerEvent(next,detected);}
  commit(next);if(keep){setNotice(t('ph.activated',{filter:next.filter}));void useTelescopePointing();return;}preparePoint(next);
  setNotice(row?t('ph.activatedPointed',{label:row.id,number:row.index+1}):changedTarget?t('ph.telescopeTargetReset',{target:photometerTargetView(prepared.targetId).hotlistLabel}):t('ph.activated',{filter:next.filter}));}catch(e){failure(e);}}
 function start(skipMoved=false){setError('');try{
  if(!available.current||!current.current)throw new PhotometerError('phase');
  if(access.current!=='ready'){setError(t(`ph.access.${access.current}`));return;}
  // Front T4 [W]: Detect Sky would read Object at a pinned sky position the star still lights (photometerDetectSkyPinnedRefusal).
  if(detectLatchedRef.current&&photometerDetectSkyPinnedRefusal(current.current)){setError(t('ph.detectSkyPinned'));return;}
  // Start 0x4ffa30: replacing this filter's sky while a star has light in the aperture asks first ("Reading Sky!", Yes/No).
  if(skyReplaceAsked(current.current)&&!current.current.skyReplaceConfirmed){skyDialog.current?.showModal();return;}
  // Front P3, Start 0x4fffd4: an unrecorded reading asks "Telescope has Moved!" before the struct is reset. [W] A reading the
  // student already entered in the web notebook counts as kept: the question exists to warn that the value is lost otherwise.
  const struct=photometerStructReading(current.current),meta=struct?structMeta.current.get(struct.id):undefined;
  if(!skipMoved&&meta&&photometerStructUnrecorded(struct,current.current.native)&&!current.current.entries.some(e=>e.readingId===struct!.id)){setNativeBox({kind:'moved',id:meta.name});return;}
  // Front T5: an Object reading's Start uses the telescope's allotment (0x4fffd4 → 0x5001a2, +0x41c = 0); a Sky reading does not.
  if(current.current.pointing!=='sky'&&scopeUse&&!scopeUse('photometer')){setError(t('scopeAccess.instrumentRefused'));return;}
  startName.current=photometerRecordedName(!!link.current?.showObjectId,current.current.pointing==='sky',idObject,link.current?.objectXId??'');
  commit(photometerEvent(current.current,{type:'start'}));setIdShown(true);stopClock();const id=epoch.current;let last=Math.floor(performance.now());
  const step=()=>{if(id!==epoch.current||!available.current||!current.current)return;clock.current=null;
   // Browser guard before any draw: a telescope off this field releases the context instead of integrating.
   if(access.current!=='ready'){release();setNotice(t('ph.pointingReleased'));return;}
   const now=Math.floor(performance.now());
   const admission=current.current.timing?admitPhotometerCallback(last,now,document.visibilityState==='hidden'):'advance';
   if(admission==='release'){release();setNotice(t('ph.released'));return;}
   if(admission==='stop'){stop();setError(t('ph.seriesGap',{limit:MAX_PHOTOMETER_GAP_MS}));return;}
   try{const next=photometerEvent(current.current,current.current.timing?{type:'advance',callbacks:1}:{type:'complete'});commit(next);last=now;
    if(next.phase==='complete'&&next.current&&startName.current!==null)structMeta.current.set(next.current.id,Object.freeze({name:startName.current,jd:link.current?.currentJd?.()??hostJd()}));
    if(next.phase==='running'&&id===epoch.current&&available.current)clock.current=setTimeout(step,PHOTOMETER_CALLBACK_MS);
    else if(id===epoch.current)setNotice(t(next.timing?'ph.seriesCompleted':'ph.completed'));
   }catch(e){stop();failure(e);}
  };clock.current=setTimeout(step,PHOTOMETER_CALLBACK_MS);
 }catch(e){failure(e);}}

 function save(){setError('');try{release();if(current.current){download(serializePhotometerSession(current.current));setNotice(t('ph.saved'));}}catch(e){failure(e);}}
 async function restore(file:File){if(busy)return;setError('');release();const ticket=++loadEpoch.current;pendingLoad.current=true;setBusy(true);try{const s=await readPhotometerSession(file);if(ticket!==loadEpoch.current||!available.current)return;structMeta.current.clear();commit(s);onDraftsChange(defaultPhotometryDraft(s));
  // Front ONERESULTS [W]: a photometer session file fills an empty Observational Results list with its Record/Review rows (as an
  // older investigation migrates); a list that already holds records is left as it is.
  let skipped=false;
  if(results&&s.native?.rows.length){if(results.get().records.length)skipped=true;else try{results.commit(migrateObservationList({photometer:s.native.rows,hubble:[]}));}catch(e){if(!(e instanceof ObservationListError))throw e;}}
  setNotice(skipped?t('ph.restored')+' '+t('ph.nativeRestoreSkipped'):t('ph.restored'));}catch(e){if(ticket===loadEpoch.current)failure(e);}finally{if(ticket===loadEpoch.current){pendingLoad.current=false;setBusy(false);}}}
 const timing=state?.timing??LEGACY_PHOTOMETER_TIMING;
 const filter=state?.filter??'V',target=photometerTargetView(state?.targetId??defaultTarget.catalogId),tiledLimit=target.tiled&&state?tiledPhotometerReason(target.catalogId,benchIndex,aperture,state.pointing):null;
 // Front PHSKY: in Sky mode on a galaxy, the Telescope-display gate VIREO applies (0x53e338 ≥ 80, 0x50066d..0x5006b3).
 const galaxySky=target.tiled&&state?.pointing==='sky'?photometerGalaxySkyGate(target.catalogId,benchIndex,aperture):null;
 const domainLimit=!target.tiled&&state?photometerFullDomainExclusion(target.catalogId,benchIndex):null;
 const readingFor=(id:number)=>state?.readings.find(r=>r.id===id);
 const entriesForTarget=state?.entries.filter(e=>readingFor(e.readingId)?.targetId===target.catalogId)??[];
 const kind=state?.pointing??'sky',field=useMemo(()=>buildPhotometerTargetField(target.catalogId,kind),[kind,target.catalogId]);
 // Front R4: IDText (0x4ffa30), updated at Start and when the Object/Sky slider moves (RdngSliderPositionChange 0x5021d3);
 // `Telescope` until then (DFM). The object is VIREO's current object, refreshed at FormActivate (0x4ff909): 0x59a0fc's pick in
 // the bench target's object field. [W] The web reads it from the target's object field whenever the label is drawn; the bench
 // target changes only at Activate, so this is the star picked at activation (never the sky field's pick, review 1 M1).
 // The Object X mask [W, E08] is keyed to the star it was computed for: until that key's result is known the name is not shown
 // (fail closed), and once ObjectX.HTL is loaded it is evaluated synchronously, so no other text flashes (review 1 M2).
 const objectPick=useMemo(()=>(kind==='object'?field:buildPhotometerTargetField(target.catalogId,'object')).selected,[field,kind,target.catalogId]);
 const [idShown,setIdShown]=useState(false);
 const hiddenTarget=telescope?.hidden??null;
 const idKey=`${objectPick.ra}|${objectPick.dec}|${hiddenTarget?`${hiddenTarget.ra}|${hiddenTarget.dec}`:'-'}`;
 const [asyncMask,setAsyncMask]=useState<Readonly<{key:string;state:ObjectXMaskState}>|null>(null);
 const loadedPositions=loadedObjectXPositions();
 const idMask:ObjectXMaskState|'pending'=loadedPositions?(objectXNear(loadedPositions,hiddenTarget,{ra:objectPick.ra,dec:objectPick.dec},0)?'near':'clear'):asyncMask?.key===idKey?asyncMask.state:'pending';
 useEffect(()=>{if(loadedPositions||asyncMask?.key===idKey)return;let live=true;
  objectXMaskState(hiddenTarget,{ra:objectPick.ra,dec:objectPick.dec},0).then(r=>{if(live)setAsyncMask({key:idKey,state:r});},()=>{if(live)setAsyncMask({key:idKey,state:'unknown'});});
  return()=>{live=false;};},[idKey,loadedPositions]);
 const idSky=kind==='sky',idObject=shownCurrentObject({status:'object',name:objectPick.nativeName,kind:objectPick.type,v:0,ra:objectPick.ra,dec:objectPick.dec},idMask==='pending'?'unknown':idMask);
 const idText=!idShown?PHOTOMETER_ID_LITERALS.initial:idMask==='pending'&&!!telescope?.showObjectId&&!idSky?PHOTOMETER_ID_LITERALS.initial:photometerIdText(!!telescope?.showObjectId,idSky,idObject,OBJECT_X_HIDDEN_NAME);
 const apertureNeighbors=useMemo(()=>queryPhotometerNeighbors(field.pointing,geometry.radiusDegrees,field.stars,field.qsos??[]),[field,aperture]);
 // Front PHTILED: a selected galaxy is drawn as a ring of its catalogue diameter (the selection radius rule of 0x59a0fc uses it too).
 // Review 1 N3: QSO-list records whose star-list copy is gone still add light (0x59ac54 walks field+0x35), so they are drawn too.
 const drawn=useMemo(()=>[...field.stars,...(field.qsos??[]).filter(q=>!field.stars.some(s=>s.id===q.id))],[field]);
 const scene=useMemo(()=>createNativeSelectionScene(drawn,field.selectedGalaxy?[{id:field.selected.id,ra:field.selected.ra,dec:field.selected.dec,majorArcminutes:field.selectedGalaxy.majorArcminutes}]:[],{width:936,height:936,fieldDegrees:.05,center:field.pointing,population:{coverage:'complete',provenance:field.provenanceFile}}),[field,drawn]);
 const running=state?.phase==='running',armed=state?.armed===true,reading=state?.current;
 const pointingAccess:PhotometerPointingAccess=telescope?photometerPointingAccess({fieldPointing:field.pointing,pointing:telescope.pointing,domeOpen:telescope.domeOpen,mode:telescope.mode,moving:telescope.moving}):'ready';access.current=pointingAccess;
 const pointedRow=telescope?pleiadesStarAt(telescope.pointing):null,pointedBlocked=!!pointedRow&&(!pointedRow.admitted||!(isPhotometerTelescopeIndex(telescopeIndex)&&isPhotometerTelescopeTarget(pointedRow.catalogId,telescopeIndex)));
 const pointedState=pointedRow?(pointedBlocked?'blocked':'admitted'):'none';
 useEffect(()=>{if(!onExerciseSummary)return;const next=pleiadesExerciseSummary(state,pointingAccess);if(reported.current&&samePleiadesExerciseSummary(reported.current,next))return;reported.current=next;onExerciseSummary(next);},[state,pointingAccess]);
 const canRecord=armed&&!busy&&state?.phase==='complete'&&reading?.kind==='object'&&reading.reduction?.status==='available'&&!state.entries.some(e=>e.readingId===reading.id);
 // Front P3: File › Data › Record/Review (Record1Click 0x501e7c). The merge happens before the dialog natively; the web commits
 // one event when the dialog closes, which is equivalent because the dialog is modal and nothing else changes in between.
 const struct=photometerStructReading(state),canNative=armed&&!busy&&!running&&!!struct&&structMeta.current.has(struct.id)&&photometerStructRecordable(struct,state?.native);
 const nativeRows=shownList.records;
 /** Record1Click 0x501e7c up to ShowModal on the shared list: find-or-add 0x54a73c across routes, the photometer's writes, then
  * FormActivate's c·z store (0x54aefc). */
 function sharedMerge(list:ObservationList,r:PhotometerStructReading,input:PhotometerNativeInput){
  const pos=observationListFindOrAdd(list,input.id,input.jd,input.timeDependent);
  const written=observationListPhotometer(pos.list,pos.index,{ra:input.ra,dec:input.dec,kind:PHOTOMETER_NATIVE_KIND,bands:photometerStructBands(r)});
  return {list:observationListActivate(written,pos.index,results?.options().computeRedshiftVelocity??false),index:pos.index};
 }
 function openReview(from:'menu'|'start'):boolean{
  const s=current.current,r=photometerStructReading(s),meta=r?structMeta.current.get(r.id):undefined;
  if(!s||!r||!meta||!photometerStructRecordable(r,s.native))return false;
  const p=link.current?.pointing??field.pointing,input:PhotometerNativeInput={id:meta.name,jd:meta.jd,ra:p.ra,dec:p.dec,timeDependent:!!link.current?.timeDependentData};
  if(!results||!validPhotometerNativeInput(input)){setError(t('ph.nativeBlocked'));return false;}
  try{const base=results.get(),m=sharedMerge(base,r,input),view=observationalDataFields(observationListData(m.list),m.index);
   if(view.kind!=='ready'){setError(t('ph.nativeBlocked'));return false;}
   setError('');setReview({fields:view.fields,readingId:r.id,input,from,base,shared:{list:m.list,index:m.index}});return true;
  }catch(e){if(e instanceof ObservationListError){setError(t(e.code==='limit'?'ph.nativeListFull':'ph.nativeBlocked'));return false;}failure(e);return false;}
 }
 /** OK (0x54b02c) or Cancel (0x54b2dc), then Record1Click's tail (0x501f9a–0x502043) and, from Start, 0x4fffd4's follow-up. */
 function finishReview(result:Readonly<{ok:true;remarks:string;spectralCode:number}>|Readonly<{ok:false}>){
  const r=review;if(!r||!current.current)return;let done=false;
  // The shared list keeps the merged record on OK and on Cancel alike (Cancel 0x54b2dc rolls nothing back, [D]); OK adds the
  // remarks and the Sp code. Review 1 L2: the next list is prepared first and the journal event is committed only when it can be
  // stored, so the two never disagree; a list changed while the dialog was open refuses both.
  if(!results||results.get()!==r.base){setReview(null);setError(t('ph.nativeStale'));return;}
  let next:ObservationList;
  try{next=result.ok?observationListOk(r.shared.list,r.shared.index,{remarks:result.remarks,spectralCode:result.spectralCode}):r.shared.list;}
  catch(e){if(e instanceof ObservationListError){setReview(null);setError(t('ph.nativeBlocked'));return;}throw e;}
  try{commit(photometerEvent(current.current,{type:'nativeRecord',readingId:r.readingId,...r.input,ok:result.ok,remarks:result.ok?result.remarks:'',spectralCode:result.ok?result.spectralCode:0}));done=true;}catch(e){failure(e);}
  if(done)results.commit(next);
  setReview(null);
  if(done&&result.ok){
   if(firstOk.current){firstOk.current=false;setNativeBox({kind:'saved',then:r.from==='start'?'start':null});return;}
   setNotice(t('ph.nativeRecorded'));if(r.from==='start')start(true);return;
  }
  if(done)setNotice(t('ph.nativeCancelled'));
  if(r.from==='start')setNativeBox({kind:'notSaved'});
 }
 function openEntry(){if(!canRecord||!reading)return;setDraft({readingId:reading.id,value:'',note:''});setEntryError('');dialog.current?.showModal();}
 return <main className="observatory-main photometer-main" aria-busy={busy}><section className="observatory-heading"><div className="eyebrow">{t('ph.eyebrow')}</div><h1 ref={heading} tabIndex={-1}>{t('ph.title')}</h1>{/* TPhotometer Help1Click 0x502118, list loaded at FormShow 0x4ff820 from options +0x95c (docs/CLEA-HELP.md) */}<CleaHelp list={HELP_FILES['PHOTOHLP.LST']} testId="photo-help"/><p>{t('ph.intro',{count:targetCount})}</p><p data-testid="photo-list-scope">{t('ph.listScope')}</p><p>{t('instrumentAccess.photoSeparate')}</p>{telescope&&<p data-testid="photo-orchestration">{t('instrumentAccess.photoOrchestration')}</p>}<p data-testid="photo-selected-telescope">{t('ph.selectedTelescope',{name:opticalProfile(telescopeIndex).name})}</p>{state&&benchIndex!==telescopeIndex&&<p>{t('ph.retainedTelescope',{name:bench.name})}</p>}</section>
 <ol className="first-steps"><li><strong>{t('ph.step1')}</strong><span>{t('ph.step1Help')}</span></li><li><strong>{t('ph.step2')}</strong><span>{t('ph.step2Help')}</span></li><li><strong>{t('ph.step3')}</strong><span>{t('ph.step3Help')}</span></li></ol>
 {(telescopeIndex===2||benchIndex===2)&&<PhotometerDomainExplanation context={telescopeIndex===2?'selected':'retained'}/>}<div className="photometer-grid"><section className="card"><div className="card-heading"><h2>{t('ph.field')}</h2><span className="photometer-badge">{t('ph.fixed',{telescope:bench.name})}</span></div><label htmlFor="photo-target">{t('ph.target')}</label><select id="photo-target" value={target.catalogId} disabled={!armed||running||busy} onChange={e=>act({type:'target',targetId:e.target.value})}>{target.tiled&&<option value={target.catalogId}>{t('ph.tiledOption',{name:target.hotlistLabel})}</option>}{PLEIADES_PHOTOMETER_CHOICES.map(o=><option key={o.hotlistRecord} value={o.targetId??`unavailable:${o.hotlistRecord}`} disabled={!o.targetId||!isPhotometerTelescopeTarget(o.targetId,benchIndex)}>{o.targetId?(isPhotometerTelescopeTarget(o.targetId,benchIndex)?photometerFullDomainExclusion(o.targetId,benchIndex)!==null?t('ph.targetStartRefused',{label:o.hotlistLabel,number:o.hotlistRecord+1}):t('ph.targetOption',{label:o.hotlistLabel,number:o.hotlistRecord+1}):t('ph.targetUnavailable',{label:o.hotlistLabel,number:o.hotlistRecord+1,reason:t(photometerTargetUnavailableReason(o.targetId,benchIndex)==='Poisson-mean-bound'?'ph.unavailableMean':photometerTargetUnavailableReason(o.targetId,benchIndex)==='all-duration-count-domain'?'ph.unavailableSeries':'ph.unavailablePhotonDomain')})):t('ph.targetUnavailable',{label:o.hotlistLabel,number:o.hotlistRecord+1,reason:t(o.reason==='mixed-variable-field'?'ph.unavailableMixed':'ph.unavailableAssociation')})}</option>)}</select>{!target.tiled&&<p className="observatory-note">{t('ph.sampleCoverage',{available:targetCount,total:PLEIADES_PHOTOMETER_CHOICES.length,excluded:PLEIADES_PHOTOMETER_CHOICES.length-targetCount})}</p>}<p>{target.hotlistLabel}{target.tiled?null:<> · {target.nativeName}</>}</p><p className="observatory-note">{target.hotlistRecord===null?field.selected.variable?field.selected.variable.path==='hit'?t('ph.tiledProvenanceVariableHit',{name:field.selected.nativeName,variable:`CLEA_VStrs.dat@${field.selected.variable.recordIndex}`,record:field.selected.id,ra:num(field.pointing.ra),dec:num(field.pointing.dec)}):t('ph.tiledProvenanceVariableMiss',{name:field.selected.nativeName,variable:`CLEA_VStrs.dat@${field.selected.variable.recordIndex}`,ra:num(field.pointing.ra),dec:num(field.pointing.dec)}):t(field.selected.type===0?'ph.tiledProvenance':'ph.tiledProvenanceCatalogue',{record:field.selected.id,ra:num(field.pointing.ra),dec:num(field.pointing.dec)}):t('ph.targetProvenance',{number:target.hotlistRecord+1,record:target.catalogId})}</p>{field.variableTime&&<p className="observatory-note" data-testid="photo-tiled-frozen-time">{t('ph.tiledFrozenTime',{jd:num(field.variableTime.jd),ut:utOfJd(field.variableTime.jd)})}</p>}<p className="observatory-note">{t(target.tiled?'ph.tiledTargetHelp':'ph.targetHelp')}</p>
 <svg className="photometer-field" viewBox="0 0 936 936" role="img" aria-label={t('ph.chart')}><rect width="936" height="936" fill="#092532"/>{[234,468,702].map(n=><g key={n} stroke="#23434f"><line x1={n} y1="0" x2={n} y2="936"/><line x1="0" y1={n} x2="936" y2={n}/></g>)}{scene.stars.map(s=><g key={s.id}><circle cx={s.x} cy={s.y} r={s.id===(target.tiled?field.selected.id:target.catalogId)?6:4} fill="#e2dbc7"/><text x={Math.min(700,Math.max(20,s.x+14))} y={Math.min(900,Math.max(30,s.y-12))} fill="#c3d3d5" fontSize="23">{drawn.find(r=>r.id===s.id)?.nativeName.trimEnd()}</text></g>)}{scene.galaxies.map(g=><g key={g.id} data-testid="photo-galaxy-mark"><circle cx={g.x} cy={g.y} r={Math.min(430,Math.max(8,g.majorArcminutes/60*scene.verticalPixelsPerDegree/2))} fill="none" stroke="#b9c7f0" strokeWidth="3" strokeDasharray={g.majorArcminutes/60*scene.verticalPixelsPerDegree/2>430?'14 10':undefined}/><text x={Math.min(700,Math.max(20,g.x+14))} y={Math.min(900,Math.max(30,g.y+30))} fill="#c8d2f0" fontSize="23">{field.selected.nativeName.trimEnd()}</text></g>)}<g stroke="#e7b873" fill="none"><circle cx="468" cy="468" r={aperture+.5} strokeWidth="3"/><path d="M435 468h18m30 0h18M468 435v18m0 30v18" strokeWidth="2"/></g><text x="468" y="37" textAnchor="middle" fill="#bcd0d5" fontSize="25">N</text></svg>
 <p className="observatory-note">{t('ph.chartHelp',{radius:aperture+.5})}</p><div className="pointing-readout"><span><small>{t('sky.ra')}</small><output>{num(field.pointing.ra)} h</output></span><span><small>{t('sky.dec')}</small><output>{num(field.pointing.dec)}°</output></span></div>
 <p className="photometer-id"><span>{PHOTOMETER_ID_LITERALS.caption}</span> <output data-testid="photo-id-text">{idText}</output></p><label htmlFor="photo-pointing">{t('ph.pointing')}</label><select id="photo-pointing" disabled={!armed||running||busy||detectLatched&&target.tiled} data-detect-sky={detectLatched&&target.tiled||undefined} value={kind} onChange={e=>{const k=e.target.value as 'sky'|'object';act({type:'point',kind:k});setIdShown(true);}}><option value="sky">{t(target.tiled?'ph.tiledSky':'ph.skyPosition')}</option><option value="object">{t('ph.objectPosition',{target:target.hotlistLabel})}</option></select>{armed&&detectLatched&&target.tiled&&<p className="observatory-note" data-testid="photo-detect-sky">{t('ph.detectSkyLocked')}</p>}
 <p>{target.tiled?(q=>{const neighbors=apertureNeighbors.filter(s=>s.nativeName!==field.selected.nativeName).length;return q>0?t('ph.tiledCoverageQso',{count:field.stars.length,qsos:q,neighbors}):t('ph.tiledCoverage',{count:field.stars.length,neighbors});})(field.qsos?.length??0):t('ph.coverage',{count:field.stars.length,neighbors:apertureNeighbors.filter(s=>s.id!==target.catalogId).length})}</p></section>
 <section className="card"><h2>{t('ph.controls')}</h2><p>{state?.timing?t('ph.seriesProfile',{filter,telescope:bench.name,seconds:timing.secondsPerIntegration,repeats:timing.integrations}):t('ph.profile',{filter,telescope:bench.name})}</p><div className="sky-actions"><button className="primary-button" disabled={armed||busy||!configurationAvailable||pointedBlocked} onClick={()=>activate()}>{t('ph.activate')}</button><button className="secondary-button" disabled={!armed||busy} onClick={()=>{if(!release())setNotice(t('ph.released'));}}>{t('ph.release')}</button></div>
 {telescope&&<section className="photometer-telescope" aria-labelledby="photo-telescope-title"><h3 id="photo-telescope-title">{t('ph.telescopeTitle')}</h3><div className="photometer-readout"><span>{t('sky.ra')}<output data-testid="photo-telescope-ra">{num(telescope.pointing.ra)}</output></span><span>{t('sky.dec')}<output data-testid="photo-telescope-dec">{num(telescope.pointing.dec)}</output></span></div>
 <p role="status" data-testid="photo-telescope-access" data-access={pointingAccess}>{t(`ph.access.${pointingAccess}`)}</p>
 <div className="photometer-tiled"><button type="button" className="secondary-button" data-testid="photo-use-pointing" disabled={running||busy||tiledStatus?.status==='loading'||telescope.moving||!configurationAvailable} onClick={()=>{if(armed)void useTelescopePointing();else activate(true);}}>{t('ph.tiledUse')}</button>
 <p className="observatory-note">{t('ph.tiledHelp')}</p>
 {telescope.onPoint&&<div className="photometer-tiled-point"><label htmlFor="photo-point-ra">{t('ph.tiledRa')}</label><input id="photo-point-ra" inputMode="decimal" maxLength={20} value={pointDraft?.ra??String(telescope.pointing.ra)} disabled={running||busy} onChange={e=>setPointDraft({ra:e.target.value,dec:pointDraft?.dec??String(telescope.pointing.dec)})}/><label htmlFor="photo-point-dec">{t('ph.tiledDec')}</label><input id="photo-point-dec" inputMode="decimal" maxLength={20} value={pointDraft?.dec??String(telescope.pointing.dec)} disabled={running||busy} onChange={e=>setPointDraft({ra:pointDraft?.ra??String(telescope.pointing.ra),dec:e.target.value})}/><button type="button" className="secondary-button" data-testid="photo-point-telescope" disabled={running||busy||telescope.moving} onClick={()=>pointTelescope()}>{t('ph.tiledPoint')}</button></div>}
 {/* G3 closure N3: say why such readings leave E04 (the reading itself stays, as in VIREO). */}{state?.armed&&state.sky&&state.sky.fieldTargetId.startsWith(TILED_PHOTOMETER_PREFIX)&&!state.targetId.startsWith(TILED_PHOTOMETER_PREFIX)&&<p role="note" className="observatory-note" data-testid="photo-tiled-sky-note">{t('ph.tiledSkyNote')}</p>}
 {tiledStatus&&<p role="status" data-testid="photo-tiled-status" data-status={tiledStatus.status}>{tiledStatus.status==='loading'?t('ph.tiledLoading'):tiledStatus.text}</p>}
 {tiledLimit&&<p role="status" data-testid="photo-tiled-limit" data-reason={tiledLimit}>{tiledLimit==='photometer-galaxy-sky'?t('ph.tiledLimit.photometer-galaxy-sky',{min:galaxySky?.level.min??0,max:galaxySky?.level.max??0}):t(`ph.tiledLimit.${tiledLimit}`,{telescope:bench.name})}</p>}
 {galaxySky&&galaxySky.gate!=='undecided'&&<p role="status" data-testid="photo-galaxy-sky-gate" data-gate={galaxySky.gate}>{t(galaxySky.gate==='open'?'ph.galaxySkyGate.open':'ph.galaxySkyGate.closed',{declared:galaxySky.level.declared,min:galaxySky.level.min,max:galaxySky.level.max})}</p>}</div>
 {!armed&&<p data-testid="photo-pointed-row" data-pointed={pointedState}>{!pointedRow?(telescope?.studentPointed?t('ph.pointedNoneHere'):t('ph.pointedNone',{target:target.hotlistLabel})):!pointedRow.admitted?t('ph.pointedUnavailable',{label:pointedRow.id,number:pointedRow.index+1,reason:unavailableReason(pointedRow)}):pointedBlocked?t('ph.pointedOutsideTelescope',{label:pointedRow.id,number:pointedRow.index+1,telescope:opticalProfile(telescopeIndex).name}):t('ph.pointedRow',{label:pointedRow.id,number:pointedRow.index+1})}</p>}</section>}
 <p data-testid="photo-telescope-profile">{t('ph.telescopeProfile',{name:bench.name,zero:bench.zeroPoint,seeing:formatNumber(bench.seeingArcsec,{maximumFractionDigits:3,useGrouping:false})})}</p><p>{t('ph.telescopeHelp')}</p>
 <label htmlFor="photo-filter">{t('ph.filter')}</label><select id="photo-filter" value={filter} disabled={!armed||running||busy} onChange={e=>act({type:'filter',filter:e.target.value as PhotometerFilter})}>{PHOTOMETER_FILTERS.map(f=><option key={f} value={f}>{f}</option>)}</select><p className="observatory-note">{t('ph.filterHelp')}</p>
 <section aria-label={t('ph.apertureTitle')}><h3>{t('ph.apertureTitle')}</h3><p data-testid="photo-aperture">{t('ph.apertureReadout',{selector:aperture,diameter:num(geometry.diameterArcMinutes),factor:num(geometry.areaFactor)})}</p><button ref={apertureButton} className="secondary-button" disabled={!armed||running||busy} onClick={()=>{setError('');setApertureText(String(aperture));apertureDialog.current?.showModal();apertureCancel.current?.focus();}}>{t('ph.apertureChange')}</button><ResearchNotes><p>{t('ph.apertureHelp')}</p></ResearchNotes></section>
 <div className="photometer-timing"><label htmlFor="photo-seconds">{t('ph.seriesSeconds')}</label><select id="photo-seconds" value={timing.secondsPerIntegration} disabled={!armed||running||busy} onChange={e=>act({type:'timing',secondsPerIntegration:Number(e.target.value),integrations:timing.integrations})}>{PHOTOMETER_SECONDS.map(seconds=><option key={seconds} value={seconds}>{t('ph.seriesSecondsOption',{seconds:num(seconds)})}</option>)}</select><label htmlFor="photo-repeats">{t('ph.seriesRepeats')}</label><select id="photo-repeats" value={timing.integrations} disabled={!armed||running||busy} onChange={e=>act({type:'timing',secondsPerIntegration:timing.secondsPerIntegration,integrations:Number(e.target.value)})}>{PHOTOMETER_REPEATS.map(n=><option key={n} value={n}>{n}</option>)}</select><p className="observatory-note">{t('ph.seriesHelp')}</p></div>
 {domainLimit&&<p role="status" data-testid="photo-domain-limit" data-reason={domainLimit}>{t(`ph.domainLimit.${domainLimit}`,{telescope:bench.name})}</p>}<p className="photometer-sky" role="status">{t(state?.sky?'ph.skyReady':'ph.needSky',{filter})}</p>{state?.sky&&<p data-testid="photo-sky-origin">{t('ph.skyOrigin',{id:state.sky.id,target:photometerTargetView(state.sky.fieldTargetId).hotlistLabel})} {t('ph.apertureOrigin',{selector:state.sky.apertureSelector??10})} {t('ph.readingTelescope',{telescope:opticalProfile(state.sky.telescopeIndex??0).name})}</p>}<div className="sky-actions"><button className="primary-button" disabled={!armed||running||busy||(kind==='object'&&!state?.sky)||pointingAccess!=='ready'||!!tiledLimit||!!domainLimit} onClick={()=>start()}>{t('ph.start')}</button><button className="secondary-button" disabled={!running||busy} onClick={()=>{stop();setNotice(t(current.current?.timing?'ph.seriesStopped':'ph.stopped'));}}>{t('ph.stop')}</button></div>
 <p role="status" data-testid="photo-phase">{t(running?'ph.running':!armed?'ph.inactive':state?.phase==='stopped'?'ph.stoppedShort':state?.phase==='complete'?'ph.complete':'ph.ready')}</p>
 {state?.timing&&state.work&&<section className="photometer-series" aria-label={t('ph.seriesProgress')}><h3>{t('ph.seriesProgress')}</h3><progress value={state.work.callbacks} max={requiredPhotometerCallbacks(state.timing)} aria-label={t('ph.seriesProgress')}/><p>{t('ph.seriesCallbacks')} <output data-testid="photo-series-callbacks">{state.work.callbacks} / {requiredPhotometerCallbacks(state.timing)}</output></p><p>{t('ph.seriesPeriods')} <output data-testid="photo-series-periods">{state.work.periodCounts.length} / {state.timing.integrations}</output></p><p>{t('ph.seriesTime')} <output data-testid="photo-series-time">{t('ph.seriesSecondsOption',{seconds:num(state.work.callbacks*PHOTOMETER_CALLBACK_MS/1000)})}</output></p><p>{t('ph.seriesCommittedCounts')} <output data-testid="photo-series-counts">{state.work.totalPhotonCount}</output></p>{state.phase!=='complete'&&<p>{t('ph.seriesUnfinished')}</p>}<ol>{state.work.periodCounts.map((count,i)=><li key={i}>{t('ph.seriesPeriodCount',{index:i+1,count})}</li>)}</ol></section>}
 {reading&&<p data-testid="photo-reading-telescope">{t('ph.readingTelescope',{telescope:opticalProfile(reading.telescopeIndex??0).name})}</p>}<div className="photometer-readout"><span>{t('ph.counts')}<output data-testid="photo-counts">{reading?.callback.totalPhotonCount??'—'}</output></span><span>{t('ph.magnitude',{filter})}<output data-testid="photo-magnitude">{reading?.reduction?.magnitude==null?'—':num(reading.reduction.magnitude)}</output></span></div>
 {reading?.integration&&reading.reduction&&<p>{t('ph.seriesSnr')} <output data-testid="photo-series-snr">{num(reading.reduction.nativeDisplaySnr)}</output></p>}
 {reading?.reduction&&reading.reduction.status!=='available'&&<p role="status">{t('ph.unavailable')}</p>}<p>{t('ph.readingHelp')}</p><button ref={entryButton} className="primary-button" disabled={!canRecord} onClick={openEntry}>{t('ph.record')}</button> <button type="button" className="secondary-button" data-testid="photo-record-review" disabled={!canNative} onClick={()=>openReview('menu')}>{menuCaptionText(RL.menu)}</button><p className="observatory-note" data-testid="photo-record-review-help">{t('ph.nativeRecordHelp')}</p>
 <details><summary>{t('ph.raw')}</summary><p>{t('ph.sourceCounts')}: <output data-testid="photo-source">{reading?.callback.sourceCount??'—'}</output> · {t('ph.skyCounts')}: <output data-testid="photo-background">{reading?.callback.skyCount??'—'}</output></p><p>{t('ph.currentSeed')}: <output data-testid="photo-seed">{state?.seed??'—'}</output> · {t('ph.readings')}: {state?.readings.length??0}</p><label htmlFor="photo-seed-input">{t('ph.seed')}</label><input id="photo-seed-input" inputMode="numeric" value={seed} maxLength={80} disabled={armed||busy} onChange={e=>setSeed(e.target.value)}/><button className="secondary-button" disabled={armed||busy||!configurationAvailable||!isPhotometerTelescopeIndex(telescopeIndex)} onClick={()=>{setError('');try{structMeta.current.clear();commit(freshPhotometer());const next=defaultPhotometryDraft(current.current??undefined);latestDrafts.current=next;onDraftsChange(next);setNotice(t('ph.newHelp'));}catch(e){failure(e);}}}>{t('ph.new')}</button><p>{t('ph.newHelp')}</p></details></section></div>
 <div className="observatory-feedback">{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</div>
 <section className="card photometer-notebook"><h2>{t('ph.notebook')}</h2><p>{t('ph.notebookHelp')}</p><div className="photometer-table"><table><thead><tr><th>{t('ph.readingId')}</th><th>{t('ph.targetColumn')}</th><th>{t('ph.band')}</th><th>{t('ph.telescopeColumn')}</th><th>{t('ph.apertureColumn')}</th><th>{t('ph.manualMagnitude')}</th><th>{t('ph.note')}</th></tr></thead><tbody>{state?.entries.map(e=><tr key={e.readingId}><td>{e.readingId}</td><td>{PLEIADES_PHOTOMETER_TARGETS.find(t=>t.catalogId===readingFor(e.readingId)?.targetId)?.hotlistLabel??'—'}</td><td>{readingFor(e.readingId)?.filter}</td><td>{opticalProfile(readingFor(e.readingId)?.telescopeIndex??0).name}</td><td>{readingFor(e.readingId)?.apertureSelector??10}</td><td>{num(e.value)}</td><td>{e.note}</td></tr>)}</tbody></table></div>{!state?.entries.length&&<p>{t('ph.empty')}</p>}
 <section className="photometer-native" aria-labelledby="photo-native-title"><h3 id="photo-native-title">{t('ph.nativeTitle')}</h3><p>{t('ph.nativeHelp',{count:nativeRows.length})}</p><button type="button" className="secondary-button" data-testid="photo-native-results" disabled={!nativeRows.length||busy} onClick={()=>setResultsOpen(true)}>{t('ph.nativeResults')}</button>{resultsOpen&&nativeRows.length>0&&<RecordedResultsWindow data={observationListData(shownList)} testId="photo-native-list" onClose={()=>setResultsOpen(false)}/>}</section>
 <section className="photometer-color" aria-labelledby="photo-color-title"><h3 id="photo-color-title">{t('ph.colorTitle')}</h3><p>{t('ph.colorHelp',{target:target.hotlistLabel})}</p>
 <label htmlFor="photo-b-reading">{t('ph.bReading')}</label><select id="photo-b-reading" value={bReading} disabled={running||busy} onChange={e=>onDraftsChange({...drafts,bReadingId:e.target.value?Number(e.target.value):null})}><option value="">{t('ph.chooseReading')}</option>{entriesForTarget.filter(e=>readingFor(e.readingId)?.filter==='B').map(e=><option key={e.readingId} value={e.readingId}>{t('ph.telescopeReadingOption',{id:e.readingId,value:num(e.value),selector:readingFor(e.readingId)?.apertureSelector??10,telescope:opticalProfile(readingFor(e.readingId)?.telescopeIndex??0).name})}</option>)}</select>
 <label htmlFor="photo-v-reading">{t('ph.vReading')}</label><select id="photo-v-reading" value={vReading} disabled={running||busy} onChange={e=>onDraftsChange({...drafts,vReadingId:e.target.value?Number(e.target.value):null})}><option value="">{t('ph.chooseReading')}</option>{entriesForTarget.filter(e=>readingFor(e.readingId)?.filter==='V').map(e=><option key={e.readingId} value={e.readingId}>{t('ph.telescopeReadingOption',{id:e.readingId,value:num(e.value),selector:readingFor(e.readingId)?.apertureSelector??10,telescope:opticalProfile(readingFor(e.readingId)?.telescopeIndex??0).name})}</option>)}</select>
 <button className="secondary-button" disabled={!bReading||!vReading||running||busy} onClick={()=>act({type:'color',bReadingId:Number(bReading),vReadingId:Number(vReading)})}>{t('ph.calculateColor')}</button>
 {state?.color?<><p>{t('ph.colorSource',{b:state.color.bReadingId,v:state.color.vReadingId,target:photometerTargetView(state.color.targetId).hotlistLabel})} {t('ph.readingTelescope',{telescope:opticalProfile(state.color.telescopeIndex??0).name})}</p><div className="photometer-readout"><span>{t('ph.acquiredColor')}<output data-testid="photo-acquired-bv">{num(state.color.acquired)}</output></span><span>{t('ph.manualColor')}<output data-testid="photo-manual-bv">{num(state.color.transcribed)}</output></span></div></>:<p>{t('ph.colorMissing')}</p>}</section>
 <div className="sky-actions"><button className="secondary-button" disabled={!state||busy} onClick={save}>{t('ph.save')}</button><label className="photometer-upload" htmlFor="photo-file">{t('ph.restore')}<input id="photo-file" type="file" accept=".json,application/json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void restore(file);}}/></label>{localBusy&&<button onClick={()=>{pendingLoad.current=false;loadEpoch.current++;setBusy(false);setNotice(t('ph.cancelledLoad'));}}>{t('ph.cancelLoad')}</button>}</div><p>{t('ph.saveHelp')}</p>
 {onOpenHr&&<div className="photometer-open-hr"><div className="sky-actions"><button className="secondary-button" data-testid="photo-open-hr" disabled={running||busy} onClick={onOpenHr}>{t('ph.openHr')}</button></div><p>{t('ph.openHrHelp')}</p></div>}</section>
 <PleiadesAnalysis state={state} busy={busy} draft={drafts.clusterModulusText??null} onDraft={setClusterText} onConfirm={modulus=>act({type:'clusterFit',modulus})}/>
 <NativeClusterAnalysis state={state} busy={busy} draft={drafts.nativeClusterDraft??null} onDraft={setNativeDraft} onConfirm={p=>act({type:'nativeClusterFit',...p})}/>
 <section className="scope-note"><h2>{t('ph.limitsTitle')}</h2><p>{t('ph.limits')}</p><details><summary>{t('ph.evidence')}</summary><p>{t('ph.evidenceHelp')}</p><p>{t('ph.nativeModal')}</p></details></section>
 <dialog ref={dialog} aria-labelledby="photo-entry-title" onCancel={()=>setDraft(null)} onClose={()=>{setDraft(null);entryButton.current?.focus();}}><h2 id="photo-entry-title">{t('ph.record')}</h2><p>{t('ph.entryHelp')}</p>{draft&&<form onSubmit={e=>{e.preventDefault();setEntryError('');try{if(!draft.value.trim()||!current.current)throw new PhotometerError('entry');commit(photometerEvent(current.current,{type:'record',readingId:draft.readingId,value:Number(draft.value),note:draft.note}));dialog.current?.close();setNotice(t('ph.recorded'));}catch(e){setEntryError(t(e instanceof PhotometerError&&e.code==='limit'?'ph.noteLimit':'ph.entryError'));}}}><label htmlFor="photo-manual">{t('ph.manualV',{filter})}</label><input ref={manualInput} id="photo-manual" type="number" step="any" min="-50" max="100" required value={draft.value} onChange={e=>setDraft({...draft,value:e.target.value})}/><label htmlFor="photo-note">{t('ph.note')}</label><textarea id="photo-note" maxLength={500} value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/>{entryError&&<p role="alert">{entryError}</p>}<div className="sky-actions"><button type="button" className="secondary-button" onClick={()=>dialog.current?.close()}>{t('ph.cancel')}</button><button type="submit" className="primary-button">{t('ph.confirm')}</button></div></form>}</dialog>
 {review&&<ObservationalDataDialog fields={review.fields} testId="photo-obs-data" velocityNote={t('ph.nativeVelocityNote')} onOk={c=>{const r=photometerNativeOk({remarks:c.remarks,typeText:c.typeText});if(!r.ok)return t('ph.nativeSpError');finishReview(r);return true;}} onCancel={()=>finishReview({ok:false})}/>}
 {nativeBox?.kind==='moved'&&<NativeMessage caption={RL.movedCaption} lines={RL.movedText(nativeBox.id)} testId="photo-moved" buttons={[{label:t('ph.skyReplaceYes'),testId:'photo-moved-yes',onClick:()=>{setNativeBox(null);if(!openReview('start'))setNativeBox({kind:'notSaved'});}},{label:t('ph.skyReplaceNo.button'),testId:'photo-moved-no',onClick:()=>setNativeBox({kind:'notSaved'})}]}/>}
 {nativeBox?.kind==='notSaved'&&<NativeMessage caption={RL.notSavedCaption} lines={[RL.notSavedText]} testId="photo-not-saved" buttons={[{label:t('ph.nativeOk'),testId:'photo-not-saved-ok',onClick:()=>{setNativeBox(null);start(true);}}]}/>}
 {nativeBox?.kind==='saved'&&<NativeMessage caption={RL.savedCaption} lines={[RL.savedText]} testId="photo-data-saved" buttons={[{label:t('ph.nativeOk'),testId:'photo-data-saved-ok',onClick:()=>{const then=nativeBox.then;setNativeBox(null);if(then==='start')start(true);}}]}/>}
 <dialog ref={skyDialog} className="photometer-sky-dialog" aria-labelledby="photo-sky-replace-title" data-testid="photo-sky-replace"><h3 id="photo-sky-replace-title">{PHOTOMETER_SKY_REPLACE.caption}</h3><p>{PHOTOMETER_SKY_REPLACE.text}</p><div className="button-row"><button type="button" className="primary-button" data-testid="photo-sky-replace-yes" onClick={()=>{skyDialog.current?.close();if(act({type:'skyConfirm'}))start();}}>{t('ph.skyReplaceYes')}</button><button type="button" className="secondary-button" data-testid="photo-sky-replace-no" onClick={()=>{skyDialog.current?.close();setNotice(t('ph.skyReplaceNo'));}}>{t('ph.skyReplaceNo.button')}</button></div></dialog>
<dialog ref={apertureDialog} aria-labelledby="photo-aperture-title" onCancel={closeAperture}><h2 id="photo-aperture-title">{t('ph.apertureTitle')}</h2><p>{t('ph.apertureHelp')}</p>{error&&<p role="alert">{error}</p>}<div className="photometer-aperture-domain"><label htmlFor="photo-aperture-slider">{t('ph.apertureSlider')}</label><input id="photo-aperture-slider" type="range" min={PHOTOMETER_APERTURE_RANGE.min} max={PHOTOMETER_APERTURE_RANGE.max} step={PHOTOMETER_APERTURE_RANGE.smallChange} value={apertureDraftValid?apertureDraft:PHOTOMETER_APERTURE_RANGE.default} onKeyDown={e=>{if(e.key!=='PageUp'&&e.key!=='PageDown')return;e.preventDefault();const base=apertureDraftValid?apertureDraft:PHOTOMETER_APERTURE_RANGE.default,step=e.key==='PageUp'?PHOTOMETER_APERTURE_RANGE.largeChange:-PHOTOMETER_APERTURE_RANGE.largeChange;setApertureText(String(Math.min(PHOTOMETER_APERTURE_RANGE.max,Math.max(PHOTOMETER_APERTURE_RANGE.min,base+step))));}} onChange={e=>setApertureText(e.target.value)}/>
<label htmlFor="photo-aperture-size">{t('ph.apertureSelector')}</label><input id="photo-aperture-size" type="number" inputMode="numeric" min={PHOTOMETER_APERTURE_RANGE.min} max={PHOTOMETER_APERTURE_RANGE.max} step={1} value={apertureText} aria-describedby="photo-aperture-draft" onChange={e=>setApertureText(e.target.value)}/>
<output id="photo-aperture-draft" data-testid="photo-aperture-draft" aria-live="polite">{apertureDraftValid?t('ph.apertureOption',{selector:apertureDraft,diameter:photometerApertureGeometry(apertureDraft).diameterArcMinutes.toFixed(3)/* ApReadOut Precision 3 */}):t('ph.apertureInvalid',{min:PHOTOMETER_APERTURE_RANGE.min,max:PHOTOMETER_APERTURE_RANGE.max})}</output></div><div className="sky-actions"><button className="secondary-button" onClick={()=>setApertureText(String(PHOTOMETER_APERTURE_RANGE.default))}>{t('ph.apertureDefault')}</button><button className="primary-button" disabled={!apertureDraftValid} onClick={()=>{if(apertureDraftValid&&act({type:'aperture',selector:apertureDraft})){closeAperture();apertureButton.current?.focus();}}}>{t('ph.apertureApply')}</button><button ref={apertureCancel} className="secondary-button" autoFocus onClick={()=>{closeAperture();apertureButton.current?.focus();}}>{t('ph.apertureCancel')}</button></div></dialog></main>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(Photometer);
