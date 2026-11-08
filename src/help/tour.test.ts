import {describe,expect,it} from 'vitest';
import {TOUR} from './tour';
import {placeTourCard,spotBox,SPOT_PAD,SPOT_RING} from './tourPlacement';

const card={width:320,height:200};
describe('Front Onboarding: tour data and card placement',()=>{
 it('has unique steps, each with a title and text; only the welcome step has no target',()=>{
  expect(new Set(TOUR.steps.map(s=>s.id)).size).toBe(TOUR.steps.length);
  for(const s of TOUR.steps){expect(s.title.length).toBeGreaterThan(5);expect(s.text.length).toBeGreaterThan(20);}
  expect(TOUR.steps.filter(s=>s.targets.length===0).map(s=>s.id)).toEqual(['welcome']);
  expect(TOUR.progress(2,6)).toBe('Step 2 of 6');
 });
 it('centres without a target; on phones docks at the bottom, or at the top when the target is low',()=>{
  expect(placeTourCard(null,card,{width:1280,height:800})).toEqual({left:480,top:300,side:'center'});
  expect(placeTourCard({left:300,top:10,width:60,height:40},card,{width:375,height:812})).toEqual({left:12,top:600,side:'bottom'});
  expect(placeTourCard({left:12,top:560,width:350,height:140},card,{width:375,height:700})).toEqual({left:12,top:12,side:'top'});
 });
 it('goes right of a sidebar target, else below, else above, and stays on screen',()=>{
  expect(placeTourCard({left:0,top:40,width:248,height:600},card,{width:1280,height:800})).toEqual({left:262,top:40,side:'right'});
  expect(placeTourCard({left:800,top:100,width:470,height:60},card,{width:1280,height:800})).toEqual({left:800,top:174,side:'below'});
  expect(placeTourCard({left:800,top:560,width:470,height:220},card,{width:1280,height:800})).toEqual({left:800,top:346,side:'above'});
  const p=placeTourCard({left:700,top:20,width:580,height:760},card,{width:1280,height:800});
  expect(p.side).toBe('bottom');expect(p.top+card.height).toBeLessThanOrEqual(800);
 });
 it('outlines a part with even space around its text, and keeps the whole outline inside the window',()=>{
  // The Observatory steps strip in the middle of the page: SPOT_PAD all round (the first version left 6 px, and the strip's
  // own text touched the ring).
  expect(spotBox({left:278,top:400,width:1235,height:88},{width:1558,height:700})).toEqual({left:278-SPOT_PAD,top:400-SPOT_PAD,width:1235+2*SPOT_PAD,height:88+2*SPOT_PAD});
  // A sidebar against the window's top-left corner and a part cut off at the bottom: the ring is pulled in, not cut off.
  expect(spotBox({left:0,top:0,width:225,height:700},{width:1558,height:700})).toEqual({left:SPOT_RING,top:SPOT_RING,width:225+SPOT_PAD-SPOT_RING,height:700-2*SPOT_RING});
  expect(spotBox({left:15,top:560,width:290,height:80},{width:320,height:640})).toEqual({left:SPOT_RING,top:548,width:320-2*SPOT_RING,height:640-SPOT_RING-548});
 });
});
