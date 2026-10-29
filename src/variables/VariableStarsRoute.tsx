import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {decodeVariableStarCatalog,searchVariableStars,variableStarSaveFileName,variableStarSaveText,variableStarTypes,type VariableStarRecord} from '../core/variableStars';
import {LightCurveError,lightCurvePlot,type LightCurvePlot,type LightCurveUnavailable} from '../core/lightCurve';
import {INITIAL_VARIABLE_STAR_SESSION,closeVariableStarList,displayLightCurve as sessionDisplayCurve,exitLightCurve,openVariableStarList,openVariableStarListFromField,toggleListTypeCodes,type VariableStarSession} from '../core/variableStarSession';
import {delphiFixed,formatNativeSexagesimal} from '../core/variableStars';
import {BUNDLED_VARIABLE_STARS,fetchBundledVariableFile} from '../io/bundledVariableStars';
import CleaHelp from '../clusters/CleaHelp';
import {HELP_FILES} from '../help/helpFiles';
import {VARIABLE_STARS_EN as M} from './VariableStarMessages';
import LightCurveSvg from './LightCurveSvg';
import '../observatory/observatory-dialogs.css';
import './variables.css';

type Loaded=Readonly<{records:readonly VariableStarRecord[]}>;
type LoadState=Readonly<{status:'loading'}|{status:'error'}|({status:'ready'}&Loaded)>;
export const VARIABLE_PRINT_SCOPE='variable-stars';

/** Results table only (WEB): flag + 2 decimals, with ')' closing a '(' amplitude as the list lines do. */
const magnitude=(flag:string,value:number)=>`${flag.trim()}${delphiFixed(value,2)}${flag==='('?')':''}`;

