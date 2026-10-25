import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {PulsarRecord} from './radioPulsarCatalog';
import {
 EMPTY_RADIO_RECORD_HEADER,RADIO_RECEIVER_COMPILED_OPTIONS,RADIO_RECEIVER_CONSTANTS,RADIO_RECEIVER_LITERALS,RADIO_RECEIVER_STEP_VALUES,activateReceiver,addReceiverChannel,
 armRecordCapture,clearReceiverMarks,closeReceiver,copyLiveRadioOptions,createRadioReceiverBank,endReceiverMarkDrag,openMainReceiver,overwriteSourceBufferFromPulsarList,paintReceiver,
 queryCloseReceiver,reassociateReceiverOnClock,receiverMarkDown,receiverMarkMove,receiverMarkUp,receiverTimerGate,receiverTimerTick,receiverWindowMoved,stepFrequency,
 stepFrequencyIncrement,stepHorizontal,stepVertical,toggleReceive,toggleReceiverAlign,toggleRecordByte,
 type RadioReceiver,type RadioReceiverBank,type RadioReceiverEvent,type RadioReceiverFrame,type RadioReceiverOptions,type RadioReceiverResult,
} from './radioReceiver';
import {appendReceiverTrace,createReceiverTrace} from './radioReceiverDisplay';

// Synthetic records and seeds only. Numeric controls: RECEIVER-SIGNAL-CONTROLS.json and INDEPENDENT-MATH-HOLDOUTS.json
// (independent Decimal/LCG math). Lifecycle expectations follow the cited listings; they are not a native runtime trace.
const rec=(o:Partial<PulsarRecord>={}):PulsarRecord=>Object.freeze({primaryName:'J0000+00',legacyName:'',ra:6,dec:10,x2a:0.5,x34:0,x3e:2451545,
 s48:Math.fround(30),s4c:Math.fround(10),s50:Math.fround(5),s54:Math.fround(8),s58:Math.fround(4),s5c:Math.fround(2),...o});
const A=rec(),POINT=Object.freeze({ra:6,dec:10}),JD=2451545.25;
const ok=(r:RadioReceiverResult)=>{if(!r.ok)throw new Error(`${r.error.kind}: ${r.error.detail}`);return r;};
const kindOf=(r:RadioReceiverResult)=>r.ok?null:r.error.kind;
const bankOf=(options:RadioReceiverOptions|null=RADIO_RECEIVER_COMPILED_OPTIONS)=>ok(createRadioReceiverBank(options)).bank;
/** Main open on record A (hit at separation 0), activated, optionally with children. */
function opened(children=0,catalog=[A]){
 let b=ok(openMainReceiver(bankOf(),{catalog,pointing:POINT,createSeed:1})).bank;
 for(let i=0;i<children;i++)b=ok(addReceiverChannel(b,{createSeed:3+i})).bank;
 for(let s=0;s<=children;s++)b=ok(activateReceiver(b,s)).bank;
 return b;
}
// [W] synthetic monotonic supplied scalar, not a native Time fraction; see the midnight replay test.
let clock=1000;
const nextNow=()=>(clock+=1e-6);
function started(children=0,catalog=[A]){const b=opened(children,catalog);return ok(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:2})).bank;}
const tick=(b:RadioReceiverBank,jd:number|null=JD)=>ok(receiverTimerTick(b,{now:nextNow(),jd}));
function deepFrozen(v:unknown,seen=new Set<unknown>()):boolean{
 if(typeof v!=='object'||v===null||seen.has(v))return true;seen.add(v);
 return Object.isFrozen(v)&&Object.values(v).every(x=>deepFrozen(x,seen));
}
const randomizeSeeds=(b:RadioReceiverBank)=>b.random!.ledger.flatMap(e=>e.kind==='randomize'?[`${e.site}:${e.seed}`]:[]);

describe('receiver FormCreate 0x5721d8 and options',()=>{
 it('starts from the compiled defaults and caches them per receiver',()=>{
  const b=ok(openMainReceiver(bankOf(),{catalog:null,pointing:POINT,createSeed:1})).bank,m=b.slots[0]!;
  expect(m).toMatchObject({index:0,frequencyMHz:600,stepMHz:100,stepIndex:5,verticalGain:1,horizontal:4,horizontalSnapshot:4,sweepWidth:400,
   position:null,batch:6,interval:null,sensitivity:1,area:1,displayGain:1,offset:0,searchRadius:0,beamSigma:null,receiving:false,
   stopPending:null,inSource:null,identifiedName:null,audio:false,alternation:1,lastTick:null});
  expect(m.backgroundFactor).toBe(5e10);expect(m.skyThermal.temperatureK).toBe(50);expect(m.detectorThermal.temperatureK).toBe(50);
  expect(b.profile).toMatchObject({allocated:false,period:0,samples:null});
  expect(randomizeSeeds(b)).toEqual(['receiver-create-0x572376:1']);
  expect(b.sourceBuffer).toEqual({record:null,primaryNameCleared:true});// miss on a null catalog clears only the name byte
 });
 it('refuses a missing or out-of-domain options record atomically',()=>{
  const none=bankOf(null),snapshot=JSON.stringify(none);
  expect(kindOf(openMainReceiver(none,{catalog:[A],pointing:POINT,createSeed:1}))).toBe('options-missing');
  expect(JSON.stringify(none)).toBe(snapshot);
  for(const bad of [{dishDiameterMeters:1.5},{dishDiameterMeters:20000},{gain924:0.1},{background928:2**31},{temperature930:Number.NaN},{provenance:'x'}])
   expect(kindOf(createRadioReceiverBank({...RADIO_RECEIVER_COMPILED_OPTIONS,...bad} as RadioReceiverOptions))).toBe('options-domain');
  expect(kindOf(openMainReceiver(bankOf(),{catalog:[A],pointing:POINT}))).toBe('randomize-seed-required');
 });
 it('child receivers alias the profile, reseed the shared stream and cache the options current at their own FormCreate',()=>{
  let b=opened(0);
  b=ok(copyLiveRadioOptions(b,{provenance:'supplied-record',dishDiameterMeters:200,gain924:Math.fround(2),background928:7,beamWidth92c:0,temperature930:Math.fround(80)})).bank;
  b=ok(addReceiverChannel(b,{createSeed:9})).bank;
  const [m,c]=b.slots;
  expect(m).toMatchObject({sensitivity:1,area:1,backgroundFactor:5e10});expect(m!.detectorThermal.temperatureK).toBe(50);
  expect(c).toMatchObject({index:1,sensitivity:2,area:4,backgroundFactor:7e10,displayGain:2,sourceAttached:true,offset:m!.offset});
  expect(c!.detectorThermal.temperatureK).toBe(80);expect(c!.skyThermal.temperatureK).toBe(50);
  expect(randomizeSeeds(b)).toEqual(['receiver-create-0x572376:1','receiver-create-0x572376:9']);
  // Live options feed the beam: activation now uses dish 200 for both receivers.
  b=ok(activateReceiver(ok(activateReceiver(b,0)).bank,1)).bank;
  expect(b.slots[0]!.beamRadius).toBe(b.slots[1]!.beamRadius);
  expect(b.slots[0]!.beamRadius!).toBeCloseTo(opened(0).slots[0]!.beamRadius!/2,15);
  // A started child keeps the compiled 50 K sky record: only the main runs the source refresh.
  const s=started(1);expect(s.slots[0]!.skyThermal.temperatureK).toBe(30);expect(s.slots[1]!.skyThermal.temperatureK).toBe(50);
 });
});

describe('beam and spatial factor',()=>{
 it('derives radius, sigma and the 3σ search radius from 366e6/(f·1e6) at the defaults; positive +0x92c uses 0.5·92c',()=>{
  const m=opened(0).slots[0]!;
  expect(m.beamRadius!).toBeCloseTo(0.0061*57.29577951308232,14);expect(m.beamSigma).toBe(m.beamRadius!/RADIO_RECEIVER_CONSTANTS.sigmaDivisor);
  expect(m.searchRadius).toBe(m.beamSigma!*3);
  let b=ok(copyLiveRadioOptions(opened(0),{...RADIO_RECEIVER_COMPILED_OPTIONS,provenance:'supplied-record',beamWidth92c:Math.fround(1)})).bank;
  b=ok(activateReceiver(b,0)).bank;expect(b.slots[0]!.searchRadius).toBe(0.5);
  b=ok(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:2})).bank;expect(b.slots[0]!.spatial).toBe(1);
 });
 it('uses exp(−(o/σ)²/2) with the live non-positive +0x92c (beam control at o = σ)',()=>{
  const b=opened(0),m=b.slots[0]!,moved:RadioReceiverBank={...b,slots:[{...m,offset:m.beamSigma!},null,null]};
  const s=ok(toggleReceive(moved,{jd:JD,now:nextNow(),allocateSeed:2})).bank;
  expect(s.slots[0]!.spatial!).toBeCloseTo(0.6065306597126334236037995349911804534419181354871869556828921587350565,15);
 });
 it('refuses a refresh that needs σ when no refresh wrote it (dish 0); Receive Paints before the source refresh',()=>{
  // R-RX2: Mode runs Paint (its refresh writes the beam) before the source refresh, so an unactivated receiver with a
  // nonzero dish now has σ; with dish 0 the beam is skipped and σ stays unset.
  const b=ok(openMainReceiver(bankOf(),{catalog:[A],pointing:POINT,createSeed:1})).bank;
  expect(ok(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:2})).bank.slots[0]!.beamSigma).not.toBeNull();
  const zero=ok(openMainReceiver(bankOf({...RADIO_RECEIVER_COMPILED_OPTIONS,dishDiameterMeters:0}),{catalog:[A],pointing:POINT,createSeed:1})).bank;
  expect(kindOf(toggleReceive(zero,{jd:JD,now:nextNow(),allocateSeed:2}))).toBe('beam-not-prepared');
 });
});

