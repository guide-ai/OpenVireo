import type {MotionPreferences} from './core/telescopeMotion';
import type {ClusterSelectionWorkspace} from './core/clusterSelection';
import type {ClusterComparisonWorkspace} from './core/clusterComparison';
import type {ClusterDatabaseWorkspace} from './core/clusterDatabase';
import {INITIAL_OPTICAL,type OpticalWorkspace} from './core/opticalTelescope';
import {defaultVelocityDraft,type VelocityDraft,type SharedEditingWorkspace,type EditingWorkspace} from './core/editingWorkspace';
import type {ObservingWorkspace} from './core/observingWorkspace';
import type {PhotometerState} from './core/photometer';
import {displayError,errorFor} from './i18n/errors';
import {classificationImportFromDecoded} from './io/classificationImports';
import {classificationCoverage,type ClassificationImport} from './core/classificationImport';
import {loadClassificationSources} from './io/classificationSources';
import {classificationWorkspaceUsed,readClassificationWorkspace,EMPTY_CLASSIFICATION_WORKSPACE,type ClassificationWorkspace} from './core/classification';
import type {StarObservation} from './io/starObservation';
import {hubbleLabProgress,type HubbleLabProgress} from './core/hubbleLab';
import {galaxyStateDefinition} from './core/galaxyExposure';
import {EXTENDED_MAX_ACQUISITION_ARCHIVE,MAX_ARCHIVE_EVENTS} from './core/acquisitionArchive';
import { t, formatNumber, fixed, scientific } from './i18n';
import {acquisitionObjectId,acquisitionReference,acquiredSpectrumBytes,type AcquisitionObservation} from './io/acquisitionObservation';
import VelocityAnalysis from './VelocityAnalysis';
import HubbleAnalysis from './HubbleAnalysis';
import OwnObservationResults from './OwnObservationResults';
import { POLISH_MESSAGES as PM } from './polish/PolishMessages';
import {EMPTY_HUBBLE,type HubbleWorkspace} from './core/hubbleAnalysis';
import {memo,useEffect,useImperativeHandle,useMemo,useRef,useState,type ChangeEvent,type Ref} from 'react';
import { changeFactor, configureStep, createMeasurement, currentZ, INITIAL_CONTROL, MAX_FILE_BYTES, measurementCsv, moveControl, parseLines, parseSpectrum, rebase, shiftedWavelength, type Measurement, type Sample } from './core/spectrum';
import { readImportedSpectrum } from './io/spectrumFiles';
import { AnalysisSessionError, MAX_SESSION_ROWS, readInvestigationSession, serializeAnalysisSession, type SessionObservation, type ObservatorySession } from './io/analysisSession';
import {LssSessionError,type LssInvestigation} from './io/lssInvestigation';
import {ObjectXSessionError,type ObjectXInvestigation} from './io/objectXInvestigation';
import {OBJECT_X_SESSION_EN} from './objectx/ObjectXMessages';
const OBJECT_X_SAVE_ERROR=OBJECT_X_SESSION_EN.saveError;
import { formatFloat32, formatZ, spectrumPoints } from './view/spectrum';
import type { RadioInvestigation, RadioRestoreBlock, RadioSaveBlock } from './core/radioInvestigation';
import type { RadioInvestigationRecord } from './io/radioInvestigation';
import galaxyText from '../data/original/GLXYLNS.LST?raw';
import balmerText from '../data/original/BALMER.LST?raw';
import qsoText from '../data/original/AGN_QSO.LST?raw';
import templateText from '../data/original/GLXYTMPL.SP?raw';
import CleaHelp from './clusters/CleaHelp';
import {HELP_FILES} from './help/helpFiles';

const references = { galaxy: { title: t('spectrum.galaxy'), source: 'GLXYLNS.LST', lines: parseLines(galaxyText) }, balmer: { title: t('spectrum.balmer'), source: 'BALMER.LST', lines: parseLines(balmerText) }, qso: { title: t('spectrum.qso'), source: 'AGN_QSO.LST', lines: parseLines(qsoText) } };
const template = parseSpectrum(templateText);
type Imported = SessionObservation;
function Chart({ observation, z, reference, wide, baseline }: { observation: Imported | null; z: number; reference: keyof typeof references | null; wide: boolean; baseline: readonly Sample[] }) {
  const galaxy=observation?.kind==='catalog-galaxy-acquisition';
  const min = wide ? 3650 : galaxy?4000:3700, max = wide ? 7000 : galaxy?5000:4700;
  const observedRange=useMemo(()=>({min:Math.min(0,...(observation?.samples.map(p=>p.intensity)??[])),max:1}),[observation]);
  const originalCurve = useMemo(() => spectrumPoints(baseline, min, max, {min: Math.min(0, ...baseline.map(p=>p.intensity)), max: Math.max(1, ...baseline.map(p=>p.intensity))}), [baseline, min, max]);
  const observedCurve = useMemo(() => observation ? spectrumPoints(observation.samples, min, max, observedRange) : '', [observation, min, max, observedRange]);
  return <svg className="spectrum" viewBox="0 0 960 360" role="img" aria-label={t(observation?.kind==='catalog-star-acquisition'?'continuity.chartDescription':'spectrum.chartDescription')}>
    <defs><clipPath id="plot-clip"><rect x="60" y="45" width="860" height="265" /></clipPath></defs>
    {[0, .25, .5, .75, 1].map(v => <g key={v}><line x1="60" x2="920" y1={306 - v * 250} y2={306 - v * 250} className="grid"/><text x="45" y={311 - v * 250} textAnchor="end">{fixed(observedRange.min+v*(observedRange.max-observedRange.min),2)}</text></g>)}
    {Array.from({ length: 6 }, (_, i) => min + (max - min) * i / 5).map(v => <g key={v}><line x1={60 + (v - min) / (max - min) * 860} x2={60 + (v - min) / (max - min) * 860} y1="45" y2="306" className="grid"/><text x={60 + (v - min) / (max - min) * 860} y="330" textAnchor="middle">{fixed(v,0)}</text></g>)}
    <g clipPath="url(#plot-clip)"><polyline points={originalCurve} className="reference-curve"/>{observation && <polyline points={observedCurve} className="observed-curve"/>}
    {(reference ? references[reference].lines : []).map((line, index) => { const x = 60 + (shiftedWavelength(line.wavelength, z) - min) / (max - min) * 860; return <g key={index}><line x1={x} x2={x} y1="48" y2="306" className="marker"/><text x={x + 5} y={66 + index % 2 * 23} className="marker-label">{line.label.split(' (')[0]}</text><circle cx={x} cy="52" r="3" className="marker-dot"/></g>; })}</g>
    <text x="16" y="175" transform="rotate(-90 16 175)" textAnchor="middle" className="axis-label">{t('spectrum.displayLevel')}</text><text x="490" y="355" textAnchor="middle" className="axis-label">{t('spectrum.wavelength')}</text>
  </svg>;
}

