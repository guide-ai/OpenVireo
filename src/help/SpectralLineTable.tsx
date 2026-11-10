import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from '../core/radioControl';
import {vireo} from '../i18n/vireo';
import {HelpListBox,ViewSwitch} from '../clusters/CleaHelp';
import {HELP_VIEWER} from './HelpViewerMessages';
import {CLUSTER_HR_CAPTIONS as C} from '../core/clusterHrCaptions';
import {helpTranslationOffered,loadHelpTranslation,type HelpView} from './helpTranslation';
import {fetchBundledClusterHelp} from '../io/bundledClusterHelp';
import {HELP_FILES,helpFile,type HelpFileIdentity} from './helpFiles';
import {SPECTRAL_LINE_TABLE_LITERALS,SPECTRAL_LINE_HELP_CAPTION,SPECTRAL_LINE_MISSING_LITERALS,nearestSpectralLine,parseSpectralLineList,spectralLineHelp,type SpectralLine} from './spectralLines';
import './help.css';
import '../clusters/cluster-hr.css';

const M=HELP_VIEWER.spectralLines;
/** VIREO's Topic Not Found box (0x5049f0), through vireo() as in the help viewer (ES7's CLUSTER_HR_CAPTIONS). */
const notFound=(title:string)=>({caption:vireo(C.topicNotFoundCaption),text:vireo(C.topicNotFoundHead)+title+vireo(C.topicNotFoundTail)});

type Loaded=Readonly<{lines:readonly SpectralLine[]}>;
/** Front ES-HELP: the file's bytes in a view: the verified bundled original, or (Spanish loads) the web translation in VIREO's own format. */
const fetchView=(id:HelpFileIdentity,view:HelpView)=>view==='translation'?loadHelpTranslation(id):fetchBundledClusterHelp(fetch,new AbortController().signal,id);
/** TSpClassify › Spectral Line Table (SpectralLineTable1Click 0x50afac): the modeless TSpLinesList and, on double click,
 * the modeless "Spectral Line Help" window (TSpLinesHelp). Pure rules: src/help/spectralLines.ts.
 * Front K2.5: a selection (ListBox1Click 0x50586c) sends the line's wavelength to the classification cursor (`onLineSelect`,
 * 0x508240); when the cursor's quantized wavelength changes (`cursorWavelength`, 0x5096dc) the list selects the nearest row
 * (0x5058b8) and an open help window follows it. */
