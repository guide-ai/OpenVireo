import {describe,expect,it} from 'vitest';
import witness from './poissonLarge.witness.json';
import {AcquisitionError,poissonDraw,poissonLargeExponent,poissonLargeProposal,POISSON_MEAN_ADMISSION,POISSON_UNGUARDED_LIMIT,randomDraw} from './acquisition';

// Front MEANBOUND: poissonDraw above 10^6 against the independent 110-digit witness of 0x55f0f4
// (analysis/front-meanbound/tools/poisson_witness.py; src/core/poissonLarge.witness.json). The witness evaluates the
// recovered formula naively in the assembly's order with the Extended constants decoded from their bytes, an integer LCG and
// Taylor sin/cos; it shares no code with acquisition.ts. It is not an oracle for VIREO: its 'x87model' column rounds every
// step to a 64-bit significand with correctly rounded transcendentals, an assumption about the x87.
type Proposal={decision:string;value?:number;exponent?:string;relativeMargin?:string|null;u1:number;u2?:number;cand:string};
type Case={mean:string;seed:number;exact:{outcome:string;value?:number;seed?:number;draws?:number;proposals:Proposal[]};x87model:{outcome:string;value?:number|null;decisions:string[];exponentDifferenceVsExact:string[]}};
const cases=(witness as unknown as {cases:Case[]}).cases;
/** The TS decision for one witness proposal (the band included). */
function tsDecision(mean:number,p:Proposal){
 const q=poissonLargeProposal(mean,p.u1/2**32);
 if(q.kind!=='candidate')return q.kind;
 return q.decide((p.u2??0)/2**32);
}
describe('poissonDraw above 10^6 (Front MEANBOUND)',()=>{
 it('admits up to 2^36 and keeps the unguarded path up to 10^6',()=>{
  expect(POISSON_UNGUARDED_LIMIT).toBe(1_000_000);expect(POISSON_MEAN_ADMISSION).toBe(2**36);
  expect(()=>poissonDraw(2**36+2**-16*2**36,1)).toThrow(expect.objectContaining({code:'mean'}));
  expect(poissonDraw(2**36,1).value).toBeGreaterThan(0);
 });
 it('matches the witness outcome and every decision outside the band',()=>{
  let compared=0,banded=0;
  for(const c of cases){
   const mean=Number(c.mean);let anyBand=false;
   for(const p of c.exact.proposals){
    const d=tsDecision(mean,p);
    if(d==='precision'){anyBand=true;banded++;continue;}
    expect(d,`${c.mean}/${c.seed} u1=${p.u1}`).toBe(p.decision);
    if(p.value!==undefined){const q=poissonLargeProposal(mean,p.u1/2**32);expect(q.kind==='candidate'&&q.value).toBe(p.value);}
   }
   if(c.exact.outcome!=='value')continue;
   if(anyBand){expect(()=>poissonDraw(mean,c.seed)).toThrow(expect.objectContaining({code:'precision'}));continue;}
   expect(poissonDraw(mean,c.seed)).toEqual({value:c.exact.value,seed:c.exact.seed,draws:c.exact.draws});compared++;
  }
  expect(compared).toBeGreaterThanOrEqual(66);expect(banded).toBe(4);
 });
 it('types precision exactly at the witnessed near-ties, which a binary64 decision could not settle',()=>{
  const ties=[[2**36,116073],[2**36,163779],[2**34,181958],[2**34,310671]];
  for(const [mean,seed] of ties){
   const c=cases.find(x=>Number(x.mean)===mean&&x.seed===seed)!;
   const tie=c.exact.proposals.find(p=>tsDecision(mean,p)==='precision')!;
   // the exact (110-digit) relative distance between the acceptance uniform and the threshold is below 10^-5
   expect(Math.abs(Number(tie.relativeMargin))).toBeLessThan(1e-5);
   expect(()=>poissonDraw(mean,seed)).toThrow(AcquisitionError);
  }
 });
 it('bounds its own exponent error and the Extended model error against the witness',()=>{
  let n=0;
  for(const c of cases){const mean=Number(c.mean);let k=0;
   for(const p of c.exact.proposals){if(p.exponent===undefined||p.value===undefined)continue;
    const e=poissonLargeExponent(mean,p.value),exact=Number(p.exponent);
    if(exact<-1e6)continue;// far tail: compared only through the decision above
    expect(Math.abs(e.exponent-exact),`${c.mean} v=${p.value}`).toBeLessThanOrEqual(e.webError+Math.abs(exact)*2**-52);
    const diff=Number(c.x87model.exponentDifferenceVsExact[k++]??0);
    expect(diff,`${c.mean} v=${p.value}`).toBeLessThanOrEqual(e.vireoError);n++;}}
  expect(n).toBeGreaterThan(60);
 });
 it('types a candidate whose truncation is undecided unless every possible integer has a threshold of 0',()=>{
  // u near 0.5: |y| ~ 1.4e9, the candidate's error spans many integers, all far in the tail.
  const mean=2**36,u=(2**31-1)/2**32,q=poissonLargeProposal(mean,u);
  expect(q.kind).toBe('candidate');
  if(q.kind==='candidate'){expect(q.value).toBeNull();expect(q.decide(0.25)).toBe('reject');expect(q.decide(0)).toBe('precision');}
 });
 it('draws Poisson-like counts (moments) from 10^6 to 2^36 with rare precision stops',()=>{
  for(const mean of [1_000_001,1.5e8,2**31,2**36]){let s=11,sum=0,sq=0,n=0;
   for(let i=0;i<4000;i++){try{const d=poissonDraw(mean,s);s=d.seed;sum+=d.value;sq+=d.value*d.value;n++;}catch(e){if(!(e instanceof AcquisitionError&&e.code==='precision'))throw e;s=randomDraw(s).seed;}}
   const mu=sum/n;expect(Math.abs(mu-mean)).toBeLessThan(5*Math.sqrt(mean/n));expect(Math.abs((sq/n-mu*mu)/mean-1)).toBeLessThan(0.1);expect(n).toBeGreaterThan(3990);}
 });
});
