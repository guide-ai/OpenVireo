import{useEffect,useLayoutEffect,useMemo,useRef,useState,type ChangeEvent,type KeyboardEvent}from'react';
import'./Wedge.css';
import{wedgeCsv}from'../core/wedgeExport';
import type{WedgeRecord}from'../core/wedgeLssText';
import{wedgeBitsHex,wedgeSingleExact}from'../core/wedgeNumeric';
import{WEDGE_COLOUR_SCHEMES,wedgePlot,type WedgeOptions,type WedgeColourScheme,type WedgePoint}from'../core/wedgePlot';
import{appendOwnLssRecords,removeOwnLssRecords,type WedgeOwnRecord}from'../core/wedgeWorkspace';
import{EMPTY_WEDGE_WORKSPACE,addWedgePending,beginWedgeRead,cancelWedgeOptions,cancelWedgePending,cancelWedgeRead,clearWedgePending,commitWedgeOptions,completeWedgeRead,confirmWedgeDelete,dismissWedgeNotice,editWedgeOptions,failWedgeRead,openWedgeOptions,plotWedgeData,requestWedgeLoad,selectWedgeRecord,setWedgeSeparator,suspendWedgeWorkspace,type WedgeNotice,type WedgeWorkspace}from'../core/wedgeWorkspace';
import{WedgeFileError,downloadWedgeText,readWedgeLssFile}from'../io/wedgeLssFile';
import{wedgeMessages,wedgeStatusText,type WedgeMessageCatalog,type WedgeMessageOverrides}from'./WedgeMessages';
import WedgeOptionsDialog from'./WedgeOptionsDialog';
import WedgePlotSvg from'./WedgePlotSvg';
import CleaHelp from '../clusters/CleaHelp';
import {HELP_FILES} from '../help/helpFiles';

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
 /** The student's own E02 records handed over by the LSS survey (appendOwnLssRecords); applied once per token. */
 ownRecords?:Readonly<{token:number;records:readonly WedgeOwnRecord[];sha256:string;bytes:number}>|null;
 /** Whether the handed-over records were added (false: refused, e.g. capacity), once per token. */
 onOwnRecordsResult?:(token:number,accepted:boolean)=>void;
 /** Investigation restore, once per token: drop own LSS points and set the committed options (the file's, or defaults). */
 restoredOptions?:Readonly<{token:number;options:WedgeOptions}>|null;
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
function raCell(r:WedgeRecord,m:WedgeMessageCatalog){return r.ra.status==='value'?fmt(r.ra.hours,6)+' '+m.detail.hours:m.fieldStatus[r.ra.status];}
function decCell(r:WedgeRecord,m:WedgeMessageCatalog){return r.dec.status==='value'?fmt(r.dec.degrees,5)+m.detail.degrees+(r.dec.signLost?' *':''):m.fieldStatus[r.dec.status];}