export default function SpectralLineTable({testId='spl',onLineSelect,cursorWavelength=null,lineCursorShown=false}:{testId?:string;onLineSelect?:(wavelength:number)=>void;cursorWavelength?:number|null;
 /** The last cursor came from this list (no later inspection): the readout line is shown. */lineCursorShown?:boolean}){
 const id=useId(),opener=useRef<HTMLButtonElement>(null),rowsRef=useRef<HTMLDivElement>(null),helpHeading=useRef<HTMLHeadingElement>(null);
 const [load,setLoad]=useState<'idle'|'loading'|'error'|Loaded>('idle'),[open,setOpen]=useState(false),[index,setIndex]=useState(-1);
 const [original,setOriginal]=useState(false),offered=helpTranslationOffered(),view:HelpView=offered&&!original?'translation':'original';
 const textLang=offered&&view==='original'?'en':undefined;
 const [help,setHelp]=useState<Readonly<{name:string;rows:readonly string[]}>|null>(null),[message,setMessage]=useState<Readonly<{caption:string;text:string}>|null>(null);
 const loaded=typeof load==='object'?load:null;
 async function show(){
  if(loaded){setOpen(true);return;}
  setLoad('loading');
  try{setLoad({lines:parseSpectralLineList(await fetchView(HELP_FILES['SPECLNS.LNL'],view))});setOpen(true);setIndex(-1);}
  catch{
   // Front ES-HELP review S1: a translation that cannot be loaded or verified falls back to VIREO's original, and says so.
   if(view!=='translation'){setLoad('error');return;}
   try{setLoad({lines:parseSpectralLineList(await fetchView(HELP_FILES['SPECLNS.LNL'],'original'))});setOriginal(true);setOpen(true);setIndex(-1);
    setMessage({caption:M.textErrorCaption,text:HELP_VIEWER.translationError});}
   catch{setLoad('error');}
  }
 }
 /** Front ES-HELP: switch between the translation and VIREO's exact original (the two lists have the same lines in the same order). */
 async function switchView(){
  const next:HelpView=view==='translation'?'original':'translation';
  try{
   const lines=parseSpectralLineList(await fetchView(HELP_FILES['SPECLNS.LNL'],next));
   setLoad({lines});setOriginal(next==='original');setHelp(null);setMessage(null);
  }catch{setMessage({caption:M.textErrorCaption,text:next==='translation'?HELP_VIEWER.translationError:M.error});}
 }
 async function readLine(i:number){
  if(!loaded||i<0)return;
  const line=loaded.lines[i],file=helpFile(line.file);setMessage(null);
  if(!file){const L=SPECTRAL_LINE_MISSING_LITERALS;setMessage({caption:vireo(L.caption),text:vireo(L.head)+line.file+vireo(L.tail)});return;}
  try{
   const h=spectralLineHelp(await fetchView(file,view),line.name);
   if(h.kind==='topic')setHelp({name:line.name,rows:h.rows});else setMessage(notFound(h.title));
  }catch{
   if(view!=='translation'){setMessage({caption:M.textErrorCaption,text:M.textError(file.name)});return;}
   // Review S1: the translated SPECLNS.TXT failed; the list keeps VIREO's line names, so the original is read for the same line.
   try{
    const lines=parseSpectralLineList(await fetchView(HELP_FILES['SPECLNS.LNL'],'original')),h=spectralLineHelp(await fetchView(file,'original'),lines[i].name);
    setLoad({lines});setOriginal(true);
    if(h.kind==='topic')setHelp({name:lines[i].name,rows:h.rows});
    setMessage({caption:M.textErrorCaption,text:HELP_VIEWER.translationError});
   }catch{setMessage({caption:M.textErrorCaption,text:M.textError(file.name)});}
  }
 }
 /** Focus the help window when it opens or changes line; back to the list when it closes (review 1 L4). */
 useEffect(()=>{if(help)helpHeading.current?.focus();},[help]);
 // The reverse link: every cursor update (each click here, as 0x508240 → 0x5096dc always runs it, review 1 L3, or a new cursor
 // position from the display) selects the nearest row; an open help window follows it (ListBox1DblClick).
 const helpOpen=help!==null,[clicks,setClicks]=useState(0);
 useEffect(()=>{if(!loaded||cursorWavelength===null)return;const i=nearestSpectralLine(loaded.lines,cursorWavelength);if(i<0)return;setIndex(i);if(helpOpen)void readLine(i);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[cursorWavelength,loaded,clicks]);
 const select=(i:number)=>{setIndex(i);if(loaded&&i>=0&&onLineSelect){onLineSelect(loaded.lines[i].wavelength);setClicks(c=>c+1);}};
 const closeHelp=()=>{setHelp(null);requestAnimationFrame(()=>rowsRef.current?.querySelector<HTMLElement>('[role=listbox]')?.focus());};
 return <div className="spl" data-testid={testId}>
  <div className="cluster-hr-help-bar">
   <button type="button" ref={opener} className="secondary-button" data-testid={`${testId}-open`} disabled={load==='loading'} onClick={()=>void show()}>{menuCaptionText(vireo(SPECTRAL_LINE_TABLE_LITERALS.menu))}</button>
   {load==='loading'&&<span role="status">{M.loading}</span>}
   {load==='error'&&<span role="alert">{M.error} <button type="button" className="secondary-button" onClick={()=>{setLoad('idle');void show();}}>{M.retry}</button></span>}
  </div>
  {open&&loaded&&<section className="cluster-hr-window spl-window" aria-labelledby={`${id}-list`} data-testid={`${testId}-list`}>
   <h3 id={`${id}-list`}>{M.listCaption}</h3>
   <div ref={rowsRef}><HelpListBox rows={loaded.lines.map(l=>l.row)} selected={index} onSelect={select} onActivate={i=>void readLine(i)} label={M.rows} testId={`${testId}-rows`} columns lang={textLang}/></div>
   <p className="cluster-hr-note">{M.note}</p>
   {offered&&<ViewSwitch view={view} onSwitch={()=>void switchView()} testId={`${testId}-view`}/>}
   {lineCursorShown&&<p role="status" data-testid={`${testId}-cursor`}>{cursorWavelength===null?M.cursorOutside:M.cursorAt(cursorWavelength.toFixed(2))}</p>}
   {message&&<div role="alert" className="cluster-member-question" data-testid={`${testId}-message`}><h4>{message.caption}</h4><p className="cluster-hr-message">{message.text}</p>
    <button type="button" className="secondary-button" onClick={()=>setMessage(null)}>{M.ok}</button></div>}
   <button type="button" className="secondary-button" data-testid={`${testId}-close`} onClick={()=>{setOpen(false);setHelp(null);opener.current?.focus();}}>{M.close}</button>
  </section>}
  {open&&help&&<section className="cluster-hr-window spl-window" aria-labelledby={`${id}-help`} data-testid={`${testId}-help`}>
   <h3 id={`${id}-help`} ref={helpHeading} tabIndex={-1}>{vireo(SPECTRAL_LINE_HELP_CAPTION)}</h3>
   <HelpListBox rows={help.rows} selected={-1} onSelect={()=>{}} onActivate={()=>{}} label={M.helpRows} testId={`${testId}-help-text`} wrap lang={textLang}/>
   <button type="button" className="secondary-button" data-testid={`${testId}-help-close`} onClick={closeHelp}>{M.close}</button>
  </section>}
 </div>;
}
