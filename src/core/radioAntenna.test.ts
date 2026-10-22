import {describe,it,expect} from 'vitest';
import provenance from '../../docs/RADIO-ANTENNA-PROVENANCE.json';
import {
 INITIAL_RADIO_LAB,NOTICE_BUTTONS,RADIO_COMPILED_ENVIRONMENT,RADIO_COMPILED_OPTIONS,RADIO_LAB_CAPTIONS,RADIO_LAB_CONSTANTS,SKY_COORDS_CAPTIONS,
 SKY_COORDS_FIELD_MAX_LENGTH,activateRadioLab,answerNotice,cancelSkyCoords,changeSlewRate,confirmSkyCoords,editSkyCoordsField,formatFixed,
 isRadioLabOptions,isSupportedRadioLabProfile,nearestBinary64,normalizeRaHours,openSetCoordinates,parseDelphiFloat,parseExactDecimal,parseSkyCoords,
 radioLabProfileIssues,radioLabRateIssues,radioLabTickRefusal,roundHalfEven,selectSkyCoordsEpoch,skyCoordsFieldsFor,slewRateFor,slewTimerTick,splitSexagesimal,toggleTracking,valueSign,
 RADIO_WEB_OPTION_PROFILE,SKY_COORDS_WEB_DOMAIN,
 type RadioLabOptions,type RadioLabOutcome,type RadioLabState,type RadioLabTransition,type SkyCoordsFields,
} from './radioAntenna';
import {INITIAL_RADIO_CONTROL,clickRadioSwitch,enterRadioPulsarsExercise,radioIdCaptionLabel,scopeTimerTick,selectRadioAccess} from './radioControl';
import {RADIO_ANTENNA_MESSAGES_EN,createRadioAntennaTranslator} from '../components/RadioAntennaMessages';

