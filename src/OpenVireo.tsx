import {hubbleExtendedTarget} from './core/hubbleEngineTargets';
import HotListEditor from './HotListEditor';
import {useSharedHotList} from './useSharedHotList';
import {useSharedPulsarData} from './useSharedPulsarData';
import {htlCatalogMatch} from './core/hotList';
import TargetPicker,{type TargetGroup}from'./TargetPicker';
import TelescopeMotion from './TelescopeMotion';
import OpticalSlewMenu from './observatory/OpticalSlewMenu';
import {originalCatalogId} from './core/hotListEntry';
import {EditModeFieldLayerLazy,NakedEyeDomeSkyLazy} from './observatory/FrontOLazy';
import ObservatorySounds,{cueDomeSound} from './sound/ObservatorySounds';// Front C5W
import {MultiSpecObservatoryLazy} from './multispec/MultiSpecLazy';// Front M
import CloudEntry from './cloud/CloudEntry';// Front A (optional cloud account; off unless VITE_OPENVIREO_CLOUD=1)
import {NO_SITE_OVERRIDES,effectiveObservatorySite,type SiteOverrides} from './core/observatorySite';
import {COMPILED_OPTICAL_OPTIONS,COMPILED_SESSION_OPTICAL_OPTIONS,programmedSlewRateIndex,telescopeChangeClosesDome,type OpticalOptions,type SessionOpticalOptions} from './core/opticalOptions';
import {SLEW_LIMIT_LITERALS,manualLimitText,slewLimitAllows} from './core/slewLimit';
import {OPTICAL_SLEW_LITERALS,opticalSlewBelowText} from './core/opticalSkyCoords';
import{readMotionPreferences,type MotionDirection,type MotionPreferences}from'./core/telescopeMotion';
import type {ClusterSelectionWorkspace} from './core/clusterSelection';
import type {ClusterComparisonWorkspace} from './core/clusterComparison';
import {mergeLegacyClusterComparison,mergeLegacyClusterSelection,comparisonHasLegacyScope,legacyScopeFromComparison} from './core/clusterComparisonScope';
import type {ClusterDatabaseWorkspace} from './core/clusterDatabase';
import {instrumentAccess} from './core/instrumentAccess';
import RunningClock from './RunningClock';
import {useObservatoryClock} from './useObservatoryClock';
import type {LssWedgeHandoff,LssSnapshot} from './LssSurvey';
import type {LssInvestigation} from './io/lssInvestigation';
import {WEDGE_DEFAULT_OPTIONS} from './core/wedgePlot';
import {clockDriveUTMS,clockDrivePointing,createClockDrive,repointClockDrive} from './core/clockDrive';
import SiteClock from './SiteClock';
import {INITIAL_SITE_CLOCK,parseClockUTC,siteClockReadingMS,type SiteClockWorkspace} from './core/siteClock';
import {galaxyTelescopeIndex,galaxyTargetTelescopeSupported} from './core/galaxyTelescope';
import {hubblePointing,hubbleRowIdentity,hubbleRowStatus,type HubbleHotListRow} from './core/hubbleHotList';
import {starTelescopeIndex} from './core/starTelescope';
import OpticalTelescope,{OpticalCompatibility} from './OpticalTelescope';
import CameraControl from './CameraControl';
import {INITIAL_OPTICAL,opticalProfile,draftOpticalTelescope,cancelOpticalTelescope,applyOpticalTelescope,type OpticalWorkspace} from './core/opticalTelescope';
import {defaultPhotometryDraft,type SharedEditingWorkspace,type EditingWorkspace} from './core/editingWorkspace';
import type {ClassificationController} from './ClassificationLab';
import {HUBBLE_EXTENDED_BANKS,extendedBankKey,isHubbleExtendedId} from './core/hubbleEngineTargets';
import {emptyExposureWorkspace,LIVE_GALAXY_IDS,CACHED_GALAXY_IDS,PEGASUS_GALAXY_IDS,isCachedGalaxyId,isPegasusGalaxyId,observingUsesCachedGalaxies,observingUsesPegasusGalaxies,observingUsesExtendedGalaxies,type ExposureWorkspace,type ObservingWorkspace,type LiveGalaxyId,type CachedGalaxyId,type PegasusGalaxyId} from './core/observingWorkspace';
import type {ExposureController} from './useBoundedExposure';
import type {PhotometerState} from './core/photometer';
import type {PhotometerController} from './Photometer';
import type {NativeClusterDraft,NativeClusterParameters} from './core/nativeCluster';
import {displayError,errorFor} from './i18n/errors';
import type {ClassificationImport} from './core/classificationImport';
import {EMPTY_CLASSIFICATION_WORKSPACE,openAcquiredClassification,openImportedClassification,type ClassificationWorkspace} from './core/classification';
import type {AcquisitionObservation} from './io/acquisitionObservation';
import HubbleLabGuide,{type LabDestination} from './HubbleLabGuide';
import {hubbleLabProgress} from './core/hubbleLab';
import PulsarLabGuide from './PulsarLabGuide';
import LssLabGuide from './LssLabGuide';
import ObjectXLabGuide from './ObjectXLabGuide';
import {INITIAL_OBJECT_X_LAB_SUMMARY,objectXLabProgress,sameObjectXLabSummary,type ObjectXKind,type ObjectXLabSummary} from './core/objectXLab';
import type {ObjectXController} from './ObjectXLab';
import type {ObjectXInvestigation} from './io/objectXInvestigation';
import {OBJECT_X_LAB_EN} from './objectx/ObjectXMessages';
import {VARIABLE_STARS_EN} from './variables/VariableStarMessages';
import {objectXMasks} from './core/objectXLab';
import type {ObjectXHiddenTarget} from './ObjectXLab';
import {skyCoordsFieldsFor} from './core/radioAntenna';
import {INITIAL_LSS_LAB_SUMMARY,lssLabProgress,sameLssLabSummary,type LssLabSummary} from './core/lssLab';
import {EMPTY_PULSAR_MEASUREMENT_SUMMARY,INITIAL_RADIO_EXERCISE_SUMMARY,pulsarInvestigationState,pulsarLabProgress,pulsarListStamp,type PulsarInvestigationMark,type PulsarMeasurementSummary,type RadioExerciseSummary} from './core/pulsarLab';
import {isFileData,pulsarDataRows,replacePulsarCurrentData} from './core/pulsarCurrentData';
import {pulsarDataSnapshot,radioInvestigationText,readRadioInvestigation,rebuildRadioInvestigation,type PulsarAnalysisSnapshot,type RadioInvestigation,type RadioRestoreBlock,type RadioSaveBlock,type RadioWorkspaceSnapshot,type RestoredRadioWorkspace} from './core/radioInvestigation';
import type {RadioInvestigationRecord} from './io/radioInvestigation';
import type {RadioRouteController} from './components/RadioTelescopeRoute';
import type {PulsarAnalysisController,PulsarAnalysisRestore} from './components/PulsarAnalysis';
import PleiadesLabGuide,{type PleiadesLabDestination} from './PleiadesLabGuide';
import ClassificationLabGuide from './ClassificationLabGuide';
import {EMPTY_CLASSIFICATION_EXERCISE_SUMMARY,classificationLabProgress,type ClassificationExerciseSummary} from './core/classificationLab';
import {EMPTY_PLEIADES_EXERCISE_SUMMARY,pleiadesLabProgress,type PleiadesExerciseSummary} from './core/pleiadesLab';
import {isPleiadesExerciseList,pleiadesRowIdentity,pleiadesRowMeasure,pleiadesStarAt} from './core/pleiadesHotList';
import type * as PhotometerDomain from './core/photometerTelescope';
import {EMPTY_HUBBLE} from './core/hubbleAnalysis';
import {GALAXY_TARGETS} from './core/galaxyIdentity';
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {useStableHandlers,type StableProps} from './renderStability';
import type {WedgeWorkspace} from './core/wedgeWorkspace';
import SpectrumInstrument,{type AnalysisController,type RadioPrepare,type SessionDelivery} from './SpectrumInstrument';
import type {StarObservation} from './io/starObservation';
import type {GalaxyObservation} from './io/galaxyObservation';
import Spectrometer from './Spectrometer';
import { decodeGsc, FIELDS, pan, project, requiredSkyTiles, targetCentered, validatePointing, type CatalogStar, type FieldMode, type Pointing, type SkyObject } from './core/sky';
import type { Sample } from './core/spectrum';
import { loadVerifiedLibrarySpectrum } from './io/spectrumFiles';
import { formatNumber, t } from './i18n';
import PortalHeader from './components/PortalHeader';
import {HelpMenu as MainHelpMenu} from './help/HelpMenus';
import AboutDialog from './polish/AboutDialog';// Front P
import ResultsEditorsNav from './polish/ResultsEditorsNav';// Front P
import ClusterGuideNavButton from './polish/ClusterGuideNavButton';// Front P
import ResearchNotes from './components/ResearchNotes';
import {APP_SHELL_MESSAGES as SHELL} from './components/AppShellMessages';
import {buildTargetCatalog,SUPPORTED_STAR_POINT} from './core/targetCatalog';

const FitsImageLab=lazy(()=>import('./FitsImageLab'));
const PulsarAnalysis=lazy(()=>import('./components/PulsarAnalysis'));
const PulsarSavedRows=lazy(()=>import('./components/PulsarSavedRows'));
const RadioTelescopeRoute=lazy(()=>import('./components/RadioTelescopeRoute'));
const WedgeLab=lazy(()=>import('./components/WedgeLab'));
const LssSurvey=lazy(()=>import('./LssSurvey'));
const ObjectXLab=lazy(()=>import('./ObjectXLab'));
const VariableStarsRoute=lazy(()=>import('./variables/VariableStarsRoute'));
const ClusterDatabaseLab=lazy(()=>import('./ClusterDatabaseLab'));
const ClusterNativeObservationHr=lazy(()=>import('./components/ClusterNativeObservationHr'));
const NativeClusterAnalysis=lazy(()=>import('./NativeClusterAnalysis'));
const Photometer=lazy(()=>import('./Photometer'));
const ClassificationLab=lazy(()=>import('./ClassificationLab'));
const GalaxyExposure=lazy(()=>import('./GalaxyExposure'));

const StarExposure=lazy(()=>import('./StarExposure'));
const StarPoint=SUPPORTED_STAR_POINT;
const SkyExposure=lazy(()=>import('./SkyExposure'));
type Route='images'|'observatory'|'spectrum'|'spectrometer'|'sky-exposure'|'star-exposure'|'galaxy-exposure'|'classification'|'photometer'|'cluster-database'|'pulsar-analysis'|'radio-control'|'lss-wedge'|'lss-survey'|'object-x'|'variable-stars';
const {catalog,supportedStar,supportedGalaxies,groups}=buildTargetCatalog({star:t('sky.supportedStarLabel',{id:'N0000.DAT@14428'}),galaxy:(id,label)=>t('sky.supportedGalaxyLabel',{id,label})});
const initial = catalog.find(o => o.id === 'NGC3031')!;
const targetGroups:readonly TargetGroup[]=groups.map(group=>({label:t(group.key),items:group.items}));
const cache = new Map<string, readonly CatalogStar[]>();
type Library = Readonly<{ targetId: string; target: string; name: string; sha256: string; samples: readonly Sample[] }>;
const coord = (n: number) => formatNumber(n,{minimumFractionDigits:5,maximumFractionDigits:5,useGrouping:false});

/** E08 hidden identity: catalogue objects within OBJECT_X_HIDE_DEGREES of an unrevealed Object X target are drawn unnamed and
 * cannot be selected from the map. */
// Front Perf: memo; its props are state and the stable setSelected.
const SkyField=memo(function SkyField({center,mode,active,selected,onSelect,hidden=null}:{center:Pointing;mode:FieldMode;active:boolean;selected:SkyObject;onSelect:(o:SkyObject)=>void;hidden?:Pointing|null}) {
  const [stars,setStars]=useState<readonly CatalogStar[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const tiles=requiredSkyTiles(center,FIELDS[mode]).join(',');
  useEffect(()=>{
    if(!active)return;
    let current=true;const abort=new AbortController();setLoading(true);setError('');
    Promise.all(tiles.split(',').map(async key=>{
      const hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return hit;}
      const response=await fetch(`/original/sky/${key}.json`,{signal:abort.signal});
      if(!response.ok)throw errorFor('sky.loadError');
      const decoded=decodeGsc(await response.json());cache.set(key,decoded);while(cache.size>32||Array.from(cache.values()).reduce((count,tile)=>count+tile.length,0)>200_000)cache.delete(cache.keys().next().value!);return decoded;
    })).then(result=>{if(current)setStars(result.flat());}).catch((e:unknown)=>{if(current){setStars([]);setError(displayError(e,'sky.loadError'));}}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;abort.abort();};
  },[tiles,active]);
  const field=FIELDS[mode];
  const points=useMemo(()=>stars.filter(star=>Math.abs(star.dec-center.dec)<=field/2).map((star,index)=>({...project(star,center,field),magnitude:star.magnitude,index})).filter(p=>p.visible),[stars,center,field]);
  const objects=useMemo(()=>catalog.map(object=>({object,masked:objectXMasks(hidden,object),...project(object,center,field)})).filter(p=>p.visible),[center,field,hidden]);
  return <div className="sky-view" aria-busy={loading}><div className="sky-toolbar"><span>{t('sky.orientation')}</span><span>{t(mode==='finder'?'sky.finder':'sky.telescope')}</span>{objects.some(o=>o.masked)&&<span data-testid="sky-names-hidden">{OBJECT_X_LAB_EN.namesHidden}</span>}</div>
    <svg className="sky-map" viewBox="0 0 700 700" role="img" aria-label={t('sky.chartLabel')} data-testid="sky-map"><defs><clipPath id="sky-clip"><rect width="700" height="700"/></clipPath></defs><rect width="700" height="700" fill="#061a29"/>
    <g className="sky-grid">{[175,350,525].map(n=><g key={n}><line x1={n} x2={n} y1="0" y2="700"/><line x1="0" x2="700" y1={n} y2={n}/></g>)}</g>
    {active&&<g clipPath="url(#sky-clip)">{points.map(p=><circle key={p.index} cx={p.x} cy={p.y} r={Math.max(.7,Math.min(2.8,(13-p.magnitude)*.22))} fill="#d8eafa" opacity=".8"/>)}{objects.map(({object,masked,x,y})=>masked?<g key={object.id} className="sky-object sky-object-hidden"><circle cx={x} cy={y} r="9" fill="transparent" stroke="#81c8b8" strokeWidth="1.5"/></g>:<g key={object.id} className="sky-object" onClick={()=>onSelect(object)}><circle cx={x} cy={y} r="9" fill="transparent" stroke={object.id===selected.id?'#e4bb75':'#81c8b8'} strokeWidth="1.5"/><text x={x+13} y={y+4}>{object.label}</text></g>)}</g>}
    <g className="sky-crosshair"><path d="M333 350h12m10 0h12M350 333v12m0 10v12"/><circle cx="350" cy="350" r="3"/></g><text className="sky-cardinal" x="350" y="25" textAnchor="middle">N</text><text className="sky-cardinal" x="18" y="350">E</text></svg>
    <div className="sky-caption" aria-live="polite">{error?<span role="alert">{error}</span>:loading?t('sky.loading'):t('sky.count',{count:formatNumber(points.length)})}<span>{t('sky.coverage')}</span></div></div>;
});

