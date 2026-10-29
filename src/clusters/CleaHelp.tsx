import {useEffect,useId,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {findHelpTopic,helpBackEnabled,helpHistoryBack,helpHistoryOpen,helpLinkTarget,helpNotFoundText,helpPrintPage,helpTopicBody,helpTopicCaption,
 parseHelpList,readHelpRow,type HelpHistory,type HelpRow,type HelpTopicBody} from '../core/cleaHelp';
import {foldAsciiCase,searchRadioHotListRows,RADIO_HOT_LIST_SEARCH_QUERY_MAX} from '../core/radioHotListSearch';
import {fetchBundledClusterHelp} from '../io/bundledClusterHelp';
import {HELP_FILES,helpFile,type HelpFileIdentity} from '../help/helpFiles';
import {CLUSTER_HR_EN as M} from './ClusterHrMessages';
import ClusterPrintPreview from './ClusterPrintPreview';
import './cluster-hr.css';

type Loaded=Readonly<{rows:readonly HelpRow[]}>;
const lists=new Map<string,Promise<Loaded>>(),texts=new Map<string,Promise<Uint8Array>>();
/** One verified fetch per file and page, shared by every view (VIREO reloads the list on each FormShow; the bytes are the
 * same). A failed fetch is forgotten so that "Try again" fetches again. */
function cached<T>(map:Map<string,Promise<T>>,id:HelpFileIdentity,then:(b:Uint8Array)=>T):Promise<T>{
 let p=map.get(id.name);
 if(!p){p=fetchBundledClusterHelp(fetch,new AbortController().signal,id).then(then).catch(error=>{map.delete(id.name);throw error;});map.set(id.name,p);}
 return p;
}
const loadList=(id:HelpFileIdentity)=>cached(lists,id,b=>Object.freeze({rows:parseHelpList(b)}));
const loadText=(id:HelpFileIdentity)=>cached(texts,id,b=>b);

type Message=Readonly<{caption:string;text:string}>;
type Search=Readonly<{query:string;matchCase:boolean}>;
type Topic=Readonly<{index:number;body:HelpTopicBody;selected:number}>;

/** A ListBox: one selected row, arrow keys/Home/End move, Enter or double-click activates. */
export function HelpListBox({rows,selected,onSelect,onActivate,label,testId,wrap=false,columns=false}:{rows:readonly string[];selected:number;onSelect:(i:number)=>void;onActivate:(i:number)=>void;label:string;testId:string;wrap?:boolean;
 /** Column-built native lines: monospace, full width, scrolled horizontally (never cut). */ columns?:boolean}){
 const id=useId(),list=useRef<HTMLUListElement>(null);
 useEffect(()=>{list.current?.querySelector<HTMLElement>(`[data-row="${selected}"]`)?.scrollIntoView({block:'nearest'});},[selected]);
 function key(e:KeyboardEvent<HTMLUListElement>){
  const last=rows.length-1;let next=selected;
  if(e.key==='ArrowDown')next=Math.min(last,selected+1);else if(e.key==='ArrowUp')next=Math.max(0,selected-1);
  else if(e.key==='Home')next=0;else if(e.key==='End')next=last;
  else if(e.key==='Enter'){e.preventDefault();if(selected>=0)onActivate(selected);return;}else return;
  e.preventDefault();if(next>=0)onSelect(next);
 }
 return <ul ref={list} role="listbox" tabIndex={0} aria-label={label} data-testid={testId} className={`cluster-hr-listbox${wrap?' cluster-hr-wrap':''}${columns?' cluster-hr-columns':''}`}
  aria-activedescendant={selected>=0?`${id}-${selected}`:undefined} onKeyDown={key}>
  {rows.map((r,i)=><li key={i} id={`${id}-${i}`} data-row={i} role="option" aria-selected={i===selected} onClick={()=>onSelect(i)} onDoubleClick={()=>onActivate(i)}>{r===''?' ':r}</li>)}
 </ul>;
}

/** A VIREO menu as a disclosure button and a group of buttons (no ARIA menu roles; Escape closes and refocuses). */
function HelpMenu({label,open,onToggle,children,testId}:{label:string;open:boolean;onToggle:(open:boolean)=>void;children:ReactNode;testId:string}){
 const trigger=useRef<HTMLButtonElement>(null),id=useId();
 return <div className="cluster-hr-menu" onKeyDown={e=>{if(e.key==='Escape'&&open){e.stopPropagation();onToggle(false);trigger.current?.focus();}}}>
  <button type="button" ref={trigger} aria-expanded={open} aria-controls={id} data-testid={testId} onClick={()=>onToggle(!open)}>{label}</button>
  {open&&<div id={id} role="group" aria-label={label} className="cluster-hr-menu-list">{children}</div>}
 </div>;
}

/** The modal search dialog (TGetSrchStrDlg): its caption is VIREO's; field and button labels are web wording. */
function SearchDialog({caption,search,onSubmit,onCancel}:{caption:string;search:Search;onSubmit:(s:Search,mode:'top'|'next')=>void;onCancel:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId(),[draft,setDraft]=useState(search);
 useEffect(()=>{dialog.current?.showModal();},[]);
 const empty=draft.query.length===0;
 return <dialog ref={dialog} className="ob-dialog" aria-labelledby={`${id}-t`} data-testid="cluster-help-search" onCancel={e=>{e.preventDefault();onCancel();}}>
  <form className="cluster-hr-search" onSubmit={e=>{e.preventDefault();if(!empty)onSubmit(draft,'top');}}>
   <h2 id={`${id}-t`}>{caption}</h2>
   <label>{M.searchQuery}<input type="text" autoFocus maxLength={RADIO_HOT_LIST_SEARCH_QUERY_MAX} value={draft.query} onChange={e=>setDraft({...draft,query:e.target.value})} data-testid="cluster-help-search-query"/></label>
   <label><input type="checkbox" checked={draft.matchCase} onChange={e=>setDraft({...draft,matchCase:e.target.checked})}/> {M.matchCase}</label>
   <div className="ob-actions"><button type="submit" className="primary-button" disabled={empty} data-testid="cluster-help-search-top">{M.fromTop}</button>
    <button type="button" className="secondary-button" disabled={empty} onClick={()=>onSubmit(draft,'next')}>{M.fromCursor}</button>
    <button type="button" className="secondary-button" onClick={onCancel}>{M.cancel}</button></div>
  </form>
 </dialog>;
}

function MessageBox({message,onClose}:{message:Message;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId();
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="ob-dialog" role="alertdialog" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} data-testid="cluster-help-message" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`}>{message.caption}</h2><p id={`${id}-d`} className="cluster-hr-message">{message.text}</p>
  <div className="ob-actions"><button type="button" className="primary-button" autoFocus onClick={onClose}>{M.ok}</button></div>
 </dialog>;
}

/** A VIREO Help item (Help1Click; HR 0x544668, the same sequence in every window, docs/CLEA-HELP.md): "Select Help Topic"
 * (THelpLstDlg) and the modeless "Help - <title>" window (THelpWin), index-faithful over a bundled LST and the text file
 * each row names. Pure rules live in src/core/cleaHelp.ts. */
export default function CleaHelp({testId='cluster-help',list=HELP_FILES['HRANALHLP.LST'],label=M.help,pushHistory=true,disabledReason,openRequest,onReturnFocus}:{testId?:string;
 /** The window's help index (its options field default, docs/CLEA-HELP.md). */ list?:HelpFileIdentity;label?:string;
 /** False for TPlsrAnalysisForm1 (Help1Click 0x56e634 does not set THelpWin+0x56c, so the first topic is not pushed). */ pushHistory?:boolean;
 /** A typed reason when VIREO disables this Help item (its options name is empty). */ disabledReason?:string;
 /** Menu mode (Help › Topics...): no own button; each new positive value opens the topic list, and focus returns through
  * onReturnFocus. */ openRequest?:number;onReturnFocus?:()=>void}){
 const [load,setLoad]=useState<'idle'|'loading'|'error'|Loaded>('idle');
 const [listOpen,setListOpen]=useState(false),[listIndex,setListIndex]=useState(0),[topicsMenu,setTopicsMenu]=useState(false);
 const [topic,setTopic]=useState<Topic|null>(null),[history,setHistory]=useState<HelpHistory>([]),[topicMenu,setTopicMenu]=useState(false);
 const [search,setSearch]=useState<Search>({query:'',matchCase:false}),[searching,setSearching]=useState<'topic'|'text'|null>(null);
 const [message,setMessage]=useState<Message|null>(null),[status,setStatus]=useState(''),[printing,setPrinting]=useState(false);
 const listDialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement>(null),topicHeading=useRef<HTMLHeadingElement>(null);
 const id=useId(),loaded=typeof load==='object'?load:null;
 useEffect(()=>{const d=listDialog.current;if(listOpen&&d&&!d.open)d.showModal();if(!listOpen&&d?.open)d.close();},[listOpen,loaded]);

 const returnFocus=()=>{if(onReturnFocus)onReturnFocus();else opener.current?.focus();};
 useEffect(()=>{if(openRequest)void openHelp();
 },[openRequest]);
 async function openHelp(){
  if(loaded){showTopics();return;}
  setLoad('loading');
  try{setLoad(await loadList(list));setListOpen(true);setSearch({query:'',matchCase:false});}catch{setLoad('error');}
 }
 /** THelpLstDlg FormActivate: the shared search query and case flag are reset each time the list is shown. */
 function showTopics(){setTopicsMenu(false);setTopicMenu(false);setStatus('');setSearch({query:'',matchCase:false});setListOpen(true);}
 function openTopic(rows:readonly HelpRow[],index:number,push:boolean,base:HelpHistory=history){
  if(!loaded)return;
  const file=helpFile(rows[index].file);
  if(!file){setMessage({caption:M.topicFileCaption,text:M.topicFileMissing(rows[index].file)});return;}
  void loadText(file).then(txt=>showTopic(rows,index,push,base,txt),()=>setMessage({caption:M.topicFileErrorCaption,text:M.topicFileError(file.name)}));
 }
 function showTopic(rows:readonly HelpRow[],index:number,push:boolean,base:HelpHistory,txt:Uint8Array){
  const body=helpTopicBody(txt,rows[index].title);
  if(!body){setMessage({caption:M.topicNotFoundCaption,text:M.topicNotFound(rows[index].title.replace(/^ +/,''))});return;}
  setTopic({index,body,selected:-1});setListIndex(index);setHistory(push?helpHistoryOpen(base,index):base);setTopicMenu(false);
  requestAnimationFrame(()=>topicHeading.current?.focus());
 }
 function readRow(i:number){
  if(!loaded)return;
  const r=readHelpRow(loaded.rows,i);setStatus('');
  if(!r)return;
  if(r.kind==='separator'){setStatus(M.separatorNote);return;}
  if(r.kind==='heading'){setMessage({caption:M.headingCaption,text:r.message});return;}
  setListOpen(false);openTopic(loaded.rows,r.index,pushHistory);
 }
 function submitSearch(s:Search,mode:'top'|'next'){
  setSearch(s);const kind=searching;setSearching(null);
  if(!loaded)return;
  if(kind==='topic'){
   const r=findHelpTopic(loaded.rows,s.query,s.matchCase,mode==='top'?0:listIndex+1);
   if(r.kind==='hit')setListIndex(r.index);else if(r.kind==='miss')setMessage({caption:M.notFoundCaption,text:helpNotFoundText(s.query)});
  }else if(kind==='text'&&topic){
   const r=searchRadioHotListRows(topic.body.rows,s.query,s.matchCase,mode==='top'?0:topic.selected+1);
   if(r.kind==='hit')setTopic({...topic,selected:r.index});else setMessage({caption:M.notFoundCaption,text:helpNotFoundText(s.matchCase?s.query:foldAsciiCase(s.query))});
  }
 }
 function activateBodyRow(i:number){
  if(!loaded||!topic)return;
  const target=helpLinkTarget(loaded.rows,topic.body,i,search.matchCase);
  if(target!==null)openTopic(loaded.rows,target,true);
 }
 function back(){
  if(!loaded)return;const b=helpHistoryBack(history);if(!b)return;
  setHistory(b.history);openTopic(loaded.rows,b.index,false,b.history);
 }
 function closeTopic(){setTopic(null);setHistory([]);setTopicMenu(false);returnFocus();}

 return <div className="cluster-hr-help" data-testid={testId}>
  {openRequest===undefined?<div className="cluster-hr-help-bar">
   <button type="button" ref={opener} className="secondary-button" data-testid={`${testId}-open`} disabled={load==='loading'||disabledReason!==undefined} aria-describedby={disabledReason?`${id}-off`:undefined} onClick={()=>void openHelp()}>{label}</button>
   {disabledReason&&<span id={`${id}-off`} className="cluster-hr-note">{disabledReason}</span>}
   {load==='loading'&&<span role="status">{M.helpLoading}</span>}
   {load==='error'&&<span role="alert">{M.helpLoadError} <button type="button" className="secondary-button" onClick={()=>void openHelp()}>{M.helpRetry}</button></span>}
  </div>:(load==='loading'||load==='error')&&<p className="cluster-hr-note" role={load==='error'?'alert':'status'}>{load==='error'?M.helpLoadError:M.helpLoading}</p>}
  {loaded&&<dialog ref={listDialog} className="ob-dialog" aria-labelledby={`${id}-list`} data-testid={`${testId}-topics`} onCancel={e=>{e.preventDefault();setListOpen(false);returnFocus();}}>
   <h2 id={`${id}-list`}>{M.topicListCaption}</h2>
   <div className="cluster-hr-menubar"><HelpMenu label={M.topicsMenu} open={topicsMenu} onToggle={setTopicsMenu} testId={`${testId}-topics-menu`}>
    <button type="button" data-testid={`${testId}-find-topic`} onClick={()=>{setTopicsMenu(false);setSearching('topic');}}>{M.findTopic}</button>
    <button type="button" data-testid={`${testId}-read-topic`} onClick={()=>{setTopicsMenu(false);readRow(listIndex);}}>{M.readTopic}</button>
    <button type="button" onClick={()=>{setTopicsMenu(false);setListOpen(false);returnFocus();}}>{M.closeTopics}</button>
   </HelpMenu></div>
   <HelpListBox rows={loaded.rows.map(r=>r.title)} selected={listIndex} onSelect={i=>{setListIndex(i);setStatus('');}} onActivate={readRow} label={M.topicRows} testId={`${testId}-topic-list`}/>
   <p role="status" className="cluster-hr-note">{status}</p>
   <p className="cluster-hr-note">{M.helpAdaptation(list.name)}</p>
  </dialog>}
  {loaded&&topic&&<section className="cluster-hr-window" aria-labelledby={`${id}-topic`} data-testid={`${testId}-window`}>
   <h3 id={`${id}-topic`} ref={topicHeading} tabIndex={-1}>{helpTopicCaption(loaded.rows[topic.index].title)}</h3>
   <div className="cluster-hr-menubar">
    <HelpMenu label={M.topicMenu} open={topicMenu} onToggle={setTopicMenu} testId={`${testId}-topic-menu`}>
     <button type="button" data-testid={`${testId}-print-topic`} onClick={()=>{setTopicMenu(false);setPrinting(true);}}>{M.printTopic}</button>
     <button type="button" data-testid={`${testId}-search-text`} onClick={()=>{setTopicMenu(false);setSearching('text');}}>{M.searchText}</button>
     <button type="button" onClick={showTopics}>{M.showTopics}</button>
     <button type="button" data-testid={`${testId}-close-topic`} onClick={closeTopic}>{M.closeTopic}</button>
    </HelpMenu>
    <button type="button" data-testid={`${testId}-back`} disabled={!helpBackEnabled(history)} onClick={back}>{M.back}</button>
   </div>
   <HelpListBox rows={topic.body.rows} selected={topic.selected} wrap onSelect={i=>setTopic({...topic,selected:i})} onActivate={activateBodyRow} label={M.topicText} testId={`${testId}-topic-text`}/>
   <p className="cluster-hr-note">{M.linkNote}</p>
  </section>}
  {searching&&<SearchDialog caption={searching==='topic'?M.findTopicCaption:M.findItemCaption} search={search} onSubmit={submitSearch} onCancel={()=>setSearching(null)}/>}
  {message&&<MessageBox message={message} onClose={()=>setMessage(null)}/>}
  {printing&&loaded&&topic&&(()=>{const caption=helpTopicCaption(loaded.rows[topic.index].title);
   return <ClusterPrintPreview caption={caption} note={M.helpPrintNote} onClose={()=>{setPrinting(false);requestAnimationFrame(()=>topicHeading.current?.focus());}} testId={`${testId}-print`}>
    {helpPrintPage(new Date().toLocaleString(),caption,topic.body.rows).map((l,i)=>l.kind==='students'
     ?<p key={i} className="cluster-print-line cluster-print-placeholder">{M.printPlaceholder}</p>
     :<p key={i} className={`cluster-print-line${l.indent?' cluster-print-indent':''}`}>{l.kind==='title'?<>{l.text}<span className="cluster-print-placeholder">{M.printPlaceholder}</span></>:l.text}</p>)}
   </ClusterPrintPreview>;})()}
 </div>;
}
