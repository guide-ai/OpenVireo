import {useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {POLISH_MESSAGES as PM} from './PolishMessages';
import './polish.css';

export const WEB_PRINT_SCOPE='web-print';

/** Front P web print [W] of a picture window (Print Sky Image, LSS Wedge Print, Pulsar Analysis Print Window): a preview
 * dialog with a date line, the native caption, optional header lines and the picture, then window.print while
 * html[data-print-scope=web-print] hides everything else (same pattern as the list and hot-list prints). The picture is
 * either rendered by the caller (children) or a DOM clone of a live element (clone), so the printed view equals the shown
 * one. VIREO's own printer layout is not reproduced.
 * Front K2.3: with `nativeHeader` the page starts with VIREO's recovered header lines (given the date text) instead of the date
 * and caption (the caption then stays in the screen-only chrome); `footer` adds lines under the picture; `invert` prints the
 * picture colour-inverted (Print Sky copies CRT1 with cmNotSrcCopy). */
export default function WebPrintPreview({testId,caption,header=[],note,clone,children,onClose,nativeHeader,footer,invert=false}:{testId:string;caption:string;header?:readonly string[];note:string;
 clone?:()=>Element|null;children?:ReactNode;onClose:()=>void;nativeHeader?:(dateText:string)=>readonly string[];footer?:readonly string[];invert?:boolean}){
 const id=useId(),suffix=`-print${id.replace(/[^A-Za-z0-9_-]/g,'')}`,dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),picture=useRef<HTMLDivElement>(null);
 const [printedAt]=useState(()=>new Date().toLocaleString()),[failed,setFailed]=useState(false),[missing,setMissing]=useState(false);
 useLayoutEffect(()=>{
  const host=picture.current;if(!clone||!host)return;
  const source=clone();
  if(!source){setMissing(true);return;}
  const copy=source.cloneNode(true) as Element;copy.removeAttribute('id');
  // Internal ids (clip paths, gradients) get a print suffix and their url(#…)/href references follow, so the copy never
  // points at the live element's defs (hidden while printing) and ids stay unique.
  const ids=new Set<string>();copy.querySelectorAll('[id]').forEach(e=>{ids.add(e.id);e.id=`${e.id}${suffix}`;});
  if(ids.size)for(const e of [copy,...copy.querySelectorAll('*')])for(const attr of [...e.attributes]){
   const v=attr.value.replace(/url\(#([^)]+)\)/g,(m,ref:string)=>ids.has(ref)?`url(#${ref}${suffix})`:m);
   const w=/^#/.test(v)&&ids.has(v.slice(1))&&/href$/.test(attr.name)?`${v}${suffix}`:v;
   if(w!==attr.value)e.setAttribute(attr.name,w);
  }
  copy.removeAttribute('tabindex');copy.setAttribute('aria-hidden','true');copy.setAttribute('inert','');
  copy.querySelectorAll('[tabindex]').forEach(e=>e.setAttribute('tabindex','-1'));
  if(source instanceof HTMLCanvasElement){const img=document.createElement('img');try{img.src=source.toDataURL('image/png');}catch{setMissing(true);return;}img.alt='';host.replaceChildren(img);}
  else host.replaceChildren(copy);
  return ()=>{host.replaceChildren();};
 // A snapshot when the preview opens: later changes of the live view do not alter what is printed.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{const el=dialog.current;if(el&&!el.open){el.showModal();button.current?.focus();}
  return ()=>{const root=document.documentElement;if(root.getAttribute('data-print-scope')===WEB_PRINT_SCOPE)root.removeAttribute('data-print-scope');};},[]);
 /** Closes the modal first so the page is no longer inert when the caller returns focus. */
 const close=()=>{dialog.current?.close();onClose();};
 function print(){
  const root=document.documentElement;
  if(root.hasAttribute('data-print-scope')&&root.getAttribute('data-print-scope')!==WEB_PRINT_SCOPE){setFailed(true);return;}
  root.setAttribute('data-print-scope',WEB_PRINT_SCOPE);
  const end=()=>{window.removeEventListener('afterprint',end);if(root.getAttribute('data-print-scope')===WEB_PRINT_SCOPE)root.removeAttribute('data-print-scope');};
  window.addEventListener('afterprint',end);
  try{if(typeof window.print!=='function')throw new TypeError('print unavailable');window.print();setFailed(false);}catch{end();setFailed(true);}
 }
 return createPortal(<dialog ref={dialog} className="ob-dialog ob-wide web-print-root" aria-labelledby={`${id}-t`} data-testid={testId} onCancel={e=>{e.preventDefault();close();}}>
  <div className="web-print-chrome"><h2 id={`${id}-t`}>{PM.print.title}</h2>{nativeHeader&&<p className="ob-native">{caption}</p>}<p className="observatory-note">{note}</p></div>
  <section className="web-print-report" tabIndex={0} aria-label={caption}>
   {nativeHeader?<pre className="web-print-native" data-testid={`${testId}-native-header`}>{nativeHeader(printedAt).join('\n')}</pre>:<>
   <p className="web-print-header" data-testid={`${testId}-date`}>{printedAt}</p>
   <p className="web-print-header ob-native">{caption}</p></>}
   {header.map((line,i)=><p key={i} className="web-print-header" data-testid={`${testId}-header-${i}`}>{line}</p>)}
   <div ref={picture} className={`web-print-picture${invert?' web-print-inverted':''}`} data-testid={`${testId}-picture`}>{children}</div>
   {footer&&<pre className="web-print-native" data-testid={`${testId}-footer`}>{footer.join('\n')}</pre>}
   {missing&&<p role="alert">{PM.print.missing}</p>}
  </section>
  <div className="web-print-chrome"><p role="alert">{failed?PM.print.error:''}</p>
   <div className="ob-actions"><button type="button" className="primary-button" ref={button} data-testid={`${testId}-print`} disabled={missing} onClick={print}>{PM.print.button}</button>
    <button type="button" className="secondary-button" data-testid={`${testId}-close`} onClick={close}>{PM.print.close}</button></div></div>
 </dialog>,document.body);
}