describe('Receive, source refresh and the random draw order',()=>{
 it('allocates and Randomizes the profile at the first refresh even for a null source',()=>{
  const b=ok(activateReceiver(ok(openMainReceiver(bankOf(),{catalog:null,pointing:POINT,createSeed:1})).bank,0)).bank;
  expect(kindOf(toggleReceive(b,{jd:JD,now:nextNow()}))).toBe('randomize-seed-required');
  const s=ok(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:77})).bank,m=s.slots[0]!;
  expect(randomizeSeeds(s)).toEqual(['receiver-create-0x572376:1','profile-allocate-0x562ba0:77']);
  expect(s.random!.ledger.some(e=>e.kind==='profile-poisson')).toBe(false);
  expect(s.profile).toMatchObject({allocated:true,activeCount:2000,cursor:2000});
  expect(m).toMatchObject({identifiedName:RADIO_RECEIVER_CONSTANTS.noSourceIdentifier,spatial:0,position:400,interval:0.01,batch:6,stopPending:false,receiving:true});
  expect(m.skyThermal.temperatureK).toBe(50);expect(s.timerEnabled).toBe(true);
  expect(kindOf(toggleReceive(b,{jd:null,now:nextNow(),allocateSeed:77}))).toBe('clock-required');
 });
 it('runs main then slot 1 then slot 2 in every batch iteration (H = 4, batch 6)',()=>{
  const s=started(2),t=tick(s);
  const order=t.bank.random!.ledger.slice(-18).map(e=>e.kind==='poisson'?e.slot:-1);
  expect(order).toEqual([0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2]);
  expect(t.frames.map(f=>f.slot)).toEqual(order);
  // ledger order around the start: create 1, create 3, create 4, allocate 2, profile draws, then background draws
  expect(randomizeSeeds(t.bank)).toEqual(['receiver-create-0x572376:1','receiver-create-0x572376:3','receiver-create-0x572376:4','profile-allocate-0x562ba0:2']);
 });
 it('feeds the background with the stored 1e9 multiplier (mean control at 600 MHz, 50 K, A = 1, H = 4, K = 5e10)',()=>{
  const b=ok(activateReceiver(ok(openMainReceiver(bankOf(),{catalog:null,pointing:POINT,createSeed:1})).bank,0)).bank;
  const t=tick(ok(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:2})).bank);
  const means=t.bank.random!.ledger.flatMap(e=>e.kind==='poisson'?[e.mean]:[]);
  expect(means).toHaveLength(6);
  for(const mean of means)expect(Math.abs(mean/1.635933340405305456191037194946727527827394771101540109863424468909129-1)).toBeLessThan(1e-13);
  for(const f of t.frames)expect(f).toMatchObject({inSource:false,sourceTerm:0,signal:f.background,row:110-f.background});
 });
 it('sums source and background then clamps at zero (never subtracts)',()=>{
  // Synthetic negative 600 MHz flux makes the source term negative.
  let b=started(0,[rec({s58:Math.fround(-8)})]);const frames:RadioReceiverFrame[]=[];
  for(let i=0;i<40;i++){const t=tick(b);b=t.bank;frames.push(...t.frames);}
  expect(frames.some(f=>f.sourceTerm<0&&f.signal===0)).toBe(true);
  for(const f of frames){const sum=f.sourceTerm+f.background;expect(f.signal).toBe(sum>0?sum:0);}
 });
});

describe('in-source test and shared-buffer coupling',()=>{
 it('is strict: pointer set and +0x405 > +0x51f; equality and NaN are outside; children copy the flag',()=>{
  const s=started(1),m=s.slots[0]!;
  for(const [offset,expected] of [[m.searchRadius,false],[Number.NaN,false],[m.searchRadius/2,true]] as const){
   const t=tick({...s,slots:[{...m,offset},s.slots[1],null]});
   expect(t.frames.map(f=>f.inSource)).toEqual(new Array(12).fill(expected));
  }
 });
 it('same-name overwrite with different numbers does not rebuild the profile or the sky record',()=>{
  const s=started(0),before=s.profile!;
  const o=ok(overwriteSourceBufferFromPulsarList(s,{catalog:[rec({x2a:0.7,s48:Math.fround(90)})],pointing:POINT})).bank;
  expect(o.sourceBuffer.record!.x2a).toBe(0.7);expect(o.slots[0]).toEqual(s.slots[0]);
  const t=tick(o);
  expect(t.events.some(e=>e.kind==='refresh')).toBe(false);
  expect(t.bank.profile!.period).toBe(before.period);expect(t.bank.slots[0]!.skyThermal.temperatureK).toBe(30);
 });
 it('a different name rebuilds from the live buffer inside the master signal and resets the sweep',()=>{
  const s=tick(started(1)).bank;expect(s.slots[0]!.position).toBe(5);// mid-sweep
  const o=ok(overwriteSourceBufferFromPulsarList(s,{catalog:[rec({primaryName:'J0001+00',x2a:0.25,s48:Math.fround(60)})],pointing:POINT})).bank;
  const t=tick(o),kinds=t.events.map(e=>e.kind);
  expect(t.events.filter(e=>e.kind==='refresh')).toEqual([{kind:'refresh',cause:'coupling',attached:true,name:'J0001+00'}]);
  // The nested refresh writes position := N inside the first main frame, so that frame ends the sweep.
  // R-RX2: the source refresh resets the main trace store first (trace-reset precedes refresh).
  expect(kinds.slice(0,4)).toEqual(['timer-batch','trace-reset','refresh','sweep-reset']);
  expect(t.frames.slice(0,2).map(f=>[f.slot,f.position])).toEqual([[0,400],[1,0]]);
  expect(t.bank.profile!.period).toBe(0.25);expect(t.bank.slots[0]!.skyThermal.temperatureK).toBe(60);
  expect(t.bank.slots[1]!.skyThermal.temperatureK).toBe(50);
 });
 it('a cleared name rebuilds once from the stale aliased record under an empty name',()=>{
  const s=started(0);
  const c=ok(overwriteSourceBufferFromPulsarList(s,{catalog:[],pointing:POINT})).bank;
  expect(c.sourceBuffer.record).toMatchObject({primaryName:'',x2a:0.5});expect(c.sourceBuffer.primaryNameCleared).toBe(true);
  const t1=tick(c),t2=tick(t1.bank);
  expect(t1.events.filter(e=>e.kind==='refresh')).toEqual([{kind:'refresh',cause:'coupling',attached:true,name:''}]);
  expect(t1.bank.slots[0]!.identifiedName).toBe('');expect(t1.bank.slots[0]!.skyThermal.temperatureK).toBe(30);
  expect(t2.events.some(e=>e.kind==='refresh')).toBe(false);
 });
 it('clock reassociation is skipped without a main; a miss detaches but keeps the offset and the stale sky record',()=>{
  const none=bankOf(),r=ok(reassociateReceiverOnClock(none,{catalog:[A],pointing:POINT}));
  expect(r.events).toEqual([{kind:'reassociation-skipped'}]);expect(r.bank.sourceBuffer).toEqual(none.sourceBuffer);
  const s=started(0),moved:RadioReceiverBank={...s,slots:[{...s.slots[0]!,offset:0.125},null,null]};
  const miss=ok(reassociateReceiverOnClock(moved,{catalog:[A],pointing:{ra:12,dec:-40}})).bank;
  expect(miss.slots[0]).toMatchObject({sourceAttached:false,offset:0.125});expect(miss.slots[0]!.skyThermal.temperatureK).toBe(30);
  expect(miss.sourceBuffer.record!.primaryName).toBe('');
  const t=tick(miss);expect(t.events.some(e=>e.kind==='refresh')).toBe(false);expect(t.frames.every(f=>!f.inSource)).toBe(true);
  const hit=ok(reassociateReceiverOnClock(miss,{catalog:[A],pointing:POINT})).bank;
  expect(hit.slots[0]).toMatchObject({sourceAttached:true,offset:0});expect(hit.sourceBuffer.record).toEqual(A);
 });
});

