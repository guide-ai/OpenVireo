import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {PulsarRecord} from './radioPulsarCatalog';
import {
 RADIO_RECEIVER_COMPILED_OPTIONS,RADIO_RECEIVER_CONSTANTS,RADIO_RECEIVER_LITERALS,activateReceiver,addReceiverChannel,closeReceiver,
 copyLiveRadioOptions,createRadioReceiverBank,openMainReceiver,overwriteSourceBufferFromPulsarList,queryCloseReceiver,
 reassociateReceiverOnClock,receiverTimerGate,receiverTimerTick,stepHorizontal,stepVertical,toggleReceive,
 type RadioReceiverBank,type RadioReceiverFrame,type RadioReceiverOptions,type RadioReceiverResult,
} from './radioReceiver';

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
 it('refuses a refresh that needs σ before any activation',()=>{
  const b=ok(openMainReceiver(bankOf(),{catalog:[A],pointing:POINT,createSeed:1})).bank;
  expect(kindOf(toggleReceive(b,{jd:JD,now:nextNow(),allocateSeed:2}))).toBe('beam-not-prepared');
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
  expect(kinds.slice(0,3)).toEqual(['timer-batch','refresh','sweep-reset']);
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
  expect(c.events).toEqual([{kind:'closed',slot:0},{kind:'post-0x53a'}]);
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
  expect(c.events).toEqual([{kind:'closed',slot:0},{kind:'post-0x53a'}]);
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
  expect(c.events).toEqual([{kind:'closed',slot:2},{kind:'closed',slot:1},{kind:'closed',slot:0},{kind:'post-0x53a'}]);
  expect(c.bank).toMatchObject({slots:[null,null,null],profile:null,timerEnabled:false});
  expect(c.bank.sourceBuffer).toBe(s.sourceBuffer);expect(c.bank.random).toBe(s.random);
  const re=ok(activateReceiver(ok(openMainReceiver(c.bank,{catalog:[A],pointing:POINT,createSeed:12})).bank,0)).bank;
  expect(re.profile!.allocated).toBe(false);
  expect(kindOf(toggleReceive(re,{jd:JD,now:nextNow()}))).toBe('randomize-seed-required');
  const child=ok(closeReceiver(ok(closeReceiver(s,2)).bank,1)).bank;expect(child.slots.map(r=>r?.index??null)).toEqual([0,null,null]);
 });
});

describe('purity',()=>{
 it('returns deep-frozen banks and leaves inputs untouched',()=>{
  const s=started(2),snapshot=JSON.stringify(s),t=tick(s);
  expect(deepFrozen(t.bank)).toBe(true);expect(deepFrozen(t.frames)).toBe(true);expect(deepFrozen(t.events)).toBe(true);
  expect(JSON.stringify(s)).toBe(snapshot);
 });
 it('keeps React, DOM, host clocks and Math.random out of the new core modules',()=>{
  for(const f of ['radioRandom.ts','radioThermal.ts','radioPulsarProfile.ts','radioReceiver.ts']){
   const text=readFileSync(new URL(`./${f}`,import.meta.url),'utf8');
   expect(text,f).not.toMatch(/from 'react'|document\.|window\.|Date\.now|new Date|Math\.random|performance\.now|localStorage/);
  }
 });
});
