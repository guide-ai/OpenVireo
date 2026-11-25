import {describe,expect,it} from 'vitest';
import {LAB_SLUGS} from '../seo/labSlugs';
import {HUBBLE_QUICK_GOAL} from '../core/hubbleLab';
import {PLEIADES_QUICK_GOAL} from '../core/pleiadesLab';
import {LAB_FACTS,QUICK_GOALS,START_HERE,isoDuration} from './labFacts';

// Front NEWCOMER NC6 (plan analysis/front-plans/front-newcomer.md §2.6; user decision of 2026-11-24): the computed rough times,
// the levels and the one Start here.
describe('lab facts',()=>{
 it('cover every lab once, with ranges low < high, rounded outwards (5 min under an hour, 15 from an hour up)',()=>{
  expect(Object.keys(LAB_FACTS)).toEqual([...LAB_SLUGS]);
  for(const [lab,f] of Object.entries(LAB_FACTS))for(const m of [f.full,...(f.quick?[f.quick]:[])]){
   expect(m[0],lab).toBeGreaterThan(0);expect(m[0],lab).toBeLessThan(m[1]);
   for(const v of m)expect(v%(v<60?5:15),`${lab} ${v}`).toBe(0);
  }
 });
 it('give a quick time only to the two labs with a quick version, below the full time, for the goals the cores use',()=>{
  expect(Object.entries(LAB_FACTS).filter(([,f])=>f.quick).map(([lab])=>lab)).toEqual(['hubble','pleiades']);
  for(const lab of ['hubble','pleiades'] as const){const f=LAB_FACTS[lab];expect(f.quick![1]).toBeLessThanOrEqual(f.full[1]);expect(f.quick![0]).toBeLessThan(f.full[0]);}
  expect(QUICK_GOALS).toEqual({hubble:HUBBLE_QUICK_GOAL,pleiades:PLEIADES_QUICK_GOAL});
 });
 it('use levels 1–3 and put Start here on Stellar classification, whose full time is among the shortest',()=>{
  for(const f of Object.values(LAB_FACTS))expect([1,2,3]).toContain(f.level);
  expect(START_HERE).toBe('stellar-classification');expect(LAB_SLUGS).toContain(START_HERE);
  const start=LAB_FACTS[START_HERE];expect(start.level).toBe(1);
  for(const f of Object.values(LAB_FACTS))expect(start.full[1]).toBeLessThanOrEqual(f.full[1]);
 });
 it('write ISO 8601 durations for timeRequired',()=>{
  expect([20,50,60,75,120,150].map(isoDuration)).toEqual(['PT20M','PT50M','PT1H','PT1H15M','PT2H','PT2H30M']);
  for(const bad of [0,-5,1.5])expect(()=>isoDuration(bad)).toThrow(RangeError);
 });
});