describe('timer batch 0x574ad4 and the sweep lifecycle',()=>{
 it('gates ticks closer than Extended 3.5e-7 day, including a backward clock',()=>{
  expect(receiverTimerGate(null,0)).toBe(true);expect(receiverTimerGate(10,10+3e-7)).toBe(false);expect(receiverTimerGate(10,10+4e-7)).toBe(true);
  const s=started(0),last=s.slots[0]!.lastTick!;
  for(const now of [last,last-1,last+3e-7]){const t=ok(receiverTimerTick(s,{now,jd:JD}));expect(t.events).toEqual([{kind:'timer-gated'}]);expect(t.bank.random).toBe(s.random);}
  expect(ok(receiverTimerTick(s,{now:last+4e-7,jd:JD})).frames).toHaveLength(6);
  expect(kindOf(receiverTimerTick(s,{now:Number.NaN,jd:JD}))).toBe('clock-required');
 });
 it('gates a native-like time-of-day replay across local midnight without touching stream, profile or stamp',()=>{
  // Gate algebra under a native-like replay; not a runtime or recovery-time witness.
  const s=ok(toggleReceive(opened(0),{jd:JD,now:0.99999,allocateSeed:2})).bank;
  expect(s.slots[0]!.lastTick).toBe(0.99999);
  let b=s;
  for(const now of [0.00001,0.5,0.99999,0.99999+3e-7]){
   const t=ok(receiverTimerTick(b,{now,jd:JD}));
   expect(t.events,`${now}`).toEqual([{kind:'timer-gated'}]);expect(t.frames).toEqual([]);
   expect(t.bank.slots[0]).toEqual(s.slots[0]);expect(t.bank.random).toBe(s.random);expect(t.bank.profile).toBe(s.profile);
   b=t.bank;
  }
  const t=ok(receiverTimerTick(b,{now:0.9999904,jd:JD}));
  expect(t.frames).toHaveLength(6);expect(t.bank.slots[0]!.lastTick).toBe(0.9999904);expect(t.bank.random).not.toBe(s.random);
 });
 it('[S/I] k/86400000 Time fractions: stamp D−32 recovers at the maximal Time, D−31 cannot; ticks across midnight stay gated; closing the main is the exit',()=>{
  // Vectors: TIME-DIVISOR-AND-MIDNIGHT-CONTROLS.json (Single 0x40d0dc = 86400000). Independent integer/Fraction math,
  // not a native oracle; gate algebra only, not a runtime or recovery-time witness.
  const D=86400000,T=(ms:number)=>ms/D,max=T(D-1);
  for(const [last,now,admitted] of [[D-32,D-1,true],[D-31,D-1,false],[D-1,D-1,false],[D-31,0,false],[12345,12375,false],[12345,12376,true]] as const)
   expect(receiverTimerGate(T(last),T(now)),`${last}→${now}`).toBe(admitted);
  for(let ms=D-31;ms<=D-1;ms++)expect(receiverTimerGate(T(ms),max),`${ms}`).toBe(false);
  const r=ok(toggleReceive(opened(0),{jd:JD,now:T(D-32),allocateSeed:2})).bank,rt=ok(receiverTimerTick(r,{now:max,jd:JD}));
  expect(rt.frames).toHaveLength(6);expect(rt.bank.slots[0]!.lastTick).toBe(max);expect(rt.bank.random).not.toBe(r.random);
  const s=ok(toggleReceive(opened(0),{jd:JD,now:T(D-31),allocateSeed:2})).bank;
  expect(s.slots[0]!.lastTick).toBe(T(D-31));
  let b=s;
  for(const now of [max,T(0),T(1),T(D-32),max]){// same day, across midnight, next day
   const t=ok(receiverTimerTick(b,{now,jd:JD}));
   expect(t.events,`${now}`).toEqual([{kind:'timer-gated'}]);expect(t.frames).toEqual([]);
   expect(t.bank.slots[0]).toEqual(s.slots[0]);expect(t.bank.random).toBe(s.random);expect(t.bank.profile).toBe(s.profile);
   b=t.bank;
  }
  const c=ok(closeReceiver(b,0));
  expect(c.events).toEqual([{kind:'closed',slot:0},{kind:'send-0x53a'}]);
  expect(c.bank).toMatchObject({slots:[null,null,null],profile:null,timerEnabled:false});
  expect(c.bank.sourceBuffer).toBe(s.sourceBuffer);expect(c.bank.random).toBe(s.random);
 });
 it('alternates batch 1 and 2 at H = 16 (+0x498 xor 1)',()=>{
  let b=opened(2);
  for(let i=0;i<2;i++)b=ok(stepHorizontal(b,0,'up')).bank;
  expect(b.slots.map(r=>r!.horizontal)).toEqual([16,16,16]);
  b=ok(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:2})).bank;expect(b.slots[0]!.batch).toBe(1);
  const batches:number[]=[];let first:readonly number[]=[];
  for(let i=0;i<4;i++){const t=tick(b);b=t.bank;batches.push(t.frames.length/3);if(i===0)first=t.frames.map(f=>f.slot);}
  expect(batches).toEqual([1,2,1,2]);expect(first).toEqual([0,1,2]);
 });
 it('enters at column N+1, resets to 0 and sweeps 1..N',()=>{
  let b=started(0);const positions:number[]=[];let resets=0;
  for(let i=0;i<70;i++){const t=tick(b);b=t.bank;for(const f of t.frames)positions.push(f.position);resets+=t.events.filter(e=>e.kind==='sweep-reset').length;}
  expect(positions[0]).toBe(401);expect(positions.slice(1,401)).toEqual(Array.from({length:400},(_,i)=>i+1));
  expect(positions[401]).toBe(1);expect(resets).toBe(positions.filter(p=>p>=400).length);expect(resets).toBe(2);
 });
 it('finishes the current batch after a stop at column N, then admits a new Receive that clears the stale flag',()=>{
  let b=started(1);
  do b=tick(b).bank;while(!(b.slots[0]!.position!>=390&&b.slots[0]!.position!<400));
  const p=b.slots[0]!.position!;
  b=ok(toggleReceive(b,{jd:JD,now:nextNow()})).bank;
  expect(b.slots.map(r=>r&&[r.receiving,r.stopPending])).toEqual([[false,true],[false,true],null]);
  expect(kindOf(toggleReceive(b,{jd:JD,now:nextNow()}))).toBe('receiver-unavailable');
  let finishing:ReturnType<typeof tick>|null=null;
  while(b.timerEnabled){finishing=tick(b);b=finishing.bank;}
  const mainFrames=finishing!.frames.filter(f=>f.slot===0).map(f=>f.position);
  expect(mainFrames[mainFrames.length-1]).toBeGreaterThan(400);// iterations after the finish still ran
  const finished=finishing!.events.filter(e=>e.kind==='sweep-finished'&&e.slot===0).length;
  expect(finished).toBe(mainFrames.filter(x=>x>=400).length);
  expect(finishing!.frames.filter(f=>f.slot===1).length).toBe(mainFrames.length);// background draws continue for the child
  expect(p).toBeLessThan(400);
  expect(tick(b).events).toEqual([{kind:'timer-disabled'}]);
  expect(b.slots[0]).toMatchObject({receiving:false,stopPending:true});
  const again=ok(toggleReceive(b,{jd:JD,now:nextNow()})).bank;
  expect(again.slots[0]).toMatchObject({receiving:true,stopPending:false,position:400});expect(again.timerEnabled).toBe(true);
  expect(again.slots[1]).toMatchObject({receiving:true,stopPending:false});
  expect(tick(again).frames[0].position).toBe(401);
 });
 it('refuses a coupling rebuild without a JD atomically',()=>{
  const s=started(0),o=ok(overwriteSourceBufferFromPulsarList(s,{catalog:[rec({primaryName:'J0002+00'})],pointing:POINT})).bank;
  const snapshot=JSON.stringify(o);
  expect(kindOf(receiverTimerTick(o,{now:nextNow(),jd:null}))).toBe('clock-required');expect(JSON.stringify(o)).toBe(snapshot);
 });
 it('[W] a coupling rebuild refused by the Poisson mean domain stays atomic; Stop cannot finish; closing the main recovers',()=>{
  // P = 0.04 with dt = 0.01 gives 0.2P ≤ dt < 0.3P: the first resolved sample has a negative mean.
  const s=started(0),o=ok(overwriteSourceBufferFromPulsarList(s,{catalog:[rec({primaryName:'J0003+00',x2a:0.04})],pointing:POINT})).bank;
  const snapshot=JSON.stringify(o);
  for(let i=0;i<2;i++){expect(kindOf(receiverTimerTick(o,{now:nextNow(),jd:JD}))).toBe('poisson-mean-domain');expect(JSON.stringify(o)).toBe(snapshot);}
  const stop=ok(toggleReceive(o,{jd:JD,now:nextNow()})).bank;
  expect(stop.slots[0]).toMatchObject({receiving:false,stopPending:true});expect(stop.timerEnabled).toBe(true);
  expect(kindOf(receiverTimerTick(stop,{now:nextNow(),jd:JD}))).toBe('poisson-mean-domain');// the sweep cannot finish
  expect(kindOf(toggleReceive(stop,{jd:JD,now:nextNow()}))).toBe('receiver-unavailable');
  const c=ok(closeReceiver(stop,0));
  expect(c.events).toEqual([{kind:'closed',slot:0},{kind:'send-0x53a'}]);
  expect(c.bank).toMatchObject({slots:[null,null,null],profile:null,timerEnabled:false});
  expect(c.bank.sourceBuffer).toBe(o.sourceBuffer);expect(c.bank.random).toBe(o.random);
 });
});

