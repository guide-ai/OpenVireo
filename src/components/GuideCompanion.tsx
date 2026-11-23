import {memo,useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {companionNow,type CompanionProgress} from '../core/guideCompanion';
import {guideTargets} from '../help/guideTargets';
import {clippedBox,focusGuideTarget,viewSize,waitForGuideTarget} from '../help/spot';
import {spotBox,type Box} from '../help/tourPlacement';
import {sameData} from '../renderStability';
import {APP_SHELL_MESSAGES as SHELL} from './AppShellMessages';
import {companionContent} from './guideCompanionContent';
import './guide-companion.css';

/** How long Show me where waits for the step's control (a page that is still loading). */
export const SHOW_WAIT_MS=4000;
/** How long the outline stays when nothing else clears it. */
export const SPOT_MS=6000;

/** Front GUIDE-COMPANION [W] (user decision, 2026-11-23): the strip that keeps the current step of the guide in use on screen
 * after its window is closed, at the bottom of every page. It shows the guide's own "Next:" line (core/guideCompanion.ts over
 * the guide's progress, recomputed on every render, so it moves on by itself as the student works) and four actions: Show me
 * where goes to the step's page (`onGo`, the guide's own destination), then scrolls to the step's control, focuses it and
 * outlines it without dimming or blocking the page; Step details shows what the guide says under the step; Full guide opens
 * the guide's window again; Hide removes the strip until a guide is opened again. Nothing is stored and nothing is judged: no
 * answer, expected value or grade appears here that the guide does not show. Its text is the guides' and the shell's, so it is
 * shell text for the translation walks (`data-i18n-shell`); tests/guide-companion.spec.ts covers it. The strip is inert while
 * a host-level modal is open or the investigation is busy, and not shown while a guide's window is open (guide-companion.css).
 * Its height, written to `--ov-companion-height` on <html> by a ResizeObserver (no React render), keeps the end of the page
 * and focused controls clear of it (WCAG 2.4.11). */
function GuideCompanion({progress,inert,onGo,onFull,onHide}:{progress:CompanionProgress;inert:boolean;
 /** Goes to the page of the current step (the shell's own guide destinations); a stable callback. */onGo:()=>void;
 /** Opens the guide's window again; a stable callback. */onFull:()=>void;/** Removes the strip; a stable callback. */onHide:()=>void}){
 const C=SHELL.companion,now=companionNow(progress),content=companionContent(progress),selectors=guideTargets(now.lab,content.target);
 const [details,setDetails]=useState(false),[missing,setMissing]=useState(false),[spot,setSpot]=useState<Element|null>(null),[box,setBox]=useState<Box|null>(null);
 const strip=useRef<HTMLElement>(null),run=useRef(0),lost=useRef(false),id=useId(),step=`${now.lab}/${content.target}`;
 // A new step (or another guide) ends a search in progress, its outline and its note. When Show me where had moved the focus
 // to a control that the page then disabled or removed (the step it belonged to is done), the focus is nowhere: it comes back
 // to the strip, which now shows the next step.
 useEffect(()=>{
  setMissing(false);setSpot(null);
  if(lost.current&&document.activeElement===document.body)strip.current?.querySelector<HTMLElement>('button')?.focus({preventScroll:true});
  lost.current=false;
  return()=>{run.current++;};
 },[step]);
 useEffect(()=>{
  const el=strip.current,root=document.documentElement;
  if(!el||typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(()=>root.style.setProperty('--ov-companion-height',`${Math.ceil(el.getBoundingClientRect().height)}px`));
  observer.observe(el);
  return()=>{observer.disconnect();root.style.removeProperty('--ov-companion-height');};
 },[]);
 // The outline follows its control while the page scrolls or changes size, and goes at the student's next press or key, or
 // after SPOT_MS: it points, it never stays in the way.
 useEffect(()=>{
  if(!spot){setBox(null);return;}
  let frame=0;
  const measure=()=>{const view=viewSize(),clip=spot.isConnected?clippedBox(spot,view):null,next=clip?spotBox(clip,view):null;setBox(old=>sameData(old,next)?old:next);};
  const again=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);},clear=()=>setSpot(null);
  measure();
  // The page can still move under the outline without a scroll (a part that finishes loading above the control).
  const timer=window.setTimeout(clear,SPOT_MS),settle=window.setInterval(measure,250);
  window.addEventListener('resize',again);window.addEventListener('scroll',again,true);
  window.addEventListener('pointerdown',clear,true);window.addEventListener('keydown',clear,true);
  return()=>{cancelAnimationFrame(frame);window.clearTimeout(timer);window.clearInterval(settle);window.removeEventListener('resize',again);window.removeEventListener('scroll',again,true);
   window.removeEventListener('pointerdown',clear,true);window.removeEventListener('keydown',clear,true);};
 },[spot]);
 function show(){
  const token=++run.current;setMissing(false);setSpot(null);onGo();
  // After this click: React has then rendered the navigation, so the destination page is shown (or has started to load). A
  // timer, not an animation frame, so it also runs while the tab is not being painted.
  window.setTimeout(()=>{void waitForGuideTarget(selectors,SHOW_WAIT_MS,()=>run.current!==token).then(el=>{
   if(run.current!==token)return;
   if(!el){setMissing(true);return;}
   // One more turn: a page that has just been shown focuses its own heading in an effect of that render (and scrolls to it);
   // the step's control takes the scroll and the focus after that.
   window.setTimeout(()=>{
    if(run.current!==token)return;
    if(!el.isConnected){setMissing(true);return;}
    el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});focusGuideTarget(el);setSpot(el);
    // Whether that focus is later lost to nowhere (the page disabled or removed the control), read when the step changes.
    const focused=document.activeElement;lost.current=false;
    if(focused&&focused!==document.body)focused.addEventListener('focusout',()=>{window.setTimeout(()=>{lost.current=document.activeElement===document.body;},0);},{once:true});
   },0);
  });},0);
 }
 return <aside ref={strip} className="guide-companion" aria-label={C.label} inert={inert} data-testid="guide-companion" data-lab={now.lab} data-step={now.step} data-all-done={now.allDone||undefined} data-i18n-shell="">
  {details&&<div className="guide-companion-details" id={`${id}-d`} role="group" aria-label={C.details} data-testid="guide-companion-details">{content.details}</div>}
  <div className="guide-companion-row">
   <div className="guide-companion-text">
    <p className="guide-companion-place"><strong data-testid="guide-companion-lab">{content.name}</strong>{!content.closing&&<>{' '}<span data-testid="guide-companion-step">{C.stepOf(now.index,now.total)}</span></>}</p>
    <p className="guide-companion-next" role="status" data-testid="guide-companion-next">{content.line}</p>
    <p className="guide-companion-missing" role="status" data-testid="guide-companion-missing">{missing?C.notYet:''}</p>
   </div>
   <div className="guide-companion-actions" role="group" aria-label={C.actions}>
    {selectors.length>0&&<button type="button" className="primary-button" data-testid="guide-companion-show" onClick={show}>{C.show}</button>}
    <button type="button" className="secondary-button" aria-expanded={details} aria-controls={details?`${id}-d`:undefined} data-testid="guide-companion-details-toggle" onClick={()=>setDetails(v=>!v)}>{C.details}</button>
    <button type="button" className="secondary-button" data-testid="guide-companion-full" onClick={onFull}>{C.full}</button>
    <button type="button" className="text-button" aria-label={C.hideName} data-testid="guide-companion-hide" onClick={onHide}>{C.hide}</button>
   </div>
  </div>
  {box&&createPortal(<div className="guide-companion-spot" data-testid="guide-companion-spot" aria-hidden="true" style={{left:box.left,top:box.top,width:box.width,height:box.height}}/>,document.body)}
 </aside>;
}
// The strip renders again only when the guide's progress (plain data), the modal state or a handler changes.
export default memo(GuideCompanion,(a,b)=>a.inert===b.inert&&a.onGo===b.onGo&&a.onFull===b.onFull&&a.onHide===b.onHide&&sameData(a.progress,b.progress));
