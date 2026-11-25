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
 * opens on hover or focus. The focus stays on the term, which says `aria-expanded` and carries the definition as its
 * `aria-description` (help/glossary.tsx; review N3), and, while open, is also described by the popover's text
 * (`aria-describedby`); the popover holds no tab stop, so it is no focus trap. It is drawn inside the term's container, below the
 * term (above it when there is no room), and moved back inside the viewport (polish/popupPlacement.ts `fit`), from the term's
 * inline start (its right edge, right to left). It closes when its term leaves the page, is hidden or becomes another term (a
 * MutationObserver on the container, review N1), or when its window closes. Nothing is stored. */
export default function TermPopover(){
 const [open,setOpen]=useState<Open|null>(null),box=useRef<HTMLDivElement>(null),id=useId();
 const current=useRef<Open|null>(null);current.current=open;
 // Presses, keys and the term's own state. `current` is cleared at once on close, so no Escape is taken once nothing is open.
 useEffect(()=>{
  const close=()=>{current.current=null;setOpen(null);};
  const click=(event:MouseEvent)=>{
   const target=event.target instanceof Element?event.target:null,term=target?.closest<HTMLButtonElement>('button.term');
   if(!term){if(current.current&&!box.current?.contains(target))close();return;}
   const name=term.dataset.term??'',container=term.closest(CONTAINER);
   if(!isTermId(name)||!container)return;
   setOpen(old=>old?.term===term?null:{term,id:name,container});
  };
  const key=(event:KeyboardEvent)=>{
   const now=current.current;
   if(event.key!=='Escape'||!now)return;
   // Review N4: only an Escape from the definition's own container (the guide window or Step details, where the focus stays on
   // the term), never one meant for something else, such as a menu or a confirmation drawn elsewhere.
   const target=event.target instanceof Node?event.target:null;
   if(!(target&&now.container.contains(target))&&!now.container.contains(document.activeElement))return;
   // The definition goes first: the guide window's own Escape (its cancel event) and the strip's Step details wait for the next
   // press. Stopping the event here is safe: it is the Escape of the one thing the visitor opened last, inside that container,
   // and nothing else is open above the definition there (it holds no control).
   event.preventDefault();event.stopImmediatePropagation();close();
  };
  document.addEventListener('click',click);window.addEventListener('keydown',key,true);
  return()=>{document.removeEventListener('click',click);window.removeEventListener('keydown',key,true);};
 },[]);
 useEffect(()=>{
  if(!open)return;
  const {term}=open,popover=`${id}-term-text`;
  if(term.dataset.term!==open.id){setOpen(null);return;}
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
   if(!term.isConnected||!term.getClientRects().length||term.dataset.term!==open.id||!open.container.contains(term)){setOpen(null);return;}
   const r=term.getBoundingClientRect(),w=window.innerWidth,h=window.innerHeight,rtl=uiDirection()==='rtl';
   el.style.left='0px';el.style.top='0px';
   const b=el.getBoundingClientRect(),below=r.bottom+GAP,top=below+b.height<=h-EDGE||r.top-GAP-b.height<EDGE?below:r.top-GAP-b.height;
   const left=rtl?r.right-b.width:r.left;
   el.style.left=`${Math.round(left+fit(left,left+b.width,w))}px`;el.style.top=`${Math.round(top+fit(top,top+b.height,h))}px`;
  };
  const again=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
  place();
  // Review N1: a re-render that removes or replaces the term (the step moved on) closes the definition at once.
  const observer=new MutationObserver(again);
  observer.observe(open.container,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-term','hidden','open']});
  window.addEventListener('resize',again);window.addEventListener('scroll',again,true);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',again);window.removeEventListener('scroll',again,true);};
 },[open]);
 if(!open)return null;
 return createPortal(<div ref={box} id={`${id}-term`} className="term-popover" role="note" aria-label={t('term.label',{term:open.term.textContent??''})} data-testid="term-popover" data-term={open.id}>
  <p id={`${id}-term-text`}>{termDefinition(open.id)}</p>
  {/* For a pointer: the term itself, Escape or a press elsewhere also close it, so the button holds no tab stop. */}
  <button type="button" className="term-popover-close" tabIndex={-1} aria-label={t('term.close')} onClick={()=>setOpen(null)}>×</button>
 </div>,open.container);
}
