import {useEffect,useRef,useState} from 'react';
import {CLOCK_DRIVE_MAX_GAP_MS,advanceClockDrive,createClockDrive,clockDrivePointing,repointClockDrive,toggleClockTracking,type ClockDriveWorkspace} from './core/clockDrive';
import type {Pointing} from './core/sky';
/** New browser lifecycle: monotonic 1:1 UT, no background catch-up, save/route/
 * visibility/site changes release the timer. Runtime anchors never enter JSON. */
export function useObservatoryClock(active:boolean,onPointing:(p:Pointing)=>void){
 const[state,setState]=useState<ClockDriveWorkspace|null>(null),[running,setRunning]=useState(false),[limited,setLimited]=useState(false);
 const current=useRef(state),live=useRef(false),anchor=useRef(0),base=useRef(0),last=useRef(0),callback=useRef(onPointing);callback.current=onPointing;
 function publish(w:ClockDriveWorkspace|null){current.current=w;setState(w);if(w)callback.current(clockDrivePointing(w));}
 function release(){live.current=false;setRunning(false);}
 function sample(now=performance.now()){
  if(!live.current||!current.current)return current.current;
  if(document.visibilityState==='hidden'){release();return current.current;}
  if(now<last.current||now-last.current>CLOCK_DRIVE_MAX_GAP_MS){release();setLimited(true);return current.current;}
  try{const next=advanceClockDrive(current.current,base.current+Math.floor(now-anchor.current));last.current=now;publish(next);}catch{release();setLimited(true);}return current.current;
 }
 function pause(){const w=sample();release();return w;}
 function replace(w:ClockDriveWorkspace|null){release();setLimited(false);publish(w);}
 function start(utc:string,pointing:Pointing){if(document.visibilityState==='hidden'){release();return false;}pause();const w=current.current??createClockDrive(utc,pointing);try{advanceClockDrive(w,w.elapsedMS);}catch{setLimited(true);return false;}publish(w);anchor.current=last.current=performance.now();base.current=w.elapsedMS;live.current=true;setRunning(true);setLimited(false);return true;}
 function toggle(utc:string,pointing:Pointing){const wasRunning=live.current,w=sample()??createClockDrive(utc,pointing),canResume=live.current;release();const next=toggleClockTracking(w);replace(next);if(wasRunning&&canResume)start(utc,clockDrivePointing(next));}
 function prepareTracked(utc:string,pointing:Pointing){const w=pause();replace(w?{...repointClockDrive(w,pointing),tracking:true}:{...createClockDrive(utc,pointing),tracking:true});}
 function safeForIntegration(){sample();return live.current&&current.current?.tracking===true;}
 function repoint(pointing:Pointing){const w=pause();if(w)replace(repointClockDrive(w,pointing));}
 useEffect(()=>{if(!active)pause();},[active]);
 useEffect(()=>{if(!running)return;const timer=setInterval(()=>sample(),100);const hide=()=>{if(document.visibilityState==='hidden')pause();};document.addEventListener('visibilitychange',hide);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hide);};},[running]);
 return {state,running,limited,pause,replace,start,toggle,repoint,prepareTracked,safeForIntegration};
}
