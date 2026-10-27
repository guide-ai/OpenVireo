import {useEffect,useMemo,useRef,useState} from 'react';
import {starSpectrumBytes} from '../core/exposureSpectrum';
import {opticalProfile} from '../core/opticalTelescope';
import {parseSpectrum} from '../core/spectrum';
import {STAR_TARGET,type StarState} from '../core/starExposure';
import {starTelescopeIndex} from '../core/starTelescope';
import {formatNumber} from '../i18n';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import './observatory-dialogs.css';
const M=OBSERVATORY_MESSAGES.spectrumSave;
/** Temporary print scope owned by this panel; the print CSS applies only while it is set (precedent: own results 1.12). */
export const SPECTRUM_PRINT_SCOPE='star-spectrum';

/** OB-SR: Save of the student's own acquired spectrum through the recovered writer (Save 0x50fb1c, header 0x510090,
 * docs/SPECTRUM-SAVE-CONTRACT.md: starSpectrumBytes, bytes unchanged) and a scoped browser Print of it. Disabled while the
 * exposure runs; a spectrum without a positive bin is refused by the codec before any bytes are returned. */
export default function SpectrumSavePrint({state,active,busy}:{state:StarState|null;active:boolean;busy:boolean}){
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),release=useRef<(()=>void)|null>(null);
 useEffect(()=>{if(!active)release.current?.();},[active]);
 useEffect(()=>()=>release.current?.(),[]);
 const running=state?.exposure.phase==='running',usable=!!state&&!running&&state.exposure.draws>0&&!busy;
 const bytes=useMemo(()=>{if(!state||running)return null;try{return starSpectrumBytes(state);}catch{return null;}},[state,running]);
 const samples=useMemo(()=>bytes?parseSpectrum(new TextDecoder().decode(bytes).split('\r\n').slice(1).join('\r\n')):[],[bytes]);
 const index=state?starTelescopeIndex(state):0;
 function save(){
  release.current?.();setNotice('');setError('');
  if(!bytes){setError(M.saveError);return;}
  const name=`openvireo-star-${STAR_TARGET.id.replace(/[^A-Za-z0-9_-]+/g,'_')}.ssp`;
  const url=URL.createObjectURL(new Blob([bytes.slice().buffer],{type:'text/plain;charset=us-ascii'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice(M.saved(name));
 }
 function print(){
  release.current?.();setNotice('');setError('');
  if(!bytes){setError(M.saveError);return;}
  const root=document.documentElement;
  if(root.hasAttribute('data-print-scope')){setError(M.printBusy);return;}
  root.setAttribute('data-print-scope',SPECTRUM_PRINT_SCOPE);
  const end=()=>{window.removeEventListener('afterprint',end);document.removeEventListener('pointerdown',end,true);document.removeEventListener('keydown',end,true);if(root.getAttribute('data-print-scope')===SPECTRUM_PRINT_SCOPE)root.removeAttribute('data-print-scope');if(release.current===end)release.current=null;};
  release.current=end;window.addEventListener('afterprint',end);document.addEventListener('pointerdown',end,true);document.addEventListener('keydown',end,true);
  try{window.print();setNotice(M.printed);}catch{end();setError(M.printError);}
 }
 const w0=samples[0]?.wavelength??0,w1=samples.at(-1)?.wavelength??1,points=samples.map(s=>`${40+(s.wavelength-w0)/(w1-w0||1)*920},${220-Math.max(0,Math.min(1,s.intensity))*190}`).join(' ');
 return <section className="card ob-spectrum-save" aria-labelledby="ob-spectrum-save-title" data-testid="ob-spectrum-save">
  <h2 id="ob-spectrum-save-title">{M.title}</h2><p className="observatory-note">{M.help}</p>
  <div className="ob-menu ob-print-hide"><button type="button" className="secondary-button" disabled={!usable} data-testid="ob-spectrum-save-button" onClick={save}>{M.save}</button><button type="button" className="secondary-button" disabled={!usable} data-testid="ob-spectrum-print-button" onClick={print}>{M.print}</button></div>
  <p className="observatory-note ob-print-hide">{M.adaptation}</p>
  <div className="ob-print-hide" aria-live="polite">{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</div>
  {bytes&&<figure className="ob-spectrum-print" data-testid="ob-spectrum-print"><figcaption><strong>{STAR_TARGET.id}</strong> · {opticalProfile(index).name} · {M.printMeta(formatNumber(state!.exposure.elapsedMs,{useGrouping:false}),formatNumber(samples.length))}</figcaption>
   <svg viewBox="0 0 1000 260" role="img" aria-label={M.chartLabel}><line x1="40" x2="960" y1="220" y2="220" stroke="currentColor"/><line x1="40" x2="40" y1="25" y2="220" stroke="currentColor"/><text x="40" y="245" fontSize="16">{formatNumber(w0,{maximumFractionDigits:2})} Å</text><text x="860" y="245" fontSize="16">{formatNumber(w1,{maximumFractionDigits:2})} Å</text><text x="46" y="20" fontSize="16">{M.normalized}</text><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
  </figure>}
 </section>;
}