function download(bytes:Uint8Array,name:string){
 const url=URL.createObjectURL(new Blob([bytes.slice()],{type:'text/plain'})),a=document.createElement('a');
 a.href=url;a.download=name;a.rel='noopener';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** Front V route: catalog search (web) → Variable Star Data (TVStarListForm1) → Simulated Light Curve (TLtCrvDsplyForm1).
 * State is a browsing aid only; it is not saved with the investigation. */
/** `openRequest` (Front O): Field Information › Variable Stars › Get Selection Data (0x530130) opens Variable Star Data on a
 * CLEA_VStrs.dat record index; each new token opens once the catalog is loaded. */
export default function VariableStarsRoute({active,openRequest=null}:{active:boolean;openRequest?:Readonly<{token:number;index:number;riseWordDefaulted?:boolean}>|null}){
 const id=useId(),[load,setLoad]=useState<LoadState>({status:'loading'}),[name,setName]=useState(''),[type,setType]=useState('');
 const [session,setSession]=useState<VariableStarSession>(INITIAL_VARIABLE_STAR_SESSION);
 const [menu,setMenu]=useState<'data'|'save'|'file'|null>(null),[notice,setNotice]=useState('');
 const [printing,setPrinting]=useState<'list'|'curve'|null>(null);
 const listHeading=useRef<HTMLHeadingElement>(null),curveHeading=useRef<HTMLHeadingElement>(null);
 const dataTrigger=useRef<HTMLButtonElement>(null),fileTrigger=useRef<HTMLButtonElement>(null);
 // Menus are plain disclosure buttons (no ARIA menu roles, so no arrow-key contract). Escape closes and refocuses the trigger.
 const escapeMenu=(e:React.KeyboardEvent,trigger:React.RefObject<HTMLButtonElement|null>)=>{if(e.key!=='Escape'||menu===null)return;e.stopPropagation();setMenu(null);trigger.current?.focus();};
 useEffect(()=>{
  const abort=new AbortController();
  fetchBundledVariableFile(fetch,abort.signal,BUNDLED_VARIABLE_STARS)
   .then(stars=>setLoad({status:'ready',records:decodeVariableStarCatalog(stars)}))
   .catch(error=>{if(!(error instanceof DOMException&&error.name==='AbortError'))setLoad({status:'error'});});
  return ()=>abort.abort();
 },[]);
 useEffect(()=>{if(!active){setMenu(null);setPrinting(null);}},[active]);
 const types=useMemo(()=>load.status==='ready'?variableStarTypes(load.records):[],[load]);
 // Select values: '' = all types, '=' + text for one stored type (so the blank type '=' is distinct from all).
 const result=useMemo(()=>load.status==='ready'?searchVariableStars(load.records,{name:name.slice(0,40),type:type===''?null:type.slice(1)}):null,[load,name,type]);

 const records=load.status==='ready'?load.records:null;
 const listRecord=records&&session.list?records[session.list.index]:null,curve=records&&session.curve!==null?records[session.curve]:null;
 const list=listRecord&&session.list?{record:listRecord,lines:session.list.lines,riseShown:session.list.riseDefaulted}:null;
 const typeCodes=session.listTypeCodes;
 function openRecord(record:VariableStarRecord,fieldRiseDefaulted=false){
  setMenu(null);setNotice('');setSession(s=>fieldRiseDefaulted?openVariableStarListFromField(s,record,true):openVariableStarList(s,record));
  requestAnimationFrame(()=>listHeading.current?.focus());
 }
 function displayLightCurve(){
  if(!list)return;setMenu(null);setSession(s=>sessionDisplayCurve(s,list.record));
  requestAnimationFrame(()=>curveHeading.current?.focus());
 }
 const handledRequest=useRef(0);
 useEffect(()=>{
  if(!openRequest||openRequest.token===handledRequest.current||!records)return;
  handledRequest.current=openRequest.token;
  const r=records[openRequest.index];if(r)openRecord(r,openRequest.riseWordDefaulted??false);
 });
 function closeList(){setMenu(null);setNotice('');setSession(closeVariableStarList);}
 function saveText(){
  if(!list)return;setMenu(null);
  const file=variableStarSaveFileName(list.record);download(variableStarSaveText(list.lines),file);setNotice(M.saved(file));
 }
 const drawn=useMemo<Readonly<{plot:LightCurvePlot}>|Readonly<{unavailable:LightCurveUnavailable}>|null>(()=>{if(!curve)return null;try{return {plot:lightCurvePlot(curve)};}catch(error){if(error instanceof LightCurveError)return {unavailable:error.code};throw error;}},[curve]);
 const plot=drawn&&'plot' in drawn?drawn.plot:null;

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
    <label>{M.typeLabel}<select value={type} onChange={e=>setType(e.target.value)} data-testid="variable-type"><option value="">{M.allTypes}</option>{types.map(t=><option key={t.type} value={`=${t.type}`}>{M.typeOption(t.type,t.count)}</option>)}</select></label>
   </div>
   <p role="status" data-testid="variable-count">{M.results(result.rows.length,result.total)}</p>
   {result.rows.length>0&&<div className="variable-table"><table data-testid="variable-results"><thead><tr>{M.columns.map((c,i)=><th key={i} scope="col">{c}</th>)}</tr></thead><tbody>
    {result.rows.map(r=><tr key={r.index} data-record={r.index}><th scope="row">{r.name}</th><td>{r.type}</td><td>{formatNativeSexagesimal(r.raHours,2,['h ','m ','s'])}</td><td>{formatNativeSexagesimal(r.decDegrees,1,['\u00b0 ',"' ",'"'])}</td>
     <td>{magnitude(r.maxFlag,r.max)}</td><td>{magnitude(r.minFlag,r.min)}</td><td>{r.period.value===0?M.noPeriod:delphiFixed(r.period.value,4)}</td>
     <td><button type="button" className="secondary-button" aria-label={M.openLabel(r.name)} onClick={()=>openRecord(r)}>{M.open}</button></td></tr>)}
   </tbody></table></div>}
  </section>}

  {list&&<section className="card variable-window" aria-labelledby={`${id}-list`} data-testid="vstar-list-window">
   <h2 id={`${id}-list`} ref={listHeading} tabIndex={-1}>{M.listCaption}</h2>
   <div className="variable-menubar">
    <div className="variable-menu" onKeyDown={e=>escapeMenu(e,dataTrigger)}><button type="button" ref={dataTrigger} aria-expanded={menu==='data'||menu==='save'} aria-controls={`${id}-data`} data-testid="vstar-data-menu" onClick={()=>setMenu(m=>m==='data'||m==='save'?null:'data')}>{M.dataMenu}</button>
     {(menu==='data'||menu==='save')&&<div id={`${id}-data`} role="group" aria-label={M.dataMenu} className="variable-menu-list">
      <button type="button" data-testid="vstar-display-curve" onClick={displayLightCurve}>{M.displayLightCurve}</button>
      <hr/>
      <button type="button" data-testid="vstar-print" onClick={()=>{setMenu(null);setPrinting('list');}}>{M.print}</button>
      <button type="button" aria-pressed={typeCodes} data-testid="vstar-type-codes" title={M.listTypeCodesNote} onClick={()=>setSession(toggleListTypeCodes)}>{M.listTypeCodes}</button>
      <hr/>
      <button type="button" aria-expanded={menu==='save'} aria-controls={`${id}-save`} data-testid="vstar-save-menu" onClick={()=>setMenu(m=>m==='save'?'data':'save')}>{M.saveText} ›</button>
      {menu==='save'&&<div id={`${id}-save`} role="group" aria-label={M.saveText} className="variable-submenu">
       <button type="button" data-testid="vstar-save-displayed" onClick={saveText}>{M.asDisplayed}</button>
       <button type="button" disabled>{M.commaDelimit}</button>
      </div>}
      <hr/>
      <button type="button" data-testid="vstar-close" onClick={closeList}>{M.close}</button>
     </div>}
    </div>
    {/* Help1Click 0x52de20: VIREO's shared help viewer over VarTypeHlp.LST (options +0xbe4), loaded at FormCreate 0x52ccbf. */}
    <CleaHelp list={HELP_FILES['VARTYPEHLP.LST']} label={M.help} testId="vstar-help"/>
   </div>
   <pre className="variable-lines" data-testid="vstar-lines" tabIndex={0} aria-label={M.listCaption}>{list.lines.join('\n')}</pre>
   {list.riseShown&&<p className="variable-note" data-testid="vstar-rise-defaulted">{M.riseDefaultedNote}</p>}
   <p role="status" data-testid="vstar-notice">{notice}</p>
   {notice&&<p className="variable-note">{M.saveAdaptation}</p>}
  </section>}

  {curve&&drawn&&<section className="card variable-window" aria-labelledby={`${id}-curve`} data-testid="light-curve-window">
   <h2 id={`${id}-curve`} ref={curveHeading} tabIndex={-1}>{M.curveCaption}</h2>
   <div className="variable-menubar">
    <div className="variable-menu" onKeyDown={e=>escapeMenu(e,fileTrigger)}><button type="button" ref={fileTrigger} aria-expanded={menu==='file'} aria-controls={`${id}-file`} data-testid="curve-file-menu" onClick={()=>setMenu(m=>m==='file'?null:'file')}>{M.fileMenu}</button>
     {menu==='file'&&<div id={`${id}-file`} role="group" aria-label={M.fileMenu} className="variable-menu-list">
      <button type="button" data-testid="curve-print" onClick={()=>{setMenu(null);setPrinting('curve');}}>{M.print}</button><hr/>
      <button type="button" data-testid="curve-exit" onClick={()=>{setMenu(null);setSession(exitLightCurve);}}>{M.exit}</button>
     </div>}</div>
   </div>
   {plot&&<div className="lc-panel"><LightCurveSvg plot={plot} label={M.curveLabel(curve.name)} testId="light-curve-svg"/></div>}
   {(()=>{const reason='unavailable' in drawn?drawn.unavailable:plot&&'unavailable' in plot.curve?plot.curve.unavailable:null;
    return reason&&<p role="status" className="variable-unavailable" data-testid="light-curve-unavailable" data-reason={reason}>{M.unavailable[reason]}</p>;})()}
   <p className="variable-note">{M.curveAdaptation}</p>
  </section>}

  {printing&&list&&<PrintPreview caption={printing==='list'?M.listCaption:M.curveCaption} lines={list.lines} plot={printing==='curve'?plot:null} curve={printing==='curve'} name={curve?.name??list.record.name} onClose={()=>setPrinting(null)}/>}
 </main>;
}

