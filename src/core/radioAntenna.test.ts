import {describe,it,expect} from 'vitest';
import provenance from '../../docs/RADIO-ANTENNA-PROVENANCE.json';
import {
 INITIAL_RADIO_LAB,NOTICE_BUTTONS,RADIO_COMPILED_ENVIRONMENT,RADIO_COMPILED_OPTIONS,RADIO_LAB_CAPTIONS,RADIO_LAB_CONSTANTS,SKY_COORDS_CAPTIONS,
 SKY_COORDS_FIELD_MAX_LENGTH,activateRadioLab,answerNotice,cancelSkyCoords,changeSlewRate,confirmSkyCoords,editSkyCoordsField,formatFixed,
 isRadioLabOptions,isSupportedRadioLabProfile,nearestBinary64,normalizeRaHours,openSetCoordinates,parseDelphiFloat,parseExactDecimal,parseSkyCoords,
 radioClockTick,radioLabProfileIssues,radioLabRateIssues,radioLabTickRefusal,roundHalfEven,selectSkyCoordsEpoch,skyCoordsDraftTarget,skyCoordsFieldsFor,skyCoordsPrefillMinusLost,slewRateFor,slewTimerTick,splitSexagesimal,toggleTracking,valueSign,
 RADIO_WEB_OPTION_PROFILE,SKY_COORDS_WEB_DOMAIN,
 MANUAL_DIRECTIONS,MANUAL_DIRECTION_CODE,RADIO_LAB_POLE_CAPTIONS,RADIO_MANUAL_WEB_DOMAIN,heldManualDirection,manualButtonCaption,manualButtonEnabled,manualSlewTick,
 pressManualSlew,radioLabManualRefusal,radioLabManualTickRefusal,releaseManualSlew,releaseManualSlewThrough,
 type ManualDirection,type RadioLabOptions,type RadioLabOutcome,type RadioLabState,type RadioLabTransition,type SkyCoordsFields,
} from './radioAntenna';
import {RADIO_CLOCK_CONSTANTS,radioClockReading,type RadioClockReading} from './radioClock';
import {RADIO_EPOCH_POLE_THRESHOLD_DEGREES,precessSkyCoords} from './radioEpoch';
import {INITIAL_RADIO_CONTROL,clickRadioSwitch,enterRadioPulsarsExercise,radioIdCaptionLabel,scopeTimerTick,selectRadioAccess} from './radioControl';
import {RADIO_ANTENNA_MESSAGES_EN,createRadioAntennaTranslator} from '../components/RadioAntennaMessages';

const O=RADIO_COMPILED_OPTIONS,ids=new Set([...provenance.contracts,...provenance.epoch.contracts].map(c=>c.id));
const seen=new Set<RadioLabOutcome>();
const track=(t:RadioLabTransition)=>{seen.add(t.outcome);for(const step of t.steps)expect(ids.has(step)).toBe(true);if(!t.changed)return t;expect(Object.isFrozen(t.state)&&Object.isFrozen(t.state.pointing)&&Object.isFrozen(t.state.target)).toBe(true);return t;};
const opts=(over:Partial<RadioLabOptions>={}):RadioLabOptions=>({...O,...over});
const activated=(o=O)=>track(activateRadioLab(INITIAL_RADIO_LAB,o)).state;
const tracking=(o=O)=>track(toggleTracking(activated(o),o)).state;
/** Synthetic start position (the original reaches arbitrary positions by earlier slews); everything else is recovered state. */
const at=(ra:number,dec:number,o=O):RadioLabState=>({...tracking(o),pointing:{ra,dec}});
const fields=(raHours:string,raMinutes:string,raSeconds:string,decDegrees:string,decMinutes:string,decSeconds:string):SkyCoordsFields=>({raHours,raMinutes,raSeconds,decDegrees,decMinutes,decSeconds});
function enter(s:RadioLabState,f:SkyCoordsFields,o=O):RadioLabState{
 let n=track(openSetCoordinates(s,o)).state;
 for(const [k,v] of Object.entries(f))n=track(editSkyCoordsField(n,k as keyof SkyCoordsFields,v)).state;
 return n;
}
/** Enter, OK and Yes: a running slew. */
function slewTo(s:RadioLabState,f:SkyCoordsFields,o=O):RadioLabState{
 const ok=track(confirmSkyCoords(enter(s,f,o),o));expect(ok.outcome).toBe('slew-confirm-requested');
 const yes=track(answerNotice(ok.state,o,'confirm-slew','yes'));expect(['slew-started','slew-instant']).toContain(yes.outcome);return yes.state;
}
/** Independent oracle: the exact rational value of a binary64, read from its IEEE 754 bits. */
function exactOf(v:number):{n:bigint;d:bigint}{
 const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,v);
 const bits=view.getBigUint64(0),sign=bits>>63n?-1n:1n,biased=Number((bits>>52n)&0x7ffn),fraction=bits&((1n<<52n)-1n);
 const mantissa=biased===0?fraction:fraction|(1n<<52n),e=(biased===0?1:biased)-1075;
 return e>=0?{n:sign*(mantissa<<BigInt(e)),d:1n}:{n:sign*mantissa,d:1n<<BigInt(-e)};
}
function nextFloat(v:number,up:boolean):number{
 if(v===0)return up?Number.MIN_VALUE:-Number.MIN_VALUE;
 const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,v);view.setBigUint64(0,view.getBigUint64(0)+((v>0)===up?1n:-1n));return view.getFloat64(0);
}
/** v is a finite binary64 at least as close to n/d as both neighbours (ties accepted). */
function isNearest(v:number,n:bigint,d:bigint):boolean{
 if(!Number.isFinite(v))return false;
 const err=(x:number)=>{const e=exactOf(x),diff=e.n*d-n*e.d;return {num:diff<0n?-diff:diff,den:e.d*d};};
 const notWorse=(a:{num:bigint;den:bigint},b:{num:bigint;den:bigint})=>a.num*b.den<=b.num*a.den;
 const self=err(v);return notWorse(self,err(nextFloat(v,true)))&&notWorse(self,err(nextFloat(v,false)));
}
/** Deterministic generator for property checks (fixed seed; not application randomness). */
function lcg(seed:number){let x=seed>>>0;return (lo:number,hi:number)=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return lo+Math.floor(x/2**32*(hi-lo+1));};}// high bits
/** Decimal text of v × 10^-places built from the integer itself, without floating-point formatting. */
const fixedText=(v:number,places:number)=>{const a=Math.abs(v).toString().padStart(places+1,'0');return (v<0?'-':'')+(places?`${a.slice(0,-places)}.${a.slice(-places)}`:a);};
/** Delivers callbacks until the timer stops or one is refused (a refused callback changes nothing, so repeating it cannot help). */
function runSlew(s:RadioLabState,o=O,limit=500){
 const outcomes:RadioLabOutcome[]=[],pointings:RadioLabState['pointing'][]=[];let n=s;
 while(n.slewTimerEnabled&&outcomes.length<limit){const t=track(slewTimerTick(n,o,n.slewRun));outcomes.push(t.outcome);pointings.push(t.state.pointing);n=t.state;if(!t.changed)break;}
 return {state:n,outcomes,pointings};
}
/** Enter, OK, the transit note's OK when it opens, and Yes, all under the live options o. Returns the last transition. */
function startUnder(s:RadioLabState,f:SkyCoordsFields,o:RadioLabOptions):RadioLabTransition{
 let t=track(confirmSkyCoords(enter(s,f,o),o));
 if(t.outcome==='transit-notice')t=track(answerNotice(t.state,o,'transit-dec-only','ok'));
 return t.outcome==='slew-confirm-requested'?track(answerNotice(t.state,o,'confirm-slew','yes')):t;
}
/** Callbacks until the Dec→RA switch has run (status 'slewing-ra'). */
function toRaPhase(s:RadioLabState,o:RadioLabOptions):RadioLabState{
 let n=s;for(let i=0;i<50&&n.status!=='slewing-ra';i++)n=track(slewTimerTick(n,o,n.slewRun)).state;
 expect(n.status).toBe('slewing-ra');return n;
}
/** Tracking off then on during a slew: 0x5651cc enables RateSpin again (original quirk). */
const retrack=(s:RadioLabState,o:RadioLabOptions)=>track(toggleTracking(track(toggleTracking(s,o)).state,o)).state;

describe('RA-03 compiled options and Extended operands',()=>{
 it('rounds each Extended operand once to binary64 near its decoded meaning',()=>{
  const k=RADIO_LAB_CONSTANTS;
  expect(Math.abs(k.decStepPerRate*3600-1)).toBeLessThan(4e-16);expect(Math.abs(k.raStepPerRate*3600-1)).toBeLessThan(4e-16);
  expect(k.decStepPerRate).toBe(k.raStepPerRate);// independent static operand audit: both native cells have the same significand
  expect(Math.abs(k.initialRaToleranceHours/1e-5-1)).toBeLessThan(1e-14);expect(Math.abs(k.radiansToDegrees/(180/Math.PI)-1)).toBeLessThan(1e-15);
  // Independent BigInt check of the latitude immediate {0xea5afff7,0xabb4f69d,0x3ffe}: significand × 2^-64.
  const sig=(0xabb4f69dn<<32n)|0xea5afff7n;expect(O.latitudeRadians).toBe(Number(sig)/2**64);
  expect(O.latitudeRadians*k.radiansToDegrees).toBeGreaterThan(38.4);expect(O.latitudeRadians*k.radiansToDegrees).toBeLessThan(38.45);
 });
 it('fixes the compiled defaults and validates option inputs',()=>{
  expect(O).toMatchObject({transitTelescope:false,limitsEnabled:false,maxRateIndex:5,rateBase:50,instantSlew:false});
  // Threshold immediates {0x3a243ada, 0xb2b8c257, 0x3ffc} at 0x5a8fcb..0x5a8ffb (record+0x90c): significand × 2^-66.
  expect(O.minimumAltitudeRadians).toBe(Number((0xb2b8c257n<<32n)|0x3a243adan)*2**-66);
  expect(RADIO_COMPILED_ENVIRONMENT).toEqual({dishDiameterMeters:100,accessOptionByte:false});
  for(const bad of [{maxRateIndex:256},{maxRateIndex:1.5},{rateBase:2**31},{latitudeRadians:Number.NaN},{transitTelescope:1},{minimumAltitudeRadians:Number.NaN},{minimumAltitudeRadians:'0.17'}])
   expect(isRadioLabOptions({...O,...bad})).toBe(false);
  const {minimumAltitudeRadians:_absent,...withoutMinimum}=O;void _absent;
  expect(isRadioLabOptions(withoutMinimum)).toBe(false);// no default is invented for an absent field
  expect(()=>activateRadioLab(INITIAL_RADIO_LAB,withoutMinimum as RadioLabOptions)).toThrow('Invalid radio lab options');
  expect(()=>activateRadioLab(INITIAL_RADIO_LAB,{...O,rateBase:'50'} as unknown as RadioLabOptions)).toThrow('Invalid radio lab options');
 });
 it('feeds the main-window slice: access with the compiled environment forms the 100 m caption',()=>{
  const env={domeByte:0 as const,otherWindowItemsVisible:false,...RADIO_COMPILED_ENVIRONMENT};
  const pending=selectRadioAccess(enterRadioPulsarsExercise(INITIAL_RADIO_CONTROL).state,env).state;
  expect(pending.scopeTimerIntervalMs).toBeNull();// access option 0 → Random(8000) branch
  const on=clickRadioSwitch(scopeTimerTick(pending,env).state,env).state;
  expect(radioIdCaptionLabel(on)).toBe('100 Meter Radio Telescope');expect(on.radioPanelShown).toBe(true);
 });
});

describe('RA-08/RA-09 coordinate text helpers',()=>{
 it('accepts only the strict StrToFloat web grammar',()=>{
  expect(['5',' 5 ','-0','+1.5','.5','5.','1e2','1E-2','0012'].map(parseDelphiFloat)).toEqual([5,5,-0,1.5,.5,5,100,.01,12]);
  for(const bad of ['',' ','-','+','1,5','1e','1e100','NaN','Infinity','0x10','١','1 2','5h',null,5,'9'.repeat(33)])expect(parseDelphiFloat(bad)).toBeNull();
  expect(parseDelphiFloat('9'.repeat(SKY_COORDS_FIELD_MAX_LENGTH))).toBe(Number('9'.repeat(32)));
 });
 it('rounds half to even like Round under control word 0x1332 and formats ffFixed without a negative zero',()=>{
  expect([2.5,3.5,-2.5,5999.5,5998.5,0.49].map(roundHalfEven)).toEqual([2,4,-2,6000,5998,0]);
  // Exact binary value: 0.125 is a true tie (away from zero); 1.005 is stored just below its tie.
  expect([formatFixed(0.125,2),formatFixed(1.005,2),formatFixed(-0.04,1),formatFixed(0,2),formatFixed(Number.NaN,2)]).toEqual(['0.13','1.00','0.0','0.00','']);
 });
 it('splits like 0x486b20 and carries seconds/minutes like 0x486bc0, without wrapping the whole part',()=>{
  expect(splitSexagesimal(5+34/60+31.94/3600,2)).toMatchObject({sign:1,whole:5,minutes:34});
  expect(splitSexagesimal(23+59/60+59.996/3600,2)).toEqual({sign:1,whole:24,minutes:0,seconds:0});
  expect(splitSexagesimal(-22.25,1)).toMatchObject({sign:-1,whole:22,minutes:15});expect(splitSexagesimal(0,1)).toEqual({sign:0,whole:0,minutes:0,seconds:0});
 });
 it('prefills the dialog like FormActivate, including the lost minus for −1° < Dec < 0°',()=>{
  expect(skyCoordsFieldsFor({ra:5+34/60+31.94/3600,dec:22+52/3600})).toEqual(fields('5','34','31.94','22','0','52.0'));
  expect(skyCoordsFieldsFor({ra:0,dec:-22.25})).toEqual(fields('0','0','0.00','-22','15','0.0'));
  const quirk=skyCoordsFieldsFor({ra:1,dec:-0.5});expect(quirk.decDegrees).toBe('0');
  expect(parseSkyCoords(quirk)).toEqual({status:'ok',ra:1,dec:0.5});// OK unchanged turns the Dec positive, as in the original
 });
 it('validates RA before Dec with inclusive ranges and the minus-sign rule for zero degrees',()=>{
  const ok=(f:SkyCoordsFields)=>parseSkyCoords(f);
  // Hand-derived exact values: RA = 2007194/360000 h, Dec = 79252/3600 °; each result is the nearest binary64.
  const r=ok(fields('5','34','31.94','22','0','52')) as {status:'ok';ra:number;dec:number};
  expect(r.status).toBe('ok');expect(isNearest(r.ra,2007194n,360000n)).toBe(true);expect(isNearest(r.dec,79252n,3600n)).toBe(true);
  expect(Math.abs(r.ra-((5+34/60)+31.94/3600))).toBeLessThanOrEqual(2**-48);// within one ulp of the earlier binary64 formula
  expect(ok(fields('24','0','0','90','0','0'))).toEqual({status:'ok',ra:24,dec:90});
  expect(ok(fields('0','0','0','-90','0','0'))).toEqual({status:'ok',ra:0,dec:-90});
  for(const bad of [fields('','0','0','0','0','0'),fields('24','0','0.36','0','0','0'),fields('0','-1','0','0','0','0'),fields('1','x','0','0','0','0'),fields('1','2','3,5','zz','0','0')])expect(ok(bad).status).toBe('ra-invalid');
  for(const bad of [fields('1','0','0','','0','0'),fields('1','0','0','90','0','0.1'),fields('1','0','0','-90','1','0'),fields('1','0','0','0','x','0'),fields('1','0','0','0','0','1e')])expect(ok(bad).status).toBe('dec-invalid');
  expect((ok(fields('1','0','0',' -0 ','30','0')) as {dec:number}).dec).toBe(-0.5);
  expect((ok(fields('1','0','0','-0.0','30','0')) as {dec:number}).dec).toBe(-0.5);
  expect((ok(fields('1','0','0','0','30','0')) as {dec:number}).dec).toBe(0.5);
  expect((ok(fields('1','0','0','-5','30','0')) as {dec:number}).dec).toBe(-5.5);
  expect((ok(fields('1','0','0','-0.5','30','0')) as {dec:number}).dec).toBe(-1);
  expect((ok(fields('1','0','0','5','-30','0')) as {dec:number}).dec).toBe(4.5);// fields themselves have no range
  expect(ok(fields('1','0','0','5','90','0'))).toEqual({status:'ok',ra:1,dec:6.5});
 });
});

describe('RA-09 web numeric domain: exact admission instead of binary64 accumulation',()=>{
 const status=(f:SkyCoordsFields)=>{const p=parseSkyCoords(f);return p.status==='ok'?p:p.status.endsWith('unsupported')?`${p.status}:${(p as {reason:string}).reason}`:p.status;};
 const ra=(h:string,m:string,s:string)=>status(fields(h,m,s,'0','0','0'));
 const dec=(d:string,m:string,s:string)=>status(fields('1','0','0',d,m,s));
 it('parses each field to its exact decimal value',()=>{
  expect(['5',' -0 ','+1.5','.5','5.','1e2','1E-2','0012','-1.25e-3','9007199254740993'].map(parseExactDecimal)).toEqual([
   {coefficient:5n,exponent:0},{coefficient:0n,exponent:0},{coefficient:15n,exponent:-1},{coefficient:5n,exponent:-1},{coefficient:5n,exponent:0},
   {coefficient:1n,exponent:2},{coefficient:1n,exponent:-2},{coefficient:12n,exponent:0},{coefficient:-125n,exponent:-5},{coefficient:9007199254740993n,exponent:0}]);
  for(const bad of ['','-','1e','1e100','NaN','1,5',' 1 e2',null,5])expect(parseExactDecimal(bad)).toBeNull();
 });
 it('rounds a ratio to the nearest binary64 with ties to even (IEEE division as the oracle)',()=>{
  const next=lcg(7);
  for(let i=0;i<2000;i++){const n=next(-(2**30),2**30)*2**21+next(0,2**21-1),d=next(1,2**31-1)*2**20+next(1,2**20-1);expect(nearestBinary64(BigInt(n),BigInt(d))).toBe(n/d);}
  expect(nearestBinary64(2n**53n+1n,1n)).toBe(2**53);expect(nearestBinary64(2n**53n+3n,1n)).toBe(2**53+4);expect(nearestBinary64(-(2n**54n+2n),1n)).toBe(-(2**54));
  expect(nearestBinary64(0n,7n)).toBe(0);expect(()=>nearestBinary64(1n,0n)).toThrow();
 });
 it('coordinator vectors: cancellation and sub-precision boundary entries are refused, never admitted with an hour-scale error',()=>{
  // radio-antenna-independent/ra-adversarial-results.json: exact algebra 12.5, 2, 0 and 24.000000000000001 (out of range).
  expect(ra('12','30','0')).toEqual({status:'ok',ra:12.5,dec:0});
  expect(ra('9007199254740993','-540431955284459520','3600')).toBe('ra-unsupported:cancellation');
  expect(ra('9007199254740993','-540431955284459580','0')).toBe('ra-unsupported:cancellation');
  expect(ra('24.000000000000001','0','0')).toBe('ra-unsupported:precision');
 });
 it('contrast: the earlier binary64 accumulation of the same formula (what the previous candidate admitted)',()=>{
  const old=(h:string,m:string,s:string)=>(Number(h)+Number(m)/60)+Number(s)/3600;
  expect(old('9007199254740993','-540431955284459520','3600')).toBe(1);// exact 2: one hour off, previously admitted
  expect(old('24.000000000000001','0','0')).toBe(24);// exactly above 24, previously admitted as 24
  expect(old('0.7','-41','-60')).toBeLessThan(0);// exact 0 h, previously rejected as ra-invalid; now admitted as 0
  expect(old('23','59','60')).toBe(24);
 });
 it('RA controls: exact boundaries and signed/noncanonical sums are admitted exactly; clear range errors stay ra-invalid',()=>{
  const okRa:[string,string,string,number][]=[['24','0','0',24],['0','0','0',0],['-0','0','0',0],['23','59','60',24],['0','1440','0',24],['0','0','86400',24],
   ['48','-1440','0',24],['25','-60','0',24],['-1','120','0',1],['1','-60','0',0],['0.7','-41','-60',0],['0','6','0',0.1],['1','0','0.018',1.000005],
   ['500000','-30000000','0',0],['499999','-29999940','3600',1]];
  for(const [h,m,s,v] of okRa){const r=ra(h,m,s);expect(r,`${h} ${m} ${s}`).toEqual({status:'ok',ra:v,dec:0});expect(Object.is((r as {ra:number}).ra,-0)).toBe(false);}
  for(const [h,m,s] of [['24','0','0.36'],['24','0','1e-6'],['24','0','7.7e-11'],['24.0000000000001','0','0'],['0','0','-1e-90'],['-0.0000001','0','0'],['0','1440.000000001','0'],
   ['1e50','0','0'],['-1e99','0','0'],['1e20','-6e21','1e30'],['0','-1','0'],['25','0','0'],
   ['9e99','-5.4e101','0']])expect(ra(h,m,s),`${h} ${m} ${s}`).toBe('ra-invalid');// the last has a three-digit exponent: outside the strict grammar
  // 24 h + s/3600 with S ≈ 24: the error bound is 24 × 2^-50 ≈ 2.13e-14 h, so 7.6e-11 s (2.11e-14 h) is below it and 7.7e-11 s above.
  for(const [h,m,s] of [['24','0','1e-11'],['24','0','7.6e-11'],['24','0','5e-11'],['23','60','1e-20']])expect(ra(h,m,s),`${h} ${m} ${s}`).toBe('ra-unsupported:precision');
  for(const [h,m,s] of [['500000','-30000000','0.036'],['1000000','-60000000','3600'],['1e20','-6e21','0'],['1e20','-6e21','1800'],['1e20','-6e21','108000'],['9e97','-5.4e99','0'],['-1000000','60000000','30']])
   expect(ra(h,m,s),`${h} ${m} ${s}`).toBe('ra-unsupported:cancellation');
 });
 it('Dec controls keep the sign rule (Sign(d), or a "-" in a zero degree text) and the same domain',()=>{
  const okDec:[string,string,string,number][]=[['90','0','0',90],['-90','0','0',-90],['89','60','0',90],['91','-60','0',90],['-91','-60','0',-90],['-89','60','0',-90],
   ['0','30','0',0.5],['-0','30','0',-0.5],['0e-5','30','0',-0.5],['-0.5','30','0',-1],['5','-30','0',4.5],['5','90','0',6.5],['-0','0','0',0]];
  for(const [d,m,s,v] of okDec)expect(dec(d,m,s),`${d} ${m} ${s}`).toEqual({status:'ok',ra:1,dec:v});
  const tiny=parseSkyCoords(fields('1','0','0','-0','0','1e-12')) as {dec:number};expect(isNearest(tiny.dec,-1n,3600n*10n**12n)).toBe(true);
  for(const [d,m,s] of [['90','0','0.0001'],['-90','1','0'],['90.0000001','0','0'],['1e99','0','0'],['91','0','0']])expect(dec(d,m,s),`${d} ${m} ${s}`).toBe('dec-invalid');
  for(const [d,m,s] of [['90','0','1e-12'],['-89','60','1e-12'],['90.000000000000001','0','0']])expect(dec(d,m,s),`${d} ${m} ${s}`).toBe('dec-unsupported:precision');
  for(const [d,m,s] of [['1000000','-60000000','0'],['-1e20','-6e21','0'],['45','-1e8','6e9']])expect(dec(d,m,s),`${d} ${m} ${s}`).toBe('dec-unsupported:cancellation');
 });
 it('keeps the native order: grammar and RA verdicts come before any Dec verdict',()=>{
  expect(status(fields('9007199254740993','-540431955284459520','3600','zz','0','0'))).toBe('ra-unsupported:cancellation');
  expect(status(fields('x','-540431955284459520','3600','1e99','0','0'))).toBe('ra-invalid');
  expect(status(fields('25','0','0','1000000','-60000000','0'))).toBe('ra-invalid');
  expect(status(fields('1','0','0','1000000','-60000000','x'))).toBe('dec-invalid');
  expect(status(fields('1','0','0','90','0','1e-12'))).toBe('dec-unsupported:precision');
 });
 it('generated ordinary entries: nearest binary64 of the exact value, within the stated bound of the earlier formula',()=>{
  const next=lcg(2026);let okCount=0,invalidCount=0;
  for(let i=0;i<3000;i++){
   const H=next(-5,29),M=next(-300,300),C=next(-1_800_000,1_800_000),N=360000*H+6000*M+C,D=360000;// centiseconds
   const p=parseSkyCoords(fields(String(H),String(M),fixedText(C,2),'0','0','0'));
   if(N<0||N>24*D){expect(p.status).toBe('ra-invalid');invalidCount++;continue;}
   expect(p.status).toBe('ok');const v=(p as {ra:number}).ra;okCount++;
   expect(isNearest(v,BigInt(N),BigInt(D))).toBe(true);expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(24);
   const S=Math.abs(H)+Math.abs(M)/60+Math.abs(C)/360000;expect(Math.abs(v-((H+M/60)+(C/100)/3600))).toBeLessThanOrEqual(SKY_COORDS_WEB_DOMAIN.errorBoundScale*S);
  }
  for(let i=0;i<3000;i++){
   const T=next(-1000,1000),M=next(-120,120),C=next(-36000,36000),sign=T<0?-1:1,N=36000*T+sign*(6000*M+C),D=360000;// tenths of a degree
   const p=parseSkyCoords(fields('1','0','0',fixedText(T,1),String(M),fixedText(C,2)));
   if(N<-90*D||N>90*D){expect(p.status).toBe('dec-invalid');invalidCount++;continue;}
   expect(p.status).toBe('ok');okCount++;expect(isNearest((p as {dec:number}).dec,BigInt(N),BigInt(D))).toBe(true);
  }
  expect(okCount).toBeGreaterThan(1500);expect(invalidCount).toBeGreaterThan(500);
 });
 it('generated near-boundary entries: finite, never clamped, refused when closer than the error bound',()=>{
  const next=lcg(11);const seen=new Set<string>();
  for(let i=0;i<3000;i++){
   const upper=next(0,1)===1,k=next(1,999),e=next(4,24),outward=next(0,1)===1;
   const sText=`${(upper===outward)?'':'-'}${k}e-${e}`,hText=upper?'24':'0';
   const p=parseSkyCoords(fields(hText,'0',sText,'0','0','0'));
   const D=3600n*10n**BigInt(e),base=upper?24n*D:0n,S=base+BigInt(k);seen.add(p.status);
   if(!outward){expect(p.status).toBe('ok');const v=(p as {ra:number}).ra;expect(Number.isFinite(v)).toBe(true);expect(isNearest(v,base+(upper?-1n:1n)*BigInt(k),D)).toBe(true);continue;}
   expect(p.status).toBe(BigInt(k)*2n**50n>S?'ra-invalid':'ra-unsupported');
  }
  expect([...seen].sort()).toEqual(['ok','ra-invalid','ra-unsupported']);
 });
});

