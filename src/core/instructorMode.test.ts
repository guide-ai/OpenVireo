import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {INITIAL_INSTRUCTOR_GATE,INSTRUCTOR_ONLY_COMPILED,applyEditModeGate,enterInstructorMode,leaveInstructorMode,preferencesGate,type InstructorGate} from './instructorMode';
import {INITIAL_RADIO_ACCESS,followPageGate,openPreferences} from './radioAccessOptions';
import {OPTIONS_RESET_DEFAULTS} from './opticalOptions';
import {TEACHER_DEFERRED} from './teacherDeferred';

// Front T1 contracts (analysis/front-plans/front-teacher.md §4.4). CLEA_VEO.exe 781bc970…c54c, static only: env+0x37d8 starts
// closed (0x587c2d), Preferences tests it at 0x5886c9; the instructor switch stands in for the Demonstration branch (0x587c6a).
// Synthetic sequences: evidence of the chosen web contract, not an oracle for the original.
describe('T1 instructor-mode gate',()=>{
 it('starts closed: Preferences shows the USER OPTIONS! box',()=>{
  expect(INITIAL_INSTRUCTOR_GATE).toEqual({open:false,source:'closed'});expect(Object.isFrozen(INITIAL_INSTRUCTOR_GATE)).toBe(true);
  expect(preferencesGate(INITIAL_INSTRUCTOR_GATE)).toBe('user-options-box');
 });
 it('enter opens the options; entering again changes nothing',()=>{
  const r=enterInstructorMode(INITIAL_INSTRUCTOR_GATE);
  expect(r).toMatchObject({outcome:'gate-opened',changed:true});expect(r.state).toEqual({open:true,source:'instructor-switch'});
  expect(Object.isFrozen(r)&&Object.isFrozen(r.state)).toBe(true);
  expect(preferencesGate(r.state)).toBe('options');
  const again=enterInstructorMode(r.state);expect(again).toMatchObject({outcome:'gate-already-open',changed:false});expect(again.state).toBe(r.state);
 });
 it('Edit Mode on opens the gate (0x5887f0 / 0x587f70, moved from the radio card); Edit Mode off writes nothing',()=>{
  const r=applyEditModeGate(INITIAL_INSTRUCTOR_GATE,true);
  expect(r).toMatchObject({outcome:'gate-opened',changed:true});expect(r.state).toEqual({open:true,source:'edit-mode'});
  expect(applyEditModeGate(r.state,true)).toMatchObject({outcome:'gate-already-open',changed:false});
  expect(applyEditModeGate(INITIAL_INSTRUCTOR_GATE,false)).toMatchObject({outcome:'edit-mode-off',changed:false});
  expect(applyEditModeGate(r.state,false).state).toBe(r.state);
  const on=enterInstructorMode(INITIAL_INSTRUCTOR_GATE).state;expect(applyEditModeGate(on,true).state).toBe(on);
  expect(()=>applyEditModeGate(INITIAL_INSTRUCTOR_GATE,1 as never)).toThrow(TypeError);
 });
 it('leave closes the gate and resets Edit Mode and Virtual Observatory to their compiled values',()=>{
  for(const open of [enterInstructorMode(INITIAL_INSTRUCTOR_GATE).state,applyEditModeGate(INITIAL_INSTRUCTOR_GATE,true).state]){
   const l=leaveInstructorMode(open);
   expect(l).toMatchObject({outcome:'gate-closed',changed:true});expect(l.state).toEqual(INITIAL_INSTRUCTOR_GATE);
   expect(l.reset).toEqual({editMode:false,virtualObservatory:false});
   expect(preferencesGate(l.state)).toBe('user-options-box');
  }
  const idle=leaveInstructorMode(INITIAL_INSTRUCTOR_GATE);expect(idle).toMatchObject({outcome:'gate-already-closed',changed:false});expect(idle.state).toBe(INITIAL_INSTRUCTOR_GATE);
  // The same compiled values as the options Reset (0x5a21d0: EditModeBox 0x5a2ad3, VObsBox 0x5a2b59).
  expect(INSTRUCTOR_ONLY_COMPILED).toEqual({editMode:OPTIONS_RESET_DEFAULTS.editMode,virtualObservatory:OPTIONS_RESET_DEFAULTS.virtualObservatory});
  // The invariant "Edit Mode on ⇒ gate open" holds after leaving: the reset turns Edit Mode off, so re-applying writes nothing.
  const l=leaveInstructorMode(enterInstructorMode(INITIAL_INSTRUCTOR_GATE).state);
  expect(applyEditModeGate(l.state,l.reset.editMode).state.open).toBe(false);
 });
 it('the radio card follows the page gate: one gate for the optical options and the radio Preferences',()=>{
  const steps:readonly ((g:InstructorGate)=>InstructorGate)[]=[g=>enterInstructorMode(g).state,g=>leaveInstructorMode(g).state,g=>applyEditModeGate(g,true).state,g=>leaveInstructorMode(g).state];
  let page=INITIAL_INSTRUCTOR_GATE,radio=INITIAL_RADIO_ACCESS;
  expect(openPreferences(radio,null).outcome).toBe('user-options-shown');
  for(const step of steps){
   page=step(page);radio=followPageGate(radio,page).state;
   expect(radio.gate.open).toBe(page.open);
   expect(openPreferences(radio,null).outcome).toBe(preferencesGate(page)==='options'?'preferences-opened':'user-options-shown');
  }
 });
 it('keeps the deferred list typed, without the strict-VO item and with the password typed as not ported',()=>{
  const keys=TEACHER_DEFERRED.map(d=>d.key);
  expect(keys).not.toContain('virtual-observatory-strict');
  for(const k of ['cluster-edit','cluster-save-list','auto-plot','asteroid-subset','password','test-mode'])expect(keys).toContain(k);
  expect(TEACHER_DEFERRED.find(d=>d.key==='password')?.reason).toBe('compiled-password-not-ported');
 });
 it('is pure and session-only: no React, storage, clock, network or password handling',()=>{
  const source=readFileSync(new URL('./instructorMode.ts',import.meta.url),'utf8');
  expect([...source.matchAll(/^import\b[\s\S]*?from\s*'([^']+)';/gm)].map(m=>m[1])).toEqual(['./editMode','./observatoryMenuLiterals']);
  expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|fetch\(|Date\.now|new Date|document\.|window\./);
 });
});
