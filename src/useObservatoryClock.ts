import {useEffect,useRef,useState} from 'react';
import {advanceBrowserTelescopeMotion,prepareBrowserTelescopeMotion,TelescopeMotionError,motionIntervalMS,stopTelescopeMotion,type MotionDirection,type TelescopeMotion} from './core/telescopeMotion';
import type {FieldMode} from './core/sky';
import {CLOCK_DRIVE_MAX_GAP_MS,advanceClockDrive,createClockDrive,clockDrivePointing,repointClockDrive,toggleClockTracking,type ClockDriveWorkspace} from './core/clockDrive';
import type {Pointing} from './core/sky';
/** New browser lifecycle: monotonic 1:1 UT, no background catch-up, save/route/
 * visibility/site changes release the timer. Runtime anchors never enter JSON. */
export function useObservatoryClock(active:boolean,onPointing:(p:Pointing)=>void){
 const[state,setState]=useState<ClockDriveWorkspace|null>(null),[running,setRunning]=useState(false),[limited,setLimited]=useState(false);
 const [motion,setMotion]=useState<TelescopeMotion|null>(null),motor=useRef<TelescopeMotion|null>(null),motorAnchor=useRef(0),motorDelivered=useRef(0);
 const current=useRef(state),live=useRef(false),anchor=useRef(0),base=useRef(0),last=useRef(0),callback=useRef(onPointing);callback.current=onPointing;
 function publish(w:ClockDriveWorkspace|null){current.current=w;setState(w);if(w)callback.current(clockDrivePointing(w));}
 function finishMotor(limited=false){if(motor.current){const stopped=stopTelescopeMotion(motor.current,limited);motor.current=null;setMotion(stopped);}}
 function release(){live.current=false;setRunning(false);finishMotor();}
 function sample(now=performance.now()){
  if(!live.current||!current.current)return current.current;
  if(document.visibilityState==='hidden'){release();return current.current;}
  if(now<last.current||now-last.current>CLOCK_DRIVE_MAX_GAP_MS){finishMotor(true);release();setLimited(true);return current.current;}
  try{let next=advanceClockDrive(current.current,base.current+Math.floor(now-anchor.current));
   if(motor.current){const ticks=Math.floor((now-motorAnchor.current)/motionIntervalMS(motor.current)),m=advanceBrowserTelescopeMotion(motor.current,ticks-motorDelivered.current);motorDelivered.current=ticks;next=repointClockDrive(next,m.pointing);motor.current=m.phase==='moving'?m:null;setMotion(m);}
   last.current=now;publish(next);}catch(error){finishMotor(true);release();setLimited(!(error instanceof TelescopeMotionError));}return current.current;
 }
 function pauseAt(now:number){const w=sample(now);release();return w;}
 function pause(){return pauseAt(performance.now());}
 function replace(w:ClockDriveWorkspace|null){release();setLimited(false);publish(w);}
 function start(utc:string,pointing:Pointing){if(document.visibilityState==='hidden'){release();return false;}pause();const w=current.current??createClockDrive(utc,pointing);try{advanceClockDrive(w,w.elapsedMS);}catch{setLimited(true);return false;}publish(w);anchor.current=last.current=performance.now();base.current=w.elapsedMS;live.current=true;setRunning(true);setLimited(false);return true;}
 function toggle(utc:string,pointing:Pointing){const wasRunning=live.current,w=sample()??createClockDrive(utc,pointing),canResume=live.current;release();const next=toggleClockTracking(w);replace(next);if(wasRunning&&canResume)start(utc,clockDrivePointing(next));}
 function prepareTracked(utc:string,pointing:Pointing){const w=pause();replace(w?{...repointClockDrive(w,pointing),tracking:true}:{...createClockDrive(utc,pointing),tracking:true});}
 function beginMotion(kind:MotionDirection|Pointing,rateIndex:number,mode:FieldMode,utc:string,pointing:Pointing,onAccepted?:()=>void){
  if(motor.current)throw new Error('Motion busy');const now=performance.now(),sampled=sample(now),p=sampled?clockDrivePointing(sampled):pointing;
  const prepared=prepareBrowserTelescopeMotion(p,kind,mode,rateIndex);
  if(prepared.phase==='complete'){setMotion(prepared);return prepared;}
  if(document.visibilityState==='hidden')throw new Error('Clock hidden');const drive=sampled??createClockDrive(utc,p);advanceClockDrive(drive,drive.elapsedMS);
  // Validate against the sampled point before pausing/releasing confirmed work.
  pauseAt(now);onAccepted?.();if(!start(utc,p))throw new Error('Clock limit');motor.current=prepared;motorAnchor.current=performance.now();motorDelivered.current=0;setMotion(prepared);return prepared;
 }
 function stopMotion(){if(motor.current){sample();finishMotor();}}
 function safeForIntegration(){sample();return !motor.current&&live.current&&current.current?.tracking===true;}
 function repoint(pointing:Pointing){const w=pause();if(w)replace(repointClockDrive(w,pointing));}
 useEffect(()=>{if(!active)pause();},[active]);
 useEffect(()=>{if(!running)return;const timer=setInterval(()=>sample(),motion?.phase==='moving'?20:100);const hide=()=>{if(document.visibilityState==='hidden')pause();};document.addEventListener('visibilitychange',hide);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hide);};},[running,motion?.phase==='moving']);
 return {state,running,limited,pause,replace,start,toggle,repoint,prepareTracked,safeForIntegration,motion,moving:motion?.phase==='moving',beginMotion,stopMotion};
}
