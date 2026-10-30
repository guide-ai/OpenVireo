import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from '../core/radioControl';
import {HelpListBox} from '../clusters/CleaHelp';
import {fetchBundledClusterHelp} from '../io/bundledClusterHelp';
import {HELP_FILES,helpFile} from './helpFiles';
import {SPECTRAL_LINE_HELP_CAPTION,nearestSpectralLine,parseSpectralLineList,spectralLineHelp,type SpectralLine} from './spectralLines';
import './help.css';
import '../clusters/cluster-hr.css';

const M=Object.freeze({
 menu:'Spectral Line &Table',// VIREO (TSpClassify SpectralLineTable1)
 listCaption:'Spectral Lines',
 rows:'Spectral lines',helpRows:'Spectral line help text',close:'Close',
 loading:'Loading VIREO\'s spectral line list…',
 error:'VIREO\'s spectral line files (SPECLNS.LNL, SPECLNS.TXT) could not be loaded or did not match their recorded size and SHA-256.',
 retry:'Try again',ok:'OK',
 note:'VIREO\'s spectral line list (SPECLNS.LNL). Double-click a line, or press Enter, to read its help from SPECLNS.TXT. Like VIREO, the help is found by the line\'s name, so some lines (for example the later He I lines) show the section of the first line with that name. A single click (or an arrow key) moves the classification cursor to the line, at the nearest pixel column of the display; the list then selects the line nearest that column, as VIREO does (so Fe I 4143.878 selects He I 4143.76 in the full view). The arrow keys follow the same rule, so ArrowDown cannot pass from He I 4143.76 to Fe I 4143.88; use End or Home, or click a later line, to move past it.',
 missing:(file:string)=>`Unable to open Spectral Line Help File.\r\n\r\nFile Name: ${file}\r\n\r\nFile Not Found!`,// VIREO (0x5049f0)
 missingCaption:'Sp Line Help not Available!',// VIREO
 cursorAt:(wl:string)=>`Cursor @: ${wl} Å (VIREO shows the wavelength of the cursor's pixel column, not the line's own wavelength).`,
 cursorOutside:'The line lies outside the displayed range, so no cursor is drawn (in VIREO the cursor readouts are cleared, or point beyond the right edge).',
 textErrorCaption:'Help File Error',
 textError:(file:string)=>`VIREO's spectral line help file (${file}) could not be loaded or did not match its recorded size and SHA-256. The line list stays open; try the line again.`,
});

type Loaded=Readonly<{lines:readonly SpectralLine[]}>;
/** TSpClassify › Spectral Line Table (SpectralLineTable1Click 0x50afac): the modeless TSpLinesList and, on double click,
 * the modeless "Spectral Line Help" window (TSpLinesHelp). Pure rules: src/help/spectralLines.ts.
 * Front K2.5: a selection (ListBox1Click 0x50586c) sends the line's wavelength to the classification cursor (`onLineSelect`,
 * 0x508240); when the cursor's quantized wavelength changes (`cursorWavelength`, 0x5096dc) the list selects the nearest row
 * (0x5058b8) and an open help window follows it. */
export default function SpectralLineTable({testId='spl',onLineSelect,cursorWavelength=null,lineCursorShown=false}:{testId?:string;onLineSelect?:(wavelength:number)=>void;cursorWavelength?:number|null;
 /** The last cursor came from this list (no later inspection): the readout line is shown. */lineCursorShown?:boolean}){
 const id=useId(),opener=useRef<HTMLButtonElement>(null),rowsRef=useRef<HTMLDivElement>(null),helpHeading=useRef<HTMLHeadingElement>(null);
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
  }catch{setMessage({caption:M.textErrorCaption,text:M.textError(file.name)});}
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
   <button type="button" ref={opener} className="secondary-button" data-testid={`${testId}-open`} disabled={load==='loading'} onClick={()=>void show()}>{menuCaptionText(M.menu)}</button>
   {load==='loading'&&<span role="status">{M.loading}</span>}
   {load==='error'&&<span role="alert">{M.error} <button type="button" className="secondary-button" onClick={()=>{setLoad('idle');void show();}}>{M.retry}</button></span>}
  </div>
  {open&&loaded&&<section className="cluster-hr-window spl-window" aria-labelledby={`${id}-list`} data-testid={`${testId}-list`}>
   <h3 id={`${id}-list`}>{M.listCaption}</h3>
   <div ref={rowsRef}><HelpListBox rows={loaded.lines.map(l=>l.row)} selected={index} onSelect={select} onActivate={i=>void readLine(i)} label={M.rows} testId={`${testId}-rows`} columns/></div>
   <p className="cluster-hr-note">{M.note}</p>
   {lineCursorShown&&<p role="status" data-testid={`${testId}-cursor`}>{cursorWavelength===null?M.cursorOutside:M.cursorAt(cursorWavelength.toFixed(2))}</p>}
   {message&&<div role="alert" className="cluster-member-question" data-testid={`${testId}-message`}><h4>{message.caption}</h4><p className="cluster-hr-message">{message.text}</p>
    <button type="button" className="secondary-button" onClick={()=>setMessage(null)}>{M.ok}</button></div>}
   <button type="button" className="secondary-button" data-testid={`${testId}-close`} onClick={()=>{setOpen(false);setHelp(null);opener.current?.focus();}}>{M.close}</button>
  </section>}
  {open&&help&&<section className="cluster-hr-window spl-window" aria-labelledby={`${id}-help`} data-testid={`${testId}-help`}>
   <h3 id={`${id}-help`} ref={helpHeading} tabIndex={-1}>{SPECTRAL_LINE_HELP_CAPTION}</h3>
   <HelpListBox rows={help.rows} selected={-1} onSelect={()=>{}} onActivate={()=>{}} label={M.helpRows} testId={`${testId}-help-text`} wrap/>
   <button type="button" className="secondary-button" data-testid={`${testId}-help-close`} onClick={closeHelp}>{M.close}</button>
  </section>}
 </div>;
}
