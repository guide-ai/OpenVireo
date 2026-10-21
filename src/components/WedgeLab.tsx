import{useEffect,useLayoutEffect,useMemo,useRef,useState,type ChangeEvent}from'react';
import'./Wedge.css';
import{wedgeCsv}from'../core/wedgeExport';
import type{WedgeRecord}from'../core/wedgeLssText';
import{wedgeBitsHex,wedgeSingleExact}from'../core/wedgeNumeric';
import{WEDGE_COLOUR_SCHEMES,wedgePlot,type WedgeColourScheme,type WedgePoint}from'../core/wedgePlot';
import{EMPTY_WEDGE_WORKSPACE,addWedgePending,beginWedgeRead,cancelWedgeOptions,cancelWedgePending,cancelWedgeRead,clearWedgePending,commitWedgeOptions,completeWedgeRead,confirmWedgeDelete,dismissWedgeNotice,editWedgeOptions,failWedgeRead,openWedgeOptions,plotWedgeData,requestWedgeLoad,selectWedgeRecord,setWedgeSeparator,suspendWedgeWorkspace,type WedgeNotice,type WedgeWorkspace}from'../core/wedgeWorkspace';
import{WedgeFileError,downloadWedgeText,readWedgeLssFile}from'../io/wedgeLssFile';
import{wedgeMessages,type WedgeMessageCatalog,type WedgeMessageOverrides}from'./WedgeMessages';
import WedgeOptionsDialog from'./WedgeOptionsDialog';
import WedgePlotSvg from'./WedgePlotSvg';

export type WedgeLabProps=Readonly<{
 /** Translated replacements (any subset, nested groups partial); missing keys fall back to English. */
 messages?:WedgeMessageOverrides;
 /** Prefix for DOM ids when more than one panel is mounted. */
 idPrefix?:string;
 /** Host inactivity or project operation: every control is disabled and anything that
  * could still commit later (pending read, import confirmation, options draft) is
  * dropped. Confirmed records, receipts, options and selection are kept. */
 disabled?:boolean;
 /** Observe workspace changes; persistence is the host's decision. */
 onWorkspaceChange?:(w:WedgeWorkspace)=>void;
}>;
type Line=Readonly<{caption:string;text:string}>;
function noticeLines(n:WedgeNotice,m:WedgeMessageCatalog):readonly Line[]{
 const C=m.native;
 if(n.kind==='no-data')return[{caption:C.windowCaption,text:C.noDataToPlot}];
 if(n.kind==='loaded')return[{caption:C.loadedCaption,text:C.loadedText(n.name)}];
 const tail={caption:C.notLoadedCaption,text:C.notLoadedText};
 switch(n.cause){
  case'extension':return[{caption:C.extensionCaption,text:C.extensionText},tail];
  case'header':return[{caption:C.headerCaption,text:C.headerText(n.name)},tail];
  case'read':return[{caption:C.accessCaption,text:C.accessText(n.name)+' — '+m.readFailed},tail];
  case'unsupported':{const f=n.failure;const text=f&&f.kind==='unsupported'?m.unsupported[f.code]+(f.line?m.atLine(f.line):''):m.readFailed;return[{caption:n.name,text},tail];}
  case'capacity':return[{caption:n.name,text:m.capacity},tail];
  case'suspended':return[{caption:C.notLoadedCaption,text:m.suspended(n.name)}];
  default:return[tail];
 }
}
const fmt=(v:number,digits:number)=>Number.isFinite(v)?v.toFixed(digits):String(v);
function raCell(r:WedgeRecord,m:WedgeMessageCatalog){return r.ra.status==='value'?fmt(r.ra.hours,6)+' h':m.fieldStatus[r.ra.status];}
function decCell(r:WedgeRecord,m:WedgeMessageCatalog){return r.dec.status==='value'?fmt(r.dec.degrees,5)+'°'+(r.dec.signLost?' *':''):m.fieldStatus[r.dec.status];}

