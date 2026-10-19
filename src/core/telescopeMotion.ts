import proof from '../../data/observatory/telescope-motion-contract.json';
import {validatePointing,type FieldMode,type Pointing} from './sky';
export const TELESCOPE_MOTION_POLICY=proof.policy;
export const TELESCOPE_MOTION_SHA256='d28bdc96af0d9c67e2600a5a3dbed38d6b542875d9bc01582b4fb32052c670d6';
export type MotionDirection='N'|'S'|'E'|'W';
export type MotionPreferences=Readonly<{rateIndex:number}>;
export type TelescopeMotion=Readonly<{kind:'manual'|'programmed';phase:'moving'|'complete'|'stopped'|'limited';pointing:Pointing;mode:FieldMode;rateIndex:number;callbacks:number;flipped:boolean;direction:MotionDirection;target:Pointing|null;raDone:boolean;decDone:boolean;raStep:number;decStep:number}>;
export class TelescopeMotionError extends Error{constructor(readonly code:'input'|'precision'|'pole'){super(code);}}
const arc=proof.original.operands.find(v=>v.name==='arcsecDegrees')!.value,epsilon=proof.original.operands.find(v=>v.name==='initialRaToleranceHours')!.value;
const near=(value:number,boundary:number,scale=1)=>Math.abs(value-boundary)<=32*Number.EPSILON*Math.max(1,scale,Math.abs(value),Math.abs(boundary));
const freeze=(w:TelescopeMotion):TelescopeMotion=>Object.freeze({...w,pointing:Object.freeze(w.pointing),target:w.target&&Object.freeze(w.target)});
const wrap=(ra:number)=>{let r=ra-Math.trunc(ra/24)*24;if(r<0)r+=24;return r;};
export function readMotionPreferences(value:unknown):MotionPreferences{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!Object.hasOwn(value,'rateIndex'))throw new TelescopeMotionError('input');const rateIndex=(value as MotionPreferences).rateIndex;if(!Number.isInteger(rateIndex)||rateIndex<0||rateIndex>4||Object.is(rateIndex,-0))throw new TelescopeMotionError('input');return Object.freeze({rateIndex});}
export function manualMotionStep(mode:FieldMode,rateIndex:number){readMotionPreferences({rateIndex});if(mode!=='finder'&&mode!=='telescope')throw new TelescopeMotionError('input');return proof.native.baseRate*2**rateIndex*arc/proof.native.scale[mode];}
function initial(pointing:Pointing,mode:FieldMode,rateIndex:number):TelescopeMotion{const p=validatePointing(pointing.ra,pointing.dec);manualMotionStep(mode,rateIndex);return freeze({kind:'manual',phase:'moving',pointing:{...p},mode,rateIndex,callbacks:0,flipped:false,direction:'N',target:null,raDone:false,decDone:false,raStep:0,decStep:0});}
export function createManualMotion(pointing:Pointing,mode:FieldMode,rateIndex:number,direction:MotionDirection):TelescopeMotion{if(!['N','S','E','W'].includes(direction))throw new TelescopeMotionError('input');const w=initial(pointing,mode,rateIndex),delta=manualMotionStep(mode,rateIndex);return freeze({...w,direction,raStep:(direction==='E'?1:-1)*delta/15,decStep:(direction==='N'?1:-1)*delta});}
export function createProgrammedMotion(pointing:Pointing,target:Pointing,mode:FieldMode):TelescopeMotion{
 const w=initial(pointing,mode,proof.native.programRateIndex),p=validatePointing(target.ra,target.dec);if(p.ra===w.pointing.ra&&p.dec===w.pointing.dec)return freeze({...w,kind:'programmed',phase:'complete',target:{...p},raDone:true,decDone:true});let diff=p.ra-w.pointing.ra;
 // Withdraw comparisons that Number cannot separate safely. No epsilon arrival/snap is invented.
 const virtual=p.ra-diff,low=(p.ra-(diff+virtual))+(virtual-w.pointing.ra);
 if(diff!==0&&(near(Math.abs(diff),epsilon)||(near(Math.abs(diff),12)&&low!==0)))throw new TelescopeMotionError('precision');
 if(Math.abs(diff)>12)diff=-diff;const delta=manualMotionStep(mode,proof.native.programRateIndex)*10;
 return freeze({...w,kind:'programmed',target:{...p},direction:diff>0?'E':'W',raDone:Math.abs(diff)<=epsilon,raStep:Math.sign(diff)*delta/15,decStep:(w.pointing.dec<=p.dec?1:-1)*delta});
}
/** One original coordinate callback, independent of React, wall time, photon counts and RNG. */
export function tickTelescopeMotion(w:TelescopeMotion):TelescopeMotion{
 if(w.phase!=='moving')return w;
 if(w.kind==='programmed'&&w.raDone&&w.decDone)return freeze({...w,phase:'complete',callbacks:w.callbacks+1});
 let{ra,dec}=w.pointing,flipped=w.flipped,raDone=w.raDone,decDone=w.decDone;
 if(w.kind==='manual'){
  if(w.direction==='N'||w.direction==='S'){
   dec+=w.decStep*(flipped?-1:1);if(near(Math.abs(dec),90))throw new TelescopeMotionError('precision');
   if(Math.abs(dec)>90){dec=(dec>0?180:-180)-dec;ra+=12;flipped=!flipped;}
  }else ra+=w.raStep;
 }else{
  const target=w.target!;
  if(!decDone){const candidate=dec+w.decStep,margin=candidate-target.dec;if(near(margin,0,Math.abs(dec)))throw new TelescopeMotionError('precision');if(w.decStep>0?margin>=0:margin<=0){dec=target.dec;decDone=true;}else dec=candidate;}
  if(!raDone){const candidate=ra+w.raStep,cross=w.raStep>0?candidate-target.ra:target.ra-candidate;if(near(cross,0,Math.max(Math.abs(candidate),Math.abs(target.ra)))||near(cross,12))throw new TelescopeMotionError('precision');if(cross>=0&&cross<12){ra=target.ra;raDone=true;}else ra=candidate;}
 }
 return freeze({...w,pointing:{ra:wrap(ra),dec},flipped,raDone,decDone,callbacks:w.callbacks+1});
}
/** Atomic browser batches. A rejected comparison leaves the input state untouched. */
export function advanceTelescopeMotion(w:TelescopeMotion,callbacks:number):TelescopeMotion{if(!Number.isInteger(callbacks)||callbacks<0||callbacks>proof.browser.maximumBatchCallbacks)throw new TelescopeMotionError('input');let next=w;for(let i=0;i<callbacks&&next.phase==='moving';i++)next=tickTelescopeMotion(next);return next;}
export const motionIntervalMS=(w:TelescopeMotion)=>w.kind==='manual'?proof.native.manualIntervalMS:proof.native.programIntervalMS;
export const stopTelescopeMotion=(w:TelescopeMotion,limited=false)=>freeze({...w,phase:limited?'limited':w.phase==='complete'?'complete':'stopped'});
