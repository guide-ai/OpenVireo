import {describe,it,expect} from 'vitest';
import {MANUAL_EXTERNAL_CANCELS,MANUAL_HOLD_KEYS,manualInputStep,type ManualInputEffect,type ManualInputEvent,type ManualInputOwner} from './radioManualInput';

// WEB-MANUAL-01/02: browser input ownership for the manual hold. Web policy, not recovered behavior (natively MouseUp
// releases only inside the button's Width/Height and any direction's MouseUp releases; see radioManualInput.ts).
const run=(events:readonly ManualInputEvent[],start:ManualInputOwner|null=null)=>{
 let owner=start;const effects:ManualInputEffect[]=[];
 for(const e of events){const step=manualInputStep(owner,e);owner=step.owner;effects.push(step.effect);}
 return {owner,effects};
};
const down=(pointerId:number,direction:'north'|'south'|'east'|'west'='north',button=0):ManualInputEvent=>({type:'pointer-down',pointerId,button,direction});
const NONE={kind:'none'};

describe('WEB-MANUAL-01 pointer ownership',()=>{
 it('a primary pointer-down takes ownership; its pointer-up anywhere releases; a later pointer-up does nothing',()=>{
  const r=run([down(7,'east'),{type:'pointer-up',pointerId:7},{type:'pointer-up',pointerId:7}]);
  expect(r.effects).toEqual([{kind:'press',direction:'east'},{kind:'release'},NONE]);expect(r.owner).toBeNull();
 });
 it('ignores secondary buttons, a second finger (multitouch) and other pointers’ releases and cancels',()=>{
  expect(run([down(1,'north',2)]).effects).toEqual([NONE]);
  const r=run([down(1,'north'),down(2,'south'),{type:'pointer-up',pointerId:2},{type:'pointer-cancel',pointerId:2}]);
  expect(r.effects).toEqual([{kind:'press',direction:'north'},NONE,NONE,NONE]);expect(r.owner).toEqual({kind:'pointer',pointerId:1,direction:'north'});
 });
 it('pointer-cancel or lost capture of the owner cancels; focus loss does not end a pointer owner',()=>{
  expect(run([down(3),{type:'pointer-cancel',pointerId:3}]).effects[1]).toEqual({kind:'cancel',reason:'pointer-cancel'});
  const kept=run([down(3),{type:'focus-lost',direction:'north'}]);expect(kept.effects[1]).toEqual(NONE);expect(kept.owner).not.toBeNull();
 });
 it('keys do nothing while a pointer owns the hold, and a pointer does nothing while a key owns it',()=>{
  expect(run([down(1),{type:'key-down',key:' ',repeat:false,direction:'south'},{type:'key-up',key:' '}]).effects.slice(1)).toEqual([NONE,NONE]);
  expect(run([{type:'key-down',key:'Enter',repeat:false,direction:'south'},down(1,'north'),{type:'pointer-up',pointerId:1}]).effects.slice(1)).toEqual([NONE,NONE]);
 });
});

describe('WEB-MANUAL-01 chorded mouse release',()=>{
 // Pointer Events chorded buttons: left released while right stays down is a pointermove (button 0, buttons 2).
 const move=(pointerId:number,button:number,buttons:number):ManualInputEvent=>({type:'pointer-move',pointerId,button,buttons});
 it('the owner’s move with button 0 and bit 0 of buttons clear releases; its later pointer-up and cancel do nothing',()=>{
  const r=run([down(1),move(1,0,2),{type:'pointer-up',pointerId:1},{type:'pointer-cancel',pointerId:1}]);
  expect(r.effects).toEqual([{kind:'press',direction:'north'},{kind:'release'},NONE,NONE]);expect(r.owner).toBeNull();
 });
 it('drags, a chorded press, no button change, another pointer and a non-integer buttons value do nothing',()=>{
  for(const e of [move(1,-1,1),move(1,2,3),move(1,-1,0),move(2,0,0),move(1,0,Number.NaN),move(1,0,0.5)]){
   const r=run([down(1),e]);expect(r.effects[1]).toEqual(NONE);expect(r.owner).toEqual({kind:'pointer',pointerId:1,direction:'north'});
  }
 });
 it('a move does nothing with a key owner or without an owner',()=>{
  const k=run([{type:'key-down',key:' ',repeat:false,direction:'east'},move(1,0,0)]);expect(k.effects[1]).toEqual(NONE);expect(k.owner).not.toBeNull();
  expect(run([move(1,0,0),move(1,0,2)]).effects).toEqual([NONE,NONE]);
 });
 it('the release step is frozen',()=>{
  const step=manualInputStep(manualInputStep(null,down(1)).owner,move(1,0,2));
  expect(Object.isFrozen(step)&&Object.isFrozen(step.effect)).toBe(true);expect(step.owner).toBeNull();
 });
 it('a left press during the chord (a move with bit 0 set) starts no hold; only a fresh pointer-down presses again',()=>{
  const r=run([down(1),move(1,0,2),move(1,0,3),move(1,0,2),down(1,'south')]);
  expect(r.effects).toEqual([{kind:'press',direction:'north'},{kind:'release'},NONE,NONE,{kind:'press',direction:'south'}]);
 });
});

