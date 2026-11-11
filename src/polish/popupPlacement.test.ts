import {describe,expect,it} from 'vitest';
import {FIRST_WIDTH,firstLeft,fit,keyboardAnchor,shiftX} from './popupPlacement';

// Front RT6 (plan analysis/front-plans/front-i18n-rtl.md § 0.1 "JS geometry", the RT6 row of § 9): the popup menu opens from the
// pointer toward the inline end. Left to right every value is the one PopupMenu.tsx computed before (Front SC3).
const before={
 first:(x:number,w:number)=>Math.max(4,Math.min(x,w-224)),
 fit:(lo:number,hi:number,size:number)=>lo<0||hi>size?Math.max(Math.min(0,size-4-hi),4-lo):0,
};
describe('popup menu placement',()=>{
 it('left to right: the same first placement, keyboard corner and shift as before RT6',()=>{
  expect(FIRST_WIDTH).toBe(224);
  for(const view of [320,375,1440])for(const x of [0,3,4,50,96,100.5,160,300,319,700,1200,1439])expect(firstLeft(x,view,'ltr'),`${x}/${view}`).toBe(before.first(x,view));
  expect(keyboardAnchor({left:30,right:330,top:100},'ltr')).toEqual({x:38,y:108});
  for(const [l,r] of [[10,234],[-20,204],[200,424.75],[1300,1524],[4,228],[0.1,300.3]] as const)
   for(const view of [320,1440])expect(shiftX(l,r,l,view,'ltr'),`${l},${r}/${view}`).toBe(before.fit(l,r,view));
  expect(fit).toBeTypeOf('function');expect(fit(-2,10,100)).toBe(6);expect(fit(90,104,100)).toBe(-8);expect(fit(5,95,100)).toBe(0);
 });
 it('right to left: the right edge at the pointer, the menu to its left, inside the viewport',()=>{
  // A 192 px menu opened at x=900 on a 1440 px page: first guess 900-224, then its right edge moves to the pointer.
  const left=firstLeft(900,1440,'rtl');expect(left).toBe(676);
  const dx=shiftX(left,left+192,900,1440,'rtl');expect(left+dx).toBe(708);expect(left+dx+192).toBe(900);
  // Near the left edge there is no room on the inline-end side: the menu stays 4 px inside the viewport.
  const near=firstLeft(60,320,'rtl');expect(near).toBe(4);
  expect(near+shiftX(near,near+200,60,320,'rtl')).toBe(4);
  // A menu wider than the viewport is pushed in from the left, as left to right.
  expect(shiftX(4,404,300,320,'rtl')).toBe(0);
  // The keyboard opens it from the list's top-right corner.
  expect(keyboardAnchor({left:30,right:330,top:100},'rtl')).toEqual({x:322,y:108});
 });
});
