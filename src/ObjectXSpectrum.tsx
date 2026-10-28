import {useEffect,useRef,useState} from 'react';
import {OBJECT_X_LAB_EN as M} from './objectx/ObjectXMessages';
import {observeObjectXSpectrum} from './io/objectXSpectrometer';
import type {ObjectXSpectrometerResult} from './core/objectXSpectrometer';
import type {FieldTelescope} from './core/fieldEngine';
import type {JournalState} from './core/exposureJournal';

/** E08 spectrometer branch (Front F API, docs/OBJECT-X-SPECTRA.md). Hidden identity (D5): nothing shown here names the object,
 * its kind or a catalogue record; `revealDetail` is never read. Unavailable results show one message per reason family, the
 * same for every kind; all resources are loaded on the first request, whatever the target. */
type Available=Extract<ObjectXSpectrometerResult,{status:'available'}>;
type View=Readonly<{kind:'idle'}|{kind:'loading'}|{kind:'error'}|{kind:'unavailable';reason:string}|{kind:'ready';result:Available;state:JournalState}>;
const TICK_MS=250;
export default function ObjectXSpectrum({target,label,disabled}:Readonly<{target:Readonly<{ra:number;dec:number;code:string}>|null;label:string;disabled:boolean}>){
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
   if(r.status==='unavailable'){setView({kind:'unavailable',reason:r.reason});return;}
   const seed=crypto.getRandomValues(new Uint32Array(1))[0]>>>0||1;
   setView({kind:'ready',result:r,state:r.engine.activate(r.engine.create(seed))});
  }catch{if(ticket.current===mine)setView({kind:'error'});}
 }
 // A transition the journal refuses leaves the state unchanged (the buttons already exclude them).
 const update=(f:(r:Available,s:JournalState)=>JournalState)=>setView(v=>{if(v.kind!=='ready')return v;try{return {...v,state:f(v.result,v.state)};}catch{return v;}});
 function start(){
  update((r,s)=>r.engine.start(s));last.current=performance.now();stopTimer();
  timer.current=window.setInterval(()=>{const now=performance.now(),d=Math.max(1,Math.round(now-last.current));last.current=now;
   setView(v=>{if(v.kind!=='ready'||v.state.exposure.phase!=='running')return v;try{return {...v,state:v.result.engine.tick(v.state,d)};}catch{return v;}});},TICK_MS);
 }
 function stop(){stopTimer();update((r,s)=>s.exposure.phase==='running'?r.engine.pause(s):s);}
 function clear(){stopTimer();update((r,s)=>r.engine.reset(s.exposure.phase==='running'?r.engine.pause(s):s));}
 useEffect(()=>{if(view.kind==='ready'&&view.state.exposure.phase!=='running')stopTimer();},[view]);
 function saveCsv(r:Available,s:JournalState){
  const rows=['wavelength_A,counts',...r.wavelengths.map((w,i)=>`${w},${s.exposure.counts[i]??0}`)].join('\r\n')+'\r\n';
  const url=URL.createObjectURL(new Blob([rows],{type:'text/csv'})),a=document.createElement('a');
  a.href=url;a.download=`${label}-spectrum.csv`;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0);
 }
 const running=view.kind==='ready'&&view.state.exposure.phase==='running',limited=view.kind==='ready'&&view.state.exposure.stopReason!==null;
 return <section data-testid="objectx-branch-spectrum"><h3>{M.spectrumTitle}</h3><p>{M.spectrumHelp}</p>
  <p className="observatory-note">{M.spectrumAdaptation}</p>
  <label>{M.spectrumTelescope}<select data-testid="objectx-spectrum-telescope" value={telescope} disabled={disabled||running} onChange={e=>setTelescope(Number(e.target.value) as FieldTelescope)}>
   {M.spectrumTelescopes.map((n,i)=><option key={n} value={i}>{n}</option>)}</select></label>
  <div className="button-row"><button className="secondary-button" disabled={disabled||!target||view.kind==='loading'||running} onClick={()=>void prepare()}>{M.spectrumPrepare}</button></div>
  <div role="status" data-testid="objectx-spectrum-status">
   {!target?M.spectrumNeedTarget:view.kind==='loading'?M.spectrumLoading:view.kind==='error'?M.spectrumLoadError:view.kind==='unavailable'?<span data-testid="objectx-spectrum-unavailable">{M.spectrumReasons[view.reason]}</span>
    :view.kind==='ready'?M.spectrumReady(label,M.spectrumTelescopes[view.result.telescope]):''}
  </div>
  {view.kind==='ready'&&<>
   <div className="button-row">
    <button className="primary-button" disabled={disabled||running||limited} onClick={start}>{M.spectrumStart}</button>
    <button className="secondary-button" disabled={!running} onClick={stop}>{M.spectrumStop}</button>
    <button className="secondary-button" disabled={disabled||running||view.state.exposure.elapsedMs===0} onClick={clear}>{M.spectrumReset}</button>
   </div>
   {limited&&<p role="status" data-testid="objectx-spectrum-limit">{M.spectrumLimit}</p>}
   <p data-testid="objectx-spectrum-progress">{M.spectrumStatus((view.state.exposure.elapsedMs/1000).toFixed(1),String(Math.round(view.state.exposure.counts.reduce((a,b)=>a+b,0))))}</p>
   <SpectrumPlot wavelengths={view.result.wavelengths} counts={view.state.exposure.counts} label={M.spectrumChart(label)}/>
   <div className="button-row"><button className="secondary-button" disabled={disabled||view.state.exposure.elapsedMs===0} onClick={()=>saveCsv(view.result,view.state)}>{M.spectrumSaveCsv(label)}</button></div>
  </>}
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
