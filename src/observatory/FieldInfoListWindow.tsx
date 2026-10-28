import {useEffect,useId,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {RADIO_HOT_LIST_SEARCH_LITERALS as SL,RADIO_HOT_LIST_SEARCH_QUERY_MAX,foldAsciiCase,radioHotListMissText,searchRadioHotListRows} from '../core/radioHotListSearch';
import {menuCaptionText} from '../core/radioControl';
import {variableStarSaveText} from '../core/variableStars';
import {listSelection,VARIABLE_FIELD_LITERALS as VL} from '../core/variableFieldList';
import {FIELD_INFO_MESSAGES as M} from './FieldInfoMessages';
import './observatory-dialogs.css';
import './field-info.css';

export const FIELD_INFO_PRINT_SCOPE='field-info';
export type FieldInfoSelectionItem=Readonly<{key:string;label:string;onClick:(selection:number)=>void;
 /** A typed reason: the item is shown disabled with this text (original defect or not ported). */
 unavailable?:string|null}>;
export type FieldInfoBox=Readonly<{caption:string;text:string}>;

export function downloadText(bytes:Uint8Array,name:string){
 const url=URL.createObjectURL(new Blob([bytes.slice()],{type:'text/plain'})),a=document.createElement('a');
 a.href=url;a.download=name;a.rel='noopener';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** A modeless Field Information list window (TFieldRptForm1 / TVarFldLstForm1, docs/OBJECT-INFO-FORMS.md). ListBox lines with
 * the recovered selection rule (MouseUp/KeyUp: data rows first..last only), List › Search (shared Find dialog TGetSrchStrDlg,
 * caption "Find Text String"; a hit moves the highlighted line but not the selection), Print (preview [W]), Save Text ›
 * As Displayed (download [W]) and Comma Delimit, Close, and the form's Selection items. */
export default function FieldInfoListWindow({testId,caption,lines,first,last,notice,selectionItems,onActivate,saveName,csv,onClose,box,onBox,children}:{
 testId:string;caption:string;lines:readonly string[];first:number;last:number;notice:ReactNode;selectionItems:readonly FieldInfoSelectionItem[];
 /** Double-click / Enter on a selected data row (variable list: Slew to Selection). */
 onActivate?:(selection:number)=>void;saveName:string;
 /** Comma Delimit: `bytes` builds the file (null with `unavailable` text when the form refuses it); `disabled` greys the item. */
 csv:Readonly<{disabled:boolean;unavailable?:FieldInfoBox|null;bytes?:()=>Readonly<{bytes:Uint8Array;name:string}>|FieldInfoBox}>;
 onClose:()=>void;box:FieldInfoBox|null;onBox:(b:FieldInfoBox|null)=>void;children?:ReactNode;
}){
 const id=useId(),[itemIndex,setItemIndex]=useState(-1),[selection,setSelection]=useState(-1),[menu,setMenu]=useState<'list'|'save'|'selection'|null>(null);
 const [find,setFind]=useState<Readonly<{query:string;matchCase:boolean}>|null>(null),[printing,setPrinting]=useState(false);
 const listRef=useRef<HTMLDivElement>(null),listTrigger=useRef<HTMLButtonElement>(null),selTrigger=useRef<HTMLButtonElement>(null);
 // A refill (new field) resets the window like FormShow does.
 useEffect(()=>{setItemIndex(-1);setSelection(-1);},[lines]);
 useEffect(()=>{if(itemIndex<0)return;listRef.current?.querySelector<HTMLElement>(`[data-line="${itemIndex}"]`)?.scrollIntoView({block:'nearest'});},[itemIndex]);
 function choose(i:number){setItemIndex(i);setSelection(listSelection(i,first,last));}
 function onKey(e:KeyboardEvent<HTMLDivElement>){
  const n=lines.length;if(!n)return;
  let i=itemIndex;
  if(e.key==='ArrowDown')i=Math.min(n-1,i+1);else if(e.key==='ArrowUp')i=Math.max(0,i-1);else if(e.key==='Home')i=0;else if(e.key==='End')i=n-1;
  else if(e.key==='PageDown')i=Math.min(n-1,i+10);else if(e.key==='PageUp')i=Math.max(0,i-10);
  else if(e.key==='Enter'){if(selection>=0&&onActivate){e.preventDefault();onActivate(selection);}return;}
  else return;
  e.preventDefault();choose(i);
 }
 const escape=(e:KeyboardEvent,trigger:React.RefObject<HTMLButtonElement|null>)=>{if(e.key==='Escape'&&menu){e.stopPropagation();setMenu(null);trigger.current?.focus();}};
 function search(mode:'top'|'next'){
  if(!find)return;const q=find.query.slice(0,RADIO_HOT_LIST_SEARCH_QUERY_MAX);setFind(null);
  if(!q){return;}// empty text → mode 2 (Cancel)
  const start=mode==='top'?0:itemIndex+1;
  const r=searchRadioHotListRows(lines,q,find.matchCase,start);
  if(r.kind==='hit'){setItemIndex(r.index);listRef.current?.focus();}
  else onBox({caption:SL.missCaption,text:radioHotListMissText(find.matchCase?q:foldAsciiCase(q))});
 }
 function save(){
  setMenu(null);
  downloadText(variableStarSaveText(lines),saveName);
  onBox({caption:VL.savedCaption,text:VL.savedHead+saveName+VL.savedTail});
 }
 function comma(){
  setMenu(null);
  if(csv.unavailable){onBox(csv.unavailable);return;}
  const r=csv.bytes?.();if(!r)return;
  if('bytes' in r){downloadText(r.bytes,r.name);onBox({caption:VL.savedCaption,text:VL.savedHead+r.name+VL.savedTail});}else onBox(r);
 }
 const LM=VL.listMenu,SM=VL.selectionMenu;
 return <section className="card fi-window" aria-labelledby={`${id}-cap`} data-testid={testId}>
  <h2 id={`${id}-cap`} className="ob-native">{caption}</h2>
  <div className="fi-menubar">
   <div className="fi-menu" onKeyDown={e=>escape(e,listTrigger)}><button type="button" ref={listTrigger} aria-expanded={menu==='list'||menu==='save'} aria-controls={`${id}-list`} data-testid={`${testId}-list-menu`} onClick={()=>setMenu(m=>m==='list'||m==='save'?null:'list')}>{menuCaptionText(LM.list)}</button>
    {(menu==='list'||menu==='save')&&<div id={`${id}-list`} role="group" aria-label={menuCaptionText(LM.list)} className="fi-menu-list">
     <button type="button" data-testid={`${testId}-search`} disabled={!lines.length} onClick={()=>{setMenu(null);setFind({query:'',matchCase:false});}}>{menuCaptionText(LM.search)}</button><hr/>
     <button type="button" data-testid={`${testId}-print`} disabled={!lines.length} onClick={()=>{setMenu(null);setPrinting(true);}}>{menuCaptionText(LM.print)}</button><hr/>
     <button type="button" aria-expanded={menu==='save'} data-testid={`${testId}-save-menu`} disabled={!lines.length} onClick={()=>setMenu(m=>m==='save'?'list':'save')}>{menuCaptionText(LM.saveText)} ›</button>
     {menu==='save'&&<div role="group" aria-label={menuCaptionText(LM.saveText)} className="fi-submenu">
      <button type="button" data-testid={`${testId}-save-displayed`} onClick={save}>{menuCaptionText(LM.asDisplayed)}</button>
      <button type="button" data-testid={`${testId}-save-csv`} disabled={csv.disabled} onClick={comma}>{menuCaptionText(LM.commaDelimit)}</button>
     </div>}<hr/>
     <button type="button" data-testid={`${testId}-close`} onClick={()=>{setMenu(null);onClose();}}>{menuCaptionText(LM.close)}</button>
    </div>}
   </div>
   <div className="fi-menu" onKeyDown={e=>escape(e,selTrigger)}><button type="button" ref={selTrigger} aria-expanded={menu==='selection'} aria-controls={`${id}-sel`} data-testid={`${testId}-selection-menu`} onClick={()=>setMenu(m=>m==='selection'?null:'selection')}>{menuCaptionText(SM.selection)}</button>
    {menu==='selection'&&<div id={`${id}-sel`} role="group" aria-label={menuCaptionText(SM.selection)} className="fi-menu-list">
     {selectionItems.map(item=><button key={item.key} type="button" data-testid={`${testId}-${item.key}`} disabled={!!item.unavailable||selection<0} title={item.unavailable??undefined} onClick={()=>{setMenu(null);item.onClick(selection);}}>{menuCaptionText(item.label)}</button>)}
     {selectionItems.some(i=>i.unavailable)&&<p className="fi-note" data-testid={`${testId}-selection-reason`}>{selectionItems.find(i=>i.unavailable)!.unavailable}</p>}
    </div>}
   </div>
  </div>
  <div ref={listRef} className="fi-lines" role="listbox" tabIndex={0} aria-label={caption} aria-activedescendant={itemIndex>=0?`${id}-l${itemIndex}`:undefined} data-testid={`${testId}-lines`} onKeyDown={onKey}>
   {lines.map((line,i)=><div key={i} id={`${id}-l${i}`} role="option" aria-selected={i===itemIndex} data-line={i} data-testid={`${testId}-line-${i}`} className="fi-line" onClick={()=>choose(i)} onDoubleClick={()=>{const s=listSelection(i,first,last);if(s>=0&&onActivate)onActivate(s);}}>{line||' '}</div>)}
  </div>
  {notice}
  <p role="status" className="fi-status" data-testid={`${testId}-selection`}>{selection>=0?`${selection+1} / ${last-first+1}`:M.noSelection}</p>
  {children}
  {find&&<FindDialog draft={find} onDraft={setFind} onSearch={search} onCancel={()=>{setFind(null);listRef.current?.focus();}}/>}
  {box&&<MessageBox box={box} onClose={()=>{onBox(null);listRef.current?.focus();}}/>}
  {printing&&<FieldInfoPrintPreview caption={caption} lines={lines} onClose={()=>setPrinting(false)}/>}
 </section>;
}

/** Shared Find dialog TGetSrchStrDlg (caption set by Search1Click): Search String (MaxLength 80), Case Dependent, From Top,
 * From Cursor, Cancel. Enter = From Top, Escape = Cancel [W]. */
function FindDialog({draft,onDraft,onSearch,onCancel}:{draft:Readonly<{query:string;matchCase:boolean}>;onDraft:(d:Readonly<{query:string;matchCase:boolean}>)=>void;onSearch:(m:'top'|'next')=>void;onCancel:()=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();el.querySelector('input')?.focus();}},[]);
 return <dialog ref={ref} className="ob-dialog ob-box" aria-labelledby={`${id}-t`} data-testid="fi-find-dialog" onCancel={e=>{e.preventDefault();onCancel();}}>
  <h2 id={`${id}-t`} className="ob-native">{SL.caption}</h2>
  <label className="ob-field">{M.find.label}<input data-testid="fi-find-query" maxLength={RADIO_HOT_LIST_SEARCH_QUERY_MAX} value={draft.query} onChange={e=>onDraft({...draft,query:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onSearch('top');}}}/></label>
  <label className="ob-check"><input type="checkbox" checked={draft.matchCase} onChange={e=>onDraft({...draft,matchCase:e.target.checked})}/>{M.find.matchCase}</label>
  <div className="ob-actions"><button type="button" className="primary-button" data-testid="fi-find-top" onClick={()=>onSearch('top')}>{M.find.top}</button><button type="button" className="secondary-button" data-testid="fi-find-next" onClick={()=>onSearch('next')}>{M.find.next}</button><button type="button" className="secondary-button" onClick={onCancel}>{M.find.cancel}</button></div>
 </dialog>;
}

