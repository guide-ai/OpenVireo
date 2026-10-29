import {useId,useRef,useState} from 'react';
import {menuCaptionText} from '../core/radioControl';
import {HelpListBox} from '../clusters/CleaHelp';
import {fetchBundledClusterHelp} from '../io/bundledClusterHelp';
import {HELP_FILES,helpFile} from './helpFiles';
import {SPECTRAL_LINE_HELP_CAPTION,parseSpectralLineList,spectralLineHelp,type SpectralLine} from './spectralLines';
import './help.css';
import '../clusters/cluster-hr.css';

const M=Object.freeze({
 menu:'Spectral Line &Table',// VIREO (TSpClassify SpectralLineTable1)
 listCaption:'Spectral Lines',
 rows:'Spectral lines',helpRows:'Spectral line help text',close:'Close',
 loading:'Loading VIREO\'s spectral line list…',
 error:'VIREO\'s spectral line files (SPECLNS.LNL, SPECLNS.TXT) could not be loaded or did not match their recorded size and SHA-256.',
 retry:'Try again',ok:'OK',
 note:'VIREO\'s spectral line list (SPECLNS.LNL). Double-click a line, or press Enter, to read its help from SPECLNS.TXT. Like VIREO, the help is found by the line\'s name, so some lines (for example the later He I lines) show the section of the first line with that name. In VIREO a single click also moves the classification cursor to the line; that link is not available here.',
 missing:(file:string)=>`Unable to open Spectral Line Help File.\r\n\r\nFile Name: ${file}\r\n\r\nFile Not Found!`,// VIREO (0x5049f0)
 missingCaption:'Sp Line Help not Available!',// VIREO
});

type Loaded=Readonly<{lines:readonly SpectralLine[]}>;
/** TSpClassify › Spectral Line Table (SpectralLineTable1Click 0x50afac): the modeless TSpLinesList and, on double click,
 * the modeless "Spectral Line Help" window (TSpLinesHelp). Pure rules: src/help/spectralLines.ts. */
export default function SpectralLineTable({testId='spl'}:{testId?:string}){
 const id=useId(),opener=useRef<HTMLButtonElement>(null);
 const [load,setLoad]=useState<'idle'|'loading'|'error'|Loaded>('idle'),[open,setOpen]=useState(false),[index,setIndex]=useState(-1);
 const [help,setHelp]=useState<Readonly<{name:string;rows:readonly string[]}>|null>(null),[message,setMessage]=useState<Readonly<{caption:string;text:string}>|null>(null);
 const loaded=typeof load==='object'?load:null;
 async function show(){
  if(loaded){setOpen(true);return;}
  setLoad('loading');
  try{setLoad({lines:parseSpectralLineList(await fetchBundledClusterHelp(fetch,new AbortController().signal,HELP_FILES['SPECLNS.LNL']))});setOpen(true);setIndex(-1);}
  catch{setLoad('error');}
 }
 async function readLine(i:number){
  if(!loaded||i<0)return;
  const line=loaded.lines[i],file=helpFile(line.file);setMessage(null);
  if(!file){setMessage({caption:M.missingCaption,text:M.missing(line.file)});return;}
  try{
   const h=spectralLineHelp(await fetchBundledClusterHelp(fetch,new AbortController().signal,file),line.name);
   if(h.kind==='topic')setHelp({name:line.name,rows:h.rows});else setMessage({caption:h.caption,text:h.text});
  }catch{setLoad('error');}
 }
 return <div className="spl" data-testid={testId}>
  <div className="cluster-hr-help-bar">
   <button type="button" ref={opener} className="secondary-button" data-testid={`${testId}-open`} disabled={load==='loading'} onClick={()=>void show()}>{menuCaptionText(M.menu)}</button>
   {load==='loading'&&<span role="status">{M.loading}</span>}
   {load==='error'&&<span role="alert">{M.error} <button type="button" className="secondary-button" onClick={()=>{setLoad('idle');void show();}}>{M.retry}</button></span>}
  </div>
  {open&&loaded&&<section className="cluster-hr-window spl-window" aria-labelledby={`${id}-list`} data-testid={`${testId}-list`}>
   <h3 id={`${id}-list`}>{M.listCaption}</h3>
   <HelpListBox rows={loaded.lines.map(l=>l.row)} selected={index} onSelect={setIndex} onActivate={i=>void readLine(i)} label={M.rows} testId={`${testId}-rows`} columns/>
   <p className="cluster-hr-note">{M.note}</p>
   {message&&<div role="alert" className="cluster-member-question" data-testid={`${testId}-message`}><h4>{message.caption}</h4><p className="cluster-hr-message">{message.text}</p>
    <button type="button" className="secondary-button" onClick={()=>setMessage(null)}>{M.ok}</button></div>}
   <button type="button" className="secondary-button" data-testid={`${testId}-close`} onClick={()=>{setOpen(false);setHelp(null);opener.current?.focus();}}>{M.close}</button>
  </section>}
  {open&&help&&<section className="cluster-hr-window spl-window" aria-labelledby={`${id}-help`} data-testid={`${testId}-help`}>
   <h3 id={`${id}-help`}>{SPECTRAL_LINE_HELP_CAPTION}</h3>
   <HelpListBox rows={help.rows} selected={-1} onSelect={()=>{}} onActivate={()=>{}} label={M.helpRows} testId={`${testId}-help-text`} wrap/>
   <button type="button" className="secondary-button" onClick={()=>setHelp(null)}>{M.close}</button>
  </section>}
 </div>;
}
