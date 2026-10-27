import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {HotListPrintSnapshot} from '../core/hotListPrint';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import './observatory-dialogs.css';
const M=OBSERVATORY_MESSAGES.hotListPrint;
export const HOT_LIST_PRINT_SCOPE='hot-list';

/** WEB-HL-13 print preview (RA-HL-10): a modal <dialog> portalled to <body> so the scoped print stylesheet can hide every
 * other body child and the screen-only chrome, printing exactly the snapshot (heading and row texts as React text). Print…
 * calls window.print() synchronously in the click; a throw shows an error and keeps the preview for a retry. Nothing is
 * stored and no success is claimed. The scope attribute is released on afterprint, close or unmount. */
export default function HotListPrintPreview({snapshot,onClose}:{snapshot:HotListPrintSnapshot;onClose:()=>void}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),printButton=useRef<HTMLButtonElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const el=dialog.current;if(el&&!el.open){el.showModal();printButton.current?.focus();}
  return ()=>{const root=document.documentElement;if(root.getAttribute('data-print-scope')===HOT_LIST_PRINT_SCOPE)root.removeAttribute('data-print-scope');};},[]);
 function print(){
  const root=document.documentElement;
  if(root.hasAttribute('data-print-scope')&&root.getAttribute('data-print-scope')!==HOT_LIST_PRINT_SCOPE){setFailed(true);return;}
  root.setAttribute('data-print-scope',HOT_LIST_PRINT_SCOPE);
  const end=()=>{window.removeEventListener('afterprint',end);if(root.getAttribute('data-print-scope')===HOT_LIST_PRINT_SCOPE)root.removeAttribute('data-print-scope');};
  window.addEventListener('afterprint',end);
  try{if(typeof window.print!=='function')throw new TypeError('print unavailable');window.print();setFailed(false);}catch{end();setFailed(true);}
 }
 return createPortal(<dialog ref={dialog} className="ob-dialog ob-wide ob-print-root" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} data-testid="ob-hotlist-print-preview" onCancel={e=>{e.preventDefault();onClose();}}>
  <div className="ob-print-chrome"><h2 id={`${id}-title`}>{M.title}</h2><p id={`${id}-help`} className="ob-note">{M.help}</p><p className="ob-note" data-testid="ob-hotlist-print-count">{M.count(snapshot.lines.length)}</p></div>
  <section className="ob-print-report" tabIndex={0} aria-label={M.report} data-testid="ob-hotlist-print-report">
   <h3 className="ob-native" data-testid="ob-hotlist-print-heading">{snapshot.heading}</h3>
   {snapshot.lines.length?<ol className="ob-print-lines">{snapshot.lines.map((l,i)=><li key={l.sourceIndex} data-testid={`ob-hotlist-print-line-${i+1}`}>{l.text}</li>)}</ol>:<p>{M.empty}</p>}
  </section>
  <div className="ob-print-chrome"><p className="ob-note">{M.adaptation}</p><p role="alert" data-testid="ob-hotlist-print-error">{failed?M.error:''}</p>
   <div className="ob-actions"><button type="button" className="primary-button" ref={printButton} data-testid="ob-hotlist-print-print" onClick={print}>{M.print}</button><button type="button" className="secondary-button" data-testid="ob-hotlist-print-close" onClick={onClose}>{M.close}</button></div></div>
 </dialog>,document.body);
}