describe('RA-09 unsupported entries leave every committed value unchanged',()=>{
 it('RA: error-style box over the open dialog; draft, target and pointing untouched; OK returns, Cancel stores nothing',()=>{
  const open=enter(at(3,20),fields('9007199254740993','-540431955284459520','3600','10','0','0'));
  const u=track(confirmSkyCoords(open,O));
  expect(u.outcome).toBe('ra-unsupported');expect(u.steps).toEqual(['RA-09']);
  expect(u.state.notice).toEqual({kind:'ra-unsupported',reason:'cancellation'});
  expect(u.state.dialog).toEqual(open.dialog);expect(u.state.target).toEqual(open.target);expect(u.state.pointing).toEqual(open.pointing);
  expect(u.state).toMatchObject({slewing:false,slewTimerEnabled:false,slewRun:open.slewRun});
  expect(track(editSkyCoordsField(u.state,'raHours','2')).outcome).toBe('modal-open');
  expect(track(answerNotice(u.state,O,'ra-invalid','ok')).outcome).toBe('notice-stale');
  const back=track(answerNotice(u.state,O,'ra-unsupported','ok'));expect(back.outcome).toBe('notice-dismissed');expect(back.state.dialog).toEqual(open.dialog);
  const cancelled=track(cancelSkyCoords(back.state));expect(cancelled.state.target).toEqual(open.target);expect(cancelled.state.pointing).toEqual({ra:3,dec:20});
  const reopened=track(openSetCoordinates(cancelled.state,O));expect(reopened.state.dialog!.fields).toEqual(skyCoordsFieldsFor({ra:3,dec:20}));
 });
 it('Dec: precision refusal, then a corrected entry proceeds to the confirmation',()=>{
  const open=enter(tracking(),fields('2','0','0','90','0','1e-12'));
  const u=track(confirmSkyCoords(open,O));expect(u.outcome).toBe('dec-unsupported');expect(u.state.notice).toEqual({kind:'dec-unsupported',reason:'precision'});
  expect(u.state.target).toEqual(open.target);expect(u.state.dialog).toEqual(open.dialog);
  const fixed=track(editSkyCoordsField(track(answerNotice(u.state,O,'dec-unsupported','ok')).state,'decSeconds','0'));
  const ok=track(confirmSkyCoords(fixed.state,O));expect(ok.outcome).toBe('slew-confirm-requested');expect(ok.state.target).toEqual({ra:2,dec:90});
 });
 it('B1950 conversion comes after admission, as validation precedes the flag write 0x4f36b0 natively',()=>{
  const open=track(selectSkyCoordsEpoch(enter(tracking(),fields('1','0','0','1000000','-60000000','0')),1)).state;
  const t=track(confirmSkyCoords(open,O));expect(t.outcome).toBe('dec-unsupported');
  expect(t.state).toMatchObject({skyCoordsB1950:false,targetHoldsB1950:false,target:open.target,dialog:open.dialog});
 });
});

describe('RA-04/RA-05/RA-06 activation, tracking and slew rate',()=>{
 it('initializes once: tracking off, rate index 4 (500 arcsec/tick), RA 0, Dec at the latitude, slewing controls off',()=>{
  const t=track(activateRadioLab(INITIAL_RADIO_LAB,O)),s=t.state;
  expect(t.outcome).toBe('activated');expect(s).toMatchObject({activated:true,tracking:false,slewing:false,rateIndex:4,rate:500,slewMenuEnabled:false,manualButtonsEnabled:false,rateSpinEnabled:false,receiverEnabled:false,trackingVisible:true,eastWestVisible:true});
  expect(s.pointing).toEqual({ra:0,dec:O.latitudeRadians*RADIO_LAB_CONSTANTS.radiansToDegrees});
  expect(track(activateRadioLab(s,O))).toMatchObject({outcome:'already-activated',changed:false,state:s});
  for(const step of [()=>toggleTracking(INITIAL_RADIO_LAB,O),()=>openSetCoordinates(INITIAL_RADIO_LAB,O),()=>changeSlewRate(INITIAL_RADIO_LAB,O,'up')])expect(track(step()).outcome).toBe('not-activated');
 });
 it('needs Tracking for Set Coordinates on a non-transit telescope; Tracking off disables it again',()=>{
  const s=activated();expect(track(openSetCoordinates(s,O)).outcome).toBe('menu-disabled');expect(track(changeSlewRate(s,O,'up')).outcome).toBe('rate-disabled');
  const on=track(toggleTracking(s,O));expect(on.outcome).toBe('tracking-on');expect(on.state).toMatchObject({tracking:true,slewMenuEnabled:true,manualButtonsEnabled:true,rateSpinEnabled:true,receiverEnabled:true});
  const off=track(toggleTracking(on.state,O));expect(off.outcome).toBe('tracking-off');expect(off.state).toMatchObject({tracking:false,slewMenuEnabled:false,manualButtonsEnabled:false,rateSpinEnabled:false,receiverEnabled:false});
 });
 it('transit: Tracking/E/W hidden and Set Coordinates enabled from the start',()=>{
  const o=opts({transitTelescope:true}),s=activated(o);
  expect(s).toMatchObject({trackingVisible:false,eastWestVisible:false,slewMenuEnabled:true,manualButtonsEnabled:false});
  expect(track(toggleTracking(s,o)).outcome).toBe('tracking-unavailable');expect(track(openSetCoordinates(s,o)).outcome).toBe('dialog-opened');
 });
 it('steps the rate by powers of ten between index 1 and the options maximum',()=>{
  let s=tracking();const seq:string[]=[];
  for(const d of ['up','up','down','down','down','down','down'] as const){const t=track(changeSlewRate(s,O,d));seq.push(`${t.outcome}:${t.state.rateIndex}:${t.state.rate}`);s=t.state;}
  expect(seq).toEqual(['rate-up:5:5000','rate-at-limit:5:5000','rate-down:4:500','rate-down:3:50','rate-down:2:5','rate-down:1:0.5','rate-at-limit:1:0.5']);
  expect(slewRateFor(1,opts({rateBase:7}))).toBeCloseTo(0.07,15);
 });
});

describe('RA-07/RA-08/RA-09 Set Coordinates dialog: entry, validation, cancel and reentry',()=>{
 it('seeds the stored coordinates from the pointing on first use and prefills the fields',()=>{
  const s=tracking(),t=track(openSetCoordinates(s,O));
  expect(t.outcome).toBe('dialog-opened');expect(t.state.target).toEqual(s.pointing);expect(t.state.dialog).toMatchObject({epochIndex:0,epochEnabled:true});
  expect(t.state.dialog!.fields).toEqual(skyCoordsFieldsFor(s.pointing));expect(t.state.dialog!.fields.raHours).toBe('0');
 });
 it('cancel stores nothing new and moves nothing; reopening shows the stored values',()=>{
  const open=enter(tracking(),fields('5','0','0','10','0','0')),c=track(cancelSkyCoords(open));
  expect(c.outcome).toBe('dialog-cancelled');expect(c.state.dialog).toBeNull();expect(c.state.pointing).toEqual(open.pointing);expect(c.state.target).toEqual(open.pointing);
  expect(track(cancelSkyCoords(c.state)).outcome).toBe('dialog-closed');
  expect(track(openSetCoordinates(c.state,O)).state.dialog!.fields.raHours).toBe('0');
 });
 it('keeps the dialog under an error box, rejects input while the box is open, and accepts the corrected entry',()=>{
  const open=enter(tracking(),fields('25','0','0','10','0','0')),err=track(confirmSkyCoords(open,O));
  expect(err.outcome).toBe('ra-invalid');expect(err.state.notice).toEqual({kind:'ra-invalid'});expect(err.state.dialog).toEqual(open.dialog);expect(err.state.target).toEqual(open.target);
  for(const blocked of [editSkyCoordsField(err.state,'raHours','5'),confirmSkyCoords(err.state,O),cancelSkyCoords(err.state),selectSkyCoordsEpoch(err.state,1),toggleTracking(err.state,O),changeSlewRate(err.state,O,'up'),openSetCoordinates(err.state,O)])
   expect(track(blocked).outcome).toBe('modal-open');
  expect(track(answerNotice(err.state,O,'ra-invalid','yes')).outcome).toBe('invalid-answer');
  expect(track(answerNotice(err.state,O,'dec-invalid','ok')).outcome).toBe('notice-stale');
  const back=track(answerNotice(err.state,O,'ra-invalid','ok'));expect(back.outcome).toBe('notice-dismissed');expect(back.state.dialog).toEqual(open.dialog);
  const decErr=track(confirmSkyCoords(track(editSkyCoordsField(track(editSkyCoordsField(back.state,'raHours','5')).state,'decDegrees','91')).state,O));
  expect(decErr.outcome).toBe('dec-invalid');
  const fixed=track(editSkyCoordsField(track(answerNotice(decErr.state,O,'dec-invalid','ok')).state,'decDegrees','10'));
  const ok=track(confirmSkyCoords(fixed.state,O));expect(ok.outcome).toBe('slew-confirm-requested');expect(ok.state.dialog).toBeNull();
  expect(ok.state.target).toEqual({ra:5,dec:10});expect(ok.state.notice).toEqual({kind:'confirm-slew',target:{ra:5,dec:10},transit:false,hourAngle:null});
  expect(ok.steps).toEqual(['RA-09','RA-10']);
 });
 it('bounds edits; choosing B1950 alone converts nothing, its OK stores the converted J2000 target with the flag set',()=>{
  const open=enter(tracking(),fields('5','0','0','10','0','0'));
  expect(track(editSkyCoordsField(open,'raHours','1'.repeat(33))).outcome).toBe('field-too-long');
  expect(track(editSkyCoordsField(open,'raHours','5'))).toMatchObject({outcome:'field-edited',changed:false});
  const b=track(selectSkyCoordsEpoch(open,1));expect(b.state).toEqual({...open,dialog:{...open.dialog!,epochIndex:1}});
  const converted=precessSkyCoords('B1950->J2000',{ra:5,dec:10});
  const ok=track(confirmSkyCoords(b.state,O));expect(ok.outcome).toBe('slew-confirm-requested');expect(ok.state.dialog).toBeNull();
  expect(ok.state.target).toEqual({ra:converted.ra,dec:converted.dec});expect(ok.state.target).not.toEqual({ra:5,dec:10});
  expect(ok.state).toMatchObject({skyCoordsB1950:true,targetHoldsB1950:false});
  expect(ok.state.notice).toEqual({kind:'confirm-slew',target:{ra:converted.ra,dec:converted.dec},transit:false,hourAngle:null,b1950:{southPoleSignLost:false}});
  expect(ok.steps).toEqual(['RA-09','RA-EP-03','RA-EP-01','RA-10','RA-EP-04']);
  const j=track(selectSkyCoordsEpoch(b.state,0));
  const jOk=track(confirmSkyCoords(j.state,O));expect(jOk.outcome).toBe('slew-confirm-requested');expect(jOk.state.target).toEqual({ra:5,dec:10});expect(jOk.state.skyCoordsB1950).toBe(false);
  expect(track(selectSkyCoordsEpoch({...open,dialog:{...open.dialog!,epochEnabled:false}},1)).outcome).toBe('epoch-disabled');
 });
 it('warns without moving when the stored target equals the pointing exactly',()=>{
  const s=at(2,30),t=track(confirmSkyCoords(enter(s,fields('2','0','0','30','0','0')),O));
  expect(t.outcome).toBe('no-slew-needed');expect(t.state.notice).toEqual({kind:'no-slew-needed'});
  const d=track(answerNotice(t.state,O,'no-slew-needed','ok'));expect(d.state).toMatchObject({slewing:false,notice:null,pointing:{ra:2,dec:30}});
 });
 it('declining the confirmation keeps the stored target, and the next dialog shows it',()=>{
  const ok=track(confirmSkyCoords(enter(tracking(),fields('6','30','0','-12','0','0')),O));
  const no=track(answerNotice(ok.state,O,'confirm-slew','no'));expect(no.outcome).toBe('slew-declined');expect(no.state.slewing).toBe(false);
  expect(no.state.target).toEqual({ra:6.5,dec:-12});expect(track(openSetCoordinates(no.state,O)).state.dialog!.fields).toEqual(fields('6','30','0.00','-12','0','0.0'));
 });
});

describe('RA-10/RA-11 programmed slew (independent tick counts)',()=>{
 it('A: Dec rises in 8 ticks, RA in ticks 9–30, completion box at tick 31 with the maximum rate',()=>{
  const s=slewTo(at(1,10),fields('3','0','0','20','0','0'));
  expect(s).toMatchObject({slewing:true,slewTimerEnabled:true,slewRun:1,phase:0,rateIndex:5,rate:5000,manualButtonsEnabled:false,rateSpinEnabled:false,addToListEnabled:false,status:'slewing'});
  expect(s.step).toBe(5000*RADIO_LAB_CONSTANTS.decStepPerRate);
  const {state,outcomes}=runSlew(s);
  expect(outcomes.length).toBe(31);expect(outcomes.slice(0,8).every(o=>o==='slew-tick')).toBe(true);expect(outcomes[8]).toBe('slew-axis-ra');expect(outcomes[30]).toBe('slew-complete');
  expect(state).toMatchObject({pointing:{ra:3,dec:20},slewing:false,slewTimerEnabled:false,manualButtonsEnabled:true,rateSpinEnabled:true,status:'none',notice:{kind:'slew-complete'},rateIndex:5,phase:2});
  expect(track(slewTimerTick(state,O,state.slewRun)).outcome).toBe('slew-timer-idle');
  expect(track(answerNotice(state,O,'slew-complete','ok')).state.notice).toBeNull();
 });
 it('B: crosses 0 h the short way (|ΔRA| > 12 h negated) and normalizes each tick',()=>{
  const {state,outcomes}=runSlew(slewTo(at(23.9,0),fields('0','6','0','0','0','0')));
  expect(outcomes).toEqual(['slew-tick','slew-axis-ra','slew-tick','slew-tick','slew-complete']);expect(state.pointing).toEqual({ra:0.1,dec:0});
 });
 it('C: Dec falling then RA falling (phases 1 and 3)',()=>{
  const s=slewTo(at(3,20),fields('1','0','0','19','0','0'));expect(s.phase).toBe(1);expect(s.step).toBeLessThan(0);
  const {state,outcomes}=runSlew(s);expect(outcomes.length).toBe(24);expect(state.pointing).toEqual({ra:1,dec:19});expect(state.phase).toBe(3);
 });
 it('D: the byte-verified RA tolerance includes its rounded binary64 boundary without snapping',()=>{
  // Coordinator independent data audit at0x5678d0: significand0xa7c5ac471b478423, exponent0x3fee.
  // This is the chosen binary64 contract, not a native x87 runtime witness.
  expect(RADIO_LAB_CONSTANTS.initialRaToleranceHours).toBe(1e-5);
  const active=activated(),before:RadioLabState={...active,target:{ra:1e-5,dec:active.pointing.dec},phase:0,axisDone:true,
   rate:5000,slewTimerEnabled:true,slewing:true,slewRun:1};
  const next=slewTimerTick(before,O,1);
  expect(next.outcome).toBe('slew-complete');expect(next.state.pointing.ra).toBe(0);expect(next.state.slewing).toBe(false);
 });
 it('D: an initial RA separation within ~1e-5 h finishes without snapping RA',()=>{
  const {state,outcomes}=runSlew(slewTo(at(1,20),fields('1','0','0.018','21','0','0')));
  expect(outcomes).toEqual(['slew-tick','slew-complete']);expect(state.pointing).toEqual({ra:1,dec:21});expect(state.target.ra).toBeCloseTo(1.000005,12);
 });
 it('transit: OK/Cancel note first, Declination only, completion on the tick after Dec arrives',()=>{
  const o=opts({transitTelescope:true}),s={...activated(o),pointing:{ra:4,dec:10}};
  const note=track(confirmSkyCoords(enter(s,fields('9','0','0','12','0','0'),o),o));expect(note.outcome).toBe('transit-notice');
  expect(track(answerNotice(note.state,o,'transit-dec-only','cancel'))).toMatchObject({outcome:'transit-cancelled',state:{slewing:false,target:{ra:9,dec:12}}});
  const confirm=track(answerNotice(note.state,o,'transit-dec-only','ok'));expect(confirm.state.notice).toEqual({kind:'confirm-slew',target:{ra:9,dec:12},transit:true,hourAngle:null});
  const run=runSlew(track(answerNotice(confirm.state,o,'confirm-slew','yes')).state,o);
  expect(run.outcomes).toEqual(['slew-tick','slew-tick','slew-complete']);expect(run.state.pointing).toEqual({ra:4,dec:12});
 });
 it('instant-slew option: jumps without SlewTimer2 and normalizes RA 24 to 0',()=>{
  const o=opts({instantSlew:true}),s=at(1,10,o);
  const t=track(answerNotice(track(confirmSkyCoords(enter(s,fields('24','0','0','-30','0','0'),o),o)).state,o,'confirm-slew','yes'));
  expect(t.outcome).toBe('slew-instant');expect(t.state).toMatchObject({pointing:{ra:0,dec:-30},slewing:false,slewTimerEnabled:false,rateIndex:5});
 });
 it('Limit Slewing without a request-time reading stops at the explicit clock gate (G2) with the target stored and no motion',()=>{
  const o=opts({limitsEnabled:true}),t=track(confirmSkyCoords(enter(at(1,10,o),fields('3','0','0','20','0','0'),o),o));
  expect(t.outcome).toBe('limits-require-clock');expect(t.steps).toContain('RA-12');expect(t.state).toMatchObject({notice:null,dialog:null,slewing:false,target:{ra:3,dec:20},pointing:{ra:1,dec:10}});
 });
});

describe('RA-07 stop, resume, late callbacks and Tracking during a slew',()=>{
 it('Set Coordinates during a slew pauses SlewTimer2 for a Yes/No stop question',()=>{
  let s=slewTo(at(1,10),fields('3','0','0','20','0','0'));
  for(let i=0;i<3;i++)s=track(slewTimerTick(s,O,s.slewRun)).state;
  const ask=track(openSetCoordinates(s,O));expect(ask.outcome).toBe('stop-requested');expect(ask.state).toMatchObject({slewTimerEnabled:false,slewing:true,notice:{kind:'stop-slew'},dialog:null});
  expect(track(slewTimerTick(ask.state,O,ask.state.slewRun)).state).toBe(ask.state);// a callback queued before the pause does nothing
  const resumed=track(answerNotice(ask.state,O,'stop-slew','no'));expect(resumed.outcome).toBe('slew-resumed');expect(resumed.state.slewTimerEnabled).toBe(true);
  expect(runSlew(resumed.state).state.pointing).toEqual({ra:3,dec:20});
  const stopped=track(answerNotice(track(openSetCoordinates(resumed.state,O)).state,O,'stop-slew','yes'));
  expect(stopped.outcome).toBe('slew-stopped');expect(stopped.state).toMatchObject({slewing:false,slewTimerEnabled:false,manualButtonsEnabled:true,rateSpinEnabled:true,status:'none',notice:null});
  expect(stopped.state.pointing.dec).toBeCloseTo(10+3*5000/3600,12);expect(stopped.state.pointing.ra).toBe(1);
  expect(track(answerNotice(stopped.state,O,'stop-slew','yes')).outcome).toBe('notice-stale');
 });
 it('a callback from an earlier run cannot move a newer slew',()=>{
  const first=slewTo(at(1,10),fields('3','0','0','20','0','0'));
  const stopped=track(answerNotice(track(openSetCoordinates(first,O)).state,O,'stop-slew','yes')).state;
  const second=slewTo(stopped,fields('5','0','0','10','0','0'));expect(second.slewRun).toBe(2);
  expect(track(slewTimerTick(second,O,1))).toMatchObject({outcome:'slew-timer-idle',changed:false});
  expect(track(slewTimerTick(second,O,2)).outcome).toBe('slew-tick');
 });
 it('Tracking off during a slew hides Set Coordinates; the slew still completes and re-enables N/S/E/W',()=>{
  const s=slewTo(at(1,10),fields('3','0','0','20','0','0')),off=track(toggleTracking(s,O)).state;
  expect(off).toMatchObject({tracking:false,slewMenuEnabled:false,slewing:true,slewTimerEnabled:true});
  expect(track(openSetCoordinates(off,O)).outcome).toBe('menu-disabled');
  const end=runSlew(off).state;expect(end).toMatchObject({tracking:false,manualButtonsEnabled:true,rateSpinEnabled:true,slewMenuEnabled:false,pointing:{ra:3,dec:20}});
 });
 it('rejects a second dialog while one is open',()=>{
  const open=enter(tracking(),fields('1','0','0','1','0','0'));expect(track(openSetCoordinates(open,O)).outcome).toBe('modal-open');
  expect(track(answerNotice(open,O,'confirm-slew','yes')).outcome).toBe('notice-stale');
 });
});

