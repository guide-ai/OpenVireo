import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {decodeVariableStarCatalog,parseVariableTypeHelp,searchVariableStars,variableStarDataLines,variableStarSaveFileName,variableStarSaveText,variableStarTypes,type VariableStarRecord,type VariableTypeHelpSection} from '../core/variableStars';
import {lightCurvePlot} from '../core/lightCurve';
import {formatFixed} from '../core/radioAntenna';
import {BUNDLED_VARIABLE_STARS,BUNDLED_VARIABLE_TYPE_HELP,fetchBundledVariableFile} from '../io/bundledVariableStars';
import {VARIABLE_STARS_EN as M} from './VariableStarMessages';
import LightCurveSvg from './LightCurveSvg';
import '../observatory/observatory-dialogs.css';
import './variables.css';

type Loaded=Readonly<{records:readonly VariableStarRecord[];help:readonly VariableTypeHelpSection[]}>;
type LoadState=Readonly<{status:'loading'}|{status:'error'}|({status:'ready'}&Loaded)>;
/** The open Variable Star Data window: the list is rebuilt only when the window is (re)shown (FormShow 0x52d34c). */
type ListWindow=Readonly<{record:VariableStarRecord;lines:readonly string[];riseShown:boolean}>;
export const VARIABLE_PRINT_SCOPE='variable-stars';