const O=RADIO_COMPILED_OPTIONS,ids=new Set(provenance.contracts.map(c=>c.id));
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
  expect(RADIO_COMPILED_ENVIRONMENT).toEqual({dishDiameterMeters:100,accessOptionByte:false});
  for(const bad of [{maxRateIndex:256},{maxRateIndex:1.5},{rateBase:2**31},{latitudeRadians:Number.NaN},{transitTelescope:1}])
   expect(isRadioLabOptions({...O,...bad})).toBe(false);
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
 it('B1950 gating comes after admission, as validation precedes the epoch test natively',()=>{
  const open=track(selectSkyCoordsEpoch(enter(tracking(),fields('1','0','0','1000000','-60000000','0')),1)).state;
  expect(track(confirmSkyCoords(open,O)).outcome).toBe('dec-unsupported');
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
  expect(ok.state.target).toEqual({ra:5,dec:10});expect(ok.state.notice).toEqual({kind:'confirm-slew',target:{ra:5,dec:10},transit:false});
  expect(ok.steps).toEqual(['RA-09','RA-10']);
 });
 it('bounds edits and gates B1950 without storing anything',()=>{
  const open=enter(tracking(),fields('5','0','0','10','0','0'));
  expect(track(editSkyCoordsField(open,'raHours','1'.repeat(33))).outcome).toBe('field-too-long');
  expect(track(editSkyCoordsField(open,'raHours','5'))).toMatchObject({outcome:'field-edited',changed:false});
  const b=track(selectSkyCoordsEpoch(open,1));expect(b.state.dialog!.epochIndex).toBe(1);
  const gate=track(confirmSkyCoords(b.state,O));expect(gate.outcome).toBe('b1950-gated');expect(gate.state.target).toEqual(open.target);expect(gate.state.dialog).not.toBeNull();
  const j=track(selectSkyCoordsEpoch(track(answerNotice(gate.state,O,'b1950-gated','ok')).state,0));
  expect(track(confirmSkyCoords(j.state,O)).outcome).toBe('slew-confirm-requested');
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
  const confirm=track(answerNotice(note.state,o,'transit-dec-only','ok'));expect(confirm.state.notice).toEqual({kind:'confirm-slew',target:{ra:9,dec:12},transit:true});
  const run=runSlew(track(answerNotice(confirm.state,o,'confirm-slew','yes')).state,o);
  expect(run.outcomes).toEqual(['slew-tick','slew-tick','slew-complete']);expect(run.state.pointing).toEqual({ra:4,dec:12});
 });
 it('instant-slew option: jumps without SlewTimer2 and normalizes RA 24 to 0',()=>{
  const o=opts({instantSlew:true}),s=at(1,10,o);
  const t=track(answerNotice(track(confirmSkyCoords(enter(s,fields('24','0','0','-30','0','0'),o),o)).state,o,'confirm-slew','yes'));
  expect(t.outcome).toBe('slew-instant');expect(t.state).toMatchObject({pointing:{ra:0,dec:-30},slewing:false,slewTimerEnabled:false,rateIndex:5});
 });
 it('enforced altitude limits stop at an explicit clock gate with the target stored and no motion',()=>{
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
  const confirm=track(answerNotice(note.state,B,'transit-dec-only','ok'));expect(confirm.state.notice).toEqual({kind:'confirm-slew',target:{ra:9,dec:-30},transit:false});
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
 it('inside the dialog the reason follows the valid J2000 draft; invalid text, entries outside the web domain and B1950 keep their own refusal; limits stay gated',()=>{
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
  const b1950=track(selectSkyCoordsEpoch(far,1)).state;expect(startIssues(b1950,B)).toEqual([]);
  expect(track(confirmSkyCoords(b1950,B)).outcome).toBe('b1950-gated');// before: rate-unsupported
  const limits={...B,limitsEnabled:true};expect(startIssues(far,limits)).toEqual([]);
  expect(track(confirmSkyCoords(far,limits))).toMatchObject({outcome:'limits-require-clock',state:{dialog:null,notice:null,target:{ra:2,dec:25},pointing:{ra:3,dec:20},slewing:false}});
 });
 it('a refused OK keeps draft and stored target; Cancel, reopen, No and a Dec-only entry then confirm and complete',()=>{
  const s=keptUnderB(),open=enter(s,fields('2','0','0','25','0','0'),B);
  const refused=track(confirmSkyCoords(open,B));expect(refused.state).toBe(open);
  const cancelled=track(cancelSkyCoords(refused.state)).state;expect(cancelled).toMatchObject({target:{ra:3,dec:20},dialog:null});
  expect(track(openSetCoordinates(cancelled,B)).state.dialog!.fields).toEqual(skyCoordsFieldsFor({ra:3,dec:20}));
  const ask=track(confirmSkyCoords(enter(cancelled,fields('3','0','0','5','0','0'),B),B));
  expect(ask.state.notice).toEqual({kind:'confirm-slew',target:{ra:3,dec:5},transit:false});
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

describe('captions, catalog and provenance',()=>{
 it('keeps the original DFM captions',()=>{
  expect(RADIO_LAB_CAPTIONS).toMatchObject({form:'VIREO Radio Telescope Control Panel',setCoordinates:'Set Coordinates...',tracking:'Tracking',slewRate:'Slew Rate'});
  expect(SKY_COORDS_CAPTIONS).toMatchObject({form:' Enter Sky Coordinates for Slew',epochs:['J2000.0','B1950.0'],arcminutes:"' ",arcseconds:'" '});
  expect(NOTICE_BUTTONS['confirm-slew']).toEqual(['yes','no']);expect(NOTICE_BUTTONS['transit-dec-only']).toEqual(['ok','cancel']);
 });
 it('has an English message for every outcome and notice, and validates replacement catalogs',()=>{
  const every:Record<RadioLabOutcome,true>={'activated':true,'already-activated':true,'not-activated':true,'modal-open':true,'options-unsupported':true,'rate-unsupported':true,'tracking-on':true,'tracking-off':true,'tracking-unavailable':true,'rate-up':true,'rate-down':true,'rate-at-limit':true,'rate-disabled':true,'menu-disabled':true,'dialog-opened':true,'stop-requested':true,'field-edited':true,'field-too-long':true,'epoch-selected':true,'epoch-disabled':true,'dialog-closed':true,'dialog-cancelled':true,'ra-invalid':true,'dec-invalid':true,'ra-unsupported':true,'dec-unsupported':true,'b1950-gated':true,'no-slew-needed':true,'transit-notice':true,'limits-require-clock':true,'slew-confirm-requested':true,'notice-dismissed':true,'notice-stale':true,'invalid-answer':true,'transit-cancelled':true,'slew-declined':true,'slew-started':true,'slew-instant':true,'slew-stopped':true,'slew-resumed':true,'slew-timer-idle':true,'slew-tick':true,'slew-axis-ra':true,'slew-complete':true};
  const ta=createRadioAntennaTranslator();
  for(const o of Object.keys(every))expect(Object.hasOwn(RADIO_ANTENNA_MESSAGES_EN,`antenna.outcome.${o}`)).toBe(true);
  for(const k of Object.keys(NOTICE_BUTTONS))for(const key of k.endsWith('-unsupported')?[`antenna.notice.${k}.cancellation`,`antenna.notice.${k}.precision`]:[`antenna.notice.${k}`])
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
  expect([...ids]).toEqual(Array.from({length:14},(_,i)=>`RA-${String(i+1).padStart(2,'0')}`));
  for(const c of provenance.contracts)expect(c.ranges.length).toBeGreaterThan(0);
  expect(normalizeRaHours(-0.5)).toBe(23.5);expect(normalizeRaHours(24)).toBe(0);expect(normalizeRaHours(48.25)).toBe(0.25);
 });
});
