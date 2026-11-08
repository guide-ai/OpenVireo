import {describe,expect,it} from 'vitest';
import {TOUR} from './tour';
import {placeTourCard} from './tourPlacement';

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
});
