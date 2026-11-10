import {useEffect,useId,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {findHelpTopic,foldLatin1Accents,helpBackEnabled,helpHistoryBack,helpHistoryOpen,helpLinkTarget,helpPrintPage,helpTopicBody,
 parseHelpList,readHelpRow,type HelpHistory,type HelpRow,type HelpTopicBody} from '../core/cleaHelp';
import {foldAsciiCase,radioHotListMissText,searchRadioHotListRows,RADIO_HOT_LIST_SEARCH_QUERY_MAX} from '../core/radioHotListSearch';
import {fetchBundledClusterHelp} from '../io/bundledClusterHelp';
import {HELP_FILES,helpFile,type HelpFileIdentity} from '../help/helpFiles';
import {HELP_MENU} from '../help/HelpMessages';
import {HELP_VIEWER} from '../help/HelpViewerMessages';
import {relatedMarker,helpTranslationOffered,loadHelpTranslation,type HelpView} from '../help/helpTranslation';
import {vireo} from '../i18n/vireo';
import {CLUSTER_HR_CAPTIONS as C} from '../core/clusterHrCaptions';
import {CLUSTER_HR as M} from './ClusterHrMessages';
import ClusterPrintPreview from './ClusterPrintPreview';
import './cluster-hr.css';

type Loaded=Readonly<{rows:readonly HelpRow[]}>;
const lists=new Map<string,Promise<Loaded>>(),texts=new Map<string,Promise<Uint8Array>>();
/** One verified fetch per file and page, shared by every view (VIREO reloads the list on each FormShow; the bytes are the
 * same). A failed fetch is forgotten so that "Try again" fetches again. */
function cached<T>(map:Map<string,Promise<T>>,id:HelpFileIdentity,view:HelpView,then:(b:Uint8Array)=>T):Promise<T>{
 const key=`${view}:${id.name}`;
 let p=map.get(key);
 // Front ES-HELP: the translation (Spanish loads) is a web adaptation in src/i18n/es/help, in VIREO's own file format, parsed by the
 // same code; the original is the verified bundled file.
 if(!p){p=(view==='translation'?loadHelpTranslation(id):fetchBundledClusterHelp(fetch,new AbortController().signal,id)).then(then).catch(error=>{map.delete(key);throw error;});map.set(key,p);}
 return p;
}
const loadList=(id:HelpFileIdentity,view:HelpView)=>cached(lists,id,view,b=>Object.freeze({rows:parseHelpList(b)}));
const loadText=(id:HelpFileIdentity,view:HelpView)=>cached(texts,id,view,b=>b);
/** The search fold of a view: VIREO's A-Z rule in the original, accent-insensitive Latin-1 in the translation (web adaptation). */
const foldOf=(view:HelpView)=>view==='translation'?foldLatin1Accents:foldAsciiCase;

type Message=Readonly<{caption:string;text:string}>;
type Search=Readonly<{query:string;matchCase:boolean}>;
type Topic=Readonly<{index:number;body:HelpTopicBody;selected:number}>;

/** A ListBox: one selected row, arrow keys/Home/End move, Enter or double-click activates. */
export function HelpListBox({rows,selected,onSelect,onActivate,label,testId,wrap=false,columns=false,lang}:{rows:readonly string[];selected:number;onSelect:(i:number)=>void;onActivate:(i:number)=>void;label:string;testId:string;wrap?:boolean;
 /** Column-built native lines: monospace, full width, scrolled horizontally (never cut). */ columns?:boolean;
 /** Front ES7: `en` for native lines that mirror VIREO's own text. */ lang?:string}){
 const id=useId(),list=useRef<HTMLUListElement>(null);
 useEffect(()=>{list.current?.querySelector<HTMLElement>(`[data-row="${selected}"]`)?.scrollIntoView({block:'nearest'});},[selected]);
 function key(e:KeyboardEvent<HTMLUListElement>){
  const last=rows.length-1;let next=selected;
  if(e.key==='ArrowDown')next=Math.min(last,selected+1);else if(e.key==='ArrowUp')next=Math.max(0,selected-1);
  else if(e.key==='Home')next=0;else if(e.key==='End')next=last;
  else if(e.key==='Enter'){e.preventDefault();if(selected>=0)onActivate(selected);return;}else return;
  e.preventDefault();if(next>=0)onSelect(next);
 }
 return <ul ref={list} role="listbox" tabIndex={0} lang={lang} aria-label={label} data-testid={testId} className={`cluster-hr-listbox${wrap?' cluster-hr-wrap':''}${columns?' cluster-hr-columns':''}`}
  aria-activedescendant={selected>=0?`${id}-${selected}`:undefined} onKeyDown={key}>
  {rows.map((r,i)=><li key={i} id={`${id}-${i}`} data-row={i} role="option" aria-selected={i===selected} onClick={()=>onSelect(i)} onDoubleClick={()=>onActivate(i)}>{r===''?' ':r}</li>)}
 </ul>;
}

/** A VIREO menu as a disclosure button and a group of buttons (no ARIA menu roles; Escape closes and refocuses). */
function HelpMenu({label,open,onToggle,children,testId}:{label:string;open:boolean;onToggle:(open:boolean)=>void;children:ReactNode;testId:string}){
 const trigger=useRef<HTMLButtonElement>(null),id=useId();
 return <div className="cluster-hr-menu" onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();onToggle(false);trigger.current?.focus();}}}>
  <button type="button" ref={trigger} aria-expanded={open} aria-controls={id} data-testid={testId} onClick={()=>onToggle(!open)}>{label}</button>
  {open&&<div id={id} role="group" aria-label={label} className="cluster-hr-menu-list">{children}</div>}
 </div>;
}