describe('WEB-OPT-01 supported web option profile (browser limit, not original options validation)',()=>{
 const issues=(over:Partial<RadioLabOptions>)=>radioLabProfileIssues(opts(over));
 const raStep=(rate:number)=>rate*RADIO_LAB_CONSTANTS.raStepPerRate/RADIO_LAB_CONSTANTS.raStepDivisor;
 it('keeps the compiled defaults and the transit/instant/limits scenarios supported',()=>{
  for(const o of [O,opts({transitTelescope:true}),opts({instantSlew:true}),opts({limitsEnabled:true})])expect(radioLabProfileIssues(o)).toEqual([]);
  expect(RADIO_WEB_OPTION_PROFILE.raStepLimitHours).toBe(RADIO_LAB_CONSTANTS.halfTurnHours/2);
 });
 it('root option controls: shape-valid zero, negative, oversized-step, out-of-sky and overflowing values are refused with a reason',()=>{
  // radio-antenna-independent/lifecycle-review-controls/option-results.json: each was accepted by the shape check alone.
  for(const bad of [{rateBase:0},{rateBase:-50},{maxRateIndex:8},{latitudeRadians:100},{latitudeRadians:Number.MAX_VALUE}])expect(isRadioLabOptions(opts(bad))).toBe(true);
  expect(issues({rateBase:0})).toEqual([{kind:'rate-not-advancing',index:1}]);
  expect(issues({rateBase:-50})).toEqual([{kind:'rate-not-advancing',index:1}]);
  const big=issues({maxRateIndex:8});expect(big).toEqual([{kind:'ra-step',index:7,raStepHours:raStep(500_000)}]);expect((big[0] as {raStepHours:number}).raStepHours).toBeCloseTo(9.259,3);
  expect(issues({latitudeRadians:100})).toEqual([{kind:'initial-declination',declination:100*RADIO_LAB_CONSTANTS.radiansToDegrees}]);
  expect(issues({latitudeRadians:Number.MAX_VALUE})).toEqual([{kind:'initial-declination',declination:Infinity}]);
  expect(issues({latitudeRadians:-100,rateBase:0}).map(i=>i.kind)).toEqual(['initial-declination','rate-not-advancing']);
  expect(()=>radioLabProfileIssues({...O,rateBase:1.5})).toThrow('Invalid radio lab options');
 });
 it('derives the RA bound from the reachable indices and the rate base, not from a fixed maximum index',()=>{
  expect(issues({maxRateIndex:6})).toEqual([]);// base 50: index 6 gives 0.93 h
  expect(issues({maxRateIndex:7})).toMatchObject([{kind:'ra-step',index:7}]);// 9.26 h
  expect(issues({maxRateIndex:5,rateBase:3239})).toEqual([]);expect(issues({maxRateIndex:5,rateBase:3241})).toMatchObject([{kind:'ra-step',index:5}]);
  // Startup index 4 is reachable even when the options maximum is lower: FormActivate sets it and RateSpin cannot go up.
  for(const maxRateIndex of [0,1,2,3,4]){
   expect(issues({maxRateIndex,rateBase:32399})).toEqual([]);
   expect(issues({maxRateIndex,rateBase:32401})).toMatchObject([{kind:'ra-step',index:4}]);
  }
  // At the boundary the verdict follows the binary64 RA step computed as in SlewTimer2 (rate × operand / 15).
  const verdicts=new Set<boolean>();
  for(let base=32395;base<=32405;base++){const ok=raStep(10*base)<6;verdicts.add(ok);expect(isSupportedRadioLabProfile(opts({maxRateIndex:0,rateBase:base})),String(base)).toBe(ok);}
  expect([...verdicts].sort()).toEqual([false,true]);
  expect(isSupportedRadioLabProfile(opts({maxRateIndex:255,rateBase:1}))).toBe(false);
 });
 it('admits a latitude only when its starting Declination is finite and inside −90°…+90°',()=>{
  const k=RADIO_LAB_CONSTANTS;
  for(const lat of [0,-0.5,1.5,-1.5,Math.PI/2,-Math.PI/2,90/k.radiansToDegrees,1.6,-1.6]){
   const dec=lat*k.radiansToDegrees;expect(isSupportedRadioLabProfile(opts({latitudeRadians:lat})),String(lat)).toBe(dec>=-90&&dec<=90);
  }
  expect(issues({latitudeRadians:-1.6})).toMatchObject([{kind:'initial-declination'}]);expect(issues({latitudeRadians:1.5})).toEqual([]);
 });
 it('refuses activation and every slewing action without changing anything; cancel, decline and the stop question still work',()=>{
  const bad=opts({rateBase:0});
  const off=track(activateRadioLab(INITIAL_RADIO_LAB,bad));expect(off).toMatchObject({outcome:'options-unsupported',changed:false,steps:[]});expect(off.state).toBe(INITIAL_RADIO_LAB);
  const s=tracking();
  for(const t of [toggleTracking(s,bad),changeSlewRate(s,bad,'down'),openSetCoordinates(s,bad)])expect(track(t)).toMatchObject({outcome:'options-unsupported',changed:false,state:s});
  const open=enter(s,fields('3','0','0','20','0','0'));
  expect(track(confirmSkyCoords(open,bad))).toMatchObject({outcome:'options-unsupported',state:open});
  expect(track(editSkyCoordsField(open,'raHours','4')).outcome).toBe('field-edited');expect(track(cancelSkyCoords(open)).outcome).toBe('dialog-cancelled');
  const ask=track(confirmSkyCoords(open,O)).state;
  expect(track(answerNotice(ask,bad,'confirm-slew','yes'))).toMatchObject({outcome:'options-unsupported',state:ask});
  expect(track(answerNotice(ask,bad,'confirm-slew','no')).outcome).toBe('slew-declined');
  let run=track(answerNotice(ask,O,'confirm-slew','yes')).state;run=track(slewTimerTick(run,O,run.slewRun)).state;
  expect(track(slewTimerTick(run,bad,run.slewRun))).toMatchObject({outcome:'options-unsupported',state:run});
  const stop=track(openSetCoordinates(run,bad));expect(stop.outcome).toBe('stop-requested');
  expect(track(answerNotice(stop.state,bad,'stop-slew','no')).outcome).toBe('slew-resumed');
  expect(track(answerNotice(stop.state,bad,'stop-slew','yes')).state).toMatchObject({slewing:false,pointing:run.pointing,target:run.target});
 });
 it('a host option change mid-run holds the slew without losing progress; the valid profile resumes to the same result',()=>{
  const start=slewTo(at(1,10),fields('3','0','0','20','0','0')),reference=runSlew(start);
  let s=start;for(let i=0;i<5;i++)s=track(slewTimerTick(s,O,s.slewRun)).state;
  for(const bad of [opts({rateBase:0}),opts({maxRateIndex:8}),opts({latitudeRadians:100}),opts({rateBase:-50})])expect(track(slewTimerTick(s,bad,s.slewRun)).state).toBe(s);
  const resumed=runSlew(s);
  expect(resumed.state.pointing).toEqual(reference.state.pointing);expect(resumed.state.slewTicks).toBe(reference.state.slewTicks);expect(resumed.outcomes.length+5).toBe(reference.outcomes.length);
 });
 it('refuses the callback that reads a stored rate outside the profile (the Dec→RA switch) even under supported options',()=>{
  const s:RadioLabState={...slewTo(at(1,10),fields('3','0','0','20','0','0')),rate:5_000_000,rateIndex:8};
  // Dec callbacks add the step written at the start (5000 arcsec); they never read the stored rate.
  expect(radioLabTickRefusal(s,O)).toBeNull();expect(track(slewTimerTick(s,O,s.slewRun)).outcome).toBe('slew-tick');
  // The last Dec callback snaps Dec to the target and sets axisDone: the next one computes the RA step from s.rate.
  const boundary:RadioLabState={...s,pointing:{ra:1,dec:20},axisDone:true};
  // The options are supported, so the refusal names the rate (radioLabRateIssues 'stored'), not the options.
  expect(track(slewTimerTick(boundary,O,s.slewRun))).toMatchObject({outcome:'rate-unsupported',changed:false,state:boundary});
  expect(radioLabTickRefusal(boundary,O)).toBe('rate-unsupported');
  expect(track(slewTimerTick({...boundary,rate:0},O,s.slewRun)).outcome).toBe('rate-unsupported');
  expect(track(slewTimerTick(boundary,opts({rateBase:0}),s.slewRun)).outcome).toBe('options-unsupported');// the record is checked first
  expect(radioLabTickRefusal(s,opts({rateBase:0}))).toBe('options-unsupported');
 });
 it('the RA tolerance compares the plain hour values: 0 h and 24 h are 24 h apart (no wrap), as the panel wording now states',()=>{
  const B=opts({maxRateIndex:4,rateBase:3241}),kept:RadioLabState={...at(0,10,B),rateIndex:5,rate:324100};
  const wrapTarget=enter(kept,fields('24','0','0','10','0','0'),B);
  expect(radioLabRateIssues(wrapTarget,B)).toMatchObject([{context:'start',target:{ra:24,dec:10},raStepOnly:true,issue:{kind:'ra-step',index:5}}]);
  expect(track(confirmSkyCoords(wrapTarget,B))).toMatchObject({outcome:'rate-unsupported',changed:false});
  const decOnly=enter(kept,fields('0','0','0','20','0','0'),B);
  expect(radioLabRateIssues(decOnly,B)).toEqual([]);expect(track(confirmSkyCoords(decOnly,B)).outcome).toBe('slew-confirm-requested');
 });
 it('the predictor reports no refusal while SlewTimer2 is disabled (idle or paused), as slewTimerTick answers idle first; the shape is still checked',()=>{
  const bad=opts({rateBase:0});
  // Idle: never started, and after a completed slew. Before: options-unsupported for a callback that cannot arrive.
  for(const idle of [INITIAL_RADIO_LAB,activated(),runSlew(slewTo(at(1,10),fields('1','0','0','11','0','0'))).state]){
   expect(idle.slewTimerEnabled).toBe(false);expect(radioLabTickRefusal(idle,bad)).toBeNull();
   expect(track(slewTimerTick(idle,bad,idle.slewRun))).toMatchObject({outcome:'slew-timer-idle',changed:false});
  }
  // Paused at the stop question exactly at the Dec→RA switch with an unsupported stored rate. Before: rate-unsupported.
  const boundary:RadioLabState={...slewTo(at(1,10),fields('3','0','0','20','0','0')),rate:5_000_000,rateIndex:8,pointing:{ra:1,dec:20},axisDone:true};
  const paused=track(openSetCoordinates(boundary,O)).state;
  expect(paused).toMatchObject({slewTimerEnabled:false,slewing:true,notice:{kind:'stop-slew'}});
  expect(radioLabTickRefusal(paused,O)).toBeNull();expect(radioLabTickRefusal(paused,bad)).toBeNull();
  expect(track(slewTimerTick(paused,O,paused.slewRun))).toMatchObject({outcome:'slew-timer-idle',changed:false});
  // No resumes the same run: the refusal is reported again for the callback that is now pending.
  const resumed=track(answerNotice(paused,O,'stop-slew','no')).state;
  expect(radioLabTickRefusal(resumed,O)).toBe('rate-unsupported');expect(radioLabTickRefusal(resumed,bad)).toBe('options-unsupported');
  // The option shape check is kept for idle states too.
  for(const malformed of [{...O,maxRateIndex:256},{...O,rateBase:1.5},{...O,latitudeRadians:Number.NaN},null])
   expect(()=>radioLabTickRefusal(INITIAL_RADIO_LAB,malformed as unknown as RadioLabOptions)).toThrow('Invalid radio lab options');
 });
 it('supported profiles reach the target within a bounded number of callbacks, including RA steps just below 6 h',()=>{
  const finish=(o:RadioLabOptions,from:RadioPointingLike,to:SkyCoordsFields)=>{
   const rate=slewRateFor(Math.max(o.maxRateIndex,4),o),limit=Math.ceil(180/(rate*RADIO_LAB_CONSTANTS.decStepPerRate))+Math.ceil(12/raStep(rate))+6;
   const r=runSlew(slewTo({...tracking(o),pointing:from},to,o),o,limit+1);
   expect(r.outcomes.length,`${o.rateBase} ${JSON.stringify(from)} ${JSON.stringify(to)}`).toBeLessThanOrEqual(limit);
   expect(r.state.notice).toEqual({kind:'slew-complete'});return r.state;
  };
  const edge=opts({rateBase:3239});expect(raStep(slewRateFor(5,edge))).toBeGreaterThan(5.99);
  for(const [ra,h] of [[0,'24'],[23.99,'0'],[0,'12'],[12,'0'],[6,'18'],[18,'6'],[0.001,'23.999'],[23.999,'0.001']] as const)
   expect(finish(edge,{ra,dec:0},fields(h,'0','0','1','0','0')).pointing).toEqual({ra:normalizeRaHours(Number(h)),dec:1});
  const next=lcg(606);
  for(let i=0;i<300;i++){
   const o=opts({rateBase:next(50,3239)}),from={ra:next(0,2399)/100,dec:next(-900,900)/10},raC=next(0,2400),decT=next(-900,900);
   const end=finish(o,from,fields(fixedText(raC,2),'0','0',fixedText(decT,1),'0','0'));
   expect(end.pointing).toEqual({ra:normalizeRaHours(raC/100),dec:decT/10});// stored values are the nearest binary64 of the decimals
  }
 });
});
type RadioPointingLike={ra:number;dec:number};

describe('WEB-OPT-01 state context: rates kept from earlier host options (browser limit, not original validation)',()=>{
 // Coordinator reproduction radio-antenna-independent/review-lifecycle-findings/cross-options.json (pure TS and browser):
 // A and B are each supported, but an index raised under A is kept under B.
 const raStep=(rate:number)=>rate*RADIO_LAB_CONSTANTS.raStepPerRate/RADIO_LAB_CONSTANTS.raStepDivisor;
 const A=opts({maxRateIndex:6}),B=opts({maxRateIndex:4,rateBase:3241});
 const target=fields('3','0','0','20','0','0');
 /** A programmed slew under A raises the index to 6 and keeps it after arrival. */
 function afterA():RadioLabState{
  const r=runSlew(slewTo(at(1,10,A),target,A),A);
  expect(r.state).toMatchObject({rateIndex:6,rate:50000,rateSpinEnabled:true,slewing:false,pointing:{ra:3,dec:20}});
  return track(answerNotice(r.state,A,'slew-complete','ok')).state;
 }
 /** The native RateDown under B from index 6: index 5, Power(10, 2) × 3241. */
 function downUnderB():RadioLabState{
  const t=track(changeSlewRate(afterA(),B,'down'));
  expect(t).toMatchObject({outcome:'rate-down',changed:true,steps:['RA-06'],state:{rateIndex:5,rate:324100}});
  return t.state;
 }
 it('both records are supported; the kept index 6 keeps its 50000 rate, and RateDown applies the native 324100',()=>{
  expect(isSupportedRadioLabProfile(A)).toBe(true);expect(isSupportedRadioLabProfile(B)).toBe(true);
  expect(radioLabRateIssues(afterA(),B)).toEqual([]);// a slew now keeps 6/50000 (0.926 h RA steps)
  const s=downUnderB();
  expect(raStep(324100)).toBeCloseTo(6.00185185185,10);
  // No coordinates chosen yet: the refusal applies to coordinates that need the RA step (raStepOnly: the Dec step passes).
  expect(radioLabRateIssues(s,B)).toEqual([{context:'start',rate:324100,issue:{kind:'ra-step',index:5,raStepHours:raStep(324100)},target:null,raStepOnly:true}]);
  expect(radioLabRateIssues(s,A)).toEqual([]);// under A a start raises the index to 6 again
 });
 it('OK is refused before an impossible slew: dialog draft, target and pointing kept; Cancel works',()=>{
  const s=downUnderB(),open=enter(s,fields('2','0','0','25','0','0'),B);
  const ok=track(confirmSkyCoords(open,B));
  expect(ok).toMatchObject({outcome:'rate-unsupported',changed:false,steps:[]});expect(ok.state).toBe(open);
  expect(ok.state.dialog!.fields).toEqual(fields('2','0','0','25','0','0'));expect(ok.state.target).toEqual(s.target);expect(ok.state.pointing).toEqual({ra:3,dec:20});
  const c=track(cancelSkyCoords(ok.state));expect(c.outcome).toBe('dialog-cancelled');expect(c.state).toMatchObject({slewing:false,slewTimerEnabled:false,target:s.target,pointing:{ra:3,dec:20}});
 });
 it('Yes is refused when the host switches A → B while the confirmation is open; No still declines; A starts with the raised index',()=>{
  const s=downUnderB(),ask=track(confirmSkyCoords(enter(s,fields('2','0','0','25','0','0'),A),A));
  expect(ask.outcome).toBe('slew-confirm-requested');
  const yes=track(answerNotice(ask.state,B,'confirm-slew','yes'));
  expect(yes).toMatchObject({outcome:'rate-unsupported',changed:false});expect(yes.state).toBe(ask.state);expect(yes.state.notice!.kind).toBe('confirm-slew');
  expect(track(answerNotice(ask.state,B,'confirm-slew','no'))).toMatchObject({outcome:'slew-declined',state:{slewing:false,target:{ra:2,dec:25}}});
  const started=track(answerNotice(ask.state,A,'confirm-slew','yes'));
  expect(started).toMatchObject({outcome:'slew-started',state:{rateIndex:6,rate:50000}});
 });
 it('recovery: a second RateDown under B gives index 4 (32410) and the slew reaches its target',()=>{
  const s=track(changeSlewRate(downUnderB(),B,'down')).state;
  expect(s).toMatchObject({rateIndex:4,rate:32410});expect(radioLabRateIssues(s,B)).toEqual([]);
  const r=runSlew(slewTo(s,fields('2','0','0','25','0','0'),B),B);
  expect(r.state).toMatchObject({notice:{kind:'slew-complete'},pointing:{ra:2,dec:25},rateIndex:4,rate:32410});
 });
 it('during a slew, a press that would give the running slew an unsupported rate is refused; the slew completes',()=>{
  const running=slewTo(afterA(),fields('5','0','0','10','0','0'),B);
  expect(running).toMatchObject({slewing:true,rateIndex:6,rate:50000});// 4 > 6 is false: the start keeps the stored rate
  const on=track(toggleTracking(track(toggleTracking(running,B)).state,B)).state;// Tracking on re-enables RateSpin (original quirk)
  expect(on.rateSpinEnabled).toBe(true);
  expect(radioLabRateIssues(on,B)).toEqual([{context:'down',rate:324100,issue:{kind:'ra-step',index:5,raStepHours:raStep(324100)}}]);
  const down=track(changeSlewRate(on,B,'down'));expect(down).toMatchObject({outcome:'rate-unsupported',changed:false});expect(down.state).toBe(on);
  expect(track(changeSlewRate(on,B,'up')).outcome).toBe('rate-at-limit');
  const r=runSlew(on,B);expect(r.outcomes.every(o=>o!=='rate-unsupported'&&o!=='options-unsupported')).toBe(true);
  expect(r.state).toMatchObject({pointing:{ra:5,dec:10},notice:{kind:'slew-complete'}});
 });
 it('a malformed or restored stored rate: Dec runs, the Dec→RA switch is refused and explained, Stop works, RateSpin presses recover it',()=>{
  const restored:RadioLabState={...slewTo(at(1,10),target),rate:5_000_000,rateIndex:8};
  // 'stored' is reported while the slew will still read the rate (pending Dec→RA switch on a non-transit telescope).
  expect(radioLabRateIssues(restored,O)).toEqual([{context:'stored',rate:5_000_000,issue:{kind:'ra-step',index:8,raStepHours:raStep(5_000_000)}}]);
  expect(radioLabRateIssues({...restored,rate:Number.NaN},O)).toEqual([{context:'stored',rate:Number.NaN,issue:{kind:'rate-not-advancing',index:8}}]);
  // Dec 10° → 20° with the 5000-arcsec step written at the start: 8 callbacks, then the switch callback is refused.
  const halted=runSlew(restored);
  expect(halted.outcomes).toEqual([...Array(8).fill('slew-tick'),'rate-unsupported']);
  expect(halted.state).toMatchObject({pointing:{ra:1,dec:20},axisDone:true,phase:0,status:'slewing',slewTimerEnabled:true});
  expect(runSlew({...restored,rate:Number.NaN}).outcomes.at(-1)).toBe('rate-unsupported');
  const ask=track(openSetCoordinates(halted.state,O));expect(ask.outcome).toBe('stop-requested');
  expect(radioLabRateIssues(ask.state,O).map(i=>i.context)).toEqual(['stored']);// paused: the same slew still holds the rate
  const resumed=track(answerNotice(ask.state,O,'stop-slew','no')).state;
  expect(track(slewTimerTick(resumed,O,resumed.slewRun))).toMatchObject({outcome:'rate-unsupported',state:resumed});
  const stopped=track(answerNotice(track(openSetCoordinates(resumed,O)).state,O,'stop-slew','yes')).state;
  expect(stopped).toMatchObject({slewing:false,rateSpinEnabled:true,pointing:halted.state.pointing,target:restored.target});
  expect(radioLabRateIssues(stopped,O).map(i=>i.context)).toEqual(['start']);// 5 > 8 is false: a start would keep 5e6
  expect(track(confirmSkyCoords(enter(stopped,fields('5','0','0','10','0','0')),O)).outcome).toBe('rate-unsupported');
  // Idle presses are applied as in the original, even through index 7 (500000, also unsupported) to index 6.
  const seven=track(changeSlewRate(stopped,O,'down')).state;expect(seven).toMatchObject({rateIndex:7,rate:500_000});
  expect(radioLabRateIssues(seven,O).map(i=>i.context)).toEqual(['start']);
  const six=track(changeSlewRate(seven,O,'down')).state;expect(six).toMatchObject({rateIndex:6,rate:50_000});expect(radioLabRateIssues(six,O)).toEqual([]);
  expect(runSlew(slewTo(six,fields('5','0','0','10','0','0'))).state).toMatchObject({pointing:{ra:5,dec:10},notice:{kind:'slew-complete'}});
 });
 it('compatible supported option changes keep the native behavior unchanged',()=>{
  const s=afterA();
  for(const [o,rate] of [[O,5000],[opts({maxRateIndex:4,rateBase:300}),30000],[opts({maxRateIndex:7,rateBase:5}),500]] as const){
   expect(radioLabRateIssues(s,o)).toEqual([]);
   expect(track(changeSlewRate(s,o,'down')).state).toMatchObject({rateIndex:5,rate});
  }
  const r=runSlew(slewTo(s,fields('5','0','0','10','0','0'),O));// compiled maximum 5 < 6: the kept 6/50000 drives the slew
  expect(r.state).toMatchObject({pointing:{ra:5,dec:10},rateIndex:6,rate:50000,notice:{kind:'slew-complete'}});
 });
 it('across option pairs and branches, every accepted start or press keeps each actual rate consumer advancing, through the Dec→RA switch',()=>{
  // Bounded on purpose: one Dec callback, the switch callback from the state the last Dec callback writes (Dec snapped to
  // the target, axisDone set; nothing else changes in between), presses in both phases, and complete runs only where the
  // callback bound is small. No multi-million tiny-step loop is run.
  const records:RadioLabOptions[]=[];
  for(const maxRateIndex of [0,2,4,5,6,7])for(const rateBase of [1,50,300,3241,32399]){const o=opts({maxRateIndex,rateBase});if(isSupportedRadioLabProfile(o))records.push(o);}
  const k=RADIO_LAB_CONSTANTS,to={ra:3,dec:20};
  const atSwitch=(s:RadioLabState):RadioLabState=>({...s,pointing:{ra:s.pointing.ra,dec:s.target.dec},axisDone:true});
  // Untracked transitions in this hot loop: outcomes and states are asserted directly below; the focused tests run the
  // same flows through track() (contract IDs, frozen states).
  const begin=(s:RadioLabState,o:RadioLabOptions)=>{
   let n0=openSetCoordinates(s,o).state;for(const [f,v] of Object.entries(target))n0=editSkyCoordsField(n0,f as keyof SkyCoordsFields,v).state;
   let t=confirmSkyCoords(n0,o);if(t.outcome==='transit-notice')t=answerNotice(t.state,o,'transit-dec-only','ok');
   return t.outcome==='slew-confirm-requested'?answerNotice(t.state,o,'confirm-slew','yes'):t;
  };
  const retrackRaw=(s:RadioLabState,o:RadioLabOptions)=>toggleTracking(toggleTracking(s,o).state,o).state;
  const n={started:0,refused:0,pressRefused:0,unusedRaUnsafe:0,raPhasePresses:0,completed:0,instant:0,transit:0};
  for(const P of records)for(let index=1;index<=Math.max(4,P.maxRateIndex);index++){
   const base:RadioLabState={...at(1,10,P),rateIndex:index,rate:slewRateFor(index,P)};// a state reachable under P
   for(const R of records)for(const branch of ['programmed','transit','instant'] as const){
    const Q={...R,transitTelescope:branch==='transit',instantSlew:branch==='instant'};// the host may switch either flag
    for(const press of [null,'down','up'] as const){
     const s=press?changeSlewRate(base,Q,press).state:base;// idle presses are applied natively
     // Independent re-derivation of the 0x566f6b raise loop: the rate the start keeps or recomputes.
     let i=s.rateIndex,r=s.rate;while(Q.maxRateIndex>i){i++;r=slewRateFor(i,Q);}
     const raOk=raStep(r)<6;// under supported records every kept or reachable rate is finite and positive
     // Bounded: idle presses apply the same native step in every branch and the programmed branch covers them, so the
     // transit/instant branches keep only the unpressed start and the presses that leave an RA-unsafe rate.
     if(branch!=='programmed'&&press&&raOk)continue;
     const start=begin(s,Q);
     if(branch==='programmed'&&!raOk){
      expect(start.outcome).toBe('rate-unsupported');expect(radioLabRateIssues(s,Q).map(x=>x.context)).toEqual(['start']);n.refused++;continue;
     }
     expect(radioLabRateIssues(s,Q)).toEqual([]);if(!raOk)n.unusedRaUnsafe++;
     if(branch==='instant'){expect(start.outcome).toBe('slew-instant');expect(start.state).toMatchObject({pointing:to,slewTimerEnabled:false,rateIndex:i,rate:r});n.instant++;continue;}
     expect(start.outcome).toBe('slew-started');expect(start.state).toMatchObject({rateIndex:i,rate:r,step:r*k.decStepPerRate});n.started++;
     const run=start.state,first=slewTimerTick(run,Q,run.slewRun);
     expect(first.outcome).toBe('slew-tick');expect(first.state.pointing.dec).toBeGreaterThan(10);
     const sw=slewTimerTick(atSwitch(run),Q,run.slewRun);
     if(branch==='transit'){expect(sw.outcome).toBe('slew-complete');n.transit++;continue;}// phase 3: the stored rate is never read
     expect(sw.outcome).toBe('slew-axis-ra');expect(Math.abs(sw.state.step)).toBeLessThan(6);expect(24+Math.abs(sw.state.step)).toBeGreaterThan(24);
     // Dec phase presses (RateSpin enabled again by Tracking): an accepted press's rate also passes at the switch.
     const on=retrackRaw(run,Q);
     for(const d of ['down','up'] as const){
      const t=changeSlewRate(on,Q,d);
      if(t.changed){const sw2=slewTimerTick(atSwitch(t.state),Q,run.slewRun);expect(sw2.outcome).toBe('slew-axis-ra');expect(Math.abs(sw2.state.step)).toBeLessThan(6);}
      else{expect(['rate-unsupported','rate-at-limit']).toContain(t.outcome);if(t.outcome==='rate-unsupported')n.pressRefused++;}
     }
     // RA phase: the step is fixed, so presses are applied natively and never change it.
     const raOn=retrackRaw(sw.state,Q);
     for(const d of ['down','up'] as const){
      const t=changeSlewRate(raOn,Q,d);expect(['rate-down','rate-up','rate-at-limit']).toContain(t.outcome);
      if(t.changed){n.raPhasePresses++;expect(t.state.step).toBe(raOn.step);expect(radioLabRateIssues(t.state,Q)).toEqual([]);expect(radioLabTickRefusal(t.state,Q)).toBeNull();}
     }
     // Representative completion where the callback bound is small (larger rates); smaller rates stop at the switch above.
     const bound=Math.ceil(10/(r*k.decStepPerRate))+Math.ceil(2/raStep(r))+3;
     if(bound<=40){let m=run,ticks=0;while(m.slewTimerEnabled&&ticks<bound){m=slewTimerTick(m,Q,m.slewRun).state;ticks++;}expect(m).toMatchObject({pointing:to,notice:{kind:'slew-complete'}});n.completed++;}
    }
   }
  }
  expect(n.started).toBeGreaterThan(1000);expect(n.refused).toBeGreaterThan(10);expect(n.pressRefused).toBeGreaterThan(10);
  expect(n.unusedRaUnsafe).toBeGreaterThan(10);expect(n.raPhasePresses).toBeGreaterThan(100);expect(n.completed).toBeGreaterThan(50);
  expect(n.instant).toBeGreaterThan(500);expect(n.transit).toBeGreaterThan(500);
 });
});

