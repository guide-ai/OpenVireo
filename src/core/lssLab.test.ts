import {describe,it,expect} from 'vitest';
import {INITIAL_LSS_LAB_SUMMARY,LSS_LAB_REPEAT_RECORDS,LSS_LAB_STEPS,lssLabProgress,sameLssLabSummary} from './lssLab';
describe('E02 guide progress',()=>{
 it('starts with nothing done and checks each step only from the reported state',()=>{
  expect(LSS_LAB_STEPS.filter(s=>lssLabProgress(INITIAL_LSS_LAB_SUMMARY).done[s])).toEqual([]);
  const p=lssLabProgress({...INITIAL_LSS_LAB_SUMMARY,listLoaded:true,observed:true,records:1,fields:1});
  expect(LSS_LAB_STEPS.filter(s=>p.done[s])).toEqual(['load','observe','record']);
  const all=lssLabProgress({listLoaded:true,observed:true,records:LSS_LAB_REPEAT_RECORDS,galaxies:LSS_LAB_REPEAT_RECORDS,fields:2,plotted:3,described:true,saved:true});
  expect(LSS_LAB_STEPS.every(s=>all.done[s])).toBe(true);
 });
 it('un-checks when the state goes back (a restore keeps records, so load counts as done)',()=>{
  expect(lssLabProgress({...INITIAL_LSS_LAB_SUMMARY,records:2}).done.load).toBe(true);
  expect(lssLabProgress({...INITIAL_LSS_LAB_SUMMARY,records:LSS_LAB_REPEAT_RECORDS-1,galaxies:LSS_LAB_REPEAT_RECORDS-1}).done.repeat).toBe(false);
  // Five Record Z on one galaxy do not count as repeating across the field.
  expect(lssLabProgress({...INITIAL_LSS_LAB_SUMMARY,records:LSS_LAB_REPEAT_RECORDS,galaxies:1}).done.repeat).toBe(false);
  expect(sameLssLabSummary(INITIAL_LSS_LAB_SUMMARY,{...INITIAL_LSS_LAB_SUMMARY})).toBe(true);expect(sameLssLabSummary(INITIAL_LSS_LAB_SUMMARY,{...INITIAL_LSS_LAB_SUMMARY,saved:true})).toBe(false);
 });
});