function download(bytes:Uint8Array,name:string){
 const url=URL.createObjectURL(new Blob([bytes.slice()],{type:'text/plain'})),a=document.createElement('a');
 a.href=url;a.download=name;a.rel='noopener';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** Front V route: catalog search (web) → Variable Star Data (TVStarListForm1) → Simulated Light Curve (TLtCrvDsplyForm1).
 * State is a browsing aid only; it is not saved with the investigation. */
export default function VariableStarsRoute({active}:{active:boolean}){
 const id=useId(),[load,setLoad]=useState<LoadState>({status:'loading'}),[name,setName]=useState(''),[type,setType]=useState('');
 const [list,setList]=useState<ListWindow|null>(null),[curve,setCurve]=useState<VariableStarRecord|null>(null);
 const [riseDefaulted,setRiseDefaulted]=useState<ReadonlySet<number>>(()=>new Set()),[typeCodes,setTypeCodes]=useState(true);
 const [menu,setMenu]=useState<'data'|'save'|'file'|null>(null),[help,setHelp]=useState(false),[notice,setNotice]=useState('');
 const [printing,setPrinting]=useState<'list'|'curve'|null>(null);
 const listHeading=useRef<HTMLHeadingElement>(null),curveHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  const abort=new AbortController();
  Promise.all([fetchBundledVariableFile(fetch,abort.signal,BUNDLED_VARIABLE_STARS),fetchBundledVariableFile(fetch,abort.signal,BUNDLED_VARIABLE_TYPE_HELP)])
   .then(([stars,helpBytes])=>setLoad({status:'ready',records:decodeVariableStarCatalog(stars),help:parseVariableTypeHelp(helpBytes)}))
   .catch(error=>{if(!(error instanceof DOMException&&error.name==='AbortError'))setLoad({status:'error'});});
  return ()=>abort.abort();
 },[]);
 useEffect(()=>{if(!active){setMenu(null);setPrinting(null);}},[active]);
 const types=useMemo(()=>load.status==='ready'?variableStarTypes(load.records):[],[load]);
 const result=useMemo(()=>load.status==='ready'?searchVariableStars(load.records,{name:name.slice(0,40),type}):null,[load,name,type]);

 function openRecord(record:VariableStarRecord){
  // Another star: RefInfo OK/Cancel closes the list window, whose FormClose closes the light curve (0x560c5a, 0x52dde8).
  setCurve(null);setMenu(null);setHelp(false);setNotice('');
  const shown=riseDefaulted.has(record.index);
  setList({record,lines:variableStarDataLines(record,shown),riseShown:shown&&record.riseWord===0});
  requestAnimationFrame(()=>listHeading.current?.focus());
 }
 function displayLightCurve(){
  if(!list)return;setMenu(null);
  if(list.record.riseWord===0)setRiseDefaulted(s=>s.has(list.record.index)?s:new Set(s).add(list.record.index));
  setCurve(list.record);requestAnimationFrame(()=>curveHeading.current?.focus());
 }
 function closeList(){setList(null);setCurve(null);setMenu(null);setHelp(false);setNotice('');}
 function saveText(){
  if(!list)return;setMenu(null);
  const file=variableStarSaveFileName(list.record);download(variableStarSaveText(list.lines),file);setNotice(M.saved(file));
 }
 const plot=useMemo(()=>curve?lightCurvePlot(curve):null,[curve]);

 return <main className="observatory-main variable-stars" data-testid="variable-stars">
  <div className="observatory-heading"><h1 tabIndex={-1}>{M.title}</h1><p>{M.scope}</p></div>
  <p className="variable-note" data-testid="variable-adaptation">{M.adaptation}</p>
  <details className="card variable-guide" data-testid="variable-guide"><summary>{M.guideTitle}</summary><ol>{M.guide.map(s=><li key={s}>{s}</li>)}</ol><p>{M.guideModel}</p></details>
  {load.status==='loading'&&<p role="status">{M.loading}</p>}
  {load.status==='error'&&<p role="alert" className="variable-unavailable">{M.loadError}</p>}
  {load.status==='ready'&&result&&<section className="card" aria-labelledby={`${id}-search`}>
   <h2 id={`${id}-search`}>{M.searchTitle}</h2>
   <div className="variable-search">
    <label>{M.nameLabel}<input type="search" value={name} maxLength={40} onChange={e=>setName(e.target.value)} data-testid="variable-name" autoComplete="off" spellCheck={false}/></label>
    <label>{M.typeLabel}<select value={type} onChange={e=>setType(e.target.value)} data-testid="variable-type"><option value="">{M.allTypes}</option>{types.map(t=><option key={t.type} value={t.type}>{M.typeOption(t.type,t.count)}</option>)}</select></label>
   </div>
   <p role="status" data-testid="variable-count">{M.results(result.rows.length,result.total)}</p>
   {result.rows.length>0&&<div className="variable-table"><table data-testid="variable-results"><thead><tr>{M.columns.map((c,i)=><th key={i} scope="col">{c}</th>)}</tr></thead><tbody>
    {result.rows.map(r=><tr key={r.index} data-record={r.index}><th scope="row">{r.name}</th><td>{r.type}</td><td>{formatFixed(r.raHours,4)}</td><td>{formatFixed(r.decDegrees,3)}</td>
     <td>{r.maxFlag.trim()}{formatFixed(r.max,2)}</td><td>{r.minFlag.trim()}{formatFixed(r.min,2)}</td><td>{r.period.value===0?M.noPeriod:formatFixed(r.period.value,4)}</td>
     <td><button type="button" className="secondary-button" aria-label={M.openLabel(r.name)} onClick={()=>openRecord(r)}>{M.open}</button></td></tr>)}
   </tbody></table></div>}
  </section>}

  {list&&<section className="card variable-window" aria-labelledby={`${id}-list`} data-testid="vstar-list-window">
   <h2 id={`${id}-list`} ref={listHeading} tabIndex={-1}>{M.listCaption}</h2>
   <div className="variable-menubar" role="menubar" aria-label={M.listCaption}>
    <div className="variable-menu"><button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={menu==='data'||menu==='save'} data-testid="vstar-data-menu" onClick={()=>setMenu(m=>m==='data'||m==='save'?null:'data')}>{M.dataMenu}</button>
     {(menu==='data'||menu==='save')&&<div role="menu" aria-label={M.dataMenu} className="variable-menu-list" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setMenu(null);}}}>
      <button type="button" role="menuitem" data-testid="vstar-display-curve" onClick={displayLightCurve}>{M.displayLightCurve}</button>
      <hr/>
      <button type="button" role="menuitem" data-testid="vstar-print" onClick={()=>{setMenu(null);setPrinting('list');}}>{M.print}</button>
      <button type="button" role="menuitemcheckbox" aria-checked={typeCodes} data-testid="vstar-type-codes" title={M.listTypeCodesNote} onClick={()=>setTypeCodes(v=>!v)}>{M.listTypeCodes}</button>
      <hr/>
      <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={menu==='save'} data-testid="vstar-save-menu" onClick={()=>setMenu(m=>m==='save'?'data':'save')}>{M.saveText} ›</button>
      {menu==='save'&&<div role="menu" aria-label={M.saveText} className="variable-submenu">
       <button type="button" role="menuitem" data-testid="vstar-save-displayed" onClick={saveText}>{M.asDisplayed}</button>
       <button type="button" role="menuitem" aria-disabled="true" disabled>{M.commaDelimit}</button>
      </div>}
      <hr/>
      <button type="button" role="menuitem" data-testid="vstar-close" onClick={closeList}>{M.close}</button>
     </div>}
    </div>
    <button type="button" role="menuitem" aria-expanded={help} data-testid="vstar-help" onClick={()=>{setMenu(null);setHelp(h=>!h);}}>{M.help}</button>
   </div>
   <pre className="variable-lines" data-testid="vstar-lines" tabIndex={0} aria-label={M.listCaption}>{list.lines.join('\n')}</pre>
   {list.riseShown&&<p className="variable-note" data-testid="vstar-rise-defaulted">{M.riseDefaultedNote}</p>}
   <p role="status" data-testid="vstar-notice">{notice}</p>
   {notice&&<p className="variable-note">{M.saveAdaptation}</p>}
   {help&&load.status==='ready'&&<section className="variable-help" aria-labelledby={`${id}-help`} data-testid="vstar-help-panel">
    <h3 id={`${id}-help`}>{M.helpTitle}</h3><p className="variable-note">{M.helpNote}</p>
    {load.help.map(s=><section key={s.title}><h4>{s.title}</h4>{s.lines.length?<pre className="variable-help-text">{s.lines.join('\n')}</pre>:<p>{M.helpEmpty}</p>}</section>)}
    <button type="button" className="secondary-button" onClick={()=>setHelp(false)}>{M.helpClose}</button>
   </section>}
  </section>}

  {curve&&plot&&<section className="card variable-window" aria-labelledby={`${id}-curve`} data-testid="light-curve-window">
   <h2 id={`${id}-curve`} ref={curveHeading} tabIndex={-1}>{M.curveCaption}</h2>
   <div className="variable-menubar" role="menubar" aria-label={M.curveCaption}>
    <div className="variable-menu"><button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={menu==='file'} data-testid="curve-file-menu" onClick={()=>setMenu(m=>m==='file'?null:'file')}>{M.fileMenu}</button>
     {menu==='file'&&<div role="menu" aria-label={M.fileMenu} className="variable-menu-list" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setMenu(null);}}}>
      <button type="button" role="menuitem" data-testid="curve-print" onClick={()=>{setMenu(null);setPrinting('curve');}}>{M.print}</button><hr/>
      <button type="button" role="menuitem" data-testid="curve-exit" onClick={()=>{setMenu(null);setCurve(null);}}>{M.exit}</button>
     </div>}</div>
   </div>
   <div className="lc-panel"><LightCurveSvg plot={plot} label={M.curveLabel(curve.name)} testId="light-curve-svg"/></div>
   {'unavailable' in plot.curve&&<p role="status" className="variable-unavailable" data-testid="light-curve-unavailable" data-reason={plot.curve.unavailable}>{M.unavailable[plot.curve.unavailable]}</p>}
   <p className="variable-note">{M.curveAdaptation}</p>
  </section>}

  {printing&&list&&<PrintPreview caption={printing==='list'?M.listCaption:M.curveCaption} lines={list.lines} plot={printing==='curve'&&plot?plot:null} name={curve?.name??list.record.name} onClose={()=>setPrinting(null)}/>}
 </main>;
}