describe('WEB-OPT-01 phase context: rates are checked only where SlewTimer2 or the start actually reads them',()=>{
 // Coordinator observations radio-antenna-independent/phase-context-findings/observations.json (migrated TS, synthetic).
 // Native consumers (derived listings, see RA-10/RA-11): the start writes the Dec step from the rate (0x566f8a); the
 // callback reads the stored rate once, at the Dec→RA switch of a non-transit telescope (0x5674ff..0x56750f); the RA
 // phase adds the fixed step; a transit telescope goes from Dec to phase 3; instantSlew writes the pointing (0x566fb3).
 const raStep=(rate:number)=>rate*RADIO_LAB_CONSTANTS.raStepPerRate/RADIO_LAB_CONSTANTS.raStepDivisor;
 const A=opts({maxRateIndex:6}),B=opts({maxRateIndex:4,rateBase:3241});
 const AT={...A,transitTelescope:true},BT={...B,transitTelescope:true},BI={...B,instantSlew:true};
 /** Under A a slew raises the index to 6 (50000) and keeps it after arrival at 3 h / +20°. */
 function afterA():RadioLabState{
  const r=runSlew(slewTo(at(1,10,A),fields('3','0','0','20','0','0'),A),A);
  return track(answerNotice(r.state,A,'slew-complete','ok')).state;
 }
 /** Transit telescope: a slew under AT raises the index to 6; after arrival the host switches to BT and RateDown gives 5/324100. */
 function transitAt5():RadioLabState{
  const s={...activated(AT),pointing:{ra:4,dec:10}},r=runSlew(startUnder(s,fields('9','0','0','20','0','0'),AT).state,AT);
  expect(r.state).toMatchObject({rateIndex:6,pointing:{ra:4,dec:20},trackingVisible:false,rateSpinEnabled:true});
  const down=track(changeSlewRate(track(answerNotice(r.state,AT,'slew-complete','ok')).state,BT,'down'));
  expect(down.state).toMatchObject({rateIndex:5,rate:324100});return down.state;
 }
 for(const [label,f,phase] of [['phase 2 (RA rising)',fields('7','0','0','10','0','0'),2],['phase 3 (RA falling)',fields('1','0','0','10','0','0'),3]] as const)
  it(`${label}: the fixed RA step is unaffected by a RateSpin press under other options; the native press is applied`,()=>{
   const ra=toRaPhase(slewTo(afterA(),f,A),A);
   expect(ra).toMatchObject({phase,rateIndex:6,rate:50000});expect(Math.abs(ra.step)).toBe(0.9259259259259259);// observation: step 0.9259259259259259
   const on=retrack(ra,B);
   expect(radioLabRateIssues(on,B)).toEqual([]);// before: [{context:'down',…324100…}]
   const down=track(changeSlewRate(on,B,'down'));
   expect(down).toMatchObject({outcome:'rate-down',changed:true,state:{rateIndex:5,rate:324100,step:ra.step,phase}});// native RateSpinDownClick result
   const reference=runSlew(on,B),pressed=runSlew(down.state,B);
   expect(pressed.outcomes).toEqual(reference.outcomes);expect(pressed.pointings).toEqual(reference.pointings);
   expect(pressed.state).toMatchObject({notice:{kind:'slew-complete'},pointing:reference.state.pointing,rateIndex:5,rate:324100});
   expect(radioLabRateIssues(track(answerNotice(pressed.state,B,'slew-complete','ok')).state,B).map(i=>i.context)).toEqual(['start']);// the next start still gates it
  });
 it('a positive huge (or non-finite) stored rate during the RA phase is never read: callbacks continue unchanged',()=>{
  const ra=toRaPhase(slewTo(afterA(),fields('7','0','0','10','0','0'),A),A),reference=runSlew(ra,A);
  for(const rate of [5_000_000,Number.MAX_VALUE,Number.NaN]){
   const restored:RadioLabState={...ra,rateIndex:8,rate};
   expect(radioLabRateIssues(restored,A)).toEqual([]);expect(radioLabTickRefusal(restored,A)).toBeNull();
   const r=runSlew(restored,A);expect(r.outcomes).toEqual(reference.outcomes);expect(r.pointings).toEqual(reference.pointings);
  }
 });
 it('transit: Dec-only slews take no RA step, so an RA-unsafe kept rate starts and completes; a Dec-unsafe rate is still refused',()=>{
  const s=transitAt5();
  expect(radioLabRateIssues(s,BT)).toEqual([]);// before: [{context:'start',…ra-step 6.0018…}]
  const started=startUnder(s,fields('9','0','0','-30','0','0'),BT);
  expect(started).toMatchObject({outcome:'slew-started',state:{rateIndex:5,rate:324100,phase:1,step:-324100*RADIO_LAB_CONSTANTS.decStepPerRate}});
  const r=runSlew(started.state,BT);
  expect(r.outcomes).toEqual(['slew-tick','slew-complete']);expect(r.state).toMatchObject({pointing:{ra:4,dec:-30},phase:3,notice:{kind:'slew-complete'}});
  // The Dec step itself is read: a non-advancing kept rate is refused at OK with the Dec reason.
  for(const rate of [0,-5,Number.NaN,Number.POSITIVE_INFINITY,1e-300]){
   const bad={...s,rateIndex:8,rate};
   expect(radioLabRateIssues(bad,BT)).toEqual([{context:'start',rate,issue:{kind:'rate-not-advancing',index:8},target:null,raStepOnly:false}]);
   expect(track(confirmSkyCoords(enter(bad,fields('9','0','0','-30','0','0'),BT),BT)).outcome).toBe('rate-unsupported');
  }
 });
 it('transit option switched off mid-run: Dec continues, the switch callback that would read the RA-unsafe rate is refused; transit again completes; Stop works',()=>{
  const run=startUnder(transitAt5(),fields('9','0','0','-30','0','0'),BT).state;
  expect(radioLabRateIssues(run,B)).toEqual([{context:'stored',rate:324100,issue:{kind:'ra-step',index:5,raStepHours:raStep(324100)}}]);
  expect(radioLabRateIssues(run,BT)).toEqual([]);
  const decDone=track(slewTimerTick(run,B,run.slewRun));expect(decDone).toMatchObject({outcome:'slew-tick',state:{axisDone:true,pointing:{dec:-30}}});
  expect(radioLabTickRefusal(decDone.state,B)).toBe('rate-unsupported');
  expect(track(slewTimerTick(decDone.state,B,run.slewRun))).toMatchObject({outcome:'rate-unsupported',changed:false,state:decDone.state});
  expect(track(changeSlewRate(decDone.state,B,'down')).outcome).toBe('rate-disabled');// no Tracking button: RateSpin stays disabled
  expect(track(slewTimerTick(decDone.state,BT,run.slewRun)).outcome).toBe('slew-complete');
  const ask=track(openSetCoordinates(decDone.state,B));expect(ask.outcome).toBe('stop-requested');
  expect(radioLabRateIssues(ask.state,B).map(i=>i.context)).toEqual(['stored']);
  const stopped=track(answerNotice(ask.state,B,'stop-slew','yes')).state;
  expect(radioLabRateIssues(stopped,B).map(i=>i.context)).toEqual(['start']);expect(radioLabRateIssues(stopped,BT)).toEqual([]);
 });
 it('instantSlew writes the pointing at once: no rate is read, so a kept RA-unsafe or non-advancing rate does not refuse it',()=>{
  const s=track(changeSlewRate(afterA(),B,'down')).state;expect(s).toMatchObject({rateIndex:5,rate:324100});
  expect(radioLabRateIssues(s,BI)).toEqual([]);// before: [{context:'start',…}]
  const jump=startUnder(s,fields('2','0','0','25','0','0'),BI);
  expect(jump).toMatchObject({outcome:'slew-instant',state:{pointing:{ra:2,dec:25},rateIndex:5,rate:324100,slewTimerEnabled:false,slewing:false}});
  const zero=startUnder({...s,rateIndex:8,rate:0},fields('2','0','0','25','0','0'),BI);expect(zero.outcome).toBe('slew-instant');
  expect(track(confirmSkyCoords(enter(s,fields('2','0','0','25','0','0'),B),B)).outcome).toBe('rate-unsupported');// a programmed start still reads it
 });
 it('options switched between confirmations: each answer is checked against the branch it will actually take',()=>{
  const s=track(changeSlewRate(afterA(),B,'down')).state,f=fields('2','0','0','25','0','0');
  // OK under instant, then the host turns instant off while the confirmation is open.
  const ask=track(confirmSkyCoords(enter(s,f,BI),BI));expect(ask.outcome).toBe('slew-confirm-requested');
  expect(radioLabRateIssues(ask.state,B).map(i=>i.context)).toEqual(['start']);
  expect(track(answerNotice(ask.state,B,'confirm-slew','yes'))).toMatchObject({outcome:'rate-unsupported',changed:false,state:ask.state});
  expect(track(answerNotice(ask.state,B,'confirm-slew','no')).outcome).toBe('slew-declined');
  expect(track(answerNotice(ask.state,BI,'confirm-slew','yes')).outcome).toBe('slew-instant');
  // Transit note answered after the host turned transit off: the confirmation follows the live options; Yes is checked again.
  const t=transitAt5(),note=track(confirmSkyCoords(enter(t,fields('9','0','0','-30','0','0'),BT),BT));expect(note.outcome).toBe('transit-notice');
  expect(track(answerNotice(note.state,B,'transit-dec-only','cancel')).outcome).toBe('transit-cancelled');
  const confirm=track(answerNotice(note.state,B,'transit-dec-only','ok'));expect(confirm.state.notice).toEqual({kind:'confirm-slew',target:{ra:9,dec:-30},transit:false,hourAngle:null});
  expect(track(answerNotice(confirm.state,B,'confirm-slew','yes')).outcome).toBe('rate-unsupported');
  expect(track(answerNotice(confirm.state,BT,'confirm-slew','yes')).outcome).toBe('slew-started');
 });
 it('pending Dec→RA use: a Dec-phase press to a supported rate recovers a restored rate before the switch; an unsupported one is refused',()=>{
  const s:RadioLabState={...slewTo(at(1,10),fields('3','0','0','20','0','0')),rateIndex:7,rate:500_000};
  const on=retrack(s,O);expect(radioLabRateIssues(on,O).map(i=>i.context)).toEqual(['stored']);
  const six=track(changeSlewRate(on,O,'down'));expect(six).toMatchObject({outcome:'rate-down',state:{rateIndex:6,rate:50_000}});
  expect(radioLabRateIssues(six.state,O)).toEqual([]);
  expect(runSlew(six.state).state).toMatchObject({pointing:{ra:3,dec:20},notice:{kind:'slew-complete'}});
  const eight=retrack({...s,rateIndex:9,rate:5_000_000},O);
  expect(track(changeSlewRate(eight,O,'down'))).toMatchObject({outcome:'rate-unsupported',changed:false});// 8 → 5e6 would still be read at the switch
 });
 it('behind the modal stop question no press context is listed (every press returns modal-open); resume continues Dec',()=>{
  const running=retrack(slewTo(afterA(),fields('5','0','0','10','0','0'),B),B);
  expect(radioLabRateIssues(running,B).map(i=>i.context)).toEqual(['down']);
  const ask=track(openSetCoordinates(running,B));expect(track(changeSlewRate(ask.state,B,'down')).outcome).toBe('modal-open');
  expect(radioLabRateIssues(ask.state,B)).toEqual([]);// before: ['down'] although the press cannot happen
  const resumed=track(answerNotice(ask.state,B,'stop-slew','no')).state;
  expect(radioLabRateIssues(resumed,B).map(i=>i.context)).toEqual(['down']);
  expect(runSlew(resumed,B).state).toMatchObject({pointing:{ra:5,dec:10},notice:{kind:'slew-complete'}});
 });
 it('reentry after a completed RA-phase press: the next start is gated by the branch it takes, and a stopped run delivers nothing late',()=>{
  const ra=toRaPhase(slewTo(afterA(),fields('7','0','0','10','0','0'),A),A);
  const pressed=track(changeSlewRate(retrack(ra,B),B,'down')).state;
  const stopped=track(answerNotice(track(openSetCoordinates(pressed,B)).state,B,'stop-slew','yes')).state;
  expect(stopped).toMatchObject({slewing:false,rateIndex:5,rate:324100});
  expect(track(confirmSkyCoords(enter(stopped,fields('2','0','0','25','0','0'),B),B)).outcome).toBe('rate-unsupported');
  const second=startUnder(stopped,fields('2','0','0','25','0','0'),BI);expect(second.outcome).toBe('slew-instant');
  expect(track(slewTimerTick(second.state,BI,pressed.slewRun)).outcome).toBe('slew-timer-idle');
 });
});

