import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {t,uiDirection} from '../i18n';
import {isTermId,termDefinition,type TermId} from '../help/glossary';
import {fit} from '../polish/popupPlacement';
import './term-popover.css';

/** Where a term's definition is drawn: the term's guide window (a modal <dialog>, in the top layer, so a popover outside it would
 * be hidden behind it) or the companion strip's Step details. */
const CONTAINER='dialog, .guide-companion-details';
/** The popover's room from the term and from the viewport's edges, in CSS pixels. */
const GAP=6,EDGE=4;
type Open=Readonly<{term:HTMLButtonElement;id:TermId;container:Element}>;

/** Front NEWCOMER NC7 [W] (plan analysis/front-plans/front-newcomer.md §2.7, review M4a/M4d; plan Q12): the one popover that shows
 * a glossary term's definition (help/glossary.tsx marks the terms as `<button class="term">`). Presses are handled by delegation
 * on the document, so no component is made per term: a click, a tap, Enter or Space on a term opens its definition, and a second
 * press on it, a press elsewhere or Escape closes it (Escape only closes the definition, not the guide window under it). Nothing
 * opens on hover or focus. The focus stays on the term, which says `aria-expanded` and, while open, is described by the popover
 * (`aria-describedby`, the definition's text); the popover holds no tab stop, so it is no focus trap. It is drawn inside the term's container, below the
 * term (above it when there is no room), and moved back inside the viewport (polish/popupPlacement.ts `fit`), from the term's
 * inline start (its right edge, right to left). It closes when the term leaves the page or its window closes. Nothing is stored. */
export default function TermPopover(){
 const [open,setOpen]=useState<Open|null>(null),box=useRef<HTMLDivElement>(null),id=useId();
 const current=useRef<Open|null>(null);current.current=open;
 // Presses, keys and the term's own state.
 useEffect(()=>{
  const close=()=>setOpen(null);
  const click=(event:MouseEvent)=>{
   const target=event.target instanceof Element?event.target:null,term=target?.closest<HTMLButtonElement>('button.term');
   if(!term){if(current.current&&!box.current?.contains(target))close();return;}
   const name=term.dataset.term??'',container=term.closest(CONTAINER);
   if(!isTermId(name)||!container)return;
   setOpen(old=>old?.term===term?null:{term,id:name,container});
  };
  const key=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||!current.current)return;
   // The definition goes first: the guide window's own Escape and the strip's Step details wait for the next press.
   event.preventDefault();event.stopImmediatePropagation();close();
  };
  document.addEventListener('click',click);window.addEventListener('keydown',key,true);
  return()=>{document.removeEventListener('click',click);window.removeEventListener('keydown',key,true);};
 },[]);
 useEffect(()=>{
  if(!open)return;
  const {term}=open,popover=`${id}-term-text`;
  term.setAttribute('aria-expanded','true');term.setAttribute('aria-describedby',popover);
  const dialog=open.container instanceof HTMLDialogElement?open.container:null,closed=()=>setOpen(null);
  dialog?.addEventListener('close',closed);
  return()=>{dialog?.removeEventListener('close',closed);term.setAttribute('aria-expanded','false');if(term.getAttribute('aria-describedby')===popover)term.removeAttribute('aria-describedby');};
 },[open,id]);
 // Placement, again while the window scrolls or the view changes; the popover closes when its term is gone or hidden.
 useLayoutEffect(()=>{
  const el=box.current;if(!open||!el)return;
  let frame=0;
  const place=()=>{
   const {term}=open;
   if(!term.isConnected||!term.getClientRects().length){setOpen(null);return;}
   const r=term.getBoundingClientRect(),w=window.innerWidth,h=window.innerHeight,rtl=uiDirection()==='rtl';
   el.style.left='0px';el.style.top='0px';
   const b=el.getBoundingClientRect(),below=r.bottom+GAP,top=below+b.height<=h-EDGE||r.top-GAP-b.height<EDGE?below:r.top-GAP-b.height;
   const left=rtl?r.right-b.width:r.left;
   el.style.left=`${Math.round(left+fit(left,left+b.width,w))}px`;el.style.top=`${Math.round(top+fit(top,top+b.height,h))}px`;
  };
  const again=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
  place();
  window.addEventListener('resize',again);window.addEventListener('scroll',again,true);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',again);window.removeEventListener('scroll',again,true);};
 },[open]);
 if(!open)return null;
 return createPortal(<div ref={box} id={`${id}-term`} className="term-popover" role="note" aria-label={t('term.label',{term:open.term.textContent??''})} data-testid="term-popover" data-term={open.id}>
  <p id={`${id}-term-text`}>{termDefinition(open.id)}</p>
  {/* For a pointer: the term itself, Escape or a press elsewhere also close it, so the button holds no tab stop. */}
  <button type="button" className="term-popover-close" tabIndex={-1} aria-label={t('term.close')} onClick={()=>setOpen(null)}>×</button>
 </div>,open.container);
}