export default function WedgeLab({messages,idPrefix='wedge-',disabled=false,onWorkspaceChange}:WedgeLabProps){
 const m=useMemo(()=>wedgeMessages(messages),[messages]),C=m.native;
 const[w,setW]=useState<WedgeWorkspace>(EMPTY_WEDGE_WORKSPACE);
 const[scheme,setScheme]=useState<WedgeColourScheme>(0);
 const token=useRef(0),abort=useRef<AbortController|null>(null),optionsButton=useRef<HTMLButtonElement>(null),promptButton=useRef<HTMLButtonElement>(null),fileInput=useRef<HTMLInputElement>(null);
 const plot=useMemo(()=>wedgePlot(w.records,w.options),[w.records,w.options]);
 const busy=disabled||w.reading!==null||w.pending!==null;
 useEffect(()=>{onWorkspaceChange?.(w);},[w,onWorkspaceChange]);
 // Before paint, so a hidden prompt or dialog is never shown or clickable while disabled.
 useLayoutEffect(()=>{if(disabled){abort.current?.abort();abort.current=null;setW(suspendWedgeWorkspace);}},[disabled]);
 useEffect(()=>()=>{abort.current?.abort();},[]);
 useEffect(()=>{if(w.pending)promptButton.current?.focus();},[w.pending]);
 /** Token-gated transitions (also used by async read completion). */
 const safe=(f:(c:WedgeWorkspace)=>WedgeWorkspace)=>setW(c=>{try{return f(c);}catch{return c;}});
 /** User actions: refused while the host has the panel disabled. */
 const act=(f:(c:WedgeWorkspace)=>WedgeWorkspace)=>{if(!disabled)safe(f);};

 async function onFile(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value='';if(!file||busy)return;
  let refused:WedgeWorkspace|null;try{refused=requestWedgeLoad(w,file.name);}catch{return;}
  if(refused){setW(refused);return;}
  const t=++token.current;abort.current?.abort();const ctrl=new AbortController();abort.current=ctrl;
  safe(c=>beginWedgeRead(c,t,file.name));
  try{const read=await readWedgeLssFile(file,ctrl.signal);safe(c=>completeWedgeRead(c,t,read));}
  catch(err){if(err instanceof WedgeFileError&&err.code==='aborted')return;safe(c=>failWedgeRead(c,t,err instanceof WedgeFileError&&err.code==='size'?'size':'read'));}
  finally{if(abort.current===ctrl)abort.current=null;}
 }
 const cancelRead=()=>{abort.current?.abort();abort.current=null;setW(cancelWedgeRead);fileInput.current?.focus();};
 const closeOptions=(commit:boolean)=>{act(commit?commitWedgeOptions:cancelWedgeOptions);requestAnimationFrame(()=>optionsButton.current?.focus());};
 const select=(i:number|null)=>act(c=>selectWedgeRecord(c,i));
 const lines=w.notice?noticeLines(w.notice,m):[];
 const sel=w.selected!==null?w.records[w.selected]:null,selPoint:WedgePoint|null=w.selected!==null?plot.points[w.selected]??null:null;
 const id=(s:string)=>idPrefix+s;

 return <section className="wedge-lab" aria-labelledby={id('title')} aria-disabled={disabled||undefined} data-testid="wedge-lab">
  <h2 id={id('title')}>{C.windowCaption}</h2>
  <p>{m.intro}</p>
  <p className="wedge-persistence" role="note" data-testid="wedge-persistence">{m.persistenceNote}</p>
  <div className="wedge-toolbar">
   <div className="wedge-field">
    <label htmlFor={id('file')}>{m.loadLabel}</label>
    <input ref={fileInput} id={id('file')} type="file" accept=".txt,.TXT,text/plain" disabled={busy} onChange={e=>{void onFile(e);}} aria-describedby={id('file-help')} data-testid="wedge-file"/>
    <p id={id('file-help')} className="wedge-note">{m.loadHelp}</p>
   </div>
   <div className="wedge-field">
    <label htmlFor={id('sep')}>{m.separatorLabel}</label>
    <select id={id('sep')} value={w.separator} disabled={busy} onChange={e=>safe(c=>setWedgeSeparator(c,e.target.value==='.'?'.':','))} data-testid="wedge-separator">
     <option value=".">{m.separatorPoint}</option><option value=",">{m.separatorComma}</option>
    </select>
   </div>
   <div className="wedge-field">
    <label htmlFor={id('scheme')}>{m.schemeLabel}</label>
    <select id={id('scheme')} value={scheme} disabled={disabled} onChange={e=>setScheme(e.target.value==='1'?1:0)} aria-describedby={id('scheme-help')} data-testid="wedge-scheme">
     {m.schemes.map((label,i)=><option key={i} value={i}>{label}</option>)}
    </select>
    <p id={id('scheme-help')} className="wedge-note">{m.schemeHelp}</p>
   </div>
   <div className="wedge-actions">
    <button type="button" className="primary-button" disabled={busy} onClick={()=>act(plotWedgeData)} data-testid="wedge-plot-data">{C.menuPlotData}</button>
    <button ref={optionsButton} type="button" disabled={busy} onClick={()=>act(openWedgeOptions)} title={m.optionsButtonHelp} data-testid="wedge-options-open">{C.menuOptions}</button>
    <button type="button" disabled={busy||w.records.length===0} onClick={()=>downloadWedgeText('openvireo-lss-wedge-points.csv',wedgeCsv(w.records,w.receipts,w.options))} aria-describedby={id('export-note')} data-testid="wedge-export">{m.exportCsv}</button>
   </div>
  </div>
  <p id={id('export-note')} className="wedge-note">{m.exportNote}</p>
  <p role="status" aria-live="polite" className="wedge-status" data-testid="wedge-status">{w.reading?m.reading(w.reading.name):w.records.length||w.receipts.length?m.statusLoaded(w.records.length,w.receipts.length):m.statusEmpty}</p>
  {w.reading&&!disabled?<button type="button" onClick={cancelRead} data-testid="wedge-cancel-read">{m.cancelRead}</button>:null}
  {w.pending&&!disabled?<div className="wedge-prompt" role="alertdialog" aria-labelledby={id('prompt-title')} aria-describedby={id('prompt-text')} data-testid="wedge-prompt" data-stage={w.pending.stage}>
   <h3 id={id('prompt-title')}>{w.pending.stage==='retain'?C.retainCaption:C.deleteCaption}</h3>
   <p id={id('prompt-text')} className="wedge-pre">{w.pending.stage==='retain'?C.retainText:C.deleteText}</p>
   <p className="wedge-note"><code>{w.pending.name}</code> · {m.sha256} <code>{w.pending.sha256}</code> · {w.pending.file.rows.length}</p>
   <div className="wedge-actions">{w.pending.stage==='retain'?<>
     <button ref={promptButton} type="button" disabled={disabled} onClick={()=>act(addWedgePending)} data-testid="wedge-prompt-yes">{C.yes}</button>
     <button type="button" disabled={disabled} onClick={()=>act(clearWedgePending)} data-testid="wedge-prompt-no">{C.no}</button>
     <button type="button" disabled={disabled} onClick={()=>act(cancelWedgePending)} data-testid="wedge-prompt-cancel">{C.cancel}</button></>:<>
     <button ref={promptButton} type="button" disabled={disabled} onClick={()=>act(c=>confirmWedgeDelete(c,true))} data-testid="wedge-prompt-yes">{C.yes}</button>
     <button type="button" disabled={disabled} onClick={()=>act(c=>confirmWedgeDelete(c,false))} data-testid="wedge-prompt-no">{C.no}</button></>}
   </div>
  </div>:null}
  {lines.length?<div className={'wedge-notice'+(w.notice?.kind==='loaded'?' ok':'')} role={w.notice?.kind==='loaded'?'status':'alert'} data-testid="wedge-notice" data-kind={w.notice?.kind} data-cause={w.notice?.kind==='not-loaded'?w.notice.cause:undefined}>
   {lines.map((l,i)=><p key={i}><strong>{l.caption}</strong> {l.text}</p>)}
   <button type="button" className="wedge-small" disabled={disabled} onClick={()=>act(dismissWedgeNotice)} data-testid="wedge-notice-dismiss">{m.dismiss}</button>
  </div>:null}
  <div className="wedge-body">
   <figure className="wedge-figure">
    <WedgePlotSvg plot={plot} records={w.records} options={w.options} colours={WEDGE_COLOUR_SCHEMES[scheme]} selected={w.selected} label={m.figureLabel} onSelect={i=>select(i)} idPrefix={idPrefix}/>
    <figcaption className="wedge-note">
     {plot.excluded?<span data-testid="wedge-excluded">{m.notDrawn(plot.excluded)} </span>:null}
     {plot.admitted-plot.drawn?<span data-testid="wedge-outside">{m.outside(plot.admitted-plot.drawn)} </span>:null}
     {m.presentationNote}
    </figcaption>
   </figure>
   <div className="wedge-side">
    <h3>{m.detailsHeading}</h3>
    {sel?<dl className="wedge-details" data-testid="wedge-details">
     <dt>{m.columns.object}</dt><dd>{sel.objectId||'—'}</dd>
     <dt>{m.detail.raw}</dt><dd><code className="wedge-pre">{sel.raw}</code></dd>
     <dt>{m.detail.source}</dt><dd>{w.receipts[sel.source]?.name} · {m.detail.line} {sel.line}</dd>
     <dt>{m.detail.ra}</dt><dd>{sel.raRaw||'—'} → {raCell(sel,m)}</dd>
     <dt>{m.detail.dec}</dt><dd>{sel.decRaw||'—'} → {decCell(sel,m)}{sel.dec.status==='value'&&sel.dec.signLost?<> <em>{m.signLost}</em></>:null}</dd>
     {sel.redshift.status==='value'?<>
      <dt>{m.detail.velocity}</dt><dd>{wedgeSingleExact(sel.redshift.velocity)} {m.detail.kmPerS} <code>{wedgeBitsHex(sel.redshift.velocity)}</code></dd>
      <dt>{m.detail.z}</dt><dd>{wedgeSingleExact(sel.redshift.z)} <code>{wedgeBitsHex(sel.redshift.z)}</code></dd>
      <dt>{m.detail.derived}</dt><dd>{m.derivedFrom[sel.redshift.source]}</dd></>:<><dt>{m.detail.redshift}</dt><dd>{sel.redshiftRaw||'—'} → {m.fieldStatus[sel.redshift.status]}</dd></>}
     {selPoint&&selPoint.thetaDegrees!==null?<><dt>{m.detail.theta}</dt><dd>{fmt(selPoint.thetaDegrees,4)}°</dd></>:null}
     {selPoint&&selPoint.radiusPx!==null?<><dt>{m.detail.radius}</dt><dd>{fmt(selPoint.radiusPx,4)} {m.detail.px}</dd></>:null}
     {selPoint&&selPoint.cx!==null?<><dt>{m.detail.pixel}</dt><dd data-testid="wedge-detail-pixel">{selPoint.cx}, {selPoint.cy}{selPoint.boundary?' · '+m.boundary:''}</dd></>:null}
     <dt>{m.columns.status}</dt><dd>{selPoint?m.plotStatus[selPoint.status]:''}</dd>
    </dl>:<p className="wedge-note">{m.detailsNone}</p>}
   </div>
  </div>
  <div className="wedge-table-wrap">
   <table className="wedge-table" data-testid="wedge-table">
    <caption>{m.tableCaption}</caption>
    <thead><tr>{(['index','object','mjd','ra','dec','velocity','z','comment','status']as const).map(k=><th key={k} scope="col">{m.columns[k]}</th>)}</tr></thead>
    <tbody>{w.records.map((r,i)=>{const p=plot.points[i];return <tr key={i} className={i===w.selected?'selected':undefined} data-testid={'wedge-row-'+i}>
     <td><button type="button" className="wedge-small" disabled={disabled} aria-pressed={i===w.selected} aria-label={m.selectRow(r.objectId,i+1)} onClick={()=>select(i===w.selected?null:i)}>{i+1}</button></td>
     <td>{r.objectId}</td><td>{r.mjdRaw}</td><td>{raCell(r,m)}</td><td>{decCell(r,m)}</td>
     <td>{r.redshift.status==='value'?fmt(r.redshift.velocity.value,2):m.fieldStatus[r.redshift.status]}</td>
     <td>{r.redshift.status==='value'?fmt(r.redshift.z.value,6):''}</td>
     <td>{r.comment??''}</td><td data-status={p.status}>{m.plotStatus[p.status]}{p.boundary?' · '+m.boundary:''}</td>
    </tr>;})}</tbody>
   </table>
  </div>
  <details className="wedge-details-block">
   <summary>{m.sourcesHeading} ({w.receipts.length})</summary>
   <ul data-testid="wedge-sources">{w.receipts.map((s,i)=><li key={i}><code>{s.name}</code> · {s.rows} · {m.sourceAction[s.action]} · {s.hasZ?m.sourceColumn.z:m.sourceColumn.velocity} · “{s.separator}” · {m.sha256} <code>{s.sha256}</code></li>)}</ul>
  </details>
  <details className="wedge-details-block">
   <summary>{m.aboutHeading}</summary>
   <ul>{m.about.map((t,i)=><li key={i}>{t}</li>)}</ul>
  </details>
  {w.optionsDraft&&!disabled?<WedgeOptionsDialog draft={w.optionsDraft} idPrefix={idPrefix} captions={C} autoPlotNote={m.autoPlotUnavailable} onChange={c=>act(x=>editWedgeOptions(x,c))} onOk={()=>closeOptions(true)} onCancel={()=>closeOptions(false)}/>:null}
 </section>;
}
