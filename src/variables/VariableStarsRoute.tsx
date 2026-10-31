import {memo,useEffect,useId,useMemo,useRef,useState} from 'react';
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
import {INITIAL_LIGHT_CURVE_MONOCHROME,lightCurvePrintFlags} from '../core/lightCurveScheme';
import {lightCurvePrintPage,printPageSizeCss,type LightCurvePrintItem,type PrintOrientation} from '../core/lightCurvePrint';
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
/** `monochromeDisplays` / `printInColor` (Front R4b): the session options. The light-curve window reads them only at Print
 * (TLtCrvDsplyForm1 Print1Click 0x52c1cc; src/core/lightCurveScheme.ts): it stays in colour until the first print, prints
 * in colour only with Print in Color, then keeps Monochrome Displays as of that print. The preview is VIREO's print dialog:
 * closing it without Print… changes nothing. The route stays mounted once
 * visited, so the flag lives for the page session like VIREO's single form. */
function VariableStarsRoute({active,openRequest=null,monochromeDisplays=false,printInColor=false}:{active:boolean;openRequest?:Readonly<{token:number;index:number;riseWordDefaulted?:boolean}>|null;monochromeDisplays?:boolean;printInColor?:boolean}){
 const id=useId(),[load,setLoad]=useState<LoadState>({status:'loading'}),[name,setName]=useState(''),[type,setType]=useState('');
 const [session,setSession]=useState<VariableStarSession>(INITIAL_VARIABLE_STAR_SESSION);
 const [menu,setMenu]=useState<'data'|'save'|'file'|null>(null),[notice,setNotice]=useState('');
 const [printing,setPrinting]=useState<'list'|'curve'|null>(null);
 const [curveMonochrome,setCurveMonochrome]=useState(INITIAL_LIGHT_CURVE_MONOCHROME);
 const [printFlags,setPrintFlags]=useState<ReturnType<typeof lightCurvePrintFlags>>(()=>lightCurvePrintFlags({monochromeDisplays,printInColor}));
 // Review 1 M1: the preview stands for PrintDialog1 (0x52c1cc runs Execute first and returns at 0x52c1dc on Cancel), so
 // opening it writes nothing; only its Print… (the dialog's OK) sets the window's flag, to Monochrome Displays as of then.
 function printCurve(){setMenu(null);setPrintFlags(lightCurvePrintFlags({monochromeDisplays,printInColor}));setPrinting('curve');}
 // Review 1 L4: closing a preview returns focus to the menu that opened it.
 function closePrint(trigger:React.RefObject<HTMLButtonElement|null>){setPrinting(null);requestAnimationFrame(()=>trigger.current?.focus());}
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
      <button type="button" data-testid="curve-print" onClick={printCurve}>{M.print}</button><hr/>
      <button type="button" data-testid="curve-exit" onClick={()=>{setMenu(null);setSession(exitLightCurve);}}>{M.exit}</button>
     </div>}</div>
   </div>
   {plot&&<div className={`lc-panel${curveMonochrome?' lc-panel-mono':''}`}><LightCurveSvg plot={plot} label={M.curveLabel(curve.name)} monochrome={curveMonochrome} testId="light-curve-svg"/></div>}
   {(()=>{const reason='unavailable' in drawn?drawn.unavailable:plot&&'unavailable' in plot.curve?plot.curve.unavailable:null;
    return reason&&<p role="status" className="variable-unavailable" data-testid="light-curve-unavailable" data-reason={reason}>{M.unavailable[reason]}</p>;})()}
   <p className="variable-note">{M.curveAdaptation}</p>
  </section>}

  {printing==='list'&&list&&<PrintPreview caption={M.listCaption} lines={list.lines} onClose={()=>closePrint(dataTrigger)}/>}
  {printing==='curve'&&list&&<CurvePrintPreview lines={list.lines} plot={plot} monochrome={printFlags.printMonochrome} name={curve?.name??list.record.name} onPrinted={()=>setCurveMonochrome(printFlags.displayMonochromeAfter)} onClose={()=>closePrint(fileTrigger)}/>}
 </main>;
}

