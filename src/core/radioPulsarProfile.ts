// Pulsar profile owner shared by the receivers (R-RX1). CLEA_VEO.exe SHA-256 781bc970…c54c. Create 0x562a70, build
// 0x562b24..0x562f4b, flux load 0x5629d8 and lookup 0x562a04, dispersion 0x5631c0, next 0x562fb0 and current-shifted
// 0x562ff4 (receiver-science/*-canonical.asm, RS-03..07, RS-11; REA ev_8e62c645…). The pulse integral reuses the
// photometer table and lookup 0x55f91c (PHOTO-SOURCE-04..07): same constructor arguments (10 subdivisions, Extended
// tolerance ≈1e-7); the area helper 0x55fa24 returns lookup(z) − lookup(previous z). See docs/RADIO-RECEIVER-SIGNAL.md.
// [W] Binary64 for Extended, Math.fround for Single stores, roundNearestEven for x87 Round/FISTP under the compiled
// control word, Math.trunc for Trunc, x − trunc(x) for Frac (signed, toward zero). Repeated time addition is kept.
// No x87 parity is claimed. Refusals are bounded web admission, not native exception parity.
import {roundNearestEven} from './numericPolicy';
import {PhotometerSourceError,photometerNormalIntegral} from './photometerSource';
import type {PulsarRecord} from './radioPulsarCatalog';
import {RadioRandomCursor,RadioSignalError,randomizeRadioStream,type RadioRandomStream} from './radioRandom';
import {radioExtendedWords} from './radioThermal';

export const PULSAR_PROFILE_CONSTANTS=Object.freeze({
 /** 0x562b6a GetMem 0x1f40 bytes = 2000 Singles; null-source fill 1..0x7d0. */
 capacity:2000,
 /** Single cells (receiver-science/TYPED-CONSTANTS.json). */
 samples2000:Math.fround(2000),secondsPerDay:Math.fround(86400),two:Math.fround(2),half:Math.fround(0.5),
 mjdOffset:Math.fround(2400000),dispersionScale:Math.fround(4150),one:Math.fround(1),raw400:Math.fround(400),
 fluxSplit:Math.fround(600),fluxLow:Math.fround(400),fluxLowSpan:Math.fround(200),fluxHighSpan:Math.fround(800),
 /** Extended cells, nearest binary64 of the exact stored values. */
 resolvedFraction:Number('0.30000000000000000001084202172485504434007452800869941711425781250'),// 0x562f60
 widthThreshold:Number('0.1000000000000000000013552527156068805425093160010874271392822265625'),// 0x562f6c
 msToSeconds:Number('0.0009999999999999999999584953855845392833856521974666975438594818115234375'),// 0x562f78
 fwhmToSigma:Number('2.35481999999999999997890576253212202573195099830627441406250000'),// 0x562f84
 normalizationThreshold:Number('0.00000999999999999999999994891332536872501079994179917775909416377544403076171875'),// 0x562f90
 reference400:400,// 0x562fa0 and the pushed immediate {0,0xc8000000,0x4007}
 /** Immediates moved at 0x562cb7..0x562ccb and 0x562d0d..0x562d21. */
 fallbackWidth:radioExtendedWords(0x97fa9726,0xb21d9e29,0x3ff0),
 normalizationFloor:radioExtendedWords(0x1b478423,0xa7c5ac47,0x3fee),
});

/** Flux record at profile+0x5c: A, B, C (+0x00/+0x0a/+0x14) and B−A, C−B (+0x1e/+0x28). */
export type PulsarFluxRecord=Readonly<{a:number;b:number;c:number;ba:number;cb:number}>;
/** Profile owner. Constructor 0x562a70 zeroes +4 (buffer pointer), +8 period, +0x12 start, +0x1c D and +0x26 R; every
 * other field is null until a build writes it (no native initial value is claimed for them). */
export type PulsarProfile=Readonly<{
 /** +4 non-nil: the 8000-byte buffer, integral helper +0x30 and Poisson cache +0x34 exist. */
 allocated:boolean;
 period:number;start:number;dispersion:number;reference:number;
 flux:PulsarFluxRecord|null;
 /** +0x8e and +0x98 = dt · Single 2000. */
 dt:number|null;duration:number|null;
 /** +0xa2 N and +0xb0 cursor (1-based). */
 activeCount:number|null;cursor:number|null;
 /** +0xa6. */
 normalization:number|null;
 /** Build branch selected by dt < 0.3·P; null until the first non-null-source build. A null-source build keeps the
  * previous value (0x562bc0..0x562bd1 write only +0xa2/+0xb0 and the buffer). */
 resolved:boolean|null;
 /** The 2000 Singles (frozen), null before the first build. */
 samples:readonly number[]|null;
}>;

export function createPulsarProfile():PulsarProfile{
 return Object.freeze({allocated:false,period:0,start:0,dispersion:0,reference:0,flux:null,dt:null,duration:null,
  activeCount:null,cursor:null,normalization:null,resolved:null,samples:null});
}

