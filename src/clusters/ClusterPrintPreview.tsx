import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {CLUSTER_HR as M} from './ClusterHrMessages';
import NativeMirrorCaption from '../components/NativeMirrorCaption';
import './cluster-hr.css';

export const CLUSTER_PRINT_SCOPE='cluster-hr';
/** WEB print preview for the cluster HR tools (help topics, HR diagram, reports): a portalled modal dialog whose report part
 * is the only thing printed (data-print-scope, as the variable-star preview). `note` explains which parts are recovered. */
export default function ClusterPrintPreview({caption,note,children,onClose,onPrinted,mirror=false,testId='cluster-print-preview'}:{caption:string;note:string;children:ReactNode;onClose:()=>void;onPrinted?:()=>void;
 /** Front ES7: the printed lines mirror VIREO's own native text and stay English; a caption in the screen language says so. */ mirror?:boolean;testId?:string}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const el=dialog.current;if(el&&!el.open){el.showModal();button.current?.focus();}
  return ()=>{const root=document.documentElement;if(root.getAttribute('data-print-scope')===CLUSTER_PRINT_SCOPE)root.removeAttribute('data-print-scope');};},[]);
 function print(){
  const root=document.documentElement;
  if(root.hasAttribute('data-print-scope')&&root.getAttribute('data-print-scope')!==CLUSTER_PRINT_SCOPE){setFailed(true);return;}
  root.setAttribute('data-print-scope',CLUSTER_PRINT_SCOPE);
  const end=()=>{window.removeEventListener('afterprint',end);if(root.getAttribute('data-print-scope')===CLUSTER_PRINT_SCOPE)root.removeAttribute('data-print-scope');};
  window.addEventListener('afterprint',end);
  try{if(typeof window.print!=='function')throw new TypeError('print unavailable');window.print();setFailed(false);onPrinted?.();}catch{end();setFailed(true);}
 }
 return createPortal(<dialog ref={dialog} className="ob-dialog ob-wide cluster-print-root" aria-labelledby={`${id}-t`} data-testid={testId} onCancel={e=>{e.preventDefault();onClose();}}>
  <div className="cluster-print-chrome"><h2 id={`${id}-t`}>{M.printTitle(caption)}</h2><p className="cluster-hr-note">{note}</p>{mirror&&<NativeMirrorCaption print/>}</div>
  <section className="cluster-print-report" tabIndex={0} aria-label={caption}>{children}</section>
  <div className="cluster-print-chrome"><p role="alert">{failed?M.printError:''}</p>
   <div className="ob-actions"><button type="button" className="primary-button" ref={button} data-testid={`${testId}-print`} onClick={print}>{M.printButton}</button><button type="button" className="secondary-button" data-testid={`${testId}-close`} onClick={onClose}>{M.printClose}</button></div></div>
 </dialog>,document.body);
}