/** Shared print shell: a modal preview whose Print… scopes the browser print to it. `orientation` adds an @page size while
 * the preview is open [W: VIREO takes the orientation from the printer settings]. */
function PrintShell({caption,note,orientation,controls,children,onClose,onPrinted}:{caption:string;note?:string;orientation?:PrintOrientation;controls?:React.ReactNode;children:React.ReactNode;onClose:()=>void;onPrinted?:()=>void}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const el=dialog.current;if(el&&!el.open){el.showModal();button.current?.focus();}
  return ()=>{const root=document.documentElement;if(root.getAttribute('data-print-scope')===VARIABLE_PRINT_SCOPE)root.removeAttribute('data-print-scope');};},[]);
 function print(){
  const root=document.documentElement;
  if(root.hasAttribute('data-print-scope')&&root.getAttribute('data-print-scope')!==VARIABLE_PRINT_SCOPE){setFailed(true);return;}
  root.setAttribute('data-print-scope',VARIABLE_PRINT_SCOPE);
  const end=()=>{window.removeEventListener('afterprint',end);if(root.getAttribute('data-print-scope')===VARIABLE_PRINT_SCOPE)root.removeAttribute('data-print-scope');};
  window.addEventListener('afterprint',end);
  try{if(typeof window.print!=='function')throw new TypeError('print unavailable');window.print();setFailed(false);onPrinted?.();}catch{end();setFailed(true);}
 }
 /** Closes the modal first, so the page is no longer inert when the caller returns focus (review 1 L4). */
 const close=()=>{dialog.current?.close();onClose();};
 return createPortal(<dialog ref={dialog} className="ob-dialog ob-wide variable-print-root" aria-labelledby={`${id}-t`} data-testid="variable-print-preview" data-orientation={orientation} onCancel={e=>{e.preventDefault();e.stopPropagation();close();}}>
  {orientation&&<style>{printPageSizeCss(orientation)}</style>}
  <div className="variable-print-chrome"><h2 id={`${id}-t`}>{M.printTitle(caption)}</h2><p className="variable-note">{M.printHelp}</p>{note&&<p className="variable-note">{note}</p>}{controls}</div>
  <section className="variable-print-report" tabIndex={0} aria-label={caption}>{children}</section>
  <div className="variable-print-chrome"><p role="alert">{failed?M.printError:''}</p>
   <div className="ob-actions"><button type="button" className="primary-button" ref={button} data-testid="variable-print-print" onClick={print}>{M.printButton}</button><button type="button" className="secondary-button" data-testid="variable-print-close" onClick={close}>{M.printClose}</button></div></div>
 </dialog>,document.body);
}

/** Data › Print… (0x52d58c → 0x52d5e8): DateTimeToStr(Now) + "     Laboratory Table Number " + "(Not Recorded)" (no lab
 * table on this site; date format [W]); the global+0x5fa student/lab ShortStrings (+0 always, +0x29/+0x52/+0x7b when set):
 * not recovered → placeholder; the form caption (GetText 0x45df24); the ListBox lines. The 'CLEA Exercise "VIREO …" - ' text
 * goes to Printer.Title (+0x18, read by BeginDoc 0x4430cc): the spooler job name, never drawn on the page. */
function PrintPreview({caption,lines,onClose}:{caption:string;lines:readonly string[];onClose:()=>void}){
 const [printedAt]=useState(()=>new Date().toLocaleString());// DateTimeToStr(Now) at Print; browser format [W]
 return <PrintShell caption={caption} onClose={onClose}>
  <p className="variable-print-header" data-testid="variable-print-date">{printedAt}{M.printTable}</p>
  <p className="variable-print-header variable-print-placeholder">{M.printStudentPlaceholder}</p>
  <p className="variable-print-header">{caption}</p>
  <pre className="variable-lines" data-testid="variable-print-lines">{lines.join('\n')}</pre>
 </PrintShell>;
}

