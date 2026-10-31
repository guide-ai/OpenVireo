import PhotometerPlotSettings from './PhotometerPlotSettings';
import {memo,useEffect,useMemo,useRef,useState} from 'react';
import type {ClusterReferencePoint} from './core/clusterDatabase';
import type {PhotometerState} from './core/photometer';
import {pleiadesPoints,pleiadesPointVisible,PLEIADES_PLOT,type PleiadesPoint} from './core/pleiadesAnalysis';
import {PLEIADES_PHOTOMETER_TARGETS} from './core/photometerField';
import {opticalProfile} from './core/opticalTelescope';
import {nativeClusterDraftFromFit,nativeClusterDraftParameters,nativeClusterValues,nativeZamsDraft,NATIVE_CLUSTER_MODELS,sameNativeCluster,type NativeClusterDraft,type NativeClusterParameters} from './core/nativeCluster';
import {nativeZamsCurve,nativeIsochroneCurve,type NativeModelCurves} from './core/nativeClusterCurves';
import {clusterNativeHrFrame,clusterNativeHrX,clusterNativeHrY,CLUSTER_NATIVE_HR_GEOMETRY as G} from './core/clusterNativeObservationHr';
import {clusterDatabaseHrCurveInFrame,clusterDatabaseHrInFrame,clusterDatabaseHrPartition,clusterDatabaseHrReport,clusterDatabaseHrSliderText,clusterDatabaseHrTrial,nativeClusterDraftTicks,nativeClusterDraftWithTicks,CLUSTER_DATABASE_HR_SLIDERS,type ClusterDatabaseHrSliderField} from './core/clusterDatabaseHr';
import {loadNativeClusterModel} from './io/nativeClusterModels';
import {formatNumber,t} from './i18n';
import CleaHelp from './clusters/CleaHelp';
import {CLUSTER_HR_IMAGE,clusterHrIsochronePolyline,clusterHrPixel,clusterHrPlotModel,clusterHrZamsPolyline} from './core/clusterHrPlot';
import {clusterHrHitTest,clusterVBank} from './core/clusterHrSelect';
import {CLUSTER_HR_EN as HR} from './clusters/ClusterHrMessages';
import HrPrint,{ObservationDataUnavailable} from './clusters/HrPrint';
import InfoListPrintPreview from './polish/InfoListPrintPreview';// Front R4b
const num=(v:number)=>formatNumber(v,{maximumFractionDigits:6,useGrouping:false});
// Learner-typed binary64 notebook values are shown like the photometer notebook(no x87 or native DAT identity).
const typed=(v:number)=>formatNumber(v,{maximumFractionDigits:9,useGrouping:false});
const x=(v:number)=>70+(v-PLEIADES_PLOT.bMinusVMin)/(PLEIADES_PLOT.bMinusVMax-PLEIADES_PLOT.bMinusVMin)*600;
const y=(v:number)=>40+(v-PLEIADES_PLOT.vMin)/(PLEIADES_PLOT.vMax-PLEIADES_PLOT.vMin)*500;
const visible=(r:{color:number;v:number})=>pleiadesPointVisible({bMinusV:r.color,v:r.v});
// Database and own-observation routes: recovered native frame0x542480 (the paper/photometer route keeps its own axes).
const nativeFrame=clusterNativeHrFrame();
const DB_W=470,DB_H=500;
const SLIDER_LABEL={modulus:'db.sliderModulus',ebv:'db.sliderEbv',logAge:'db.sliderLogAge',offset:'db.sliderOffset'}as const;
type ReferenceDisplay=Readonly<{tools?:React.ReactNode;label?:string;selectedId?:string;bank?:readonly ClusterReferencePoint[];markerId?:string|null;onPick?:(id:string)=>void;totalPointCount?:number;provenanceChanged?:boolean;points:readonly ClusterReferencePoint[];fit:({modulus:number;ebv:number;offset:number;logAge:number;ageMyr:number;extinctionMagnitude:number;distancePc:number;points:readonly unknown[]}&NativeClusterParameters)|null}>;
type FramePoint=Readonly<{id:string;bMinusV:number;v:number}>;
export type DatabaseHrProgress=Readonly<{validTrial:boolean;reportOpen:boolean}>;
/** variant "observation"(phase1 item1.9): the learner's own confirmed photometer pairs in the Data from Observations view,
 * drawn on the database route's native frame with its sliders and parameter report. It reads the live canonical photometer
 * state and the shared photometer fit/draft; it creates no DAT record and never consults catalog or acquired magnitudes. */