/** 0x5629d8: Singles +0x54/+0x58/+0x5c promoted to Extended; differences B−A and C−B. */
export function pulsarFluxRecord(source:PulsarRecord):PulsarFluxRecord{
 const a=source.s54,b=source.s58,c=source.s5c;return Object.freeze({a,b,c,ba:b-a,cb:c-b});
}
/** 0x562a04: jb at 0x562a19 (below 600 or unordered) takes the 400..600 segment. */
export function pulsarFluxAt(flux:PulsarFluxRecord,f:number):number{
 const k=PULSAR_PROFILE_CONSTANTS;
 return f>=k.fluxSplit?flux.b+((f-k.fluxSplit)*flux.cb)/k.fluxHighSpan:flux.a+((f-k.fluxLow)*flux.ba)/k.fluxLowSpan;
}
/** 0x5631c0: (R − 1/(f·f))·D. Positive above 400 MHz with the stored sign; not textbook-corrected. */
export function pulsarDispersionDelay(profile:PulsarProfile,f:number):number{
 return (profile.reference-PULSAR_PROFILE_CONSTANTS.one/(f*f))*profile.dispersion;
}

const frac=(x:number)=>x-Math.trunc(x);// 0x40365c, toward zero

export type PulsarProfileTiming=Readonly<{delta:number;period:number;phase:number;start:number}>;
/** 0x562bd6..0x562c6c: δ = (J − x3e)·86400; P = x2a + x34·δ; phase = Frac(δ/(x2a + (x34·δ)/2)) (signed);
 * start = (J − 2400000) + ((0.5 − phase)·P)/86400. [W] P not finite or ≤ 0, or a non-finite ratio, is refused. */
export function pulsarProfileTiming(source:PulsarRecord,jd:number):PulsarProfileTiming{
 const k=PULSAR_PROFILE_CONSTANTS;
 const delta=(jd-source.x3e)*k.secondsPerDay,pdotDelta=delta*source.x34;
 const period=source.x2a+pdotDelta,denominator=pdotDelta/k.two+source.x2a,ratio=delta/denominator;
 if(!Number.isFinite(period)||period<=0||!Number.isFinite(ratio))throw new RadioSignalError('profile-period',`P=${period}, denominator=${denominator}`);
 const phase=frac(ratio),start=((k.half-phase)*period)/k.secondsPerDay+(jd-k.mjdOffset);
 return Object.freeze({delta,period,phase,start});
}
/** 0x562c8e..0x562ccb: jae at 0x562c9b keeps the formula unless Extended 0.1 >= width (ordered). Single(0.1) projects
 * to 0.10000000149… and is above the cell, so it takes the formula. */
export function pulsarPulseWidth(s50:number):number{
 const k=PULSAR_PROFILE_CONSTANTS;
 return !(k.widthThreshold>=s50)?(k.msToSeconds*s50)/k.fwhmToSigma:k.fallbackWidth;
}
/** 0x562efa..0x562f3c: N = Round(Trunc((dt·2000)/P)·P/dt). */
export function pulsarActiveCount(dt:number,period:number):number{
 const k=PULSAR_PROFILE_CONSTANTS;return roundNearestEven((Math.trunc((dt*k.samples2000)/period)*period)/dt);
}
/** 0x55fa24: lookup(z) − lookup(previous) on the shared table (photometerNormalIntegral, 0x55f91c). The inclusive +5
 * index-101 read is refused as integral-boundary [W]. */
export function pulsarIntervalArea(z:number,previous:number):number{
 try{return photometerNormalIntegral(z)-photometerNormalIntegral(previous);}
 catch(error){
  if(error instanceof PhotometerSourceError)throw new RadioSignalError(error.code==='boundary'?'integral-boundary':'integral-domain',`z=${z}, previous=${previous}`);
  throw error;
 }
}

export type PulsarBuildInput=Readonly<{source:PulsarRecord|null;dt:number;jd:number}>;
export type PulsarBuildResult=Readonly<{profile:PulsarProfile;stream:RadioRandomStream}>;

/** 0x562b24. The first build allocates and Randomizes (0x562ba0) before the null-source test, so it needs
 * allocateSeed even for a null source. A null source zeroes the samples and sets N = cursor = 2000; period, start, D,
 * R, flux, normalization and branch keep their previous (possibly stale) values. Throws RadioSignalError. */