/** File › Print… of the light curve (Print1Click 0x52c1cc, body 0x52c250): the pure page of src/core/lightCurvePrint.ts in
 * the chosen orientation, with the window image in the print scheme (Print in Color off → black on white). Vertical gaps
 * follow the page's text-height steps; x 50 and x 700 become indents [W: no printer metrics]. */
function CurvePrintPreview({lines,plot,monochrome,name,onClose,onPrinted}:{lines:readonly string[];plot:LightCurvePlot|null;monochrome:boolean;name:string;onClose:()=>void;onPrinted:()=>void}){
 const id=useId(),[printedAt]=useState(()=>new Date().toLocaleString()),[orientation,setOrientation]=useState<PrintOrientation>('portrait');
 const items=lightCurvePrintPage({orientation,dateText:printedAt,listLines:lines});
 const listItems=items.filter(i=>i.kind==='text'&&i.role==='line'),head=items.filter(i=>i.kind==='text'&&(i.role==='date'||i.role==='name'));
 const rest=items.filter(i=>!(i.kind==='text'&&(i.role==='date'||i.role==='name'||i.role==='line')));
 const gap=(from:LightCurvePrintItem|undefined,to:LightCurvePrintItem)=>({marginTop:`${from&&from.page===to.page?Math.max(0,to.yH-from.yH-1)*1.2+(to.yUnits>0?1.2:0):0}em`});
 const text=(i:LightCurvePrintItem&{kind:'text'},prev:LightCurvePrintItem|undefined)=>{
  const testId=i.role==='date'?'variable-print-date':i.role==='next-page'?'variable-print-next-page':i.role==='title'?'variable-print-title':undefined;
  const placeholder=(i.role==='name'||i.role==='page2')&&i.text===''||i.role==='page2';
  return <p className={`variable-print-header${i.x===700?' variable-print-far':''}`} style={gap(prev,i)} data-testid={testId} data-role={i.role}>
   {i.role==='date'?i.text:placeholder?<><span className="variable-print-placeholder">{M.printStudentPlaceholder}</span>{i.role==='page2'?M.printPage2:''}</>:i.text}</p>;
 };
 const body=(group:readonly LightCurvePrintItem[],first:LightCurvePrintItem|undefined)=>group.map((i,k)=>{const prev=k===0?first:group[k-1];
  return i.kind==='image'?<div key={k} style={gap(prev,i)}>{plot&&<LightCurveSvg plot={plot} label={M.curveLabel(name)} monochrome={monochrome} testId="variable-print-svg"/>}</div>:<div key={k}>{text(i,prev)}</div>;});
 const page2=rest.findIndex(i=>i.page===2),page1Rest=page2<0?rest:rest.slice(0,page2),page2Items=page2<0?[]:rest.slice(page2);
 const controls=<fieldset className="variable-print-orientation" data-testid="variable-print-orientation"><legend>{M.printOrientation}</legend>
  {(['portrait','landscape'] as const).map(o=><label key={o}><input type="radio" name={`${id}-orientation`} value={o} checked={orientation===o} onChange={()=>setOrientation(o)}/> {o==='portrait'?M.portrait:M.landscape}</label>)}</fieldset>;
 return <PrintShell caption={M.curveCaption} note={M.printCurveLayout(monochrome)} orientation={orientation} controls={controls} onClose={onClose} onPrinted={onPrinted}>
  {body(head,undefined)}
  <pre className="variable-lines variable-print-indent" style={gap(head.at(-1),listItems[0]??head.at(-1)!)} data-testid="variable-print-lines">{lines.join('\n')}</pre>
  {body(page1Rest,listItems.at(-1)??head.at(-1))}
  {page2Items.length>0&&<div className="variable-print-page" data-testid="variable-print-page2">{body(page2Items,undefined)}</div>}
 </PrintShell>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(VariableStarsRoute);
