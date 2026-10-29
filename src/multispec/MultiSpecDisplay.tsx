import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {MultiSpecSpectrum} from '../core/multiSpecSpectrum';
import {MULTISPEC_MESSAGES as N} from '../core/multiSpecFormat';
import {t} from '../i18n';

const D=N.display;
export const MULTISPEC_PRINT_SCOPE='multispec';
export type MultiSpecResult=Readonly<{status:'loading'}|{status:'error'}|{status:'unavailable';text:string}|{status:'ready';spectrum:MultiSpecSpectrum;galaxyType:string|null}>;
/** The 400-point plot of TMSpecDsplyForm1 (Paint, plan §2.6): blue panel, axes with ticks every 100 Å, "Angstroms",
 * "Intensity", "1.0"/"0.0", and plot y := 170 − Round(c·150/max) (core). x: one control pixel per bin from x = 30 [W]. */
export function MultiSpecPlot({spectrum,label}:Readonly<{spectrum:MultiSpecSpectrum;label:string}>){
 const x0=30,points=spectrum.plotY.map((y,i)=>`${x0+i},${y}`).join(' '),ticks:number[]=[];
 for(let w=Math.ceil(spectrum.minimum/100)*100;w<=spectrum.wavelengths[spectrum.wavelengths.length-1];w+=100)ticks.push(w);
 const xOf=(w:number)=>x0+(w-spectrum.minimum)/spectrum.dispersion;
 return <svg className="ms-plot" viewBox="0 0 454 228" role="img" aria-label={label} data-testid="ms-plot">
  <rect width="454" height="228" fill="#0000a8"/>
  <g stroke="#ffffff" fill="#ffffff" fontSize="11">
   <line x1={x0} x2={x0+400} y1={170} y2={170}/><line x1={x0} x2={x0} y1={20} y2={170}/>
   {ticks.map(w=><g key={w}><line x1={xOf(w)} x2={xOf(w)} y1={170} y2={175}/><text x={xOf(w)} y={188} textAnchor="middle" stroke="none">{w}</text></g>)}
   <text x={x0+200} y={210} textAnchor="middle" stroke="none">{D.axisX}</text>
   <text x={12} y={95} textAnchor="middle" stroke="none" transform="rotate(-90 12 95)">{D.axisY}</text>
   <text x={x0-4} y={24} textAnchor="end" stroke="none">{D.one}</text><text x={x0-4} y={170} textAnchor="end" stroke="none">{D.zero}</text>
  </g>
  <polyline points={points} fill="none" stroke="#ffff55" strokeWidth="1"/>
 </svg>;
}
/** TSpInfoForm1 "Spectrum Information" (0x527ee4): the lines come from core multiSpecInformationLines with the mask applied. */
function InformationDialog({lines,onClose}:Readonly<{lines:readonly string[];onClose:()=>void}>){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),ok=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const d=dialog.current;if(d&&!d.open){d.showModal();ok.current?.focus();}return()=>{if(d?.open)d.close();};},[]);
 return <dialog ref={dialog} className="ob-dialog ms-info" aria-labelledby={`${id}-t`} data-testid="ms-info" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`} className="ob-native">{D.infoCaption}</h2>
  <ul className="ms-lines">{lines.map((l,i)=><li key={i} data-testid={`ms-info-line-${i}`}>{l}</li>)}</ul>
  <div className="ob-actions"><button type="button" className="primary-button" ref={ok} onClick={onClose}>{t('multispec.ok')}</button></div>
 </dialog>;
}
/** Print 0x528454 as a print preview (the HotListPrintPreview pattern): a portalled modal whose scoped print stylesheet prints
 * only the report (plot and the core print lines). The shared printer header 0x58e860 is not ported [W]. */
function PrintPreview({caption,spectrum,lines,onClose}:Readonly<{caption:string;spectrum:MultiSpecSpectrum;lines:readonly string[];onClose:()=>void}>){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const d=dialog.current;if(d&&!d.open){d.showModal();button.current?.focus();}
  return()=>{const root=document.documentElement;if(root.getAttribute('data-print-scope')===MULTISPEC_PRINT_SCOPE)root.removeAttribute('data-print-scope');if(d?.open)d.close();};},[]);
 function print(){
  const root=document.documentElement;
  if(root.hasAttribute('data-print-scope')&&root.getAttribute('data-print-scope')!==MULTISPEC_PRINT_SCOPE){setFailed(true);return;}
  root.setAttribute('data-print-scope',MULTISPEC_PRINT_SCOPE);
  const end=()=>{window.removeEventListener('afterprint',end);if(root.getAttribute('data-print-scope')===MULTISPEC_PRINT_SCOPE)root.removeAttribute('data-print-scope');};
  window.addEventListener('afterprint',end);
  try{if(typeof window.print!=='function')throw new TypeError('print unavailable');window.print();setFailed(false);}catch{end();setFailed(true);}
 }
 return createPortal(<dialog ref={dialog} className="ob-dialog ob-wide ms-print-root" aria-labelledby={`${id}-t`} data-testid="ms-print-preview" onCancel={e=>{e.preventDefault();onClose();}}>
  <div className="ms-print-chrome"><h2 id={`${id}-t`}>{t('multispec.printTitle')}</h2><p className="ob-note">{t('multispec.printHelp')}</p></div>
  <section className="ms-print-report" tabIndex={0} aria-label={t('multispec.printReport')}>
   <h3 className="ob-native">{caption}</h3><MultiSpecPlot spectrum={spectrum} label={t('multispec.plotLabel',{caption})}/>
   <ul className="ms-lines">{lines.map((l,i)=><li key={i} data-testid={`ms-print-line-${i}`}>{l}</li>)}</ul>
  </section>
  <div className="ms-print-chrome"><p role="alert">{failed?t('multispec.printError'):''}</p>
   <div className="ob-actions"><button type="button" className="primary-button" ref={button} onClick={print} data-testid="ms-print-print">{t('multispec.print')}</button><button type="button" className="secondary-button" onClick={onClose} data-testid="ms-print-close">{t('multispec.close')}</button></div></div>
 </dialog>,document.body);
}
/** One TMSpecDsplyForm1 (caption "(n) " + the name only with Show Object ID): File ▸ Information / Save / Print / Exit. A fibre
 * without a spectrum shows its typed reason, or one neutral text while the Object X mask applies (plan §4). */
export default function MultiSpecDisplay({caption,result,information,printLines,onSave,onClose}:Readonly<{caption:string;result:MultiSpecResult;
 information:()=>readonly string[];printLines:()=>readonly string[];onSave:()=>void;onClose:()=>void}>){
 const id=useId(),[info,setInfo]=useState<readonly string[]|null>(null),[print,setPrint]=useState<readonly string[]|null>(null);
 const ready=result.status==='ready';
 return <section className="ms-spectrum" aria-labelledby={`${id}-c`} data-testid="ms-spectrum">
  <h4 id={`${id}-c`} className="ob-native" data-testid="ms-spectrum-caption">{caption}</h4>
  <div className="ms-menu" role="group" aria-label={D.file}>
   <button type="button" className="secondary-button" disabled={!ready} onClick={()=>setInfo(information())} data-testid="ms-information">{D.information}</button>
   <button type="button" className="secondary-button" disabled={!ready} onClick={onSave} data-testid="ms-save">{D.save}</button>
   <button type="button" className="secondary-button" disabled={!ready} onClick={()=>setPrint(printLines())} data-testid="ms-print">{D.print}</button>
   <button type="button" className="secondary-button" onClick={onClose} data-testid="ms-spectrum-exit">{D.exit}</button>
  </div>
  {result.status==='ready'?<MultiSpecPlot spectrum={result.spectrum} label={t('multispec.plotLabel',{caption})}/>
   :<p role="status" data-testid="ms-spectrum-status">{result.status==='loading'?t('multispec.spectrumLoading'):result.status==='error'?t('multispec.spectrumError'):result.text}</p>}
  {info&&<InformationDialog lines={info} onClose={()=>setInfo(null)}/>}
  {print&&result.status==='ready'&&<PrintPreview caption={caption} spectrum={result.spectrum} lines={print} onClose={()=>setPrint(null)}/>}
 </section>;
}