describe('WEB-MANUAL-02 Space/Enter on the focused button',()=>{
 it('Space or Enter press; auto-repeat is ignored; key-up of that key releases',()=>{
  expect(MANUAL_HOLD_KEYS).toEqual([' ','Enter']);
  for(const key of MANUAL_HOLD_KEYS){
   const r=run([{type:'key-down',key,repeat:false,direction:'west'},{type:'key-down',key,repeat:true,direction:'west'},{type:'key-up',key}]);
   expect(r.effects).toEqual([{kind:'press',direction:'west'},NONE,{kind:'release'}]);expect(r.owner).toBeNull();
  }
 });
 it('a repeat without an owner, other keys (letters of the native table, arrows) and the other hold key do nothing',()=>{
  expect(run([{type:'key-down',key:' ',repeat:true,direction:'north'}]).effects).toEqual([NONE]);
  for(const key of ['n','N','8','ArrowUp','e'])expect(run([{type:'key-down',key,repeat:false,direction:'north'}]).effects).toEqual([NONE]);
  const r=run([{type:'key-down',key:' ',repeat:false,direction:'north'},{type:'key-up',key:'Enter'}]);expect(r.effects[1]).toEqual(NONE);expect(r.owner).not.toBeNull();
 });
 it('focus loss of the key owner’s button cancels; focus loss of another button does not',()=>{
  const start={type:'key-down',key:' ',repeat:false,direction:'north'} as const;
  expect(run([start,{type:'focus-lost',direction:'south'}]).effects[1]).toEqual(NONE);
  const r=run([start,{type:'focus-lost',direction:'north'},{type:'key-up',key:' '}]);
  expect(r.effects.slice(1)).toEqual([{kind:'cancel',reason:'focus-lost'},NONE]);expect(r.owner).toBeNull();
 });
});

describe('WEB-MANUAL-01 external cancellation never resumes',()=>{
 it('every external reason ends a pointer or key owner; without an owner it does nothing',()=>{
  expect(MANUAL_EXTERNAL_CANCELS).toEqual(['window-blur','page-hidden','route-inactive','host-busy','modal','panel-closed','unmount']);
  for(const reason of MANUAL_EXTERNAL_CANCELS){
   for(const start of [down(1),{type:'key-down',key:'Enter',repeat:false,direction:'east'} as const]){
    const r=run([start,{type:'cancel',reason}]);expect(r.effects[1]).toEqual({kind:'cancel',reason});expect(r.owner).toBeNull();
   }
   expect(run([{type:'cancel',reason}]).effects).toEqual([NONE]);
  }
 });
 it('after a cancel the still-held mouse or key releases nothing; only a fresh press starts again',()=>{
  const r=run([down(1),{type:'cancel',reason:'window-blur'},{type:'pointer-up',pointerId:1},{type:'pointer-down',pointerId:1,button:0,direction:'south'},{type:'pointer-up',pointerId:1}]);
  expect(r.effects).toEqual([{kind:'press',direction:'north'},{kind:'cancel',reason:'window-blur'},NONE,{kind:'press',direction:'south'},{kind:'release'}]);
  const k=run([{type:'key-down',key:' ',repeat:false,direction:'north'},{type:'cancel',reason:'host-busy'},{type:'key-down',key:' ',repeat:true,direction:'north'},{type:'key-up',key:' '}]);
  expect(k.effects.slice(2)).toEqual([NONE,NONE]);
 });
 it('owners and effects are frozen; an unknown direction or reason is ignored',()=>{
  const step=manualInputStep(null,down(1));expect(Object.isFrozen(step)&&Object.isFrozen(step.owner)&&Object.isFrozen(step.effect)).toBe(true);
  expect(manualInputStep(null,{type:'pointer-down',pointerId:1,button:0,direction:'up' as 'north'}).effect).toEqual(NONE);
  expect(manualInputStep(step.owner,{type:'cancel',reason:'other' as 'modal'}).effect).toEqual(NONE);
 });
});

