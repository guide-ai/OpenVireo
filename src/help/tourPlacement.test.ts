import {describe,expect,it} from 'vitest';
import {placeTourCard} from './tourPlacement';

// Front RT6 (plan analysis/front-plans/front-i18n-rtl.md, the RT6 row of § 9): the tour card goes on the target's inline-end side.
// Left to right the placements are those of tour.test.ts (the default direction); right to left they are their mirror images.
const card={width:320,height:200},view={width:1280,height:800};
const mirror=(b:{left:number;top:number;width:number;height:number})=>({...b,left:view.width-b.left-b.width});
describe('tour card placement by direction',()=>{
 const targets=[{left:0,top:40,width:248,height:600},{left:800,top:100,width:470,height:60},{left:800,top:560,width:470,height:220},{left:700,top:20,width:580,height:760},{left:300,top:10,width:60,height:40}];
 it('left to right is the default and unchanged',()=>{
  for(const t of [null,...targets])expect(placeTourCard(t,card,view,'ltr')).toEqual(placeTourCard(t,card,view));
  expect(placeTourCard(targets[0],card,view,'ltr')).toEqual({left:262,top:40,side:'right'});
 });
 it('right to left: left of a sidebar on the right, else below or above aligned with its right edge: the mirror image',()=>{
  expect(placeTourCard(mirror(targets[0]),card,view,'rtl')).toEqual({left:1280-262-320,top:40,side:'left'});
  for(const t of targets){
   const ltr=placeTourCard(t,card,view,'ltr'),rtl=placeTourCard(mirror(t),card,view,'rtl');
   expect(rtl.top,JSON.stringify(t)).toBe(ltr.top);
   expect(rtl.left,JSON.stringify(t)).toBe(view.width-ltr.left-card.width);
   expect(rtl.side,JSON.stringify(t)).toBe(ltr.side==='right'?'left':ltr.side);
  }
 });
 it('right to left on phones docks at the right edge; without a target it centres',()=>{
  const phone={width:560,height:812};
  expect(placeTourCard({left:300,top:10,width:60,height:40},card,phone,'rtl')).toEqual({left:560-320-12,top:600,side:'bottom'});
  expect(placeTourCard({left:12,top:560,width:350,height:140},card,phone,'rtl')).toEqual({left:228,top:12,side:'top'});
  expect(placeTourCard(null,card,view,'rtl')).toEqual(placeTourCard(null,card,view,'ltr'));
 });
});