describe('channels, scales and close',()=>{
 it('Add Channel needs a main, is unavailable while the timer runs and fills slots 1 then 2',()=>{
  expect(kindOf(addReceiverChannel(bankOf(),{createSeed:1}))).toBe('receiver-unavailable');
  expect(kindOf(addReceiverChannel(started(0),{createSeed:1}))).toBe('receiver-unavailable');
  const b=opened(2);expect(b.slots.map(r=>r?.index)).toEqual([0,1,2]);
  expect(kindOf(addReceiverChannel(b,{createSeed:1}))).toBe('receiver-unavailable');
 });
 it('steps the horizontal scale 0.5..16 (master propagates) and the vertical gain 0.125..8',()=>{
  let b=opened(1);
  for(let i=0;i<3;i++)b=ok(stepHorizontal(b,0,'down')).bank;
  expect(b.slots.map(r=>r?.horizontal)).toEqual([0.5,0.5,undefined]);
  expect(ok(stepHorizontal(b,0,'down')).events).toEqual([{kind:'at-limit',slot:0,control:'horizontal'}]);
  expect(kindOf(stepHorizontal(started(0),0,'up'))).toBe('receiver-unavailable');
  let v=opened(0);
  for(let i=0;i<3;i++)v=ok(stepVertical(v,0,'up')).bank;
  expect(v.slots[0]).toMatchObject({verticalGain:8,displayGain:8});
  expect(ok(stepVertical(v,0,'up')).events).toEqual([{kind:'at-limit',slot:0,control:'vertical'}]);
  for(let i=0;i<6;i++)v=ok(stepVertical(v,0,'down')).bank;
  expect(v.slots[0]!.verticalGain).toBe(0.125);
  expect(ok(stepVertical(started(0),0,'up')).bank.slots[0]!.verticalGain).toBe(2);// allowed while receiving (no recording)
 });
 it('refuses closing slot 1 while slot 2 exists and cascades a main close (slot 2, then 1)',()=>{
  const s=started(2);
  expect(queryCloseReceiver(s,1)).toEqual({canClose:false,text:RADIO_RECEIVER_LITERALS.closeRefusalText,caption:RADIO_RECEIVER_LITERALS.closeRefusalCaption});
  expect(kindOf(closeReceiver(s,1))).toBe('close-refused');
  const c=ok(closeReceiver(s,0));
  expect(c.events).toEqual([{kind:'closed',slot:2},{kind:'closed',slot:1},{kind:'closed',slot:0},{kind:'send-0x53a'}]);
  expect(c.bank).toMatchObject({slots:[null,null,null],profile:null,timerEnabled:false});
  expect(c.bank.sourceBuffer).toBe(s.sourceBuffer);expect(c.bank.random).toBe(s.random);
  const re=ok(activateReceiver(ok(openMainReceiver(c.bank,{catalog:[A],pointing:POINT,createSeed:12})).bank,0)).bank;
  expect(re.profile!.allocated).toBe(false);
  expect(kindOf(toggleReceive(re,{jd:JD,now:nextNow()}))).toBe('randomize-seed-required');
  const child=ok(closeReceiver(ok(closeReceiver(s,2)).bank,1)).bank;expect(child.slots.map(r=>r?.index??null)).toEqual([0,null,null]);
 });
});

