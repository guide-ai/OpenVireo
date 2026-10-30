import {memo} from 'react';
import{useEffect,useLayoutEffect,useMemo,useRef,useState,type ChangeEvent}from'react';
import'./ClusterNativeObservationHr.css';
import{nativeObservationBytes}from'../core/nativeObservationResults';
import type{NativeResultList}from'../core/nativeResultList';
import{NATIVE_CLUSTER_MODELS}from'../core/nativeCluster';
import{nativeIsochroneCurve,nativeZamsCurve,type NativeModelCurves}from'../core/nativeClusterCurves';
import{loadNativeClusterModel}from'../io/nativeClusterModels';
import{readNativeObservationFile}from'../io/nativeObservationResults';
import{addClusterNativeHrPending,armClusterNativeHrReplace,beginClusterNativeHrRead,cancelClusterNativeHrPending,cancelClusterNativeHrRead,clearClusterNativeHrOverlays,clusterNativeHrBlockedRows,clusterNativeHrFrame,clusterNativeHrHundredths as hundredths,clusterNativeHrLogAgeTicks,clusterNativeHrPlot,clusterNativeHrRecords,clusterNativeHrReport,clusterNativeHrX,clusterNativeHrY,completeClusterNativeHrRead,confirmClusterNativeHrReplace,disarmClusterNativeHrReplace,dismissClusterNativeHrError,EMPTY_CLUSTER_NATIVE_HR,failClusterNativeHrRead,plotClusterNativeHrObservations,setClusterNativeHrTrial,CLUSTER_NATIVE_HR_GEOMETRY as G,type ClusterNativeHrTrial,type ClusterNativeHrWorkspace}from'../core/clusterNativeObservationHr';
import{CLUSTER_NATIVE_HR_MESSAGES,type ClusterNativeHrMessages}from'./ClusterNativeObservationHrMessages';
import CleaHelp from '../clusters/CleaHelp';
import HrPrint,{ObservationDataUnavailable} from '../clusters/HrPrint';

export type ClusterNativeObservationHrProps=Readonly<{
 /** Optional handoff of an already ordered native results list(e.g. from the DAT inspector). */
 initialList?:NativeResultList|null;
 /** Translated replacements;missing keys fall back to English. */
 messages?:Partial<ClusterNativeHrMessages>;
 /** Prefix for DOM ids when more than one panel is mounted. */
 idPrefix?:string;
 /** Disable every control while the host is saving/restoring. */
 disabled?:boolean;
 /** Observe live workspace changes(session integration is the host's decision). */
 onWorkspaceChange?:(w:ClusterNativeHrWorkspace)=>void;
}>;
const show4=(v:number)=>Number.isFinite(v)?v.toFixed(4):String(v);
const frame=clusterNativeHrFrame();
const VIEW_W=470,VIEW_H=500;

