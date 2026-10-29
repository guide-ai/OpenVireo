// Radio-private random stream for the receiver signal chain (R-RX1). CLEA_VEO.exe SHA-256 781bc970…c54c.
// Native: one global System RandSeed. Randomize 0x4035a0 seeds it from the QueryPerformanceCounter low DWORD (else
// GetTickCount); Random 0x4035e4 steps low32(state·0x08088405+1) and scales by the Double 2^-32 cell 0x5ae760. The
// Poisson initializer 0x55f0d0 with EDX=0 calls Randomize (RS-08); the sampler 0x55f0f4 is the one already ported in
// acquisition.ts (RS-09). See docs/RADIO-RECEIVER-SIGNAL.md.
// [W] The web keeps a radio-private stream: every Randomize site needs a caller-supplied uint32 in place of the
// counter; no host clock, ambient random source or default seed is read. Interleaving with other native consumers of
// the global stream (optical labs, VCL callbacks) is not known and not modelled.
import {AcquisitionError,poissonDraw} from './acquisition';

/** Refusal kinds shared by radioThermal, radioPulsarProfile and radioReceiver. All are web admission limits (W); where
 * the native path would raise an FPU exception, loop or read unowned memory, that behaviour is not claimed. */
export type RadioSignalErrorKind=
 |'options-missing'|'options-domain'|'clock-required'
 |'profile-period'|'profile-active-count'|'profile-not-built'|'profile-normalization-domain'
 |'integral-boundary'|'integral-domain'
 |'poisson-mean-domain'|'poisson-numeric'|'random-budget'|'randomize-seed-required'
 |'thermal-domain'|'beam-not-prepared'|'sample-shift-domain'
 |'receiver-unavailable'|'close-refused';
export class RadioSignalError extends Error{
 constructor(readonly kind:RadioSignalErrorKind,readonly detail:string){super(`Radio receiver signal: ${kind} (${detail})`);this.name='RadioSignalError';}
}

/** 0x572376: receiver FormCreate (+0x448 cache). 0x562ba0: first profile buffer allocation (+0x34 cache). */
export type RadioRandomizeSite='receiver-create-0x572376'|'profile-allocate-0x562ba0';
/** 0x574107: receiver background draw. 0x562e6c/0x562ec4: profile build draws (aggregated per build). */
export type RadioPoissonSite='receiver-background-0x574107'|'profile-build-0x562e6c'|'profile-build-0x562ec4';
export type RadioRandomEvent=Readonly<
 |{kind:'randomize';site:RadioRandomizeSite;seed:number}
 |{kind:'poisson';site:'receiver-background-0x574107';slot:number;mean:number;value:number;uniforms:number}
 |{kind:'profile-poisson';calls:number;uniforms:number}>;
export type RadioRandomStream=Readonly<{
 /** RandSeed after the last uniform. */
 state:number;
 /** Uniforms consumed since the stream was first seeded. */
 uniforms:number;
 /** Events ever appended; the ledger keeps only the most recent RADIO_RANDOM_POLICY.ledgerLimit. */
 events:number;
 ledger:readonly RadioRandomEvent[];
}>;
export const RADIO_RANDOM_POLICY=Object.freeze({ledgerLimit:256,poissonDrawBudget:10_000});

const isSeed=(seed:unknown):seed is number=>typeof seed==='number'&&Number.isInteger(seed)&&seed>=0&&seed<=0xffff_ffff;
function append(ledger:readonly RadioRandomEvent[],added:readonly RadioRandomEvent[]):readonly RadioRandomEvent[]{
 const all=[...ledger,...added];return Object.freeze(all.slice(Math.max(0,all.length-RADIO_RANDOM_POLICY.ledgerLimit)));
}

/** Randomize at a recovered site. The stream may be null before the first site; the supplied seed is required. */
export function randomizeRadioStream(stream:RadioRandomStream|null,site:RadioRandomizeSite,suppliedSeed:number|undefined):RadioRandomStream{
 if(!isSeed(suppliedSeed))throw new RadioSignalError('randomize-seed-required',site);
 const event:RadioRandomEvent=Object.freeze({kind:'randomize',site,seed:suppliedSeed});
 return Object.freeze({state:suppliedSeed,uniforms:stream?.uniforms??0,events:(stream?.events??0)+1,ledger:append(stream?.ledger??[],[event])});
}

/** Mutable cursor used inside one transition; finish() returns the frozen stream. Exported for the radio core modules
 * (radioPulsarProfile); internal, not a UI or public API. */
export class RadioRandomCursor{
 private state:number;private uniforms:number;private events:number;private readonly base:readonly RadioRandomEvent[];
 private readonly added:RadioRandomEvent[]=[];
 constructor(stream:RadioRandomStream|null){
  if(stream===null)throw new RadioSignalError('randomize-seed-required','no Randomize site has seeded the radio stream');
  this.state=stream.state;this.uniforms=stream.uniforms;this.events=stream.events;this.base=stream.ledger;
 }
 /** One 0x55f0f4 draw through acquisition.poissonDraw. A finite negative mean follows the native product branch (value 0
  * after one uniform; Front R1); NaN, infinite or > 1e6 means are still refused atomically (browser limits). */
 poisson(mean:number):Readonly<{value:number;uniforms:number}>{
  let draw;
  try{draw=poissonDraw(mean,this.state,RADIO_RANDOM_POLICY.poissonDrawBudget,'native');}
  catch(error){
   if(error instanceof AcquisitionError){
    if(error.code==='mean')throw new RadioSignalError('poisson-mean-domain',String(mean));
    if(error.code==='budget')throw new RadioSignalError('random-budget',String(mean));
    throw new RadioSignalError('poisson-numeric',`${error.code} at mean ${mean}`);
   }
   throw error;
  }
  this.state=draw.seed;this.uniforms+=draw.draws;
  return Object.freeze({value:draw.value,uniforms:draw.draws});
 }
 record(event:RadioRandomEvent){this.added.push(Object.freeze(event));this.events++;}
 finish():RadioRandomStream{return Object.freeze({state:this.state,uniforms:this.uniforms,events:this.events,ledger:append(this.base,this.added)});}
}

/** Single background-site draw on an explicit stream (used by tests and by the receiver signal). */
export function radioPoisson(stream:RadioRandomStream|null,mean:number,slot:number):Readonly<{value:number;uniforms:number;stream:RadioRandomStream}>{
 const cursor=new RadioRandomCursor(stream),draw=cursor.poisson(mean);
 cursor.record({kind:'poisson',site:'receiver-background-0x574107',slot,mean,value:draw.value,uniforms:draw.uniforms});
 return Object.freeze({value:draw.value,uniforms:draw.uniforms,stream:cursor.finish()});
}
