import {Fragment,useEffect,useId,useRef,useState} from 'react';
import {vireo,vireoList} from '../i18n/vireo';
import {COMPILED_SESSION_OPTICAL_OPTIONS,OPTICAL_OPTIONS_CAPTIONS as C,OPTIONS_RESET_DEFAULTS,OPTIONS_RESET_LITERALS as R,SESSION_OPTION_CAPTIONS as SC,visibleOptionTabs,type OpticalOptions,type SessionOpticalOptions} from '../core/opticalOptions';
import {menuCaptionText} from '../core/radioControl';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import {EDIT_MODE_CAPTIONS,limitSlewingBox} from '../core/editMode';
import QuestionBox from '../polish/QuestionBox';
import {TEACHER_DEFERRED} from '../core/teacherDeferred';
import {FIELD_INFO_MESSAGES} from './FieldInfoMessages';
import {VIRTUAL_OBSERVATORY_CAPTIONS as VO} from '../core/observatoryMenuLiterals';
import {TEST_MODE_CAPTIONS as TM} from '../core/testMode';
import {COMPILED_PHOTOMETER_TAB_OPTIONS,PHOTOMETER_TAB_OPTION_CAPTIONS as PT,PHOTOMETER_TAB_OPTION_KEYS,type PhotometerTabOptions} from '../core/photometerTabOptions';
import {QSO_LIST_MESSAGES} from './QsoListMessages';
import {RADIO_ACCESS_LITERALS as UL} from '../core/radioAccessOptions';
import {DEMONSTRATION_MODE_CAPTIONS as DM,type PreferencesGateResult} from '../core/instructorMode';
import {COMPILED_RESTRICT_SCOPE_ACCESS,RESTRICT_SCOPE_ACCESS_CAPTIONS as RS} from '../core/scopeAccess';
import {NOT_APPLIED,OPTIONS_FILE_LITERALS as OF,OPTIONS_FILE_MAX_BYTES,WEB_OPTIONS_FILE_NAME,optionsFileErrorBox,readOptionsFile,writeOptionsFile,type OptionsFileLoad,type OptionsFileValues} from '../io/optionsFile';
import {downloadText} from './downloadText';
import {COMPILED_INSTRUMENT_PARAMETERS,INSTRUMENT_PARAMETER_FIELDS,INSTRUMENT_PARAMETER_TEXT_MAX,PARAMETER_ERROR_BOX,applyParameterTexts,instrumentParameterTexts,instrumentParameterLabel,uncertifiedParameterKeys,type InstrumentParameterKey,type InstrumentParameters} from '../core/instrumentParameters';
import {COMPILED_CAMERA_PARAMETERS,applyCameraParameterTexts,cameraDraftsOf,cameraParameterLabel,isCompiledCameraParameters,sameCameraParameters,uncertifiedCameraFields,type CameraDrafts,type CameraParameters} from '../core/cameraParameters';
import CameraParameterEdits from './CameraParameterEdits';
import {t} from '../i18n';
import {lazyMessages} from '../i18n/registry';
import './observatory-dialogs.css';
const M=OBSERVATORY_MESSAGES.options,S=M.session;
const SESSION_KEYS=Object.keys(SC) as (keyof SessionOpticalOptions)[];
// Front ES1: built on first read, after the language is settled (docs/I18N.md: no text at module evaluation).
const SESSION_HINTS:Readonly<Record<keyof SessionOpticalOptions,string>>=lazyMessages(()=>({fastSlewing:S.fastSlewing,fastScopeChange:S.fastScopeChange,computeRedshiftVelocity:S.computeRedshiftVelocity,infraredCamera:S.infraredCamera,monochromeDisplays:S.monochromeDisplays,printInColor:S.printInColor,timeDependentData:S.timeDependentData,showObjectId:S.showObjectId,showObjectMag:S.showObjectMag,allowUserChange:S.allowUserChange}));
const SESSION_NOTES:Partial<Record<keyof SessionOpticalOptions,string>>=lazyMessages(()=>({fastScopeChange:S.fastScopeChangeNote,computeRedshiftVelocity:S.computeRedshiftVelocityNote,printInColor:S.colorNote,timeDependentData:S.timeDependentDataNote,showObjectId:S.showObjectIdNote}));
const testId=(k:string)=>`ob-options-${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}`;
/** Front T4: the Photometer tab's read-only rows that become live check boxes (core/photometerTabOptions.ts). */
const TAB_LIVE_LABELS=new Set(['Detect Sky','Set E(B-V)']),
 /** Front T6: the parameter rows that become edits (core/instrumentParameters.ts), per tab. */
 PARAMETER_LABELS:Readonly<Record<string,ReadonlySet<string>>>={photometer:new Set(INSTRUMENT_PARAMETER_FIELDS.filter(f=>f.tab==='photometer').map(f=>f.caption)),spectrometer:new Set(INSTRUMENT_PARAMETER_FIELDS.filter(f=>f.tab==='spectrometer').map(f=>f.caption))},TAB_TEST_ID:Readonly<Record<keyof PhotometerTabOptions,string>>={setEBmV:'ob-options-set-ebmv',detectSky:'ob-options-detect-sky'};