function NativeClusterAnalysis({state,busy,draft,onDraft,onConfirm,referenceData,onDatabaseProgress,variant,ownIssue=null}:{state:PhotometerState|null;busy:boolean;draft:NativeClusterDraft|null;onDraft:(d:NativeClusterDraft|null)=>void;onConfirm:(p:NativeClusterParameters)=>boolean;referenceData?:ReferenceDisplay;onDatabaseProgress?:(p:DatabaseHrProgress)=>void;variant?:'observation';ownIssue?:'refused'|'limit'|'error'|null}){
 const db=referenceData!==undefined;
 const own=!db&&variant==='observation';
 const prefix=db?'db-':own?'own-hr-':'';
 // Fixed native frame, sliders and parameter report: database and own-observation routes only.
 const frame=db||own;
 // Test identifiers: unchanged for the photometer and database routes, own-hr namespaced for the own view.
 const tid=(name:string)=>own?'own-hr-'+name:name,rid=(name:string)=>(own?'own-hr-':'db-')+name;
 const fit=referenceData?referenceData.fit:state?.nativeClusterFit,d=draft??nativeClusterDraftFromFit(fit?{...fit,points:[]}:null);
 const observedPoints=useMemo(()=>state?pleiadesPoints(state):[],[state?.colors,state?.entries,state?.readings]);
 const referencePoints=useMemo(()=>referenceData?.points.map(p=>({targetId:p.id,bMinusV:p.bMinusV,v:p.v})),[referenceData?.points]);
 const points=referencePoints??observedPoints;
 const params=useMemo(()=>nativeClusterDraftParameters(d),[d.modulus,d.ebv,d.logAge,d.modelIndex,d.offset,d.extinctionCorrected,d.interpretation]);
 const anchor=useMemo(()=>nativeZamsDraft(d),[d.modulus,d.ebv]);
 const modelIndex=['0','1','2','3','4','5'].includes(d.modelIndex)?Number(d.modelIndex):null;
 const [retry,setRetry]=useState(0),[tableOpen,setTableOpen]=useState(false);
 const [loaded,setLoaded]=useState<{index:number;curves:NativeModelCurves}|null>(null),[loadError,setLoadError]=useState<number|null>(null);
 useEffect(()=>{let current=true;setLoadError(null);if(modelIndex!==null)void loadNativeClusterModel(modelIndex).then(curves=>{if(current)setLoaded({index:modelIndex,curves});},()=>{if(current)setLoadError(modelIndex);});return()=>{current=false;};},[modelIndex,retry]);
 const ready=modelIndex!==null&&loaded?.index===modelIndex;
 const zams=useMemo(()=>anchor?nativeZamsCurve(anchor.modulus,anchor.ebv):[],[anchor]);
 const iso=useMemo(()=>params&&ready?nativeIsochroneCurve(loaded!.curves,params):[],[params,ready,loaded]);
 const zamsPath=useMemo(()=>zams.map(p=>frame?`${clusterNativeHrX(p.color)},${clusterNativeHrY(p.v)}`:`${x(p.color)},${y(p.v)}`).join(' '),[zams,frame]);
 const isoPath=useMemo(()=>iso.map(p=>frame?`${clusterNativeHrX(p.color)},${clusterNativeHrY(p.v)}`:`${x(p.color)},${y(p.v)}`).join(' '),[iso,frame]);
 const tableRows=useMemo(()=>tableOpen?<>{zams.map((p,i)=><tr key={`z${i}`}><td>{t('nc.zams')}</td><td>{num(p.color)}</td><td>{num(p.v)}</td></tr>)}{iso.map((p,i)=><tr key={`i${i}`}><td>{t('nc.isochrone')}</td><td>{num(p.color)}</td><td>{num(p.v)}</td></tr>)}</>:null,[tableOpen,zams,iso]);
 const values=params?nativeClusterValues(params):null;
 const update=(change:Partial<NativeClusterDraft>)=>onDraft({...d,...change});
 const curveVisible=frame?clusterDatabaseHrCurveInFrame:visible;
 // Native frame routes: fixed native frame, text-driven sliders and the recovered parameter report of the visible trial.
 const ownFramePoints=useMemo(()=>own?observedPoints.map(p=>Object.freeze({id:p.targetId,bMinusV:p.bMinusV,v:p.v})):null,[own,observedPoints]);
 const partition=useMemo<Readonly<{inside:readonly FramePoint[];outside:readonly FramePoint[]}>|null>(()=>referenceData?clusterDatabaseHrPartition(referenceData.points):ownFramePoints?clusterDatabaseHrPartition(ownFramePoints):null,[referenceData?.points,ownFramePoints]);
 // Front V2 M2: the database plot extent of 0x542bf4 (no frame clip, 496×506 bitmap, native texts and curve rules).
 const dbPlot=useMemo(()=>referenceData?clusterHrPlotModel(referenceData.points):null,[referenceData?.points]);
 const dbZams=useMemo(()=>referenceData?clusterHrZamsPolyline(zams).map(p=>`${p.x},${p.y}`).join(' '):'',[referenceData,zams]);
 const dbIso=useMemo(()=>referenceData?clusterHrIsochronePolyline(iso).map(p=>`${p.x},${p.y}`).join(' '):'',[referenceData,iso]);
 // Front V2 M3: right-click selection over the V bank (removed records included), 0x543bfc / 0x544304.
 const plotSvg=useRef<SVGSVGElement>(null);
 const vBank=useMemo(()=>referenceData?.bank?clusterVBank(referenceData.bank):null,[referenceData?.bank]);
 const marker=useMemo(()=>{const id=referenceData?.markerId,p=id?referenceData?.bank?.find(q=>q.id===id):null;return p?clusterHrPixel(p):null;},[referenceData?.markerId,referenceData?.bank]);
 function pickClient(svg:SVGSVGElement,clientX:number,clientY:number){
  if(!vBank||!referenceData?.onPick)return;
  const m=svg.getScreenCTM();if(!m)return;
  const pt=new DOMPoint(clientX,clientY).matrixTransform(m.inverse()),hit=clusterHrHitTest(vBank,Math.floor(pt.x),Math.floor(pt.y));
  if(hit)referenceData.onPick(vBank[hit.index].id);
 }
 // A right click (contextmenu) picks, as VIREO's right button does. iOS Safari fires no contextmenu on a long press, so a
 // touch held still for 500 ms picks too [W]; the contextmenu that Android may fire afterwards is then ignored.
 const longPress=useRef<{id:number;x:number;y:number;timer:number}|null>(null),pressedAt=useRef(0);
 function pickAt(e:React.MouseEvent<SVGSVGElement>){
  // A contextmenu (Android fires one during a long press) cancels the pending press timer, so the press picks once; the
  // contextmenu Android may fire after a long press already picked is ignored for 800 ms (review L6). Mouse right clicks are
  // never debounced: two separate right clicks are two picks, as in VIREO.
  e.preventDefault();cancelPress();if(Date.now()-pressedAt.current<800)return;pickClient(e.currentTarget,e.clientX,e.clientY);
 }
 function cancelPress(){if(longPress.current){window.clearTimeout(longPress.current.timer);longPress.current=null;}}
 function pressStart(e:React.PointerEvent<SVGSVGElement>){
  if(e.pointerType!=='touch'||!vBank||!referenceData?.onPick)return;cancelPress();
  const svg=e.currentTarget,x=e.clientX,y=e.clientY;
  longPress.current={id:e.pointerId,x,y,timer:window.setTimeout(()=>{longPress.current=null;pressedAt.current=Date.now();pickClient(svg,x,y);},500)};
 }
 function pressMove(e:React.PointerEvent<SVGSVGElement>){const p=longPress.current;if(p&&p.id===e.pointerId&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>10)cancelPress();}
 useEffect(()=>cancelPress,[]);
 const sliderTicks=useMemo(()=>nativeClusterDraftTicks(d),[d.modulus,d.ebv,d.logAge,d.offset]);
 const hrTrial=useMemo(()=>frame?clusterDatabaseHrTrial(d,ready):null,[frame,d.modulus,d.ebv,d.logAge,d.modelIndex,d.offset,d.extinctionCorrected,ready]);
 // The own report names its actual source(the learner's confirmed exercise pairs), never a catalog or DAT identity.
 const reportLabel=own?t('ownHr.reportLabel'):referenceData?.label??'';
 const report=useMemo(()=>hrTrial?clusterDatabaseHrReport(reportLabel,hrTrial):null,[hrTrial,reportLabel]);
 const reportKind=draft?'db.reportTrial':fit?'db.reportConfirmed':'db.reportNone';
 const [reportOpen,setReportOpen]=useState(false),[printing,setPrinting]=useState(false);
 const validTrial=hrTrial?.isochroneShown??false;
 const progress=useRef(onDatabaseProgress);progress.current=onDatabaseProgress;
 useEffect(()=>{progress.current?.({validTrial,reportOpen});},[validTrial,reportOpen]);
 useEffect(()=>()=>{progress.current?.({validTrial:false,reportOpen:false});},[]);
 // Front R4b: the report's List › Print... is the shared TInfoListForm1 page (0x59e4c0) on both native routes.
 useEffect(()=>{if(busy)setPrinting(false);},[busy]);
 // An unset slider rests at its minimum,where the browser sees no change;an explicit unmodified minimum key or a completed
 // primary press released there sets that minimum. Focus,render,cancelled or modified actions and set sliders stay native.
 const press=useRef<{field:ClusterDatabaseHrSliderField;pointerId:number}|null>(null);
 useEffect(()=>{if(busy)press.current=null;},[busy]);
 const plain=(e:{altKey:boolean;ctrlKey:boolean;metaKey:boolean;shiftKey:boolean})=>!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey;
 const release=(e:{pointerId:number})=>{if(press.current?.pointerId===e.pointerId)press.current=null;};
 const slider=(field:ClusterDatabaseHrSliderField)=>{
  if(!frame)return null;const n=sliderTicks[field],range=CLUSTER_DATABASE_HR_SLIDERS[field],text=n===null?null:clusterDatabaseHrSliderText(field,n),id=`${prefix}native-${field.toLowerCase()}-slider`;
  const toMin=()=>onDraft(nativeClusterDraftWithTicks(d,field,range.min));
  return <div className="db-hr-slider"><label htmlFor={id}>{t(SLIDER_LABEL[field])}</label><input type="range" id={id} min={range.min} max={range.max} step={1} value={n??range.min} aria-valuetext={text??t('db.sliderNotSet')} aria-describedby={prefix+'native-slider-help'} data-unset={n===null||undefined} disabled={busy} onChange={e=>onDraft(nativeClusterDraftWithTicks(d,field,Number(e.target.value)))}
   onKeyDown={e=>{if(n!==null||busy||!plain(e))return;const back=getComputedStyle(e.currentTarget).direction==='rtl'?'ArrowRight':'ArrowLeft';if(e.key==='Home'||e.key==='PageDown'||e.key==='ArrowDown'||e.key===back){e.preventDefault();toMin();}}}
   onPointerDown={e=>{press.current=n===null&&!busy&&e.isPrimary&&e.button===0&&plain(e)?{field,pointerId:e.pointerId}:null;}}
   onPointerUp={e=>{const p=press.current;press.current=null;if(p?.field===field&&p.pointerId===e.pointerId&&n===null&&!busy&&plain(e)&&e.currentTarget.value===String(range.min))toMin();}}
   onPointerCancel={release} onPointerLeave={release}/><output htmlFor={id} data-testid={rid('slider-'+field)}>{text??'— '+t('db.sliderNotSet')}</output></div>;
 };
 const label=(p:PleiadesPoint)=>PLEIADES_PHOTOMETER_TARGETS.find(r=>r.catalogId===p.targetId)?.hotlistLabel??p.targetId;
 return <section className="card pleiades-analysis native-cluster" aria-labelledby={prefix+'native-cluster-title'}><h2 id={prefix+'native-cluster-title'}>{t(own?'ownHr.title':'nc.title')}</h2><CleaHelp testId={referenceData?'cluster-help':own?'own-hr-help':'photo-hr-help'}/><p>{t(referenceData?'db.curveIntro':own?'ownHr.intro':'nc.intro')}</p>{own&&<p className="lab-recovery" data-testid="own-hr-adaptation">{t('ownHr.adaptation')}</p>}{own&&<p data-testid="own-hr-source">{t('ownHr.source')}</p>}<p data-testid={own?'own-hr-pairs':undefined}>{referenceData?.totalPointCount!==undefined?t('ce.used',{included:points.length,total:referenceData.totalPointCount}):own?t('ownHr.pairs',{count:points.length,total:PLEIADES_PHOTOMETER_TARGETS.length}):t(referenceData?'db.referencePoints':'nc.manual',{count:points.length})}</p>{own&&<p data-testid="own-hr-minimum">{t('ownHr.minimum')}</p>}{dbPlot?<p data-testid={rid('hr-drawn-count')}>{HR.dbDrawn(dbPlot.drawn,dbPlot.drawn-dbPlot.outsideFrame,dbPlot.outsideFrame-dbPlot.offImage,dbPlot.offImage)}</p>:partition&&<p data-testid={rid('hr-drawn-count')}>{t(own?'ownHr.drawn':'db.hrDrawn',{inside:partition.inside.length,outside:partition.outside.length})}</p>}<p className="observatory-note">{referenceData?HR.dbAxes:t(own?'ownHr.axes':'nc.axes')}</p>{frame&&<p className="observatory-note">{referenceData?HR.dbFrameNote:t('db.frameNote')}</p>}
 {frame&&partition&&<div className="cluster-hr-help-bar"><HrPrint trial={hrTrial} plot={plotSvg} testId={referenceData?'db-hr-print':'own-hr-print'}/>{referenceData?.tools}{own&&<ObservationDataUnavailable testId="own-hr-display-data"/>}</div>}{frame&&partition?<div className="pleiades-chart-scroll db-hr-scroll" role="region" tabIndex={0} aria-label={t('nc.chartRegion')}><svg ref={plotSvg} viewBox={`0 0 ${dbPlot?CLUSTER_HR_IMAGE.width:DB_W} ${dbPlot?CLUSTER_HR_IMAGE.height:DB_H}`} width={dbPlot?CLUSTER_HR_IMAGE.width:DB_W} height={dbPlot?CLUSTER_HR_IMAGE.height:DB_H} onContextMenu={dbPlot?pickAt:undefined} onPointerDown={dbPlot?pressStart:undefined} onPointerMove={dbPlot?pressMove:undefined} onPointerUp={dbPlot?cancelPress:undefined} onPointerCancel={dbPlot?cancelPress:undefined} className={dbPlot?'db-hr-pickable':undefined} data-testid={dbPlot?'db-hr-plot':undefined} role="img" aria-labelledby={`${prefix}native-chart-title ${prefix}native-chart-desc`}><title id={prefix+'native-chart-title'}>{t(own?'ownHr.chartTitle':'db.chartTitle')}</title><desc id={prefix+'native-chart-desc'}>{referenceData?t('db.chartDescription',{cluster:referenceData.label??t('db.referenceLabel')}):t('ownHr.chartDescription')}</desc><defs><clipPath id={prefix+'native-cluster-clip'}><rect x={G.left} y={G.top} width={G.widthPx} height={G.heightPx}/></clipPath></defs>
 <polyline points={nativeFrame.axis.map(p=>p.join(',')).join(' ')} className="db-hr-axis"/>{nativeFrame.ticks.map((k,i)=><line key={i} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} className="db-hr-tick"/>)}{nativeFrame.texts.map((k,i)=><text key={i} x={k.x} y={k.y} className="db-hr-label">{k.text}</text>)}
 {dbPlot?<>{zams.length>0&&<polyline data-testid={tid('native-zams')} points={dbZams} stroke="#8d641d" strokeWidth="2" fill="none"/>}{iso.length>0&&<polyline data-testid={tid('native-isochrone')} points={dbIso} stroke="#8c4591" strokeWidth="2" fill="none"/>}{dbPlot.points.filter(p=>p.onImage).map(({point:p,x:px,y:py,inFrame})=><circle data-testid="native-observed-point" key={p.id} data-outside-frame={!inFrame||undefined} cx={px} cy={py} r={G.marker} fill="#206252" data-inspected={referenceData!.selectedId===p.id||undefined} stroke={referenceData!.selectedId===p.id?'#b87328':undefined} strokeWidth={referenceData!.selectedId===p.id?2:undefined}/>)}{marker&&<ellipse data-testid="db-hr-marker" cx={marker.x} cy={marker.y} rx={G.marker+3} ry={G.marker+3} fill="none" stroke="#ff00ff" strokeWidth="2"/>}<text x={G.right} y={G.top} textAnchor="end" dominantBaseline="hanging" className="db-hr-label" data-testid="db-hr-name">{referenceData!.label}</text><text x={G.right} y={G.top+18} textAnchor="end" dominantBaseline="hanging" className="db-hr-label" data-testid="db-hr-star-count">{dbPlot.countLabel}</text></>:<><g clipPath={`url(#${prefix}native-cluster-clip)`}>{zams.length>0&&<polyline data-testid={tid('native-zams')} points={zamsPath} stroke="#8d641d" strokeWidth="2" fill="none"/>}{iso.length>0&&<polyline data-testid={tid('native-isochrone')} points={isoPath} stroke="#8c4591" strokeWidth="2" fill="none"/>}</g>{partition.inside.map(p=>referenceData?<circle data-testid="native-observed-point" key={p.id} cx={clusterNativeHrX(p.bMinusV)} cy={clusterNativeHrY(p.v)} r={G.marker} fill="#206252" data-inspected={referenceData.selectedId===p.id||undefined} stroke={referenceData.selectedId===p.id?'#b87328':undefined} strokeWidth={referenceData.selectedId===p.id?2:undefined}/>:<circle data-testid={tid('native-observed-point')} data-target={p.id} key={p.id} cx={clusterNativeHrX(p.bMinusV)} cy={clusterNativeHrY(p.v)} r={G.marker} fill="#206252"/>)}</>}</svg></div>
 :<div className="pleiades-chart-scroll" role="region" tabIndex={0} aria-label={t('nc.chartRegion')}><svg viewBox="0 0 760 620" role="img" aria-labelledby={`${prefix}native-chart-title ${prefix}native-chart-desc`}><title id={prefix+'native-chart-title'}>{t(referenceData?'db.chartTitle':'nc.chartTitle')}</title><desc id={prefix+'native-chart-desc'}>{referenceData?t('db.chartDescription',{cluster:referenceData.label??t('db.referenceLabel')}):t('nc.chartDescription')}</desc><defs><clipPath id={prefix+'native-cluster-clip'}><rect x="70" y="40" width="600" height="500"/></clipPath></defs>
 {[0,5,10,15,20,25].map(v=><g key={v}><line x1="70" x2="670" y1={y(v)} y2={y(v)} stroke="#e2eae6"/><text x="57" y={y(v)+5} textAnchor="end">{v}</text></g>)}{[-.4,0,.4,.8,1.2,1.8].map(c=><text key={c} x={x(c)} y="567" textAnchor="middle">{num(c)}</text>)}<path d="M70 40V540H670" fill="none" stroke="#264e44" strokeWidth="2"/><text x="370" y="603" textAnchor="middle">{t('nc.axisColor')}</text><text transform="translate(18 290) rotate(-90)" textAnchor="middle">{t('nc.axisV')}</text>
 <g clipPath={`url(#${prefix}native-cluster-clip)`}>{zams.length>0&&<polyline data-testid="native-zams" points={zamsPath} stroke="#8d641d" strokeWidth="2.5" fill="none"/>}{iso.length>0&&<polyline data-testid="native-isochrone" points={isoPath} stroke="#8c4591" strokeWidth="2.5" fill="none"/>}{points.filter(pleiadesPointVisible).map(p=><circle data-testid="native-observed-point" key={p.targetId} cx={x(p.bMinusV)} cy={y(p.v)} r="5" fill="#206252" data-inspected={referenceData?.selectedId===p.targetId||undefined} stroke={referenceData?.selectedId===p.targetId?'#b87328':undefined} strokeWidth={referenceData?.selectedId===p.targetId?3:undefined}/>)}</g></svg></div>}
 {!referenceData&&<PhotometerPlotSettings points={observedPoints} prefix={own?'own-hr':'native'}/>}
 {own&&<><h3 id="own-hr-pairs-title">{t('ownHr.pairsTitle')}</h3><p>{t('ownHr.pairsHelp')}</p>{observedPoints.length>0?<div className="photometer-table" role="region" tabIndex={0} aria-labelledby="own-hr-pairs-title"><table data-testid="own-hr-pairs-table"><thead><tr><th>{t('ownHr.columnStar')}</th><th>{t('ownHr.columnCatalog')}</th><th>{t('ownHr.columnB')}</th><th>{t('ownHr.columnV')}</th><th>{t('ownHr.columnColor')}</th><th>{t('ownHr.columnReadings')}</th><th>{t('ph.telescopeColumn')}</th><th>{t('ph.apertureColumn')}</th><th>{t('ownHr.columnFrame')}</th></tr></thead><tbody>{observedPoints.map(p=>{const inside=clusterDatabaseHrInFrame(p);return <tr key={p.targetId} data-testid="own-hr-pair" data-target={p.targetId} data-outside={!inside||undefined}><td>{t('ownHr.star',{number:p.hotlistNumber,label:label(p)})}</td><td>{p.targetId}</td><td>{typed(p.b)}</td><td>{typed(p.v)}</td><td>{typed(p.bMinusV)}</td><td>{t('ownHr.readings',{b:p.bReadingId,v:p.vReadingId})}</td><td>{opticalProfile(p.telescopeIndex??0).name}</td><td>{p.apertureSelector??10}</td><td>{t(inside?'ownHr.inside':'ownHr.outside')}</td></tr>;})}</tbody></table></div>:<p data-testid="own-hr-empty">{t('ownHr.empty')}</p>}</>}
 <p>{t(referenceData?'db.legend':own?'ownHr.legend':'nc.legend')}</p>{referenceData?.selectedId&&<p>{t('ce.inspectedMarker')}</p>}<p>{t('nc.nodes',{zams:zams.length,iso:iso.length,hidden:zams.filter(p=>!curveVisible(p)).length+iso.filter(p=>!curveVisible(p)).length})}</p>
 <div className="native-cluster-inputs"><div><label htmlFor={prefix+'native-modulus'}>{t('nc.modulus')}</label><input type="text" id={prefix+'native-modulus'} value={d.modulus} inputMode="decimal" maxLength={80} disabled={busy} onChange={e=>update({modulus:e.target.value})}/>{slider('modulus')}</div><div><label htmlFor={prefix+'native-ebv'}>{t('nc.ebv')}</label><input type="text" id={prefix+'native-ebv'} value={d.ebv} inputMode="decimal" maxLength={80} disabled={busy} onChange={e=>update({ebv:e.target.value})}/>{slider('ebv')}</div><div><label htmlFor={prefix+'native-logage'}>{t('nc.logAge')}</label><input type="text" id={prefix+'native-logage'} value={d.logAge} inputMode="decimal" maxLength={80} disabled={busy} onChange={e=>update({logAge:e.target.value})}/>{slider('logAge')}</div><div><label htmlFor={prefix+'native-model'}>{t('nc.model')}</label><select id={prefix+'native-model'} value={d.modelIndex} disabled={busy} onChange={e=>update({modelIndex:e.target.value})}><option value="">{t('nc.chooseModel')}</option>{NATIVE_CLUSTER_MODELS.map(m=><option key={m.index} value={m.index}>{m.label}</option>)}</select></div><div><label htmlFor={prefix+'native-offset'}>{t('nc.offset')}</label><input type="text" id={prefix+'native-offset'} value={d.offset} inputMode="decimal" maxLength={80} disabled={busy} onChange={e=>update({offset:e.target.value})}/>{slider('offset')}</div></div>
 {frame&&<p id={prefix+'native-slider-help'} className="observatory-note">{t('db.sliderHelp')}</p>}
 <label className="native-correction"><input type="checkbox" checked={d.extinctionCorrected} disabled={busy} onChange={e=>update({extinctionCorrected:e.target.checked})}/>{t('nc.correctExtinction')}</label><p>{t('nc.correctionHelp')}</p><label htmlFor={prefix+'native-interpretation'}>{t('nc.interpretation')}</label><textarea id={prefix+'native-interpretation'} value={d.interpretation} maxLength={500} disabled={busy} onChange={e=>update({interpretation:e.target.value})}/>
 {draft&&!params&&<p role="status">{t('nc.incomplete')}</p>}{modelIndex!==null&&!ready&&loadError!==modelIndex&&<p role="status">{t('nc.loading')}</p>}{loadError===modelIndex&&modelIndex!==null&&<div><p role="alert">{t('nc.loadError')}</p><button disabled={busy} onClick={()=>setRetry(r=>r+1)}>{t('nc.retry')}</button></div>}
 {values&&draft&&<p data-testid={tid('native-preview')}>{t('nc.preview',{age:num(values.ageMyr),distance:num(values.distancePc),av:num(values.extinctionMagnitude)})}</p>}
 <div className="sky-actions"><button id={frame?prefix+'native-confirm':undefined} className="primary-button" disabled={busy||state?.phase==='running'||points.length<2||!params||!ready||(sameNativeCluster(fit,params)&&!referenceData?.provenanceChanged)} onClick={()=>{if(params&&onConfirm(params))onDraft(null);}}>{t('nc.confirm')}</button><button className="secondary-button" disabled={busy||draft===null} onClick={()=>onDraft(null)}>{t('nc.discard')}</button></div>
 {own&&ownIssue==='refused'&&<p role="alert" data-testid="own-hr-refused">{t('ownHr.refused')}</p>}{own&&(ownIssue==='limit'||ownIssue==='error')&&<p role="alert" data-testid="own-hr-confirm-error" data-reason={ownIssue}>{t(ownIssue==='limit'?'ph.seriesLimit':'nc.error')}</p>}
 {fit?<section aria-label={t('nc.confirmed')}><h3>{t('nc.confirmed')}</h3><dl className="pleiades-results"><dt>{t('nc.model')}</dt><dd data-testid={tid('native-confirmed-model')}>{NATIVE_CLUSTER_MODELS[fit.modelIndex]!.label}</dd><dt>{t('nc.confirmedLogAge')}</dt><dd data-testid={tid('native-confirmed-logage')}>{num(fit.logAge)}</dd><dt>{t('nc.ageMyr')}</dt><dd data-testid={tid('native-confirmed-age')}>{num(fit.ageMyr)}</dd><dt>{t('nc.modulus')}</dt><dd data-testid={tid('native-confirmed-modulus')}>{num(fit.modulus)}</dd><dt>{t('nc.ebv')}</dt><dd data-testid={tid('native-confirmed-ebv')}>{num(fit.ebv)}</dd><dt>{t('nc.offset')}</dt><dd>{num(fit.offset)}</dd><dt>{t('nc.appliedExtinction')}</dt><dd data-testid={tid('native-confirmed-av')}>{num(fit.extinctionMagnitude)}</dd><dt>{t('pa.parsecs')}</dt><dd data-testid={tid('native-confirmed-distance')}>{num(fit.distancePc)}</dd></dl><p>{t(referenceData?'db.fitSource':own?'ownHr.fitSource':'nc.fitSource',{count:fit.points.length})}</p><p data-testid={tid('native-confirmed-interpretation')}>{fit.interpretation||t('nc.noInterpretation')}</p></section>:<p>{t('nc.unconfirmed')}</p>}
 <details onToggle={e=>setTableOpen(e.currentTarget.open)}><summary>{t('nc.curveValues')}</summary><p>{t('nc.curveHelp')}</p><div className="photometer-table"><table><thead><tr><th>{t('nc.curve')}</th><th>{t('nc.modelColor')}</th><th>{t('nc.modelV')}</th></tr></thead><tbody>{tableRows}</tbody></table></div></details>
 {frame&&report&&hrTrial&&<details className={own?'own-hr-report':'db-hr-report'} onToggle={e=>setReportOpen(e.currentTarget.open)}><summary id={prefix+'native-report'}>{t('db.reportSummary')}</summary><div><p data-testid={rid('hr-report-kind')}><strong>{t(reportKind)}</strong></p><figure className="db-hr-report-figure"><figcaption>{report.caption}</figcaption><pre data-testid={rid('hr-report')}>{report.lines.join('\n')}</pre></figure>{(referenceData||own)&&<p className="observatory-note" data-testid={rid('hr-test-mode-note')}>{HR.testModeNote}</p>}</div>
 {!hrTrial.zamsShown&&<p data-testid={rid('hr-report-empty')}>{t(own?'ownHr.reportEmpty':'db.reportEmpty')}</p>}{hrTrial.zamsShown&&!hrTrial.isochroneShown&&<p data-testid={rid('hr-report-no-isochrone')}>{t('db.reportNoIsochrone')}</p>}<p className="observatory-note">{t('db.reportNote')}</p>
 <div className="sky-actions"><button type="button" className="secondary-button" data-testid={rid('hr-report-print')} onClick={()=>setPrinting(true)}>{t('db.print')}</button></div><p className="observatory-note">{HR.reportPrintNote}</p>
  {printing&&<InfoListPrintPreview testId={rid('hr-report-print-preview')} caption={report.caption} lines={report.lines} onClose={()=>setPrinting(false)}/>}</details>}
 <p className="observatory-note">{t(referenceData?'db.limits':own?'ownHr.limits':'nc.limits')}</p></section>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(NativeClusterAnalysis);