describe('R-RX2 display state: parameter refresh, trace store, Freq/Incr steps and Add/Close ends',()=>{
 // [W] contract checks of the recovered order (docs/RADIO-RECEIVER-MONITOR.md), not native oracles.
 const B=rec({legacyName:'B0000+00'});
 const HPBW_TEXT="   Aperture: 100 Meters    Beam (HPBW): 0 Deg 41.9'";
 const stop=(b:RadioReceiverBank)=>ok(toggleReceive(b,{jd:JD,now:nextNow()}));
 const finish=(b:RadioReceiverBank)=>{let s=stop(b).bank;while(s.timerEnabled)s=tick(s).bank;return s;};
 it('activation writes the aperture/HPBW text, +0x583 (F4) and the titles',()=>{
  const b=opened(2,[B]),[m,c1,c2]=b.slots;
  expect(m).toMatchObject({inSource:true,title:'Pulsar B0000+00',apertureText:HPBW_TEXT});
  expect(c1).toMatchObject({inSource:true,title:'Receiver 2 (Slave)',apertureText:HPBW_TEXT});expect(c2!.title).toBe('Receiver 3 (Slave)');
  const away=ok(activateReceiver(ok(openMainReceiver(bankOf(),{catalog:[B],pointing:{ra:12,dec:-40},createSeed:1})).bank,0)).bank.slots[0]!;
  expect(away).toMatchObject({inSource:false,title:'No Pulsar in Beam!'});
  // Positive +0x92c: the effective-FOV text replaces the HPBW text.
  const fov=ok(activateReceiver(ok(copyLiveRadioOptions(opened(0,[B]),{...RADIO_RECEIVER_COMPILED_OPTIONS,provenance:'supplied-record',beamWidth92c:Math.fround(1.5)})).bank,0)).bank;
  expect(fov.slots[0]!.apertureText).toBe('   Aperture: 100 Meters    Effective FOV: 1.50 Deg');
 });
 it('clears every lastX only on a main title change while not receiving',()=>{
  let b=started(1,[B]);for(let i=0;i<3;i++)b=tick(b).bank;
  expect(b.slots.map(r=>r?.trace.lastX)).toEqual([17,17,undefined]);
  // Reassociation misses while receiving: the next refresh rewrites the title but keeps lastX.
  b=ok(reassociateReceiverOnClock(b,{catalog:[B],pointing:{ra:12,dec:-40}})).bank;
  const v=ok(stepVertical(b,0,'up'));
  expect(v.bank.slots[0]!.title).toBe('No Pulsar in Beam!');expect(v.events.some(e=>e.kind==='trace-cleared')).toBe(false);
  expect(v.bank.slots[0]!.trace.lastX).toBe(17);
  // A child refresh never clears; Stop's main refresh with an unchanged title does not either.
  const s=stop(v.bank);expect(s.events.some(e=>e.kind==='trace-cleared')).toBe(false);expect(s.bank.slots[0]!.trace.lastX).toBe(17);
  // Back in the beam while stopped: the title changes and every lastX is cleared.
  const hit=ok(reassociateReceiverOnClock(s.bank,{catalog:[B],pointing:POINT})).bank,p=ok(paintReceiver(hit,0));
  expect(p.events).toEqual([{kind:'trace-cleared',cause:'title'},{kind:'beam',slot:0,changed:true},{kind:'paint',slot:0}]);
  expect(p.bank.slots.map(r=>r?.trace.lastX)).toEqual([0,0,undefined]);
  expect(p.bank.slots[0]!.trace.rows).toEqual(hit.slots[0]!.trace.rows);// rows are kept; only lastX is cleared
 });
 it('the frame rewrites the main title when +0x583 changes, without a lastX reset',()=>{
  const s=started(0,[B]),m=s.slots[0]!;
  const t=tick({...s,slots:[{...m,offset:m.searchRadius*2},null,null]});
  expect(t.bank.slots[0]!.title).toBe('No Pulsar in Beam!');expect(t.events.some(e=>e.kind==='trace-cleared')).toBe(false);
  expect(t.bank.slots[0]!.trace.lastX).toBe(5);
 });
 it('resets only the main trace inside the source refresh; a refused Receive leaves it untouched',()=>{
  let b=started(1,[B]);
  const [m,c]=b.slots;
  expect(m!.trace).toMatchObject({maxIndex:399,dt:0.01,lastX:0});expect(m!.trace.rows).toEqual(new Array(400).fill(0));
  expect(c!.trace).toMatchObject({maxIndex:399,dt:null,lastX:0});expect(c!.trace.rows.every(v=>v===null)).toBe(true);
  b=finish(tick(b).bank);
  expect(b.slots[0]!.trace.lastX).toBeGreaterThan(0);
  const snapshot=JSON.stringify(b);
  expect(kindOf(toggleReceive(b,{jd:null,now:nextNow()}))).toBe('clock-required');expect(JSON.stringify(b)).toBe(snapshot);
 });
 it('appends rows 1..399 as Words with lastX; erasePosition differs from position on a coupling frame',()=>{
  let b=started(1,[B]);const t=tick(b);b=t.bank;
  expect(t.frames.map(f=>[f.slot,f.erasePosition,f.position,f.wrapErase])).toEqual([[0,401,401,false],[1,0,0,false],
   [0,1,1,false],[1,1,1,false],[0,2,2,false],[1,2,2,false],[0,3,3,false],[1,3,3,false],[0,4,4,false],[1,4,4,false],[0,5,5,false],[1,5,5,false]]);
  let expected=createReceiverTrace(400);
  for(const f of t.frames.filter(x=>x.slot===1))expected=appendReceiverTrace(expected,f.position,f.row);
  expect(b.slots[1]!.trace.rows).toEqual(expected.rows);expect(b.slots[1]!.trace.lastX).toBe(5);
  expect(b.slots[0]!.trace.rows.slice(1,6)).toEqual(t.frames.filter(f=>f.slot===0).slice(1).map(f=>f.row!&0xffff));
  // Sweep to the wrap: position 400 erases the left band and is not stored (x > 399).
  let wrap:RadioReceiverFrame|undefined;
  while(!wrap){const n=tick(b);b=n.bank;wrap=n.frames.find(f=>f.slot===0&&f.position===400);}
  expect(wrap.wrapErase).toBe(true);expect(b.slots[0]!.trace.lastX).toBeLessThanOrEqual(399);
  const o=ok(overwriteSourceBufferFromPulsarList(b,{catalog:[rec({primaryName:'J0001+00',legacyName:'B0001+00'})],pointing:POINT})).bank;
  const first=tick(o).frames[0];
  expect(first.erasePosition).not.toBe(first.position);expect(first.position).toBe(400);expect(first.wrapErase).toBe(true);
 });
 it('steps Freq MHz within 400..1400 (beep at a limit, no refresh), annotates only while receiving, per receiver',()=>{
  let b=opened(1,[B]);
  const down=[...Array(3)].map(()=>{const r=ok(stepFrequency(b,0,'down'));b=r.bank;return r;});
  expect(down.map(r=>r.events.map(e=>e.kind))).toEqual([['step','beam'],['step','beam'],['at-limit']]);
  expect(b.slots[0]!.frequencyMHz).toBe(400);expect(b.slots[1]!.frequencyMHz).toBe(600);
  for(let i=0;i<12;i++)b=ok(stepFrequency(b,0,'up')).bank;
  expect(b.slots[0]!.frequencyMHz).toBe(1400);
  expect(ok(stepFrequency(b,0,'up')).events).toEqual([{kind:'at-limit',slot:0,control:'frequency'}]);
  // A candidate below 400 clamps to 400 (450 − 100).
  const c=ok(stepFrequency({...b,slots:[{...b.slots[0]!,frequencyMHz:450},b.slots[1],null]},0,'down')).bank;expect(c.slots[0]!.frequencyMHz).toBe(400);
  const s=started(1,[B]),r=ok(stepFrequency(s,1,'up'));
  expect(r.events.map(e=>e.kind)).toEqual(['step','beam','annotation']);expect(r.bank.timerEnabled).toBe(true);
  expect(r.bank.slots[1]!.frequencyMHz).toBe(700);expect(r.bank.slots[0]!.frequencyMHz).toBe(600);
  // 0.01 accumulation is binary64 (WEB-RX-NUM-01): 600 − 0.01 three times.
  let f=opened(0,[B]);for(let i=0;i<4;i++)f=ok(stepFrequencyIncrement(f,0,'down')).bank;
  expect(f.slots[0]).toMatchObject({stepIndex:1,stepMHz:0.01});
  for(let i=0;i<3;i++)f=ok(stepFrequency(f,0,'down')).bank;
  expect(f.slots[0]!.frequencyMHz).toBe(600-0.01-0.01-0.01);
 });
 it('bounds Freq Incr. to 1..5 with the exact binary64 step table',()=>{
  let b=opened(0,[B]);
  expect(ok(stepFrequencyIncrement(b,0,'up')).events).toEqual([{kind:'at-limit',slot:0,control:'frequency-step'}]);
  const seen:number[]=[];
  for(let i=0;i<4;i++){b=ok(stepFrequencyIncrement(b,0,'down')).bank;seen.push(b.slots[0]!.stepMHz);}
  expect(seen).toEqual([10,1,0.1,0.01]);expect(RADIO_RECEIVER_STEP_VALUES.slice(1)).toEqual([0.01,0.1,1,10,100]);
  expect(ok(stepFrequencyIncrement(b,0,'down')).events).toEqual([{kind:'at-limit',slot:0,control:'frequency-step'}]);
 });
 it('tracks the main Add enable: slot 2, Receive, the finish and a child close',()=>{
  let b=opened(1,[B]);expect(b.slots[0]!.addEnabled).toBe(true);
  b=ok(addReceiverChannel(b,{createSeed:7})).bank;expect(b.slots[0]!.addEnabled).toBe(false);
  expect(kindOf(addReceiverChannel(b,{createSeed:8}))).toBe('receiver-unavailable');
  b=ok(closeReceiver(b,2)).bank;expect(b.slots[0]!.addEnabled).toBe(true);
  b=ok(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:2})).bank;expect(b.slots.map(r=>r?.addEnabled)).toEqual([false,false,undefined]);
  b=finish(b);expect(b.slots[0]!.addEnabled).toBe(true);
 });
 it('Add Channel after a finish with both slots used creates nothing (correction of the both-slots refusal)',()=>{
  let b=opened(2,[B]);b=ok(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:2})).bank;b=finish(b);
  expect(b.slots[0]!.addEnabled).toBe(true);
  const r=ok(addReceiverChannel(b,{createSeed:9}));
  expect(r.events).toEqual([{kind:'add-nothing'}]);expect(r.bank.slots).toEqual(b.slots);expect(r.bank.random).toBe(b.random);
 });
 it('paintReceiver refreshes and reports a paint; repeated paints are idempotent',()=>{
  const b=opened(1,[B]),p1=ok(paintReceiver(b,1)),p2=ok(paintReceiver(p1.bank,1));
  expect(p1.events).toEqual([{kind:'beam',slot:1,changed:true},{kind:'paint',slot:1}]);
  expect(p2.bank.slots).toEqual(p1.bank.slots);expect(p1.bank.slots).toEqual(b.slots);
 });
 it('Receive Paints the main and every child, then the frames; a refused Receive emits nothing',()=>{
  const r=ok(toggleReceive(opened(1,[B]),{jd:JD,now:nextNow(),allocateSeed:2}));
  expect(r.events.filter(e=>e.kind==='paint'||e.kind==='trace-reset'||e.kind==='receive-started').map(e=>e.kind==='paint'?`paint${e.slot}`:e.kind))
   .toEqual(['paint0','trace-reset','receive-started','paint1']);
 });
});

