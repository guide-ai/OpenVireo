import {useEffect,useMemo,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {printSkyHeader} from '../core/printSkyText';
import {starSpectrumBytes,starSpectrumFileName} from '../core/exposureSpectrum';
import {opticalProfile} from '../core/opticalTelescope';
import {parseSpectrum} from '../core/spectrum';
import {STAR_TARGET,type StarState} from '../core/starExposure';
import {starTelescopeIndex} from '../core/starTelescope';
import {formatNumber} from '../i18n';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import {spectrometerDefaultFileName,spectrometerPrintLines,type SpectrometerReadoutOptions} from '../core/currentObject';
import type {SpectrometerObject} from './SpectrometerReadout';
import {spectrometerPrintPage,SPECTROMETER_PRINT_TEXT_HEIGHT} from '../core/spectrometerPrint';
import './observatory-dialogs.css';
const M=OBSERVATORY_MESSAGES.spectrumSave;
/** Temporary print scope owned by this panel; the print CSS applies only while it is set (precedent: own results 1.12). */
export const SPECTRUM_PRINT_SCOPE='star-spectrum';

/** OB-SR: Save of the student's own acquired spectrum through the recovered writer (Save 0x50fb1c, header 0x510090,
 * docs/SPECTRUM-SAVE-CONTRACT.md: bytes unchanged) and a scoped browser Print of it. Disabled while the exposure runs; a spectrum
 * without a positive bin is refused by the codec before any bytes are returned. Front L2: the same card serves the star, galaxy
 * and LSS routes; the caller supplies the writer's bytes (null while running or unsavable) and the print caption. Mount it only
 * while its route is active (the print scope shows the one card in the page). Front H2: the printed page starts with VIREO's
 * shared header 0x58e860 (called by the spectrometer print 0x510240 at 0x510265). Front RE6: with the exposure given, the body is
 * VIREO's 0x510294 (core/spectrometerPrint.ts): the vector chart and the text block, range and pointing read from the saved
 * header and rows; the web caption stays above it [W]. Without an exposure (the sky route) the web chart is kept [W]. */
export type SpectrumSaveSource=Readonly<{bytes:Uint8Array|null;usable:boolean;label:string;telescopeName:string;elapsedMs:number;fileName:string;saved?:(name:string)=>string;
 /** Front H2 (sky route): print these samples when there are no SSP bytes; Save stays unavailable and `saveNote` says why. */
 printSamples?:readonly Readonly<{wavelength:number;intensity:number}>[];saveNote?:string;
 /** Front R4d: the spectrometer's current object and options (Save default name 0x50fb1c, print lines 0x510954); absent, nothing changes. */
 current?:Readonly<{object:SpectrometerObject;options:SpectrometerReadoutOptions;sky?:boolean}>;
 /** Front RE6: the exposure behind the bytes (source-plus-sky bins and totals) for VIREO's print body 0x510294. */
 exposure?:Readonly<{counts:readonly number[];sourceTotal:number;skyTotal:number}>;
 /** Front RE6 review 1 L7: the telescope pointing the print's RA/Dec lines show (0x510a08, Obs+0x65f/+0x669), not the rounded header. */
 pointing?:Readonly<{ra:number;dec:number}>}>;
export function SpectrumSaveCard({source,active}:{source:SpectrumSaveSource;active:boolean}){
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[printedAt,setPrintedAt]=useState(''),release=useRef<(()=>void)|null>(null);
 useEffect(()=>{if(!active)release.current?.();},[active]);
 useEffect(()=>()=>release.current?.(),[]);
 const {bytes,usable,current}=source,shown=current&&current.object!=='pending'?current.object:null;
 const fileName=current?spectrometerDefaultFileName(current.options,shown,source.fileName):source.fileName;
 const objectLines=current&&(shown||current.sky)?spectrometerPrintLines(current.options,!!current.sky,shown??{status:'none'}):[];
 const printOnly=!bytes&&!!source.printSamples?.length;
 const body=useMemo(()=>{
  const e=source.exposure,p=source.pointing;if(!bytes||!e||!p)return null;
  const rows=parseSpectrum(new TextDecoder().decode(bytes).split('\r\n').slice(1).join('\r\n'));if(rows.length<2)return null;
  // Review 1 M2 [W]: the configured range read back from the saved rows (2 decimals) and snapped to the dialog's 100-Å grid, so
  // the last label (λ ≤ λmax, 0x51055e) is VIREO's: 3700–4700 prints 4700.
  const grid=(x:number)=>Math.round(x/100)*100,minimum=grid(rows[0]!.wavelength),maximum=grid(rows[0]!.wavelength+600*(rows.at(-1)!.wavelength-rows[0]!.wavelength)/(rows.length-1));
  return {minimum,maximum,ra:p.ra,dec:p.dec,counts:e.counts,total:e.sourceTotal+e.skyTotal};
 },[bytes,source.exposure,source.pointing]);
 const page=body?spectrometerPrintPage({...body,pointing:{ra:body.ra,dec:body.dec},elapsedMs:source.elapsedMs,sky:!!current?.sky,object:shown,options:current?.options??{showObjectId:false,showObjectMag:false,editMode:false}}):null;
 const samples=useMemo(()=>bytes?parseSpectrum(new TextDecoder().decode(bytes).split('\r\n').slice(1).join('\r\n')):source.printSamples??[],[bytes,source.printSamples]);
 function save(){
  release.current?.();setNotice('');setError('');
  if(!bytes){setError(M.saveError);return;}
  const name=fileName;
  const url=URL.createObjectURL(new Blob([bytes.slice().buffer],{type:'text/plain;charset=us-ascii'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice((source.saved??M.saved)(name));
 }
 function print(){
  release.current?.();setNotice('');setError('');
  if(!bytes&&!printOnly){setError(M.saveError);return;}
  const root=document.documentElement;
  if(root.hasAttribute('data-print-scope')){setError(M.printBusy);return;}
  // Front H2: the spectrometer print 0x510240 starts with the shared header 0x58e860 (printSkyHeader, K2), dated when printed.
  flushSync(()=>setPrintedAt(new Date().toLocaleString()));
  root.setAttribute('data-print-scope',SPECTRUM_PRINT_SCOPE);
  const end=()=>{window.removeEventListener('afterprint',end);document.removeEventListener('pointerdown',end,true);document.removeEventListener('keydown',end,true);if(root.getAttribute('data-print-scope')===SPECTRUM_PRINT_SCOPE)root.removeAttribute('data-print-scope');if(release.current===end)release.current=null;};
  release.current=end;window.addEventListener('afterprint',end);document.addEventListener('pointerdown',end,true);document.addEventListener('keydown',end,true);
  try{window.print();setNotice(M.printed);}catch{end();setError(M.printError);}
 }
 const w0=samples[0]?.wavelength??0,w1=samples.at(-1)?.wavelength??1,points=samples.map(s=>`${40+(s.wavelength-w0)/(w1-w0||1)*920},${220-Math.max(0,Math.min(1,s.intensity))*190}`).join(' ');
 return <section className="card ob-spectrum-save" aria-labelledby="ob-spectrum-save-title" data-testid="ob-spectrum-save">
  <h2 id="ob-spectrum-save-title">{M.title}</h2><p className="observatory-note">{M.help}</p>
  <div className="ob-menu ob-print-hide"><button type="button" className="secondary-button" disabled={!usable||printOnly||!!source.saveNote||(current?.object==='pending'&&current.options.showObjectId)} data-testid="ob-spectrum-save-button" onClick={save}>{M.save}</button><button type="button" className="secondary-button" disabled={!usable} data-testid="ob-spectrum-print-button" onClick={print}>{M.print}</button></div>
  <p className="observatory-note ob-print-hide">{M.adaptation}</p>{source.saveNote&&<p className="observatory-note ob-print-hide" data-testid="ob-spectrum-save-note">{source.saveNote}</p>}
  <div className="ob-print-hide" aria-live="polite">{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</div>
  {(bytes||printOnly)&&<figure className="ob-spectrum-print" data-testid="ob-spectrum-print"><pre className="ob-print-native" data-testid="ob-spectrum-print-header">{printSkyHeader(printedAt).join('\n')}</pre>{!page&&objectLines.length>0&&<pre className="ob-print-native" data-testid="ob-spectrum-print-object">{objectLines.join('\n')}</pre>}<figcaption><strong>{source.label}</strong> · {source.telescopeName} · {M.printMeta(formatNumber(source.elapsedMs,{useGrouping:false}),formatNumber(samples.length))}</figcaption>
   {page?<svg className="ob-spectrum-print-body" viewBox="-40 0 720 340" role="img" aria-label={M.chartLabel} data-testid="ob-spectrum-print-body" fontFamily="Courier, monospace" fontSize={SPECTROMETER_PRINT_TEXT_HEIGHT}>
    <g stroke="#000" strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none"><polyline points={page.frame.map(p=>p.join(',')).join(' ')}/>{page.ticks.map((t,i)=><line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}/>)}<polyline data-testid="ob-spectrum-print-trace" points={page.trace.map(p=>p.join(',')).join(' ')}/></g>
    {page.texts.map((t,i)=><text key={i} x={t.x} y={t.y} dominantBaseline="hanging" fill="#000" data-role={t.role}>{t.text}</text>)}
   </svg>:<svg viewBox="0 0 1000 260" role="img" aria-label={M.chartLabel}><line x1="40" x2="960" y1="220" y2="220" stroke="currentColor"/><line x1="40" x2="40" y1="25" y2="220" stroke="currentColor"/><text x="40" y="245" fontSize="16">{formatNumber(w0,{maximumFractionDigits:2})} Å</text><text x="860" y="245" fontSize="16">{formatNumber(w1,{maximumFractionDigits:2})} Å</text><text x="46" y="20" fontSize="16">{M.normalized}</text><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>}
  </figure>}
 </section>;
}
/** The star route (unchanged behaviour). */
export default function SpectrumSavePrint({state,active,busy,current}:{state:StarState|null;active:boolean;busy:boolean;current?:SpectrumSaveSource['current']}){
 const running=state?.exposure.phase==='running',usable=!!state&&!running&&state.exposure.draws>0&&!busy;
 const bytes=useMemo(()=>{if(!state||running)return null;try{return starSpectrumBytes(state);}catch{return null;}},[state,running]);
 const index=state?starTelescopeIndex(state):0;
 return <SpectrumSaveCard active={active} source={{bytes,usable,label:STAR_TARGET.id,telescopeName:opticalProfile(index).name,elapsedMs:state?.exposure.elapsedMs??0,fileName:starSpectrumFileName(STAR_TARGET.id),...(current?{current}:{}),...(state?{exposure:state.exposure}:{}),pointing:STAR_TARGET}}/>;
}