describe('WEB-OPT-01 RA tolerance: a stored rate is refused only where its RA step would move the telescope',()=>{
 // Coordinator observations radio-antenna-independent/tolerance-feedback-findings/observations.json (migrated TS,
 // synthetic). RA-11 (derived listing GNU-SLEWTIMER2): at the non-transit Dec→RA switch +0x53e := Extended 0x5678d0 ≥ |d|,
 // and with +0x53e set the same callback completes, so the RA step it computes from the rate is never added.
 const k=RADIO_LAB_CONSTANTS,tol=k.initialRaToleranceHours;
 const raStep=(rate:number)=>rate*k.raStepPerRate/k.raStepDivisor;
 const A=opts({maxRateIndex:6}),B=opts({maxRateIndex:4,rateBase:3241}),AT={...A,transitTelescope:true},BT={...B,transitTelescope:true};
 const unsafe={kind:'ra-step',index:5,raStepHours:raStep(324100)} as const;
 /** The reproduced flow: under A a slew raises the index to 6 and arrives at 3 h / +20°; RateDown under B gives 5/324100. */
 function keptUnderB():RadioLabState{
  const r=runSlew(slewTo(at(1,10,A),fields('3','0','0','20','0','0'),A),A);
  const s=track(changeSlewRate(track(answerNotice(r.state,A,'slew-complete','ok')).state,B,'down')).state;
  expect(s).toMatchObject({rateIndex:5,rate:324100,pointing:{ra:3,dec:20},target:{ra:3,dec:20},rateSpinEnabled:true,slewing:false});
  return s;
 }
 const startIssues=(s:RadioLabState,o:RadioLabOptions)=>radioLabRateIssues(s,o).filter(i=>i.context==='start');
 it('observations: same RA and an RA inside the tolerance start a Dec-only slew that completes without an RA step; exact no-motion warns',()=>{
  const s=keptUnderB();
  expect(radioLabRateIssues(s,B)).toEqual([{context:'start',rate:324100,issue:unsafe,target:null,raStepOnly:true}]);
  for(const seconds of ['0','0.018']){
   const open=enter(s,fields('3','0',seconds,'10','0','0'),B);
   expect(radioLabRateIssues(open,B)).toEqual([]);// the valid draft takes no RA step
   const ok=track(confirmSkyCoords(open,B));expect(ok.outcome).toBe('slew-confirm-requested');// before: rate-unsupported
   const d=ok.state.target.ra-3;expect(Math.abs(d)).toBeLessThanOrEqual(tol);expect(d===0).toBe(seconds==='0');
   const yes=track(answerNotice(ok.state,B,'confirm-slew','yes'));
   expect(yes).toMatchObject({outcome:'slew-started',state:{rateIndex:5,rate:324100,phase:1,step:-324100*k.decStepPerRate}});
   const r=runSlew(yes.state,B);
   expect(r.outcomes).toEqual(['slew-tick','slew-complete']);// Dec snaps on the first callback; the switch completes at once
   expect(r.state).toMatchObject({pointing:{ra:3,dec:10},phase:d>0?2:3,axisDone:true,notice:{kind:'slew-complete'},rateIndex:5,rate:324100});
   // The switch still computes Sign(d) × rate × 0x5678dc / 15 into +0x525; that step is never added (RA not snapped either).
   expect(r.state.step).toBe(valueSign(d)*324100*k.raStepPerRate/k.raStepDivisor);
  }
  const same=track(confirmSkyCoords(enter(s,fields('3','0','0','20','0','0'),B),B));// before: rate-unsupported
  expect(same).toMatchObject({outcome:'no-slew-needed',state:{dialog:null,notice:{kind:'no-slew-needed'},target:{ra:3,dec:20},pointing:{ra:3,dec:20}}});
 });
 it('the existing tolerance is inclusive at its binary64 value; just outside it the RA step is taken, so start and switch are refused',()=>{
  // Synthetic start position 0 h (as at() does) so that the parsed separation equals the binary64 tolerance exactly.
  const s:RadioLabState={...keptUnderB(),pointing:{ra:0,dec:20}};
  const atTol=enter(s,fields('0','0','0.036','10','0','0'),B);
  expect((parseSkyCoords(atTol.dialog!.fields) as {ra:number}).ra-0).toBe(tol);
  expect(radioLabRateIssues(atTol,B)).toEqual([]);
  const run=track(answerNotice(track(confirmSkyCoords(atTol,B)).state,B,'confirm-slew','yes')).state;
  const r=runSlew(run,B);expect(r.outcomes).toEqual(['slew-tick','slew-complete']);expect(r.state.pointing).toEqual({ra:0,dec:10});
  const outside=enter(s,fields('0','0','0.037','10','0','0'),B),outsideRa=(parseSkyCoords(outside.dialog!.fields) as {ra:number}).ra;
  expect(outsideRa).toBeGreaterThan(tol);
  expect(radioLabRateIssues(outside,B)).toEqual([{context:'start',rate:324100,issue:unsafe,target:{ra:outsideRa,dec:10},raStepOnly:true}]);
  const refused=track(confirmSkyCoords(outside,B));
  expect(refused).toMatchObject({outcome:'rate-unsupported',changed:false,steps:[]});expect(refused.state).toBe(outside);
  // Switch callback at the tolerance and at the next binary64 above it (synthetic target RA, same running slew).
  const atSwitch=(ra:number):RadioLabState=>({...run,target:{ra,dec:10},pointing:{ra:0,dec:10},axisDone:true});
  expect(radioLabTickRefusal(atSwitch(tol),B)).toBeNull();expect(track(slewTimerTick(atSwitch(tol),B,run.slewRun)).outcome).toBe('slew-complete');
  const above=atSwitch(nextFloat(tol,true));
  expect(radioLabRateIssues(above,B)).toEqual([{context:'stored',rate:324100,issue:unsafe}]);
  expect(radioLabTickRefusal(above,B)).toBe('rate-unsupported');expect(track(slewTimerTick(above,B,run.slewRun))).toMatchObject({outcome:'rate-unsupported',changed:false,state:above});
 });
 it('Yes is checked against the committed target: a Dec-only confirmation starts under B, an RA one is still refused',()=>{
  const s=keptUnderB();
  const decOnly=track(confirmSkyCoords(enter(s,fields('3','0','0','-5','0','0'),A),A));expect(decOnly.outcome).toBe('slew-confirm-requested');
  expect(startIssues(decOnly.state,B)).toEqual([]);
  expect(track(answerNotice(decOnly.state,B,'confirm-slew','yes'))).toMatchObject({outcome:'slew-started',state:{rateIndex:5,rate:324100,target:{ra:3,dec:-5}}});
  const withRa=track(confirmSkyCoords(enter(s,fields('4','0','0','-5','0','0'),A),A));
  expect(startIssues(withRa.state,B)).toEqual([{context:'start',rate:324100,issue:unsafe,target:{ra:4,dec:-5},raStepOnly:true}]);
  expect(track(answerNotice(withRa.state,B,'confirm-slew','yes'))).toMatchObject({outcome:'rate-unsupported',changed:false,state:withRa.state});
 });
 it('transit switched off mid-run at a within-tolerance switch: the callback completes; the observation vector completes too',()=>{
  const t={...activated(AT),pointing:{ra:4,dec:10}};
  const first=runSlew(startUnder(t,fields('9','0','0','20','0','0'),AT).state,AT).state;
  const kept=track(changeSlewRate(track(answerNotice(first,AT,'slew-complete','ok')).state,BT,'down')).state;
  expect(kept).toMatchObject({rateIndex:5,rate:324100,pointing:{ra:4,dec:20},trackingVisible:false});
  const run=startUnder(kept,fields('4','0','0.018','-30','0','0'),BT);expect(run.outcome).toBe('slew-started');
  expect(radioLabRateIssues(run.state,B)).toEqual([]);// live non-transit, but this switch ends within the tolerance
  const decDone=track(slewTimerTick(run.state,B,run.state.slewRun));expect(decDone.state).toMatchObject({axisDone:true,pointing:{ra:4,dec:-30}});
  expect(radioLabTickRefusal(decDone.state,B)).toBeNull();// before: 'rate-unsupported'
  const end=track(slewTimerTick(decDone.state,B,run.state.slewRun));
  expect(end).toMatchObject({outcome:'slew-complete',state:{pointing:{ra:4,dec:-30},phase:2,notice:{kind:'slew-complete'}}});
  // observations.json "live transit off at within-tolerance Dec-to-RA switch" (synthetic state over the same run).
  const vector:RadioLabState={...decDone.state,phase:1,axisDone:true,pointing:{ra:3,dec:10},target:{ra:3.000005,dec:10}};
  expect(vector.target.ra-vector.pointing.ra).toBe(0.000004999999999810711);
  expect(track(slewTimerTick(vector,B,vector.slewRun))).toMatchObject({outcome:'slew-complete',changed:true,state:{pointing:{ra:3,dec:10}}});
 });
 it('a Dec-phase press to an RA-unsafe rate is applied when the switch will end within the tolerance, refused when it takes the RA step',()=>{
  const r=runSlew(slewTo(at(1,10,A),fields('3','0','0','20','0','0'),A),A),afterA=track(answerNotice(r.state,A,'slew-complete','ok')).state;
  const decOnly=retrack(slewTo(afterA,fields('3','0','0','10','0','0'),B),B);
  expect(decOnly).toMatchObject({slewing:true,phase:1,rateIndex:6,rate:50000,rateSpinEnabled:true});
  expect(radioLabRateIssues(decOnly,B)).toEqual([]);
  const down=track(changeSlewRate(decOnly,B,'down'));expect(down).toMatchObject({outcome:'rate-down',state:{rateIndex:5,rate:324100}});// before: rate-unsupported
  const end=runSlew(down.state,B);expect(end.outcomes).toEqual(['slew-tick','slew-complete']);expect(end.state.pointing).toEqual({ra:3,dec:10});
  const withRa=retrack(slewTo(afterA,fields('5','0','0','10','0','0'),B),B);
  expect(radioLabRateIssues(withRa,B).map(i=>i.context)).toEqual(['down']);
  expect(track(changeSlewRate(withRa,B,'down'))).toMatchObject({outcome:'rate-unsupported',changed:false,state:withRa});
 });
 it('inside the dialog the reason follows the valid draft (converted for B1950); invalid text and entries outside the web domain keep their own refusal; limits stay gated',()=>{
  const s=keptUnderB(),open=track(openSetCoordinates(s,B)).state;
  expect(open.dialog!.fields).toEqual(skyCoordsFieldsFor({ra:3,dec:20}));
  expect(startIssues(open,B)).toEqual([]);// the prefill is the pointing: OK warns, it does not start
  const edit=(n:RadioLabState,f:SkyCoordsFields)=>{for(const [key,v] of Object.entries(f))n=track(editSkyCoordsField(n,key as keyof SkyCoordsFields,v)).state;return n;};
  const far=edit(open,fields('2','0','0','25','0','0'));
  expect(startIssues(far,B)).toEqual([{context:'start',rate:324100,issue:unsafe,target:{ra:2,dec:25},raStepOnly:true}]);
  expect(far.target).toEqual({ra:3,dec:20});// the stored target is not what the reason describes
  for(const [f,outcome] of [[fields('x','0','0','25','0','0'),'ra-invalid'],[fields('2','0','0','91','0','0'),'dec-invalid'],
   [fields('24.000000000000001','0','0','25','0','0'),'ra-unsupported']] as const){
   const bad=edit(far,f);expect(startIssues(bad,B)).toEqual([]);
   const t=track(confirmSkyCoords(bad,B));expect(t.outcome).toBe(outcome);// before: rate-unsupported
   expect(t.state).toMatchObject({target:{ra:3,dec:20},dialog:bad.dialog});
  }
  // B1950.0: the gate and OK use the J2000 target the conversion gives (RA-EP-03); a refusal writes no flag.
  const b1950=track(selectSkyCoordsEpoch(far,1)).state,j2000=precessSkyCoords('B1950->J2000',{ra:2,dec:25});
  expect(startIssues(b1950,B)).toEqual([{context:'start',rate:324100,issue:unsafe,target:{ra:j2000.ra,dec:j2000.dec},raStepOnly:true}]);
  const refusedB=track(confirmSkyCoords(b1950,B));expect(refusedB.outcome).toBe('rate-unsupported');expect(refusedB.state).toBe(b1950);expect(refusedB.state.skyCoordsB1950).toBe(false);  // Limit Slewing: the presentation assumes the request may pass (conservative); OK applies the altitude check first.
  const limits={...B,limitsEnabled:true};expect(startIssues(far,limits)).toEqual(startIssues(far,B));
  expect(track(confirmSkyCoords(far,limits))).toMatchObject({outcome:'limits-require-clock',state:{dialog:null,notice:null,target:{ra:2,dec:25},pointing:{ra:3,dec:20},slewing:false}});
  // HA 12 h (LST 14 − RA 2): altitude |lat + 25°| − 90° < 10°, so the native box comes first and the target is stored.
  expect(track(confirmSkyCoords(far,limits,lstReading(14)))).toMatchObject({outcome:'altitude-limit-request',state:{dialog:null,notice:{kind:'altitude-limit-request',transit:false},target:{ra:2,dec:25},slewing:false}});
  // HA 0: the check passes, so OK would reach the confirmation and the rate gate refuses it with nothing stored.
  const passing=track(confirmSkyCoords(far,limits,lstReading(2)));expect(passing.outcome).toBe('rate-unsupported');expect(passing.state).toBe(far);
 });
 it('a refused OK keeps draft and stored target; Cancel, reopen, No and a Dec-only entry then confirm and complete',()=>{
  const s=keptUnderB(),open=enter(s,fields('2','0','0','25','0','0'),B);
  const refused=track(confirmSkyCoords(open,B));expect(refused.state).toBe(open);
  const cancelled=track(cancelSkyCoords(refused.state)).state;expect(cancelled).toMatchObject({target:{ra:3,dec:20},dialog:null});
  expect(track(openSetCoordinates(cancelled,B)).state.dialog!.fields).toEqual(skyCoordsFieldsFor({ra:3,dec:20}));
  const ask=track(confirmSkyCoords(enter(cancelled,fields('3','0','0','5','0','0'),B),B));
  expect(ask.state.notice).toEqual({kind:'confirm-slew',target:{ra:3,dec:5},transit:false,hourAngle:null});
  const no=track(answerNotice(ask.state,B,'confirm-slew','no')).state;expect(no.target).toEqual({ra:3,dec:5});
  const reopened=track(openSetCoordinates(no,B)).state;expect(reopened.dialog!.fields).toEqual(skyCoordsFieldsFor({ra:3,dec:5}));
  const again=track(confirmSkyCoords(reopened,B));expect(again.outcome).toBe('slew-confirm-requested');
  const end=runSlew(track(answerNotice(again.state,B,'confirm-slew','yes')).state,B);
  expect(end.state).toMatchObject({pointing:{ra:3,dec:5},notice:{kind:'slew-complete'},rateIndex:5,rate:324100});
 });
 it('instant slew runs the start loop: it recomputes and stores index, rate and Dec step without using them to move',()=>{
  const o=opts({maxRateIndex:6,instantSlew:true}),s={...at(1,10,o),rateIndex:2,rate:slewRateFor(2,o)};
  expect(startUnder(s,fields('3','0','0','20','0','0'),o)).toMatchObject({outcome:'slew-instant',
   state:{pointing:{ra:3,dec:20},rateIndex:6,rate:50000,step:50000*k.decStepPerRate,slewTimerEnabled:false,slewing:false,slewTicks:0}});
 });
});

// RA-13: the chosen implementation contract with explicit readings. Readings with a chosen LST are synthetic controls
// (shape-valid inputs), not observations and not native oracles.
const LON=RADIO_CLOCK_CONSTANTS.compiledLongitudeRadians,T0=Date.UTC(2000,0,1,12);
const reading=(ms:number)=>radioClockReading(ms,LON);
const lstReading=(lstHours:number):RadioClockReading=>({utMs:T0,jd:2451545,lstHours});
const clockTick=(s:RadioLabState,r:RadioClockReading,o=O)=>track(radioClockTick(s,o,r));
const off=(s:RadioLabState,o=O)=>track(toggleTracking(s,o)).state;

describe('RA-13 ClocktimerTimer with an explicit web clock reading',()=>{
 it('is idle before activation or with the clocktimer disabled; the first FormActivate enables it with HA 0',()=>{
  expect(INITIAL_RADIO_LAB).toMatchObject({hourAngle:0,manualPress:false,clockTimerEnabled:false,clock:null});
  const idle=clockTick(INITIAL_RADIO_LAB,reading(T0));expect(idle).toMatchObject({outcome:'clock-idle',changed:false});expect(idle.state).toBe(INITIAL_RADIO_LAB);
  const a=activated();expect(a).toMatchObject({clockTimerEnabled:true,hourAngle:0,manualPress:false,clock:null});
  const disabled={...a,clockTimerEnabled:false};expect(clockTick(disabled,reading(T0)).state).toBe(disabled);
 });
 it('first tick after activation (Tracking off, HA 0): RA := LST; Dec untouched; the reading becomes the last accepted tick',()=>{
  const a=activated(),r=reading(T0),t=clockTick(a,r);
  expect(t).toMatchObject({outcome:'clock-tick',changed:true,steps:['RA-13']});
  expect(t.state.pointing).toEqual({ra:normalizeRaHours(r.lstHours),dec:a.pointing.dec});expect(t.state.hourAngle).toBe(0);
  expect(t.state.clock).toEqual(r);expect(Object.isFrozen(t.state.clock)).toBe(true);
 });
 it('Tracking on: HA := LST − RA; RA and Dec are held',()=>{
  const s=at(5,10),r=reading(T0),t=clockTick(s,r);
  expect(t.state.hourAngle).toBe(r.lstHours-5);expect(t.state.pointing).toEqual({ra:5,dec:10});
 });
 it('drift after a tracked tick: RA follows LST from the stored HA; 1000 ticks equal one tick at the final reading bit for bit',()=>{
  const tracked=clockTick(at(5,10),reading(T0)).state,drifting=off(tracked),ha=tracked.hourAngle!;
  const r2=reading(T0+60_000),one=clockTick(drifting,r2).state;
  expect(one.pointing.ra).toBe(normalizeRaHours(r2.lstHours-ha));expect(one.pointing.ra).toBeCloseTo(5+(r2.lstHours-reading(T0).lstHours),12);
  expect(one.hourAngle).toBe(ha);expect(one.pointing.dec).toBe(10);
  let many=drifting;for(let i=1;i<=1000;i++)many=clockTick(many,reading(T0+i*1000)).state;
  const last=clockTick(drifting,reading(T0+1000*1000)).state;
  expect(Object.is(many.pointing.ra,last.pointing.ra)).toBe(true);expect(many.hourAngle).toBe(ha);
 });
 it('wraps: a negative result gains 24 h, 24 h becomes 0, an LST of exactly 24 h (strict > 24 wrap of 0x4881ac) gives 0',()=>{
  const a=activated();
  expect(clockTick({...a,hourAngle:3},lstReading(1)).state.pointing.ra).toBe(22);
  expect(clockTick({...a,hourAngle:-24},lstReading(0)).state.pointing.ra).toBe(0);
  expect(clockTick(a,lstReading(24)).state.pointing.ra).toBe(0);
 });
 it('copy branch: Tracking, the synthetic manual-press latch and slewing each copy on their own; none of them drifts',()=>{
  const a={...activated(),pointing:{ra:2,dec:5},hourAngle:1},r=lstReading(7);
  for(const flags of [{tracking:true},{manualPress:true},{slewing:true}] as const){
   const t=clockTick({...a,...flags},r);// synthetic flags here; RA-16 sets the latch through pressManualSlew
   expect(t.state.hourAngle,JSON.stringify(flags)).toBe(5);expect(t.state.pointing).toEqual({ra:2,dec:5});
  }
  const drift=clockTick(a,r);expect(drift.state.hourAngle).toBe(1);expect(drift.state.pointing).toEqual({ra:6,dec:5});
 });
 it('RA-12 at the tick: a pass copies HA as before; Tracking off and slewing skip the predicate',()=>{
  const o=opts({limitsEnabled:true}),r=lstReading(7);
  const pass=clockTick(at(5,10,o),r,o);expect(pass).toMatchObject({outcome:'clock-tick',steps:['RA-13']});expect(pass.state).toMatchObject({hourAngle:2,tracking:true,notice:null});
  const low=at(5,-60,o);// HA 2 h, Dec −60°: altitude ≈ −11.5°
  expect(clockTick({...low,slewing:true},r,o)).toMatchObject({outcome:'clock-tick',state:{hourAngle:2,tracking:true,notice:null}});// synthetic slewing flag
  const drift=clockTick(off(low,o),r,o);expect(drift.outcome).toBe('clock-tick');expect(drift.state.pointing.ra).toBe(7);expect(drift.state.notice).toBeNull();
 });
 it('RA-12 failure: Tracking off and the 0x10 box, buttons untouched, then the native drift or copy continuation',()=>{
  const o=opts({limitsEnabled:true}),r=lstReading(7),s=at(5,-60,o);
  const t=clockTick(s,r,o);
  expect(t).toMatchObject({outcome:'clock-altitude-limit',changed:true,steps:['RA-13','RA-12']});
  // 0x565140 is not called: N/S/E/W, Slew, RateSpin and Receiver keep their Tracking-on state.
  expect(t.state).toMatchObject({tracking:false,notice:{kind:'altitude-limit-tracking'},manualButtonsEnabled:true,slewMenuEnabled:true,rateSpinEnabled:true,receiverEnabled:true});
  // Drift branch with the stored HA (0 from FormActivate): RA := LST − HA; Dec unchanged; the reading is accepted.
  expect(t.state.pointing).toEqual({ra:7,dec:-60});expect(t.state.hourAngle).toBe(0);expect(t.state.clock).toEqual(r);
  // Latch set (synthetic hold with Tracking on): copy branch HA := d, RA held.
  const held=clockTick({...s,manualPress:true,manualRun:1,phase:0,step:0.1},r,o);
  expect(held).toMatchObject({outcome:'clock-altitude-limit',state:{tracking:false,hourAngle:2,pointing:{ra:5,dec:-60},manualPress:true}});
  // The box is answered with OK; Tracking on again fails again on the next tick.
  const ok=track(answerNotice(t.state,o,'altitude-limit-tracking','ok')).state;expect(ok.notice).toBeNull();
  const again=clockTick({...track(toggleTracking(ok,o)).state,pointing:{ra:5,dec:-60}},r,o);expect(again.outcome).toBe('clock-altitude-limit');
 });
 it('RA-12 at the tick: an open box is kept (WEB-ALT-02), an unknown HA keeps RA (WEB-HA-01), undecided is atomic; an open dialog is kept',()=>{
  const o=opts({limitsEnabled:true}),r=lstReading(7),s=at(5,-60,o);
  // WEB-ALT-02: 0x56561f writes Tracking := 0 before the box, so the failure is applied behind an open box; only the
  // second box is not shown. Buttons stay as they were (0x565140 is not called); the drift continuation runs (HA 0).
  const boxed={...s,notice:{kind:'slew-complete'} as const};// synthetic open box
  const behind=clockTick(boxed,r,o);
  expect(behind).toMatchObject({outcome:'clock-altitude-limit-behind-box',changed:true,steps:['RA-13','RA-12']});
  expect(behind.state.notice).toEqual({kind:'slew-complete'});
  expect(behind.state).toMatchObject({tracking:false,manualButtonsEnabled:true,slewMenuEnabled:true,rateSpinEnabled:true,receiverEnabled:true});
  expect(behind.state.pointing).toEqual({ra:7,dec:-60});expect(behind.state.clock).toEqual(r);
  const zenith=tracking(o);// FormActivate pointing (RA 0, Dec = latitude) at LST 0: HA 0, the zenith
  const z=clockTick(zenith,lstReading(0),o);expect(z).toMatchObject({outcome:'clock-altitude-undecided',changed:false,steps:['RA-12']});expect(z.state).toBe(zenith);
  // WEB-HA-01: a known failure with an unknown HA (synthetic) is committed; only the drift write is skipped, RA and HA stay.
  const blind={...s,hourAngle:null},u=clockTick(blind,r,o);
  expect(u).toMatchObject({outcome:'clock-altitude-limit',changed:true,steps:['RA-13','RA-12']});
  expect(u.state).toMatchObject({tracking:false,notice:{kind:'altitude-limit-tracking'},hourAngle:null});
  expect(u.state.pointing).toEqual({ra:5,dec:-60});expect(u.state.clock).toEqual(r);
  const closed=track(answerNotice(u.state,o,'altitude-limit-tracking','ok')).state,later=clockTick(closed,r,o);
  expect(later).toMatchObject({outcome:'hour-angle-unknown',changed:false});expect(later.state).toBe(closed);
  const blindBoxed=clockTick({...blind,notice:{kind:'slew-complete'}},r,o);// synthetic open box
  expect(blindBoxed).toMatchObject({outcome:'clock-altitude-limit-behind-box',changed:true,state:{tracking:false,notice:{kind:'slew-complete'},hourAngle:null}});
  expect(blindBoxed.state.pointing).toEqual({ra:5,dec:-60});
  const open=enter(s,fields('3','0','0','20','0','0'),o),d=clockTick(open,r,o);
  expect(d.state).toMatchObject({dialog:open.dialog,notice:{kind:'altitude-limit-tracking'},tracking:false});
  expect(track(confirmSkyCoords(d.state,o,r)).outcome).toBe('modal-open');
  expect(track(cancelSkyCoords(track(answerNotice(d.state,o,'altitude-limit-tracking','ok')).state)).outcome).toBe('dialog-cancelled');
 });
 it('WEB-ALT-02 behind the slew confirmation: Tracking off is kept through Yes and the slew, which arrives with Tracking off',()=>{
  const o=opts({limitsEnabled:true}),s=at(5,-60,o);// synthetic start position, HA 0
  // Request at LST 7 for 7 h, +20°: HA 0, altitude ≈ 71.6°, passes.
  const ask=track(confirmSkyCoords(enter(s,fields('7','0','0','20','0','0'),o),o,lstReading(7)));
  expect(ask).toMatchObject({outcome:'slew-confirm-requested',state:{notice:{kind:'confirm-slew',target:{ra:7,dec:20},hourAngle:0}}});
  // The tracked pointing (HA 2 h, −60°) fails at the next tick while the confirmation is open.
  const t=clockTick(ask.state,lstReading(7),o);
  expect(t).toMatchObject({outcome:'clock-altitude-limit-behind-box',changed:true,steps:['RA-13','RA-12']});
  expect(t.state.notice).toEqual(ask.state.notice);expect(t.state.tracking).toBe(false);expect(t.state.pointing).toEqual({ra:7,dec:-60});
  // Yes does not re-check (0x566f74..); a tick during the slew takes the copy branch and opens no box.
  const yes=track(answerNotice(t.state,o,'confirm-slew','yes'));expect(yes.outcome).toBe('slew-started');
  const mid=clockTick(track(slewTimerTick(yes.state,o,yes.state.slewRun)).state,lstReading(7),o);
  expect(mid).toMatchObject({outcome:'clock-tick',state:{notice:null,tracking:false}});
  const end=runSlew(mid.state,o);expect(end.outcomes.at(-1)).toBe('slew-complete');
  expect(end.state.pointing).toEqual({ra:7,dec:20});expect(end.state.tracking).toBe(false);
 });
 it('applies while the dialog or a box is open and leaves them untouched',()=>{
  const open=enter(at(5,10),fields('3','0','0','20','0','0'));
  const t=clockTick(open,lstReading(7));expect(t.state.dialog).toEqual(open.dialog);expect(t.state.hourAngle).toBe(2);
  const box=track(confirmSkyCoords(open,O)).state,u=clockTick(box,lstReading(8));
  expect(u.state.notice).toEqual(box.notice);expect(u.state.hourAngle).toBe(3);
 });
 it('refusals are atomic: invalid readings, unsupported options and an unknown HA change nothing, not even the last tick',()=>{
  const s=clockTick(activated(),lstReading(3)).state;
  const bad=[{utMs:NaN,jd:1,lstHours:1},{utMs:T0,jd:2451545,lstHours:25},{utMs:T0,jd:2451545,lstHours:-1},{utMs:RADIO_CLOCK_CONSTANTS.maxUTMS+1,jd:2488069.5,lstHours:1},{utMs:T0+0.5,jd:2451545,lstHours:1},null];
  for(const r of bad){const t=clockTick(s,r as unknown as RadioClockReading);expect(t.outcome).toBe('clock-reading-invalid');expect(t.state).toBe(s);}
  const unsupported=clockTick(s,lstReading(4),opts({rateBase:0}));expect(unsupported.outcome).toBe('options-unsupported');expect(unsupported.state).toBe(s);
  const unknown={...s,hourAngle:null},refused=clockTick(unknown,lstReading(4));
  expect(refused).toMatchObject({outcome:'hour-angle-unknown',changed:false});expect(refused.state).toBe(unknown);
  const recovered=clockTick(track(toggleTracking(unknown,O)).state,lstReading(4)).state;expect(recovered.hourAngle).toBe(4-s.pointing.ra);
  expect(clockTick(off(recovered),lstReading(5)).state.pointing.ra).toBe(normalizeRaHours(5-recovered.hourAngle!));
 });
});

