import {describe,expect,it} from 'vitest';
import {nearestBinary64} from './radioAntenna';
import type {PulsarRecord} from './radioPulsarCatalog';
import {
 PULSAR_PROFILE_CONSTANTS,buildPulsarProfile,createPulsarProfile,currentPulsarSample,nextPulsarSample,pulsarActiveCount,
 pulsarDispersionDelay,pulsarFluxAt,pulsarFluxRecord,pulsarIntervalArea,pulsarProfileTiming,pulsarPulseWidth,type PulsarProfile,
} from './radioPulsarProfile';
import {RadioSignalError,randomizeRadioStream} from './radioRandom';

// Synthetic records only; expected scalars come from RECEIVER-SIGNAL-CONTROLS.json (profileScalars, wrap) and
// INDEPENDENT-MATH-HOLDOUTS.json (flux, delay, phase), independent Python Fraction/Decimal math, not a native run.
const rec=(o:Partial<PulsarRecord>={}):PulsarRecord=>Object.freeze({primaryName:'J0000+00',legacyName:'',ra:6,dec:10,x2a:0.5,x34:0,x3e:2451545,
 s48:Math.fround(30),s4c:Math.fround(10),s50:Math.fround(1),s54:Math.fround(8),s58:Math.fround(2),s5c:Math.fround(1),...o});
const seeded=(seed=5)=>randomizeRadioStream(null,'receiver-create-0x572376',seed);
const refusal=(f:()=>unknown)=>{try{f();}catch(e){if(e instanceof RadioSignalError)return e.kind;throw e;}return null;};
const decimalIsNearest=(text:string,value:number)=>{
 const [m,e='0']=text.split(/[eE]/),[i,f='']=m.split('.'),exp=Number(e)-f.length,n=BigInt(i+f);
 return value===(exp>=0?nearestBinary64(n*10n**BigInt(exp),1n):nearestBinary64(n,10n**BigInt(-exp)));
};
const SCALARS=[
 {id:0,P0:0.5,Pdot:0,jd:2451545,dt:0.01,w:1,f400:8,period:0.5,phase:0,start:51545.00000289352,resolved:true,N:2000,norm:8},
 {id:1,P0:0.5,Pdot:0,jd:2451545.0000009537,dt:0.01,w:1,f400:8,period:0.5,phase:0.164794921875,start:51545.00000289352,resolved:true,N:2000,norm:8},
 {id:2,P0:0.5,Pdot:0,jd:2451544.9999990463,dt:0.01,w:1,f400:8,period:0.5,phase:-0.164794921875,start:51545.00000289352,resolved:true,N:2000,norm:8},
 {id:3,P0:0.5,Pdot:0.0009765625,jd:2451545.0000009537,dt:0.01,w:1,f400:8,period:0.5000804662704468,phase:0.16478166250917986,start:51545.00000289391,resolved:true,N:1950,norm:8},
 {id:4,P0:0.5,Pdot:0.0009765625,jd:2451544.9999990463,dt:0.01,w:1,f400:8,period:0.4999195337295532,phase:-0.16480818337485528,start:51545.00000289298,resolved:true,N:2000,norm:8},
 {id:5,P0:1,Pdot:0,jd:2451545,dt:0.3,w:1,f400:8,period:1,phase:0,start:51545.000005787035,resolved:false,N:2000,norm:8},
 {id:6,P0:1,Pdot:0,jd:2451545,dt:0.25,w:1,f400:8,period:1,phase:0,start:51545.000005787035,resolved:true,N:2000,norm:8},
 {id:7,P0:100,Pdot:0,jd:2451545,dt:0.01,w:1,f400:8,period:100,phase:0,start:51545.0005787037,resolved:true,N:0,norm:8},
 {id:8,P0:0.5,Pdot:0,jd:2451545,dt:0.01,w:0.1,f400:8,period:0.5,phase:0,start:51545.00000289352,resolved:true,N:2000,norm:8},
 {id:9,P0:0.5,Pdot:0,jd:2451545,dt:0.01,w:0,f400:8,period:0.5,phase:0,start:51545.00000289352,resolved:true,N:2000,norm:8},
 {id:10,P0:0.5,Pdot:0,jd:2451545,dt:0.01,w:1,f400:0,period:0.5,phase:0,start:51545.00000289352,resolved:true,N:2000,norm:1e-5},
 {id:11,P0:0.5,Pdot:0,jd:2451545,dt:0.01,w:1,f400:-1,period:0.5,phase:0,start:51545.00000289352,resolved:true,N:2000,norm:1e-5},
] as const;

