import {describe,expect,it} from 'vitest';
import {RADIO_RANDOM_POLICY,RadioSignalError,radioPoisson,randomizeRadioStream} from './radioRandom';

// Poisson sequences from RECEIVER-SIGNAL-CONTROLS.json: exact-integer LCG plus an independently written Poisson
// control (not a native run). Each sequence starts from the given seed and runs the means in order on one stream.
const SEQUENCES=[
 {seed:0,steps:[[0,0,1,1],[0.8,0,1,134775814],[6,5,6,694906232],[12,13,4,2039224980],[30,31,2,3611442298]]},
 {seed:1,steps:[[0,0,1,134775814],[0.8,1,2,870078620],[6,5,6,1828254910],[12,13,2,2039224980],[30,31,2,3611442298]]},
 {seed:4294967295,steps:[[0,0,1,4160191484],[0.8,0,1,866343917],[6,3,4,105731641],[12,9,10,2874657839],[30,29,7,555444110]]},
] as const;
const refusal=(f:()=>unknown)=>{try{f();}catch(e){if(e instanceof RadioSignalError)return e.kind;throw e;}return null;};

describe('radio-private random stream',()=>{
 it('reproduces the independent Poisson/LCG control sequences (product branch < 12, rejection ≥ 12)',()=>{
  for(const s of SEQUENCES){
   let stream=randomizeRadioStream(null,'receiver-create-0x572376',s.seed);let total=0;
   for(const [mean,value,draws,state] of s.steps){
    const d=radioPoisson(stream,mean,0);stream=d.stream;total+=draws;
    expect([d.value,d.uniforms,stream.state]).toEqual([value,draws,state]);
   }
   expect(stream.uniforms).toBe(total);
  }
 });
 it('requires a supplied uint32 at every Randomize site; nothing defaults',()=>{
  for(const seed of [undefined,-1,2**32,1.5,Number.NaN])expect(refusal(()=>randomizeRadioStream(null,'profile-allocate-0x562ba0',seed))).toBe('randomize-seed-required');
  expect(refusal(()=>radioPoisson(null,1,0))).toBe('randomize-seed-required');
 });
 it('reseeds the shared stream mid-session and keeps the ledger order',()=>{
  let s=randomizeRadioStream(null,'receiver-create-0x572376',7);
  s=radioPoisson(s,2,0).stream;
  const before=s.uniforms;
  s=randomizeRadioStream(s,'receiver-create-0x572376',9);
  expect(s.state).toBe(9);expect(s.uniforms).toBe(before);
  expect(s.ledger.map(e=>e.kind==='randomize'?`R${e.seed}`:'P')).toEqual(['R7','P','R9']);
 });
 it('refuses out-of-domain means atomically (bounded web admission, not native parity)',()=>{
  const s=randomizeRadioStream(null,'receiver-create-0x572376',3),snapshot=JSON.stringify(s);
  for(const mean of [-0.1,Number.NaN,1e6+1,Infinity])expect(refusal(()=>radioPoisson(s,mean,0))).toBe('poisson-mean-domain');
  expect(JSON.stringify(s)).toBe(snapshot);
 });
 it('bounds and freezes the ledger',()=>{
  let s=randomizeRadioStream(null,'receiver-create-0x572376',11);
  for(let i=0;i<300;i++)s=radioPoisson(s,0.5,i%3).stream;
  expect(s.events).toBe(301);expect(s.ledger).toHaveLength(RADIO_RANDOM_POLICY.ledgerLimit);
  expect(Object.isFrozen(s)&&Object.isFrozen(s.ledger)&&s.ledger.every(Object.isFrozen)).toBe(true);
  expect(s.ledger[0].kind).toBe('poisson');// the initial Randomize has scrolled out
 });
});