export function buildPulsarProfile(profile:PulsarProfile,input:PulsarBuildInput,stream:RadioRandomStream|null,allocateSeed?:number):PulsarBuildResult{
 const k=PULSAR_PROFILE_CONSTANTS,{source,dt,jd}=input;
 if(!Number.isFinite(dt)||dt<=0)throw new RadioSignalError('profile-period',`dt=${dt}`);
 if(!Number.isFinite(jd))throw new RadioSignalError('clock-required','profile build JD');
 const duration=dt*k.samples2000;
 let s=stream;
 if(!profile.allocated)s=randomizeRadioStream(s,'profile-allocate-0x562ba0',allocateSeed);
 if(s===null)throw new RadioSignalError('randomize-seed-required','no radio stream');// unreachable from the receiver bank
 if(source===null){
  const n=k.capacity;
  return Object.freeze({profile:Object.freeze({...profile,allocated:true,dt,duration,activeCount:n,cursor:n,samples:Object.freeze(new Array<number>(n).fill(0))}),stream:s});
 }
 const {period,start}=pulsarProfileTiming(source,jd);
 const resolved=dt<k.resolvedFraction*period;// setb at 0x562c87
 const width=pulsarPulseWidth(source.s50);
 const flux=pulsarFluxRecord(source);
 let normalization=pulsarFluxAt(flux,k.reference400);
 if(k.normalizationThreshold>normalization)normalization=k.normalizationFloor;// jbe at 0x562d0b keeps NaN
 const dispersion=source.s4c*k.dispersionScale,reference=k.one/(k.reference400*k.reference400);
 // 0x562d48..0x562ef4
 const cursor=new RadioRandomCursor(s),samples=new Array<number>(k.capacity);
 let t=period*k.half,cycle=0,previous=0,calls=0,uniforms=0;
 const draw=(mean:number)=>{const d=cursor.poisson(mean);calls++;uniforms+=d.uniforms;return Math.fround(d.value);};
 for(let i=0;i<k.capacity;i++){
  t+=dt;
  const x=t/period;let f=frac(x);
  if(resolved){
   if(f>k.half)f-=k.one;
   const z=(f*period)/width,a=pulsarIntervalArea(z,previous);
   samples[i]=!(k.resolvedFraction<Math.abs(f))?draw(normalization*a):0;
   previous=z;
  }else{
   samples[i]=draw(normalization*roundNearestEven(x-cycle));
   cycle=roundNearestEven(x);previous=0;
  }
 }
 const activeCount=pulsarActiveCount(dt,period);
 // [W] The wrap loops of 0x563047..0x563061 never terminate for N < 1; N > 2000 would read past the buffer.
 if(!(activeCount>=1&&activeCount<=k.capacity))throw new RadioSignalError('profile-active-count',`N=${activeCount}`);
 if(calls>0)cursor.record({kind:'profile-poisson',calls,uniforms});
 return Object.freeze({profile:Object.freeze({allocated:true,period,start,dispersion,reference,flux,dt,duration,activeCount,cursor:activeCount,
  normalization,resolved,samples:Object.freeze(samples)}),stream:cursor.finish()});
}

export type PulsarSample=Readonly<{profile:PulsarProfile;value:number}>;
function built(profile:PulsarProfile){
 if(profile.samples===null||profile.activeCount===null||profile.cursor===null||profile.dt===null)throw new RadioSignalError('profile-not-built','sampling before any build');
 return {samples:profile.samples,n:profile.activeCount,cursor:profile.cursor,dt:profile.dt};
}
/** Shift bound keeping cursor + shift inside int32 (native add esi,eax would wrap). */
export const PULSAR_SHIFT_LIMIT=2**31-1-PULSAR_PROFILE_CONSTANTS.capacity;

/** 0x562ff4. Exactly Single 400 (or unordered, jne not taken) returns the raw Single at the cursor. Otherwise index =
 * cursor + Round(delay/dt), wrapped into 1..N, and value = (flux(f) · sample) / normalization. */
export function currentPulsarSample(profile:PulsarProfile,f:number):number{
 const b=built(profile);
 if(f===PULSAR_PROFILE_CONSTANTS.raw400||Number.isNaN(f))return b.samples[b.cursor-1];
 if(profile.flux===null||profile.normalization===null||!Number.isFinite(profile.normalization)||profile.normalization===0)
  throw new RadioSignalError('profile-normalization-domain',`normalization=${profile.normalization}`);
 const shift=roundNearestEven(pulsarDispersionDelay(profile,f)/b.dt);
 if(!Number.isFinite(shift)||Math.abs(shift)>PULSAR_SHIFT_LIMIT)throw new RadioSignalError('sample-shift-domain',`shift=${shift}`);
 const index=((((b.cursor+shift-1)%b.n)+b.n)%b.n)+1;// same result as the add/sub loops
 return (pulsarFluxAt(profile.flux,f)*b.samples[index-1])/profile.normalization;
}
/** 0x562fb0: cursor += 1, back to 1 above N, then the current sample. */
export function nextPulsarSample(profile:PulsarProfile,f:number):PulsarSample{
 const b=built(profile),cursor=b.cursor+1>b.n?1:b.cursor+1,next=Object.freeze({...profile,cursor});
 return Object.freeze({profile:next,value:currentPulsarSample(next,f)});
}