/** Application.MessageBox stand-in (information boxes; the original caption and text). */
export function MessageBox({box,onClose,actions}:{box:FieldInfoBox;onClose:()=>void;actions?:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();el.querySelector<HTMLButtonElement>('button')?.focus();}},[]);
 return <dialog ref={ref} className="ob-dialog ob-box" role="alertdialog" aria-label={box.caption} data-testid="fi-box" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 className="ob-native">{box.caption}</h2><p className="ob-native fi-box-text" data-testid="fi-box-text">{box.text}</p>
  <div className="ob-actions">{actions??<button type="button" className="primary-button" onClick={onClose}>{M.ok}</button>}</div>
 </dialog>;
}

/** Print… (TVarFldLstForm1 0x52ead8 / TFieldRptForm1 print body) as a browser print preview. These forms are reachable only in
 * Edit Mode, so the Edit Mode branch prints: DateTimeToStr(Now) (browser format [W]), the caption, the lines. The job title
 * (`CLEA "Object X" Exercise - Database Modification`) names the spooler job and is not drawn. Fonts and layout differ [W]. */
function FieldInfoPrintPreview({caption,lines,onClose}:{caption:string;lines:readonly string[];onClose:()=>void}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),[failed,setFailed]=useState(false);
 const [printedAt]=useState(()=>new Date().toLocaleString());
 useEffect(()=>{const el=dialog.current;if(el&&!el.open){el.showModal();button.current?.focus();}
  return ()=>{const root=document.documentElement;if(root.getAttribute('data-print-scope')===FIELD_INFO_PRINT_SCOPE)root.removeAttribute('data-print-scope');};},[]);
 function print(){
  const root=document.documentElement;
  if(root.hasAttribute('data-print-scope')&&root.getAttribute('data-print-scope')!==FIELD_INFO_PRINT_SCOPE){setFailed(true);return;}
  root.setAttribute('data-print-scope',FIELD_INFO_PRINT_SCOPE);
  const end=()=>{window.removeEventListener('afterprint',end);if(root.getAttribute('data-print-scope')===FIELD_INFO_PRINT_SCOPE)root.removeAttribute('data-print-scope');};
  window.addEventListener('afterprint',end);
  try{if(typeof window.print!=='function')throw new TypeError('print unavailable');window.print();setFailed(false);}catch{end();setFailed(true);}
 }
 return createPortal(<dialog ref={dialog} className="ob-dialog ob-wide fi-print-root" aria-labelledby={`${id}-t`} data-testid="fi-print-preview" onCancel={e=>{e.preventDefault();onClose();}}>
  <div className="fi-print-chrome"><h2 id={`${id}-t`}>{M.printTitle}</h2><p className="fi-note">{M.printAdaptation}</p></div>
  <section className="fi-print-report" tabIndex={0} aria-label={caption}>
   <p className="fi-print-header" data-testid="fi-print-date">{printedAt}</p>
   <p className="fi-print-header">{caption}</p>
   <pre className="fi-print-lines" data-testid="fi-print-lines">{lines.join('\n')}</pre>
  </section>
  <div className="fi-print-chrome"><p role="alert">{failed?M.printError:''}</p>
   <div className="ob-actions"><button type="button" className="primary-button" ref={button} data-testid="fi-print-print" onClick={print}>{M.printButton}</button><button type="button" className="secondary-button" data-testid="fi-print-close" onClick={onClose}>{M.close}</button></div></div>
 </dialog>,document.body);
}