export default function WedgeLab({messages,idPrefix='wedge-',disabled=false,onWorkspaceChange,ownRecords=null,onOwnRecordsResult,restoredOptions=null}:WedgeLabProps){
 const m=useMemo(()=>wedgeMessages(messages),[messages]),C=m.native;
 const[w,setW]=useState<WedgeWorkspace>(EMPTY_WEDGE_WORKSPACE);
 const[scheme,setScheme]=useState<WedgeColourScheme>(0);
 const token=useRef(0),abort=useRef<AbortController|null>(null),optionsButton=useRef<HTMLButtonElement>(null),promptButton=useRef<HTMLButtonElement>(null),fileInput=useRef<HTMLInputElement>(null),root=useRef<HTMLElement>(null);
 /** Direct reads restore only lost focus; explicit prompt/read-cancel answers return to the input. */
 const refocusFile=useRef<'read'|'answer'|null>(null);
 const readViewport=useRef({x:0,y:0});
 const plot=useMemo(()=>wedgePlot(w.records,w.options),[w.records,w.options]);
 const busy=disabled||w.reading!==null||w.pending!==null;
 /** The aria-modal Options dialog makes the rest of the panel inert and refuses new imports,
  * so a read, and therefore import consent, can never start underneath it. */
 const modal=w.optionsDraft!==null;
 useEffect(()=>{onWorkspaceChange?.(w);},[w,onWorkspaceChange]);
 const appliedOwn=useRef(0),appliedOptions=useRef(0);
 useEffect(()=>{if(!restoredOptions||restoredOptions.token===appliedOptions.current)return;appliedOptions.current=restoredOptions.token;setW(c=>{try{return commitWedgeOptions(editWedgeOptions(openWedgeOptions(cancelWedgeOptions(removeOwnLssRecords(c))),restoredOptions.options));}catch{return c;}});},[restoredOptions?.token]);
 useEffect(()=>{
  if(!ownRecords||ownRecords.token===appliedOwn.current)return;appliedOwn.current=ownRecords.token;
  let next:WedgeWorkspace|null=null;try{next=appendOwnLssRecords(suspendWedgeWorkspace(w),ownRecords.records,ownRecords);}catch{next=null;}
  if(next)setW(next);onOwnRecordsResult?.(ownRecords.token,!!next&&next.receipts.length>w.receipts.length);
 },[ownRecords?.token]);
 // Before paint, so a hidden prompt or dialog is never shown or clickable while disabled.
 // Host inactivity also drops a pending focus return: it never pulls focus into the panel.
 useLayoutEffect(()=>{if(disabled){refocusFile.current=null;abort.current?.abort();abort.current=null;setW(suspendWedgeWorkspace);}},[disabled]);
 useEffect(()=>()=>{abort.current?.abort();},[]);
 // A new inline question is announced by the live status (wedgeStatusText) without
 // overriding a deliberate focus move; with focus lost it also takes focus.
 // An explicit retain→confirm action can move focus between the prompt's own buttons.
 useEffect(()=>{
  const button=promptButton.current,a=document.activeElement;
  if(!w.pending||disabled||!button||button.getClientRects().length===0)return;
  const prompt=button.closest('[role="alertdialog"]');
  // A panel control the read itself disabled (e.g. Options after OK) is not a deliberate focus,
  // even if the browser has not blurred it yet when a fast read completes. A host control
  // stays deliberate even when disabled: focus is never pulled into the panel from outside.
  if(a&&a!==document.body&&a!==fileInput.current&&!prompt?.contains(a)&&!(root.current?.contains(a)&&a.matches(':disabled')))return;
  // Reveal a normal completed question, but preserve a viewport deliberately moved during the read.
  const moved=window.scrollX!==readViewport.current.x||window.scrollY!==readViewport.current.y;
  button.focus({preventScroll:refocusFile.current!=='read'||moved});
 },[w.pending,disabled]);
 // After the commit that re-enables the input (not synchronously in the handler, when it is
 // still disabled). A direct read preserves any deliberate focus; explicit answers preserve host focus.
 useEffect(()=>{
  const intent=refocusFile.current;
  if(!intent||busy)return;refocusFile.current=null;
  const f=fileInput.current,a=document.activeElement;
  if(!f||f.disabled||f.getClientRects().length===0)return;
  if(a&&a!==document.body&&a!==f&&(intent==='read'||!root.current?.contains(a)))return;
  f.focus({preventScroll:true});
 },[busy]);
 /** Token-gated transitions (also used by async read completion). */
 const safe=(f:(c:WedgeWorkspace)=>WedgeWorkspace)=>setW(c=>{try{return f(c);}catch{return c;}});
 /** User actions: refused while the host has the panel disabled. */
 const act=(f:(c:WedgeWorkspace)=>WedgeWorkspace)=>{if(!disabled)safe(f);};
 /** Prompt answers (Yes/No/Cancel/Escape): focus returns to the file input when the prompt closes. */
 const answer=(f:(c:WedgeWorkspace)=>WedgeWorkspace)=>{if(disabled)return;refocusFile.current='answer';safe(f);};
 /** Escape is the non-destructive answer: Cancel at "Retain Current Data?", No at "Confirm Deletion!". */
 const promptKey=(e:KeyboardEvent)=>{if(e.defaultPrevented||e.key!=='Escape'||!w.pending)return;e.preventDefault();e.stopPropagation();answer(w.pending.stage==='retain'?cancelWedgePending:c=>confirmWedgeDelete(c,false));};

 async function onFile(e:ChangeEvent<HTMLInputElement>){
  // A change event that still reaches the disabled input under Options (scripted) is dropped.
  const file=e.target.files?.[0];e.target.value='';if(!file||busy||modal)return;
  let refused:WedgeWorkspace|null;try{refused=requestWedgeLoad(w,file.name);}catch{return;}
  if(refused){setW(refused);return;}
  const t=++token.current;abort.current?.abort();const ctrl=new AbortController();abort.current=ctrl;
  // Restore lost focus after a direct success/failure; keep any deliberate focus move.
  refocusFile.current='read';readViewport.current={x:window.scrollX,y:window.scrollY};
  safe(c=>beginWedgeRead(c,t,file.name));
  try{const read=await readWedgeLssFile(file,ctrl.signal);safe(c=>completeWedgeRead(c,t,read));}
  catch(err){if(err instanceof WedgeFileError&&err.code==='aborted')return;safe(c=>failWedgeRead(c,t,err instanceof WedgeFileError&&err.code==='size'?'size':'read'));}
  finally{if(abort.current===ctrl)abort.current=null;}
 }
 const cancelRead=()=>{abort.current?.abort();abort.current=null;refocusFile.current='answer';setW(cancelWedgeRead);};
 // Options opens only when no read or consent is pending, and imports are refused while it is
 // open, so closing it returns focus to Options (unless focus was deliberately moved).
 const closeOptions=(commit:boolean)=>{
  act(commit?commitWedgeOptions:cancelWedgeOptions);
  requestAnimationFrame(()=>{
   if(document.activeElement!==document.body)return;
   const target=optionsButton.current;
   if(target&&!target.disabled&&target.isConnected&&target.getClientRects().length>0)target.focus({preventScroll:true});
  });
 };
 const select=(i:number|null)=>act(c=>selectWedgeRecord(c,i));
 const lines=w.notice?noticeLines(w.notice,m):[];
 const sel=w.selected!==null?w.records[w.selected]:null,selPoint:WedgePoint|null=w.selected!==null?plot.points[w.selected]??null:null;
 const id=(s:string)=>idPrefix+s;

 return <section ref={root} className="wedge-lab" aria-labelledby={id('title')} aria-disabled={disabled||undefined} data-testid="wedge-lab" onKeyDown={promptKey}>
  <div inert={modal||undefined} data-testid="wedge-content">
   <h2 id={id('title')}>{C.windowCaption}</h2>{/* TWedgePlot Help1, FormShow 0x580e9f, options +0xb9c (docs/CLEA-HELP.md) */}<CleaHelp list={HELP_FILES['WDGPLTHLP.LST']} testId="wedge-help"/>
   <p>{m.intro}</p>
   <p className="wedge-persistence" role="note" data-testid="wedge-persistence">{m.persistenceNote}</p>
   <div className="wedge-toolbar">
    <div className="wedge-field">
     <label htmlFor={id('file')}>{m.loadLabel}</label>
     <input ref={fileInput} id={id('file')} type="file" accept=".txt,.TXT,text/plain" disabled={busy||modal} onChange={e=>{void onFile(e);}} aria-describedby={id('file-help')} data-testid="wedge-file"/>
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
   <p role="status" aria-live="polite" className="wedge-status" data-testid="wedge-status">{wedgeStatusText(w,m,!disabled)}</p>
   {w.reading&&!disabled?<button type="button" onClick={cancelRead} data-testid="wedge-cancel-read">{m.cancelRead}</button>:null}
   {w.pending&&!disabled?<div className="wedge-prompt" role="alertdialog" aria-labelledby={id('prompt-title')} aria-describedby={id('prompt-text')} data-testid="wedge-prompt" data-stage={w.pending.stage}>
    <h3 id={id('prompt-title')}>{w.pending.stage==='retain'?C.retainCaption:C.deleteCaption}</h3>
    <p id={id('prompt-text')} className="wedge-pre">{w.pending.stage==='retain'?C.retainText:C.deleteText}</p>
    <p className="wedge-note"><code>{w.pending.name}</code> · {m.sha256} <code>{w.pending.sha256}</code> · {m.rowCount(w.pending.file.rows.length)}</p>
    <div className="wedge-actions">{w.pending.stage==='retain'?<>
      <button ref={promptButton} type="button" disabled={disabled} onClick={()=>answer(addWedgePending)} data-testid="wedge-prompt-yes">{C.yes}</button>
      <button type="button" disabled={disabled} onClick={()=>answer(clearWedgePending)} data-testid="wedge-prompt-no">{C.no}</button>
      <button type="button" disabled={disabled} onClick={()=>answer(cancelWedgePending)} data-testid="wedge-prompt-cancel">{C.cancel}</button></>:<>
      <button ref={promptButton} type="button" disabled={disabled} onClick={()=>answer(c=>confirmWedgeDelete(c,true))} data-testid="wedge-prompt-yes">{C.yes}</button>
      <button type="button" disabled={disabled} onClick={()=>answer(c=>confirmWedgeDelete(c,false))} data-testid="wedge-prompt-no">{C.no}</button></>}
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
      {selPoint&&selPoint.thetaDegrees!==null?<><dt>{m.detail.theta}</dt><dd>{fmt(selPoint.thetaDegrees,4)}{m.detail.degrees}</dd></>:null}
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
    <ul data-testid="wedge-sources">{w.receipts.map((s,i)=><li key={i}><code>{s.name}</code> · {m.rowCount(s.rows)} · {m.sourceAction[s.action]} · {s.hasZ?m.sourceColumn.z:m.sourceColumn.velocity} · “{s.separator}” · {m.sha256} <code>{s.sha256}</code></li>)}</ul>
   </details>
   <details className="wedge-details-block">
    <summary>{m.aboutHeading}</summary>
    <ul>{m.about.map((t,i)=><li key={i}>{t}</li>)}</ul>
   </details>
  </div>
  {w.optionsDraft&&!disabled?<WedgeOptionsDialog draft={w.optionsDraft} idPrefix={idPrefix} captions={C} autoPlotNote={m.autoPlotUnavailable} onChange={c=>act(x=>editWedgeOptions(x,c))} onOk={()=>closeOptions(true)} onCancel={()=>closeOptions(false)}/>:null}
 </section>;
}
