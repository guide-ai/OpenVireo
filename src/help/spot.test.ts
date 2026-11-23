import {describe,expect,it} from 'vitest';
import {chooseCandidate,type CandidateState} from './spot';

const SHOWN:CandidateState={hidden:false,disabled:false,visible:true,collapsed:false};
const pick=(groups:readonly (readonly [string,Partial<CandidateState>])[][])=>{
 const states=new Map(groups.flat().map(([name,s])=>[name,{...SHOWN,...s}]));
 return chooseCandidate(groups.map(g=>g.map(([name])=>name)),name=>states.get(name)!);
};

describe('chooseCandidate (which control Show me where outlines)',()=>{
 it('takes the first candidate, in the step\'s order, that is shown and enabled',()=>{
  expect(pick([[['record',{}]],[['start',{}]]])).toBe('record');
  // A step lists its chain from the last action to the first: a disabled later action leaves the earlier, enabled one.
  expect(pick([[['record',{disabled:true}]],[['start',{disabled:true}]],[['activate',{}]]])).toBe('activate');
 });
 it('skips what is in a route that is not shown, and what has no box',()=>{
  expect(pick([[['other-page',{hidden:true}]],[['here',{}]]])).toBe('here');
  expect(pick([[['not-rendered',{visible:false}]],[['here',{}]]])).toBe('here');
 });
 it('takes a control inside a closed disclosure (it is opened to show it)',()=>{
  expect(pick([[['in-details',{visible:false,collapsed:true}]],[['summary',{}]]])).toBe('in-details');
 });
 it('with every candidate disabled, the first that can be shown (the outline sits beside the page\'s own explanation)',()=>{
  expect(pick([[['record',{disabled:true}]],[['start',{disabled:true}]]])).toBe('record');
  expect(pick([[['gone',{hidden:true,disabled:true}]],[['start',{disabled:true}]]])).toBe('start');
 });
 it('several matches of one selector are tried in document order',()=>{
  expect(pick([[['row-1',{disabled:true}],['row-2',{}]]])).toBe('row-2');
 });
 it('nothing on the page yet: null',()=>{
  expect(pick([])).toBeNull();
  expect(pick([[['other-page',{hidden:true}]],[['not-rendered',{visible:false}]]])).toBeNull();
 });
});