/** Print… (list 0x52d58c → 0x52d5e8, light curve 0x52c1cc) as a browser print preview of what the original draws on paper:
 * - DateTimeToStr(Now) + "     Laboratory Table Number " + "(Not Recorded)" (no lab table on this site); date format [W];
 * - the global+0x5fa student/lab ShortStrings (+0 always, +0x29/+0x52/+0x7b only when set): not recovered → placeholder;
 * - list print only: the form caption (GetText 0x45df24);
 * - the ListBox lines;
 * - light curve, landscape branch (Orientation = 1, 0x52c4fd..0x52c571): "(Screen Image Printed on Next Page)", NewPage,
 *   "<global+0x5fa> - Page 2"; then (both orientations) the 0x52c848 literal and the plot in print colours.
 * The 'CLEA Exercise "VIREO …" - ' text goes to Printer.Title (+0x18, read by BeginDoc 0x4430cc): the spooler job name,
 * never drawn on the page, so it is not shown. The portrait branch (plot on the same page) is not reproduced. */
function PrintPreview({caption,lines,plot,curve,name,onClose}:{caption:string;lines:readonly string[];plot:LightCurvePlot|null;curve:boolean;name:string;onClose:()=>void}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),[failed,setFailed]=useState(false);
 const [printedAt]=useState(()=>new Date().toLocaleString());// DateTimeToStr(Now) at Print; browser format [W]
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
  <div className="variable-print-chrome"><h2 id={`${id}-t`}>{M.printTitle(caption)}</h2><p className="variable-note">{M.printHelp}</p>{curve&&<p className="variable-note">{M.printCurveLayout}</p>}</div>
  <section className="variable-print-report" tabIndex={0} aria-label={caption}>
   <p className="variable-print-header" data-testid="variable-print-date">{printedAt}{M.printTable}</p>
   <p className="variable-print-header variable-print-placeholder">{M.printStudentPlaceholder}</p>
   {!curve&&<p className="variable-print-header">{caption}</p>}
   <pre className="variable-lines" data-testid="variable-print-lines">{lines.join('\n')}</pre>
   {curve&&<><p>{M.printNextPage}</p><div className="variable-print-page" data-testid="variable-print-page2"><p className="variable-print-header"><span className="variable-print-placeholder">{M.printStudentPlaceholder}</span>{M.printPage2}</p>
    <p className="variable-print-header">{M.printPageLiteral}</p>{plot&&<LightCurveSvg plot={plot} label={M.curveLabel(name)} print testId="variable-print-svg"/>}</div></>}
  </section>
  <div className="variable-print-chrome"><p role="alert">{failed?M.printError:''}</p>
   <div className="ob-actions"><button type="button" className="primary-button" ref={button} data-testid="variable-print-print" onClick={print}>{M.printButton}</button><button type="button" className="secondary-button" data-testid="variable-print-close" onClick={onClose}>{M.printClose}</button></div></div>
 </dialog>,document.body);
}