/** The modal search dialog (TGetSrchStrDlg): its caption is VIREO's; field and button labels are web wording. */
function SearchDialog({caption,search,note,onSubmit,onCancel}:{caption:string;search:Search;note?:string;onSubmit:(s:Search,mode:'top'|'next')=>void;onCancel:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId(),[draft,setDraft]=useState(search);
 useEffect(()=>{dialog.current?.showModal();},[]);
 const empty=draft.query.length===0;
 return <dialog ref={dialog} className="ob-dialog" aria-labelledby={`${id}-t`} data-testid="cluster-help-search" onCancel={e=>{e.preventDefault();onCancel();}}>
  <form className="cluster-hr-search" onSubmit={e=>{e.preventDefault();if(!empty)onSubmit(draft,'top');}}>
   <h2 id={`${id}-t`}>{caption}</h2>
   <label>{M.searchQuery}<input type="text" autoFocus maxLength={RADIO_HOT_LIST_SEARCH_QUERY_MAX} value={draft.query} onChange={e=>setDraft({...draft,query:e.target.value})} data-testid="cluster-help-search-query"/></label>
   {note&&<p className="cluster-hr-note" data-testid="cluster-help-search-note">{note}</p>}
   <label><input type="checkbox" checked={draft.matchCase} onChange={e=>setDraft({...draft,matchCase:e.target.checked})}/> {M.matchCase}</label>
   <div className="ob-actions"><button type="submit" className="primary-button" disabled={empty} data-testid="cluster-help-search-top">{M.fromTop}</button>
    <button type="button" className="secondary-button" disabled={empty} onClick={()=>onSubmit(draft,'next')}>{M.fromCursor}</button>
    <button type="button" className="secondary-button" onClick={onCancel}>{M.cancel}</button></div>
  </form>
 </dialog>;
}

/** Front ES-HELP [W]: says which text the viewer shows and switches it. The label is a web adaptation's, never CLEA's. */
export function ViewSwitch({view,onSwitch,testId}:{view:HelpView;onSwitch:()=>void;testId:string}){
 return <p className="cluster-hr-note" data-testid={testId} data-view={view}>
  <span data-testid={`${testId}-label`}>{view==='translation'?HELP_VIEWER.translationLabel:HELP_VIEWER.originalLabel}</span>{' · '}
  <button type="button" className="text-button" data-testid={`${testId}-switch`} onClick={onSwitch}>{view==='translation'?HELP_VIEWER.viewOriginal:HELP_VIEWER.viewTranslation}</button>
 </p>;
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
export default function CleaHelp({testId='cluster-help',list=HELP_FILES['HRANALHLP.LST'],label,pushHistory=true,disabledReason,openRequest,onReturnFocus}:{testId?:string;
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
 // Front ES-HELP: a Spanish load shows the translation unless the student chose the original (per viewer, not stored).
 const [original,setOriginal]=useState(false),offered=helpTranslationOffered(),view:HelpView=offered&&!original?'translation':'original';
 const textLang=offered&&view==='original'?'en':undefined;// the original view on a Spanish page is VIREO's English
 // Review S1: the translation failed and the original is shown instead (a note in the list and topic windows, not a modal box,
 // which the list dialog opened after it would cover).
 const [fallback,setFallback]=useState(false);
 const fallbackNote=(t:string)=>fallback&&<p role="alert" className="cluster-hr-note" data-testid={t}>{HELP_VIEWER.translationError}</p>;
 const topicCaption=(title:string)=>vireo('Help - ')+title.replace(/^ +/,'');
 const listDialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement>(null),topicHeading=useRef<HTMLHeadingElement>(null);
 const id=useId(),loaded=typeof load==='object'?load:null;
 useEffect(()=>{const d=listDialog.current;if(listOpen&&d&&!d.open)d.showModal();if(!listOpen&&d?.open)d.close();},[listOpen,loaded]);

 /** After the list dialog has closed: dialog.close() runs in the effect above and restores focus to whatever was focused
  * before showModal() (in menu mode an item that no longer exists), so focus is set on the next frame (review 1 M2). */
 const returnFocus=()=>requestAnimationFrame(()=>{if(onReturnFocus)onReturnFocus();else opener.current?.focus();});
 useEffect(()=>{if(openRequest)void openHelp();
 },[openRequest]);
 async function openHelp(){
  if(loaded){showTopics();return;}
  setLoad('loading');
  try{setLoad(await loadList(list,view));setListOpen(true);setSearch({query:'',matchCase:false});}
  catch{
   // Front ES-HELP review S1: a translation that cannot be loaded, verified or parsed falls back to VIREO's original, and says so.
   if(view!=='translation'){setLoad('error');return;}
   try{setLoad(await loadList(list,'original'));setOriginal(true);setListOpen(true);setSearch({query:'',matchCase:false});translationFailed();}
   catch{setLoad('error');}
  }
 }
 const translationFailed=()=>setFallback(true);
 /** Front ES-HELP review S1: the translated topic text failed; show the same row in VIREO's original (both indexes have the same
  * rows), with the original index. */
 async function originalInstead(index:number,push:boolean,base:HelpHistory){
  try{
   const l=await loadList(list,'original'),file=helpFile(l.rows[index].file);
   if(!file)return translationFailed();
   const txt=await loadText(file,'original');
   setLoad(l);setOriginal(true);
   const body=helpTopicBody(txt,l.rows[index].title);
   if(body){setTopic({index,body,selected:-1});setListIndex(index);setHistory(push?helpHistoryOpen(base,index):base);setTopicMenu(false);}
   translationFailed();
  }catch{setMessage({caption:M.topicFileErrorCaption,text:M.topicFileError(list.name)});}
 }
 /** THelpLstDlg FormActivate: the shared search query and case flag are reset each time the list is shown. */
 function showTopics(){setTopicsMenu(false);setTopicMenu(false);setStatus('');setSearch({query:'',matchCase:false});setListOpen(true);}
 function openTopic(rows:readonly HelpRow[],index:number,push:boolean,base:HelpHistory=history){
  if(!loaded)return;
  const file=helpFile(rows[index].file);
  if(!file){setMessage({caption:vireo(C.topicFileCaption),text:vireo(C.topicFileMissingHead)+rows[index].file+vireo(C.topicFileMissingTail)});return;}
  void loadText(file,view).then(txt=>showTopic(rows,index,push,base,txt),()=>{
   if(view==='translation'){setListOpen(false);void originalInstead(index,push,base);}
   else setMessage({caption:M.topicFileErrorCaption,text:M.topicFileError(file.name)});
  });
 }
 function showTopic(rows:readonly HelpRow[],index:number,push:boolean,base:HelpHistory,txt:Uint8Array){
  const body=helpTopicBody(txt,rows[index].title,relatedMarker(view));
  if(!body){setMessage({caption:vireo(C.topicNotFoundCaption),text:vireo(C.topicNotFoundHead)+rows[index].title.replace(/^ +/,'')+vireo(C.topicNotFoundTail)});return;}
  setTopic({index,body,selected:-1});setListIndex(index);setHistory(push?helpHistoryOpen(base,index):base);setTopicMenu(false);
 }
 /** Focus the topic heading once the topic window has rendered (its text arrives from a fetch, so a frame callback could
  * run before the commit; review closure N1). Selecting a text row keeps the same topic and does not move focus. */
 useEffect(()=>{if(topic)topicHeading.current?.focus();},[topic?.index,topic?.body]);
 function readRow(i:number){
  if(!loaded)return;
  const r=readHelpRow(loaded.rows,i);setStatus('');
  if(!r)return;
  if(r.kind==='separator'){setStatus(M.separatorNote);return;}
  if(r.kind==='heading'){setMessage({caption:vireo(C.headingCaption),text:r.message.replace(/^Select a Topic Under/,vireo('Select a Topic Under'))});return;}
  setListOpen(false);openTopic(loaded.rows,r.index,pushHistory);
 }
 function submitSearch(s:Search,mode:'top'|'next'){
  setSearch(s);const kind=searching;setSearching(null);
  if(!loaded)return;
  if(kind==='topic'){
   const r=findHelpTopic(loaded.rows,s.query,s.matchCase,mode==='top'?0:listIndex+1,foldOf(view));
   if(r.kind==='hit')setListIndex(r.index);else if(r.kind==='miss')setMessage({caption:vireo(C.notFoundCaption),text:radioHotListMissText(s.query,vireo)});
  }else if(kind==='text'&&topic){
   const r=searchRadioHotListRows(topic.body.rows,s.query,s.matchCase,mode==='top'?0:topic.selected+1,foldOf(view));
   if(r.kind==='hit')setTopic({...topic,selected:r.index});else setMessage({caption:vireo(C.notFoundCaption),text:radioHotListMissText(s.matchCase?s.query:view==='translation'?s.query.toLowerCase():foldAsciiCase(s.query),vireo)});
  }
 }
 function activateBodyRow(i:number){
  if(!loaded||!topic)return;
  const target=helpLinkTarget(loaded.rows,topic.body,i,search.matchCase,foldOf(view));
  if(target!==null)openTopic(loaded.rows,target,true);
 }
 function back(){
  if(!loaded)return;const b=helpHistoryBack(history);if(!b)return;
  setHistory(b.history);openTopic(loaded.rows,b.index,false,b.history);
 }
 /** Switch between the translation and VIREO's exact original: the two indexes have the same rows in the same order, so the open
  * topic stays on the same row. */
 async function switchView(){
  if(!loaded)return;
  const next:HelpView=view==='translation'?'original':'translation';
  try{
   const l=await loadList(list,next);let t=topic;
   if(topic){
    const file=helpFile(l.rows[topic.index].file),body=file?helpTopicBody(await loadText(file,next),l.rows[topic.index].title,relatedMarker(next)):null;
    if(body)t={...topic,body,selected:-1};
   }
   setLoad(l);setTopic(t);setOriginal(next==='original');setStatus('');setFallback(false);
  }catch{setMessage(next==='translation'?{caption:M.topicFileErrorCaption,text:HELP_VIEWER.translationError}:{caption:M.topicFileErrorCaption,text:M.topicFileError(list.name)});}
 }
 function closeTopic(){setTopic(null);setHistory([]);setTopicMenu(false);returnFocus();}

 return <div className="cluster-hr-help" data-testid={testId}>
  {openRequest===undefined?<div className="cluster-hr-help-bar">
   <button type="button" ref={opener} className="secondary-button" data-testid={`${testId}-open`} disabled={load==='loading'||disabledReason!==undefined} aria-describedby={disabledReason?`${id}-off`:undefined} aria-label={label===undefined||label===M.help||label===vireo('Help')?HELP_MENU.buttonNames[list.name]:undefined} onClick={()=>void openHelp()}>{label??vireo('Help')}</button>
   {disabledReason&&<span id={`${id}-off`} className="cluster-hr-note">{disabledReason}</span>}
   {load==='loading'&&<span role="status">{M.helpLoading}</span>}
   {load==='error'&&<span role="alert">{M.helpLoadError} <button type="button" className="secondary-button" onClick={()=>void openHelp()}>{M.helpRetry}</button></span>}
  </div>:(load==='loading'||load==='error')&&<p className="cluster-hr-note" role={load==='error'?'alert':'status'}>{load==='error'?M.helpLoadError:M.helpLoading}</p>}
  {loaded&&<dialog ref={listDialog} className="ob-dialog" aria-labelledby={`${id}-list`} data-testid={`${testId}-topics`} onCancel={e=>{e.preventDefault();setListOpen(false);returnFocus();}}>
   <h2 id={`${id}-list`}>{vireo(C.topicListCaption)}</h2>
   <div className="cluster-hr-menubar"><HelpMenu label={vireo(C.topicsMenu)} open={topicsMenu} onToggle={setTopicsMenu} testId={`${testId}-topics-menu`}>
    <button type="button" data-testid={`${testId}-find-topic`} onClick={()=>{setTopicsMenu(false);setSearching('topic');}}>{vireo(C.findTopic)}</button>
    <button type="button" data-testid={`${testId}-read-topic`} onClick={()=>{setTopicsMenu(false);readRow(listIndex);}}>{vireo(C.readTopic)}</button>
    <button type="button" onClick={()=>{setTopicsMenu(false);setListOpen(false);returnFocus();}}>{vireo(C.closeTopics)}</button>
   </HelpMenu></div>
   <HelpListBox rows={loaded.rows.map(r=>r.title)} selected={listIndex} onSelect={i=>{setListIndex(i);setStatus('');}} onActivate={readRow} label={M.topicRows} testId={`${testId}-topic-list`} lang={textLang}/>
   <p role="status" className="cluster-hr-note">{status}</p>
   <p className="cluster-hr-note">{view==='translation'?HELP_VIEWER.helpAdaptationTranslation(list.name):M.helpAdaptation(list.name)}</p>
   {fallbackNote(`${testId}-topics-translation-error`)}
   {offered&&<ViewSwitch view={view} onSwitch={()=>void switchView()} testId={`${testId}-topics-view`}/>}
  </dialog>}
  {loaded&&topic&&<section className="cluster-hr-window" aria-labelledby={`${id}-topic`} data-testid={`${testId}-window`}>
   <h3 id={`${id}-topic`} ref={topicHeading} tabIndex={-1}>{vireo('Help - ')}<span lang={textLang}>{loaded.rows[topic.index].title.replace(/^ +/,'')}</span></h3>
   <div className="cluster-hr-menubar">
    <HelpMenu label={vireo(C.topicMenu)} open={topicMenu} onToggle={setTopicMenu} testId={`${testId}-topic-menu`}>
     <button type="button" data-testid={`${testId}-print-topic`} onClick={()=>{setTopicMenu(false);setPrinting(true);}}>{vireo(C.printTopic)}</button>
     <button type="button" data-testid={`${testId}-search-text`} onClick={()=>{setTopicMenu(false);setSearching('text');}}>{vireo(C.searchText)}</button>
     <button type="button" onClick={showTopics}>{vireo(C.showTopics)}</button>
     <button type="button" data-testid={`${testId}-close-topic`} onClick={closeTopic}>{vireo(C.closeTopic)}</button>
    </HelpMenu>
    <button type="button" data-testid={`${testId}-back`} disabled={!helpBackEnabled(history)} onClick={back}>{vireo(C.back)}</button>
   </div>
   <HelpListBox rows={topic.body.rows} selected={topic.selected} wrap onSelect={i=>setTopic({...topic,selected:i})} onActivate={activateBodyRow} label={M.topicText} testId={`${testId}-topic-text`} lang={textLang}/>
   <p className="cluster-hr-note">{view==='translation'?HELP_VIEWER.linkNoteTranslation:M.linkNote}</p>
   {fallbackNote(`${testId}-translation-error`)}
   {offered&&<ViewSwitch view={view} onSwitch={()=>void switchView()} testId={`${testId}-view`}/>}
  </section>}
  {searching&&<SearchDialog caption={searching==='topic'?vireo(C.findTopicCaption):vireo(C.findItemCaption)} search={search} note={view==='translation'?HELP_VIEWER.searchFoldNote:undefined} onSubmit={submitSearch} onCancel={()=>setSearching(null)}/>}
  {message&&<MessageBox message={message} onClose={()=>setMessage(null)}/>}
  {printing&&loaded&&topic&&(()=>{const caption=topicCaption(loaded.rows[topic.index].title);
   return <ClusterPrintPreview caption={caption} note={M.helpPrintNote} onClose={()=>{setPrinting(false);requestAnimationFrame(()=>topicHeading.current?.focus());}} testId={`${testId}-print`}>
    {helpPrintPage(new Date().toLocaleString(),caption,topic.body.rows,vireo).map((l,i)=>l.kind==='students'
     ?<p key={i} className="cluster-print-line cluster-print-placeholder">{M.printPlaceholder}</p>
     :<p key={i} className={`cluster-print-line${l.indent?' cluster-print-indent':''}`} lang={l.kind==='row'?textLang:undefined}>{l.kind==='title'?<>{l.text}<span className="cluster-print-placeholder">{M.printPlaceholder}</span></>:l.text}</p>)}
   </ClusterPrintPreview>;})()}
 </div>;
}