describe('RA-10/RA-11 hour angle at the slew request, the instant store and SlewTimer2',()=>{
 it('the confirmation captures LST − target RA at OK (no clock: null); the transit note captures LST only at its OK',()=>{
  const open=enter(at(1,10),fields('3','0','0','20','0','0'));
  expect(track(confirmSkyCoords(open,O,lstReading(7))).state.notice).toEqual({kind:'confirm-slew',target:{ra:3,dec:20},transit:false,hourAngle:4});
  expect(track(confirmSkyCoords(open,O)).state.notice).toMatchObject({hourAngle:null});
  const o=opts({transitTelescope:true}),note=track(confirmSkyCoords(enter({...activated(o),pointing:{ra:4,dec:10}},fields('9','0','0','12','0','0'),o),o,lstReading(7)));
  expect(note.outcome).toBe('transit-notice');
  expect(track(answerNotice(note.state,o,'transit-dec-only','ok',lstReading(9))).state.notice).toEqual({kind:'confirm-slew',target:{ra:9,dec:12},transit:true,hourAngle:9});
  expect(track(confirmSkyCoords(open,O,{utMs:T0,jd:1,lstHours:30}))).toMatchObject({outcome:'clock-reading-invalid',changed:false,state:open});
 });
 it('instant slew stores the captured HA, not a later Yes-time reading, also after clock ticks while the box was open',()=>{
  const o=opts({instantSlew:true}),ask=track(confirmSkyCoords(enter(at(1,10,o),fields('3','0','0','20','0','0'),o),o,lstReading(7))).state;
  const ticked=clockTick(ask,lstReading(9),o).state;expect(ticked.hourAngle).toBe(8);expect(ticked.notice).toMatchObject({kind:'confirm-slew',hourAngle:4});
  const yes=track(answerNotice(ticked,o,'confirm-slew','yes',lstReading(11)));
  expect(yes.outcome).toBe('slew-instant');expect(yes.state.hourAngle).toBe(4);expect(yes.state.pointing).toEqual({ra:3,dec:20});
  // Without a request-time clock the HA is unknown: a drift tick is refused until a copy tick (Tracking on) sets it.
  const blind=track(answerNotice(track(confirmSkyCoords(enter(at(1,10,o),fields('3','0','0','20','0','0'),o),o)).state,o,'confirm-slew','yes',lstReading(11))).state;
  expect(blind.hourAngle).toBeNull();
  expect(clockTick(off(blind,o),lstReading(12),o).outcome).toBe('hour-angle-unknown');
  expect(clockTick(blind,lstReading(12),o).state.hourAngle).toBe(9);
  // WEB-HA-01 with a failure: Limit Slewing turned on later; at LST 12 (HA 9 h, +20°: altitude ≈ −18°) the tracked
  // pointing fails. Tracking off, the reading and the box are committed; RA and the unknown HA stay (no HA is invented).
  const L=opts({instantSlew:true,limitsEnabled:true}),failed=clockTick(blind,lstReading(12),L);
  expect(failed).toMatchObject({outcome:'clock-altitude-limit',changed:true,state:{tracking:false,notice:{kind:'altitude-limit-tracking'},hourAngle:null}});
  expect(failed.state.pointing).toEqual({ra:3,dec:20});expect(failed.state.clock).toEqual(lstReading(12));
 });
 it('RA phases subtract each RA change before normalization; Dec phases leave HA alone; an unknown HA stays unknown',()=>{
  let s:RadioLabState={...slewTo(at(1,10),fields('3','0','0','20','0','0'))};s={...s,hourAngle:2};
  for(let i=0;i<8;i++){s=track(slewTimerTick(s,O,s.slewRun)).state;expect(s.hourAngle).toBe(2);}
  const end=runSlew(s).state;expect(end.pointing.ra).toBe(3);expect(end.hourAngle).toBeCloseTo(0,12);
  // Crossing 0 h the short way (23.9 h → 0.1 h): the summed pre-normalization changes are +0.2 h, not −23.8 h.
  const cross=runSlew({...slewTo(at(23.9,0),fields('0','6','0','0','0','0')),hourAngle:0}).state;expect(cross.pointing.ra).toBe(0.1);expect(cross.hourAngle).toBeCloseTo(-0.2,12);
  const a=activated(),raPhase:RadioLabState={...a,tracking:true,slewing:true,slewTimerEnabled:true,slewRun:1,phase:2,axisDone:false,step:0.02,status:'slewing-ra',
   target:{ra:0.01,dec:a.pointing.dec},pointing:{ra:23.99,dec:a.pointing.dec},hourAngle:5};
  const t=track(slewTimerTick(raPhase,O,1)).state;expect(t.hourAngle).toBe(5-((23.99+0.02)-23.99));expect(t.pointing.ra).toBe(normalizeRaHours(23.99+0.02));
  expect(track(slewTimerTick({...raPhase,hourAngle:null},O,1)).state.hourAngle).toBeNull();
 });
});

// RA-16..RA-18 manual N/S/E/W: the chosen binary64 implementation contract. Expected values are restated here from the
// recovered operations (K, 15, 90, 0, ±180, 12) in source order; they are not x87 or native runtime oracles. Synthetic
// states (a chosen pointing, step or HA) are labelled where used.
const K=0.0002777777777777778;
const press=(s:RadioLabState,d:ManualDirection,o=O)=>track(pressManualSlew(s,o,d));
const mtick=(s:RadioLabState,o=O)=>track(manualSlewTick(s,o,s.manualRun));
const release=(s:RadioLabState,clock:RadioClockReading|null=null,o=O,mode:'release'|'cancel'='release')=>track(releaseManualSlew(s,o,clock,mode));
/** Index 5 (rate 5000 arcsec per tick under the compiled base 50) from a synthetic start position with Tracking on. */
const at5=(ra:number,dec:number)=>track(changeSlewRate(at(ra,dec),O,'up')).state;
/** RA-11 completion with Tracking turned off mid-slew: N/S/E/W and RateSpin enabled again while Tracking stays off. */
function trackingOffAfterSlew(ra:number,dec:number):RadioLabState{
 const slewing=off(slewTo(at(ra,dec),fields(String(ra),'0','0',String(dec+1),'0','0')));
 expect(slewing).toMatchObject({tracking:false,manualButtonsEnabled:false,slewing:true});
 const arrived=runSlew(slewing).state;expect(arrived.notice).toEqual({kind:'slew-complete'});
 return track(answerNotice(arrived,O,'slew-complete','ok')).state;
}
/** Circular difference of two hour values (mod 24). */
const hourGap=(a:number,b:number)=>{const d=normalizeRaHours(a-b);return d>12?d-24:d;};

describe('RA-16 manual press: latch, step and interlocks',()=>{
 it('pins the manual operands and the pole flag; the first FormActivate clears the flag',()=>{
  const k=RADIO_LAB_CONSTANTS;
  expect(k.manualStepPerRate).toBe(K);expect(k.manualStepPerRate).toBe(k.decStepPerRate);// decoder value; byte identity not claimed
  expect([k.manualRaStepDivisor,k.poleDeclinationDegrees,k.poleSignThreshold,k.poleReflectionDegrees,k.poleHalfTurnHours,k.manualTimerIntervalMs]).toEqual([15,90,0,180,12,100]);
  expect(RADIO_LAB_POLE_CAPTIONS).toEqual({reversedNorth:'S',reversedSouth:'N'});expect(MANUAL_DIRECTION_CODE).toEqual({north:0,south:1,east:2,west:3});
  expect(INITIAL_RADIO_LAB).toMatchObject({poleReversed:false,manualRun:0,manualPress:false});
  expect(track(activateRadioLab({...INITIAL_RADIO_LAB,poleReversed:true},O)).state.poleReversed).toBe(false);// synthetic flag before activation
 });
 it('writes direction and step in source order without moving; disables the other buttons, RateSpin and Slew',()=>{
  const s=tracking(),rate=s.rate;expect(rate).toBe(500);
  const expected:Record<ManualDirection,number>={north:rate*K,south:-rate*K,east:rate*K/15,west:-rate*K/15};
  expect(expected.south).toBe((-rate)*K);expect(expected.west).toBe((-rate)*K/15);
  for(const d of MANUAL_DIRECTIONS){
   const t=press(s,d);
   expect(t).toMatchObject({outcome:'manual-started',changed:true,steps:['RA-16']});
   expect(t.state).toMatchObject({phase:MANUAL_DIRECTION_CODE[d],step:expected[d],manualPress:true,manualRun:s.manualRun+1,rateSpinEnabled:false,slewMenuEnabled:false,manualButtonsEnabled:true,tracking:true});
   expect(t.state.pointing).toEqual(s.pointing);expect(t.state.hourAngle).toBe(s.hourAngle);
   expect(heldManualDirection(t.state)).toBe(d);
   for(const other of MANUAL_DIRECTIONS)expect(manualButtonEnabled(t.state,other)).toBe(other===d);
  }
 });
 it('while latched: re-press, Tracking, Slew Rate and Set Coordinates change nothing',()=>{
  const held=press(tracking(),'north').state;
  for(const d of MANUAL_DIRECTIONS){const t=press(held,d);expect(t).toMatchObject({outcome:'manual-latched',changed:false,steps:['RA-16']});expect(t.state).toBe(held);}
  const tr=track(toggleTracking(held,O));expect(tr).toMatchObject({outcome:'manual-latched',steps:['RA-05']});expect(tr.state).toBe(held);
  for(const dir of ['up','down'] as const)expect(track(changeSlewRate(held,O,dir))).toMatchObject({outcome:'rate-disabled',state:held});
  expect(track(openSetCoordinates(held,O))).toMatchObject({outcome:'menu-disabled',state:held});
 });
 it('refusals are atomic: not activated, modal, Tracking off, programmed slew and its stop question, options, limits',()=>{
  const refused=(s:RadioLabState,d:ManualDirection,outcome:RadioLabOutcome,o=O)=>{const t=press(s,d,o);expect(t.outcome).toBe(outcome);expect(t.changed).toBe(false);expect(t.state).toBe(s);};
  refused(INITIAL_RADIO_LAB,'north','not-activated');
  refused(activated(),'north','manual-unavailable');// 0x565140: N/S/E/W disabled with Tracking off
  refused(enter(at(1,10),fields('3','0','0','20','0','0')),'south','modal-open');
  // A programmed slew: N/S/E/W disabled by the start; Tracking off then on enables them (0x5651cc), the press is a web refusal.
  const slewing=slewTo(at(1,10),fields('3','0','0','20','0','0'));refused(slewing,'north','manual-unavailable');
  const retracked=retrack(slewing,O);expect(retracked.manualButtonsEnabled).toBe(true);
  for(const d of MANUAL_DIRECTIONS)refused(retracked,d,'manual-programmed-slew');
  const stopQuestion=track(openSetCoordinates(retracked,O)).state;refused(stopQuestion,'east','modal-open');
  const resumedPaused={...stopQuestion,notice:null,slewTimerEnabled:false};refused(resumedPaused,'east','manual-programmed-slew');// synthetic: paused slew, box closed
  refused(at(1,10),'north','options-unsupported',opts({rateBase:0}));
  const lim=opts({limitsEnabled:true});refused(at(1,10,lim),'west','manual-limits-clock',lim);// G3: no accepted clock reading
  refused({...clockTick(at(1,10,lim),lstReading(1),lim).state,hourAngle:null},'west','manual-limits-clock',lim);// synthetic unknown HA
  expect(radioLabManualRefusal(at(1,10),O,'north')).toBeNull();
  expect(()=>pressManualSlew(at(1,10),O,'up' as ManualDirection)).toThrow('Invalid manual direction');
 });
 it('transit telescope: E/W stay hidden; N/S work after a completed slew; Tracking is unavailable',()=>{
  const o=opts({transitTelescope:true}),a=activated(o);
  const started=startUnder(a,fields('0','0','0','30','0','0'),o);expect(started.outcome).toBe('slew-started');
  const arrived=runSlew(started.state,o).state;expect(arrived.notice).toEqual({kind:'slew-complete'});
  const s=track(answerNotice(arrived,o,'slew-complete','ok',null)).state;
  expect(s).toMatchObject({eastWestVisible:false,manualButtonsEnabled:true,trackingVisible:false});
  for(const d of ['east','west'] as const){const t=press(s,d,o);expect(t.outcome).toBe('manual-unavailable');expect(t.state).toBe(s);}
  const n=press(s,'north',o);expect(n.outcome).toBe('manual-started');
  expect(track(toggleTracking(n.state,o)).outcome).toBe('manual-latched');
  const moved=mtick(n.state,o).state;expect(moved.pointing.dec).toBe(30+s.rate*K);
 });
 it('WEB-MANUAL-03 step domain: synthetic rates and the A→B cross-options vector',()=>{
  const s=tracking();
  for(const rate of [1e-12,0,-500,Number.NaN,Number.POSITIVE_INFINITY])for(const d of MANUAL_DIRECTIONS){
   const x={...s,rate},t=press(x,d);expect(t.outcome,`${rate} ${d}`).toBe('manual-step-unsupported');expect(t.state).toBe(x);
  }
  // N/S admit |step| ≤ 180°, E/W |step| < 24 h: 649000 × K ≈ 180.3° is refused for N/S, its RA step ≈ 12.0 h is admitted.
  const big={...s,rate:649000};
  for(const d of ['north','south'] as const)expect(press(big,d).outcome).toBe('manual-step-unsupported');
  for(const d of ['east','west'] as const)expect(press(big,d).outcome).toBe('manual-started');
  expect(press({...s,rate:647000},'north').outcome).toBe('manual-started');
  expect(press({...s,rate:1296001},'east').outcome).toBe('manual-step-unsupported');
  expect(RADIO_MANUAL_WEB_DOMAIN).toEqual({decStepLimitDegrees:180,raStepLimitHours:24});
  // Options A (max 6, base 50) to index 6, then B (max 4, base 3241) RateSpin − to index 5: rate 324100. The programmed
  // RA step (≈ 6.0019 h) is refused for a start, the manual Dec step (≈ 90.03°) and RA step (≈ 6.0019 h) are admitted.
  const A=opts({maxRateIndex:6}),B=opts({maxRateIndex:4,rateBase:3241});
  let x=at(1,10,A);for(let i=0;i<2;i++)x=track(changeSlewRate(x,A,'up')).state;expect(x.rateIndex).toBe(6);
  x=track(changeSlewRate(x,B,'down')).state;expect(x).toMatchObject({rateIndex:5,rate:324100});
  expect(radioLabRateIssues(x,B).some(i=>i.context==='start')).toBe(true);
  const n=press(x,'north',B);expect(n.state.step).toBe(324100*K);expect(n.state.step).toBeGreaterThan(90);
  expect(mtick(n.state,B).outcome).toBe('manual-tick');
  expect(press(x,'east',B).state.step).toBe(324100*K/15);
 });
});

describe('RA-18 manual SlewTimer ticks, pole reflection and RA wrap',()=>{
 it('N/S change Dec by the step, E/W change RA by the step and HA by its negative; repeated ticks accumulate',()=>{
  const s={...at(1,10),hourAngle:2};// synthetic HA
  const e=500*K/15,n=500*K;
  let t=mtick(press(s,'north').state);expect(t).toMatchObject({outcome:'manual-tick',steps:['RA-18']});
  expect(t.state.pointing).toEqual({ra:1,dec:10+n});expect(t.state.hourAngle).toBe(2);
  t=mtick(press(s,'south').state);expect(t.state.pointing).toEqual({ra:1,dec:10+(-n)});
  t=mtick(press(s,'east').state);expect(t.state.pointing).toEqual({ra:1+e,dec:10});expect(t.state.hourAngle).toBe(2-e);
  t=mtick(press(s,'west').state);expect(t.state.pointing).toEqual({ra:1+(-e),dec:10});expect(t.state.hourAngle).toBe(2-(-e));
  let h=press(s,'north').state,dec=10;for(let i=0;i<5;i++){h=mtick(h).state;dec+=n;}
  expect(h.pointing.dec).toBe(dec);expect(h.manualPress).toBe(true);
 });
 it('wraps RA through 0 h and 24 h; an unknown HA stays unknown',()=>{
  const w=-(5000*K)/15;
  const west=mtick(press(at5(0.001,10),'west').state).state;expect(west.pointing.ra).toBe(0.001+w+24);
  const east=mtick(press(at5(23.99,10),'east').state).state;expect(east.pointing.ra).toBe((23.99-w)-24);
  const blind=mtick({...press(at5(5,10),'east').state,hourAngle:null}).state;expect(blind.hourAngle).toBeNull();expect(blind.pointing.ra).toBe(5-w);
  const blindPole=mtick({...press(at5(5,89.5),'north').state,hourAngle:null}).state;expect(blindPole.hourAngle).toBeNull();expect(blindPole.poleReversed).toBe(true);
 });
 it('north pole from (1 h, 89.5°) at index 5: reflection, RA 13 h, HA + 12 h, captions S/N; the next tick moves away',()=>{
  const s=at5(1,89.5),step=5000*K,x=89.5+step;
  const held=press(s,'north').state,over=mtick(held).state;
  expect(over.pointing).toEqual({ra:13,dec:180-x});expect(over.hourAngle).toBe(0+12);expect(over.poleReversed).toBe(true);
  expect(manualButtonCaption(over,'north')).toBe('S');expect(manualButtonCaption(over,'south')).toBe('N');
  expect(manualButtonCaption(over,'east')).toBe('E');expect(manualButtonCaption(over,'west')).toBe('W');
  const next=mtick(over).state;expect(next.pointing.dec).toBe((180-x)-step);expect(next.pointing.ra).toBe(13);expect(next.poleReversed).toBe(true);
  // Released and pressed again, the flag keeps N subtracting until the next crossing.
  const again=mtick(press(release(next).state,'north').state).state;expect(again.pointing.dec).toBe(((180-x)-step)-step);
 });
 it('south pole: −180 − x; S keeps going over the pole; N then crosses back and RA returns through 25 h → 1 h',()=>{
  const s=at5(1,-89.5),step=-(5000*K),x=-89.5+step;
  const over=mtick(press(s,'south').state).state;
  expect(over.pointing).toEqual({ra:13,dec:-180-x});expect(over.hourAngle).toBe(12);expect(over.poleReversed).toBe(true);expect(manualButtonCaption(over,'south')).toBe('N');
  // Pole flag set: S subtracts its negative step, so Dec rises away from the pole on the far side.
  const away=mtick(over).state;expect(away.pointing.dec).toBe((-180-x)-step);expect(away.poleReversed).toBe(true);
  // N subtracts its positive step and crosses the pole again: flag cleared, RA 13 + 12 = 25 → 1 h, HA 24 (not normalized).
  const y=(-180-x)-(5000*K),back=mtick(press(release(over).state,'north').state).state;
  expect(back.poleReversed).toBe(false);expect(back.pointing).toEqual({ra:1,dec:-180-y});expect(back.hourAngle).toBe(24);
  expect(manualButtonCaption(back,'north')).toBe('N');expect(manualButtonCaption(back,'south')).toBe('S');
 });
 it('|Dec| exactly 90 is not reflected (strict >, 0x565f26 jbe)',()=>{
  const base=at(1,89.5);
  const north:RadioLabState={...base,manualPress:true,manualRun:1,phase:0,step:0.5,rateSpinEnabled:false,slewMenuEnabled:false};// synthetic step
  const t=mtick(north).state;expect(t.pointing).toEqual({ra:1,dec:90});expect(t.poleReversed).toBe(false);
  const south=mtick({...north,pointing:{ra:1,dec:-89.5},phase:1,step:-0.5}).state;expect(south.pointing.dec).toBe(-90);expect(south.poleReversed).toBe(false);
 });
 it('property (fixed-seed LCG): Dec in [−90, 90], RA in [0, 24), RA + HA constant mod 24, flag toggles exactly when |x| > 90',()=>{
  const rnd=lcg(20261023);
  for(let trial=0;trial<200;trial++){
   let s:RadioLabState={...at(rnd(0,23999)/1000,rnd(-90000,90000)/1000),hourAngle:rnd(-12000,12000)/1000};
   for(let i=rnd(0,4);i>0;i--)s=track(changeSlewRate(s,O,'up')).state;// index 4..5 (rate 500 or 5000)
   for(let i=rnd(0,3);i>0;i--)s=track(changeSlewRate(s,O,'down')).state;
   const sum0=s.pointing.ra+s.hourAngle!;
   for(let hold=0;hold<5;hold++){
    s=press(s,MANUAL_DIRECTIONS[rnd(0,3)]).state;
    for(let i=rnd(1,12);i>0;i--){
     const ns=s.phase===0||s.phase===1,x=s.poleReversed?s.pointing.dec-s.step:s.pointing.dec+s.step,before=s.poleReversed;
     s=mtick(s).state;
     expect(s.poleReversed!==before).toBe(ns&&Math.abs(x)>90);
     expect(Math.abs(s.pointing.dec)).toBeLessThanOrEqual(90);expect(s.pointing.ra).toBeGreaterThanOrEqual(0);expect(s.pointing.ra).toBeLessThan(24);
     expect(Math.abs(hourGap(s.pointing.ra+s.hourAngle!,sum0))).toBeLessThan(1e-12);
    }
    s=release(s).state;
   }
  }
 });
});

