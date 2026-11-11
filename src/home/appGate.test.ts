import {describe,expect,it} from 'vitest';
import {isWelcomeHash,shellFirst} from './appGate';

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