describe('pulsar profile owner 0x562a70 / build 0x562b24',()=>{
 it('projects every Extended decimal cell to its nearest binary64 and decodes the two immediates',()=>{
  const k=PULSAR_PROFILE_CONSTANTS;
  expect(decimalIsNearest('0.30000000000000000001084202172485504434007452800869941711425781250',k.resolvedFraction)).toBe(true);
  expect(decimalIsNearest('0.1000000000000000000013552527156068805425093160010874271392822265625',k.widthThreshold)).toBe(true);
  expect(decimalIsNearest('0.0009999999999999999999584953855845392833856521974666975438594818115234375',k.msToSeconds)).toBe(true);
  expect(decimalIsNearest('2.35481999999999999997890576253212202573195099830627441406250000',k.fwhmToSigma)).toBe(true);
  expect(decimalIsNearest('0.00000999999999999999999994891332536872501079994179917775909416377544403076171875',k.normalizationThreshold)).toBe(true);
  expect(Math.abs(k.fallbackWidth/(1e-4/2.35482)-1)).toBeLessThan(1e-12);
  expect(Math.abs(k.normalizationFloor/1e-5-1)).toBeLessThan(1e-12);
 });
 it('constructor zeroes only +4/+8/+0x12/+0x1c/+0x26; the rest stays absent until a build',()=>{
  const p=createPulsarProfile();
  expect(p).toMatchObject({allocated:false,period:0,start:0,dispersion:0,reference:0,flux:null,dt:null,activeCount:null,cursor:null,normalization:null,samples:null});
  expect(Object.isFrozen(p)).toBe(true);
  expect(refusal(()=>currentPulsarSample(p,600))).toBe('profile-not-built');
 });
 it('matches the scalar controls (period, signed phase, start, branch, N, normalization)',()=>{
  for(const c of SCALARS){
   const s=rec({x2a:c.P0,x34:c.Pdot,s50:Math.fround(c.w),s54:Math.fround(c.f400)}),t=pulsarProfileTiming(s,c.jd);
   expect(t.period,`id ${c.id}`).toBe(c.period);expect(t.phase,`id ${c.id}`).toBeCloseTo(c.phase,12);
   expect(Math.abs(t.start-c.start),`id ${c.id}`).toBeLessThan(1e-9);
   expect(c.dt<PULSAR_PROFILE_CONSTANTS.resolvedFraction*t.period,`id ${c.id}`).toBe(c.resolved);
   expect(pulsarActiveCount(c.dt,t.period),`id ${c.id}`).toBe(c.N);
   const built=(()=>{try{return buildPulsarProfile(createPulsarProfile(),{source:s,dt:c.dt,jd:c.jd},seeded(),1);}catch(e){return e as RadioSignalError;}})();
   if(c.N===0)expect((built as RadioSignalError).kind).toBe('profile-active-count');
   else if(c.id===6){const b=built as Exclude<typeof built,RadioSignalError>;expect(b.profile).toMatchObject({activeCount:c.N,resolved:c.resolved});expect(b.profile.samples![0]).toBe(0);}// negative first mean: native 0 (Front R1)
   else{
    const b=built as Exclude<typeof built,RadioSignalError>;
    expect(b.profile).toMatchObject({period:c.period,activeCount:c.N,cursor:c.N,resolved:c.resolved});
    expect(Math.abs(b.profile.normalization!/c.norm-1)).toBeLessThan(1e-12);
   }
  }
 });
 it('keeps the native one-sided fold of a signed phase (phase holdouts)',()=>{
  const P=0.5;
  for(const [jd,phase,folded] of [[2451545.0000009537,0.164794921875,0.164794921875],[2451544.9999990463,-0.164794921875,-0.164794921875],
   [2451545.0000038147,0.6591796875,-0.3408203125],[2451544.9999961853,-0.6591796875,-0.6591796875]] as const){
   const t=pulsarProfileTiming(rec({x2a:P}),jd);expect(t.phase).toBe(phase);
   expect(t.phase>PULSAR_PROFILE_CONSTANTS.half?t.phase-1:t.phase).toBe(folded);
  }
 });
 it('uses the projected Single(0.1) width (above the Extended 0.1 cell) and the fallback at or below it',()=>{
  expect(Math.fround(0.1)).toBeGreaterThan(PULSAR_PROFILE_CONSTANTS.widthThreshold);
  expect(pulsarPulseWidth(Math.fround(0.1))).toBe((PULSAR_PROFILE_CONSTANTS.msToSeconds*Math.fround(0.1))/PULSAR_PROFILE_CONSTANTS.fwhmToSigma);
  expect(pulsarPulseWidth(0)).toBe(PULSAR_PROFILE_CONSTANTS.fallbackWidth);
  expect(pulsarPulseWidth(PULSAR_PROFILE_CONSTANTS.widthThreshold)).toBe(PULSAR_PROFILE_CONSTANTS.fallbackWidth);
 });
 it('evaluates the three-point flux law and the dispersion delay holdouts',()=>{
  const flux=pulsarFluxRecord(rec({s54:8,s58:2,s5c:1}));
  for(const [f,v] of [[400,8],[500,5],[600,2],[1000,1.5],[1400,1]] as const)expect(pulsarFluxAt(flux,f)).toBe(v);
  expect(pulsarFluxAt(flux,Number.NaN)).toBeNaN();
  const p:PulsarProfile={...createPulsarProfile(),dispersion:Math.fround(5)*PULSAR_PROFILE_CONSTANTS.dispersionScale,reference:1/(400*400)};
  for(const [f,v] of [[400,0],[600,83/1152],[800,249/2560],[1000,1743/16000],[1400,747/6272]] as const)expect(pulsarDispersionDelay(p,f)).toBeCloseTo(v,15);
 });
 it('wraps the shifted index into 1..N exactly as the control table',()=>{
  const W:ReadonlyArray<readonly [number,number,number]>=[[1,-17,8],[1,-8,1],[1,-1,8],[1,0,1],[1,1,2],[1,8,1],[1,17,2],[8,-17,7],[8,-8,8],[8,-1,7],[8,0,8],[8,1,1],[8,8,8],[8,17,1]];
  for(const [cursor,shift,expected] of W){
   // R = 0, f = 500, dt = 1 and D = −shift·f² make delay/dt exactly the shift; sample i holds i + 1.
   const p:PulsarProfile={...createPulsarProfile(),allocated:true,dt:1,activeCount:8,cursor,normalization:1,reference:0,dispersion:-shift*250000,
    flux:Object.freeze({a:1,b:1,c:1,ba:0,cb:0}),samples:Object.freeze([1,2,3,4,5,6,7,8,...new Array(1992).fill(0)])};
   expect(currentPulsarSample(p,500),`${cursor}/${shift}`).toBe(expected);
  }
 });
 it('returns the raw Single at exactly 400 MHz and wraps the cursor after N (0x562fb0)',()=>{
  const p:PulsarProfile={...createPulsarProfile(),allocated:true,dt:0.01,activeCount:3,cursor:3,normalization:null,flux:null,
   samples:Object.freeze([7,8,9,...new Array(1997).fill(0)])};
  expect(currentPulsarSample(p,400)).toBe(9);
  const n=nextPulsarSample(p,400);expect(n.profile.cursor).toBe(1);expect(n.value).toBe(7);expect(p.cursor).toBe(3);
  expect(refusal(()=>currentPulsarSample(p,600))).toBe('profile-normalization-domain');
  expect(refusal(()=>currentPulsarSample({...p,normalization:1,flux:pulsarFluxRecord(rec()),dispersion:1e30,reference:0},600))).toBe('sample-shift-domain');
 });
 it('Randomizes on first allocation before the null-source test, and a null build keeps the stale scalars',()=>{
  expect(refusal(()=>buildPulsarProfile(createPulsarProfile(),{source:null,dt:0.01,jd:2451545},seeded()))).toBe('randomize-seed-required');
  const first=buildPulsarProfile(createPulsarProfile(),{source:null,dt:0.01,jd:2451545},seeded(),42);
  expect(first.stream.ledger.map(e=>e.kind==='randomize'?e.site:e.kind)).toEqual(['receiver-create-0x572376','profile-allocate-0x562ba0']);
  expect(first.profile).toMatchObject({allocated:true,activeCount:2000,cursor:2000,period:0,flux:null,normalization:null,resolved:null});
  expect(first.profile.samples!.every(v=>v===0)).toBe(true);
  const real=buildPulsarProfile(first.profile,{source:rec(),dt:0.01,jd:2451545},first.stream);
  expect(real.stream.ledger.filter(e=>e.kind==='randomize')).toHaveLength(2);// no second allocation Randomize
  const again=buildPulsarProfile(real.profile,{source:null,dt:0.02,jd:2451546},real.stream);
  for(const f of ['period','start','dispersion','reference','flux','normalization','resolved'] as const)expect(again.profile[f]).toEqual(real.profile[f]);
  expect(again.profile).toMatchObject({dt:0.02,duration:0.02*2000,activeCount:2000,cursor:2000});
  expect(again.stream.state).toBe(real.stream.state);// a null build draws nothing
 });
 it('draws only where |folded phase| ≤ 0.3 in the resolved branch and every sample in the unresolved branch',()=>{
  // Dyadic P = 0.5, dt = 2^-7: x_i = 0.5 + i/64 exactly, so the gate count follows from integer residues.
  const r=buildPulsarProfile(createPulsarProfile(),{source:rec({x2a:0.5}),dt:2**-7,jd:2451545},seeded(),1);
  let admitted=0;for(let i=1;i<=2000;i++){let k=(32+i)%64;if(k>32)k-=64;if(Math.abs(k)<=19)admitted++;}
  const calls=r.stream.ledger.flatMap(e=>e.kind==='profile-poisson'?[e.calls]:[]);
  expect(r.profile.resolved).toBe(true);expect(calls).toEqual([admitted]);expect(r.profile.activeCount).toBe(1984);
  // Unresolved: P = 1, dt = 0.5. n = Round(x − Round(previous x)) with ties to even is 1 only at i ≡ 1 (mod 4).
  const u=buildPulsarProfile(createPulsarProfile(),{source:rec({x2a:1,s54:Math.fround(1000)}),dt:0.5,jd:2451545},seeded(),1);
  expect(u.profile.resolved).toBe(false);expect(u.stream.ledger.flatMap(e=>e.kind==='profile-poisson'?[e.calls]:[])).toEqual([2000]);
  const nonzero=u.profile.samples!.flatMap((v,i)=>v>0?[i]:[]);
  expect(nonzero).toEqual(Array.from({length:500},(_,j)=>4*j));
  expect(u.profile.samples!.every(v=>Number.isInteger(v)&&v>=0&&Math.fround(v)===v)).toBe(true);
 });
 it('draws 0 for a first-sample negative mean (0.2P ≤ dt < 0.3P, native 0x55f0f4); refuses the +5 lookup boundary and bad periods, atomically',()=>{
  const p=createPulsarProfile(),s=seeded(),snapshot=JSON.stringify([p,s]);
  expect(buildPulsarProfile(p,{source:rec({x2a:1}),dt:0.25,jd:2451545},s,1).profile.samples![0]).toBe(0);
  expect(refusal(()=>pulsarIntervalArea(5,0))).toBe('integral-boundary');
  expect(pulsarIntervalArea(6,-6)).toBe(1);expect(pulsarIntervalArea(-5,0)).toBeCloseTo(-0.5,6);
  expect(refusal(()=>buildPulsarProfile(p,{source:rec({x2a:0}),dt:0.01,jd:2451545},s,1))).toBe('profile-period');
  expect(refusal(()=>buildPulsarProfile(p,{source:rec({x2a:0.5,x34:-1e-3}),dt:0.01,jd:2451545+10},s,1))).toBe('profile-period');
  expect(refusal(()=>buildPulsarProfile(p,{source:rec(),dt:0.01,jd:Number.NaN},s,1))).toBe('clock-required');
  expect(JSON.stringify([p,s])).toBe(snapshot);
 });
 it('web binary64 projection edge of the accepted lookup just below +5 (distinct from the exact +5 native hazard)',()=>{
  // [W] (z + 5)·10 rounds to 100 one ulp below 5, so the helper refuses it; native Extended evaluation is not claimed.
  const z=5-2**-50;
  expect(z).toBe(4.999999999999999);expect((z+5)*10).toBe(100);
  expect(refusal(()=>pulsarIntervalArea(z,0))).toBe('integral-boundary');
  const below=5-2**-49;
  expect((below+5)*10).toBeLessThan(100);expect(pulsarIntervalArea(below,0)).toBeCloseTo(0.5,5);
 });
 it('returns frozen outputs and leaves the input profile and stream untouched',()=>{
  const p=createPulsarProfile(),s=seeded(),r=buildPulsarProfile(p,{source:rec(),dt:0.01,jd:2451545},s,3);
  expect(Object.isFrozen(r)&&Object.isFrozen(r.profile)&&Object.isFrozen(r.profile.samples)&&Object.isFrozen(r.profile.flux)).toBe(true);
  expect(p.allocated).toBe(false);expect(s.ledger).toHaveLength(1);
 });
});