/** Review 2 finding 5: an engine Hubble target names its own recorded telescopes and the brightness bound, never "0.4m only". */
function engineTelescopeNote(id:string,telescope:string):string|null{
 const x=hubbleExtendedTarget(id);if(!x||x.route!=='engine')return null;
 return t('hubblePoint.telescopeBound',{id,telescope,telescopes:x.telescopes.map(i=>opticalProfile(i).name).join(' and ')});
}
export default function OpenVireo(){
  const route=()=>location.hash==='#variable-stars'?'variable-stars' as const:location.hash==='#object-x'?'object-x' as const:location.hash==='#lss-survey'?'lss-survey' as const:location.hash==='#lss-wedge'?'lss-wedge' as const:location.hash==='#pulsar-analysis'?'pulsar-analysis' as const:location.hash==='#radio-control'?'radio-control' as const:location.hash==='#images'?'images' as const:location.hash==='#cluster-database'?'cluster-database' as const:location.hash==='#photometer'?'photometer' as const:location.hash==='#classification'?'classification' as const:location.hash==='#galaxy-exposure'?'galaxy-exposure' as const:location.hash==='#star-exposure'?'star-exposure' as const:location.hash==='#sky-exposure'?'sky-exposure' as const:location.hash==='#spectrometer'?'spectrometer' as const:['#spectrum','#measurement-log'].includes(location.hash)?'spectrum' as const:'observatory' as const;
  const [view,setView]=useState<Route>(route),[open,setOpen]=useState(false),[mode,setMode]=useState<FieldMode>('finder'),[hasPointed,setHasPointed]=useState(false);
  const [selected,setSelected]=useState<SkyObject>(initial),[pointing,setPointing]=useState<Pointing>(initial);
  const [ra,setRa]=useState(initial.ra.toString()),[dec,setDec]=useState(initial.dec.toString()),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const [library,setLibrary]=useState<Library|null>(null),[loadingLibrary,setLoadingLibrary]=useState(false),[libraryError,setLibraryError]=useState('');
  const analyzerController=useRef<AnalysisController>(null),restoreToken=useRef(0);
  const [analysisIsStar,setAnalysisIsStar]=useState(false),[restoredStar,setRestoredStar]=useState<{token:number;observation:StarObservation}|null>(null);
  const [galaxyTargetId,setGalaxyTargetId]=useState('36773');
  const [galaxyVisited,setGalaxyVisited]=useState(location.hash==='#galaxy-exposure');
  const [restoredGalaxy,setRestoredGalaxy]=useState<{token:number;observation:GalaxyObservation}|null>(null);
  useEffect(()=>{if(view==='galaxy-exposure')setGalaxyVisited(true);},[view]);
  const galaxyExposureView=useRef<HTMLDivElement>(null);
  const [starVisited,setStarVisited]=useState(location.hash==='#star-exposure');
  useEffect(()=>{if(view==='star-exposure')setStarVisited(true);},[view]);
  const starExposureView=useRef<HTMLDivElement>(null);
  const [skyProfilesVisited,setSkyProfilesVisited]=useState(false);
 const [skyVisited,setSkyVisited]=useState(location.hash==='#sky-exposure');
  useEffect(()=>{if(view==='sky-exposure'){setSkyVisited(true);}},[view]);
  const skyExposureView=useRef<HTMLDivElement>(null);
  const [classificationWorkspace,setClassificationWorkspace]=useState<ClassificationWorkspace>(EMPTY_CLASSIFICATION_WORKSPACE),[classificationArchive,setClassificationArchive]=useState<readonly AcquisitionObservation[]>([]),[investigationBusy,setInvestigationBusy]=useState(false);
  const classificationView=useRef<HTMLDivElement>(null),classificationController=useRef<ClassificationController>(null);
  // Stellar classification (E03) guide: progress recomputed from the workspace and the lab's reported view state (no stored checkmarks).
  const classificationGuide=useRef<HTMLDialogElement>(null),[classificationSummary,setClassificationSummary]=useState<ClassificationExerciseSummary>(EMPTY_CLASSIFICATION_EXERCISE_SUMMARY);
  const classificationProgress=useMemo(()=>classificationLabProgress(classificationWorkspace,classificationSummary),[classificationWorkspace,classificationSummary]);
  const [pulsarVisited,setPulsarVisited]=useState(location.hash==='#pulsar-analysis');
  useEffect(()=>{if(view==='pulsar-analysis')setPulsarVisited(true);},[view]);
  const pulsarView=useRef<HTMLDivElement>(null);
  // Supplied saved-row viewer: a separate, lazily mounted disclosure under the PLR route. It stays mounted once opened
  // (temporary state kept across route changes and closing) and is active only while shown and no project operation runs.
  // Its onModalChange reports the logical Find session (open or waiting behind another native dialog), shown in the summary.
  const [savedRowsVisited,setSavedRowsVisited]=useState(false),[savedRowsOpen,setSavedRowsOpen]=useState(false),[savedFindSession,setSavedFindSession]=useState(false);
  // Radio telescope control: its own route; the workspace keeps its state and timers once visited (hidden-route slews continue).
  const [radioVisited,setRadioVisited]=useState(location.hash==='#radio-control');
  useEffect(()=>{if(view==='radio-control')setRadioVisited(true);},[view]);
  const radioView=useRef<HTMLDivElement>(null);
  // Presented (not latent) radio dialog or box: it makes the App header and investigation toolbar inert, and the route
  // heading does not take focus from it. The ref is set in the panel's layout phase, before this component's effects.
  const radioPresented=useRef(false),[radioModalPresented,setRadioModalPresented]=useState(false);
  // One temporary HTL document shared by the observatory Hot List editor and the radio Slew ▸ Hot List (not persisted).
  const hotList=useSharedHotList();
  // R-RX4: one current pulsar dataset shared by the receiver Record path and Pulsar Analysis (kept by Save investigation).
  const pulsarData=useSharedPulsarData();
  const trackRadioModal=useCallback((presented:boolean)=>{radioPresented.current=presented;setRadioModalPresented(presented);},[]);
  // Pulsars (E06) guide: progress recomputed from the reported Radio and analysis state and the current dataset (no stored checkmarks).
  const pulsarGuide=useRef<HTMLDialogElement>(null);
  // E02 guide: progress from the survey's reported summary plus whether its current records were saved or restored.
  const lssGuide=useRef<HTMLDialogElement>(null),[lssSummary,setLssSummary]=useState<Omit<LssLabSummary,'saved'>>(INITIAL_LSS_LAB_SUMMARY),[lssSavedRecords,setLssSavedRecords]=useState(-1);
  const lssProgress=lssLabProgress({...lssSummary,saved:lssSummary.records>0&&lssSavedRecords===lssSummary.records});
  const [radioExercise,setRadioExercise]=useState<RadioExerciseSummary>(INITIAL_RADIO_EXERCISE_SUMMARY);
  const [pulsarMeasurements,setPulsarMeasurements]=useState<PulsarMeasurementSummary>(EMPTY_PULSAR_MEASUREMENT_SUMMARY);
  // Phase 1 item 1.5 Save/Restore investigation of the Radio workspace, the current dataset and the pulsar measurements.
  // The controllers read the mounted Radio route and Pulsar Analysis; a restore remounts them (new keys) from rebuilt states.
  // The mark records which dataset (object, generation) and confirmed list a Save prepared or a Restore brought back.
  const radioController=useRef<RadioRouteController|null>(null),pulsarController=useRef<PulsarAnalysisController|null>(null);
  const [radioRestore,setRadioRestore]=useState<{token:number;workspace:RestoredRadioWorkspace;snapshot:RadioWorkspaceSnapshot}|null>(null);
  const [pulsarRestore,setPulsarRestore]=useState<{token:number;restore:PulsarAnalysisRestore;snapshot:PulsarAnalysisSnapshot|null}|null>(null);
  const [pulsarListKey,setPulsarListKey]=useState('[]'),[pulsarMark,setPulsarMark]=useState<PulsarInvestigationMark|null>(null);
  const radioBlock=useRef<{kind:'save';reason:RadioSaveBlock}|{kind:'restore';reason:RadioRestoreBlock}|null>(null);
  // Read through a call: prepareRadio/checkRadioRestore set the ref inside the awaited Save/Restore, which a direct read
  // after the earlier null assignment would not see (control-flow narrowing ignores the callbacks).
  const lastRadioBlock=()=>radioBlock.current;
  const onConfirmedList=useCallback((list:readonly Readonly<{sequence:number;panel:number;fields:object}>[])=>setPulsarListKey(pulsarListStamp(list)),[]);
  const investigation=pulsarInvestigationState(pulsarMark,{data:pulsarData.doc.data,generation:pulsarData.doc.generation,listStamp:pulsarListKey});
  const pulsarProgress=useMemo(()=>pulsarLabProgress({radio:radioExercise,analysis:pulsarMeasurements,captureRows:pulsarDataRows(pulsarData.doc.data),investigation}),[radioExercise,pulsarMeasurements,pulsarData.doc,investigation]);
  const [wedgeVisited,setWedgeVisited]=useState(location.hash==='#lss-wedge');
  useEffect(()=>{if(view==='lss-wedge')setWedgeVisited(true);},[view]);
  const wedgeView=useRef<HTMLDivElement>(null);
  // E02 LSS survey route: mounted once visited; own records reach the wedge through an explicit handoff token.
  // E08 Object X route: mounted once visited; the observatory camera asks it for moving asteroids and hands it each image.
  const [objectXVisited,setObjectXVisited]=useState(location.hash==='#object-x');
  useEffect(()=>{if(view==='object-x')setObjectXVisited(true);},[view]);
  // Front V variable-star route: mounted once visited; its state is a browsing aid and is not saved with the investigation.
  const [variableStarsVisited,setVariableStarsVisited]=useState(location.hash==='#variable-stars'),variableStarsView=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(view==='variable-stars')setVariableStarsVisited(true);},[view]);
  const objectXView=useRef<HTMLDivElement>(null),objectXGuide=useRef<HTMLDialogElement>(null),objectXController=useRef<ObjectXController|null>(null);
  const objectXCurrent=useRef<ObjectXInvestigation|null>(null),objectXToken=useRef(0),[objectXRestore,setObjectXRestore]=useState<{token:number;investigation:ObjectXInvestigation|null}|null>(null);
  const [objectXSummary,setObjectXSummary]=useState<Omit<ObjectXLabSummary,'saved'>>(INITIAL_OBJECT_X_LAB_SUMMARY),[objectXAnswer,setObjectXAnswer]=useState<ObjectXKind|null>(null);
  const [objectXSaved,setObjectXSaved]=useState<ObjectXInvestigation|null>(null),objectXPendingRestore=useRef<ObjectXInvestigation|null>(null);
  const objectXProgress=objectXLabProgress({...objectXSummary,saved:objectXSaved!==null&&objectXSaved===objectXCurrent.current},objectXAnswer);
  // E08 hidden identity (review 2 H1): the unrevealed target's position; names of catalogue objects near it are hidden.
  const [objectXHidden,setObjectXHidden]=useState<ObjectXHiddenTarget|null>(null);
  const selectedMasked=objectXMasks(objectXHidden,selected);
  const pickerHidden=useMemo(()=>objectXHidden?(o:SkyObject)=>objectXMasks(objectXHidden,o):undefined,[objectXHidden]);
  const shownSelected:SkyObject=selectedMasked?{...selected,label:OBJECT_X_LAB_EN.hiddenName,image:null}:selected;
  function prepareObjectX():ObjectXInvestigation|null{const c=objectXCurrent.current;if(!c||(c.target===null&&!c.exposures.length&&!c.description&&!c.id&&c.answer===null))return null;return c;}
  function restoreObjectX(investigation:ObjectXInvestigation|null){
   objectXPendingRestore.current=investigation;
   if(!investigation&&!objectXCurrent.current)return;
   if(investigation)setObjectXVisited(true);
   objectXCurrent.current=investigation;setObjectXRestore({token:++objectXToken.current,investigation});
  }
  const [lssVisited,setLssVisited]=useState(location.hash==='#lss-survey');
  useEffect(()=>{if(view==='lss-survey')setLssVisited(true);},[view]);
  const lssView=useRef<HTMLDivElement>(null),lssToken=useRef(0);
  // M6 (v27): the latest E02 state for Save, and explicit restore tokens for the survey and the wedge options.
  const lssCurrent=useRef<LssSnapshot|null>(null),[lssRestore,setLssRestore]=useState<{token:number;investigation:LssInvestigation|null}|null>(null),[wedgeOptionsRestore,setWedgeOptionsRestore]=useState<{token:number;options:WedgeWorkspace['options']}|null>(null);
  function prepareLss():LssInvestigation|null{const c=lssCurrent.current;if(!c||(!c.records.length&&!c.description&&c.field===null))return null;return Object.freeze({...c,wedgeOptions:wedgeOptionsCurrent.current});}
  const lssPendingRestoreCount=useRef<number|null>(null);
  function restoreLss(lss:LssInvestigation|null){
   lssPendingRestoreCount.current=lss?lss.records.length:null;
   const token=++lssToken.current;
   // The wedge (if open, or if the file has options) loses its own LSS points and takes the file's options or the defaults.
   if(lss?.wedgeOptions)setWedgeVisited(true);
   setWedgeOptionsRestore({token,options:lss?.wedgeOptions??WEDGE_DEFAULT_OPTIONS});
   if(!lss&&!lssCurrent.current)return;
   if(lss)setLssVisited(true);setLssRestore({token,investigation:lss});
  }
  const [wedgeOwn,setWedgeOwn]=useState<(LssWedgeHandoff&{token:number})|null>(null),[wedgeAck,setWedgeAck]=useState<{token:number;accepted:boolean}|null>(null);
  // LSS Options is an aria-modal draft; its backdrop already blocks pointer hits, so the App only makes
  // its own header and investigation toolbar inert while that draft is open on the active route.
  // Route inactivity (navigation/history) and project operations still suspend and discard the draft.
  const [wedgeOptionsOpen,setWedgeOptionsOpen]=useState(false);
  const wedgeOptionsCurrent=useRef<WedgeWorkspace['options']|null>(null);
  const trackWedge=useCallback((w:WedgeWorkspace)=>{wedgeOptionsCurrent.current=w.options;setWedgeOptionsOpen(w.optionsDraft!==null);},[]);
  const [imageVisited,setImageVisited]=useState(location.hash==='#images');
  useEffect(()=>{if(view==='images')setImageVisited(true);},[view]);
  const [classificationVisited,setClassificationVisited]=useState(location.hash==='#classification');
  useEffect(()=>{if(view==='classification')setClassificationVisited(true);},[view]);
  const [clusterDatabase,setClusterDatabase]=useState<ClusterDatabaseWorkspace|null>(null);
  const [clusterObservationsVisited,setClusterObservationsVisited]=useState(false),[clusterObservationsOpen,setClusterObservationsOpen]=useState(false);
  const [clusterSelection,setClusterSelection]=useState<ClusterSelectionWorkspace|null>(null);
  const [clusterComparison,setClusterComparison]=useState<ClusterComparisonWorkspace|null>(null);
  function changeClusterDatabase(w:ClusterDatabaseWorkspace|null){setClusterSelection(null);setClusterDatabase(w);setClusterComparison(null);}
  function changeClusterComparison(w:ClusterComparisonWorkspace|null){setClusterSelection(null);if(w!==null&&comparisonHasLegacyScope(w)){const old=legacyScopeFromComparison(w);setClusterDatabase(old.loaded||old.pendingId!==''?old:null);setClusterComparison(null);}else{setClusterComparison(w);setClusterDatabase(null);}}
  function changeClusterSelection(w:ClusterSelectionWorkspace|null){if(w===null||Object.keys(w.excluded).length===0&&Object.keys(w.picked).length===0){changeClusterComparison(w?.comparison??null);}else{setClusterSelection(w);setClusterComparison(null);setClusterDatabase(null);}}
  function restoreClusterDatabase(w:ClusterDatabaseWorkspace|null){if(!w)return;if(clusterSelection!==null){changeClusterSelection(mergeLegacyClusterSelection(clusterSelection,w));}else if(clusterComparison!==null){changeClusterComparison(mergeLegacyClusterComparison(clusterComparison,w));}else setClusterDatabase(w);}

  const clusterDatabaseView=useRef<HTMLDivElement>(null);
  const [photometerVisited,setPhotometerVisited]=useState(location.hash==='#photometer');
  useEffect(()=>{if(view==='photometer')setPhotometerVisited(true);},[view]);
  const photometerView=useRef<HTMLDivElement>(null);
  const photometerController=useRef<PhotometerController>(null),photometrySnapshot=useRef<PhotometerState|null>(null);
  // Pleiades (E04) guide: progress recomputed from the shared Hot List, the actual pointing and the photometer's reported summary.
  const pleiadesGuide=useRef<HTMLDialogElement>(null);
  const [pleiadesSummary,setPleiadesSummary]=useState<PleiadesExerciseSummary>(EMPTY_PLEIADES_EXERCISE_SUMMARY);
  const [motionPreferences,setMotionPreferences]=useState<MotionPreferences|null>(null),motionPreferencesCurrent=useRef<MotionPreferences|null>(null);
  function changeMotionPreferences(w:MotionPreferences){motionPreferencesCurrent.current=readMotionPreferences(w);setMotionPreferences(motionPreferencesCurrent.current);}
  const [siteClock,setSiteClock]=useState<SiteClockWorkspace>(INITIAL_SITE_CLOCK);
  // Front B (WEB-ST-01, OB-LS-01): student site overrides (clocks/horizon only) and the optical Limit Slewing option.
  const [siteOverrides,setSiteOverrides]=useState<SiteOverrides>(NO_SITE_OVERRIDES),[opticalOptions,setOpticalOptions]=useState<OpticalOptions>(COMPILED_OPTICAL_OPTIONS);
  const [pointRefusal,setPointRefusal]=useState<Readonly<{caption:string;text:string}>|null>(null);
  const observatoryCurrent=useRef({options:opticalOptions,siteOverrides});observatoryCurrent.current={options:opticalOptions,siteOverrides};
  const observatoryClock=useObservatoryClock(['observatory','star-exposure','galaxy-exposure','sky-exposure'].includes(view)&&!investigationBusy,setPointing,opticalOptions.limitSlewing?(p,ms)=>slewLimitAllows(opticalOptions,ms,p,optical.selectedIndex,siteOverrides[optical.selectedIndex]):undefined);
  function applyClockUTC(next:SiteClockWorkspace){releaseSpectra();const old=observatoryClock.pause();if(old)observatoryClock.replace({...createClockDrive(next.utc,clockDrivePointing(old)),tracking:old.tracking});setSiteClock(next);}
  const [optical,setOptical]=useState<OpticalWorkspace>(INITIAL_OPTICAL);
  const compatibleSky=[0,1,2].includes(optical.selectedIndex),compatiblePhotometer=[0,1,2].includes(optical.selectedIndex),compatibleStar=[0,1,2].includes(optical.selectedIndex),compatibleGalaxy=[0,1,2].includes(optical.selectedIndex);
  useEffect(()=>{if(view==='sky-exposure'&&optical.selectedIndex!==0)setSkyProfilesVisited(true);},[view,optical.selectedIndex]);
  const [star4mVisited,setStar4mVisited]=useState(false),[galaxy4mVisited,setGalaxy4mVisited]=useState(false);useEffect(()=>{if(view==='star-exposure'&&optical.selectedIndex===2)setStar4mVisited(true);if(view==='galaxy-exposure'&&optical.selectedIndex===2)setGalaxy4mVisited(true);},[view,optical.selectedIndex]);
  const [galaxy09Visited,setGalaxy09Visited]=useState(false);useEffect(()=>{if(view==='galaxy-exposure'&&optical.selectedIndex===1)setGalaxy09Visited(true);},[view,optical.selectedIndex]);
  const [star09Visited,setStar09Visited]=useState(false);useEffect(()=>{if(view==='star-exposure'&&optical.selectedIndex===1)setStar09Visited(true);},[view,optical.selectedIndex]);
  // Browser scope protection; native spectrometer disables DriveBtn.
  // No native photon-stop equivalence during drift is asserted.
  function releaseSpectra(){const c=liveControllers.current;for(const item of [c.sky,c.sky09,c.sky4m,c.star,c.star09,c.star4m,...Object.values(c.galaxies),...Object.values(c.galaxies09),...Object.values(c.galaxies4m),...Object.values(c.cachedGalaxies),...Object.values(c.pegasusGalaxies),...Object.values(c.extendedGalaxies)])item?.snapshot();}
  function pauseObservationClock(){releaseSpectra();observatoryClock.pause();}
  function toggleObservationTracking(){releaseSpectra();observatoryClock.toggle(siteClock.utc,pointing);}
  function prepareTrackedField(next:Pointing){point(next);observatoryClock.prepareTracked(siteClock.utc,next);}
  // The photometer prepares its own verified field like the other instruments; the selected navigation object is unchanged.
  function preparePhotometerField(next:Pointing){setOpen(true);changeFieldMode('telescope');prepareTrackedField(next);}
  function beginSpectralClock(){return observatoryClock.start(siteClock.utc,pointing);}
  function applyOptical(next=optical){if(projectBusy)return;const result=applyOpticalTelescope(next);if(!result.changed)return;prepareObserving();preparePhotometry();setOptical(result.state);/* C5W closure L1: 0x58b528 closes an open dome through DomeSw1DownClick (0x58b741), except with Fast Scope Change on and the dome open (Front R3, 0x58b554) */const closes=telescopeChangeClosesDome(sessionOptions,open);if(closes){cueDomeSound();setOpen(false);}setError('');setNotice(t(open&&!closes?'optical.appliedDomeOpen':'optical.applied',{name:opticalProfile(result.state.selectedIndex).name}));}
  const [sharedEditing,setSharedEditing]=useState<SharedEditingWorkspace>(()=>({preparationSeedText:'1',photometry:defaultPhotometryDraft()}));
  function restoreEditing(w:EditingWorkspace){setSharedEditing({preparationSeedText:w.preparationSeedText,photometry:w.photometry});}
  const [restoredPhotometry,setRestoredPhotometry]=useState<PhotometerState|null>(null);
  function preparePhotometry(){return photometerController.current?.snapshot()??photometrySnapshot.current;}
  function restorePhotometry(s:PhotometerState|null){setSharedEditing(w=>({...w,photometry:defaultPhotometryDraft(s??undefined)}));photometrySnapshot.current=s;photometerController.current?.replace(s);setRestoredPhotometry(s);setPhotometerVisited(true);setPhotometryPairs(s);setOwnHrIssue(null);}
  // Phase 1 item 1.9: the learner's own confirmed photometer B/V pairs in a third, live Data from Observations view. The
  // mirror holds the canonical photometer state object itself (no copy); the fit and draft stay the photometer's own
  // nativeClusterFit/nativeClusterDraft. Imported DAT results and reference notebooks are separate and never written here.
  const [photometryPairs,setPhotometryPairs]=useState<PhotometerState|null>(null);
  const [ownHrVisited,setOwnHrVisited]=useState(false),[ownHrOpen,setOwnHrOpen]=useState(false),[ownHrIssue,setOwnHrIssue]=useState<'refused'|'limit'|'error'|null>(null),[ownHrFocus,setOwnHrFocus]=useState(0);
  const ownHrSummary=useRef<HTMLElement>(null),ownHrActive=useRef(false);
  /** Explicit handoff (Photometer button or guide link): synchronously stop/deactivate the photometer (no draws) and mirror
   * the canonical result before the view changes; never rely only on the hidden-route effect. */
  function openOwnHr(){
    const released=photometerController.current?photometerController.current.snapshot():photometrySnapshot.current;
    setPhotometryPairs(released);setOwnHrVisited(true);setOwnHrOpen(true);setOwnHrIssue(null);setOwnHrFocus(n=>n+1);navigate('cluster-database');
  }
  function changeOwnHrDraft(d:NativeClusterDraft|null){
    if(!ownHrActive.current||projectRunning.current)return;setOwnHrIssue(null);
    setSharedEditing(w=>{const photometry={...w.photometry};if(d===null)delete photometry.nativeClusterDraft;else photometry.nativeClusterDraft=d;return {...w,photometry};});
  }
  /** The confirmation binds to the source this render showed; the photometer controller re-checks the latest state. A guard
   * refusal (changed source, busy or inactive) is reported apart from a genuine journal-limit or core failure. */
  function confirmOwnHr(p:NativeClusterParameters):boolean{
    const r=!ownHrActive.current||projectRunning.current||projectActivity.current?null:photometerController.current?.confirmNativeCluster(photometryPairs,p)??null;
    if(r?.status==='confirmed'){setPhotometryPairs(r.state);setOwnHrIssue(null);return true;}
    setOwnHrIssue(r?.status==='failed'?r.reason:'refused');return false;
  }

  // cachedGalaxies: the 0.4 m banks of the cached-pan targets (CorBor – 1/3); pegasusGalaxies: the 0.4 m banks of NGC 7499/
  // 7501/7503. Neither exists on another telescope.
  const liveControllers=useRef<{sky09:ExposureController|null;sky4m:ExposureController|null;sky:ExposureController|null;star:ExposureController|null;star09:ExposureController|null;star4m:ExposureController|null;galaxies4m:Partial<Record<LiveGalaxyId,ExposureController|null>>;galaxies09:Partial<Record<LiveGalaxyId,ExposureController|null>>;galaxies:Partial<Record<LiveGalaxyId,ExposureController|null>>;cachedGalaxies:Partial<Record<CachedGalaxyId,ExposureController|null>>;pegasusGalaxies:Partial<Record<PegasusGalaxyId,ExposureController|null>>;extendedGalaxies:Partial<Record<string,ExposureController|null>>}>({sky09:null,sky4m:null,sky:null,star:null,star09:null,star4m:null,galaxies4m:{},galaxies09:{},galaxies:{},cachedGalaxies:{},pegasusGalaxies:{},extendedGalaxies:{}});
  // Front F (v29): extended Hubble targets keep one bank per (telescope, target) key of hubbleEngineTargets.ts.
  const emptyExtendedBanks=()=>Object.fromEntries(HUBBLE_EXTENDED_BANKS.map(key=>[key,emptyExposureWorkspace()]))as Record<string,ExposureWorkspace>;
  const emptyPegasusBanks=()=>Object.fromEntries(PEGASUS_GALAXY_IDS.map(id=>[id,emptyExposureWorkspace()]))as Record<PegasusGalaxyId,ExposureWorkspace>;
  const liveCurrent=useRef({sky09:emptyExposureWorkspace(),sky4m:emptyExposureWorkspace(),sky:emptyExposureWorkspace(),star:emptyExposureWorkspace(),star09:emptyExposureWorkspace(),star4m:emptyExposureWorkspace(),galaxies4m:Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,emptyExposureWorkspace()]))as Record<LiveGalaxyId,ExposureWorkspace>,galaxies09:Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,emptyExposureWorkspace()]))as Record<LiveGalaxyId,ExposureWorkspace>,galaxies:Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,emptyExposureWorkspace()]))as Record<LiveGalaxyId,ExposureWorkspace>,cachedGalaxies:Object.fromEntries(CACHED_GALAXY_IDS.map(id=>[id,emptyExposureWorkspace()]))as Record<CachedGalaxyId,ExposureWorkspace>,pegasusGalaxies:emptyPegasusBanks(),extendedGalaxies:emptyExtendedBanks()});
  /** The live bank of one (telescope, target) pair: cached-pan and Pegasus targets use their own 0.4 m banks. */
  const galaxyBank=(index:0|1|2,id:string)=>isHubbleExtendedId(id)?'extendedGalaxies' as const:index===0&&isCachedGalaxyId(id)?'cachedGalaxies' as const:index===0&&isPegasusGalaxyId(id)?'pegasusGalaxies' as const:index===2?'galaxies4m' as const:index===1?'galaxies09' as const:'galaxies' as const;
  const bankKey=(index:0|1|2,id:string)=>isHubbleExtendedId(id)?extendedBankKey(id,index):id;
  const setGalaxyController=(index:0|1|2,id:string,c:ExposureController|null)=>{(liveControllers.current[galaxyBank(index,id)] as Partial<Record<string,ExposureController|null>>)[bankKey(index,id)]=c;};
  const setGalaxyWorkspace=(index:0|1|2,id:string,w:ExposureWorkspace)=>{(liveCurrent.current[galaxyBank(index,id)] as Record<string,ExposureWorkspace>)[bankKey(index,id)]=w;};
  const galaxyWorkspace=(live:typeof liveCurrent.current,index:0|1|2,id:string)=>(live[galaxyBank(index,id)] as Record<string,ExposureWorkspace>)[bankKey(index,id)];
  const [initialLive,setInitialLive]=useState(liveCurrent.current);
  function prepareObserving():ObservingWorkspace{
    const clockDrive=observatoryClock.pause()??(skyProfilesVisited?createClockDrive(siteClock.utc,pointing):null);
    setProjectNotice('');setProjectError('');classificationController.current?.prepareInvestigation();
    const sky=liveControllers.current.sky?.snapshot()??liveCurrent.current.sky,star=liveControllers.current.star?.snapshot()??liveCurrent.current.star;
    const galaxies=Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,liveControllers.current.galaxies[id]?.snapshot()??liveCurrent.current.galaxies[id]]))as Record<LiveGalaxyId,ExposureWorkspace>;
    const star09=liveControllers.current.star09?.snapshot()??liveCurrent.current.star09;
    const galaxies09=Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,liveControllers.current.galaxies09[id]?.snapshot()??liveCurrent.current.galaxies09[id]]))as Record<LiveGalaxyId,ExposureWorkspace>;
    const star4m=liveControllers.current.star4m?.snapshot()??liveCurrent.current.star4m,galaxies4m=Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,liveControllers.current.galaxies4m[id]?.snapshot()??liveCurrent.current.galaxies4m[id]]))as Record<LiveGalaxyId,ExposureWorkspace>;
    const cachedGalaxies=Object.fromEntries(CACHED_GALAXY_IDS.map(id=>[id,liveControllers.current.cachedGalaxies[id]?.snapshot()??liveCurrent.current.cachedGalaxies[id]]))as Record<CachedGalaxyId,ExposureWorkspace>;
    const pegasusGalaxies=Object.fromEntries(PEGASUS_GALAXY_IDS.map(id=>[id,liveControllers.current.pegasusGalaxies[id]?.snapshot()??liveCurrent.current.pegasusGalaxies[id]]))as Record<PegasusGalaxyId,ExposureWorkspace>;
    const extendedGalaxies=Object.fromEntries(HUBBLE_EXTENDED_BANKS.map(key=>[key,liveControllers.current.extendedGalaxies[key]?.snapshot()??liveCurrent.current.extendedGalaxies[key]]))as Record<string,ExposureWorkspace>;
    const context={domeOpen:open,mode,selectedId:selected.id,pointing:clockDrive?clockDrivePointing(clockDrive):{ra:pointing.ra,dec:pointing.dec},raText:ra,decText:dec,hasPointed,galaxyTargetId};
    // The cached-pan and Pegasus banks are carried only when used, so other sessions keep their existing format version.
    return {...(skyProfilesVisited?{sky09:liveControllers.current.sky09?.snapshot()??liveCurrent.current.sky09,sky4m:liveControllers.current.sky4m?.snapshot()??liveCurrent.current.sky4m}:{}),...(clockDrive?{clockDrive,operationalAccess:true as const}:{}),siteClock,star4m,galaxies4m,galaxies09,star09,context,sky,star,galaxies,...(observingUsesCachedGalaxies({context,cachedGalaxies})?{cachedGalaxies}:{}),...(observingUsesPegasusGalaxies({context,pegasusGalaxies})?{pegasusGalaxies}:{}),...(observingUsesExtendedGalaxies({context,extendedGalaxies})?{extendedGalaxies}:{})};
  }
  function restoreObserving(w:ObservingWorkspace){
    const oldDrive=observatoryClock.pause();if(w.clockDrive)observatoryClock.replace(w.clockDrive);else if(oldDrive)observatoryClock.replace(w.siteClock&&w.siteClock.utc!==oldDrive.utc?{...createClockDrive(w.siteClock.utc,w.context.pointing),tracking:oldDrive.tracking}:repointClockDrive(oldDrive,w.context.pointing));
    if(w.sky09)setSkyProfilesVisited(true);liveCurrent.current={sky09:w.sky09??liveCurrent.current.sky09,sky4m:w.sky4m??liveCurrent.current.sky4m,star4m:w.star4m??liveCurrent.current.star4m,galaxies4m:w.galaxies4m?{...w.galaxies4m}:liveCurrent.current.galaxies4m,sky:w.sky,star:w.star,star09:w.star09??liveCurrent.current.star09,galaxies09:w.galaxies09?{...w.galaxies09}:liveCurrent.current.galaxies09,galaxies:{...w.galaxies},cachedGalaxies:w.cachedGalaxies?{...w.cachedGalaxies}:Object.fromEntries(CACHED_GALAXY_IDS.map(id=>[id,emptyExposureWorkspace()]))as Record<CachedGalaxyId,ExposureWorkspace>,pegasusGalaxies:w.pegasusGalaxies?{...w.pegasusGalaxies}:emptyPegasusBanks(),extendedGalaxies:w.extendedGalaxies?{...w.extendedGalaxies}:emptyExtendedBanks()};setInitialLive(liveCurrent.current);setRestoredStar(null);setRestoredGalaxy(null);
    liveControllers.current.sky?.replace(w.sky);if(w.sky09)liveControllers.current.sky09?.replace(w.sky09);if(w.sky4m)liveControllers.current.sky4m?.replace(w.sky4m);liveControllers.current.star?.replace(w.star);if(w.star09)liveControllers.current.star09?.replace(w.star09);for(const id of LIVE_GALAXY_IDS)liveControllers.current.galaxies[id]?.replace(w.galaxies[id]);
    if(w.galaxies09)for(const id of LIVE_GALAXY_IDS)liveControllers.current.galaxies09[id]?.replace(w.galaxies09[id]);
    if(w.star4m)liveControllers.current.star4m?.replace(w.star4m);if(w.galaxies4m)for(const id of LIVE_GALAXY_IDS)liveControllers.current.galaxies4m[id]?.replace(w.galaxies4m[id]);
    for(const id of CACHED_GALAXY_IDS)liveControllers.current.cachedGalaxies[id]?.replace(liveCurrent.current.cachedGalaxies[id]);
    for(const id of PEGASUS_GALAXY_IDS)liveControllers.current.pegasusGalaxies[id]?.replace(liveCurrent.current.pegasusGalaxies[id]);
    for(const key of HUBBLE_EXTENDED_BANKS)liveControllers.current.extendedGalaxies[key]?.replace(liveCurrent.current.extendedGalaxies[key]);
    if(w.siteClock)setSiteClock(w.siteClock);
    const c=w.context;setOpen(c.domeOpen);setMode(c.mode);setSelected(catalog.find(o=>o.id===c.selectedId)!);setPointing(c.pointing);setRa(c.raText);setDec(c.decText);setHasPointed(c.hasPointed);setGalaxyTargetId(c.galaxyTargetId);setError('');setNotice('');
  }
  /** Save: the shared dataset guards, then Pulsar Analysis and the Radio route (or the restored snapshot of a route not mounted
   * yet). The assembled part is read back and rebuilt here, so a Save never writes what Restore would refuse. */
  function prepareRadio():RadioPrepare{
    radioBlock.current=null;
    const block=(reason:RadioSaveBlock):RadioPrepare=>{radioBlock.current={kind:'save',reason};return {kind:'blocked',reason};};
    const doc=pulsarData.current();
    if(doc.lease)return block('capture');if(doc.output)return block('output');if(doc.analysis.reading)return block('analysis-reading');if(doc.analysis.modal)return block('analysis-dialog');
    let analysis:PulsarAnalysisSnapshot|null=pulsarRestore?.snapshot??null,workspace:RadioWorkspaceSnapshot|null=radioRestore?.snapshot??null;
    if(pulsarController.current){const r=pulsarController.current.snapshot(doc);if(!r.ok)return block(r.reason);analysis=r.snapshot;}
    if(radioController.current){const r=radioController.current.snapshot();if(!r.ok)return block(r.reason);workspace=r.snapshot;}
    const data=pulsarDataSnapshot(doc.data);
    if(workspace===null&&data.kind==='none'&&(analysis===null||analysis.list.length===0))return {kind:'none'};
    if(analysis?.view&&(data.kind==='none'||data.kind==='cleared'))analysis={...analysis,view:null};
    const snapshot:RadioInvestigation=Object.freeze({workspace,data,analysis});
    try{
      const check=data.kind==='file'?{...snapshot,data:{...data,sha256:'0'.repeat(64)}}:snapshot;
      rebuildRadioInvestigation(readRadioInvestigation(JSON.parse(radioInvestigationText(check))),{plr:isFileData(doc.data)?doc.data:null,recordedCatalog:null});
    }catch{return block('radio-profile');}
    const mark:PulsarInvestigationMark=Object.freeze({kind:'prepared',data:doc.data,generation:doc.generation,listStamp:pulsarListStamp(analysis?.list??[])});
    return {kind:'ready',snapshot,onSaved:()=>setPulsarMark(mark)};
  }
  /** Restore guards on the latest dataset (also re-checked after the file was read). */
  function checkRadioRestore():RadioRestoreBlock|null{
    const doc=pulsarData.current();
    const reason:RadioRestoreBlock|null=doc.lease?'capture':doc.output?'output':doc.analysis.reading?'analysis-reading':doc.analysis.modal?'analysis-dialog':null;
    radioBlock.current=reason?{kind:'restore',reason}:null;
    return reason;
  }
  /** Apply a fully checked and rebuilt Radio part: the dataset first (refused unchanged if unsafe), then remount Pulsar
   * Analysis and, when the file has one, the Radio route from the rebuilt states. Nothing runs automatically afterwards. */
  function restoreRadio(record:RadioInvestigationRecord):boolean{
    const p=record.prepared;
    if(!p||(p.workspace!==null&&p.workspace.reference===null)||checkRadioRestore())return false;
    const step=pulsarData.update(d=>replacePulsarCurrentData(d,p.data));
    if(!step.ok)return false;
    const token=++restoreToken.current,generation=step.doc.generation;
    const restore:PulsarAnalysisRestore=Object.freeze({state:p.analysis.state,adoptedGeneration:p.analysis.presented||p.data===null?generation:0,
      digest:isFileData(p.data)&&p.fileSha256!==null?Object.freeze({recording:p.data,sha256:p.fileSha256}):null});
    const stamp=pulsarListStamp(p.analysis.state.list);
    setPulsarRestore({token,restore,snapshot:record.snapshot.analysis});setPulsarListKey(stamp);
    setPulsarMark(Object.freeze({kind:'restored',data:step.doc.data,generation,listStamp:stamp}));setPulsarVisited(true);
    if(p.workspace!==null&&record.snapshot.workspace!==null){setRadioRestore({token,workspace:p.workspace,snapshot:record.snapshot.workspace});setRadioVisited(true);}
    return true;
  }
  const [projectLocalBusy,setProjectLocalBusy]=useState(false),[projectNotice,setProjectNotice]=useState(''),[projectError,setProjectError]=useState('');
  const projectEpoch=useRef(0),projectRunning=useRef(false),projectActivity=useRef(false);const projectBusy=projectLocalBusy||investigationBusy;projectActivity.current=projectBusy;
  // Latest own-view availability for its handlers (not a boolean captured by an earlier render's callback).
  ownHrActive.current=view==='cluster-database'&&ownHrOpen&&!projectBusy;
  useEffect(()=>{if(projectBusy)observatoryClock.pause();},[projectBusy]);
  function cancelProject(){projectEpoch.current++;projectRunning.current=false;setProjectLocalBusy(false);analyzerController.current?.cancelSessionOperation();classificationController.current?.cancelInvestigation();setProjectError('');setProjectNotice(t('project.cancelled'));}
  function radioBlockText(blocked:NonNullable<typeof radioBlock.current>){const reason=t(`project.radioBlock.${blocked.reason}`);return blocked.kind==='save'?t('project.radioBlocked',{reason}):t('project.radioRestoreBlocked',{reason});}
  /** Save (no file), Restore (file) or, with `deliver`, Save to a destination other than a download (Front F2: the optional
   * cloud account, which reports its own delivery failures). Returns whether it succeeded. */
  async function projectOperation(file?:File,deliver?:SessionDelivery):Promise<boolean>{
    if(projectRunning.current||investigationBusy)return false;
    // Phase 1 item 1.5 preflight: the latest Radio/Pulsar guards run before any epoch, running or busy change, so a refused
    // operation starts no project span whose busy effects could abandon an owned capture lease or .PLR write. A ready result
    // grants nothing: Save prepares again and Restore re-checks at their own boundaries, also after every await.
    if(file?checkRadioRestore()!==null:prepareRadio().kind==='blocked'){const early=lastRadioBlock();if(early){setProjectNotice('');setProjectError(radioBlockText(early));return false;}}
    const id=++projectEpoch.current;projectRunning.current=true;setProjectLocalBusy(true);setProjectError('');setProjectNotice('');
    radioBlock.current=null;
    let undelivered=false;
    const ok=file?await analyzerController.current?.restoreSessionFile(file):await analyzerController.current?.saveSession(deliver&&(async(text,signal)=>{try{await deliver(text,signal);}catch(e){undelivered=true;throw e;}}));
    if(id!==projectEpoch.current)return false;projectRunning.current=false;setProjectLocalBusy(false);
    const blocked=lastRadioBlock();
    if(ok){setProjectNotice(t(file?'project.restored':'project.saved'));setObjectXSaved(file?objectXPendingRestore.current:objectXCurrent.current);setLssSavedRecords(file?(lssPendingRestoreCount.current??-1):(lssCurrent.current?.records.length??-1));}
    else if(blocked)setProjectError(radioBlockText(blocked));
    else if(!undelivered)setProjectError(t(file?'project.restoreError':'project.saveError'));
    return !!ok;
  }
  useEffect(()=>{const hide=()=>{if(document.visibilityState==='hidden'&&(projectRunning.current||investigationBusy))cancelProject();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[investigationBusy]);

  const about=useRef<HTMLDialogElement>(null),labGuide=useRef<HTMLDialogElement>(null);
  const [labProgress,setLabProgress]=useState(()=>hubbleLabProgress([],[],EMPTY_HUBBLE));
  const imageView=useRef<HTMLDivElement>(null),observatoryView=useRef<HTMLDivElement>(null),spectrometerView=useRef<HTMLDivElement>(null),analyzerView=useRef<HTMLDivElement>(null),previousView=useRef(view);
  useEffect(()=>{if(previousView.current===view)return;previousView.current=view;const element=({'variable-stars':variableStarsView,'object-x':objectXView,'lss-survey':lssView,'lss-wedge':wedgeView,'pulsar-analysis':pulsarView,'radio-control':radioView,images:imageView,observatory:observatoryView,spectrometer:spectrometerView,spectrum:analyzerView,'sky-exposure':skyExposureView,'star-exposure':starExposureView,'galaxy-exposure':galaxyExposureView,classification:classificationView,photometer:photometerView,'cluster-database':clusterDatabaseView}[view]).current;
    // A tool that reopened its native modal dialog (PLR record/clear, saved-row Find) during layout owns focus there, and so
    // does a presented radio dialog or box. A pending radio dialog of a hidden route is not rendered and does not count.
    // Find can close in the same commit that reveals a pending radio box. Its observer presents the box afterwards;
    // avoid an intermediate h1 focus in that handoff. Only the active, non-busy radio route advertises pending state.
    if(document.querySelector('dialog:modal')||radioPresented.current||view==='radio-control'&&radioView.current?.querySelector('[data-modal-pending="true"]'))return;element?.querySelector<HTMLElement>('h1')?.focus();},[view]);
  // An explicit own-HR handoff focuses its disclosure after (declared after) the route heading focus above.
  useEffect(()=>{if(ownHrFocus===0)return;const summary=ownHrSummary.current;summary?.scrollIntoView?.({block:'start'});summary?.focus();},[ownHrFocus]);
  useEffect(()=>{const update=()=>{observatoryClock.stopMotion();if(projectActivity.current)cancelProject();setView(route());};addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update);},[]);
  const inView=project(selected,pointing,FIELDS[mode]).visible;
  const centered=targetCentered(selected,pointing,FIELDS[mode]);
  const nativeGate={tracking:observatoryClock.state?.tracking===true,moving:observatoryClock.moving,finder:mode==='finder',domeOpen:open};
  const starAccess=instrumentAccess({...nativeGate,configurationAvailable:compatibleStar,pointingMatches:selected.id===supportedStar.id&&pointing.ra===StarPoint.ra&&pointing.dec===StarPoint.dec});
  const supportedPointing=starAccess==='ready';
  const selectedGalaxy=supportedGalaxies.find(g=>g.id===selected.id);
  // A cached-pan target is verified on the 0.4 m only: other telescopes report an unavailable configuration (never switched).
  const galaxyPairSupported=(id:string)=>galaxyTargetTelescopeSupported(id,optical.selectedIndex);
  const galaxyAccess=instrumentAccess({...nativeGate,configurationAvailable:compatibleGalaxy&&(!selectedGalaxy||galaxyPairSupported(selectedGalaxy.id.replace('-acquisition',''))),pointingMatches:!!selectedGalaxy&&pointing.ra===selectedGalaxy.ra&&pointing.dec===selectedGalaxy.dec});
  const supportedGalaxyPointing=galaxyAccess==='ready';
  const skyAccess=instrumentAccess({...nativeGate,configurationAvailable:compatibleSky,pointingMatches:pointing.ra===.5&&pointing.dec===0});
  const requestedGalaxyAccess=instrumentAccess({...nativeGate,configurationAvailable:compatibleGalaxy&&galaxyPairSupported(galaxyTargetId),pointingMatches:selectedGalaxy?.id===galaxyTargetId+'-acquisition'&&pointing.ra===selectedGalaxy.ra&&pointing.dec===selectedGalaxy.dec});
  // Hubble.HTL: the row last pointed from the hot list. Its rounded coordinates never certify acquisition; the explicit
  // "use exact catalogue centre" action selects the supported acquisition target and points at its catalogue centre.
  const [hubbleRow,setHubbleRow]=useState<HubbleHotListRow|null>(null);
  const hubbleTarget=hubbleRow?.supported?supportedGalaxies.find(g=>g.id===`${hubbleRow.targetId}-acquisition`)??null:null;
  const hubbleRelation=hubbleRow?hubblePointing(hubbleRow,pointing,hubbleTarget?{ra:hubbleTarget.ra,dec:hubbleTarget.dec}:null):'other';
  const hubbleStatus=hubbleRow?hubbleRowStatus(hubbleRow,optical.selectedIndex):null;
  function pointHubbleCentre(){if(!hubbleTarget||projectBusy||!open)return;const next={ra:hubbleTarget.ra,dec:hubbleTarget.dec};if(limitRefuses(next))return;setSelected(hubbleTarget);point(next,hubbleTarget.label);}
  const currentAccess=view==='sky-exposure'?skyAccess:view==='galaxy-exposure'?requestedGalaxyAccess:view==='star-exposure'?starAccess:selected.id===supportedStar.id?starAccess:galaxyAccess;
  function openGalaxy(){if(selectedGalaxy)setGalaxyTargetId(selectedGalaxy.id.replace('-acquisition',''));navigate('galaxy-exposure');}
  function restoreStarPacket(observation:StarObservation){prepareObserving();preparePhotometry();const index=starTelescopeIndex(observation.state);setOptical({selectedIndex:index,draftIndex:index});setOpen(false);if(index===2)setStar4mVisited(true);if(index===1)setStar09Visited(true);setStarVisited(true);setRestoredStar({token:++restoreToken.current,observation});navigate('star-exposure');}
  function classifyAcquired(packet:StarObservation){if(!analyzerController.current)throw errorFor('continuity.busy');analyzerController.current.acceptAcquisition(packet);setClassificationArchive(a=>a.some(p=>p.acquisitionId===packet.acquisitionId)?a:[...a,packet]);setClassificationWorkspace(w=>openAcquiredClassification(w,packet));setClassificationVisited(true);navigate('classification');}
  function classifyImported(source:ClassificationImport){const next=openImportedClassification(classificationWorkspace,source);setClassificationWorkspace(next);setClassificationVisited(true);navigate('classification');}
  const canAccess=!observatoryClock.moving&&open&&mode==='telescope'&&hasPointed&&centered;
  useEffect(()=>{
    setLibrary(null);setLibraryError('');
    if(!canAccess||!selected.spectrum){setLoadingLibrary(false);return;}
    let current=true;const abort=new AbortController(),spectrum=selected.spectrum;setLoadingLibrary(true);
    (async()=>{
      const {samples,sha256}=await loadVerifiedLibrarySpectrum(spectrum,abort.signal);
      if(current)setLibrary({targetId:selected.id,target:selected.label,name:spectrum.name,sha256,samples});
    })().catch(()=>{if(current)setLibraryError(t('sky.referenceLoadError'));}).finally(()=>{if(current)setLoadingLibrary(false);});
    return()=>{current=false;abort.abort();};
  },[selected,canAccess]);
  function navigate(next:Route){observatoryClock.stopMotion();if(projectRunning.current||investigationBusy)cancelProject();setView(next);location.hash=next;}
  // F2 (Limit Slewing, OB-LS-02): the immediate web pointing shortcuts (Point telescope, Point to coordinates, pan, HTL Point,
  // Hubble exact centre) are refused below the horizon with the native ProgrammedSlew box. Instrument "Activate" jumps to a fixed
  // acquisition field (prepareTrackedField) are not checked (adaptation, docs/OPTICAL-OBSERVATORY.md).
  // A refusal changes nothing but the box: callers check it BEFORE selecting a target or a hot-list row (review note 1).
  function limitRefuses(next:Pointing):boolean{
    if(opticalOptions.limitSlewing&&!slewLimitAllows(opticalOptions,observatoryClock.state?clockDriveUTMS(observatoryClock.state):parseClockUTC(siteClock.utc),next,optical.selectedIndex,siteOverrides[optical.selectedIndex])){setPointRefusal({caption:OPTICAL_SLEW_LITERALS.belowCaption,text:opticalSlewBelowText(next)});return true;}
    return false;
  }
  function pointChecked(next:Pointing,name?:string):boolean{if(limitRefuses(next))return false;point(next,name);return true;}
  function point(next:Pointing,name?:string){if(name&&objectXMasks(objectXHidden,next))name=OBJECT_X_LAB_EN.hiddenName;observatoryClock.repoint(next);setPointing(next);setRa(next.ra.toString());setDec(next.dec.toString());setHasPointed(true);setError('');setNotice(name?t('sky.pointed',{target:name}):'');}
  function changeFieldMode(next:FieldMode){observatoryClock.stopMotion();setMode(next);}
  function beginTelescopeMotion(request:MotionDirection|Pointing){
    if(projectBusy||!open||view!=='observatory')return;
    try{if(typeof request!=='string')validatePointing(request.ra,request.dec);const started=observatoryClock.beginMotion(request,motionPreferencesCurrent.current?.rateIndex??2,mode,siteClock.utc,pointing,()=>{releaseSpectra();preparePhotometry();},programmedSlewRateIndex(sessionOptionsCurrent.current.fastSlewing));if(started.phase==='complete'){setError('');setNotice(t('motion.same'));return;}changeMotionPreferences(motionPreferencesCurrent.current??{rateIndex:2});setHasPointed(true);setError('');setNotice('');}catch{setError(t('motion.invalid'));}
  }
  const activeLibrary=canAccess&&library?.targetId===selected.id?library:null;
  const pointedPleiades=pleiadesStarAt(pointing);
  // The selected telescope's checked photometer domain (the existing isPhotometerTelescopeTarget). It is loaded with the lazy
  // photometer modules once a PLEIADES.HTL row is pointed or listed, so the photometer field JSON stays out of the App bundle.
  const [photometerDomain,setPhotometerDomain]=useState<typeof PhotometerDomain|null>(null);
  const needsPhotometerDomain=pointedPleiades!==null||!!hotList.doc.editor?.list.some(row=>pleiadesRowIdentity(row)!==null);
  useEffect(()=>{if(!needsPhotometerDomain||photometerDomain)return;let current=true;import('./core/photometerTelescope').then(m=>{if(current)setPhotometerDomain(m);},()=>{});return()=>{current=false;};},[needsPhotometerDomain,photometerDomain]);
  const admitsPhotometerTarget=useMemo(()=>{const domain=photometerDomain,index=optical.selectedIndex;return domain?(id:string)=>domain.isPhotometerTelescopeIndex(index)&&domain.isPhotometerTelescopeTarget(id,index):null;},[photometerDomain,optical.selectedIndex]);
  const pointedMeasure=pointedPleiades?pleiadesRowMeasure(pointedPleiades,admitsPhotometerTarget):null,telescopeName=opticalProfile(optical.selectedIndex).name;
  const pleiadesProgress=useMemo(()=>pleiadesLabProgress({list:isPleiadesExerciseList(hotList.doc.editor?.list),pointed:pointedMeasure==='measurable',photometer:pleiadesSummary}),[hotList.doc.editor,pointedMeasure,pleiadesSummary]);
  const hostInert=(wedgeOptionsOpen&&view==='lss-wedge'&&!projectBusy)||radioModalPresented;
  // Front O (docs/OBJECT-INFO-FORMS.md): Edit Mode (instructor, not persisted, WEB-EM-01), File › Field Information and the
  // Catalog Object / Naked Eye forms. Get Selection Data opens the Variable stars page on a record (navigation stops motion).
  const [editMode,setEditMode]=useState(false),[variableOpen,setVariableOpen]=useState<Readonly<{token:number;index:number;riseWordDefaulted?:boolean}>|null>(null),variableToken=useRef(0);
  const latestNavigate=useRef(navigate);latestNavigate.current=navigate;
  const openVariableRecord=useCallback((index:number,riseWordDefaulted=false)=>{variableToken.current+=1;setVariableOpen({token:variableToken.current,index,...(riseWordDefaulted?{riseWordDefaulted}:{})});latestNavigate.current('variable-stars');},[]);
  // Front T: one stable reader of the observatory clock's JD (latest state through a ref) for Field Information and Edit Mode.
  const observatoryJdRef=useRef<()=>number>(()=>NaN);
  observatoryJdRef.current=()=>siteClockReadingMS(observatoryClock.state?clockDriveUTMS(observatoryClock.state):parseClockUTC(siteClock.utc),optical.selectedIndex).jd;
  const observatoryJd=useCallback(()=>observatoryJdRef.current(),[]);
  // Front O2/M: VIREO's VObsBox (options+0x27d5, default off, not persisted): QSO List and Multi-Spec mode 0 read one state.
  const [virtualObservatory,setVirtualObservatory]=useState(false);
  // Front R3: the other ported Optical Simulation Options, page-session only like Edit Mode and VO (WEB-OPT-R3).
  const [sessionOptions,setSessionOptions]=useState<SessionOpticalOptions>(COMPILED_SESSION_OPTICAL_OPTIONS),sessionOptionsCurrent=useRef(sessionOptions);sessionOptionsCurrent.current=sessionOptions;
  const fieldInfo=useMemo(()=>({editMode,onEditMode:setEditMode,virtualObservatory,onVirtualObservatory:setVirtualObservatory,sessionOptions,onSessionOptions:setSessionOptions,view:mode==='finder'?'finder' as const:'instrument' as const,telescopeName:opticalProfile(optical.selectedIndex).name,onOpenVariable:openVariableRecord,currentJd:observatoryJd,hidden:objectXHidden,busy:projectBusy,driveOn:open&&!!observatoryClock.state?.tracking}),[optical.selectedIndex,editMode,virtualObservatory,sessionOptions,mode,openVariableRecord,observatoryJd,objectXHidden,projectBusy,open,observatoryClock.state?.tracking]);
  const nakedEyeUtc=()=>observatoryClock.state?clockDriveUTMS(observatoryClock.state):parseClockUTC(siteClock.utc);
  // App shell: header/sidebar with grouped tools, theme switch and the compact investigation toolbar (presentation only).
  // Front Perf: stable handlers for memoised children (renderStability.ts); each calls this render's closure at call time.
  const spectrumHandlers=useStableHandlers<StableProps<ComponentProps<typeof SpectrumInstrument>,'onPrepareRadio'|'onCheckRadioRestore'|'onRestoreRadio'|'onPrepareMotion'|'onRestoreMotion'|'onPrepareLss'|'onRestoreLss'|'onPrepareObjectX'|'onRestoreObjectX'|'onPrepareObservatory'|'onRestoreObservatory'|'onPrepareClusterSelection'|'onRestoreClusterSelection'|'onPrepareClusterDatabase'|'onRestoreClusterDatabase'|'onPrepareClusterComparison'|'onRestoreClusterComparison'|'onPrepareOptical'|'onPrepareEditing'|'onRestoreEditing'|'onPrepareObserving'|'onRestoreObserving'|'onPreparePhotometry'|'onRestorePhotometry'|'onPrepareClassification'|'onClassifyAcquisition'|'onClassifyImported'|'onRestoreClassification'|'onRestoreAcquisition'>>({
   onPrepareRadio:prepareRadio,
   onCheckRadioRestore:checkRadioRestore,
   onRestoreRadio:restoreRadio,
   onPrepareMotion:()=>motionPreferencesCurrent.current,
   onRestoreMotion:changeMotionPreferences,
   onPrepareLss:prepareLss,
   onRestoreLss:restoreLss,
   onPrepareObjectX:prepareObjectX,
   onRestoreObjectX:restoreObjectX,
   onPrepareObservatory:()=>observatoryCurrent.current.options.limitSlewing||Object.keys(observatoryCurrent.current.siteOverrides).length?observatoryCurrent.current:null,
   onRestoreObservatory:w=>{setOpticalOptions(w?.options??COMPILED_OPTICAL_OPTIONS);setSiteOverrides(w?.siteOverrides??NO_SITE_OVERRIDES);},
   onPrepareClusterSelection:()=>clusterSelection,
   onRestoreClusterSelection:changeClusterSelection,
   onPrepareClusterDatabase:()=>clusterDatabase,
   onRestoreClusterDatabase:restoreClusterDatabase,
   onPrepareClusterComparison:()=>clusterComparison,
   onRestoreClusterComparison:changeClusterComparison,
   onPrepareOptical:()=>optical,
   onPrepareEditing:()=>sharedEditing,
   onRestoreEditing:restoreEditing,
   onPrepareObserving:prepareObserving,
   onRestoreObserving:restoreObserving,
   onPreparePhotometry:preparePhotometry,
   onRestorePhotometry:restorePhotometry,
   onPrepareClassification:()=>classificationWorkspace,
   onClassifyAcquisition:classifyAcquired,
   onClassifyImported:classifyImported,
   onRestoreClassification:(w,a)=>{classificationController.current?.resetProgram();setClassificationWorkspace(w);setClassificationArchive(a);},
   onRestoreAcquisition:observation=>{if(observation.kind==='catalog-star-acquisition'){restoreStarPacket(observation);}else{prepareObserving();preparePhotometry();const index=galaxyTelescopeIndex(observation.state);setOptical({selectedIndex:index,draftIndex:index});setOpen(false);if(index===2)setGalaxy4mVisited(true);if(index===1)setGalaxy09Visited(true);setGalaxyTargetId(observation.targetId);setGalaxyVisited(true);setRestoredGalaxy({token:++restoreToken.current,observation});navigate('galaxy-exposure');}},
  });
  const cameraHandlers=useStableHandlers<StableProps<ComponentProps<typeof CameraControl>,'currentJd'|'onImage'>>({
   currentJd:()=>siteClockReadingMS(observatoryClock.state?clockDriveUTMS(observatoryClock.state):parseClockUTC(siteClock.utc),optical.selectedIndex).jd,
   onImage:image=>objectXController.current?.acceptImage(image),
  });
  // Front Perf review 1 M1: CameraControl calls extraSources after the awaits of an exposure it started; like main, it must use
  // the pointing of the render in which Start was pressed (a mid-exposure repoint keeps the exposure), so it is a
  // useCallback over pointing, not a latest-closure handler.
  const cameraExtraSources=useCallback<NonNullable<ComponentProps<typeof CameraControl>['extraSources']>>((jd,seconds,camera)=>objectXController.current?.extraSources(jd,pointing,seconds,camera)??[],[pointing]);
  const opticalHandlers=useStableHandlers<StableProps<ComponentProps<typeof OpticalTelescope>,'onDraft'|'onApply'|'onCancel'>>({
   onDraft:index=>setOptical(w=>draftOpticalTelescope(w,index)),
   onApply:()=>applyOptical(),
   onCancel:()=>setOptical(cancelOpticalTelescope),
  });
  const siteClockHandlers=useStableHandlers<StableProps<ComponentProps<typeof SiteClock>,'onApply'|'onSite'>>({
   onApply:applyClockUTC,
   onSite:next=>setSiteOverrides(o=>{const copy={...o};if(next)copy[optical.selectedIndex]=next;else delete copy[optical.selectedIndex];return Object.freeze(copy);}),
  });
  const targetPickerHandlers=useStableHandlers<StableProps<ComponentProps<typeof TargetPicker>,'onSelect'>>({
   onSelect:target=>{setSelected(target);setNotice('');},
  });
  const hotListHandlers=useStableHandlers<StableProps<ComponentProps<typeof HotListEditor>,'onPoint'>>({
   onPoint:row=>{const next={ra:row.ra,dec:row.dec};if(limitRefuses(next))return;const known=htlCatalogMatch(row,catalog);if(known)setSelected(known);setHubbleRow(hubbleRowIdentity(row));point(next,row.id);},
  });
  const spectrometerHandlers=useStableHandlers<StableProps<ComponentProps<typeof Spectrometer>,'onSeedTextChange'|'onReturn'>>({
   onSeedTextChange:text=>setSharedEditing(w=>({...w,preparationSeedText:text})),
   onReturn:()=>navigate('observatory'),
  });
  const runningClockHandlers=useStableHandlers<StableProps<ComponentProps<typeof RunningClock>,'onStart'|'onPause'|'onTracking'>>({
   onStart:()=>observatoryClock.start(siteClock.utc,pointing),
   onPause:pauseObservationClock,
   onTracking:toggleObservationTracking,
  });
  const editLayerHandlers=useStableHandlers<StableProps<ComponentProps<typeof EditModeFieldLayerLazy>,'onOpenVariable'>>({
   onOpenVariable:openVariableRecord,
  });
  // Front Perf: TelescopeMotion calls this during its render, so it is a useCallback over exactly what it reads (not a stable handler).
  const slewMenu=useCallback<NonNullable<ComponentProps<typeof TelescopeMotion>['slewMenu']>>((request,enabled)=><OpticalSlewMenu fieldInfo={fieldInfo} options={opticalOptions} onOptions={setOpticalOptions} pointing={pointing} enabled={enabled} request={request} hotList={hotList} objectId={pointing.ra===selected.ra&&pointing.dec===selected.dec?originalCatalogId(selected.id):null}/>,[fieldInfo,opticalOptions,pointing,hotList,selected]);
  const motionHandlers=useStableHandlers<StableProps<ComponentProps<typeof TelescopeMotion>,'onRate'|'onManual'|'onProgram'|'onStop'|'refuseTarget'|'onLimitDismiss'>>({
   onRate:rateIndex=>changeMotionPreferences({rateIndex}),
   onManual:beginTelescopeMotion,
   onProgram:beginTelescopeMotion,
   onStop:observatoryClock.stopMotion,
   refuseTarget:target=>opticalOptions.limitSlewing&&!slewLimitAllows(opticalOptions,observatoryClock.state?clockDriveUTMS(observatoryClock.state):parseClockUTC(siteClock.utc),target,optical.selectedIndex,siteOverrides[optical.selectedIndex])?{caption:OPTICAL_SLEW_LITERALS.belowCaption,text:opticalSlewBelowText(target)}:null,
   onLimitDismiss:()=>{setPointRefusal(null);observatoryClock.clearHorizonStop();},
  });
  const classificationHandlers=useStableHandlers<StableProps<ComponentProps<typeof ClassificationLab>,'onOpenImported'|'onSaveInvestigation'|'onRestoreInvestigation'|'onMeasure'|'onRestoreAcquisition'>>({
   onOpenImported:source=>{analyzerController.current?.acceptImported(source);navigate('spectrum');},
   onSaveInvestigation:async()=>await analyzerController.current?.saveSession()??false,
   onRestoreInvestigation:async file=>await analyzerController.current?.restoreSessionFile(file)??false,
   onMeasure:packet=>{analyzerController.current?.acceptAcquisition(packet);navigate('spectrum');},
   onRestoreAcquisition:restoreStarPacket,
  });
  const photometerHandlers=useStableHandlers<StableProps<ComponentProps<typeof Photometer>,'onDraftsChange'|'onStateChange'|'onOpenHr'>>({
   onDraftsChange:d=>setSharedEditing(w=>({...w,photometry:d})),
   onStateChange:s=>{photometrySnapshot.current=s;},
   onOpenHr:openOwnHr,
  });
  const nativeClusterHandlers=useStableHandlers<StableProps<ComponentProps<typeof NativeClusterAnalysis>,'onDraft'|'onConfirm'>>({
   onDraft:changeOwnHrDraft,
   onConfirm:confirmOwnHr,
  });
  const pulsarHandlers=useStableHandlers<StableProps<ComponentProps<typeof PulsarAnalysis>,'onConfirmedList'>>({
   onConfirmedList:onConfirmedList,
  });
  const radioHandlers=useStableHandlers<StableProps<ComponentProps<typeof RadioTelescopeRoute>,'onModalPresentedChange'|'onOpenPulsarAnalysis'>>({
   onModalPresentedChange:trackRadioModal,
   onOpenPulsarAnalysis:()=>navigate('pulsar-analysis'),
  });
  const wedgeHandlers=useStableHandlers<StableProps<ComponentProps<typeof WedgeLab>,'onWorkspaceChange'|'onOwnRecordsResult'>>({
   onWorkspaceChange:trackWedge,
   onOwnRecordsResult:(token,accepted)=>setWedgeAck({token,accepted}),
  });
  const clusterDatabaseHandlers=useStableHandlers<StableProps<ComponentProps<typeof ClusterDatabaseLab>,'onSelectionChange'|'onChange'|'onComparisonChange'|'onOpenOwn'>>({
   onSelectionChange:changeClusterSelection,
   onChange:changeClusterDatabase,
   onComparisonChange:changeClusterComparison,
   onOpenOwn:openOwnHr,
  });
  const objectXHandlers=useStableHandlers<StableProps<ComponentProps<typeof ObjectXLab>,'onClassifySpectrum'|'onSetClock'|'onPrefill'|'onOpenRadio'|'onSnapshot'|'onSummary'>>({
   // Front S's spectrum classification hand-over (called from ObjectXSpectrum after its awaits; latest closure).
   onClassifySpectrum:classifyImported,
   onSetClock:utc=>applyClockUTC({utc,draftUTC:utc}),
   onPrefill:(nextRa,nextDec)=>{setRa(nextRa.toString());setDec(nextDec.toString());navigate('observatory');},
   onOpenRadio:()=>navigate('radio-control'),
   onSnapshot:i=>{objectXCurrent.current=i;},
   onSummary:(s,answer)=>{setObjectXSummary(c=>sameObjectXLabSummary({...c,saved:false},{...s,saved:false})?c:s);setObjectXAnswer(answer);},
  });
  const lssHandlers=useStableHandlers<StableProps<ComponentProps<typeof LssSurvey>,'onSnapshot'|'onSummary'|'currentJd'|'onPlotWedge'>>({
   onSnapshot:s=>{lssCurrent.current=s;},
   onSummary:s=>setLssSummary(c=>sameLssLabSummary({...c,saved:false},{...s,saved:false})?c:s),
   currentJd:()=>siteClockReadingMS(observatoryClock.state?clockDriveUTMS(observatoryClock.state):parseClockUTC(siteClock.utc),0).jd,
   onPlotWedge:h=>{const token=++lssToken.current;setWedgeOwn({...h,token});navigate('lss-wedge');return token;},
  });
  // Front Perf review 1 L1: ObjectXLab hands clockUtc to MultiSpecObjectX, which calls it during render; like observatoryJd
  // it is a stable reader of a ref assigned in this render, so children rendered in the same pass read this render's clock.
  const objectXClockRef=useRef<()=>string>(()=>siteClock.utc);objectXClockRef.current=()=>observatoryClock.state?new Date(clockDriveUTMS(observatoryClock.state)).toISOString().slice(0,19):siteClock.utc;
  const objectXClockUtc=useCallback(()=>objectXClockRef.current(),[]);
  const stable=useStableHandlers({
   navigate,
   hubbleGuide:(destination:LabDestination)=>{navigate(destination==='hubble'?'spectrum':destination);if(destination==='hubble')requestAnimationFrame(()=>analyzerController.current?.openHubble());},
   pleiadesGuide:(destination:PleiadesLabDestination)=>{if(destination==='observations')openOwnHr();else navigate(destination);},
   classificationGuide:()=>navigate('classification'),
   preparePhotometerField:(p:Pointing)=>preparePhotometerField(p),
   cloudRestore:(file:File)=>void projectOperation(file),
   cloudSave:(deliver:SessionDelivery)=>projectOperation(undefined,deliver),
  });
  // Front Perf: derived props of memoised routes, rebuilt only when their inputs change.
  const classificationAcquisitions=useMemo(()=>classificationArchive.filter(a=>a.kind==='catalog-star-acquisition'),[classificationArchive]);
  const photometerTelescope=useMemo(()=>({pointing,domeOpen:open,mode,moving:observatoryClock.moving,onPreparePoint:stable.preparePhotometerField}),[pointing,open,mode,observatoryClock.moving,stable]);
  const radioPrefill=useMemo(()=>objectXHidden?{ra:objectXHidden.ra,dec:objectXHidden.dec}:null,[objectXHidden]);
  const radioHiddenName=useMemo(()=>objectXHidden?(p:Pointing)=>objectXMasks(objectXHidden,p)?objectXHidden.label:null:undefined,[objectXHidden]);
  // Front Perf: the header and nav depend only on view, hostInert and stable handlers/refs; built again only when those change.
  const header=useMemo(()=><PortalHeader inert={hostInert} view={view} navLabel={t('spectrum.tools')} help={<MainHelpMenu kind="main"/>} brand={<><a className="portal-brand" href="#observatory" onClick={()=>stable.navigate('observatory')}><span aria-hidden="true">✳</span> {t('app.name')}</a><span className="portal-status"><i/>{t('sky.local')}</span></>}><div className="nav-group" role="group" aria-labelledby="nav-group-optical"><span className="nav-group-label" id="nav-group-optical">{SHELL.navGroups.optical}</span><div className="nav-group-items"><button data-route="observatory" aria-current={view==='observatory'?'page':undefined} className={view==='observatory'?'active':''} onClick={()=>stable.navigate('observatory')}>{t('sky.observatory')}</button><button data-route="spectrometer" aria-current={view==='spectrometer'?'page':undefined} className={view==='spectrometer'?'active':''} onClick={()=>stable.navigate('spectrometer')}>{t('spectrometer.nav')}</button><button data-route="sky-exposure" aria-current={view==='sky-exposure'?'page':undefined} className={view==='sky-exposure'?'active':''} onClick={()=>stable.navigate('sky-exposure')}>{t('skyExposure.nav')}</button><button data-route="star-exposure" aria-current={view==='star-exposure'?'page':undefined} className={view==='star-exposure'?'active':''} onClick={()=>stable.navigate('star-exposure')}>{t('starExposure.nav')}</button><button data-route="galaxy-exposure" aria-current={view==='galaxy-exposure'?'page':undefined} className={view==='galaxy-exposure'?'active':''} onClick={()=>stable.navigate('galaxy-exposure')}>{t('galaxyExposure.nav')}</button><button data-route="photometer" aria-current={view==='photometer'?'page':undefined} className={view==='photometer'?'active':''} onClick={()=>stable.navigate('photometer')}>{t('ph.nav')}</button></div></div><div className="nav-group" role="group" aria-labelledby="nav-group-radio"><span className="nav-group-label" id="nav-group-radio">{SHELL.navGroups.radio}</span><div className="nav-group-items"><button data-route="radio-control" aria-current={view==='radio-control'?'page':undefined} className={view==='radio-control'?'active':''} onClick={()=>stable.navigate('radio-control')}>{t('radioRoute.nav')}</button><button data-route="pulsar-analysis" aria-current={view==='pulsar-analysis'?'page':undefined} className={view==='pulsar-analysis'?'active':''} onClick={()=>stable.navigate('pulsar-analysis')}>{t('plr.nav')}</button></div></div><div className="nav-group" role="group" aria-labelledby="nav-group-analysis"><span className="nav-group-label" id="nav-group-analysis">{SHELL.navGroups.analysis}</span><div className="nav-group-items"><button data-route="spectrum" aria-current={view==='spectrum'?'page':undefined} className={view==='spectrum'?'active':''} onClick={()=>stable.navigate('spectrum')}>{t('sky.analyzer')}</button><button data-route="classification" aria-current={view==='classification'?'page':undefined} className={view==='classification'?'active':''} onClick={()=>stable.navigate('classification')}>{t('class.nav')}</button><button data-route="cluster-database" aria-current={view==='cluster-database'?'page':undefined} className={view==='cluster-database'?'active':''} onClick={()=>stable.navigate('cluster-database')}>{t('db.nav')}</button><button data-route="lss-survey" aria-current={view==='lss-survey'?'page':undefined} className={view==='lss-survey'?'active':''} onClick={()=>stable.navigate('lss-survey')}>{t('lss.nav')}</button><button data-route="lss-wedge" aria-current={view==='lss-wedge'?'page':undefined} className={view==='lss-wedge'?'active':''} onClick={()=>stable.navigate('lss-wedge')}>{t('wedge.nav')}</button><button data-route="object-x" aria-current={view==='object-x'?'page':undefined} className={view==='object-x'?'active':''} onClick={()=>stable.navigate('object-x')}>{OBJECT_X_LAB_EN.nav}</button><button data-route="variable-stars" aria-current={view==='variable-stars'?'page':undefined} className={view==='variable-stars'?'active':''} onClick={()=>stable.navigate('variable-stars')}>{VARIABLE_STARS_EN.nav}</button></div></div><ResultsEditorsNav navigate={stable.navigate}/><div className="nav-group" role="group" aria-labelledby="nav-group-files"><span className="nav-group-label" id="nav-group-files">{SHELL.navGroups.files}</span><div className="nav-group-items"><button data-route="images" aria-current={view==='images'?'page':undefined} className={view==='images'?'active':''} onClick={()=>stable.navigate('images')}>{t('fits.nav')}</button></div></div><div className="nav-group" role="group" aria-labelledby="nav-group-guides"><span className="nav-group-label" id="nav-group-guides">{SHELL.navGroups.guides}</span><div className="nav-group-items"><button onClick={()=>labGuide.current?.showModal()}>{t('lab.nav')}</button><button data-testid="lss-lab-open" onClick={()=>lssGuide.current?.showModal()}>{t('lssLab.nav')}</button><button data-testid="objectx-lab-open" onClick={()=>objectXGuide.current?.showModal()}>{OBJECT_X_LAB_EN.guideNav}</button><button data-testid="pulsar-lab-open" onClick={()=>pulsarGuide.current?.showModal()}>{t('pulsarLab.nav')}</button><button data-testid="pleiades-lab-open" onClick={()=>pleiadesGuide.current?.showModal()}>{t('pleiadesLab.nav')}</button><button data-testid="classification-lab-open" onClick={()=>classificationGuide.current?.showModal()}>{t('classLab.nav')}</button><ClusterGuideNavButton navigate={stable.navigate}/></div></div></PortalHeader>,[hostInert,view,stable]);
  return <>{header}
  <section className="investigation-toolbar" aria-labelledby="project-toolbar-title" inert={hostInert}><div className="toolbar-row"><h2 id="project-toolbar-title">{t('project.title')}</h2><div className="sky-actions"><button className="secondary-button" disabled={projectBusy} onClick={()=>void projectOperation()}>{t('project.save')}</button><label className="project-upload" htmlFor="project-file">{t('project.restore')}<input id="project-file" type="file" accept=".json,application/json" disabled={projectBusy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void projectOperation(file);}}/></label>{projectBusy&&<button className="secondary-button" onClick={cancelProject}>{t('classLink.cancel')}</button>}</div></div><details className="toolbar-help research-notes"><summary>{SHELL.backupHelpSummary}</summary><p>{t('project.toolbarHelp')}</p></details><CloudEntry busy={projectBusy} onRestore={stable.cloudRestore} onSaveToCloud={stable.cloudSave}/>{projectBusy&&<p role="status">{t('project.busy')}</p>}{projectNotice&&<p role="status">{projectNotice}</p>}{projectError&&<p role="alert">{projectError}</p>}</section>
  <HubbleLabGuide dialogRef={labGuide} progress={labProgress} onNavigate={stable.hubbleGuide}/>
  <PulsarLabGuide dialogRef={pulsarGuide} progress={pulsarProgress} onNavigate={stable.navigate}/>
  <LssLabGuide dialogRef={lssGuide} progress={lssProgress} onNavigate={stable.navigate}/>
  <ObjectXLabGuide dialogRef={objectXGuide} progress={objectXProgress} onNavigate={stable.navigate}/>
  <PleiadesLabGuide dialogRef={pleiadesGuide} progress={pleiadesProgress} onNavigate={stable.pleiadesGuide}/>
  <ClassificationLabGuide dialogRef={classificationGuide} progress={classificationProgress} onNavigate={stable.classificationGuide}/>
  {((view==='star-exposure'&&!compatibleStar)||(view==='galaxy-exposure'&&!compatibleGalaxy)||(view==='sky-exposure'&&!compatibleSky)||(view==='photometer'&&!compatiblePhotometer))&&<OpticalCompatibility workspace={optical} busy={projectBusy} onUseSupported={()=>applyOptical({...optical,draftIndex:0})}/>}
  {['observatory','sky-exposure','star-exposure','galaxy-exposure'].includes(view)&&<div inert={projectBusy}><RunningClock limitSlewing={opticalOptions.limitSlewing} site={siteOverrides[optical.selectedIndex]} utc={siteClock.utc} pointing={pointing} statusOnly={view!=='observatory'} access={currentAccess} state={observatoryClock.state} running={observatoryClock.running} limited={observatoryClock.limited} index={optical.selectedIndex} {...runningClockHandlers} /></div>}
  <div inert={projectBusy} ref={observatoryView} hidden={view!=='observatory'}><main className="observatory-main"><section className="observatory-heading"><div className="eyebrow">{t('sky.eyebrow')}</div><h1 tabIndex={-1}>{t('sky.title')}</h1><p>{t('sky.subtitle')}</p><button className="text-button" onClick={()=>about.current?.showModal()}>{t('sky.about')} ↗</button></section>
  <OpticalTelescope workspace={optical} busy={projectBusy} {...opticalHandlers} /><CameraControl infraredCamera={sessionOptions.infraredCamera} active={view==='observatory'} busy={projectBusy} telescopeIndex={optical.selectedIndex} pointing={pointing} access={instrumentAccess({...nativeGate,configurationAvailable:true,pointingMatches:hasPointed})} {...cameraHandlers} extraSources={cameraExtraSources} />
  {/* Front M (Multi-Spec, instrument position 3 + Access, as recovered). virtualObservatory: exercise mode 0 "Access All Instruments" (D1); gated on Front O2's instructor Virtual Observatory option (the page's virtualObservatory state). */}
  <MultiSpecObservatoryLazy active={view==='observatory'} busy={projectBusy} access={instrumentAccess({...nativeGate,configurationAvailable:true,pointingMatches:hasPointed})} mode={mode} pointing={pointing} telescope={optical.selectedIndex} editMode={editMode} virtualObservatory={virtualObservatory} hidden={objectXHidden} currentJd={observatoryJd}/>
  <ol className="first-steps"><li className={!open?'current':''}><strong>{t('sky.step1')}</strong><span>{t('sky.step1Help')}</span></li><li className={open&&(!hasPointed||!centered)?'current':''}><strong>{t('sky.step2')}</strong><span>{t('sky.step2Help')}</span></li><li className={open&&hasPointed&&centered?'current':''}><strong>{t('sky.step3')}</strong><span>{t('sky.step3Help')}</span></li></ol>
  <TelescopeMotion pointing={pointing} motion={observatoryClock.motion} preferences={motionPreferences} enabled={open&&!projectBusy&&view==='observatory'} selectedName={shownSelected.label} selected={shownSelected} raText={ra} decText={dec} {...motionHandlers} limitBox={pointRefusal??(observatoryClock.horizonStop?observatoryClock.horizonStop.kind==='drive'?{caption:SLEW_LIMIT_LITERALS.driveCaption,text:SLEW_LIMIT_LITERALS.driveText}:{caption:SLEW_LIMIT_LITERALS.manualCaption,text:manualLimitText(observatoryClock.horizonStop.direction)}:null)} slewMenu={slewMenu}/><SiteClock workspace={siteClock} index={optical.selectedIndex} onChange={setSiteClock} {...siteClockHandlers} site={effectiveObservatorySite(siteOverrides,optical.selectedIndex)} overridden={!!siteOverrides[optical.selectedIndex]} limitSlewing={opticalOptions.limitSlewing} /><div className="observatory-workspace"><section className="card sky-card"><div className="card-heading"><div><div className="eyebrow">VIREO · {t('sky.currentPointing')}</div><h2>{t('sky.fieldTitle')}</h2></div><button className="secondary-button" onClick={()=>{observatoryClock.stopMotion();setOpen(v=>!v);cueDomeSound();setNotice('');}}>{t(open?'sky.close':'sky.open')}</button></div><div className="sky-frame"><SkyField center={pointing} mode={mode} active={open&&view==='observatory'} selected={selected} onSelect={setSelected} hidden={objectXHidden}/><EditModeFieldLayerLazy editMode={editMode} active={open&&view==='observatory'} mode={mode} pointing={pointing} hidden={objectXHidden} {...editLayerHandlers} currentJd={observatoryJd}/>{!open&&<div className="dome-cover"><div className="dome-icon" aria-hidden="true">◠</div><h2>{t('sky.closed')}</h2><p>{t('sky.closedHelp')}</p><button className="primary-button" onClick={()=>{setOpen(true);cueDomeSound();}}>{t('sky.open')} ↗</button></div>}</div>
  <ObservatorySounds motion={observatoryClock.motion}/>{/* Front C5W: VIREO sound effects, off by default */}
  <div className="pointing-readout"><span><small>{t('sky.ra')}</small><output data-testid="pointing-ra">{coord(pointing.ra)}</output></span><span><small>{t('sky.dec')}</small><output data-testid="pointing-dec">{coord(pointing.dec)}</output></span></div><div className="field-controls"><fieldset><legend>{t('sky.view')}</legend>{(['finder','telescope'] as const).map(v=><button key={v} disabled={!open} aria-pressed={mode===v} onClick={()=>changeFieldMode(v)}>{t(v==='finder'?'sky.finder':'sky.telescope')}</button>)}</fieldset><fieldset><legend>{t('sky.pan')}</legend>{(['north','east','south','west'] as const).map(d=><button key={d} disabled={!open} aria-label={t(`sky.${d}`)} onClick={()=>pointChecked(pan(pointing,d,FIELDS[mode]))}>{t(`sky.${d}`)}</button>)}</fieldset></div><p className="observatory-note">{t('sky.panHelp')}</p><NakedEyeDomeSkyLazy open={open} active={view==='observatory'} site={effectiveObservatorySite(siteOverrides,optical.selectedIndex)} utcNow={nakedEyeUtc} pointing={pointing}/></section>
  <aside className="observatory-controls"><section className="card target-card"><div className="eyebrow">{t('sky.step2')}</div><h2>{t('sky.targetTitle')}</h2><p>{t('sky.targetHelp')}</p><TargetPicker hidden={pickerHidden} hiddenLabel={OBJECT_X_LAB_EN.hiddenName} catalog={catalog} groups={targetGroups} selected={selected} resetToken={initialLive} {...targetPickerHandlers}/><div className="target-coordinates">RA {coord(selected.ra)} h · Dec {coord(selected.dec)}°</div><button className="primary-button" disabled={!open} onClick={()=>pointChecked(selected,shownSelected.label)}>{t('sky.pointTarget')} ↗</button>{open&&<p className="target-state">{t(inView?'sky.targetInside':'sky.targetOutside')}</p>}<details><summary>{t('sky.coordinates')}</summary><label htmlFor="point-ra">{t('sky.ra')}</label><input id="point-ra" type="number" min="0" max="23.999999" step="any" value={ra} onChange={e=>setRa(e.target.value)}/><label htmlFor="point-dec">{t('sky.dec')}</label><input id="point-dec" type="number" min="-90" max="90" step="any" value={dec} onChange={e=>setDec(e.target.value)}/><button className="secondary-button" disabled={!open} onClick={()=>{try{if(!ra.trim()||!dec.trim())throw errorFor('sky.invalidCoordinates');pointChecked(validatePointing(Number(ra),Number(dec)));}catch(e){setError(displayError(e));}}}>{t('sky.pointCoordinates')}</button></details><ResearchNotes><p>{t('sky.pointingHelp')}</p></ResearchNotes></section>
  <HotListEditor hotList={hotList} active={view==='observatory'&&!projectBusy} canPoint={open} telescopeIndex={optical.selectedIndex} admitsPhotometerTarget={admitsPhotometerTarget} {...hotListHandlers}/>{hubbleRow&&<section className="card hubble-point-card" data-testid="hubble-point-card" data-status={hubbleStatus??undefined} data-pointing={hubbleRelation} aria-labelledby="hubble-point-title"><div className="eyebrow">{t('hubblePoint.eyebrow')}</div><h2 id="hubble-point-title">{t('hubblePoint.title',{number:hubbleRow.index+1,label:hubbleRow.id,remarks:hubbleRow.remarks})}</h2>{!hubbleRow.supported?<p data-testid="hubble-point-unavailable">{t('hubblePoint.unavailable',{reason:t(`hubbleHtl.reason.${hubbleRow.reason}`)})}</p>:hubbleStatus==='telescope'?<p data-testid="hubble-point-telescope">{engineTelescopeNote(hubbleRow.targetId,telescopeName)??t('hubblePoint.telescope',{id:hubbleRow.targetId,telescope:telescopeName})}</p>:<><p data-testid="hubble-point-relation">{t(hubbleRelation==='exact'?'hubblePoint.exact':hubbleRelation==='htl'?'hubblePoint.htl':'hubblePoint.elsewhere',{id:hubbleRow.targetId})}</p><button className="secondary-button" disabled={!hubbleTarget||!open||observatoryClock.moving||projectBusy||hubbleRelation==='exact'} onClick={pointHubbleCentre}>{t('hubblePoint.useExact')}</button></>}<p className="observatory-note">{t('hubblePoint.help')}</p></section>}{pointedPleiades&&<section className="card pleiades-point-card" data-testid="pleiades-point-card" data-admitted={pointedPleiades.admitted} data-status={pointedMeasure} aria-labelledby="pleiades-point-title"><div className="eyebrow">{t('pleiadesPoint.eyebrow')}</div><h2 id="pleiades-point-title">{t('pleiadesPoint.title',{label:pointedPleiades.id,number:pointedPleiades.index+1})}</h2>{!pointedPleiades.admitted?<p data-testid="pleiades-point-unavailable">{t('pleiadesPoint.unavailable',{reason:t(pointedPleiades.reason==='mixed-variable-field'?'ph.unavailableMixed':'ph.unavailableAssociation')})}</p>:pointedMeasure==='telescope'?<p data-testid="pleiades-point-telescope">{t('pleiadesPoint.telescope',{telescope:telescopeName})}</p>:<><p>{pointedMeasure==='measurable'?t('pleiadesPoint.admitted'):t('pleiadesPoint.checking',{telescope:telescopeName})}</p><button className="primary-button" disabled={pointedMeasure!=='measurable'||!open||observatoryClock.moving||projectBusy} onClick={()=>navigate('photometer')}>{t('pleiadesPoint.open')}</button></>}<p className="observatory-note">{t('pleiadesPoint.help')}</p></section>}<section className="card reference-card"><div className="eyebrow">{t('sky.step3')}</div><h2>{t('sky.referenceTitle')}</h2><p>{t('sky.referenceHelp')}</p>{!canAccess?<><p>{t(!hasPointed?'sky.pointFirst':!inView?'sky.targetOutside':!centered?'sky.notCentered':'sky.narrowHelp')}</p><button className="secondary-button" disabled={!open} onClick={()=>{if(pointChecked(selected,shownSelected.label))changeFieldMode('telescope');}}>{t('sky.toTelescope')} ↗</button></>:<><h3>{shownSelected.label}</h3>{selectedMasked&&<p className="observatory-note" data-testid="target-name-hidden">{OBJECT_X_LAB_EN.namesHidden}</p>}{shownSelected.image?<figure><img src={shownSelected.image} alt={t('sky.imageAlt',{target:shownSelected.label})}/><figcaption>{t('sky.libraryImage')}</figcaption></figure>:<p>{t('sky.noImage')}</p>}{selected.spectrum&&!selectedMasked?<><p>{t('sky.librarySpectrum')} · {selected.spectrum.name}</p><button className="primary-button" disabled={!activeLibrary||loadingLibrary} onClick={()=>navigate('spectrum')}>{t(loadingLibrary?'sky.libraryLoading':'sky.openAnalyzer')} ↗</button><p>{t('sky.analyzerHelp')}</p></>:<p>{selected.id===supportedStar.id?t('continuity.starSource'):!!selectedGalaxy?t('galaxyExposure.source'):t('sky.noSpectrum')}</p>}{libraryError&&<p role="alert">{libraryError}</p>}</>}<button className="secondary-button" disabled={!canAccess} onClick={()=>{if(selectedGalaxy)openGalaxy();else navigate(selected.id===supportedStar.id?'star-exposure':'spectrometer');}}>{t('spectrometer.open')} ↗</button>{selected.id===supportedStar.id&&<><button className="primary-button" disabled={!supportedPointing} onClick={()=>navigate('star-exposure')}>{t('continuity.acquireFromObservatory')}</button><p>{t('continuity.pointingHelp')}</p></>}{!!selectedGalaxy&&<><button className="primary-button" disabled={!supportedGalaxyPointing} onClick={openGalaxy}>{t('galaxyExposure.acquireFromObservatory')}</button><p>{t('galaxyExposure.pointingHelp')}</p></>}<div className="pending-label">{t('sky.noAcquisition')}</div></section></aside></div>
  <div className="observatory-feedback" aria-live="polite">{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</div><section className="scope-note"><h2>{t('sky.limitTitle')}</h2><p>{t('sky.limitHelp')}</p><strong>{t('sky.instruments')}</strong><p>{t('sky.pendingInstruments')}</p></section><footer>{t('sky.attribution')}</footer></main></div>
  <div inert={projectBusy} ref={spectrometerView} hidden={view!=='spectrometer'}><Spectrometer seedText={sharedEditing.preparationSeedText} {...spectrometerHandlers} target={shownSelected} enabled={view==='spectrometer'&&canAccess&&!selectedMasked} verifiedLibrary={activeLibrary} libraryFailed={!!libraryError} /></div>
  <div inert={projectBusy} ref={analyzerView} hidden={view!=='spectrum'} className="spectrum-route"><button className="back-observatory" onClick={()=>navigate('observatory')}>{t('sky.back')}</button>{activeLibrary&&!analysisIsStar&&<div className="library-context"><strong>{t('sky.originalReference',{target:activeLibrary.target,file:activeLibrary.name})}</strong><p>{t('sky.originalReferenceHelp')}</p></div>}<SpectrumInstrument {...spectrumHandlers} onRestoreOptical={setOptical} onArchivesChange={setClassificationArchive} onSessionBusy={setInvestigationBusy} onLabProgress={setLabProgress} active={view==='spectrum'} library={activeLibrary} controllerRef={analyzerController} onKindChange={setAnalysisIsStar} /></div>
  <div inert={projectBusy} ref={skyExposureView} hidden={view!=='sky-exposure'}>{skyVisited&&<div data-sky-telescope={optical.selectedIndex}><Suspense fallback={<p>{t('app.loadingSky')}</p>}><SkyExposure key={optical.selectedIndex} telescopeIndex={optical.selectedIndex} configurationAvailable={compatibleSky} controllerRef={c=>{liveControllers.current[optical.selectedIndex===2?'sky4m':optical.selectedIndex===1?'sky09':'sky']=c;}} initialWorkspace={liveCurrent.current[optical.selectedIndex===2?'sky4m':optical.selectedIndex===1?'sky09':'sky']} onWorkspaceChange={w=>{liveCurrent.current[optical.selectedIndex===2?'sky4m':optical.selectedIndex===1?'sky09':'sky']=w;}} projectBusy={projectBusy} active={view==='sky-exposure'} fieldMatches={skyAccess==='ready'} onStart={beginSpectralClock} canIntegrate={observatoryClock.safeForIntegration} onActivate={()=>{setOpen(true);changeFieldMode('telescope');prepareTrackedField({ra:.5,dec:0});}}/></Suspense></div>}</div>
  <div inert={projectBusy} ref={starExposureView} hidden={view!=='star-exposure'}>{starVisited&&([0,1,2]as const).map(index=><div key={index} data-star-telescope={index} hidden={optical.selectedIndex!==index}>{(index===0||index===1&&star09Visited||index===2&&star4mVisited)&&<Suspense fallback={<p>{t('app.loadingStar')}</p>}><StarExposure inspectionPointing={pointing} inspectionAvailable={open&&mode==='telescope'&&selected.id===supportedStar.id} telescopeIndex={index} configurationAvailable={compatibleStar} controllerRef={c=>{liveControllers.current[index===2?'star4m':index===1?'star09':'star']=c;}} initialWorkspace={initialLive[index===2?'star4m':index===1?'star09':'star']} onWorkspaceChange={w=>{liveCurrent.current[index===2?'star4m':index===1?'star09':'star']=w;}} projectBusy={projectBusy} onClassify={classifyAcquired} active={view==='star-exposure'&&optical.selectedIndex===index} fieldMatches={supportedPointing&&optical.selectedIndex===index} restored={restoredStar&&starTelescopeIndex(restoredStar.observation.state)===index?restoredStar:null} onAnalyze={observation=>{if(!analyzerController.current)throw errorFor('continuity.busy');analyzerController.current.acceptAcquisition(observation);setAnalysisIsStar(true);navigate('spectrum');}} onStart={beginSpectralClock} canIntegrate={observatoryClock.safeForIntegration} onActivate={()=>{setSelected(supportedStar);setOpen(true);changeFieldMode('telescope');prepareTrackedField(StarPoint);}}/></Suspense>}</div>)}</div>
  <div inert={projectBusy} ref={galaxyExposureView} hidden={view!=='galaxy-exposure'}>{galaxyVisited&&<><section className="card" style={{maxWidth:1100,margin:'24px auto',padding:20}}><label htmlFor="acquisition-galaxy">{t('galaxyExposure.targetSelector')}</label><select id="acquisition-galaxy" value={galaxyTargetId} onChange={e=>setGalaxyTargetId(e.target.value)}>{GALAXY_TARGETS.map(g=><option key={g.id} value={g.id}>{g.id} · {g.label}</option>)}</select><p>{t('galaxyExposure.switchHelp')}</p></section>{([0,1,2]as const).map(index=><div key={index} data-galaxy-telescope={index} hidden={optical.selectedIndex!==index}>{(index===0||index===1&&galaxy09Visited||index===2&&galaxy4mVisited)&&<>{GALAXY_TARGETS.map(g=><div key={g.id} data-galaxy-panel={g.id} hidden={galaxyTargetId!==g.id}>{!galaxyTargetTelescopeSupported(g.id,index)?<section className="card scope-note"><p role="status" data-testid={`galaxy-telescope-unsupported-${g.id}`}>{engineTelescopeNote(g.id,opticalProfile(index).name)??t('galaxyExposure.telescopeUnsupported',{id:g.id,label:g.label,telescope:opticalProfile(index).name})}</p></section>:<Suspense fallback={<p>{t('app.loadingGalaxy')}</p>}><GalaxyExposure telescopeIndex={index} configurationAvailable={compatibleGalaxy} controllerRef={c=>setGalaxyController(index,g.id,c)} initialWorkspace={galaxyWorkspace(initialLive,index,g.id)} onWorkspaceChange={w=>setGalaxyWorkspace(index,g.id,w)} projectBusy={projectBusy} targetId={g.id} active={view==='galaxy-exposure'&&galaxyTargetId===g.id&&optical.selectedIndex===index} fieldMatches={optical.selectedIndex===index&&supportedGalaxyPointing&&selectedGalaxy?.id===`${g.id}-acquisition`} restored={restoredGalaxy?.observation.targetId===g.id&&galaxyTelescopeIndex(restoredGalaxy.observation.state)===index?restoredGalaxy:null} onAnalyze={observation=>{if(!analyzerController.current)throw errorFor('continuity.busy');analyzerController.current.acceptAcquisition(observation);setAnalysisIsStar(true);navigate('spectrum');}} onStart={beginSpectralClock} canIntegrate={observatoryClock.safeForIntegration} onActivate={()=>{const target=supportedGalaxies.find(t=>t.id===`${g.id}-acquisition`)!;setSelected(target);setOpen(true);changeFieldMode('telescope');prepareTrackedField({ra:target.ra,dec:target.dec});}}/></Suspense>}</div>)}</>}</div>)}</>}</div>
  <div inert={projectBusy} ref={classificationView} hidden={view!=='classification'}>{classificationVisited&&<Suspense fallback={<p>{t('class.loading')}</p>}><ClassificationLab controllerRef={classificationController} {...classificationHandlers} active={view==='classification'} workspace={classificationWorkspace} onChange={setClassificationWorkspace} acquisitions={classificationAcquisitions} investigationBusy={investigationBusy} onExerciseSummary={setClassificationSummary}/></Suspense>}</div>
  <div inert={projectBusy} ref={clusterDatabaseView} hidden={view!=='cluster-database'}>{(view==='cluster-database'||clusterDatabase!==null||clusterComparison!==null||clusterSelection!==null||clusterObservationsVisited||ownHrVisited)&&<><Suspense fallback={<p>{t('db.loading')}</p>}><ClusterDatabaseLab hotList={hotList} selection={clusterSelection} {...clusterDatabaseHandlers} workspace={clusterDatabase} comparison={clusterComparison} busy={projectBusy} active={view==='cluster-database'} ownSource={photometryPairs} /></Suspense><details className="card own-hr-disclosure" data-testid="own-hr-disclosure" open={ownHrOpen} onToggle={event=>{const opened=event.currentTarget.open;setOwnHrOpen(opened);setOwnHrIssue(null);if(opened)setOwnHrVisited(true);}}><summary ref={ownHrSummary} data-testid="own-hr-summary">{t('ownHr.summary')}</summary><p>{t('ownHr.persistence')}</p>{ownHrVisited&&<Suspense fallback={<p>{t('ownHr.loading')}</p>}><NativeClusterAnalysis variant="observation" state={photometryPairs} busy={projectBusy||view!=='cluster-database'||!ownHrOpen} draft={sharedEditing.photometry.nativeClusterDraft??null} {...nativeClusterHandlers} ownIssue={ownHrIssue}/></Suspense>}</details><details className="card" onToggle={event=>{const opened=event.currentTarget.open;setClusterObservationsOpen(opened);if(opened)setClusterObservationsVisited(true);}}><summary>{t('obsHr.workspaceSummary')}</summary><p>{t('obsHr.persistence')}</p>{clusterObservationsVisited&&<Suspense fallback={<p>{t('obsHr.loading')}</p>}><ClusterNativeObservationHr disabled={projectBusy||view!=='cluster-database'||!clusterObservationsOpen}/></Suspense>}</details></>}</div>
  <div inert={projectBusy} ref={photometerView} hidden={view!=='photometer'}>{photometerVisited&&<Suspense fallback={<p>{t('sky.loading')}</p>}><Photometer telescopeIndex={optical.selectedIndex} configurationAvailable={compatiblePhotometer} drafts={sharedEditing.photometry} {...photometerHandlers} active={view==='photometer'&&compatiblePhotometer} initialState={restoredPhotometry} controllerRef={photometerController} investigationBusy={projectBusy} telescope={photometerTelescope} onExerciseSummary={setPleiadesSummary} onPairSource={setPhotometryPairs} /></Suspense>}</div>
  <div inert={projectBusy} ref={pulsarView} hidden={view!=='pulsar-analysis'}>{(pulsarVisited||view==='pulsar-analysis')&&<main className="observatory-main"><div className="observatory-heading"><h1 tabIndex={-1}>{t('plr.routeTitle')}</h1><p>{t('plr.routeScope')}</p></div><Suspense fallback={<p>{t('plr.loading')}</p>}><PulsarAnalysis key={pulsarRestore?.token??0} restored={pulsarRestore?.restore??null} controllerRef={pulsarController} {...pulsarHandlers} active={view==='pulsar-analysis'&&!projectBusy} data={pulsarData} onMeasurementSummary={setPulsarMeasurements}/></Suspense>
   <details className="card saved-rows-disclosure" style={{maxWidth:1100,marginTop:24}} data-testid="saved-rows-disclosure" onToggle={event=>{const opened=event.currentTarget.open;setSavedRowsOpen(opened);if(opened)setSavedRowsVisited(true);}}><summary>{savedFindSession?<span className="saved-rows-session" data-testid="saved-rows-session">{t('plr.savedRows.summaryWithSession',{summary:t('plr.savedRows.summary'),session:t('plr.savedRows.findSession')})}</span>:t('plr.savedRows.summary')}</summary><p>{t('plr.savedRows.help')}</p>{savedRowsVisited&&<Suspense fallback={<p>{t('plr.savedRows.loading')}</p>}><PulsarSavedRows active={view==='pulsar-analysis'&&!projectBusy&&savedRowsOpen} onModalChange={setSavedFindSession}/></Suspense>}</details></main>}</div>
  <div inert={projectBusy} ref={radioView} hidden={view!=='radio-control'}>{(radioVisited||view==='radio-control')&&<main className="observatory-main"><div className="observatory-heading"><h1 tabIndex={-1}>{t('radioRoute.title')}</h1><p>{t('radioRoute.scope')}</p></div>{objectXHidden&&(()=>{const f=skyCoordsFieldsFor(objectXHidden);return <section className="card objectx-radio-card" data-testid="objectx-radio-card"><h2>{OBJECT_X_LAB_EN.radioCardTitle(objectXHidden.code)}</h2><p>{OBJECT_X_LAB_EN.radioCardHelp}</p>
   <p data-testid="objectx-radio-coordinates" data-ra={[f.raHours,f.raMinutes,f.raSeconds].join(' ')} data-dec={[f.decDegrees,f.decMinutes,f.decSeconds].join(' ')}>{OBJECT_X_LAB_EN.radioCardCoordinates(f.raHours,f.raMinutes,f.raSeconds,f.decDegrees,f.decMinutes,f.decSeconds)}</p></section>;})()}<Suspense fallback={<p>{t('radioRoute.loading')}</p>}><RadioTelescopeRoute prefillTarget={radioPrefill} hiddenName={radioHiddenName} key={radioRestore?.token??0} restored={radioRestore?.workspace??null} controllerRef={radioController} active={view==='radio-control'} busy={projectBusy} {...radioHandlers} hotList={hotList} pulsarData={pulsarData} onExerciseProgress={setRadioExercise}/></Suspense></main>}</div>
  <div inert={projectBusy} ref={wedgeView} hidden={view!=='lss-wedge'}>{(wedgeVisited||view==='lss-wedge')&&<main className="observatory-main"><div className="observatory-heading"><h1 tabIndex={-1}>{t('wedge.routeTitle')}</h1><p>{t('wedge.routeScope')}</p></div><Suspense fallback={<p>{t('wedge.loading')}</p>}><WedgeLab monochrome={sessionOptions.monochromeDisplays} printInColor={sessionOptions.printInColor} disabled={view!=='lss-wedge'||projectBusy} {...wedgeHandlers} ownRecords={wedgeOwn} restoredOptions={wedgeOptionsRestore} /></Suspense></main>}</div>
  <div inert={projectBusy} ref={objectXView} hidden={view!=='object-x'}>{(objectXVisited||view==='object-x')&&<Suspense fallback={<p>…</p>}><ObjectXLab key={objectXRestore?.token??0} restored={objectXRestore?.investigation??null} active={view==='object-x'} busy={projectBusy} controllerRef={objectXController}
   {...objectXHandlers} clockUtc={objectXClockUtc} clockApplied={siteClock.utc}
   
   onHiddenTarget={setObjectXHidden} /></Suspense>}</div>
  <div inert={projectBusy} ref={variableStarsView} hidden={view!=='variable-stars'}>{variableStarsVisited&&<Suspense fallback={<p>{VARIABLE_STARS_EN.loading}</p>}><VariableStarsRoute active={view==='variable-stars'&&!projectBusy} openRequest={variableOpen}/></Suspense>}</div>
  <div inert={projectBusy} ref={lssView} hidden={view!=='lss-survey'}>{(lssVisited||view==='lss-survey')&&<Suspense fallback={<p>{t('lss.loading')}</p>}><LssSurvey computeRedshiftVelocity={sessionOptions.computeRedshiftVelocity} active={view==='lss-survey'&&!projectBusy} editMode={editMode} restored={lssRestore} {...lssHandlers} initialTelescope={optical.selectedIndex as 0|1|2} wedgeAck={wedgeAck} /></Suspense>}</div>
  <div inert={projectBusy} ref={imageView} hidden={view!=='images'}>{imageVisited&&<Suspense fallback={<p>{t('fits.loading')}</p>}><FitsImageLab active={view==='images'} busy={projectBusy}/></Suspense>}</div>
  <AboutDialog dialogRef={about}/></>;
}