// WEB-KEY-03: ownership of an RA-19 table-key hold (decoded by radioKeyboard.ts). The cross release follows the native
// KeyUp (any table key runs its own button's MouseUp); the physical-code fallback, repeat, scope and owner isolation are
// web policies.
describe('WEB-KEY-03 RA-19 table-key ownership',()=>{
 type D='north'|'south'|'east'|'west';
 const tdown=(code:string,direction:D,repeat=false):ManualInputEvent=>({type:'table-key-down',code,repeat,direction});
 const tup=(code:string,direction:D|null):ManualInputEvent=>({type:'table-key-up',code,direction});
 const table=(code:string,direction:D)=>({kind:'table',code,direction});
 it('a fresh table key-down presses; repeats and a second key while owned do nothing; its own key-up releases through its direction',()=>{
  const r=run([tdown('KeyN','north'),tdown('KeyN','north',true),tdown('KeyS','south'),tup('KeyN','north')]);
  expect(r.effects).toEqual([{kind:'press',direction:'north'},NONE,NONE,{kind:'release',via:'north'}]);expect(r.owner).toBeNull();
  expect(run([tdown('KeyN','north',true)]).effects).toEqual([NONE]);// a repeat never starts a hold (web policy)
 });
 it('cross release: another table key-up releases through that key’s direction (the native KeyUp has no held check)',()=>{
  for(const [code,via] of [['KeyS','south'],['Numpad4','east'],['KeyW','west']] as const){
   const r=run([tdown('KeyN','north'),tup(code,via),tup('KeyN','north')]);
   expect(r.effects).toEqual([{kind:'press',direction:'north'},{kind:'release',via},NONE]);expect(r.owner).toBeNull();// the later own key-up does nothing
  }
 });
 it('the owner’s physical key releases even when its mapping changed; unrelated unmapped key-ups are kept',()=>{
  const fallback=run([tdown('Numpad8','north'),tup('Numpad8',null)]);// e.g. NumLock turned off before the release
  expect(fallback.effects[1]).toEqual({kind:'release'});expect(fallback.owner).toBeNull();
  for(const code of ['F4','F8','Numpad5','Digit8','ArrowUp','ShiftLeft']){
   const r=run([tdown('KeyN','north'),tup(code,null)]);expect(r.effects[1],code).toEqual(NONE);expect(r.owner).toEqual(table('KeyN','north'));
  }
 });
 it('scope leaving cancels only a table owner; focus loss of a direction does not; external cancels end it without resume',()=>{
  const left=run([tdown('KeyE','east'),{type:'key-scope-left'},tup('KeyE','east'),tdown('KeyE','east',true)]);
  expect(left.effects.slice(1)).toEqual([{kind:'cancel',reason:'key-scope-left'},NONE,NONE]);expect(left.owner).toBeNull();
  expect(run([tdown('KeyE','east'),{type:'focus-lost',direction:'east'}]).owner).toEqual(table('KeyE','east'));
  expect(run([down(1),{type:'key-scope-left'}]).effects[1]).toEqual(NONE);
  expect(run([{type:'key-down',key:' ',repeat:false,direction:'north'},{type:'key-scope-left'}]).effects[1]).toEqual(NONE);
  expect(run([{type:'key-scope-left'}]).effects).toEqual([NONE]);
  for(const reason of MANUAL_EXTERNAL_CANCELS){
   const r=run([tdown('KeyW','west'),{type:'cancel',reason},tup('KeyW','west'),tdown('KeyW','west')]);
   expect(r.effects.slice(1)).toEqual([{kind:'cancel',reason},NONE,{kind:'press',direction:'west'}]);// late key-up harmless, fresh press works
   // No quarantine: under a fresh table-key hold the late key-up of the cancelled key is a cross release.
   const late=run([tdown('KeyW','west'),{type:'cancel',reason},tdown('KeyN','north'),tup('KeyW','west')]);
   expect(late.effects.slice(1)).toEqual([{kind:'cancel',reason},{kind:'press',direction:'north'},{kind:'release',via:'west'}]);expect(late.owner).toBeNull();
  }
 });
 it('owner isolation: pointer and Space/Enter owners ignore table events; a table owner ignores pointer and Space/Enter',()=>{
  const p=run([down(1),tdown('KeyS','south'),tup('KeyS','south'),{type:'key-scope-left'}]);
  expect(p.effects.slice(1)).toEqual([NONE,NONE,NONE]);expect(p.owner).toEqual({kind:'pointer',pointerId:1,direction:'north'});
  const s=run([{type:'key-down',key:' ',repeat:false,direction:'north'},tdown('KeyN','north'),tup('KeyS','south')]);
  expect(s.effects.slice(1)).toEqual([NONE,NONE]);expect(s.owner).toEqual({kind:'key',key:' ',direction:'north'});
  const t=run([tdown('KeyN','north'),down(2,'south'),{type:'pointer-up',pointerId:2},{type:'key-down',key:' ',repeat:false,direction:'north'},{type:'key-up',key:' '},{type:'pointer-move',pointerId:2,button:0,buttons:0}]);
  expect(t.effects.slice(1)).toEqual([NONE,NONE,NONE,NONE,NONE]);expect(t.owner).toEqual(table('KeyN','north'));
 });
 it('invalid shapes change nothing; steps are frozen',()=>{
  for(const e of [tdown('','north'),tdown('x'.repeat(65),'north'),{...tdown('KeyN','north'),direction:'up'},{...tdown('KeyN','north'),repeat:'no'},{...tdown('KeyN','north'),code:7}] as ManualInputEvent[])
   expect(manualInputStep(null,e).effect).toEqual(NONE);
  const owner=manualInputStep(null,tdown('KeyN','north')).owner;
  for(const e of [tup('','south'),{...tup('KeyS','south'),direction:'up'},{...tup('KeyN',null),code:null}] as ManualInputEvent[]){
   const step=manualInputStep(owner,e);expect(step.effect).toEqual(NONE);expect(step.owner).toBe(owner);
  }
  const step=manualInputStep(owner,tup('KeyS','south'));
  expect(Object.isFrozen(step)&&Object.isFrozen(step.effect)&&Object.isFrozen(owner)).toBe(true);
 });
});
