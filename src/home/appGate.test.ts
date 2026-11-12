import {describe,expect,it} from 'vitest';
import {isWelcomeHash,queueIntent,shellFirst} from './appGate';

describe('Front LAZY-OBS: the welcome shell gate',()=>{
 it('only the welcome addresses are the welcome (as the app reads them)',()=>{
  for(const h of ['','#','#home'])expect(isWelcomeHash(h)).toBe(true);
  for(const h of ['#observatory','#lab=pleiades','#spectrum','#unknown','#home/'])expect(isWelcomeHash(h)).toBe(false);
 });
 it('a load starts on the shell only at the welcome, without Demonstration Mode and without the cloud build',()=>{
  expect(shellFirst({hash:'',demonstrationMode:false,cloud:false})).toBe(true);
  expect(shellFirst({hash:'#home',demonstrationMode:false,cloud:false})).toBe(true);
  expect(shellFirst({hash:'#observatory',demonstrationMode:false,cloud:false})).toBe(false);
  expect(shellFirst({hash:'#lab=hubble',demonstrationMode:false,cloud:false})).toBe(false);
  expect(shellFirst({hash:'',demonstrationMode:true,cloud:false})).toBe(false);
  expect(shellFirst({hash:'',demonstrationMode:false,cloud:true})).toBe(false);
 });
});

describe('Front LAZY-OBS review 1, finding 8: the intents queued while the app loads',()=>{
 const file=new File(['{}'],'a.json');
 it('appends in order',()=>{
  expect(queueIntent(queueIntent([],{kind:'navigate',route:'observatory'}),{kind:'guide',lab:'pleiades'})).toEqual([{kind:'navigate',route:'observatory'},{kind:'guide',lab:'pleiades'}]);
 });
 it('an address change drops the page changes before it',()=>{
  expect(queueIntent([{kind:'navigate',route:'observatory'},{kind:'guide',lab:'hubble'}],{kind:'address'})).toEqual([{kind:'guide',lab:'hubble'},{kind:'address'}]);
 });
 it('a Restore with its file is never dropped: a later Restore replaces it, nothing else follows it',()=>{
  const r1={kind:'restore',file} as const,r2={kind:'restore',file:new File(['{}'],'b.json')} as const;
  expect(queueIntent([r1],{kind:'navigate',route:'observatory'})).toEqual([r1]);
  expect(queueIntent([r1],{kind:'address'})).toEqual([r1]);
  expect(queueIntent([{kind:'save'},r1],r2)).toEqual([{kind:'save'},r2]);
 });
});