describe('RA-17 manual release, cancellation and coexistence with the clock and programmed slews',()=>{
 it('Tracking on: release clears the latch and enables RateSpin, the buttons and Slew; no clock call',()=>{
  const held=mtick(press(at(1,10),'east').state).state;
  const t=release(held,lstReading(7));
  expect(t).toMatchObject({outcome:'manual-released',changed:true,steps:['RA-17']});
  expect(t.state).toMatchObject({manualPress:false,manualButtonsEnabled:true,rateSpinEnabled:true,slewMenuEnabled:true,clock:null});
  expect(t.state.pointing).toEqual(held.pointing);expect(t.state.hourAngle).toBe(held.hourAngle);
  for(const d of MANUAL_DIRECTIONS)expect(manualButtonEnabled(t.state,d)).toBe(true);
 });
 it('Tracking off: E/W release chains ClocktimerTimer (RA := LST − HA); N/S do not; Slew is enabled (original quirk)',()=>{
  const s=trackingOffAfterSlew(1,10);
  expect(s).toMatchObject({tracking:false,manualButtonsEnabled:true,rateSpinEnabled:true,slewMenuEnabled:false,hourAngle:0,rate:5000});// the start raised index 4 → 5
  const e=s.rate*K/15,held=mtick(press(s,'east').state).state;expect(held.hourAngle).toBe(0-e);
  const t=release(held,lstReading(7));
  expect(t.steps).toEqual(['RA-17','RA-13']);expect(t.state.pointing.ra).toBe(normalizeRaHours(7-(0-e)));expect(t.state.clock).toEqual(lstReading(7));
  expect(t.state.slewMenuEnabled).toBe(true);expect(track(openSetCoordinates(t.state,O)).outcome).toBe('dialog-opened');
  const ns=release(mtick(press(s,'north').state).state,lstReading(7));expect(ns.steps).toEqual(['RA-17']);expect(ns.state.clock).toBeNull();
 });
 it('without a reading, with an invalid reading, with an unknown HA or unsupported options the release still happens; RA/HA are kept',()=>{
  const held=mtick(press(trackingOffAfterSlew(1,10),'west').state).state;
  for(const clock of [null,{utMs:T0,jd:1,lstHours:30} as RadioClockReading]){
   const t=release(held,clock);expect(t.steps).toEqual(['RA-17']);expect(t.state.manualPress).toBe(false);
   expect(t.state.pointing).toEqual(held.pointing);expect(t.state.hourAngle).toBe(held.hourAngle);
  }
  const blind={...held,hourAngle:null},u=release(blind,lstReading(7));expect(u.steps).toEqual(['RA-17']);expect(u.state.pointing).toEqual(held.pointing);
  for(const o of [opts({rateBase:0}),{} as RadioLabOptions]){
   const t=release(held,lstReading(7),o);expect(t.outcome).toBe('manual-released');expect(t.steps).toEqual(['RA-17']);expect(t.state.pointing).toEqual(held.pointing);
  }
  // Limits on with Tracking off: ClocktimerTimer skips the altitude predicate, so the chained drift tick runs (RA-13).
  const lim=release(held,lstReading(7),opts({limitsEnabled:true}));expect(lim.steps).toEqual(['RA-17','RA-13']);expect(lim.state.manualPress).toBe(false);
 });
 it('cancel gives the release state with its own outcome; an idle release changes nothing',()=>{
  const held=mtick(press(trackingOffAfterSlew(1,10),'east').state).state;
  const r=release(held,lstReading(7)),c=release(held,lstReading(7),O,'cancel');
  expect(c).toMatchObject({outcome:'manual-cancelled',steps:['RA-17','RA-13']});expect(c.state).toEqual(r.state);
  const idle=release(r.state,lstReading(7));expect(idle).toMatchObject({outcome:'manual-idle',changed:false});expect(idle.state).toBe(r.state);
 });
 it('stale runs, options or limits changed mid-hold and a restored bad step refuse the tick atomically; release still works',()=>{
  const held=press(at(1,10),'north').state;
  const late=track(manualSlewTick(held,O,held.manualRun-1));
  expect(late).toMatchObject({outcome:'manual-idle',changed:false});expect(late.state).toBe(held);
  expect(track(manualSlewTick(release(held).state,O,held.manualRun))).toMatchObject({outcome:'manual-idle',changed:false});
  const cases:[RadioLabState,RadioLabOptions,string][]=[[held,opts({rateBase:0}),'options-unsupported'],[held,opts({limitsEnabled:true}),'manual-limits-clock'],
   [{...held,step:Number.NaN},O,'manual-step-unsupported'],[{...held,step:181},O,'manual-step-unsupported'],[{...held,phase:2,step:24},O,'manual-step-unsupported']];// synthetic restored steps
  for(const [s,o,outcome] of cases){
   expect(radioLabManualTickRefusal(s,o)).toBe(outcome);
   const t=track(manualSlewTick(s,o,s.manualRun));expect(t.outcome).toBe(outcome);expect(t.state).toBe(s);
   expect(release(s,null,o).state.manualPress).toBe(false);
  }
  expect(radioLabManualTickRefusal(release(held).state,opts({rateBase:0}))).toBeNull();
 });
 it('clock ticks during a hold take the copy branch (no drift) and chain with manual ticks in either order',()=>{
  const held=press(trackingOffAfterSlew(1,10),'east').state,e=held.rate*K/15;
  const copied=clockTick(held,lstReading(7)).state;expect(copied.pointing.ra).toBe(1);expect(copied.hourAngle).toBe(7-1);
  const a=mtick(clockTick(held,lstReading(7)).state).state,b=clockTick(mtick(held).state,lstReading(7)).state;
  expect(a.pointing.ra).toBe(1+e);expect(b.pointing.ra).toBe(1+e);
  expect(a.hourAngle).toBe((7-1)-e);expect(b.hourAngle).toBe(7-(1+e));expect(Math.abs(a.hourAngle!-b.hourAngle!)).toBeLessThan(1e-12);
 });
 it('a programmed slew after a manual hold starts from the released state and arrives normally',()=>{
  const moved=release(mtick(mtick(press(at(1,10),'west').state).state).state).state;
  expect(moved.phase).toBe(3);expect(moved.step).toBe(-500*K/15);
  const s=slewTo(moved,fields('2','0','0','12','0','0'));expect(s).toMatchObject({phase:0,slewing:true,manualPress:false});
  const end=runSlew(s);expect(end.outcomes.at(-1)).toBe('slew-complete');expect(end.state.pointing).toEqual({ra:2,dec:12});
 });
});

// RA-12 at its manual and request callers: synthetic start positions (labelled) with explicit synthetic readings; the
// altitude values quoted in comments are closed forms of the native formula, not native observations.
describe('RA-12 at the manual SlewTimerTimer and the slew request',()=>{
 const L=opts({limitsEnabled:true}),step5=5000*K;
 /** Tracking on, index 5, a clock tick accepted at LST = RA (HA 0), from a synthetic start position. */
 const anchored=(ra:number,dec:number,o=L)=>{const t=clockTick(track(changeSlewRate(at(ra,dec,o),o,'up')).state,lstReading(ra),o);expect(t.outcome).toBe('clock-tick');return t.state;};
 it('a passing step moves as with limits off; the predictor reports nothing',()=>{
  const held=press(anchored(1,10),'north',L).state;expect(radioLabManualTickRefusal(held,L)).toBeNull();
  const t=mtick(held,L);expect(t).toMatchObject({outcome:'manual-tick',steps:['RA-18']});expect(t.state.pointing).toEqual({ra:1,dec:10+step5});
 });
 it('failure (S from −41.4° at HA 0, proposed altitude ≈ 8.8°): latch and timer cleared, 0x5651cc with Tracking, the box, no motion',()=>{
  const s=anchored(1,-41.4),held=press(s,'south',L).state;
  expect(radioLabManualTickRefusal(held,L)).toBeNull();// a decided failure is not a refusal: the callback runs
  const t=mtick(held,L);
  expect(t).toMatchObject({outcome:'manual-altitude-limit',changed:true,steps:['RA-18','RA-12']});
  expect(t.state).toMatchObject({manualPress:false,manualRun:held.manualRun,manualButtonsEnabled:true,slewMenuEnabled:true,rateSpinEnabled:true,receiverEnabled:true,
   addToListEnabled:false,poleReversed:false,notice:{kind:'altitude-limit-manual',direction:'south'}});
  expect(t.state.pointing).toEqual(s.pointing);expect(t.state.hourAngle).toBe(s.hourAngle);
  // Release, cancel and a late callback find the latch clear: no change, no clock chain.
  for(const r of [release(t.state,lstReading(1),L),release(t.state,lstReading(1),L,'cancel'),mtick(t.state,L)]){expect(r.outcome).toBe('manual-idle');expect(r.state).toBe(t.state);}
  // While the box is open a press is modal-open; after OK a fresh press re-fails without moving.
  expect(press(t.state,'south',L).outcome).toBe('modal-open');
  const ok=track(answerNotice(t.state,L,'altitude-limit-manual','ok')).state,again=mtick(press(ok,'south',L).state,L);
  expect(again.outcome).toBe('manual-altitude-limit');expect(again.state.pointing).toEqual(s.pointing);
  // North moves away from the limit and passes.
  expect(mtick(press(ok,'north',L).state,L).outcome).toBe('manual-tick');
 });
 it('failure with Tracking off disables N/S/E/W and Slew again (0x5651cc uses the current Tracking)',()=>{
  const s={...anchored(1,-41.4),tracking:false};// synthetic: buttons enabled with Tracking off, as after a completed slew
  const t=mtick(press(s,'south',L).state,L);
  expect(t.state).toMatchObject({tracking:false,manualPress:false,manualButtonsEnabled:false,slewMenuEnabled:false,rateSpinEnabled:true,receiverEnabled:true});
 });
 it('E/W with Tracking off: a passing hold chains the clock at release; after a failure release and cancel find no latch and chain nothing',()=>{
  // Control: E from −41.4° at HA 0 (proposed HA −0.0926 h: altitude ≈ 10.16°) passes; the release chains ClocktimerTimer.
  const pass={...anchored(1,-41.4),tracking:false};// synthetic: buttons enabled with Tracking off
  const moved=mtick(press(pass,'east',L).state,L);expect(moved.outcome).toBe('manual-tick');
  const chained=release(moved.state,lstReading(7),L);expect(chained.steps).toEqual(['RA-17','RA-13']);expect(chained.state.clock).toEqual(lstReading(7));
  // Failure: synthetic −60° after an accepted tick (HA 0); either E/W step gives altitude ≈ −8.4°.
  const low={...anchored(1,10),pointing:{ra:1,dec:-60},tracking:false};
  for(const d of ['east','west'] as const){
   const t=mtick(press(low,d,L).state,L);
   expect(t).toMatchObject({outcome:'manual-altitude-limit',steps:['RA-18','RA-12'],state:{notice:{kind:'altitude-limit-manual',direction:d},manualPress:false,manualButtonsEnabled:false}});
   expect(t.state.pointing).toEqual(low.pointing);expect(t.state.hourAngle).toBe(low.hourAngle);
   // 0x56661b/0x56676b are reached only from a latched MouseUp: nothing changes, no clock call, the last reading is kept.
   for(const mode of ['release','cancel'] as const){
    const r=release(t.state,lstReading(7),L,mode);expect(r).toMatchObject({outcome:'manual-idle',changed:false,steps:[]});expect(r.state).toBe(t.state);
    expect(r.state.clock).toEqual(lstReading(1));
   }
  }
  // WEB-ALT-02 refusal kept for the manual caller (core only): a failing step while another box is open changes nothing.
  const boxed={...press(low,'east',L).state,notice:{kind:'slew-complete'} as const};// synthetic open box during a hold
  const refused=mtick(boxed,L);expect(refused).toMatchObject({outcome:'altitude-notice-open',changed:false,steps:['RA-12']});expect(refused.state).toBe(boxed);
 });
 it('a failed pole crossing keeps the toggled pole flag and captions, and discards the proposed RA/Dec/HA',()=>{
  const o=opts({limitsEnabled:true,latitudeRadians:-0.67});// synthetic southern site
  const s={...anchored(1,0,o),pointing:{ra:1,dec:89.5}};// synthetic position after an accepted tick (HA 0)
  const t=mtick(press(s,'north',o).state,o);// proposed Dec ≈ 89.1° at HA 12 h: altitude ≈ −39°
  expect(t.outcome).toBe('manual-altitude-limit');expect(t.state).toMatchObject({poleReversed:true,pointing:{ra:1,dec:89.5},hourAngle:0,manualPress:false});
  expect(manualButtonCaption(t.state,'north')).toBe('S');expect(manualButtonCaption(t.state,'south')).toBe('N');
 });
 it('an undecided proposal (the zenith) is refused by the predictor and the tick alike, changing nothing',()=>{
  const latDeg=O.latitudeRadians*RADIO_LAB_CONSTANTS.radiansToDegrees,held=press(anchored(1,latDeg-step5),'north',L).state;
  expect(radioLabManualTickRefusal(held,L)).toBe('manual-altitude-undecided');
  const t=mtick(held,L);expect(t).toMatchObject({outcome:'manual-altitude-undecided',changed:false,steps:['RA-12']});expect(t.state).toBe(held);
  expect(release(held,null,L).state.manualPress).toBe(false);
 });
 it('request: HA LST − target RA; pass confirms with that HA, fail and undecided store the target without motion; Yes does not re-check',()=>{
  const s=at(1,10,L),ask=(f:SkyCoordsFields,o=L,r=lstReading(3))=>track(confirmSkyCoords(enter(s,f,o),o,r));
  const pass=ask(fields('3','0','0','20','0','0'));
  expect(pass).toMatchObject({outcome:'slew-confirm-requested',state:{notice:{kind:'confirm-slew',target:{ra:3,dec:20},transit:false,hourAngle:0}}});expect(pass.steps).toContain('RA-12');
  const fail=ask(fields('3','0','0','-60','0','0'));// altitude 90° − (lat + 60°) < 0
  expect(fail).toMatchObject({outcome:'altitude-limit-request',steps:['RA-09','RA-10','RA-12'],state:{notice:{kind:'altitude-limit-request',transit:false},dialog:null,target:{ra:3,dec:-60},pointing:{ra:1,dec:10},slewing:false}});
  const z=opts({limitsEnabled:true,latitudeRadians:20*(Math.PI/180)});// synthetic site: equals 20 × Extended 0x566a2c rounded (0.017453292519943295)
  const undecided=track(confirmSkyCoords(enter(at(1,10,z),fields('3','0','0','20','0','0'),z),z,lstReading(3)));// the zenith at HA 0
  expect(undecided).toMatchObject({outcome:'altitude-undecided',state:{notice:{kind:'altitude-undecided',reason:'domain'},target:{ra:3,dec:20},slewing:false}});
  // Yes starts the slew even when options live at the answer would fail it: 0x566f74.. does not call 0x5668e0.
  expect(track(answerNotice(pass.state,opts({limitsEnabled:true,minimumAltitudeRadians:1.5}),'confirm-slew','yes')).outcome).toBe('slew-started');
  const instant=opts({limitsEnabled:true,instantSlew:true}),jump=track(answerNotice(ask(fields('3','0','0','20','0','0'),instant).state,instant,'confirm-slew','yes'));
  expect(jump).toMatchObject({outcome:'slew-instant',state:{pointing:{ra:3,dec:20},hourAngle:0}});
 });
 it('transit request: the note first, then the check at its OK with LST alone as the hour angle (RA-10 quirk)',()=>{
  const o=opts({limitsEnabled:true,transitTelescope:true}),s={...activated(o),pointing:{ra:4,dec:10}};
  const note=track(confirmSkyCoords(enter(s,fields('9','0','0','12','0','0'),o),o,lstReading(9)));expect(note.outcome).toBe('transit-notice');
  // LST 9: LST alone gives HA 9 h (altitude ≈ −24°, fails); LST − RA would give HA 0 (altitude ≈ 64°, passes).
  expect(track(answerNotice(note.state,o,'transit-dec-only','ok',lstReading(9)))).toMatchObject({outcome:'altitude-limit-request',state:{notice:{kind:'altitude-limit-request',transit:true},target:{ra:9,dec:12}}});
  expect(track(answerNotice(note.state,o,'transit-dec-only','ok',lstReading(0)))).toMatchObject({outcome:'slew-confirm-requested',state:{notice:{hourAngle:0}}});
  expect(track(answerNotice(note.state,o,'transit-dec-only','ok',null)).outcome).toBe('limits-require-clock');
 });
});

// RA-EP-02..04: the +0x3c5 flag and the stored coordinates through open, OK, Cancel and the confirmation, restated from the
// listings. Expected display fields of V1–V3 are the coordinator's synthetic vectors (not a native oracle).
describe('RA-EP-02..04 epoch flag lifecycle in Set Coordinates',()=>{
 const V1=fields('1','0','0','30','0','0');
 const b1950Ok=(f=V1,s=at(5,10),o=O,clock:RadioClockReading|null=null)=>track(confirmSkyCoords(track(selectSkyCoordsEpoch(enter(s,f,o),1)).state,o,clock));
 const j2b=(p:{ra:number;dec:number})=>{const c=precessSkyCoords('J2000->B1950',p);return {ra:c.ra,dec:c.dec};};
 const b2j=(p:{ra:number;dec:number})=>{const c=precessSkyCoords('B1950->J2000',p);return {ra:c.ra,dec:c.dec};};
 const parseOk=(f:SkyCoordsFields)=>{const p=parseSkyCoords(f);if(p.status!=='ok')throw new Error(p.status);return {ra:p.ra,dec:p.dec};};
 const declinedB1950=()=>track(answerNotice(b1950Ok().state,O,'confirm-slew','no')).state;

 it('FormCreate state: flag clear; a J2000 OK keeps it clear and the next open converts nothing',()=>{
  expect(INITIAL_RADIO_LAB).toMatchObject({skyCoordsB1950:false,targetHoldsB1950:false});
  const s=track(answerNotice(track(confirmSkyCoords(enter(at(5,10),fields('2','0','0','20','0','0')),O)).state,O,'confirm-slew','no')).state;
  expect(s.skyCoordsB1950).toBe(false);
  const again=track(openSetCoordinates(s,O));expect(again.steps).toEqual(['RA-07','RA-08']);expect(again.state.target).toEqual({ra:2,dec:20});
  expect(again.state.dialog).toEqual({fields:skyCoordsFieldsFor({ra:2,dec:20}),epochIndex:0,epochEnabled:true});
 });
 it('V1: B1950 OK stores the J2000 target with the confirmation note; Yes runs the full slew to it',()=>{
  const ok=b1950Ok();
  expect(skyCoordsFieldsFor(ok.state.target)).toEqual(fields('1','2','43.99','30','16','6.5'));
  expect(ok.state.notice).toMatchObject({kind:'confirm-slew',target:ok.state.target,b1950:{southPoleSignLost:false}});
  const run=runSlew(track(answerNotice(ok.state,O,'confirm-slew','yes')).state);
  expect(run.outcomes.at(-1)).toBe('slew-complete');
  expect(run.state.pointing).toEqual({ra:normalizeRaHours(ok.state.target.ra),dec:ok.state.target.dec});
  expect(run.state).toMatchObject({skyCoordsB1950:true,targetHoldsB1950:false,notice:{kind:'slew-complete'}});
 });
 it('V2/V3: a southern polar entry is stored northern (sign remark); 23 h 59 m wraps past 24 h',()=>{
  const v2=b1950Ok(fields('6','0','0','-89','40','0'));
  expect(skyCoordsFieldsFor(v2.state.target)).toEqual(fields('3','22','33.65','89','34','0.8'));
  expect(v2.state.notice).toMatchObject({kind:'confirm-slew',b1950:{southPoleSignLost:true}});
  const v3=b1950Ok(fields('23','59','0','0','0','0'));
  expect(skyCoordsFieldsFor(v3.state.target)).toEqual(fields('0','1','33.73','0','16','42.3'));expect(v3.state.target.ra).toBeLessThan(0.1);
 });
 it('skyCoordsDraftTarget gives what OK would store: parsed J2000, converted B1950, null for a refused entry',()=>{
  const open=enter(at(5,10),V1);
  expect(skyCoordsDraftTarget(open.dialog!)).toEqual({ra:1,dec:30,conversion:null});
  const b=track(selectSkyCoordsEpoch(open,1)).state,d=skyCoordsDraftTarget(b.dialog!)!;
  expect({ra:d.ra,dec:d.dec}).toEqual(b2j({ra:1,dec:30}));expect(d.conversion).toMatchObject({branch:'asin',southPoleSignLost:false});
  expect(skyCoordsDraftTarget({...b.dialog!,fields:{...b.dialog!.fields,raHours:'x'}})).toBeNull();
 });
 it('reopen converts the stored target to B1950 before the prefill; Cancel keeps it; another open converts again (drift)',()=>{
  const declined=declinedB1950(),j=declined.target;
  const open=track(openSetCoordinates(declined,O));
  expect(open.steps).toEqual(['RA-07','RA-EP-02','RA-EP-01','RA-08']);
  expect(open.state.target).toEqual(j2b(j));expect(open.state.targetHoldsB1950).toBe(true);
  expect(open.state.dialog).toEqual({fields:fields('1','0','0.00','30','0','0.0'),epochIndex:1,epochEnabled:true});
  const cancel=track(cancelSkyCoords(open.state));expect(cancel.outcome).toBe('dialog-cancelled-b1950');const cancelled=cancel.state;
  expect(cancelled).toMatchObject({target:j2b(j),skyCoordsB1950:true,targetHoldsB1950:true,dialog:null});
  const drift=track(openSetCoordinates(cancelled,O)).state;
  expect(drift.target).toEqual(j2b(j2b(j)));expect(drift.dialog!.fields).toEqual(fields('0','57','16.56','29','43','50.4'));
 });
 it('OK on a reopened dialog converts the displayed fields back; switching to J2000 there converts nothing and clears the flag',()=>{
  const open=track(openSetCoordinates(declinedB1950(),O)).state;
  const again=track(confirmSkyCoords(open,O));
  expect(again.state.target).toEqual(b2j(parseOk(open.dialog!.fields)));
  expect(again.state).toMatchObject({skyCoordsB1950:true,targetHoldsB1950:false});
  const toggled=track(selectSkyCoordsEpoch(open,0)).state;expect(toggled.target).toEqual(open.target);
  const asJ=track(confirmSkyCoords(toggled,O));
  expect(asJ.state.target).toEqual(parseOk(open.dialog!.fields));
  expect(asJ.state).toMatchObject({skyCoordsB1950:false,targetHoldsB1950:false});expect(asJ.state.notice).not.toHaveProperty('b1950');
 });
 it('invalid input and web refusals write no flag; error boxes do not re-run the activation',()=>{
  const open=track(openSetCoordinates(declinedB1950(),O)).state;
  const edited=track(editSkyCoordsField(track(selectSkyCoordsEpoch(open,0)).state,'raHours','25')).state;
  const err=track(confirmSkyCoords(edited,O));expect(err.outcome).toBe('ra-invalid');
  expect(err.state).toMatchObject({skyCoordsB1950:true,targetHoldsB1950:true,target:open.target});
  const back=track(answerNotice(err.state,O,'ra-invalid','ok')).state;
  expect(back.dialog).toEqual(edited.dialog);expect(back.target).toEqual(open.target);
  const fresh=track(selectSkyCoordsEpoch(enter(at(5,10),fields('1','0','0','90','0','1e-12')),1)).state;
  const u=track(confirmSkyCoords(fresh,O));expect(u.outcome).toBe('dec-unsupported');expect(u.state.skyCoordsB1950).toBe(false);
  const declined=declinedB1950(),refused=track(openSetCoordinates(declined,opts({rateBase:0})));
  expect(refused).toMatchObject({outcome:'options-unsupported',changed:false});expect(refused.state).toBe(declined);
 });
 it('seeds from the pointing before converting; the stop question converts nothing and keeps the flag',()=>{
  const s={...at(5,10),skyCoordsB1950:true};// synthetic: flag set while FormCreate's zero coordinates are stored
  expect(track(openSetCoordinates(s,O)).state.target).toEqual(j2b({ra:5,dec:10}));
  const slewing=track(answerNotice(b1950Ok().state,O,'confirm-slew','yes')).state;
  const q=track(openSetCoordinates(slewing,O));
  expect(q.outcome).toBe('stop-requested');expect(q.state).toMatchObject({target:slewing.target,skyCoordsB1950:true,targetHoldsB1950:false});
  expect(track(answerNotice(q.state,O,'stop-slew','yes')).state).toMatchObject({target:slewing.target,skyCoordsB1950:true});
 });
 it('transit: the epoch line follows the transit note on the confirmation (0x566f1b)',()=>{
  const o=opts({transitTelescope:true}),s={...activated(o),pointing:{ra:0,dec:10}};
  const ok=b1950Ok(V1,s,o);
  expect(ok.outcome).toBe('transit-notice');expect(ok.state.notice).toEqual({kind:'transit-dec-only',b1950:{southPoleSignLost:false}});
  const c=track(answerNotice(ok.state,o,'transit-dec-only','ok'));
  expect(c.state.notice).toMatchObject({kind:'confirm-slew',transit:true,b1950:{southPoleSignLost:false}});expect(c.steps).toEqual(['RA-10','RA-EP-04']);
 });
 it('the request-time hour angle and the altitude check use the converted target',()=>{
  const L=opts({limitsEnabled:true}),ok=b1950Ok(V1,at(5,10,L),L,lstReading(1));
  expect(ok.outcome).toBe('slew-confirm-requested');expect(ok.steps).toEqual(['RA-09','RA-EP-03','RA-EP-01','RA-10','RA-12','RA-EP-04']);
  expect(ok.state.notice).toMatchObject({kind:'confirm-slew',hourAngle:1-ok.state.target.ra,b1950:{southPoleSignLost:false}});
  // LST 13 h: HA ≈ 12 h, below the horizon for the converted Dec ≈ 30.27° at the compiled latitude; the target stays stored.
  const low=b1950Ok(V1,at(5,10,L),L,lstReading(13));
  expect(low.state).toMatchObject({notice:{kind:'altitude-limit-request',transit:false},skyCoordsB1950:true,target:ok.state.target});
 });

 // WEB-EP-03 guidance (browser-only metadata and notes; no numeric or state change).
 const dec=(d:string,m:string,s:string)=>fields('1','0','0',d,m,s);
 const reopenAfter=(f:SkyCoordsFields)=>{
  const ok=b1950Ok(f),declined=track(answerNotice(ok.state,O,'confirm-slew','no')).state;
  return {ok,declined,open:track(openSetCoordinates(declined,O))};
 };
 it('lost-minus note follows the CURRENT Dec fields with OK’s parse, minus test and admission',()=>{
  const lost=(f:SkyCoordsFields,stored=-0.5)=>skyCoordsPrefillMinusLost(f,stored);
  // A positive admitted Dec with a bare zero degree, while the stored Dec is southern.
  for(const f of [dec('0','30','0.0'),dec('+0','30','0.0'),dec(' 0','30','0.0'),dec('0','0','0.5'),dec('0.0e1','30','0'),dec('0','-30','3600'),dec('0','31','-60')])expect(lost(f)).toBe(true);
  // Negative components (already southern), cancellation to zero, carry to −1, rounded zero, explicit minus, invalid text.
  for(const f of [dec('0','-30','0'),dec('0','30','-1800'),dec('0','0','-0.5'),dec('-1','0','0.0'),dec('0','0','0.0'),dec('-0','30','0'),dec('0e-1','30','0'),dec('-1','30','0'),
   dec('0','x','0'),dec('0','30',''),dec('x','30','0'),dec('0','5401','0'),dec('0.5','0','0')])expect(lost(f)).toBe(false);
  // The southern reading of the same text agrees with parseSkyCoords (no repair, no new minus rule).
  expect(parseOk(dec('0','-30','0')).dec).toBe(-0.5);expect(parseOk(dec('0','30','-1800')).dec).toBe(0);expect(parseOk(dec('0e-1','30','0')).dec).toBe(-0.5);
  for(const stored of [0,-0,0.5,Number.NaN])expect(lost(dec('0','30','0.0'),stored)).toBe(false);
 });
 it('D2: a prefill carried to −1° gives no lost-minus note',()=>{
  const {open}=reopenAfter(fields('6','0','0','-0','59','59.97'));
  expect(open.state.dialog!.fields).toEqual(fields('6','0','0.00','-1','0','0.0'));
  expect(open.state.target.dec).toBeLessThan(0);expect(skyCoordsPrefillMinusLost(open.state.dialog!.fields,open.state.target.dec)).toBe(false);
 });
 it('a real prefill minus loss: the note holds for 0, disappears for -0, and OK follows the typed sign',()=>{
  const {open}=reopenAfter(dec('-0','30','0')),s=open.state;
  expect(s.target.dec).toBeLessThan(0);expect(s.target.dec).toBeGreaterThan(-1);expect(s.dialog!.fields.decDegrees).toBe('0');
  expect(skyCoordsPrefillMinusLost(s.dialog!.fields,s.target.dec)).toBe(true);
  expect(track(confirmSkyCoords(s,O)).state.target.dec).toBeGreaterThan(0);
  const minus=track(editSkyCoordsField(s,'decDegrees','-0')).state;
  expect(skyCoordsPrefillMinusLost(minus.dialog!.fields,minus.target.dec)).toBe(false);
  expect(track(confirmSkyCoords(minus,O)).state.target.dec).toBeLessThan(0);
  const j=track(selectSkyCoordsEpoch(s,0)).state;expect(skyCoordsPrefillMinusLost(j.dialog!.fields,j.target.dec)).toBe(true);
 });
 it('a prefill rounded to 0/0/0.0 gives no lost-minus note',()=>{
  const {open}=reopenAfter(dec('-0','0','0.01')),s=open.state;
  expect(s.target.dec).toBeLessThan(0);expect(s.dialog!.fields).toMatchObject({decDegrees:'0',decMinutes:'0',decSeconds:'0.0'});
  expect(skyCoordsPrefillMinusLost(s.dialog!.fields,s.target.dec)).toBe(false);
 });
 it('D3: a reopen whose conversion loses a southern sign is marked on the dialog only; Cancel and the next open clear it',()=>{
  const {ok,declined,open}=reopenAfter(fields('12','0','0','-89','24','0'));
  expect(ok.state.notice).toMatchObject({kind:'confirm-slew',b1950:{southPoleSignLost:false}});
  const j=declined.target;expect(j.dec).toBeLessThan(-RADIO_EPOCH_POLE_THRESHOLD_DEGREES);
  expect(open.steps).toEqual(['RA-07','RA-EP-02','RA-EP-01','RA-08']);
  expect(open.state.target).toEqual(j2b(j));expect(open.state.target.dec).toBeGreaterThan(0);
  expect(open.state).toMatchObject({skyCoordsB1950:true,targetHoldsB1950:true});
  expect(open.state.dialog).toEqual({fields:fields('12','0','0.00','89','24','0.0'),epochIndex:1,epochEnabled:true,openSouthPoleSignLost:true});
  // Historical metadata: kept through an edit south, an epoch choice and an error box; target and flags unchanged until a valid OK.
  const south=track(editSkyCoordsField(open.state,'decDegrees','-89')).state;
  const toJ=track(selectSkyCoordsEpoch(south,0)).state;
  const err=track(confirmSkyCoords(track(editSkyCoordsField(toJ,'decMinutes','x')).state,O));expect(err.outcome).toBe('dec-invalid');
  const back=track(answerNotice(err.state,O,'dec-invalid','ok')).state;
  for(const s of [south,toJ,err.state,back]){
   expect(s.dialog!.openSouthPoleSignLost).toBe(true);expect(s).toMatchObject({target:open.state.target,skyCoordsB1950:true,targetHoldsB1950:true});
  }
  const cancel=track(cancelSkyCoords(open.state));
  expect(cancel.state).toMatchObject({target:open.state.target,skyCoordsB1950:true,targetHoldsB1950:true,dialog:null});
  expect(track(openSetCoordinates(cancel.state,O)).state.dialog).not.toHaveProperty('openSouthPoleSignLost');
  expect(track(confirmSkyCoords(open.state,O)).state.dialog).toBeNull();
 });
 it('no reopen-pole mark without a southern polar loss at this open',()=>{
  const north=reopenAfter(fields('12','0','0','89','24','0')).open.state;
  expect(north.target.dec).toBeGreaterThan(0);expect(north.dialog).not.toHaveProperty('openSouthPoleSignLost');
  expect(track(openSetCoordinates(declinedB1950(),O)).state.dialog).not.toHaveProperty('openSouthPoleSignLost');
  expect(track(openSetCoordinates({...at(5,-89.9),target:{ra:5,dec:-89.9}},O)).state.dialog).not.toHaveProperty('openSouthPoleSignLost');
  const slewing=track(answerNotice(b1950Ok(fields('12','0','0','-89','24','0')).state,O,'confirm-slew','yes')).state;
  const q=track(openSetCoordinates(slewing,O));expect(q.outcome).toBe('stop-requested');expect(q.state.dialog).toBeNull();
 });
});