describe('R-RX3 manual marks: MouseDown/Move/Up, FormDblClick, Paint tail and the Receive reset',()=>{
 // [W] contract checks of the recovered call order (docs/RADIO-RECEIVER-MARKS.md, CONTRACTS.json M3–M6), not native
 // oracles. "Constructed" banks patch fields the public API cannot reach (structural cases); they are labelled as such.
 const B=rec({legacyName:'B0000+00'});
 type Patch=Partial<Pick<RadioReceiver,'marks'|'markDrag'|'horizontalSnapshot'>>;
 /** Constructed bank: per-slot patches (structural cases only). */
 const patched=(b:RadioReceiverBank,patches:readonly (Patch|null)[]):RadioReceiverBank=>Object.freeze({...b,
  slots:Object.freeze(b.slots.map((r,i)=>r&&Object.freeze({...r,...(patches[i]??{})}))) as unknown as RadioReceiverBank['slots']});
 const withMarks=(b:RadioReceiverBank,first:readonly number[],second:readonly number[])=>patched(b,[0,1,2].map(i=>({marks:Object.freeze([first[i],second[i]] as const)})));
 const lines=(events:readonly RadioReceiverEvent[])=>events.flatMap(e=>e.kind==='mark-line'?[[e.slot,e.selector,e.x,e.outcome]]:[]);
 const labelEvents=(events:readonly RadioReceiverEvent[])=>events.flatMap(e=>e.kind==='mark-label'?[[e.slot,e.selector,e.x,e.text]]:[]);
 const paints=(events:readonly RadioReceiverEvent[])=>events.flatMap(e=>e.kind==='paint'?[e.slot]:[]);
 const marksOf=(b:RadioReceiverBank)=>b.slots.map(r=>r?[...r.marks]:null);
 const finish=(b:RadioReceiverBank)=>{let s=ok(toggleReceive(b,{jd:JD,now:nextNow()})).bank;while(s.timerEnabled)s=tick(s).bank;return s;};

 it('FormCreate leaves both marks −1 and both drag flags false [W]',()=>{
  expect(opened(2).slots.map(r=>[r!.marks,r!.markDrag])).toEqual([[[-1,-1],[false,false]],[[-1,-1],[false,false]],[[-1,-1],[false,false]]]);
 });
 it('LOCAL-FIRST: code 0 sets +0x586 and attempts only the origin: line, own label, other label (unset draws nothing)',()=>{
  const b=opened(2),r=ok(receiverMarkDown(b,2,0,100));
  expect(r.events).toEqual([{kind:'mark-line',slot:2,selector:0,x:100,outcome:'stored'},{kind:'mark-label',slot:2,selector:0,x:100,text:'1.00 Sec'}]);
  expect(marksOf(r.bank)).toEqual([[-1,-1],[-1,-1],[100,-1]]);expect(r.bank.slots[2]!.markDrag).toEqual([true,false]);
  expect(r.bank.slots[0]).toEqual(b.slots[0]);expect(r.bank.slots[1]).toEqual(b.slots[1]);
  expect(r.bank.random).toBe(b.random);expect(r.bank.profile).toBe(b.profile);expect(r.bank.sourceBuffer).toBe(b.sourceBuffer);
 });
 it('x = N = 400 is a stored line and a label although the trace store ends at 399',()=>{
  const r=ok(receiverMarkDown(opened(0),0,0,400));
  expect(r.bank.slots[0]!.trace.maxIndex).toBe(399);expect(r.bank.slots[0]!.marks).toEqual([400,-1]);
  expect(labelEvents(r.events)).toEqual([[0,0,400,'4.00 Sec']]);
 });
 it('COLLISION-BROADCAST: second at 10 from slot 1 attempts 1, 0, 2; the main collides; stored seconds [80, 10, 10]; labels use the requested x',()=>{
  const b=withMarks(opened(2),[10,20,30],[80,80,80]),r=ok(receiverMarkDown(b,1,1,10));
  expect(lines(r.events)).toEqual([[1,1,10,'stored'],[0,1,10,'collision'],[2,1,10,'stored']]);
  expect(r.bank.slots.map(x=>x!.marks[1])).toEqual([80,10,10]);
  expect(labelEvents(r.events)).toEqual([[1,1,10,'0.10 Sec'],[1,0,20,'0.20 Sec'],[0,1,10,'0.10 Sec'],[0,0,10,'0.10 Sec'],[2,1,10,'0.10 Sec'],[2,0,30,'0.30 Sec']]);
  expect(r.bank.slots.map(x=>x!.markDrag)).toEqual([[false,false],[false,true],[false,false]]);// only the origin's +0x585
 });
 it('COLLISION-LABEL (constructed snapshot 2): the first stays 10 while its label attempt shows the requested 100',()=>{
  const b=patched(opened(0),[{marks:Object.freeze([10,100] as const),horizontalSnapshot:2}]),r=ok(receiverMarkDown(b,0,0,100));
  expect(lines(r.events)).toEqual([[0,0,100,'collision']]);expect(r.bank.slots[0]!.marks).toEqual([10,100]);
  expect(labelEvents(r.events)).toEqual([[0,0,100,'0.500 Sec'],[0,1,100,'0.500 Sec']]);
 });
 it('OWN-SNAPSHOT (constructed [1, 2, 4], structural: the API cannot build it): each target labels with its own snapshot',()=>{
  const b=patched(withMarks(opened(2),[1,2,3],[-1,-1,-1]),[{horizontalSnapshot:1},{horizontalSnapshot:2},{horizontalSnapshot:4}]);
  const r=ok(receiverMarkDown(b,0,1,100));
  expect(labelEvents(r.events).filter(l=>l[1]===1).map(l=>[l[0],l[3]])).toEqual([[0,'0.2500 Sec'],[1,'0.500 Sec'],[2,'1.00 Sec']]);
 });
 it('TIMER-DOWN: refused before any write with the same bank object; Move/Up have no timer test (lingering flag across Receive, structural)',()=>{
  const s=started(1),r=ok(receiverMarkDown(s,0,0,100));
  expect(r.bank).toBe(s);expect(r.events).toEqual([{kind:'mark-gated',slot:0}]);
  // A Down whose release never arrived leaves +0x586 set; Receive resets the indices but not the flags.
  const down=ok(receiverMarkDown(opened(0),0,0,10)).bank,rx=ok(toggleReceive(down,{jd:JD,now:nextNow(),allocateSeed:2})).bank;
  expect(rx.slots[0]).toMatchObject({marks:[-1,-1],markDrag:[true,false]});expect(rx.timerEnabled).toBe(true);
  const mv=ok(receiverMarkMove(rx,0,{left:true,right:false},100));
  expect(lines(mv.events)).toEqual([[0,0,100,'timer']]);expect(labelEvents(mv.events)).toEqual([[0,0,100,'1.00 Sec']]);
  const up=ok(receiverMarkUp(mv.bank,0,0,100));
  expect(lines(up.events)).toEqual([[0,0,100,'timer']]);expect(up.bank.slots[0]).toMatchObject({marks:[-1,-1],markDrag:[false,false]});
  expect(up.bank.random).toBe(rx.random);expect(up.bank.profile).toBe(rx.profile);
 });
 it('MOVE-PRIORITY (constructed both flags): the first branch wins; no matching flag/bit returns the same bank',()=>{
  const b=patched(opened(1),[{markDrag:Object.freeze([true,true] as const)}]);
  expect(lines(ok(receiverMarkMove(b,0,{left:true,right:true},50)).events)).toEqual([[0,0,50,'stored']]);
  expect(lines(ok(receiverMarkMove(b,0,{left:false,right:true},60)).events)).toEqual([[0,1,60,'stored'],[1,1,60,'stored']]);
  const none=ok(receiverMarkMove(opened(1),0,{left:true,right:true},50));expect(none.events).toEqual([]);
 });
 it('Up: code 1 clears the origin +0x585 after its own attempt, then broadcasts; a mismatched button does nothing',()=>{
  let b=ok(receiverMarkDown(opened(2),2,1,50)).bank;
  expect(b.slots[2]!.markDrag).toEqual([false,true]);
  const mismatch=ok(receiverMarkUp(b,2,0,70));expect(mismatch.bank).toBe(b);expect(mismatch.events).toEqual([]);
  const up=ok(receiverMarkUp(b,2,1,70));b=up.bank;
  expect(lines(up.events).map(l=>l[0])).toEqual([2,0,1]);expect(b.slots.map(r=>r!.marks[1])).toEqual([70,70,70]);
  expect(b.slots[2]!.markDrag).toEqual([false,false]);
  expect(ok(endReceiverMarkDrag(b,2,1)).bank).toBe(b);// unchanged flag: same bank
 });
 it('refuses non-Int32 x, an invalid code and an absent slot atomically',()=>{
  const b=opened(0);
  for(const r of [receiverMarkDown(b,0,0,1.5),receiverMarkDown(b,0,0,2**31),receiverMarkMove(b,0,{left:true,right:false},Number.NaN),receiverMarkUp(b,0,0,Infinity),
   receiverMarkDown(b,1,0,10),clearReceiverMarks(b,2),endReceiverMarkDrag(b,1,0),receiverMarkDown(b,0,2 as 0,10)])expect(kindOf(r)).toBe('receiver-unavailable');
 });
 it('CLEAR-PRIORITY: seconds cleared and Painted in origin 1, main 0, child 2 order; the next Clear clears only the origin first',()=>{
  const b=withMarks(opened(2),[10,20,30],[40,40,40]),c1=ok(clearReceiverMarks(b,1));
  expect(c1.events.filter(e=>e.kind==='mark-cleared')).toEqual([{kind:'mark-cleared',slot:1,selector:1},{kind:'mark-cleared',slot:0,selector:1},{kind:'mark-cleared',slot:2,selector:1}]);
  expect(paints(c1.events)).toEqual([1,0,2]);expect(marksOf(c1.bank)).toEqual([[10,-1],[20,-1],[30,-1]]);
  // Each Paint's tail redraws the remaining first mark and its label.
  expect(lines(c1.events)).toEqual([[1,0,20,'stored'],[0,0,10,'stored'],[2,0,30,'stored']]);
  const c2=ok(clearReceiverMarks(c1.bank,1));
  expect(paints(c2.events)).toEqual([1]);expect(marksOf(c2.bank)).toEqual([[10,-1],[-1,-1],[30,-1]]);
  expect(c2.events.map(e=>e.kind)).toEqual(['mark-cleared','beam','paint']);
 });
 it('CLEAR-ORIGIN: the origin without a second clears only its first; other windows keep their seconds',()=>{
  const c=ok(clearReceiverMarks(withMarks(opened(2),[10,20,30],[40,-1,40]),1));
  expect(paints(c.events)).toEqual([1]);expect(marksOf(c.bank)).toEqual([[10,40],[-1,-1],[30,40]]);
 });
 it('a second Clear from the main Paints every present child even without a second mark; nothing set gives marks-none',()=>{
  const c=ok(clearReceiverMarks(withMarks(opened(2),[-1,-1,-1],[40,-1,-1]),0));
  expect(paints(c.events)).toEqual([0,1,2]);expect(c.events.filter(e=>e.kind==='mark-cleared').map(e=>e.slot)).toEqual([0,1,2]);
  const b=opened(1),n=ok(clearReceiverMarks(b,1));expect(n.bank).toBe(b);expect(n.events).toEqual([{kind:'marks-none',slot:1}]);
 });
 it('Clear runs each Paint as a full refresh; each paint event keeps the receiver as that stage drew it (title change after a reassociation miss)',()=>{
  let b=finish(tick(tick(started(1,[B])).bank).bank);
  const lastX=b.slots.map(r=>r?.trace.lastX);expect(lastX[1]).toBeGreaterThan(0);
  b=ok(reassociateReceiverOnClock(b,{catalog:[B],pointing:{ra:12,dec:-40}})).bank;expect(b.slots[0]!.title).toBe('Pulsar B0000+00');
  b=ok(receiverMarkUp(ok(receiverMarkDown(b,1,1,50)).bank,1,1,50)).bank;
  const c=ok(clearReceiverMarks(b,1));
  expect(c.events.map(e=>e.kind)).toEqual(['mark-cleared','beam','paint','mark-cleared','trace-cleared','beam','paint']);
  const [p1,p0]=c.events.flatMap(e=>e.kind==='paint'?[e]:[]);
  expect(p1.painted!.trace.lastX).toBe(lastX[1]);// the child was drawn before the main's refresh cleared every lastX
  expect(c.bank.slots[1]!.trace.lastX).toBe(0);expect(c.bank.slots[0]!.title).toBe('No Pulsar in Beam!');
  expect(p0.painted).toMatchObject({title:'No Pulsar in Beam!',marks:[-1,-1]});expect(p0.painted!.trace.lastX).toBe(0);
  expect(c.bank.random).toBe(b.random);expect(c.bank.profile).toBe(b.profile);
  expect(deepFrozen(c.events)).toBe(true);expect(deepFrozen(c.bank)).toBe(true);
 });
 it('Paint tail: line(first), line(second), label(first), label(second) after the drawing; repeated Paints are idempotent',()=>{
  let b=ok(receiverMarkUp(ok(receiverMarkDown(opened(0),0,0,100)).bank,0,0,100)).bank;
  b=ok(receiverMarkUp(ok(receiverMarkDown(b,0,1,300)).bank,0,1,300)).bank;
  const p=ok(paintReceiver(b,0));
  expect(p.events).toEqual([{kind:'beam',slot:0,changed:true},{kind:'paint',slot:0},
   {kind:'mark-line',slot:0,selector:0,x:100,outcome:'stored'},{kind:'mark-line',slot:0,selector:1,x:300,outcome:'stored'},
   {kind:'mark-label',slot:0,selector:0,x:100,text:'1.00 Sec'},{kind:'mark-label',slot:0,selector:1,x:300,text:'3.00 Sec'}]);
  expect(p.bank.slots).toEqual(b.slots);expect(ok(paintReceiver(p.bank,0)).events).toEqual(p.events);
 });
 it('RECEIVE-RESET: every receiver gets −1 before its Paint (no mark tail draws); drag flags are not written',()=>{
  let b=ok(receiverMarkDown(opened(1),0,0,100)).bank;b=ok(receiverMarkDown(b,1,1,200)).bank;
  expect(marksOf(b)).toEqual([[100,200],[-1,200],null]);
  const r=ok(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:2}));
  expect(marksOf(r.bank)).toEqual([[-1,-1],[-1,-1],null]);
  expect(r.bank.slots.map(x=>x?.markDrag??null)).toEqual([[true,false],[false,true],null]);
  expect(r.events.some(e=>e.kind==='mark-line'||e.kind==='mark-label')).toBe(false);
  expect(paints(r.events)).toEqual([0,1]);
  // Stop does not reset the marks (none are set while receiving); the finish keeps them −1.
  expect(marksOf(finish(r.bank))).toEqual([[-1,-1],[-1,-1],null]);
 });
 it('drag sequences write only marks, flags and labels: no RNG, profile, buffer, trace, title, beam or in-source change',()=>{
  const b=opened(2,[B]);let x=b;
  for(const step of [()=>receiverMarkDown(x,1,1,20),()=>receiverMarkMove(x,1,{left:false,right:true},40),()=>receiverMarkMove(x,1,{left:false,right:true},45),
   ()=>receiverMarkUp(x,1,1,45),()=>receiverMarkDown(x,0,0,120),()=>receiverMarkMove(x,0,{left:true,right:false},130),()=>receiverMarkUp(x,0,0,130)])x=ok(step()).bank;
  expect(marksOf(x)).toEqual([[130,45],[-1,45],[-1,45]]);
  expect(x.random).toBe(b.random);expect(x.profile).toBe(b.profile);expect(x.sourceBuffer).toBe(b.sourceBuffer);
  for(const i of [0,1,2]){
   const before=b.slots[i]!,after=x.slots[i]!;
   expect(after.trace).toBe(before.trace);
   expect([after.title,after.apertureText,after.beamRadius,after.beamSigma,after.inSource,after.searchRadius]).toEqual([before.title,before.apertureText,before.beamRadius,before.beamSigma,before.inSource,before.searchRadius]);
  }
 });
});

