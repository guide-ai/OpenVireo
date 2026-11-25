import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {TOUR,TOUR_SEEN_KEY} from '../help/tour';
import {placeTourCard,spotBox,type Box,type Placement} from '../help/tourPlacement';
import {clippedBox,viewSize,visibleTarget} from '../help/spot';
import {uiDirection} from '../i18n';
import './site-tour.css';

/** Whether this browser has finished or skipped the tour (a per-viewer convenience; unreadable storage counts as not seen). */
export function tourSeen():boolean{try{return localStorage.getItem(TOUR_SEEN_KEY)==='done';}catch{return false;}}
function markTourSeen(){try{localStorage.setItem(TOUR_SEEN_KEY,'done');}catch{/* storage unavailable: shown again next visit */}}

/** Starts the first-visit tour shortly after load, unless the visitor is already busy (review 1 S4): any key press or pointer
 * press before then, a modal window open, or focus in a form field. It is then left for the next visit (not marked seen).
 * Returns the cleanup. Front HOME review 1: `ran`, when given, is told when the timer has run (whether or not the tour started). */
export function scheduleFirstVisitTour(start:()=>void,delay=700,ran?:()=>void):()=>void{
 let busy=false;const mark=()=>{busy=true;};
 window.addEventListener('pointerdown',mark,true);window.addEventListener('keydown',mark,true);
 const stop=()=>{window.removeEventListener('pointerdown',mark,true);window.removeEventListener('keydown',mark,true);};
 const timer=window.setTimeout(()=>{
  ran?.();stop();
  const active=document.activeElement;
  if(busy||document.querySelector('dialog:modal,[aria-modal="true"]')||active?.closest('input,textarea,select')||(active instanceof HTMLElement&&active.isContentEditable))return;
  start();
 },delay);
 return()=>{window.clearTimeout(timer);stop();};
}

/** The first-visit tour (Front Onboarding [W]): a modal window that steps through TOUR, outlining the part of the page each step
 * is about and dimming the rest. Escape or Skip ends it; finishing or skipping marks it seen, so it does not start again by
 * itself. Rendered at the document root, outside the header. Front NEWCOMER NC2: the last step asks how the visitor would like
 * to start. `onFirstLook` (Take a first look) and `onChooseLab` (Choose a lab), when given, are its two choices; each ends the
 * tour like Start exploring (marked seen, the modal closed first) and hands over to the shell, which starts the first look or
 * shows the welcome's lab list. (LAUNCH-1's "Show tracking control" went with the observatory step.) */
export default function SiteTour({onClose,onFirstLook,onChooseLab}:{onClose:()=>void;onFirstLook?:()=>void;onChooseLab?:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),card=useRef<HTMLDivElement>(null),done=useRef(false),id=useId();
 const [index,setIndex]=useState(0),[box,setBox]=useState<Box|null>(null),[place,setPlace]=useState<Placement|null>(null);
 const steps=TOUR.steps,step=steps[index],last=index===steps.length-1;
 const measure=useCallback(()=>{
  const view=viewSize(),el=visibleTarget(step.targets),clip=el?clippedBox(el,view):null,b=clip?spotBox(clip,view):null,c=card.current;
  setBox(b);
  if(c)setPlace(placeTourCard(b,{width:c.offsetWidth,height:c.offsetHeight},view,uiDirection()));
 },[step]);
 // Open before the step effect below moves focus into the card (layout effects run in order).
 useLayoutEffect(()=>{const d=dialog.current;if(d&&!d.open)d.showModal();},[]);
 useLayoutEffect(()=>{
  // Scrolled with a margin, so the outline around the part is not cut off at the window's edge.
  // A class, not an inline style, so the part's own inline styles are left untouched (site-tour.css).
  const el=visibleTarget(step.targets);
  el?.classList.add('site-tour-scrolling');el?.scrollIntoView({block:'nearest',inline:'nearest'});
  // From 600 px up, a card that fits neither beside, below nor above the part would cover it (the last step's wide card around
  // the Exercise guides section of the menu at the top of an 800 × 600 page); the part is then scrolled to the top of the
  // window, so the card fits below it. On phones the card docks at the bottom by design.
  const c=card.current,view=viewSize(),clip=el&&c&&view.width>=600?clippedBox(el,view):null;
  if(el&&c&&clip&&placeTourCard(spotBox(clip,view),{width:c.offsetWidth,height:c.offsetHeight},view,uiDirection()).side==='bottom')
   el.scrollIntoView({block:'start',inline:'nearest'});
  el?.classList.remove('site-tour-scrolling');
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
 const finish=(next:()=>void=onClose)=>{if(done.current)return;done.current=true;markTourSeen();if(dialog.current?.open)dialog.current.close();next();};
 return createPortal(<dialog ref={dialog} className="site-tour" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} data-testid="site-tour" data-step={step.id}
  onCancel={e=>{e.preventDefault();finish();}} onClose={()=>finish()}>
  {box?<div className="site-tour-spot" data-testid="site-tour-spot" aria-hidden="true" style={{left:box.left,top:box.top,width:box.width,height:box.height}}/>
   :<div className="site-tour-dim" aria-hidden="true"/>}
  <div ref={card} className="site-tour-card" role="group" tabIndex={-1} aria-labelledby={`${id}-p ${id}-t`} aria-describedby={`${id}-d`} data-testid="site-tour-card"
   data-side={place?.side} style={place?{left:place.left,top:place.top}:{visibility:'hidden'}}>
   <p className="site-tour-progress" id={`${id}-p`}>{TOUR.progress(index+1,steps.length)}</p>
   <h2 id={`${id}-t`}>{step.title}</h2>
   <p id={`${id}-d`}>{step.text}</p>
   {/* Ids, not data-testids: the script walks name known layout problems by the nearest data-testid (tests/fixtures/rtlKnown.ts). */}
   {step.id==='start'&&(onFirstLook||onChooseLab)&&<div className="site-tour-choices">
    {onFirstLook&&<button type="button" className="primary-button" id="site-tour-first-look" onClick={()=>finish(onFirstLook)}>{TOUR.firstLook}</button>}
    {onChooseLab&&<button type="button" className="secondary-button" id="site-tour-choose-lab" onClick={()=>finish(onChooseLab)}>{TOUR.chooseLab}</button>}
   </div>}
   <div className="site-tour-actions">
    {!last&&<button type="button" className="text-button site-tour-skip" data-testid="site-tour-skip" onClick={()=>finish()}>{TOUR.skip}</button>}
    {index>0&&<button type="button" className="secondary-button" data-testid="site-tour-back" onClick={()=>setIndex(i=>i-1)}>{TOUR.back}</button>}
    {/* On the last step the two choices above carry the weight; Start exploring is its plain close. */}
    <button type="button" className={last&&(onFirstLook||onChooseLab)?'text-button':'primary-button'} data-testid="site-tour-next" onClick={last?()=>finish():()=>setIndex(i=>i+1)}>{last?TOUR.done:TOUR.next}</button>
   </div>
  </div>
 </dialog>,document.body);
}