describe('captions, catalog and provenance',()=>{
 it('keeps the original DFM captions',()=>{
  expect(RADIO_LAB_CAPTIONS).toMatchObject({form:'VIREO Radio Telescope Control Panel',setCoordinates:'Set Coordinates...',tracking:'Tracking',slewRate:'Slew Rate'});
  expect(SKY_COORDS_CAPTIONS).toMatchObject({form:' Enter Sky Coordinates for Slew',epochs:['J2000.0','B1950.0'],arcminutes:"' ",arcseconds:'" '});
  expect(NOTICE_BUTTONS['confirm-slew']).toEqual(['yes','no']);expect(NOTICE_BUTTONS['transit-dec-only']).toEqual(['ok','cancel']);
 });
 it('has an English message for every outcome and notice, and validates replacement catalogs',()=>{
  const every:Record<RadioLabOutcome,true>={'add-to-list-enabled':true,'activated':true,'already-activated':true,'not-activated':true,'modal-open':true,'options-unsupported':true,'rate-unsupported':true,'tracking-on':true,'tracking-off':true,'tracking-unavailable':true,'rate-up':true,'rate-down':true,'rate-at-limit':true,'rate-disabled':true,'menu-disabled':true,'dialog-opened':true,'stop-requested':true,'field-edited':true,'field-too-long':true,'epoch-selected':true,'epoch-disabled':true,'dialog-closed':true,'dialog-cancelled':true,'dialog-cancelled-b1950':true,'ra-invalid':true,'dec-invalid':true,'ra-unsupported':true,'dec-unsupported':true,'no-slew-needed':true,'transit-notice':true,'limits-require-clock':true,'altitude-limit-request':true,'altitude-undecided':true,'slew-confirm-requested':true,'notice-dismissed':true,'notice-stale':true,'invalid-answer':true,'transit-cancelled':true,'slew-declined':true,'slew-started':true,'slew-instant':true,'slew-stopped':true,'slew-resumed':true,'slew-timer-idle':true,'slew-tick':true,'slew-axis-ra':true,'slew-complete':true,
   'clock-idle':true,'clock-reading-invalid':true,'clock-altitude-limit':true,'clock-altitude-limit-behind-box':true,'clock-altitude-undecided':true,'altitude-notice-open':true,'hour-angle-unknown':true,'clock-tick':true,
   'manual-started':true,'manual-latched':true,'manual-unavailable':true,'manual-programmed-slew':true,'manual-limits-clock':true,'manual-step-unsupported':true,
   'manual-tick':true,'manual-altitude-limit':true,'manual-altitude-undecided':true,'manual-idle':true,'manual-released':true,'manual-released-other':true,'manual-cancelled':true,
   'hot-list-opened':true,'hot-list-empty':true,'hot-list-slewing':true,'hot-list-not-open':true,'hot-list-index-selected':true,'hot-list-index-invalid':true,
   'hot-list-no-selection':true,'hot-list-selected':true,'hot-list-closed':true,'hot-list-reopened':true,
   'hot-list-search-opened':true,'hot-list-search-edited':true,'hot-list-search-too-long':true,'hot-list-search-cancelled':true,'hot-list-search-empty':true,'hot-list-search-found':true,'hot-list-search-not-found':true,'hot-list-search-not-open':true};
  const ta=createRadioAntennaTranslator();
  for(const o of Object.keys(every))expect(Object.hasOwn(RADIO_ANTENNA_MESSAGES_EN,`antenna.outcome.${o}`)).toBe(true);
  for(const k of Object.keys(NOTICE_BUTTONS))for(const key of k.endsWith('-unsupported')?[`antenna.notice.${k}.cancellation`,`antenna.notice.${k}.precision`]
   :k==='altitude-undecided'?[`antenna.notice.${k}.domain`,`antenna.notice.${k}.precision`]:k==='altitude-limit-request'?[`antenna.notice.${k}`,`antenna.notice.${k}-transit`]:[`antenna.notice.${k}`])
   expect(Object.hasOwn(RADIO_ANTENNA_MESSAGES_EN,key)).toBe(true);
  expect(ta('antenna.notice.ra-unsupported.cancellation',{limit:SKY_COORDS_WEB_DOMAIN.magnitudeLimit})).toContain('at or below 1000000');
  for(const o of seen)expect(Object.keys(every)).toContain(o);
  expect(ta('antenna.notice.confirm-slew',{ra:'<b>1</b>',dec:'x'})).toBe('Slew the telescope to RA <b>1</b>, Dec x?');
  expect(()=>ta('antenna.notice.confirm-slew',{ra:'1'})).toThrow('Missing message parameter');
  expect(()=>createRadioAntennaTranslator({...RADIO_ANTENNA_MESSAGES_EN,'antenna.rate.value':'{rate}'})).toThrow();
  const {['antenna.scope']:_omit,...missing}=RADIO_ANTENNA_MESSAGES_EN;void _omit;
  expect(()=>createRadioAntennaTranslator(missing as typeof RADIO_ANTENNA_MESSAGES_EN)).toThrow();
  const marked=createRadioAntennaTranslator(Object.fromEntries(Object.entries(RADIO_ANTENNA_MESSAGES_EN).map(([k,v])=>[k,'[x] '+v])) as typeof RADIO_ANTENNA_MESSAGES_EN);
  expect(marked('antenna.button.yes')).toBe('[x] Yes');
 });
 it('binds the artifact, the reused/fresh REA records and every emitted contract',()=>{
  expect(provenance.artifact.sha256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
  expect(provenance.rea.reusedRecord.evidenceId).toBe('ev_61f426f3d7b436d5a1b186c2066abe3e072c9cce6f63d4f93b4aebcfa48094ff');
  expect(provenance.rea.freshExecution.evidenceId).toBe('ev_be75d7d377a56116d3e0f735a646c38191fd95073d89c054e348b2bd46c558ef');
  expect(provenance.contracts.map(c=>c.id)).toEqual(Array.from({length:19},(_,i)=>`RA-${String(i+1).padStart(2,'0')}`));
  expect(provenance.epoch.contracts.map(c=>c.id)).toEqual(['RA-EP-01','RA-EP-02','RA-EP-03','RA-EP-04']);
  expect(provenance.epoch.webPolicies.map(p=>p.id)).toEqual(['WEB-EP-01','WEB-EP-02','WEB-EP-03','WEB-EP-04']);
  expect(provenance.epoch.requestSlewSupplement).toMatchObject({listingSHA256:'3983f6d14471c20627e61edca7c59be26b5d5e3e73e3b36f4e598546490e3885',decodedNativeConfirmationText:false});
  expect(provenance.rea.manualSectionHeaders.evidenceId).toBe('ev_e38712cf9c7d43940da29cd5dc4bc40bf7f633a2c4d32642a40a0c87b1112228');
  const web=new Set(provenance.webPolicies.map(p=>p.id));
  for(const policy of ['WEB-MANUAL-01','WEB-MANUAL-02','WEB-MANUAL-03','WEB-MANUAL-04','WEB-ALT-01','WEB-ALT-02','WEB-ALT-03'])expect(web.has(policy)).toBe(true);
  for(const c of provenance.contracts)expect(c.ranges.length).toBeGreaterThan(0);
  expect(normalizeRaHours(-0.5)).toBe(23.5);expect(normalizeRaHours(24)).toBe(0);expect(normalizeRaHours(48.25)).toBe(0.25);
 });
});

// RA-19 KeyUp → RA-17 MouseUp of the RELEASED key's button (no held-direction check), restated from the listings:
// MouseUp(r) enables RateSpin, Slew1 and the three buttons other than r; E/W MouseUp call ClocktimerTimer with Tracking
// off (0x566628/0x566778), N/S never do. Chosen implementation contract, not a native runtime oracle.
describe('RA-19 cross release through another direction’s MouseUp and the button it leaves disabled',()=>{
 const through=(s:RadioLabState,d:ManualDirection,clock:RadioClockReading|null=null,o=O)=>track(releaseManualSlewThrough(s,o,clock,d));
 /** N held with Tracking on, released through S: S stays disabled. */
 const leftSouth=()=>through(press(tracking(),'north').state,'south').state;
 it('through the held direction: the releaseManualSlew state and outcome, with RA-19 first in the steps',()=>{
  expect(INITIAL_RADIO_LAB.manualButtonLeftDisabled).toBeNull();
  for(const d of MANUAL_DIRECTIONS){
   const held=mtick(press(tracking(),d).state).state,plain=release(held),key=through(held,d);
   expect(key.state).toEqual(plain.state);expect(key.outcome).toBe(plain.outcome);expect(key.outcome).toBe('manual-released');
   expect(plain.steps).toEqual(['RA-17']);expect(key.steps).toEqual(['RA-19','RA-17']);expect(key.state.manualButtonLeftDisabled).toBeNull();
  }
  // E/W with Tracking off and a reading chain the clock tick in both.
  const held=mtick(press(trackingOffAfterSlew(1,10),'west').state).state,plain=release(held,lstReading(7)),key=through(held,'west',lstReading(7));
  expect(key.state).toEqual(plain.state);expect(plain.steps).toEqual(['RA-17','RA-13']);expect(key.steps).toEqual(['RA-19','RA-17','RA-13']);
 });
 it('N held, released through S: S disabled and refused; N/E/W, RateSpin and Slew enabled; nothing moves',()=>{
  const held=mtick(press(tracking(),'north').state).state,t=through(held,'south');
  expect(t).toMatchObject({outcome:'manual-released-other',changed:true,steps:['RA-19','RA-17']});
  expect(t.state).toMatchObject({manualPress:false,manualButtonsEnabled:true,manualButtonLeftDisabled:'south',rateSpinEnabled:true,slewMenuEnabled:true,manualRun:held.manualRun});
  expect(t.state.pointing).toEqual(held.pointing);expect(t.state.hourAngle).toBe(held.hourAngle);
  for(const d of MANUAL_DIRECTIONS)expect(manualButtonEnabled(t.state,d)).toBe(d!=='south');
  expect(radioLabManualRefusal(t.state,O,'south')).toBe('manual-unavailable');
  const refused=press(t.state,'south');expect(refused).toMatchObject({outcome:'manual-unavailable',changed:false});expect(refused.state).toBe(t.state);
  for(const d of ['north','east','west'] as const)expect(radioLabManualRefusal(t.state,O,d)).toBeNull();
  // Every leftover direction: the released one, never the held one.
  for(const d of MANUAL_DIRECTIONS)for(const r of MANUAL_DIRECTIONS)expect(through(press(tracking(),d).state,r).state.manualButtonLeftDisabled).toBe(r===d?null:r);
 });
 it('Tracking off: the clock chain follows the released key (E held → N: none; N held → E: RA := LST − HA)',()=>{
  const s=trackingOffAfterSlew(1,10);expect(s.hourAngle).toBe(0);
  const east=mtick(press(s,'east').state).state,viaNorth=through(east,'north',lstReading(7));
  expect(viaNorth).toMatchObject({outcome:'manual-released-other',steps:['RA-19','RA-17']});
  expect(viaNorth.state.pointing).toEqual(east.pointing);expect(viaNorth.state.hourAngle).toBe(east.hourAngle);expect(viaNorth.state.clock).toBeNull();
  expect(viaNorth.state.manualButtonLeftDisabled).toBe('north');
  const north=mtick(press(s,'north').state).state,viaEast=through(north,'east',lstReading(7));
  expect(viaEast).toMatchObject({outcome:'manual-released-other',steps:['RA-19','RA-17','RA-13']});
  expect(north.hourAngle).toBe(0);expect(viaEast.state.pointing).toEqual({ra:normalizeRaHours(7-0),dec:north.pointing.dec});
  expect(viaEast.state.hourAngle).toBe(0);expect(viaEast.state.clock).toEqual(lstReading(7));expect(viaEast.state.manualButtonLeftDisabled).toBe('east');
  // Without a reading (or with Tracking on) no chain; the release and the leftover still happen.
  const blind=through(north,'west',null);expect(blind.steps).toEqual(['RA-19','RA-17']);expect(blind.state.pointing).toEqual(north.pointing);expect(blind.state.manualButtonLeftDisabled).toBe('west');
  expect(through(press(at(1,10),'north').state,'east',lstReading(7)).steps).toEqual(['RA-19','RA-17']);
 });
 it('transit panel: a release through hidden E still runs and chains the clock tick (KeyUp has no +0xd4, MouseUp tests no Visible)',()=>{
  const o=opts({transitTelescope:true}),started=startUnder(activated(o),fields('0','0','0','30','0','0'),o);expect(started.outcome).toBe('slew-started');
  const s=track(answerNotice(runSlew(started.state,o).state,o,'slew-complete','ok',null)).state;
  expect(s).toMatchObject({eastWestVisible:false,tracking:false,manualButtonsEnabled:true});
  const held=press(s,'north',o).state,t=through(held,'east',lstReading(7),o);
  expect(held.hourAngle).not.toBeNull();
  expect(t).toMatchObject({outcome:'manual-released-other',steps:['RA-19','RA-17','RA-13']});
  expect(t.state.pointing.ra).toBe(normalizeRaHours(7-held.hourAngle!));expect(t.state.manualButtonLeftDisabled).toBe('east');
  expect(manualButtonEnabled(t.state,'east')).toBe(false);expect(manualButtonEnabled(t.state,'north')).toBe(true);expect(manualButtonEnabled(t.state,'south')).toBe(true);
 });
 it('cleared by the whole-set writers and a press; kept by an instant slew, clock ticks and rate changes',()=>{
  const left=leftSouth();expect(left.manualButtonLeftDisabled).toBe('south');
  const off=track(toggleTracking(left,O)).state;expect(off.manualButtonLeftDisabled).toBeNull();// 0x565140
  expect(track(toggleTracking(off,O)).state.manualButtonLeftDisabled).toBeNull();
  expect(track(toggleTracking({...off,tracking:false,manualButtonsEnabled:true,manualButtonLeftDisabled:'south'},O)).state.manualButtonLeftDisabled).toBeNull();// synthetic: 0x5651cc
  expect(press(left,'north').state.manualButtonLeftDisabled).toBeNull();// MouseDown(N) disables S anyway; the held set is derived
  expect(release(press(left,'north').state).state.manualButtonLeftDisabled).toBeNull();
  expect(track(activateRadioLab({...INITIAL_RADIO_LAB,manualButtonLeftDisabled:'south'},O)).state.manualButtonLeftDisabled).toBeNull();// synthetic before activation
  const slewing=slewTo(left,fields('3','0','0','20','0','0'));expect(slewing.manualButtonLeftDisabled).toBeNull();// slew start
  const arrived=runSlew({...slewing,manualButtonLeftDisabled:'south'}).state;// synthetic leftover during a slew
  expect(arrived.notice).toEqual({kind:'slew-complete'});expect(arrived.manualButtonLeftDisabled).toBeNull();
  const question=track(openSetCoordinates({...slewing,manualButtonLeftDisabled:'west'},O)).state;// synthetic
  expect(question.manualButtonLeftDisabled).toBe('west');
  expect(track(answerNotice(question,O,'stop-slew','no')).state.manualButtonLeftDisabled).toBe('west');
  expect(track(answerNotice(question,O,'stop-slew','yes')).state.manualButtonLeftDisabled).toBeNull();
  // Kept: an instant slew writes no button, nor do clock ticks and RateSpin.
  const instant=opts({instantSlew:true}),jumped=slewTo(left,fields('3','0','0','20','0','0'),instant);
  expect(jumped.pointing).toEqual({ra:3,dec:20});expect(jumped.manualButtonLeftDisabled).toBe('south');
  expect(clockTick(left,lstReading(3)).state.manualButtonLeftDisabled).toBe('south');
  expect(track(changeSlewRate(left,O,'up')).state.manualButtonLeftDisabled).toBe('south');
 });
 it('the SlewTimerTimer failure path (0x5651cc) clears it',()=>{
  const L=opts({limitsEnabled:true});
  const s=clockTick(track(changeSlewRate(at(1,-41.4,L),L,'up')).state,lstReading(1),L).state;
  const held={...press(s,'south',L).state,manualButtonLeftDisabled:'west' as const};// synthetic: a leftover cannot coexist with a latch
  const t=mtick(held,L);expect(t.outcome).toBe('manual-altitude-limit');expect(t.state.manualButtonLeftDisabled).toBeNull();
 });
 it('cancel keeps the held-direction cleanup; an idle release changes nothing; an invalid direction throws',()=>{
  const held=press(tracking(),'north').state;
  const c=release(held,null,O,'cancel');expect(c.outcome).toBe('manual-cancelled');expect(c.state.manualButtonLeftDisabled).toBeNull();
  const idle=through(c.state,'south');expect(idle).toMatchObject({outcome:'manual-idle',changed:false,steps:[]});expect(idle.state).toBe(c.state);
  expect(()=>releaseManualSlewThrough(held,O,null,'up' as ManualDirection)).toThrow('Invalid manual direction');
 });
});
