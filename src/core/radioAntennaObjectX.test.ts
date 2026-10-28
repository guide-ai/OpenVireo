import {describe,expect,it} from 'vitest';
import {INITIAL_RADIO_LAB,seedObjectXTarget,skyCoordsFieldsFor,type RadioLabState} from './radioAntenna';

// E08 Object X hand-off (web): the hidden object's J2000 coordinates become the stored target, like a hot-list selection.
describe('seedObjectXTarget',()=>{
 const target={ra:3.549819444,dec:54.578680555};
 it('stores the target without opening, slewing or showing anything',()=>{
  const s=seedObjectXTarget(INITIAL_RADIO_LAB,target);
  expect(s.target).toEqual(target);expect(s.targetHoldsB1950).toBe(false);
  expect({...s,target:INITIAL_RADIO_LAB.target}).toEqual({...INITIAL_RADIO_LAB});
  expect(seedObjectXTarget(s,target)).toBe(s);
  expect(skyCoordsFieldsFor(s.target)).toMatchObject({raHours:'3',decDegrees:'54'});
 });
 it('leaves a modal surface, a slew or invalid coordinates untouched',()=>{
  const dialog={...INITIAL_RADIO_LAB,dialog:{fields:skyCoordsFieldsFor({ra:1,dec:1}),epochIndex:0,epochEnabled:true}} as RadioLabState;
  expect(seedObjectXTarget(dialog,target)).toBe(dialog);
  const slewing={...INITIAL_RADIO_LAB,slewing:true} as RadioLabState;
  expect(seedObjectXTarget(slewing,target)).toBe(slewing);
  expect(seedObjectXTarget(INITIAL_RADIO_LAB,{ra:25,dec:0})).toBe(INITIAL_RADIO_LAB);
 });
});
