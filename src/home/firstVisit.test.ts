import {describe,expect,it} from 'vitest';
import {firstVisitTourDue} from './firstVisit';

// Front HOME: the first-visit tour starts on the exploration page, not on the welcome, under the old conditions.
describe('first-visit tour condition',()=>{
 const base={view:'observatory',automated:false,seen:false,arrivedWithLab:false,alreadyScheduled:false};
 it('is due the first time a new visitor reaches the exploration page',()=>{expect(firstVisitTourDue(base)).toBe(true);});
 it('is not due on the welcome or any other page',()=>{
  for(const view of ['home','spectrum','photometer','radio-control'])expect(firstVisitTourDue({...base,view}),view).toBe(false);
 });
 it('keeps the old conditions: automated browser, already seen, arrival through #lab=, and once per load',()=>{
  for(const k of ['automated','seen','arrivedWithLab','alreadyScheduled'] as const)expect(firstVisitTourDue({...base,[k]:true}),k).toBe(false);
 });
});