/** "Optical Simulation Options" (OB-LS-01, WEB-LS-01): Limit Slewing, Edit Mode (Front O, WEB-EM-01), Virtual Observatory
 * (Front O2) and Test Mode (Front T3) are live, and so are Front R3's ported options (`sessionOptions`, page session only, WEB-OPT-R3). The tab parameters
 * are shown read-only with their compiled values; every other control is listed with its compiled state. OK commits the drafts;
 * Cancel discards them. Front T1: the button is VIREO's File › Preferences (Preferences1Click 0x5886ac): with the page's
 * instructor gate closed (0x5886c9) it shows the INSTRUCTOR / USER OPTIONS! box (0x588a84 / 0x588b70, MessageBox flags 0x30)
 * instead of the dialog, plus one web line on instructor mode. */
export default function OpticalOptionsDialog({gate='user-options-box',options,onOptions,disabled,editMode=false,onEditMode,virtualObservatory=false,onVirtualObservatory,testMode=false,onTestMode,demonstrationMode=false,onDemonstrationMode,sessionOptions,onSessionOptions,photometerTabOptions,onPhotometerTabOptions,restrictScopeAccess=COMPILED_RESTRICT_SCOPE_ACCESS,onRestrictScopeAccess,instrumentParameters=COMPILED_INSTRUMENT_PARAMETERS,onInstrumentParameters,cameraParameters=COMPILED_CAMERA_PARAMETERS,onCameraParameters,horizonRadians}:{
 /** Front T1: the page's instructor gate test (core/instructorMode.ts preferencesGate); absent: closed, as VIREO starts. */
 gate?:PreferencesGateResult;
 options:OpticalOptions;onOptions:(o:OpticalOptions)=>void;disabled:boolean;editMode?:boolean;onEditMode?:(on:boolean)=>void;
 /** Front O2 (review 1 M1): VObsBox, shown when `onVirtualObservatory` is given; not persisted. */
 virtualObservatory?:boolean;onVirtualObservatory?:(on:boolean)=>void;
 /** Front T3: TestBox1 (CCD tab, record+0x27c8 → env+0x2e7c), shown when `onTestMode` is given; not persisted. */
 testMode?:boolean;onTestMode?:(on:boolean)=>void;
 /** Front T2: DemoBox (record+0x27c6, stored inverted), kept per browser by the page (WEB-DM-01); shown when
  * `onDemonstrationMode` is given. With every live control given, the dialog also offers Save Updates and Load. */
 demonstrationMode?:boolean;onDemonstrationMode?:(on:boolean)=>void;
 /** Front T4: Set E(B-V) and Detect Sky, live on the Photometer tab when both are given (page session). */
 photometerTabOptions?:PhotometerTabOptions;onPhotometerTabOptions?:(o:PhotometerTabOptions)=>void;
 /** Front T5: RstrctScpBox (record+0x27d1), live when `onRestrictScopeAccess` is given (page session; the exercise menus copy it). */
 restrictScopeAccess?:boolean;onRestrictScopeAccess?:(on:boolean)=>void;
 /** Front T6: the Photometer and Spectrometer tabs' parameter edits, live when `onInstrumentParameters` is given (page session). */
 instrumentParameters?:InstrumentParameters;onInstrumentParameters?:(p:InstrumentParameters)=>void;
 /** Front T7: the CCD and IR tabs' camera records, live when `onCameraParameters` is given (page session). */
 cameraParameters?:CameraParameters;onCameraParameters?:(p:CameraParameters)=>void;
 /** Front R3: shown when both are given; not persisted. */
 sessionOptions?:SessionOpticalOptions;onSessionOptions?:(o:SessionOpticalOptions)=>void;
 /** R3 review L2: the selected site's horizon (radians). */horizonRadians?:number}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),[draft,setDraft]=useState<OpticalOptions|null>(null),[resetAsked,setResetAsked]=useState(false),[editDraft,setEditDraft]=useState(editMode),[vobsDraft,setVobsDraft]=useState(virtualObservatory),[testDraft,setTestDraft]=useState(testMode),[sessionDraft,setSessionDraft]=useState(sessionOptions),[tabDraft,setTabDraft]=useState(photometerTabOptions);
 const [demoDraft,setDemoDraft]=useState(demonstrationMode),[scopeDraft,setScopeDraft]=useState(restrictScopeAccess),[saveAsk,setSaveAsk]=useState<'edit'|'vo'|null>(null),[loadState,setLoadState]=useState<Readonly<{name:string;result:OptionsFileLoad;message?:string}>|null>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;if(draft&&!el.open){el.showModal();el.querySelector<HTMLInputElement>('input:not([disabled])')?.focus();}else if(!draft&&el.open)el.close();},[draft!==null]);
 const [refused,setRefused]=useState(false),opener=useRef<HTMLButtonElement>(null),loadToken=useRef(0);
 // Front T6: the edits' texts (FormActivate 0x5a56e0 fills them) and the OK conversion box (0x5a696a handler).
 const [paramDraft,setParamDraft]=useState(()=>instrumentParameterTexts(instrumentParameters)),[paramError,setParamError]=useState<InstrumentParameterKey|'camera'|null>(null),okButton=useRef<HTMLButtonElement>(null);
 const paramsLive=!!onInstrumentParameters;
 // Front T7: the CCD / IR tabs' drafts and the records FormActivate last read (the IR cooling group's enabled state, 0x5a5f72).
 const [camDraft,setCamDraft]=useState<CameraDrafts>(()=>cameraDraftsOf(cameraParameters)),[camActivated,setCamActivated]=useState<CameraParameters>(cameraParameters);
 const cameraLive=!!onCameraParameters;
 // Review 1 N5: every open and close of the dialog makes an in-flight Load stale.
 useEffect(()=>{loadToken.current++;},[draft!==null]);
 useEffect(()=>{if(disabled){setDraft(null);setResetAsked(false);setRefused(false);setSaveAsk(null);setParamError(null);}},[disabled]);
 // Front R5: with Edit Mode live, SlewBox follows it (FormActivate 0x5a5985, EditModeBoxClick 0x5a6edc); without it, as before.
 const slew=draft?(onEditMode?limitSlewingBox(editDraft,draft.limitSlewing):Object.freeze({enabled:true,checked:draft.limitSlewing})):null;
 const editModeClick=(on:boolean)=>{setEditDraft(on);if(on)setDraft(d=>d&&{limitSlewing:false});};
 /** ResetBtnClick Yes: every live draft to its compiled value (0x5a21d0); OK still commits and Cancel still discards. */
 const reset=(yes:boolean)=>{setResetAsked(false);if(!yes)return;setDraft(OPTIONS_RESET_DEFAULTS.options);setEditDraft(OPTIONS_RESET_DEFAULTS.editMode);setVobsDraft(OPTIONS_RESET_DEFAULTS.virtualObservatory);setTestDraft(OPTIONS_RESET_DEFAULTS.testMode);setDemoDraft(false);setScopeDraft(COMPILED_RESTRICT_SCOPE_ACCESS);setLoadState(null);if(sessionDraft)setSessionDraft(COMPILED_SESSION_OPTICAL_OPTIONS);if(tabDraft)setTabDraft(COMPILED_PHOTOMETER_TAB_OPTIONS);setParamDraft(instrumentParameterTexts(COMPILED_INSTRUMENT_PARAMETERS));setCamDraft(cameraDraftsOf(COMPILED_CAMERA_PARAMETERS));setCamActivated(COMPILED_CAMERA_PARAMETERS);};
 const live=sessionDraft&&onSessionOptions?sessionDraft:null,tabLive=tabDraft&&onPhotometerTabOptions?tabDraft:null;
 const ported=new Set<string>(live?SESSION_KEYS.map(k=>SC[k]):[]);
 // Front ES2: compared in VIREO's English, shown through vireo().
 const otherOptions=C.otherOptions.filter(o=>!(onEditMode&&o===EDIT_MODE_CAPTIONS.box)&&!(onVirtualObservatory&&o===VO.box)&&!(onTestMode&&o===TM.box)&&!(onDemonstrationMode&&o===DM.box)&&!(onRestrictScopeAccess&&o===RS.box)&&!ported.has(o));
 const parameterFields=(tab:string)=>INSTRUMENT_PARAMETER_FIELDS.filter(f=>f.tab===tab);
 const teacherDeferred=TEACHER_DEFERRED.map(d=>({key:d.key,reason:d.reason,caption:vireo(menuCaptionText(d.caption))}));
 /** OKBtnClick's parameter block (0x5a62da..0x5a6968): the seven edits in VIREO's order; a conversion error shows the box and
  * keeps the dialog open with nothing committed (Cancel would restore the snapshot, 0x5a6d04). null: no live edits. */
 const parsedParameters=():InstrumentParameters|null|false=>{if(!paramsLive)return null;const r=applyParameterTexts(paramDraft);if(!r.ok){setParamError(r.key);return false;}return r.values;};
 /** Front T7: the CCD and IR blocks, after SpTimer in the same try (0x5a6522..0x5a695d); the same box on the first failure. */
 const parsedCamera=():CameraParameters|null|false=>{if(!cameraLive)return null;const r=applyCameraParameterTexts(camDraft);if(!r.ok){setParamError('camera');return false;}return r.values;};
 /** OKBtnClick: commits every live draft (shared by OK and Save Updates). */
 const commit=()=>{if(!draft)return;const params=parsedParameters();if(params===false)return;const camera=parsedCamera();if(camera===false)return;if(params&&onInstrumentParameters&&INSTRUMENT_PARAMETER_FIELDS.some(f=>!Object.is(params[f.key],instrumentParameters[f.key])))onInstrumentParameters(params);if(camera&&onCameraParameters&&!sameCameraParameters(camera,cameraParameters))onCameraParameters(camera);onOptions(draft);if(onEditMode&&editDraft!==editMode)onEditMode(editDraft);if(onVirtualObservatory&&vobsDraft!==virtualObservatory)onVirtualObservatory(vobsDraft);if(onTestMode&&testDraft!==testMode)onTestMode(testDraft);if(onDemonstrationMode&&demoDraft!==demonstrationMode)onDemonstrationMode(demoDraft);if(onRestrictScopeAccess&&scopeDraft!==restrictScopeAccess)onRestrictScopeAccess(scopeDraft);if(live&&onSessionOptions&&SESSION_KEYS.some(k=>live[k]!==sessionOptions?.[k]))onSessionOptions(Object.freeze({...live}));if(tabLive&&onPhotometerTabOptions&&PHOTOMETER_TAB_OPTION_KEYS.some(k=>tabLive[k]!==photometerTabOptions?.[k]))onPhotometerTabOptions(Object.freeze({...tabLive}));setDraft(null);};
 // Front T2: the options file needs every live control (the page's full dialog).
 const fileable=!!(live&&tabLive&&onEditMode&&onVirtualObservatory&&onTestMode&&onDemonstrationMode&&onRestrictScopeAccess&&paramsLive&&cameraLive);
 const fileValues=(parameters:InstrumentParameters,cameraParameters:CameraParameters):OptionsFileValues|null=>draft&&live&&tabLive?Object.freeze({demonstrationMode:demoDraft,testMode:testDraft,limitSlewing:slew!.checked,editMode:editDraft,virtualObservatory:vobsDraft,restrictScopeAccess:scopeDraft,...live,...tabLive,parameters,cameraParameters}):null;
 /** Save Updates: OK, then the writer 0x5a4644 (its Edit Mode box 0x14, else its Virtual Observatory box 0x41), then the file. */
 const finishSave=(save:boolean)=>{setSaveAsk(null);const params=parsedParameters();if(params===false)return;const camera=parsedCamera();if(camera===false)return;const values=fileValues(params??instrumentParameters,camera??cameraParameters);commit();if(save&&values)downloadText(new TextEncoder().encode(writeOptionsFile(values)),WEB_OPTIONS_FILE_NAME);};
 // Front T6: Save Updates runs OK first (0x58ed74 after OKBtnClick), so a conversion error stops it before its questions.
 const saveClick=()=>{if(paramsLive&&!applyParameterTexts(paramDraft).ok){parsedParameters();return;}if(cameraLive&&!applyCameraParameterTexts(camDraft).ok){parsedCamera();return;}if(editDraft)setSaveAsk('edit');else if(vobsDraft)setSaveAsk('vo');else finishSave(true);};
 /** Load: VIREO reads VEO_OPTS.INI only at start-up (0x5a1a08); here the file fills the drafts, as Reset does, and OK applies. */
 const load=async(file:File)=>{
  const token=++loadToken.current;
  let result:OptionsFileLoad;
  try{result=file.size>OPTIONS_FILE_MAX_BYTES?Object.freeze({kind:'invalid',reason:'too-large'}):readOptionsFile(new Uint8Array(await file.arrayBuffer()));}
  catch{result=Object.freeze({kind:'invalid',reason:'not-options-file'});}
  if(token!==loadToken.current)return;// review 1 N5: a later read, or the dialog closed or reopened meanwhile
  const name=file.name.slice(0,120);
  if(result.kind!=='loaded'){setLoadState({name,result,message:result.kind==='invalid'&&(result.reason==='not-options-file'||result.reason==='too-large')?t(`optionsFile.invalid.${result.reason}`):undefined});return;}
  const v=result.values;
  setDraft({limitSlewing:v.limitSlewing&&!(onEditMode&&v.editMode)});// FormActivate 0x5a5985: SlewBox off under Edit Mode
  setEditDraft(v.editMode);setVobsDraft(v.virtualObservatory);setTestDraft(v.testMode);setDemoDraft(v.demonstrationMode);setScopeDraft(v.restrictScopeAccess);
  setSessionDraft(Object.freeze(Object.fromEntries(SESSION_KEYS.map(k=>[k,v[k]]))) as SessionOpticalOptions);
  if(tabDraft)setTabDraft(Object.freeze({setEBmV:v.setEBmV,detectSky:v.detectSky}));
  setParamDraft(instrumentParameterTexts(v.parameters));
  setCamDraft(cameraDraftsOf(v.cameraParameters));setCamActivated(v.cameraParameters);// FormActivate reloads the tabs, as after Reset
  setLoadState({name,result});
 };
 const fileError=loadState&&loadState.result.kind!=='loaded'?optionsFileErrorBox(loadState.result,loadState.name,loadState.message):null;
 return <>
  <button ref={opener} type="button" className="secondary-button" disabled={disabled} data-testid="ob-options" data-gate={gate} onClick={()=>{if(gate!=='options'){setRefused(true);return;}setDraft(onEditMode&&editMode?{limitSlewing:false}:options);setEditDraft(editMode);setVobsDraft(virtualObservatory);setTestDraft(testMode);setDemoDraft(demonstrationMode);setScopeDraft(restrictScopeAccess);setLoadState(null);setSaveAsk(null);setSessionDraft(sessionOptions);setTabDraft(photometerTabOptions);setParamDraft(instrumentParameterTexts(instrumentParameters));setParamError(null);setCamDraft(cameraDraftsOf(cameraParameters));setCamActivated(cameraParameters);}}>{M.open}</button>
  <dialog ref={ref} className="ob-dialog" aria-labelledby={`${id}-title`} data-testid="ob-options-dialog" onCancel={e=>{e.preventDefault();if(!resetAsked&&!saveAsk&&!paramError)setDraft(null);}}>
   {draft&&<>
    <h2 id={`${id}-title`} className="ob-native">{vireo(C.form)}</h2>
    <p className="ob-note ob-native">{vireo(menuCaptionText(C.general))}</p>
    <fieldset className="ob-group"><legend className="ob-native">{vireo(menuCaptionText(C.options))}</legend>
     <label className="ob-check" title={vireo(C.limitSlewingHint)}><input type="checkbox" data-testid="ob-options-limit" checked={slew!.checked} disabled={!slew!.enabled} onChange={e=>setDraft({limitSlewing:e.target.checked})}/>{vireo(C.limitSlewing)}</label>
     <small className="ob-note">{vireo(C.limitSlewingHint)}</small>{!slew!.enabled&&<small className="ob-note" data-testid="ob-options-limit-edit-mode">{M.limitSlewingEditMode}</small>}
     {onEditMode&&<><label className="ob-check" title={vireo(EDIT_MODE_CAPTIONS.hint)}><input type="checkbox" data-testid="ob-options-edit-mode" checked={editDraft} onChange={e=>editModeClick(e.target.checked)}/>{FIELD_INFO_MESSAGES.editModeLabel}</label>
      <small className="ob-note">{vireo(EDIT_MODE_CAPTIONS.hint)}</small><small className="ob-note" data-testid="ob-options-edit-mode-note">{FIELD_INFO_MESSAGES.editModeAdaptation}</small></>}
     {onVirtualObservatory&&<><label className="ob-check" title={vireo(VO.hint)}><input type="checkbox" data-testid="ob-options-virtual-observatory" checked={vobsDraft} onChange={e=>setVobsDraft(e.target.checked)}/>{QSO_LIST_MESSAGES.virtualObservatoryLabel}</label>
      <small className="ob-note">{vireo(VO.hint)}</small><small className="ob-note" data-testid="ob-options-virtual-observatory-note">{QSO_LIST_MESSAGES.virtualObservatoryAdaptation}</small></>}
     {onTestMode&&<><label className="ob-check" title={vireo(TM.hint)}><input type="checkbox" data-testid="ob-options-test-mode" checked={testDraft} onChange={e=>setTestDraft(e.target.checked)}/>{vireo(TM.box)}</label>
      <small className="ob-note">{vireo(TM.hint)}</small><small className="ob-note" data-testid="ob-options-test-mode-note">{t('testMode.adaptation')}</small></>}
     {onDemonstrationMode&&<><label className="ob-check" title={vireo(DM.hint)}><input type="checkbox" data-testid="ob-options-demonstration-mode" checked={demoDraft} onChange={e=>setDemoDraft(e.target.checked)}/>{vireo(DM.box)}</label>
      <small className="ob-note">{vireo(DM.hint)}</small><small className="ob-note" data-testid="ob-options-demonstration-mode-note">{t('demonstrationMode.adaptation')}</small></>}
     {onRestrictScopeAccess&&<><label className="ob-check" title={vireo(RS.hint)}><input type="checkbox" data-testid="ob-options-restrict-scope-access" checked={scopeDraft} onChange={e=>setScopeDraft(e.target.checked)}/>{vireo(RS.box)}</label>
      <small className="ob-note">{vireo(RS.hint)}</small><small className="ob-note" data-testid="ob-options-restrict-scope-access-note">{t('scopeAccess.optionNote')}</small></>}
     {live&&<>{SESSION_KEYS.map(k=><Fragment key={k}><label className="ob-check" title={SESSION_HINTS[k]}><input type="checkbox" data-testid={testId(k)} checked={live[k]} onChange={e=>setSessionDraft({...live,[k]:e.target.checked})}/>{vireo(SC[k])}</label>
      <small className="ob-note">{SESSION_HINTS[k]}</small>{SESSION_NOTES[k]&&<small className="ob-note">{SESSION_NOTES[k]}</small>}</Fragment>)}
      <small className="ob-note" data-testid="ob-options-session-note">{S.sessionNote}</small></>}
     <p className="ob-note">{M.othersHeading}</p>
     <ul className="ob-option-list" data-testid="ob-options-others">{otherOptions.map(o=><li key={o}><span className="ob-native">{vireo(o)}</span>{o==='Fast Slewing'?<small> — {M.fastSlewing}</small>:null}</li>)}</ul>
     {live&&<small className="ob-note" data-testid="ob-options-not-ported">{S.notPorted}</small>}
    </fieldset>
    {live?<section className="ob-group" data-testid="ob-options-tabs" aria-label={S.tabsHeading}><p className="ob-note">{S.tabsHeading}</p>
     {visibleOptionTabs(live.infraredCamera,horizonRadians).map(tab=><fieldset key={tab.tab} className="ob-group" data-testid={`ob-options-tab-${tab.tab}`}><legend className="ob-native">{vireo(menuCaptionText(tab.caption))}</legend>
      {paramsLive&&PARAMETER_LABELS[tab.tab]&&<div className="ob-values ob-parameter-edits" data-testid={`ob-options-parameters-${tab.tab}`}>{parameterFields(tab.tab).map(f=><label key={f.key} className="ob-parameter" title={vireo(f.hint)}><span className="ob-native">{vireo(f.caption)}</span>
       <input type="text" inputMode="decimal" spellCheck={false} maxLength={INSTRUMENT_PARAMETER_TEXT_MAX} data-testid={`ob-options-param-${f.key}`} value={paramDraft[f.key]} aria-describedby={`${id}-param-note-${tab.tab}`} onChange={e=>setParamDraft(d=>({...d,[f.key]:e.target.value}))}/><small className="ob-note">{vireo(f.hint)}</small></label>)}</div>}
      {cameraLive&&(tab.tab==='ccd'||tab.tab==='ir')?<><CameraParameterEdits kind={tab.tab} drafts={camDraft} activated={camActivated} onDrafts={setCamDraft} noteId={`${id}-camera-note-${tab.tab}`}/>
       <small className="ob-note" id={`${id}-camera-note-${tab.tab}`} data-testid={`ob-options-camera-${tab.tab}-note`}>{t(tab.tab==='ccd'?'cameraParameters.ccdNote':'cameraParameters.irNote')}</small></>
      :<dl className="ob-values">{tab.values.filter(v=>!(tabLive&&tab.tab==='photometer'&&TAB_LIVE_LABELS.has(v.label))&&!(paramsLive&&PARAMETER_LABELS[tab.tab]?.has(v.label))).map(v=><div key={v.label}><dt className="ob-native">{vireo(v.label)}</dt><dd>{vireo(v.text)}</dd></div>)}</dl>}
      {paramsLive&&PARAMETER_LABELS[tab.tab]&&<small className="ob-note" id={`${id}-param-note-${tab.tab}`} data-testid={`ob-options-parameters-${tab.tab}-note`}>{t(tab.tab==='photometer'?'instrumentParameters.photometerNote':'instrumentParameters.spectrometerNote')}</small>}
      {tabLive&&tab.tab==='photometer'&&PHOTOMETER_TAB_OPTION_KEYS.map(k=><Fragment key={k}><label className="ob-check" title={vireo(PT[k].hint)}><input type="checkbox" data-testid={TAB_TEST_ID[k]} checked={tabLive[k]} onChange={e=>setTabDraft({...tabLive,[k]:e.target.checked})}/><span className="ob-native">{vireo(PT[k].box)}</span></label>
       <small className="ob-note">{vireo(PT[k].hint)}</small><small className="ob-note" data-testid={TAB_TEST_ID[k]+'-note'}>{t(`photometerTab.${k}Note`)}</small></Fragment>)}</fieldset>)}
     <small className="ob-note" data-testid="ob-options-tabs-note">{S.tabsNote}</small></section>
    :<><fieldset className="ob-group" disabled><legend className="ob-native">{vireo(menuCaptionText(C.parameters))}</legend>{vireoList(C.parameterLabels).map(l=><span key={l} className="ob-check">{l} <small>— {M.unavailable}</small></span>)}</fieldset>
     <p className="ob-note">{vireoList(C.otherTabs.map(menuCaptionText)).join(', ')}: {M.unavailable}. {M.help}</p></>}
    {fileable&&<section className="ob-group" data-testid="ob-options-file" aria-labelledby={`${id}-file`}><p className="ob-note" id={`${id}-file`}><strong>{t('optionsFile.heading')}</strong></p>
     <small className="ob-note" data-testid="ob-options-file-note">{t('optionsFile.note')}</small>
     <div className="ob-actions"><button type="button" className="secondary-button" data-testid="ob-options-save" onClick={saveClick}>{vireo(menuCaptionText(OF.saveMenu))}</button>
      <label className="secondary-button project-upload">{t('optionsFile.load')}<input type="file" data-testid="ob-options-load" accept=".json,.ini,application/json" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void load(f);}}/></label></div>
     {loadState?.result.kind==='loaded'&&<div role="status" data-testid="ob-options-loaded" data-source={loadState.result.source}><p className="ob-note">{t('optionsFile.loaded',{name:loadState.name,source:t(loadState.result.source==='web'?'optionsFile.source.web':'optionsFile.source.native')})}</p>
      {loadState.result.administratorCleared&&<p className="ob-note" data-testid="ob-options-administrator-cleared">{t('optionsFile.administratorCleared')}</p>}
      {loadState.result.notApplied.length>0&&<><p className="ob-note">{t('optionsFile.notAppliedHeading')}</p>
       <ul className="ob-option-list" data-testid="ob-options-not-applied">{loadState.result.notApplied.map(k=><li key={k} data-key={k}><span className="ob-native">{vireo(NOT_APPLIED[k].caption)}</span><small> — {t(`optionsFile.reason.${NOT_APPLIED[k].reason}`)}</small></li>)}</ul>
       <p className="ob-note" data-testid="ob-options-resave-warning">{t('optionsFile.resaveWarning')}</p></>}
      {loadState.result.fastSlewingRate!==null&&<p className="ob-note" data-testid="ob-options-fast-slewing-rate">{t('optionsFile.fastSlewingRate',{rate:loadState.result.fastSlewingRate})}</p>}</div>}
     {fileError&&<div role="alert" className="ob-group" data-testid="ob-options-file-error"><p className="ob-native"><strong data-testid="ob-options-file-error-caption">{fileError.caption}</strong></p>
      <p className="ob-native ob-pre-line" data-testid="ob-options-file-error-text">{fileError.text}</p>{loadState?.result.kind==='invalid'&&loadState.result.reason==='read-beyond-eof'&&<small className="ob-note" data-testid="ob-options-file-error-inferred">{t('optionsFile.readBeyondEofNote')} </small>}<small className="ob-note">{t('optionsFile.errorNote')}</small></div>}
    </section>}
    {paramsLive&&(()=>{const r=applyParameterTexts(paramDraft),keys=r.ok?uncertifiedParameterKeys(r.values):[];return keys.length>0&&<p className="ob-note" role="status" data-testid="ob-options-parameters-uncertified">{t('instrumentParameters.draftUncertified',{fields:keys.map(instrumentParameterLabel).join(', ')})}</p>;})()}
    {cameraLive&&(()=>{const r=applyCameraParameterTexts(camDraft);if(!r.ok||isCompiledCameraParameters(r.values))return null;return <p className="ob-note" role="status" data-testid="ob-options-camera-uncertified">{t('cameraParameters.draftUncertified',{fields:uncertifiedCameraFields(r.values).map(cameraParameterLabel).join(', ')})}</p>;})()}
    <div className="ob-actions"><button type="button" ref={okButton} className="primary-button" data-testid="ob-options-ok" onClick={commit}>{vireo(menuCaptionText(C.ok))}</button><button type="button" className="secondary-button" onClick={()=>setDraft(null)}>{vireo(menuCaptionText(C.cancel))}</button>
     <button type="button" className="secondary-button" title={vireo(R.hint)} data-testid="ob-options-reset" onClick={()=>setResetAsked(true)}>{vireo(menuCaptionText(R.caption))}</button></div>
    <small className="ob-note" data-testid="ob-options-reset-note">{M.resetNote}</small>
    <p className="ob-note">{M.teacherDeferred}</p>
    <ul className="ob-option-list" data-testid="ob-options-teacher-deferred">{teacherDeferred.map(d=><li key={d.key} data-reason={d.reason}><span className="ob-native">{d.caption}</span></li>)}</ul>
    {paramError&&<ParameterErrorBox onClose={()=>{setParamError(null);okButton.current?.focus();}}/>}
    {resetAsked&&<QuestionBox caption={vireo(R.questionCaption)} text={vireo(R.questionText)} testId="ob-options-reset-box" onAnswer={reset}/>}
    {saveAsk==='edit'&&<QuestionBox caption={vireo(OF.saveCaption)} text={vireo(OF.editModeSet)} testId="ob-options-save-edit-mode" preLine onAnswer={finishSave}/>}
    {saveAsk==='vo'&&<QuestionBox caption={vireo(OF.saveCaption)} text={vireo(OF.virtualObservatory)} testId="ob-options-save-vo" preLine labels={{yes:t('optionsFile.ok'),no:t('optionsFile.cancel')}} onAnswer={finishSave}/>}
   </>}
  </dialog>
  {refused&&<UserOptionsBox onClose={()=>{setRefused(false);opener.current?.focus();}}/>}
 </>;
}

