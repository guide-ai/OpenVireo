import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseReceiverMarkPosition,receiverMarkCode,receiverMarkColumn,receiverMarkMoveReleases} from './radioReceiverMarkInput';

// [W] WEB-MARK-DOMAIN/INPUT/KEYBOARD policy checks with plain numbers (docs/RADIO-RECEIVER-MARKS.md); no native mouse
// message, OS pointer or multitouch claim.
describe('pointer mapping',()=>{
 it('maps mouse buttons 0 → selected and 2 → second; primary touch/pen button 0 → selected; everything else is ignored',()=>{
  const p=(pointerType:string,button:number,isPrimary=true)=>({pointerType,button,isPrimary});
  expect(receiverMarkCode(p('mouse',0),0)).toBe(0);expect(receiverMarkCode(p('mouse',0),1)).toBe(1);
  expect(receiverMarkCode(p('mouse',2),0)).toBe(1);
  for(const b of [1,3,4])expect(receiverMarkCode(p('mouse',b),0)).toBeNull();
  expect(receiverMarkCode(p('touch',0),1)).toBe(1);expect(receiverMarkCode(p('touch',0,false),0)).toBeNull();
  expect(receiverMarkCode(p('pen',0),0)).toBe(0);expect(receiverMarkCode(p('pen',5),0)).toBeNull();expect(receiverMarkCode(p('',0),0)).toBeNull();
 });
 it('floor((clientX − left) · 401 / width): a press outside 0..400 is refused, a drag is clamped',()=>{
  expect(receiverMarkColumn(10,10,401,'press')).toBe(0);expect(receiverMarkColumn(410.99,10,401,'press')).toBe(400);
  expect(receiverMarkColumn(411,10,401,'press')).toBeNull();expect(receiverMarkColumn(411,10,401,'drag')).toBe(400);
  expect(receiverMarkColumn(9.5,10,401,'press')).toBeNull();expect(receiverMarkColumn(-500,10,401,'drag')).toBe(0);
  // A 300 px CSS width (320 px viewport): both edge pixels reach the logical ends.
  expect(receiverMarkColumn(20,20,300,'press')).toBe(0);expect(receiverMarkColumn(319.9,20,300,'press')).toBe(400);
  expect(receiverMarkColumn(170,20,300,'press')).toBe(200);
  for(const [x,l,w] of [[Number.NaN,0,401],[0,Infinity,401],[0,0,0],[0,0,-1]])expect(receiverMarkColumn(x,l,w,'drag')).toBeNull();
  expect(receiverMarkColumn(1e300,0,1e-300,'drag')).toBe(400);
 });
 it('treats a chorded pointermove of the lease button with its bit gone as the release',()=>{
  expect(receiverMarkMoveReleases(0,0,0)).toBe(true);expect(receiverMarkMoveReleases(0,0,2)).toBe(true);
  expect(receiverMarkMoveReleases(0,-1,1)).toBe(false);expect(receiverMarkMoveReleases(0,2,1)).toBe(false);
  expect(receiverMarkMoveReleases(2,2,0)).toBe(true);expect(receiverMarkMoveReleases(2,2,2)).toBe(false);expect(receiverMarkMoveReleases(2,0,0)).toBe(false);
 });
 it('admits 1..3 digits with a value 0..400 as a keyboard position',()=>{
  expect(['0','400','007','99'].map(parseReceiverMarkPosition)).toEqual([0,400,7,99]);
  expect(['','401','-1','1.5',' 1','1234','1e2','abc','４'].map(parseReceiverMarkPosition)).toEqual(new Array(9).fill(null));
 });
 it('imports no React, DOM, clock or random source',()=>{
  const text=readFileSync(new URL('./radioReceiverMarkInput.ts',import.meta.url),'utf8');
  expect([...text.matchAll(/from '([^']+)'/g)].map(m=>m[1]).sort()).toEqual(['./radioReceiverDisplay','./radioReceiverMarks']);
  expect(text).not.toMatch(/from 'react'|document\.|window\.|Math\.random|Date\.now|performance\.now/);
 });
});