function ClusterNativeObservationHr({initialList=null,messages,idPrefix='cnhr-',disabled=false,onWorkspaceChange}:ClusterNativeObservationHrProps){
 const m=useMemo(()=>({...CLUSTER_NATIVE_HR_MESSAGES,...messages}),[messages]);
 const [w,setW]=useState<ClusterNativeHrWorkspace>(()=>initialList?Object.freeze({...EMPTY_CLUSTER_NATIVE_HR,list:initialList}):EMPTY_CLUSTER_NATIVE_HR);
 const token=useRef(0),input=useRef<HTMLInputElement>(null);
 const plotSvg=useRef<SVGSVGElement>(null),addButton=useRef<HTMLButtonElement>(null),confirmButton=useRef<HTMLButtonElement>(null),cancelReadButton=useRef<HTMLButtonElement>(null);
 const focusIntent=useRef<'input'|'add'|'confirm'|'cancelRead'|null>(null),activeRead=useRef<number|null>(null);
 const [downloadErrorFor,setDownloadErrorFor]=useState<NativeResultList|null>(null);
 const interactionVersion=useRef(0),asyncFocus=useRef<{owner:Element;version:number}|null>(null);
 useEffect(()=>{const changed=()=>{interactionVersion.current++;};document.addEventListener('focusin',changed,true);document.addEventListener('pointerdown',changed,true);return()=>{document.removeEventListener('focusin',changed,true);document.removeEventListener('pointerdown',changed,true);};},[]);
 // Explicit local actions own focus; host navigation/restore must not steal it.
 useLayoutEffect(()=>{if(disabled){focusIntent.current=null;asyncFocus.current=null;activeRead.current=null;return;}const intent=focusIntent.current,origin=asyncFocus.current;if(!intent)return;focusIntent.current=null;asyncFocus.current=null;
  if(origin){const active=document.activeElement;if(origin.version!==interactionVersion.current||!(active===origin.owner||(active===document.body&&(!origin.owner.isConnected||(origin.owner===input.current&&input.current.disabled)))))return;}
  const target=intent==='confirm'?confirmButton.current:intent==='add'?addButton.current:intent==='cancelRead'?cancelReadButton.current:input.current;
  if(target&&!target.disabled)target.focus({preventScroll:origin!==null});else if(addButton.current&&!addButton.current.disabled)addButton.current.focus({preventScroll:origin!==null});else if(input.current&&!input.current.disabled)input.current.focus({preventScroll:origin!==null});
 },[w,disabled]);
 const change=(action:(c:ClusterNativeHrWorkspace)=>ClusterNativeHrWorkspace,target:'input'|'add'|'confirm')=>{asyncFocus.current=null;focusIntent.current=target;setW(action);};
 // Navigation,collapsed workspace or host restore cancels only an in-flight
 // read. The current list,reviewed candidate and manual trial stay owned here.
 useEffect(()=>{if(disabled){activeRead.current=null;setW(cancelClusterNativeHrRead);}},[disabled]);
 useEffect(()=>()=>{activeRead.current=null;},[]);
 useEffect(()=>{onWorkspaceChange?.(w);},[w,onWorkspaceChange]);
 const records=clusterNativeHrRecords(w),busy=disabled||w.reading!==null;
 const plot=useMemo(()=>w.list?clusterNativeHrPlot(w.list.data):clusterNativeHrPlot({records:[]}),[w.list]);
 const report=useMemo(()=>clusterNativeHrReport(w.trial),[w.trial]);
 const trial=w.trial;
 // Original model curves:verified bundled payloads,late responses cannot replace a newer choice.
 const [model,setModel]=useState<{index:number;curves:NativeModelCurves}|null>(null),[modelError,setModelError]=useState<number|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!trial.isochroneShown)return;let current=true;setModelError(null);void loadNativeClusterModel(trial.modelIndex).then(curves=>{if(current)setModel({index:trial.modelIndex,curves});},()=>{if(current)setModelError(trial.modelIndex);});return()=>{current=false;};},[trial.isochroneShown,trial.modelIndex,retry]);
 const modelReady=trial.isochroneShown&&model?.index===trial.modelIndex;
 const zamsPath=useMemo(()=>trial.zamsShown?nativeZamsCurve(trial.modulusTicks/100,trial.ebvTicks/100).map(p=>`${clusterNativeHrX(p.color)},${clusterNativeHrY(p.v)}`).join(' '):'',[trial.zamsShown,trial.modulusTicks,trial.ebvTicks]);
 const isoPath=useMemo(()=>modelReady?nativeIsochroneCurve(model!.curves,{modulusTicks:trial.modulusTicks,ebvTicks:trial.ebvTicks,ageIndex:trial.ageIndex,modelIndex:trial.modelIndex,offsetTicks:trial.offsetTicks,extinctionCorrected:false,interpretation:''}).map(p=>`${clusterNativeHrX(p.color)},${clusterNativeHrY(p.v)}`).join(' '):'',[modelReady,model,trial.modulusTicks,trial.ebvTicks,trial.ageIndex,trial.modelIndex,trial.offsetTicks]);
 const updateTrial=(change:Partial<ClusterNativeHrTrial>)=>setW(c=>setClusterNativeHrTrial(c,change));

 function choose(e:ChangeEvent<HTMLInputElement>){
  const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file||busy||w.pending)return;const t=++token.current;
  asyncFocus.current=null;focusIntent.current='cancelRead';activeRead.current=t;setDownloadErrorFor(null);setW(c=>beginClusterNativeHrRead(c,t,file.name));
  const settleFocus=(target:'add'|'input')=>{const owner=document.activeElement,owned=owner!==null&&(owner===cancelReadButton.current||owner===input.current);focusIntent.current=owned?target:null;asyncFocus.current=owned?{owner,version:interactionVersion.current}:null;};
  readNativeObservationFile(file).then(f=>{if(activeRead.current!==t)return;activeRead.current=null;settleFocus('add');setW(c=>completeClusterNativeHrRead(c,t,f));},error=>{if(activeRead.current!==t)return;activeRead.current=null;settleFocus('input');setW(c=>failClusterNativeHrRead(c,t,error));});
 }
 function download(){
  if(!w.list)return;let url:string|undefined;setDownloadErrorFor(null);
  try{url=URL.createObjectURL(new Blob([nativeObservationBytes(w.list.data).buffer as ArrayBuffer],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=url;a.download='observation-results.dat';a.click();const started=url;setTimeout(()=>URL.revokeObjectURL(started),1000);}
  catch{if(url)URL.revokeObjectURL(url);setDownloadErrorFor(w.list);}
 }
 const shownPlot=w.observationsPlotted&&plot.status==='plotted'?plot:null;
 const tableRows=useMemo(()=>shownPlot?.rows??(w.observationsPlotted&&plot.status==='blocked'&&w.list?clusterNativeHrBlockedRows(w.list.data,plot):[]),[shownPlot,w.observationsPlotted,w.list,plot]);
 const offAxes=shownPlot?shownPlot.rows.filter(r=>r.status==='plotted'&&!r.inFrame).length:0;
 const id=(s:string)=>idPrefix+s;
 return <section className="card cluster-native-hr" aria-labelledby={id('title')}>
  <h2 id={id('title')}>{m.title}</h2><CleaHelp testId={`${idPrefix}help`}/><p>{m.intro}</p>

  <section aria-labelledby={id('results')}><h3 id={id('results')}>{m.resultsHeading}</h3>
   <label htmlFor={id('file')}>{m.chooseFile}</label><input ref={input} id={id('file')} type="file" accept=".dat,.DAT,application/octet-stream" disabled={busy||w.pending!==null} onChange={choose}/><p className="cluster-native-hr-note">{m.fileHelp}</p>
   {w.reading&&<p role="status">{m.reading(w.reading.name)} <button type="button" className="secondary-button" ref={cancelReadButton} onClick={()=>{activeRead.current=null;change(cancelClusterNativeHrRead,'input');}}>{m.cancelRead}</button></p>}
   {w.error&&<div role="alert" className="cluster-native-hr-error"><p>{m.errors[w.error]}</p><button type="button" className="secondary-button" onClick={()=>change(dismissClusterNativeHrError,'input')}>{m.dismiss}</button></div>}
   {w.pending&&<div className="cluster-native-hr-review" role="group" aria-labelledby={id('review')}><h4 id={id('review')}>{m.reviewHeading}</h4><p data-testid="cnhr-pending">{m.reviewSummary(w.pending.name,w.pending.data.records.length)}</p><p className="cluster-native-hr-sha">{m.sha}: <code>{w.pending.sha256}</code></p>
    {w.replaceArmed?<div><p>{m.replaceQuestion(records)}</p><div className="cnhr-actions"><button type="button" className="primary-button" disabled={disabled} ref={confirmButton} onClick={()=>change(confirmClusterNativeHrReplace,'input')}>{m.confirmReplace}</button><button type="button" className="secondary-button" disabled={disabled} onClick={()=>change(disarmClusterNativeHrReplace,'add')}>{m.keepCurrent}</button></div></div>
    :<div className="cnhr-actions"><button type="button" className="primary-button" disabled={disabled} ref={addButton} onClick={()=>change(addClusterNativeHrPending,'input')}>{m.addPending}</button><button type="button" className="secondary-button" disabled={disabled} onClick={()=>change(armClusterNativeHrReplace,records?'confirm':'input')}>{m.replacePending}</button><button type="button" className="secondary-button" disabled={disabled} onClick={()=>change(cancelClusterNativeHrPending,'input')}>{m.cancelPending}</button></div>}
   </div>}
   {downloadErrorFor!==null&&downloadErrorFor===w.list&&<p role="alert">{m.downloadError}</p>}
   <p data-testid="cnhr-current">{m.current(records)}</p>
   {w.receipts.length>0&&<details><summary>{m.sources}</summary><ul>{w.receipts.map((r,i)=><li key={i}>{r.name} · {r.records} · {m.sourceAction[r.action]} · <code>{r.sha256}</code></li>)}</ul></details>}
   {w.list&&<><button type="button" className="secondary-button" disabled={busy} onClick={download}>{m.download}</button><p className="cluster-native-hr-note">{m.downloadNote}</p></>}
  </section>

  <section aria-labelledby={id('plot')}><h3 id={id('plot')}>{m.plotHeading}</h3><button type="button" className="primary-button" disabled={busy} onClick={()=>setW(plotClusterNativeHrObservations)}>{m.plotButton}</button> <HrPrint trial={w.trial} plot={plotSvg} testId={`${idPrefix}print`} disabled={!w.observationsPlotted}/> <ObservationDataUnavailable testId={`${idPrefix}display-data`}/><p className="cluster-native-hr-note">{m.plotHelp}</p>
   {!w.observationsPlotted&&<p>{m.notPlotted}</p>}
   {w.observationsPlotted&&plot.status==='blocked'&&<p role="alert" data-testid="cnhr-blocked">{m.blocked(plot.recordIndex,m.blockedField[plot.field])}</p>}
   {shownPlot&&shownPlot.plottedCountKind+shownPlot.plottedOtherKind>0&&<p role="note" className="cluster-native-hr-warning">{m.kindWarning(shownPlot.plottedCountKind,shownPlot.plottedOtherKind)}</p>}
   {offAxes>0&&<p>{m.offAxes(offAxes)}</p>}
   <div className="cluster-native-hr-chart" role="region" tabIndex={0} aria-label={m.chartRegion}>
    <svg ref={plotSvg} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width={VIEW_W} height={VIEW_H} role="img" aria-labelledby={`${id('chart-title')} ${id('chart-desc')}`}>
     <title id={id('chart-title')}>{m.chartTitle}</title><desc id={id('chart-desc')}>{m.chartDescription(shownPlot?.count??0)}</desc>
     <defs><clipPath id={id('clip')}><rect x={G.left} y={G.top} width={G.widthPx} height={G.heightPx}/></clipPath></defs>
     <polyline points={frame.axis.map(p=>p.join(',')).join(' ')} className="cnhr-axis"/>
     {frame.ticks.map((t,i)=><line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className="cnhr-tick"/>)}
     {frame.texts.map((t,i)=><text key={i} x={t.x} y={t.y} className="cnhr-label">{t.text}</text>)}
     <g clipPath={`url(#${id('clip')})`}>{zamsPath&&<polyline data-testid="cnhr-zams" points={zamsPath} className="cnhr-zams"/>}{isoPath&&<polyline data-testid="cnhr-isochrone" points={isoPath} className="cnhr-isochrone"/>}</g>
     {shownPlot&&shownPlot.rows.map(r=>r.pixel&&<circle key={r.index} data-testid="cnhr-point" data-record={r.index} cx={r.pixel.x} cy={r.pixel.y} r={G.marker} className="cnhr-point"/>)}
     {shownPlot&&<text data-testid="cnhr-count" x={G.right} y={G.top} textAnchor="end" className="cnhr-label">{shownPlot.countLabel}</text>}
    </svg>
   </div>
  </section>

  <section aria-labelledby={id('overlays')}><h3 id={id('overlays')}>{m.overlaysHeading}</h3>
   <label className="cnhr-check"><input type="checkbox" checked={trial.zamsShown} disabled={disabled} onChange={e=>updateTrial({zamsShown:e.target.checked})}/>{m.zams}</label>
   <div className="cnhr-sliders">
    <label htmlFor={id('modulus')}>{m.modulus} <output htmlFor={id('modulus')} data-testid="cnhr-modulus">{hundredths(trial.modulusTicks)}</output></label><input id={id('modulus')} type="range" min={0} max={1500} step={1} value={trial.modulusTicks} aria-valuetext={hundredths(trial.modulusTicks)} disabled={disabled} onChange={e=>updateTrial({modulusTicks:Number(e.target.value)})}/>
    <label htmlFor={id('ebv')}>{m.ebv} <output htmlFor={id('ebv')} data-testid="cnhr-ebv">{hundredths(trial.ebvTicks)}</output></label><input id={id('ebv')} type="range" min={0} max={250} step={1} value={trial.ebvTicks} aria-valuetext={hundredths(trial.ebvTicks)} disabled={disabled} onChange={e=>updateTrial({ebvTicks:Number(e.target.value)})}/>
   </div><p className="cluster-native-hr-note">{m.ebvHelp}</p>
   <label className="cnhr-check"><input type="checkbox" checked={trial.isochroneShown} disabled={disabled} onChange={e=>updateTrial({isochroneShown:e.target.checked})}/>{m.isochrone}</label><p className="cluster-native-hr-note">{m.isochroneHelp}</p>
   <div className="cnhr-sliders">
    <label htmlFor={id('model')}>{m.model}</label><select id={id('model')} value={trial.modelIndex} disabled={disabled} onChange={e=>updateTrial({modelIndex:Number(e.target.value)})}>{NATIVE_CLUSTER_MODELS.map(x=><option key={x.index} value={x.index}>{x.label}</option>)}</select>
    <label htmlFor={id('age')}>{m.logAge} <output htmlFor={id('age')} data-testid="cnhr-logage">{hundredths(clusterNativeHrLogAgeTicks(trial.ageIndex))}</output></label><input id={id('age')} type="range" min={0} max={49} step={1} value={trial.ageIndex} aria-valuetext={hundredths(clusterNativeHrLogAgeTicks(trial.ageIndex))} disabled={disabled} onChange={e=>updateTrial({ageIndex:Number(e.target.value)})}/>
    <label htmlFor={id('offset')}>{m.offset} <output htmlFor={id('offset')} data-testid="cnhr-offset">{hundredths(trial.offsetTicks)}</output></label><input id={id('offset')} type="range" min={-100} max={100} step={1} value={trial.offsetTicks} aria-valuetext={hundredths(trial.offsetTicks)} disabled={disabled} onChange={e=>updateTrial({offsetTicks:Number(e.target.value)})}/>
   </div>
   {trial.isochroneShown&&!modelReady&&modelError!==trial.modelIndex&&<p role="status">{m.loadingModel}</p>}
   {trial.isochroneShown&&modelError===trial.modelIndex&&<div><p role="alert">{m.modelError}</p><button type="button" className="secondary-button" disabled={disabled} onClick={()=>setRetry(r=>r+1)}>{m.retryModel}</button></div>}
   <button type="button" className="secondary-button" disabled={disabled||!trial.zamsShown&&!trial.isochroneShown} onClick={()=>setW(clearClusterNativeHrOverlays)}>{m.clear}</button>
   <label className="cnhr-check"><input type="checkbox" checked={trial.distanceOption} disabled={disabled} onChange={e=>updateTrial({distanceOption:e.target.checked})}/>{m.distanceOption}</label>
  </section>

  <section aria-labelledby={id('report')}><h3 id={id('report')}>{m.reportHeading}</h3><figure className="cnhr-report"><figcaption>{report.caption}</figcaption><pre data-testid="cnhr-report">{report.lines.join('\n')}</pre></figure><p className="cluster-native-hr-note">{m.reportNote}</p></section>

  {((shownPlot&&shownPlot.rows.length>0)||(w.observationsPlotted&&plot.status==='blocked'&&records>0))&&<details className="cnhr-records"><summary>{m.recordsSummary}</summary><div className="photometer-table"><table><thead><tr><th scope="col">{m.colIndex}</th><th scope="col">{m.colObject}</th><th scope="col">{m.colKind}</th><th scope="col">{m.colB}</th><th scope="col">{m.colV}</th><th scope="col">{m.colBV}</th><th scope="col">{m.colPixel}</th><th scope="col">{m.colStatus}</th></tr></thead>
   <tbody>{tableRows.map(r=><tr key={r.index} data-testid="cnhr-row" data-blocking={r.status==='blocking'?'true':undefined}><td>{r.index}</td><td>{r.object}</td><td>{m.kind(r.kind)}</td><td title={m.encoding(r.storedB.hex)}>{r.b??m.storedNumber(r.storedB)}</td><td title={m.encoding(r.storedV.hex)}>{r.v??m.storedNumber(r.storedV)}</td><td title={r.bMinusV?.exact}>{r.bMinusV?show4(r.bMinusV.value):'—'}</td><td>{r.pixel?`${r.pixel.x}, ${r.pixel.y}`:'—'}</td><td>{r.status==='before-block'?m.beforeBlock:r.status==='blocking'?m.blockingRecord(m.blockedField[r.field]):r.status==='after-block'?m.afterBlock:m.status[r.status]}{r.status==='plotted'&&!r.inFrame?m.outside:''}</td></tr>)}</tbody></table></div></details>}
  <p className="cluster-native-hr-note">{m.limits}</p>
 </section>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(ClusterNativeObservationHr);
