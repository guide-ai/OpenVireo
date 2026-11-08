import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {TOUR,TOUR_SEEN_KEY} from '../help/tour';
import {placeTourCard,type Box,type Placement} from '../help/tourPlacement';
import './site-tour.css';

/** Whether this browser has finished or skipped the tour (a per-viewer convenience; unreadable storage counts as not seen). */
export function tourSeen():boolean{try{return localStorage.getItem(TOUR_SEEN_KEY)==='done';}catch{return false;}}
function markTourSeen(){try{localStorage.setItem(TOUR_SEEN_KEY,'done');}catch{/* storage unavailable: shown again next visit */}}

/** Starts the first-visit tour shortly after load, unless the visitor is already busy (review 1 S4): any key press or pointer
 * press before then, a modal window open, or focus in a form field. It is then left for the next visit (not marked seen).
 * Returns the cleanup. */
export function scheduleFirstVisitTour(start:()=>void,delay=700):()=>void{
 let busy=false;const mark=()=>{busy=true;};
 window.addEventListener('pointerdown',mark,true);window.addEventListener('keydown',mark,true);
 const stop=()=>{window.removeEventListener('pointerdown',mark,true);window.removeEventListener('keydown',mark,true);};
 const timer=window.setTimeout(()=>{
  stop();
  const active=document.activeElement;
  if(busy||document.querySelector('dialog:modal,[aria-modal="true"]')||active?.closest('input,textarea,select')||(active instanceof HTMLElement&&active.isContentEditable))return;
  start();
 },delay);
 return()=>{window.clearTimeout(timer);stop();};
}

function visibleTarget(selectors:readonly string[]):Element|null{
 for(const s of selectors){const el=document.querySelector(s);if(el){const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)return el;}}
 return null;
}
/** The target's box, clipped to the window, so a tall part (the sidebar menu) is outlined only where it is on screen. */
function clippedBox(el:Element):Box|null{
 const r=el.getBoundingClientRect(),left=Math.max(r.left,0),top=Math.max(r.top,0),right=Math.min(r.right,window.innerWidth),bottom=Math.min(r.bottom,window.innerHeight);
 return right>left&&bottom>top?{left,top,width:right-left,height:bottom-top}:null;
}

/** The first-visit tour (Front Onboarding [W]): a modal window that steps through TOUR, outlining the part of the page each step
 * is about and dimming the rest. Escape or Skip ends it; finishing or skipping marks it seen, so it does not start again by
 * itself. Rendered at the document root, outside the header. */
export default function SiteTour({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),card=useRef<HTMLDivElement>(null),done=useRef(false),id=useId();
 const [index,setIndex]=useState(0),[box,setBox]=useState<Box|null>(null),[place,setPlace]=useState<Placement|null>(null);
 const steps=TOUR.steps,step=steps[index],last=index===steps.length-1;
 const measure=useCallback(()=>{
  const el=visibleTarget(step.targets),b=el?clippedBox(el):null,c=card.current;
  setBox(b);
  if(c)setPlace(placeTourCard(b,{width:c.offsetWidth,height:c.offsetHeight},{width:window.innerWidth,height:window.innerHeight}));
 },[step]);
 // Open before the step effect below moves focus into the card (layout effects run in order).
 useLayoutEffect(()=>{const d=dialog.current;if(d&&!d.open)d.showModal();},[]);
 useLayoutEffect(()=>{
  visibleTarget(step.targets)?.scrollIntoView({block:'nearest',inline:'nearest'});
  measure();
  // Next frame: opening the modal puts focus on the dialog itself. The card gets it, so a screen reader reads the step's
  // number, title and text (review 1 S6).
  const f=requestAnimationFrame(()=>card.current?.focus());return()=>cancelAnimationFrame(f);
 },[step,measure]);
 useEffect(()=>{
  let frame=0;const again=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
  window.addEventListener('resize',again);window.addEventListener('scroll',again,true);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',again);window.removeEventListener('scroll',again,true);};
 },[measure]);
 // Close the modal first, so the browser restores focus before the parent moves it to Help. Once only: closing also fires
 // the dialog's close event, which ends the tour too if the browser closed it without a cancel event (review 1 N7).
 const finish=()=>{if(done.current)return;done.current=true;markTourSeen();if(dialog.current?.open)dialog.current.close();onClose();};
 return createPortal(<dialog ref={dialog} className="site-tour" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} data-testid="site-tour" data-step={step.id}
  onCancel={e=>{e.preventDefault();finish();}} onClose={finish}>
  {box?<div className="site-tour-spot" data-testid="site-tour-spot" aria-hidden="true" style={{left:box.left-6,top:box.top-6,width:box.width+12,height:box.height+12}}/>
   :<div className="site-tour-dim" aria-hidden="true"/>}
  <div ref={card} className="site-tour-card" role="group" tabIndex={-1} aria-labelledby={`${id}-p ${id}-t`} aria-describedby={`${id}-d`} data-testid="site-tour-card"
   data-side={place?.side} style={place?{left:place.left,top:place.top}:{visibility:'hidden'}}>
   <p className="site-tour-progress" id={`${id}-p`}>{TOUR.progress(index+1,steps.length)}</p>
   <h2 id={`${id}-t`}>{step.title}</h2>
   <p id={`${id}-d`}>{step.text}</p>
   <div className="site-tour-actions">
    {!last&&<button type="button" className="text-button site-tour-skip" data-testid="site-tour-skip" onClick={finish}>{TOUR.skip}</button>}
    {index>0&&<button type="button" className="secondary-button" data-testid="site-tour-back" onClick={()=>setIndex(i=>i-1)}>{TOUR.back}</button>}
    <button type="button" className="primary-button" data-testid="site-tour-next" onClick={last?finish:()=>setIndex(i=>i+1)}>{last?TOUR.done:TOUR.next}</button>
   </div>
  </div>
 </dialog>,document.body);
}