/** Print… (0x52d58c / 0x52c1cc) as a browser print preview: the header literal, the list lines and, for the light curve,
 * "(Screen Image Printed on Next Page)" with the plot in print colours on the next page. */
function PrintPreview({caption,lines,plot,name,onClose}:{caption:string;lines:readonly string[];plot:ReturnType<typeof lightCurvePlot>|null;name:string;onClose:()=>void}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const el=dialog.current;if(el&&!el.open){el.showModal();button.current?.focus();}
  return ()=>{const root=document.documentElement;if(root.getAttribute('data-print-scope')===VARIABLE_PRINT_SCOPE)root.removeAttribute('data-print-scope');};},[]);
 function print(){
  const root=document.documentElement;
  if(root.hasAttribute('data-print-scope')&&root.getAttribute('data-print-scope')!==VARIABLE_PRINT_SCOPE){setFailed(true);return;}
  root.setAttribute('data-print-scope',VARIABLE_PRINT_SCOPE);
  const end=()=>{window.removeEventListener('afterprint',end);if(root.getAttribute('data-print-scope')===VARIABLE_PRINT_SCOPE)root.removeAttribute('data-print-scope');};
  window.addEventListener('afterprint',end);
  try{if(typeof window.print!=='function')throw new TypeError('print unavailable');window.print();setFailed(false);}catch{end();setFailed(true);}
 }
 return createPortal(<dialog ref={dialog} className="ob-dialog ob-wide variable-print-root" aria-labelledby={`${id}-t`} data-testid="variable-print-preview" onCancel={e=>{e.preventDefault();onClose();}}>
  <div className="variable-print-chrome"><h2 id={`${id}-t`}>{M.printTitle(caption)}</h2><p className="variable-note">{M.printHelp}</p></div>
  <section className="variable-print-report" tabIndex={0} aria-label={caption}>
   <p className="variable-print-header">{M.printHeader}{caption}</p>
   <pre className="variable-lines" data-testid="variable-print-lines">{lines.join('\n')}</pre>
   {plot&&<><p>{M.printNextPage}</p><div className="variable-print-page"><LightCurveSvg plot={plot} label={M.curveLabel(name)} print testId="variable-print-svg"/></div></>}
  </section>
  <div className="variable-print-chrome"><p role="alert">{failed?M.printError:''}</p>
   <div className="ob-actions"><button type="button" className="primary-button" ref={button} data-testid="variable-print-print" onClick={print}>{M.printButton}</button><button type="button" className="secondary-button" data-testid="variable-print-close" onClick={onClose}>{M.printClose}</button></div></div>
 </dialog>,document.body);
}