/** Front T6: OKBtnClick's conversion handler (0x5a697b..0x5a69b5): Application.MessageBox(0x5a6bac, 0x5a6bf0, MB_ICONHAND), then
 * ModalResult := 0. VIREO sets no focus (it stays on OK); the web returns it to OK when the box closes. */
function ParameterErrorBox({onClose}:{onClose:()=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null);
 const close=()=>{ref.current?.close();onClose();};
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();el.querySelector<HTMLButtonElement>('button')?.focus();}},[]);
 return <dialog ref={ref} className="ob-dialog ob-box" role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} data-testid="ob-options-parameter-error" onCancel={e=>{e.preventDefault();close();}}>
  <h2 id={`${id}-title`} className="ob-native">{vireo(PARAMETER_ERROR_BOX.caption)}</h2>
  <p id={`${id}-body`} className="ob-native" style={{whiteSpace:'pre-line'}} data-testid="ob-options-parameter-error-text">{vireo(PARAMETER_ERROR_BOX.text)}</p>
  <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-options-parameter-error-ok" onClick={close}>{t('instrumentParameters.errorOk')}</button></div>
 </dialog>;
}

/** Preferences1Click with the gate closed (0x5889a6..0x5889cb): the recovered body 0x588a84 (passed through 0x405ec8 and the
 * helper 0x486ae0 before the box, as in the radio port) with caption 0x588b70, OK only; one web line follows. The native
 * dialog is closed before it unmounts, so focus goes back to the opener (review 1 M1). */
function UserOptionsBox({onClose}:{onClose:()=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null);
 const close=()=>{ref.current?.close();onClose();};
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();el.querySelector<HTMLButtonElement>('button')?.focus();}},[]);
 return <dialog ref={ref} className="ob-dialog ob-box ob-user-options" role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} data-testid="ob-user-options" onCancel={e=>{e.preventDefault();close();}}>
  <h2 id={`${id}-title`} className="ob-native" data-testid="ob-user-options-title">{vireo(UL.userOptionsCaption)}</h2>
  <p id={`${id}-body`} className="ob-native" style={{whiteSpace:'pre-line',overflowWrap:'anywhere'}} data-testid="ob-user-options-text">{vireo(UL.instructorText)}</p>
  <p className="ob-note" data-testid="ob-user-options-note">{t('instructorMode.optionsClosed')}</p>
  <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-user-options-ok" onClick={close}>{t('instructorMode.optionsClosedOk')}</button></div>
 </dialog>;
}
