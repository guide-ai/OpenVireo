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
/** The rejection branch with the web's guard and no admission (means above POISSON_MEAN_ADMISSION are typed by poissonDraw but
 * their decisions are still checked here). */
function guardedDraw(mean:number,seed:number){
 let s=seed,draws=0;const u=()=>{const d=randomDraw(s);s=d.seed;draws++;return d.value;};
 for(;;){const a=u();if(a===0.5)return 'precision' as const;const p=poissonLargeProposal(mean,a);if(p.kind==='precision')return 'precision' as const;if(p.kind==='negative')continue;
  const d=p.decide(u());if(d==='precision')return 'precision' as const;if(d==='accept')return {value:p.value,seed:s,draws};}
}
function tsDecision(mean:number,p:Proposal){
 const q=poissonLargeProposal(mean,p.u1/2**32);
 if(q.kind!=='candidate')return q.kind;
 return q.decide((p.u2??0)/2**32);
}
describe('poissonDraw above 10^6 (Front MEANBOUND)',()=>{
 it('admits up to 2^33 and keeps the unguarded path up to 10^6',()=>{
  expect(POISSON_UNGUARDED_LIMIT).toBe(1_000_000);expect(POISSON_MEAN_ADMISSION).toBe(2**33);
  expect(()=>poissonDraw(2**33*(1+2**-40),1)).toThrow(expect.objectContaining({code:'mean'}));
  expect(poissonDraw(2**33,1).value).toBeGreaterThan(0);
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
   if(mean>POISSON_MEAN_ADMISSION)expect(()=>poissonDraw(mean,c.seed)).toThrow(expect.objectContaining({code:'mean'}));
   const draw=mean>POISSON_MEAN_ADMISSION?()=>guardedDraw(mean,c.seed):()=>poissonDraw(mean,c.seed);
   if(anyBand){if(mean>POISSON_MEAN_ADMISSION)expect(draw()).toBe('precision');else expect(draw).toThrow(expect.objectContaining({code:'precision'}));continue;}
   expect(draw()).toEqual({value:c.exact.value,seed:c.exact.seed,draws:c.exact.draws});compared++;
  }
  // Review 1 L2 tightened VIREO's bound: of the 2^36/2^34 near-ties found with the first bound, 2^36 seed 116073 (6.0e-6) is now
  // and 2^34 seed 181958 (1.7e-6) are now
  // decided; the 2^33 and 1.5·2^32 ones were found with the tightened bound (2^33 seed 1017994 is a truncation tie).
  expect(compared).toBeGreaterThanOrEqual(66);expect(banded).toBe(6);
 });
 it('types precision exactly at the witnessed near-ties, which a binary64 decision could not settle',()=>{
  const ties=[[2**36,163779],[2**34,310671],[2**33,1017994],[2**33,1122154],[1.5*2**32,181958],[1.5*2**32,1955171]];
  for(const [mean,seed] of ties){
   const c=cases.find(x=>Number(x.mean)===mean&&x.seed===seed)!;
   const tie=c.exact.proposals.find(p=>tsDecision(mean,p)==='precision')!;
   // exactly (110 digits) the acceptance uniform is within 10^-5 of the threshold, or the candidate within 10^-6 of an integer
   expect(Math.abs(Number(tie.relativeMargin))<1e-5||Number((tie as Proposal&{fracDistance?:string}).fracDistance)<1e-6).toBe(true);
   if(mean<=POISSON_MEAN_ADMISSION)expect(()=>poissonDraw(mean,seed)).toThrow(expect.objectContaining({code:'precision'}));else expect(guardedDraw(mean,seed)).toBe('precision');
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
 it('review 1 L2: an exponent within the band around −30 is decided when u2 = 0 or u2 is above the threshold ceiling',()=>{
  // Search (fixed LCG) for proposals whose exponent cannot be told from −30: |E + 30| ≤ its bound.
  let s=99,found=0;
  for(let i=0;i<200_000&&found<3;i++){
   s=randomDraw(s).seed;const mean=2**32+(s/2**32)*2**32;s=randomDraw(s).seed;
   const y0=Math.sqrt(30),q0=poissonLargeProposal(mean,Math.atan(y0)/Math.PI);if(q0.kind!=='candidate'||q0.value===null)continue;
   const e0=poissonLargeExponent(mean,q0.value).exponent,y=y0*Math.sqrt(-30/e0)*(1+(s/2**32-0.5)*1e-5),u=Math.atan(y)/Math.PI;
   const q=poissonLargeProposal(mean,u);if(q.kind!=='candidate'||q.value===null)continue;
   const e=poissonLargeExponent(mean,q.value);if(!(Math.abs(e.exponent+30)<=e.error))continue;
   found++;expect(q.decide(0)).toBe('accept');expect(q.decide(1e-9)).toBe('reject');expect(q.decide(1e-13)).toBe('precision');
  }
  expect(found).toBe(3);
 });
 it('draws Poisson-like counts (moments) from 10^6 to 2^33 with rare precision stops',()=>{
  for(const mean of [1_000_001,1.5e8,2**31,2**33]){let s=11,sum=0,sq=0,n=0;
   for(let i=0;i<4000;i++){try{const d=poissonDraw(mean,s);s=d.seed;sum+=d.value;sq+=d.value*d.value;n++;}catch(e){if(!(e instanceof AcquisitionError&&e.code==='precision'))throw e;s=randomDraw(s).seed;}}
   const mu=sum/n;expect(Math.abs(mu-mean)).toBeLessThan(5*Math.sqrt(mean/n));expect(Math.abs((sq/n-mu*mu)/mean-1)).toBeLessThan(0.1);expect(n).toBeGreaterThan(3990);}
 });
});
