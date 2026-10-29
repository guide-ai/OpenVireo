import {useEffect,useRef,useState} from 'react';
import CleaHelp from './clusters/CleaHelp';
import {HELP_FILES} from './help/helpFiles';
import {OBJECT_X_LAB_EN as M} from './objectx/ObjectXMessages';
import {observeObjectXSpectrum,objectXSpectrometerFailure,type ObjectXSpectrumView} from './io/objectXSpectrometer';
import {OBJECT_X_SPECTRA_LIMITS,type ObjectXSpectrumRecord} from './io/objectXSpectra';
import type {FieldTelescope} from './core/fieldEngine';
import type {JournalState} from './core/exposureJournal';

/** E08 spectrometer branch (docs/OBJECT-X-SPECTRA.md). Hidden identity (D5): the display API carries no row, kind, record or
 * reason; every unavailable case shows the same message; labels are the student's ObjX ID. The field is evaluated in a Worker.
 * Kept spectra are part of the investigation (saved in the v29 wrapper) and are rebuilt from their journals. */
type Available=Extract<ObjectXSpectrumView,{status:'available'}>;
type View=Readonly<{kind:'idle'}|{kind:'loading'}|{kind:'error'}|{kind:'invalid'}|{kind:'unavailable'}|{kind:'ready';result:Available;state:JournalState;keptAs:string|null}|{kind:'kept';result:Available;state:JournalState;label:string}>;
const TICK_MS=250;
const seconds=(ms:number)=>(ms/1000).toFixed(1);
const total=(s:JournalState)=>String(Math.round(s.exposure.counts.reduce((a,b)=>a+b,0)));
export default function ObjectXSpectrum({target,label,disabled,spectra,onKeep,pointingOf}:Readonly<{target:Readonly<{ra:number;dec:number;code:string}>|null;label:string;disabled:boolean;spectra:readonly ObjectXSpectrumRecord[];onKeep:(record:ObjectXSpectrumRecord)=>void;pointingOf:(code:string)=>Readonly<{ra:number;dec:number}>|null}>){
 const [telescope,setTelescope]=useState<FieldTelescope>(2),[view,setView]=useState<View>({kind:'idle'});
 const ticket=useRef(0),timer=useRef<number|null>(null),last=useRef(0);
 const stopTimer=()=>{if(timer.current!==null){window.clearInterval(timer.current);timer.current=null;}};
 // A new target or telescope clears the slit (and stops any exposure).
 useEffect(()=>{ticket.current++;stopTimer();setView({kind:'idle'});},[target?.code,telescope]);
 useEffect(()=>()=>stopTimer(),[]);
 async function prepare(){
  if(!target)return;const mine=++ticket.current;stopTimer();setView({kind:'loading'});
  try{
   const r=await observeObjectXSpectrum({ra:target.ra,dec:target.dec},telescope);if(ticket.current!==mine)return;
   if(r.status==='unavailable'){setView({kind:'unavailable'});return;}
   const seed=crypto.getRandomValues(new Uint32Array(1))[0]>>>0;
   setView({kind:'ready',result:r,state:r.engine.activate(r.engine.create(seed)),keptAs:null});
  }catch(e){if(ticket.current===mine)setView({kind:objectXSpectrometerFailure(e)==='evidence'?'invalid':'error'});}
 }
 /** A kept spectrum, rebuilt from its journal (the same evaluation and replay as a restore). */
 async function show(rec:ObjectXSpectrumRecord,pointing:Readonly<{ra:number;dec:number}>){
  const mine=++ticket.current;stopTimer();setView({kind:'loading'});
  try{
   const r=await observeObjectXSpectrum(pointing,rec.telescope);if(ticket.current!==mine)return;
   if(r.status!=='available'){setView({kind:'error'});return;}
   setView({kind:'kept',result:r,state:r.engine.replay(rec.seedAtReset,rec.events),label:rec.label});
  }catch(e){if(ticket.current===mine)setView({kind:objectXSpectrometerFailure(e)==='evidence'?'invalid':'error'});}
 }
 // A transition the journal refuses leaves the state unchanged (the buttons already exclude them).
 const update=(f:(r:Available,s:JournalState)=>JournalState)=>setView(v=>{if(v.kind!=='ready')return v;try{return {...v,state:f(v.result,v.state),keptAs:null};}catch{return v;}});
 function start(){
  update((r,s)=>r.engine.start(s));last.current=performance.now();stopTimer();
  timer.current=window.setInterval(()=>{const now=performance.now(),d=Math.min(1000,Math.max(1,Math.round(now-last.current)));last.current=now;
   setView(v=>{if(v.kind!=='ready'||v.state.exposure.phase!=='running')return v;try{return {...v,state:v.result.engine.tick(v.state,d)};}catch{return v;}});},TICK_MS);
 }
 function stop(){stopTimer();update((r,s)=>s.exposure.phase==='running'?r.engine.pause(s):s);}
 function clear(){stopTimer();update((r,s)=>r.engine.reset(s.exposure.phase==='running'?r.engine.pause(s):s));}
 useEffect(()=>{if(view.kind==='ready'&&view.state.exposure.phase!=='running')stopTimer();},[view]);
 function keep(){
  if(view.kind!=='ready'||!target)return;
  const name=`${label}-S${String(spectra.length+1).padStart(2,'0')}`;
  onKeep(Object.freeze({label:name,code:target.code,telescope:view.result.telescope,seedAtReset:view.state.seedAtReset,events:view.state.events}));
  setView({...view,keptAs:name});
 }
 function saveCsv(name:string,r:Available,s:JournalState){
  const rows=['wavelength_A,counts',...r.wavelengths.map((w,i)=>`${w},${s.exposure.counts[i]??0}`)].join('\r\n')+'\r\n';
  const url=URL.createObjectURL(new Blob([rows],{type:'text/csv'})),a=document.createElement('a');
  a.href=url;a.download=`${name}.csv`;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0);
 }
 const running=view.kind==='ready'&&view.state.exposure.phase==='running',limited=view.kind==='ready'&&view.state.exposure.stopReason!==null;
 const full=spectra.length>=OBJECT_X_SPECTRA_LIMITS.spectra;
 const shown=view.kind==='ready'||view.kind==='kept'?view:null,shownName=view.kind==='kept'?view.label:view.kind==='ready'?view.keptAs??label:label;
 return <section data-testid="objectx-branch-spectrum"><h3>{M.spectrumTitle}</h3>{/* TSpectrometer Help1Click 0x510f4c, options +0x914 (docs/CLEA-HELP.md) */}<CleaHelp list={HELP_FILES['SPECHLP.LST']} testId="objectx-spectrometer-help"/><p>{M.spectrumHelp}</p>
  <p className="observatory-note">{M.spectrumAdaptation}</p>
  <label>{M.spectrumTelescope}<select data-testid="objectx-spectrum-telescope" value={telescope} disabled={disabled||running} onChange={e=>setTelescope(Number(e.target.value) as FieldTelescope)}>
   {M.spectrumTelescopes.map((n,i)=><option key={n} value={i}>{n}</option>)}</select></label>
  <div className="button-row"><button className="secondary-button" disabled={disabled||!target||view.kind==='loading'||running} onClick={()=>void prepare()}>{M.spectrumPrepare}</button></div>
  <div role="status" data-testid="objectx-spectrum-status">
   {!target?M.spectrumNeedTarget:view.kind==='loading'?M.spectrumLoading:view.kind==='error'?M.spectrumLoadError:view.kind==='invalid'?M.spectrumInvalid:view.kind==='unavailable'?<span data-testid="objectx-spectrum-unavailable">{M.spectrumUnavailableNeutral}</span>
    :view.kind==='ready'?M.spectrumReady(label,M.spectrumTelescopes[view.result.telescope]):view.kind==='kept'?M.spectrumKeptRow(view.label,M.spectrumTelescopes[view.result.telescope],seconds(view.state.exposure.elapsedMs)):''}
  </div>
  {view.kind==='ready'&&<div className="button-row">
   <button className="primary-button" disabled={disabled||running||limited} onClick={start}>{M.spectrumStart}</button>
   <button className="secondary-button" disabled={!running} onClick={stop}>{M.spectrumStop}</button>
   <button className="secondary-button" disabled={disabled||running||view.state.exposure.elapsedMs===0} onClick={clear}>{M.spectrumReset}</button>
   <button className="secondary-button" disabled={disabled||running||view.state.exposure.elapsedMs===0||view.keptAs!==null||full} onClick={keep}>{M.spectrumKeep}</button>
  </div>}
  {view.kind==='ready'&&<p className="observatory-note">{full?M.spectrumKeptFull(OBJECT_X_SPECTRA_LIMITS.spectra):M.spectrumKeepHelp}</p>}
  {limited&&<p role="status" data-testid="objectx-spectrum-limit">{M.spectrumLimit}</p>}
  {shown&&<>
   <p data-testid="objectx-spectrum-progress">{M.spectrumStatus(seconds(shown.state.exposure.elapsedMs),total(shown.state))}</p>
   <SpectrumPlot wavelengths={shown.result.wavelengths} counts={shown.state.exposure.counts} label={M.spectrumChart(shownName)}/>
   <div className="button-row"><button className="secondary-button" disabled={disabled||running||shown.state.exposure.elapsedMs===0} onClick={()=>saveCsv(shownName,shown.result,shown.state)}>{M.spectrumSaveCsv(shownName)}</button></div>
  </>}
  {spectra.length>0&&<div data-testid="objectx-spectra"><h4>{M.spectrumKeptTitle}</h4><ul>{spectra.map(r=><li key={r.label}>
   {M.spectrumKeptRow(r.label,M.spectrumTelescopes[r.telescope],seconds(r.events.reduce((a,e)=>a+(e.kind==='tick'?e.deltaMs:0),0)))}{' '}
   <button className="secondary-button" disabled={disabled||running||!pointingOf(r.code)} onClick={()=>{const p=pointingOf(r.code);if(p)void show(r,p);}}>{M.spectrumShow(r.label)}</button>
  </li>)}</ul></div>}
 </section>;
}
function SpectrumPlot({wavelengths,counts,label}:Readonly<{wavelengths:readonly number[];counts:readonly number[];label:string}>){
 // Linear counts per channel against wavelength; the vertical scale follows the brightest channel.
 const w=320,h=160,max=Math.max(1,...counts),lo=wavelengths[0],hi=wavelengths[wavelengths.length-1]??lo+1,span=hi-lo||1;
 const points=counts.map((c,i)=>`${((wavelengths[i]-lo)/span*w).toFixed(2)},${(h-c/max*h).toFixed(2)}`).join(' ');
 return <figure className="objectx-spectrum"><svg viewBox={`-2 -2 ${w+4} ${h+22}`} role="img" aria-label={label} data-testid="objectx-spectrum-plot" style={{width:'100%',maxWidth:2*w}}>
  <rect x={0} y={0} width={w} height={h} fill="none" stroke="currentColor" strokeOpacity={0.3}/>
  <polyline points={points} fill="none" stroke="currentColor" strokeWidth={0.8}/>
  <text x={0} y={h+16} fontSize={12} fill="currentColor">{Math.round(lo)} Å</text><text x={w} y={h+16} fontSize={12} fill="currentColor" textAnchor="end">{Math.round(hi)} Å</text>
 </svg></figure>;
}