describe('R-RX5 AL-* Align: FormCreate, AlignDisp, toggle, layout, message 3, Add, Activate, Receive and the main finish',()=>{
 // [W] contract checks of the recovered order (docs/RADIO-RECEIVER-ALIGN.md, CONTRACTS.json AL-*), not native oracles.
 const placed=(events:readonly RadioReceiverEvent[])=>events.flatMap(e=>e.kind==='window-placed'?[`${e.cause}${e.slot}`]:[]);
 const kinds=(events:readonly RadioReceiverEvent[])=>events.map(e=>e.kind==='window-placed'?`${e.cause}${e.slot}`:e.kind);
 const finish=(b:RadioReceiverBank)=>{let s=ok(toggleReceive(b,{jd:JD,now:nextNow()})).bank;while(s.timerEnabled)s=tick(s).bank;return s;};

 it('AL-INIT: false/false before any window [W]; every FormCreate writes on with the guard clear; AlignDisp only from a main refresh',()=>{
  const none=bankOf();expect(none.align).toEqual({on:false,guard:false});
  const o=ok(openMainReceiver(none,{catalog:[A],pointing:POINT,createSeed:1})).bank;
  expect(o.align).toEqual({on:true,guard:false});expect(o.slots[0]!.alignLabel).toBe('');
  // The main's activation lays out with no child (only the guard is set), then its refresh writes 'Yes'.
  const a=ok(activateReceiver(o,0));expect(kinds(a.events)).toEqual(['trace-cleared','beam']);// first title: the R-RX2 lastX reset
  expect(a.bank.align).toEqual({on:true,guard:true});expect(a.bank.slots[0]!.alignLabel).toBe('Yes');
  // Children never write +0x3bc.
  const c=ok(activateReceiver(ok(addReceiverChannel(a.bank,{createSeed:3})).bank,1)).bank;
  expect(c.slots[1]!.alignLabel).toBe('');expect(c.slots[0]!.alignLabel).toBe('Yes');
  expect(deepFrozen(c)).toBe(true);
 });
 it('AL-TOGGLE: On → Off refreshes the main (No) and places nothing; Off → On with the guard clear places 2 then 1 and sets it; set, nothing',()=>{
  const b=opened(2);expect(b.align).toEqual({on:true,guard:false});// the children's activations cleared it
  const t1=ok(toggleReceiverAlign(b));
  expect(t1.events).toEqual([{kind:'align-toggled',on:false},{kind:'beam',slot:0,changed:true}]);
  expect(t1.bank.align).toEqual({on:false,guard:false});expect(t1.bank.slots[0]!.alignLabel).toBe('No');
  const t2=ok(toggleReceiverAlign(t1.bank));
  expect(kinds(t2.events)).toEqual(['align-toggled','beam','layout2','layout1']);
  expect(t2.bank.align).toEqual({on:true,guard:true});expect(t2.bank.slots[0]!.alignLabel).toBe('Yes');
  const t3=ok(toggleReceiverAlign(t2.bank));expect(t3.bank.align).toEqual({on:false,guard:true});expect(placed(t3.events)).toEqual([]);
  const t4=ok(toggleReceiverAlign(t3.bank));expect(placed(t4.events)).toEqual([]);expect(t4.bank.align).toEqual({on:true,guard:true});
  expect(t4.bank.slots.slice(1).map(r=>r!.alignLabel)).toEqual(['','']);
  expect(kindOf(toggleReceiverAlign(bankOf()))).toBe('receiver-unavailable');
 });
 it('AL-LAYOUT with no child only sets the guard; Align is admitted while receiving (0x575c6c does not touch it)',()=>{
  let b=ok(toggleReceiverAlign(opened(0))).bank;expect(b.align).toEqual({on:false,guard:true});
  b=ok(receiverWindowMoved(b,0)).bank;expect(b.align).toEqual({on:false,guard:false});
  const t=ok(toggleReceiverAlign(b));expect(placed(t.events)).toEqual([]);expect(t.bank.align).toEqual({on:true,guard:true});
  const s=started(1),r=ok(toggleReceiverAlign(s));
  expect(r.bank.timerEnabled).toBe(true);expect(r.bank.slots[0]!.alignLabel).toBe('No');expect(r.events.some(e=>e.kind==='trace-cleared')).toBe(false);
  expect(r.bank.random).toBe(s.random);expect(r.bank.profile).toBe(s.profile);
 });
 it('AL-MOVE: off clears the guard and places nothing; on re-snaps 2 then 1 only when slot 1 exists and leaves the guard',()=>{
  const b=opened(2),set=ok(activateReceiver(b,0)).bank;expect(set.align.guard).toBe(true);
  const m1=ok(receiverWindowMoved(set,2));expect(placed(m1.events)).toEqual(['move2','move1']);expect(m1.bank.align).toEqual({on:true,guard:true});
  const m2=ok(receiverWindowMoved(b,0));expect(placed(m2.events)).toEqual(['move2','move1']);expect(m2.bank.align).toEqual({on:true,guard:false});
  expect(ok(receiverWindowMoved(opened(0),0)).events).toEqual([]);
  const off=ok(toggleReceiverAlign(set)).bank,m3=ok(receiverWindowMoved(off,1));
  expect(m3.events).toEqual([]);expect(m3.bank.align).toEqual({on:false,guard:false});
  expect(kindOf(receiverWindowMoved(opened(1),2))).toBe('receiver-unavailable');
  expect(m1.bank.slots).toEqual(set.slots);expect(m1.bank.random).toBe(set.random);expect(m1.bank.profile).toBe(set.profile);
 });
 it('AL-ADD: the child is placed whatever Align is, then the layout; FormCreate leaves AlignDisp stale until the next main refresh',()=>{
  const b=ok(toggleReceiverAlign(opened(0))).bank,a=ok(addReceiverChannel(b,{createSeed:3}));
  expect(kinds(a.events)).toEqual(['created','add1','layout1']);
  expect(a.bank.align).toEqual({on:true,guard:true});expect(a.bank.slots[0]!.alignLabel).toBe('No');
  const act=ok(activateReceiver(a.bank,1)).bank;expect(act.slots[0]!.alignLabel).toBe('No');expect(act.align.guard).toBe(false);
  expect(ok(stepVertical(act,0,'up')).bank.slots[0]!.alignLabel).toBe('Yes');
  // Slot 2 under Align on: placed, Add disabled, layout 2 then 1.
  expect(kinds(ok(addReceiverChannel(act,{createSeed:4})).events)).toEqual(['created','add2','layout2','layout1']);
 });
 it('AL-ADD add-nothing: the layout still runs (guard clear: 2 then 1; set: nothing); slots and stream unchanged',()=>{
  let f=finish(started(2));expect(f.align.guard).toBe(true);
  expect(ok(addReceiverChannel(f,{createSeed:9})).events).toEqual([{kind:'add-nothing'}]);
  f=ok(activateReceiver(f,1)).bank;
  const n=ok(addReceiverChannel(f,{createSeed:9}));
  expect(kinds(n.events)).toEqual(['add-nothing','layout2','layout1']);expect(n.bank.slots).toEqual(f.slots);expect(n.bank.random).toBe(f.random);
 });
 it('AL-ACTIVATE: a child clears the guard; the main lays out (2 then 1) before its refresh',()=>{
  const b=opened(2),m=ok(activateReceiver(b,0));
  expect(kinds(m.events)).toEqual(['layout2','layout1','beam']);expect(m.bank.align.guard).toBe(true);
  expect(kinds(ok(activateReceiver(m.bank,0)).events)).toEqual(['beam']);
  expect(ok(activateReceiver(m.bank,2)).bank.align).toEqual({on:true,guard:false});
 });
 it('AL-RECEIVE: start lays out after Paint and before the source refresh; Stop has none; the main finish lays out before record-finished',()=>{
  const r=ok(toggleReceive(opened(1),{jd:JD,now:nextNow(),allocateSeed:2})),k=kinds(r.events);
  expect(k.slice(k.indexOf('paint'),k.indexOf('refresh')+1)).toEqual(['paint','layout1','trace-reset','refresh']);
  expect(r.bank.align.guard).toBe(true);
  expect(placed(ok(toggleReceive(r.bank,{jd:JD,now:nextNow()})).events)).toEqual([]);
  let s=ok(armRecordCapture(ok(toggleRecordByte(opened(1))).bank,EMPTY_RADIO_RECORD_HEADER)).bank;
  s=ok(toggleReceive(s,{jd:JD,now:nextNow(),allocateSeed:2})).bank;
  s=ok(activateReceiver(s,1)).bank;expect(s.align.guard).toBe(false);
  s=ok(toggleReceive(s,{jd:JD,now:nextNow()})).bank;
  let fin:string[]=[];
  while(s.timerEnabled){const t=tick(s);s=t.bank;if(t.events.some(e=>e.kind==='record-finished'))fin=kinds(t.events);}
  const i=fin.indexOf('sweep-finished');
  expect(fin.slice(i,i+3)).toEqual(['sweep-finished','layout1','record-finished']);
  expect(fin.filter(x=>x.startsWith('layout'))).toEqual(['layout1']);// later main finishes in the batch find the guard set
 });
 it('science invariance: the same seeds with and without interleaved toggles and moves give equal frames, draws, rows, traces and marks',()=>{
  const runIt=(interleave:boolean)=>{
   let c=5000;const now=()=>(c+=1e-6);
   const ops=[(x:RadioReceiverBank)=>toggleReceiverAlign(x),(x:RadioReceiverBank)=>receiverWindowMoved(x,2),(x:RadioReceiverBank)=>receiverWindowMoved(x,0),
    (x:RadioReceiverBank)=>toggleReceiverAlign(x),(x:RadioReceiverBank)=>receiverWindowMoved(x,1)];
   let b=ok(armRecordCapture(ok(toggleRecordByte(opened(2))).bank,EMPTY_RADIO_RECORD_HEADER)).bank,k=0;
   const mix=()=>{if(interleave)b=ok(ops[k++%ops.length](b)).bank;};
   const frames:RadioReceiverFrame[]=[];
   mix();b=ok(toggleReceive(b,{jd:JD,now:now(),allocateSeed:2})).bank;
   for(let i=0;i<30;i++){mix();const t=ok(receiverTimerTick(b,{now:now(),jd:JD}));b=t.bank;frames.push(...t.frames);}
   mix();b=ok(toggleReceive(b,{jd:JD,now:now()})).bank;
   while(b.timerEnabled){mix();const t=ok(receiverTimerTick(b,{now:now(),jd:JD}));b=t.bank;frames.push(...t.frames);}
   mix();b=ok(receiverMarkUp(ok(receiverMarkDown(b,1,1,120)).bank,1,1,120)).bank;mix();
   b=ok(receiverMarkUp(ok(receiverMarkDown(b,0,0,30)).bank,0,0,30)).bank;mix();
   return {frames,random:b.random,rows:b.recording.rows,header:b.recording.header,profile:b.profile,slots:b.slots.map(r=>r&&{...r,alignLabel:''})};
  };
  const plain=runIt(false),mixed=runIt(true);
  expect(plain.frames.length).toBeGreaterThan(100);expect(plain.rows.length).toBeGreaterThan(0);
  expect(mixed).toEqual(plain);
  expect(plain.slots.map(r=>r&&[...r.marks])).toEqual([[30,120],[-1,120],[-1,120]]);
 });
});

describe('purity',()=>{
 it('returns deep-frozen banks and leaves inputs untouched',()=>{
  const s=started(2),snapshot=JSON.stringify(s),t=tick(s);
  expect(deepFrozen(t.bank)).toBe(true);expect(deepFrozen(t.frames)).toBe(true);expect(deepFrozen(t.events)).toBe(true);
  expect(JSON.stringify(s)).toBe(snapshot);
 });
 it('keeps React, DOM, host clocks and Math.random out of the new core modules',()=>{
  for(const f of ['radioRandom.ts','radioThermal.ts','radioPulsarProfile.ts','radioReceiver.ts','radioReceiverDisplay.ts','radioReceiverSession.ts','radioReceiverMarks.ts','radioReceiverMarkInput.ts']){
   const text=readFileSync(new URL(`./${f}`,import.meta.url),'utf8');
   expect(text,f).not.toMatch(/from 'react'|document\.|window\.|Date\.now|new Date|Math\.random|performance\.now|localStorage/);
  }
 });
});