export type AnalysisController=Readonly<{acceptAcquisition:(observation:AcquisitionObservation)=>void;acceptImported:(source:ClassificationImport)=>void;openHubble:()=>void;saveSession:()=>Promise<boolean>;cancelSessionOperation:()=>void;restoreSessionFile:(file:File)=>Promise<boolean>}>;
/** Phase 1 item 1.5: the Radio/Pulsar part of a Save ('none': nothing to keep, the file stays v≤22). */
export type RadioPrepare=Readonly<{kind:'none'}|{kind:'blocked';reason:RadioSaveBlock}|{kind:'ready';snapshot:RadioInvestigation;onSaved:()=>void}>;
function SpectrumInstrument({onPrepareObjectX,onRestoreObjectX,onPrepareLss,onRestoreLss,onPrepareRadio,onCheckRadioRestore,onRestoreRadio,onPrepareMotion,onRestoreMotion,onPrepareObservatory,onRestoreObservatory,onPrepareClusterSelection,onRestoreClusterSelection,onPrepareClusterComparison,onRestoreClusterComparison,onPrepareClusterDatabase,onRestoreClusterDatabase,library,controllerRef,onRestoreAcquisition,onKindChange,onLabProgress,onPrepareClassification,onRestoreClassification,onArchivesChange,onSessionBusy,onClassifyAcquisition,onClassifyImported,onPreparePhotometry,onRestorePhotometry,onPrepareObserving,onRestoreObserving,onPrepareEditing,onRestoreEditing,onPrepareOptical,onRestoreOptical,active=true}: {onPrepareRadio?:()=>RadioPrepare;onCheckRadioRestore?:()=>RadioRestoreBlock|null;onRestoreRadio?:(record:RadioInvestigationRecord)=>boolean;onPrepareMotion?:()=>MotionPreferences|null;onRestoreMotion?:(w:MotionPreferences)=>void;onPrepareObservatory?:()=>ObservatorySession|null;onRestoreObservatory?:(w:ObservatorySession|null)=>void;onPrepareLss?:()=>LssInvestigation|null;onRestoreLss?:(w:LssInvestigation|null)=>void;onPrepareObjectX?:()=>ObjectXInvestigation|null;onRestoreObjectX?:(w:ObjectXInvestigation|null)=>void;library: {samples: readonly Sample[]; name: string} | null;controllerRef?:Ref<AnalysisController>;onRestoreAcquisition?:(observation:AcquisitionObservation)=>void;onKindChange?:(star:boolean)=>void;onLabProgress?:(progress:HubbleLabProgress)=>void;active?:boolean;onPrepareOptical?:()=>OpticalWorkspace;onRestoreOptical?:(w:OpticalWorkspace)=>void;onPrepareEditing?:()=>SharedEditingWorkspace;onRestoreEditing?:(w:EditingWorkspace)=>void;onPrepareObserving?:()=>ObservingWorkspace;onRestoreObserving?:(w:ObservingWorkspace)=>void;onPreparePhotometry?:()=>PhotometerState|null;onRestorePhotometry?:(s:PhotometerState|null)=>void;/** Front Perf: the classification workspace, read when a session is saved or restored (it was a prop that re-rendered this route on every classification keystroke). */onPrepareClassification?:()=>ClassificationWorkspace;onRestoreClassification?:(w:ClassificationWorkspace,a:readonly AcquisitionObservation[])=>void;onArchivesChange?:(a:readonly AcquisitionObservation[])=>void;onSessionBusy?:(busy:boolean)=>void;onClassifyAcquisition?:(a:StarObservation)=>void;onClassifyImported?:(s:ClassificationImport)=>void;onPrepareClusterDatabase?:()=>ClusterDatabaseWorkspace|null;onRestoreClusterDatabase?:(w:ClusterDatabaseWorkspace|null)=>void;onPrepareClusterSelection?:()=>ClusterSelectionWorkspace|null;onRestoreClusterSelection?:(w:ClusterSelectionWorkspace|null)=>void;onPrepareClusterComparison?:()=>ClusterComparisonWorkspace|null;onRestoreClusterComparison?:(w:ClusterComparisonWorkspace|null)=>void}) {
  const [velocityDraft,setVelocityDraft]=useState<VelocityDraft>(()=>defaultVelocityDraft([]));
  const [stepInput, setStepInput] = useState('');
  const [control, setControl] = useState(INITIAL_CONTROL), [reference, setReference] = useState<keyof typeof references>('galaxy');
  // Front P: Comparison Spectrum › Clear [W] hides the comparison lines; not saved (the session keeps the list). Any new
  // observation, restore or list choice shows them again.
  const [comparisonCleared, setComparisonCleared] = useState(false);
  const [observation, setObservation] = useState<Imported | null>(null), [object, setObject] = useState(''), [rows, setRows] = useState<readonly Measurement[]>([]);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [wide, setWide] = useState(false), [confirm, setConfirm] = useState(false), [draft, setDraft] = useState<Measurement | null>(null);
  const [acquisitions,setAcquisitions]=useState<readonly AcquisitionObservation[]>([]);
  useEffect(()=>onArchivesChange?.(acquisitions),[acquisitions,onArchivesChange]);
  useEffect(()=>onSessionBusy?.(busy),[busy,onSessionBusy]);
  const isStar=observation?.kind==='catalog-star-acquisition',isGalaxy=observation?.kind==='catalog-galaxy-acquisition',isAcquired=!!observation?.kind;
  useEffect(()=>onKindChange?.(isAcquired),[isAcquired,onKindChange]);
  function acceptAcquisition(packet:AcquisitionObservation){
    if(busy)throw errorFor('continuity.busy');
    if(observation?.kind&&observation.acquisitionId===packet.acquisitionId){setError('');setNotice(t('continuity.sameSnapshot'));return;}
    const next=acquisitions.some(a=>a.acquisitionId===packet.acquisitionId)?acquisitions:[...acquisitions,packet];
    // Front F: more than 12 acquisitions are saved only in the v29 wrapper (analysisSession.ts).
    if(next.length>EXTENDED_MAX_ACQUISITION_ARCHIVE||next.reduce((n,a)=>n+a.state.events.length,0)>MAX_ARCHIVE_EVENTS)throw errorFor('continuity.archiveFull');
    generation.current++;recordDialog.current?.close();setConfirm(false);setDraft(null);
    setAcquisitions(next);setObservation(packet);setObject(acquisitionObjectId(packet));setReference(acquisitionReference(packet));setWide(false);setControl(INITIAL_CONTROL);setStepInput('');setError('');setNotice(t(packet.kind==='catalog-star-acquisition'?'continuity.received':'galaxyExposure.received'));
  }
  function acceptImported(source:ClassificationImport){if(busy)throw errorFor('continuity.busy');const matches=acquisitions.filter(a=>a.sha256===source.sha256);if(matches.length>1)throw errorFor('continuity.ambiguousCurve');if(matches[0]){acceptAcquisition(matches[0]);return;}if(observation&&!observation.kind&&observation.sha256===source.sha256){setNotice(t('classImport.reused'));return;}generation.current++;recordDialog.current?.close();setConfirm(false);setDraft(null);setObservation({name:source.name,sha256:source.sha256,sourceText:source.sourceText,samples:source.samples,...(source.legacyHeader?{legacyHeader:source.legacyHeader}:{})});setObject(source.legacyHeader?.object??'');setReference('balmer');setControl(INITIAL_CONTROL);setStepInput('');setWide(false);setError('');setNotice(t('spectrum.importedNotice'));}
  const hubbleDetails=useRef<HTMLDetailsElement>(null),ownResultsDetails=useRef<HTMLDetailsElement>(null);
  // Phase 1 item 1.12: minimal archive identity for the read-only results binding; no copy of rows is stored.
  const resultsArchive=useMemo(()=>acquisitions.map(a=>({acquisitionId:a.acquisitionId,kind:a.kind,objectId:acquisitionObjectId(a),sha256:a.sha256,name:a.name})),[acquisitions]);
  function openOwnResults(){const element=ownResultsDetails.current;if(element){element.open=true;element.querySelector('summary')?.focus();element.scrollIntoView({block:'start'});}}

  const [hubble,setHubble]=useState<HubbleWorkspace>(EMPTY_HUBBLE);
  const labProgress=useMemo(()=>hubbleLabProgress(acquisitions.filter(a=>a.kind==='catalog-galaxy-acquisition').map(a=>({targetId:a.targetId,acquisitionId:a.acquisitionId,sha256:a.sha256})),rows,hubble),[acquisitions,rows,hubble]);
  useEffect(()=>onLabProgress?.(labProgress),[labProgress,onLabProgress]);
  const sessionInput = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null), evidence = useRef<HTMLDialogElement>(null), recordDialog = useRef<HTMLDialogElement>(null), generation = useRef(0), nextId = useRef(1);
  useEffect(()=>{if(!active){recordDialog.current?.close();evidence.current?.close();setConfirm(false);setDraft(null);}},[active]);
  const z = currentZ(control), selected = references[reference];
  useEffect(() => setComparisonCleared(false), [observation, reference]);
  function move(position: number) { try { const next = moveControl(control, position); selected.lines.forEach(l => shiftedWavelength(l.wavelength, currentZ(next))); setControl(next); setNotice(''); setError(''); } catch (e) { setError(displayError(e)); } }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const ticket = ++generation.current; setBusy(true); setError(''); setNotice('');
    try {
      if (file.size > MAX_FILE_BYTES) throw errorFor('spectrum.fileTooLarge');
      const imported = await readImportedSpectrum(file);
      const { samples, sha256 } = imported;
      if (ticket !== generation.current) return;
      if (!samples.some(p => p.wavelength >= 3650 && p.wavelength <= 7000)) throw errorFor('spectrum.outsideRange');
      const matches=acquisitions.filter(a=>a.sha256===sha256);if(matches.length>1)throw errorFor('continuity.ambiguousCurve');const known=matches[0];setObservation(known??{ name: file.name, ...imported });if(known){setObject(acquisitionObjectId(known));setReference(acquisitionReference(known));}else{setObject(imported.legacyHeader?.object??'');} setControl(INITIAL_CONTROL); setStepInput(''); setWide(!samples.some(p => p.wavelength >= 3700 && p.wavelength <= 4700)); recordDialog.current?.close();setConfirm(false);setDraft(null);setNotice(t(known?'continuity.knownCurve':'spectrum.importedNotice'));
    } catch (e) { if (ticket === generation.current) setError(displayError(e,'error.import')); }
    finally { if (ticket === generation.current) setBusy(false); event.target.value = ''; }
  }
  function beginRecord() {
    if (!observation) return;
    try { if(rows.length>=MAX_SESSION_ROWS||nextId.current>=Number.MAX_SAFE_INTEGER)throw errorFor('session.logLimit'); setDraft(createMeasurement(nextId.current, object, observation.name, observation.sha256, control, selected.source,observation.kind?{kind:observation.kind,acquisitionId:observation.acquisitionId,...(observation.kind==='catalog-galaxy-acquisition'?{targetId:observation.targetId}:{})}:undefined));
    setConfirm(true); recordDialog.current?.showModal(); } catch(e) { setError(displayError(e)); }
  }
  function inspectAcquisition(row:Measurement){const packet=acquisitions.find(a=>a.acquisitionId===row.origin?.acquisitionId);if(!packet)return;acceptAcquisition(packet);setControl(row.control);setStepInput(String(row.control.step));setReference((Object.keys(references)as(keyof typeof references)[]).find(k=>references[k].source===row.reference)??'balmer');setObject(row.object);}
  function saveRecord() {
    if (!draft) return; const nextRows=[...rows,draft];setRows(nextRows);setVelocityDraft(defaultVelocityDraft(nextRows)); nextId.current++; setDraft(null); setConfirm(false); recordDialog.current?.close(); setNotice(t('spectrum.savedNotice'));
  }
  function download(text:BlobPart,name:string,type:string) {
    const url=URL.createObjectURL(new Blob([text],{type}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportRows() {download(measurementCsv(rows),'openvireo-measurements.csv','text/csv;charset=utf-8');}
  function exportObservation() {
    if(observation)download(observation.sourceText,observation.name,'text/plain;charset=utf-8');
  }
  async function exportNativeSpectrum() {
    if(!observation?.kind)return;
    const ticket=++generation.current;setBusy(true);setError('');setNotice('');
    try{
      const bytes=await acquiredSpectrumBytes(observation);
      if(ticket!==generation.current)return;
      download(bytes.slice().buffer,observation.name.replace(/\.sp$/i,'.ssp'),'text/plain;charset=us-ascii');setNotice(t('ssp.exported'));
    }catch{if(ticket===generation.current)setError(t('ssp.exportError'));}
    finally{if(ticket===generation.current)setBusy(false);}
  }
  async function exportSession():Promise<boolean> {
    if(busy)return false;
    // Phase 1 item 1.5: an unsafe Radio/Pulsar state refuses the whole Save before any other part is prepared, and before the
    // ticket or busy change, so a refused Save never advertises a session operation (whose effects could abandon an owned write).
    let radio:RadioPrepare;
    try{radio=onPrepareRadio?.()??{kind:'none'};}catch{setNotice('');setError(t('session.exportError'));return false;}
    if(radio.kind==='blocked'){setNotice('');setError(t('project.radioBlocked',{reason:t(`project.radioBlock.${radio.reason}`)}));return false;}
    const ticket=++generation.current;setBusy(true);setError('');setNotice('');
    try {
      const motion=onPrepareMotion?.()??undefined,observatory=onPrepareObservatory?.()??undefined,lss=onPrepareLss?.()??undefined,objectX=onPrepareObjectX?.()??undefined,observing=onPrepareObserving?.(),photometry=onPreparePhotometry?.(),sharedEditing=onPrepareEditing?.(),optical=onPrepareOptical?.();
      const editing=sharedEditing?{...sharedEditing,velocity:velocityDraft}:undefined;
      const clusterDatabase=onPrepareClusterDatabase?.(),clusterComparison=onPrepareClusterComparison?.(),clusterSelection=onPrepareClusterSelection?.();
      const saved=await serializeAnalysisSession({...(objectX?{objectX}:{}),...(lss?{lss}:{}),...(radio.kind==='ready'?{radio:{snapshot:radio.snapshot,prepared:null}}:{}),...(motion?{motion}:{}),...(observatory?{observatory}:{}),...(clusterSelection?{clusterSelection}:{}),...(clusterComparison?{clusterComparison}:{}),...(clusterDatabase?{clusterDatabase}:{}),...(optical?{optical}:{}),...(editing?{editing}:{}),...(observing?{observing}:{}),...(photometry?{photometry}:{}),observation,control,stepInput,reference,wide,object,rows,hubble,...((classification=>classificationWorkspaceUsed(classification)?{classification}:{})(onPrepareClassification?.()??EMPTY_CLASSIFICATION_WORKSPACE)),...(acquisitions.length?{acquisitions}:{})});
      if(ticket!==generation.current)return false;
      download(saved,'openvireo-session.json','application/json;charset=utf-8');if(radio.kind==='ready')radio.onSaved();setNotice(t('session.saved'));return true;
    } catch(e) {if(ticket===generation.current)setError(e instanceof LssSessionError?t('lss.saveError'):e instanceof ObjectXSessionError?OBJECT_X_SAVE_ERROR:t('session.exportError'));return false;}
    finally {if(ticket===generation.current)setBusy(false);}
  }
  async function importSession(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];event.target.value='';if(file)await restoreSessionFile(file);
  }
  async function restoreSessionFile(file:File):Promise<boolean> {
    if(busy)return false;
    // Phase 1 item 1.5: an active capture, output attempt or analysis dialog/read refuses Restore before anything else runs.
    const blockedNow=onCheckRadioRestore?.()??null;
    if(blockedNow){setError(t('project.radioRestoreBlocked',{reason:t(`project.radioBlock.${blockedNow}`)}));return false;}
    const ticket=++generation.current;setBusy(true);setError('');setNotice('');
    try {
      onPrepareObserving?.();onPreparePhotometry?.();
      const incoming=await readInvestigationSession(file,{onPreparingFields:()=>{if(ticket===generation.current)setNotice(t('session.preparingFields'));}});
      if(incoming.kind==='practice'){
        const stars=acquisitions.filter(a=>a.kind==='catalog-star-acquisition'),merged=readClassificationWorkspace({...(onPrepareClassification?.()??EMPTY_CLASSIFICATION_WORKSPACE),practice:incoming.state,active:'practice'},stars);
        await loadClassificationSources(incoming.state,stars);
        if(ticket!==generation.current)return false;
        onRestoreClassification?.(merged,acquisitions);setNotice(t('classLink.practiceRestored'));return true;
      }
      const saved=incoming.session;
      references[saved.reference].lines.forEach(line=>shiftedWavelength(line.wavelength,currentZ(saved.control)));
      if(ticket!==generation.current)return false;
      // Phase 1 item 1.5: after the awaits, re-check the latest guards, then the Radio part first; a refusal changes nothing.
      const blockedLate=onCheckRadioRestore?.()??null;
      if(blockedLate){setError(t('project.radioRestoreBlocked',{reason:t(`project.radioBlock.${blockedLate}`)}));return false;}
      if(saved.radio&&!(onRestoreRadio?.(saved.radio)??false))return false;
      if(saved.clusterDatabase)onRestoreClusterDatabase?.(saved.clusterDatabase);
      if(saved.clusterComparison)onRestoreClusterComparison?.(saved.clusterComparison);
      if(saved.clusterSelection)onRestoreClusterSelection?.(saved.clusterSelection);
      recordDialog.current?.close();setConfirm(false);setDraft(null);
      onRestoreClassification?.(saved.classification??EMPTY_CLASSIFICATION_WORKSPACE,saved.acquisitions??[]);
      if(saved.photometry)onRestorePhotometry?.(saved.photometry);
      else if(saved.observing)onRestorePhotometry?.(null);
      if(saved.observing)onRestoreObserving?.(saved.observing);
      if(saved.motion)onRestoreMotion?.(saved.motion);
      onRestoreObservatory?.(saved.observatory??null);
      onRestoreLss?.(saved.lss??null);
      onRestoreObjectX?.(saved.objectX??null);
      if(saved.optical)onRestoreOptical?.(saved.optical);else if(saved.observing)onRestoreOptical?.(INITIAL_OPTICAL);
      setVelocityDraft(saved.editing?.velocity??defaultVelocityDraft(saved.rows));if(saved.editing)onRestoreEditing?.(saved.editing);
      setAcquisitions(saved.acquisitions??[]);setObservation(saved.observation);setControl(saved.control);setStepInput(saved.stepInput);setReference(saved.reference);
      setObject(saved.object);setRows(saved.rows);setHubble(saved.hubble);setWide(saved.wide);nextId.current=(saved.rows.at(-1)?.id??0)+1;
      setNotice(t('session.restored'));return true;
    } catch(e) {if(ticket===generation.current){setNotice('');setError(t(e instanceof AnalysisSessionError&&e.code==='resources'?'session.restoreResourcesError':'session.restoreError'));}return false;}
    finally {if(ticket===generation.current)setBusy(false);}
  }
  function cancelSessionOperation(){generation.current++;setBusy(false);setError('');setNotice(t('classLink.cancelled'));}
  useImperativeHandle(controllerRef,()=>({acceptAcquisition,acceptImported,cancelSessionOperation,saveSession:exportSession,restoreSessionFile,openHubble:()=>{const element=hubbleDetails.current;if(element){element.open=true;element.querySelector('summary')?.focus();element.scrollIntoView({block:'start'});}}}),[onPrepareObjectX,onRestoreObjectX,onPrepareLss,onRestoreLss,onPrepareRadio,onCheckRadioRestore,onRestoreRadio,onPrepareMotion,onRestoreMotion,busy,acquisitions,observation,onPrepareClassification,control,stepInput,reference,wide,object,rows,hubble,onPreparePhotometry,onRestorePhotometry,onPrepareObserving,onRestoreObserving,onPrepareEditing,onRestoreEditing,velocityDraft,onPrepareOptical,onRestoreOptical,onPrepareClusterDatabase,onRestoreClusterDatabase,onPrepareClusterComparison,onRestoreClusterComparison,onPrepareClusterSelection,onRestoreClusterSelection]);
  return <div className="app-shell">
    <aside className="sidebar analyzer-sidebar"><a className="brand" href="#spectrum" aria-label={t('spectrum.home')}><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" fill="none" stroke="currentColor"/><path d="M6 25 27 9M10 9l17 17M18 3v30M3 18h30" fill="none" stroke="currentColor"/></svg><span>{t('app.name')}<span className="brand-web"></span></span></a><div className="sidebar-label">{t('spectrum.sidebarTitle')}</div><nav aria-label={t('spectrum.tools')}><a href="#spectrum" className="nav-active"><span>◌</span> {t('spectrum.spectra')}</a><a href="#measurement-log"><span>▤</span> {t('spectrum.log')} <b>{rows.length}</b></a><button onClick={() => evidence.current?.showModal()}><span>⌘</span> {t('spectrum.evidence')}</button></nav><div className="sidebar-bottom"><span className="local-dot"/> {t('spectrum.localSession')}<span className="subtle">{t('spectrum.noServices')}</span></div></aside>
    <main id="spectrum"><header className="topbar"><div><span className="breadcrumb">{t(isStar?'spectrum.stellarEdition':'spectrum.hubbleEdition')}</span><span className="stage-pill">{t('spectrum.stage')}</span></div><button className="text-button" onClick={() => evidence.current?.showModal()}>{t('spectrum.about')}</button></header>
    {isAcquired&&<section className="library-context acquisition-context" aria-label={t(isStar?'continuity.provenance':'galaxyExposure.provenance')}><strong>{isStar?t('continuity.acquiredStar'):t('galaxyExposure.acquired',{id:observation.targetId})}</strong>{isGalaxy&&<p>{((d:{sourceFile?:string})=>d.sourceFile&&d.sourceFile!=='GLXYTMPL.SP'?t('galaxyExposure.modelLimitOwnSpectrum',{id:observation.targetId,file:d.sourceFile}):t('galaxyExposure.modelLimit',{id:observation.targetId}))(galaxyStateDefinition(observation.state) as {sourceFile?:string})}</p>}<button className="secondary-button" disabled={busy} onClick={()=>onRestoreAcquisition?.(observation)}>{t('continuity.restoreExposure')}</button><p>{t('continuity.restoreHelp')}</p>{isStar&&<button className="secondary-button" disabled={busy} onClick={()=>onClassifyAcquisition?.(observation)}>{t('classLink.open')}</button>}<details className="research-notes"><summary>{t('notes.summary')}</summary><p>{t('continuity.context',{time:observation.state.exposure.elapsedMs,seed:observation.state.exposure.seed,draws:observation.state.exposure.draws})}</p><p>{t('continuity.normalized')}</p></details></section>}
    <section className="page-heading"><div className="eyebrow">{t('spectrum.eyebrow')}</div><h1 tabIndex={-1}>{isStar?t('continuity.title'):isGalaxy?t('galaxyExposure.analysisTitle'):t('spectrum.title')}<span>.</span></h1>{/* TSpectrumEngine Help1, FormShow 0x5829f3, options +0xac4 (docs/CLEA-HELP.md) */}<CleaHelp list={HELP_FILES['MEASHLP.LST']} testId="measure-help"/><p>{isStar?t('continuity.intro'):isGalaxy?t('galaxyExposure.analysisIntro'):t('spectrum.intro')}</p></section>
    <div className="workspace"><div className="left-column"><section className="instrument card"><div className="card-heading"><div><div className="eyebrow">{t('spectrum.bench')}</div><h2>{t('spectrum.spectrumLines')}</h2></div><span className={'status-badge '+(observation ? 'loaded' : '')}>{observation ? isStar?t('continuity.acquiredBadge'):isGalaxy?t('galaxyExposure.acquiredBadge'):t('spectrum.importedData') : t('spectrum.originalReference')}</span></div>
      <div className="plot-toolbar"><div className="legend"><span><i className="ref-key"/> {isStar?t('continuity.template'):isGalaxy?t('galaxyExposure.restTemplate'):library ? t('spectrum.scaledLibrary') : t('spectrum.template')}</span>{observation && <span><i className="obs-key"/> {observation.name}</span>}<span><i className="line-key"/> {t('spectrum.shiftedLines')}</span></div><button className="plot-button" onClick={() => setWide(v => !v)} aria-pressed={wide}>{wide ? t('spectrum.hkView') : t('spectrum.fullView')}</button></div>
      <Chart observation={observation} z={z} reference={comparisonCleared ? null : reference} wide={wide} baseline={isAcquired?observation.templateSamples:library?.samples ?? template}/>
      <div className="plot-foot"><span>{isStar?'A0000049.SP':isGalaxy?t('spectrum.unshiftedTemplate',{file:'GLXYTMPL.SP'}):library ? library.name : t('spectrum.templateCaption')}</span><span>{observation ? t(isStar?'continuity.binCount':'spectrum.sampleCount', {count: formatNumber(observation.samples.length)}) : t('spectrum.noObservation')}</span></div>
      <div className="line-table"><div className="section-title"><h3>{t('spectrum.referenceLines')}</h3><span>λ′ = (1 + z) λ</span></div><table><thead><tr><th>{t('spectrum.line')}</th><th>{t('spectrum.rest')}</th><th>{t('spectrum.shifted')}</th><th>Δλ · Å</th></tr></thead><tbody>{(comparisonCleared ? [] : selected.lines).map((l, index) => { const shifted = shiftedWavelength(l.wavelength, z); return <tr key={index}><td><i className="table-marker"/>{l.label}</td><td>{fixed(l.wavelength,3)}</td><td data-testid={`shifted-${l.wavelength}`}>{fixed(shifted,3)}</td><td>{fixed(shifted-l.wavelength,3)}</td></tr>; })}</tbody></table></div>
    </section><section id="measurement-log" className="card log-card"><div className="card-heading"><div><div className="eyebrow">{t('spectrum.notebook')}</div><h2>{t('spectrum.measurements')} <span className="count">{rows.length.toString().padStart(2, '0')}</span></h2></div><div className="log-actions"><button className="secondary-button" onClick={openOwnResults}>{t('ownResults.open')}</button><button className="secondary-button" disabled={!rows.length} onClick={exportRows}>{t('spectrum.export')}</button></div></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>{t('spectrum.number')}</th><th>{t('spectrum.object')}</th><th>{t('spectrum.file')}</th><th>{t('spectrum.recordedZ')}</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.id.toString().padStart(2, '0')}</td><td>{r.object}</td><td>{r.file}{r.origin&&<><small className="measurement-kind">{r.origin.kind==='catalog-star-acquisition'?t('continuity.stellarRow'):t('galaxyExposure.measurementRow',{id:r.origin.targetId??'36773'})}</small><button className="text-button" disabled={busy} onClick={()=>inspectAcquisition(r)}>{t('continuity.inspectMeasurement',{id:r.id})}</button></>}</td><td>{formatFloat32(r.zFloat32)}</td></tr>)}</tbody></table></div> : <div className="empty-log"><span>↳</span><p>{t('spectrum.emptyTitle')}<small>{t('spectrum.emptyHelp')}</small></p></div>}<div className="log-foot">{t('spectrum.sessionHelp')}</div></section><OwnObservationResults detailsRef={ownResultsDetails} rows={rows} archive={resultsArchive} busy={busy} active={active} onDownload={download}/><section className="card session-card" aria-labelledby="session-heading"><div className="eyebrow">{t('session.eyebrow')}</div><h2 id="session-heading">{t('session.title')}</h2><p>{isAcquired?t('continuity.sessionHelp'):t('session.help')}</p><div className="session-actions"><button className="secondary-button" disabled={busy} onClick={exportSession}>{t('session.save')}</button><button className="secondary-button" disabled={busy} onClick={()=>sessionInput.current?.click()}>{t('session.restore')}</button><button className="secondary-button" disabled={busy||!observation} onClick={exportObservation}>{isAcquired?t('continuity.downloadCurve'):t('session.source')}</button>{isAcquired&&<button className="secondary-button" disabled={busy} onClick={exportNativeSpectrum}>{t('ssp.download')}</button>}</div><input ref={sessionInput} type="file" accept=".json" hidden className="file-input" aria-label={t('session.importLabel')} onChange={importSession}/>{!!acquisitions.length&&<div className="acquisition-archive"><h3>{t('continuity.archiveTitle')}</h3><p>{t('continuity.archiveHelp')}</p><ul>{acquisitions.map((a,i)=><li key={a.acquisitionId}><button className="secondary-button" disabled={busy} onClick={()=>acceptAcquisition(a)}>{t('continuity.reopen',{index:i+1,time:a.state.exposure.elapsedMs})}</button><small>{acquisitionObjectId(a)} · {a.acquisitionId.slice(0,12)} · {t('continuity.seedLabel')} {a.state.exposure.seed}</small></li>)}</ul></div>}<p className="session-boundary">{t(acquisitions.length?'continuity.sessionBoundary':'session.boundary')}</p><details className="research-notes"><summary>{t('notes.summary')}</summary><p>{t('project.sessionHelp')}</p>{isAcquired&&<p>{t('ssp.exportHelp')}</p>}</details></section><VelocityAnalysis rows={rows} draft={velocityDraft} onChange={setVelocityDraft}/><HubbleAnalysis detailsRef={hubbleDetails} workspace={hubble} onChange={setHubble} measurements={rows} onSaveSession={exportSession} onRestoreSession={()=>sessionInput.current?.click()} busy={busy}/></div><aside className="controls"><section className="card adjustment"><div className="eyebrow">{t(isStar?'continuity.alignment':'spectrum.redshift')}</div><div className="z-value" data-testid="z-value">{formatZ(z)}</div><div className="precision-tag">{t('spectrum.dimensionless')}</div><label className="field-label" htmlFor="reference">{t('spectrum.lineList')}</label><select id="reference" value={comparisonCleared ? '' : reference} onChange={e => { const next = e.target.value as keyof typeof references; if (!Object.hasOwn(references, next)) return; try { references[next].lines.forEach(l => shiftedWavelength(l.wavelength, z)); setReference(next); setComparisonCleared(false); } catch (err) { setError(displayError(err)); } }}>{comparisonCleared && <option value="" disabled>{PM.comparison.none}</option>}{Object.entries(references).map(([id, r]) => <option key={id} value={id}>{r.title}</option>)}</select>
      <button type="button" className="secondary-button" data-testid="comparison-clear" disabled={comparisonCleared} onClick={() => setComparisonCleared(true)}>{PM.comparison.clear}</button><p className="observatory-note" data-testid="comparison-clear-note">{PM.comparison.note}</p>
      <label className="field-label" htmlFor="step-input">{t('spectrum.stepLabel')}</label><div className="step-input-row"><input id="step-input" type="number" min="0" max="1" step="any" value={stepInput} placeholder={t('spectrum.stepPlaceholder')} onChange={e => setStepInput(e.target.value)}/><button className="secondary-button" onClick={() => { try { setControl(configureStep(control, Number(stepInput))); setError(''); } catch (err) { setError(displayError(err)); } }}>{t('spectrum.applyStep')}</button></div><p className="control-note">{isAcquired?t('continuity.stepHelp'):t('spectrum.stepHelp')}</p><div className="control-label"><label htmlFor="z-position">{t('spectrum.controlPosition')}</label><output>{control.position}</output></div><input id="z-position" aria-label={t('spectrum.controlPosition')} type="range" disabled={!control.step} min="-100" max="100" step="1" value={control.position} onChange={e => move(Number(e.target.value))}/><div className="range-labels"><span>{t('spectrum.blueward')}</span><span>{t('spectrum.redward')}</span></div>
      <div className="step-controls"><button aria-label={t('spectrum.decrease')} disabled={!control.step || control.position <= -100} onClick={() => move(control.position - 1)}>−</button><button className="rebase" onClick={() => setControl(rebase)}>{t('spectrum.recenter')}</button><button aria-label={t('spectrum.increase')} disabled={!control.step || control.position >= 100} onClick={() => move(control.position + 1)}>+</button></div>
      <fieldset className="mode-switch"><legend>{t('spectrum.controlStep')}</legend><button type="button" aria-pressed={control.factor === 1} onClick={() => setControl(s => changeFactor(s, 1))}>{t('spectrum.fine')} <small>×1</small></button><button type="button" aria-pressed={control.factor === 10} onClick={() => setControl(s => changeFactor(s, 10))}>{t('spectrum.coarse')} <small>×10</small></button></fieldset><p className="control-note">{t('spectrum.rebaseHelp')}</p><button className="text-button reset" onClick={() => { setControl(INITIAL_CONTROL); setStepInput(''); setError(''); setNotice(t('spectrum.resetNotice')); }}>{t('spectrum.reset')}</button><div className="calibration">{t('spectrum.fineStep')} {control.step ? scientific(control.step,5) : t('spectrum.unconfigured')}<br/>{t('spectrum.initialView')}</div>
    </section><section className="card import-card"><div className="eyebrow">{t('spectrum.observation')}</div><h2>{observation ? isStar?t('continuity.fileReady'):t('spectrum.fileReady') : t('spectrum.bringSpectrum')}</h2><p>{t('spectrum.formatHelp')}</p><input ref={input} type="file" accept=".csv,.sp,.ssp,.txt" hidden onChange={importFile} className="file-input" aria-label={t('spectrum.importLabel')}/><button className="secondary-button" onClick={() => input.current?.click()} disabled={busy}>{busy ? t('spectrum.reading') : observation ? t('spectrum.changeFile') : t('spectrum.import')}</button><span className="file-help">{t('spectrum.maxFile')}</span>{observation&&!observation.kind&&observation.legacyHeader&&<section aria-label={t('ssp.metadata')}><h3>{t('ssp.metadata')}</h3><p>{t('ssp.claims')}</p><p>{t('ssp.header',{object:observation.legacyHeader.object,ra:observation.legacyHeader.pointingRa,dec:observation.legacyHeader.pointingDec})}</p><p>{observation.legacyHeader.apparentMagnitude===undefined?t('ssp.noMagnitude'):t('ssp.magnitude',{value:observation.legacyHeader.apparentMagnitude})}</p></section>}{observation&&!observation.kind&&<><button className="secondary-button" disabled={busy||!classificationCoverage(observation.samples)} onClick={()=>{try{onClassifyImported?.(classificationImportFromDecoded(observation.name,observation));setError('');}catch{setError(t('classImport.error'));}}}>{t('classImport.open')}</button><p>{t('classImport.domain')}</p></>}{observation && <p className="file-identity" title={observation.sha256}>{observation.name}<br/>SHA-256 {observation.sha256.slice(0, 14)}…</p>}<label className="field-label" htmlFor="object">{t('spectrum.objectLabel')}</label><input id="object" type="text" value={object} maxLength={80} placeholder={t('spectrum.objectPlaceholder')} onChange={e => setObject(e.target.value)}/><button className="primary-button" disabled={!observation || !control.step || busy || rows.length>=MAX_SESSION_ROWS} onClick={beginRecord}>{t('spectrum.record')} <span>↗</span></button>{!observation && <p className="file-help">{t('spectrum.referenceNotObservation')}</p>}</section></aside></div>
    <div aria-live="polite" className="feedback">{error && <p role="alert" className="error">{error}</p>}{notice && <p className="notice">{notice}</p>}</div>
    <footer><span>{t('spectrum.attribution')}</span><span>{t(isStar?'continuity.footer':isGalaxy?'galaxyExposure.footer':'spectrum.pending')}</span></footer></main>
    <dialog ref={evidence} aria-labelledby="evidence-heading"><button className="dialog-close" aria-label={t('spectrum.closeEvidence')} onClick={() => evidence.current?.close()}>×</button><div className="eyebrow">{t('spectrum.scope')}</div><h2 id="evidence-heading">{t('spectrum.evidenceTitle')}</h2><p>{t('spectrum.originalHelp')}</p><dl><dt>{t('spectrum.lineShift')}</dt><dd>VIREO 0x58499c: λ′ = (1 + z) λ.</dd><dt>{t('spectrum.controlState')}</dt><dd>{t('spectrum.controlEvidence')}</dd><dt>{t('spectrum.log')}</dt><dd>{t('spectrum.recordEvidence')}</dd><dt>{t('spectrum.precisionTitle')}</dt><dd>{t('spectrum.precisionHelp')}</dd><dt>{t('spectrum.adaptationsTitle')}</dt><dd>{t('spectrum.adaptationsHelp')}</dd></dl><p className="file-help">{t('spectrum.licenseHelp')}</p><button className="primary-button" onClick={() => evidence.current?.close()}>{t('spectrum.return')}</button></dialog>
    <dialog ref={recordDialog} aria-labelledby="record-heading" onCancel={() => { setConfirm(false); setDraft(null); }}><div className="eyebrow">{t('spectrum.localRecord')}</div><h2 id="record-heading">{t('spectrum.confirmTitle')}</h2>{confirm && draft && <><p>{draft.object} · {draft.file}</p><div className="confirm-value">z = {formatFloat32(draft.zFloat32)}</div><p>{t('spectrum.float32Help')}</p>{draft.zNumber !== 0 && draft.zFloat32 === 0 && <p role="status" className="quantization-note">{t('spectrum.roundsTo')} {Object.is(draft.zFloat32, -0) ? '−0' : '0'} {t('spectrum.roundsHelp')} {formatZ(draft.zNumber)}. {t('spectrum.bits')}: {draft.zFloat32Hex}.</p>}<div className="dialog-actions"><button className="secondary-button" onClick={() => { recordDialog.current?.close(); setConfirm(false); setDraft(null); }}>{t('spectrum.cancel')}</button><button className="primary-button" onClick={saveRecord}>{t('spectrum.save')}</button></div></>}</dialog>
  </div>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(SpectrumInstrument);
