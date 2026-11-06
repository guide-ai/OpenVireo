import {describe,expect,it} from 'vitest';
import {COMPILED_INSTRUMENT_PARAMETERS,INSTRUMENT_PARAMETER_FIELDS,PARAMETER_ERROR_BOX,applyParameterTexts,convertParameterText,instrumentParameterText,instrumentParameterTexts,
 isCompiledParameters,parseSpectrometerPolicySuffix,photometerCallbacksPerPeriod,photometerParameterRefusal,photometerParametersOf,photometerSkyBands,readInstrumentParameters,
 spectrometerPolicySuffix,spectrometerRouteRefusal,instrumentParameterLabel,spectrometerTickMs,spectrometerParameterRefusal,uncertifiedParameterKeys,COMPILED_SPECTROMETER_PARAMETERS,COMPILED_PHOTOMETER_PARAMETERS,type InstrumentParameters} from './instrumentParameters';
import {OPTION_TABS} from './opticalOptions';
import {createPhotometer,photometerEvent,releasePhotometer,replayPhotometer,type PhotometerEvent,type PhotometerState} from './photometer';
import {photometerJournalVersion,INSTRUCTOR_PARAMETERS_PHOTOMETER_POLICY} from './photometerJournal';
import {parsePhotometerSession,serializePhotometerSession} from '../io/photometerSession';
import {photometerPreparedZeroPoint,photometerTelescope} from './photometerTelescope';
import {PHOTOMETER_SKY_LITERALS,PINNED_UBV_SKY,buildPinnedPleiadesUbvField,photometerParameterExclusion} from './photometerUbvField';
import {photometerFullDomainExclusion,photometerTelescopeTargets} from './photometerTelescope';
import {magnitudeAmplitude} from './photons';
import {pleiadesExerciseSummary} from './pleiadesLab';
import {requiredPhotometerCallbacks} from './photometerIntegration';

const texts=instrumentParameterTexts(COMPILED_INSTRUMENT_PARAMETERS);
const with_=(k:keyof InstrumentParameters,t:string)=>({...texts,[k]:t});

describe('Front T6 field map and display (FormActivate 0x5a56e0)',()=>{
 it('maps the seven edits to their record fields, types and compiled values, in OK order',()=>{
  expect(INSTRUMENT_PARAMETER_FIELDS.map(f=>[f.control,f.record,f.type,f.compiled])).toEqual([
   ['BaseMagEd','+0x250c','single',6],['SkyMagEd','+0x2510','single',16],['SpSkyEd','+0x2514','single',19],
   ['BaseCountEd','+0x279f','integer',1000],['SpBaseEd','+0x27a7','integer',50],['PhoTimerEd','+0x27a3','integer',100],['SpTimerEd','+0x27ab','integer',1]]);
  // env = record + 0x6b4
  for(const f of INSTRUMENT_PARAMETER_FIELDS)expect(parseInt(f.env,16)).toBe(parseInt(f.record,16)+0x6b4);
 });
 it('shows the compiled values exactly as the read-only tabs did (ffFixed 18 with 1 or 2 digits, IntToStr)',()=>{
  expect(texts).toEqual({baseMagnitude:'6.0',skyMagnitude:'16.00',spectrometerSkyMagnitude:'19.00',baseCount:'1000',spectrometerBaseCount:'50',photometerTimerMs:'100',spectrometerTimerMs:'1'});
  const shown=new Map(OPTION_TABS.flatMap(t=>t.values.map(v=>[`${t.tab}:${v.label}`,v.text])));
  expect(shown.get('photometer:Base Magnitude (V)')).toBe(texts.baseMagnitude);expect(shown.get('photometer:Sky Magnitude (V)')).toBe(texts.skyMagnitude);
  expect(shown.get('photometer:Base Photon Count')).toBe(texts.baseCount);expect(shown.get('photometer:Timer Wait (ms)')).toBe(texts.photometerTimerMs);
  expect(shown.get('spectrometer:Sky Magnitude (V)')).toBe(texts.spectrometerSkyMagnitude);expect(shown.get('spectrometer:Base Photon Count')).toBe(texts.spectrometerBaseCount);
  expect(shown.get('spectrometer:Timer Wait (ms)')).toBe(texts.spectrometerTimerMs);
  expect(instrumentParameterText('baseMagnitude',Math.fround(6.25))).toBe('6.3');// FloatToStrF of the Single 6.25 at 1 digit
  expect(instrumentParameterText('skyMagnitude',Math.fround(17.1))).toBe('17.10');
 });
});

describe('Front T6 OK parse and validation (0x5a6328..0x5a651c)',()=>{
 it('stores Singles through float32 and Integers through Round (half to even)',()=>{
  expect(convertParameterText('baseMagnitude',' 6.1 ')).toBe(Math.fround(6.1));
  expect(convertParameterText('skyMagnitude','1.6E1')).toBe(16);
  expect(convertParameterText('baseCount','2.5')).toBe(2);expect(convertParameterText('baseCount','3.5')).toBe(4);expect(convertParameterText('baseCount','-0.4')).toBe(0);
  expect(convertParameterText('photometerTimerMs','50')).toBe(50);
 });
 it('refuses what StrToFloat refuses, and values the record cannot hold, with the one native box',()=>{
  for(const t of ['','abc','1,5','6.0x','0x10','1e400','Infinity'])expect(convertParameterText('baseMagnitude',t)).toBeNull();
  expect(convertParameterText('baseCount','3e9')).toBeNull();// outside Int32 [W]
  expect(convertParameterText('baseMagnitude','9e99')).toBeNull();// Single overflow [W]
  const r=applyParameterTexts(with_('baseCount','many'));
  expect(r).toEqual({ok:false,key:'baseCount',box:PARAMETER_ERROR_BOX});
  expect(PARAMETER_ERROR_BOX).toEqual({text:'Numeric Conversion Error!\r\n\r\nVerify Values of Numeric Parameters.',caption:'Non-Numeric Value!',flags:0x10});
 });
 it('stops at the first failing edit in VIREO order (BaseMag, SkyMag, SpSky, BaseCount, SpBase, PhoTimer, SpTimer)',()=>{
  const bad={...texts,spectrometerTimerMs:'?',photometerTimerMs:'?',skyMagnitude:'?'};
  expect(applyParameterTexts(bad)).toMatchObject({ok:false,key:'skyMagnitude'});
  expect(applyParameterTexts({...texts,spectrometerTimerMs:'?',photometerTimerMs:'?'})).toMatchObject({ok:false,key:'photometerTimerMs'});
 });
 it('round-trips the compiled texts to the compiled values (byte-identical record)',()=>{
  const r=applyParameterTexts(texts);expect(r.ok).toBe(true);
  if(r.ok){expect(r.values).toEqual(COMPILED_INSTRUMENT_PARAMETERS);expect(isCompiledParameters(r.values)).toBe(true);expect(uncertifiedParameterKeys(r.values)).toEqual([]);}
  expect(readInstrumentParameters({...COMPILED_INSTRUMENT_PARAMETERS})).toEqual(COMPILED_INSTRUMENT_PARAMETERS);
  expect(()=>readInstrumentParameters({...COMPILED_INSTRUMENT_PARAMETERS,baseMagnitude:6.1})).toThrow();// not a Single
  expect(()=>readInstrumentParameters({...COMPILED_INSTRUMENT_PARAMETERS,baseCount:1.5})).toThrow();
 });
});

describe('Front T6 uncertified-parameter typing',()=>{
 it('names every non-default field and gates the routes',()=>{
  const p={...COMPILED_INSTRUMENT_PARAMETERS,skyMagnitude:17,spectrometerTimerMs:5};
  expect(uncertifiedParameterKeys(p)).toEqual(['skyMagnitude','spectrometerTimerMs']);
  // Review 1 M1: SpTimer sets where TSpectrometer tests the S/N pause, so it gates the exercise routes too
  expect(spectrometerRouteRefusal(p,'exercise')).toEqual(['spectrometerTimerMs']);
  expect(spectrometerRouteRefusal(p,'multispec')).toEqual(['spectrometerTimerMs']);
  expect(instrumentParameterLabel('spectrometerTimerMs')).toBe('Spectrometer › Timer Wait (ms)');expect(instrumentParameterLabel('skyMagnitude')).toBe('Photometer › Sky Magnitude (V)');
  expect(spectrometerRouteRefusal({...p,baseMagnitude:7},'exercise')).toEqual(['baseMagnitude','spectrometerTimerMs']);
  expect(spectrometerRouteRefusal({...p,baseMagnitude:7},'generic')).toEqual([]);
 });
 it('policy suffix: none for the compiled values, exact round trip otherwise',()=>{
  expect(spectrometerPolicySuffix(COMPILED_SPECTROMETER_PARAMETERS)).toBe('');
  expect(parseSpectrometerPolicySuffix('x:1,2:T0')).toEqual({base:'x:1,2:T0',parameters:COMPILED_SPECTROMETER_PARAMETERS});
  const p={baseMagnitude:Math.fround(6.5),skyMagnitude:20,baseCount:100,timerMs:1},s=spectrometerPolicySuffix(p);
  expect(s).toBe('#P6.5,20,100,1');expect(parseSpectrometerPolicySuffix('x'+s)).toEqual({base:'x',parameters:p});
  expect(parseSpectrometerPolicySuffix('x#P6,19,50,1')).toBeNull();// the compiled values never carry a suffix
  expect(parseSpectrometerPolicySuffix('x#P6.1,19,50,1')).toBeNull();// not a Single
  expect(parseSpectrometerPolicySuffix('x#P6.5,20,100')).toBeNull();// the T6 three-field form is not admitted
  // SpTimer alone: uncertified, recorded; the browser tick follows it (at least 100 ms); 1..500 ms only
  const t={...COMPILED_SPECTROMETER_PARAMETERS,timerMs:300};
  expect(spectrometerPolicySuffix(t)).toBe('#P6,19,50,300');expect(spectrometerTickMs(t)).toBe(300);expect(spectrometerTickMs(COMPILED_SPECTROMETER_PARAMETERS)).toBe(100);
  expect(spectrometerParameterRefusal({...t,timerMs:501})).toBe('timer');expect(spectrometerParameterRefusal(t)).toBeNull();
 });
});

describe('Front T6 photometer formulas',()=>{
 it('prepared zero point = Single(BaseMag + correction) + 5 (0x53df4f, 0x500976); compiled equals the contract',()=>{
  for(const i of [0,1,2] as const)expect(photometerPreparedZeroPoint(i,6)).toBe(photometerTelescope(i).zeroPoint);
  expect(photometerPreparedZeroPoint(0,7)).toBe(photometerTelescope(0).zeroPoint+1);
 });
 it('sky colours follow SkyMag (FormShow 0x4ff6aa) and equal the pinned sky at 16',()=>{
  const {bv,ub}=PHOTOMETER_SKY_LITERALS;
  expect(photometerSkyBands(16,bv,ub)).toEqual(PINNED_UBV_SKY);
  expect(photometerSkyBands(17,bv,ub).V).toBe(17);
 });
 it('callbacks per period: ⌈1000·s / Timer⌉, the compiled 100 ms unchanged',()=>{
  expect(photometerCallbacksPerPeriod(1,100)).toBe(10);expect(photometerCallbacksPerPeriod(.1,30)).toBe(4);expect(photometerCallbacksPerPeriod(100,1)).toBe(100000);
  expect(requiredPhotometerCallbacks({secondsPerIntegration:1,integrations:3})).toBe(30);
  expect(requiredPhotometerCallbacks({secondsPerIntegration:1,integrations:3},50)).toBe(60);
 });
 it('source and sky means scale with BaseCount and 10^(−ΔBaseMag/−2.5) (callback 0x501506, Start 0x500976)',()=>{
  const base=buildPinnedPleiadesUbvField('object','V'),p={...COMPILED_PHOTOMETER_PARAMETERS,baseCount:2000};
  const doubled=buildPinnedPleiadesUbvField('object','V',undefined,10,0,p);
  expect(doubled.sourceMean).toBe(2*base.sourceMean);expect(doubled.skyMean).toBe(2*base.skyMean);
  const brighter=buildPinnedPleiadesUbvField('object','V',undefined,10,0,{...COMPILED_PHOTOMETER_PARAMETERS,baseMagnitude:7});
  expect(brighter.sourceMean).toBe(1000*magnitudeAmplitude(base.sourceMagnitude,photometerTelescope(0).zeroPoint+1));
  const sky=buildPinnedPleiadesUbvField('sky','V',undefined,10,0,{...COMPILED_PHOTOMETER_PARAMETERS,skyMagnitude:17});
  expect(sky.skyMagnitude).toBe(17);expect(sky.skyMean).toBeCloseTo(base.skyMean/Math.pow(10,.4),6);
 });
 it('the recomputed full-domain limits equal the contracts\' precomputed exclusions at the compiled values (every bundled target, 3 telescopes)',()=>{
  for(const tel of [0,1,2] as const)for(const t of photometerTelescopeTargets(tel))
   expect(photometerParameterExclusion(t.catalogId,tel,COMPILED_PHOTOMETER_PARAMETERS)).toBe(photometerFullDomainExclusion(t.catalogId,tel));
  // ten times the base count: more targets exceed the per-callback bound on the 4 m
  const tenfold={...COMPILED_PHOTOMETER_PARAMETERS,baseCount:10000};
  expect(photometerTelescopeTargets(2).filter(t=>photometerParameterExclusion(t.catalogId,2,tenfold)).length).toBeGreaterThan(photometerTelescopeTargets(2).filter(t=>photometerFullDomainExclusion(t.catalogId,2)).length);
 });
 it('refuses a base count below 1 and a timer outside 1..10000 ms [W]',()=>{
  expect(photometerParameterRefusal({...COMPILED_PHOTOMETER_PARAMETERS,baseCount:0})).toBe('base-count');
  expect(photometerParameterRefusal({...COMPILED_PHOTOMETER_PARAMETERS,timerMs:0})).toBe('timer');
  expect(photometerParameterRefusal(COMPILED_PHOTOMETER_PARAMETERS)).toBeNull();
 });
});

const run=(s:PhotometerState,events:readonly PhotometerEvent[])=>events.reduce(photometerEvent,s);
/** Sky then object V reading of the pinned target, 1 s × 1. */
function readings(parameters?:ReturnType<typeof photometerParametersOf>){
 let s=run(createPhotometer(42),[{type:'activate'},{type:'timing',secondsPerIntegration:1,integrations:1}]);
 if(parameters)s=photometerEvent(s,{type:'parameters',...parameters});
 const n=requiredPhotometerCallbacks({secondsPerIntegration:1,integrations:1},parameters?.timerMs);
 s=run(s,[{type:'start'},{type:'advance',callbacks:n},{type:'point',kind:'object'},{type:'start'},{type:'advance',callbacks:n}]);
 return s;
}
describe('Front T6 photometer journal',()=>{
 it('compiled values record no event and stay byte-identical (owner unchanged)',()=>{
  const plain=readings(),same=readings(COMPILED_PHOTOMETER_PARAMETERS);
  expect(same.events).toEqual(plain.events);expect(same.current).toEqual(plain.current);
  expect(serializePhotometerSession(releasePhotometer(same))).toBe(serializePhotometerSession(releasePhotometer(plain)));
  expect(plain.current!.parameters).toBeUndefined();
 });
 it('an instructor BaseCount and Timer change the counts as VIREO\'s formulas say and keep the magnitude scale',()=>{
  const plain=readings(),p={...COMPILED_PHOTOMETER_PARAMETERS,baseCount:4000,timerMs:50},s=readings(p);
  const a=plain.current!,b=s.current!;
  expect(b.parameters).toEqual(p);expect(b.integration!.callbacks).toBe(20);expect(b.callback.timerWaitMs).toBe(50);
  expect(b.callback.nativeBaseCountSum).toBe(20*4000);expect(a.callback.nativeBaseCountSum).toBe(10*1000);
  // 8× the mean photons (4× per callback, 2× the callbacks): the counts grow about eightfold
  expect(b.callback.totalPhotonCount/a.callback.totalPhotonCount).toBeGreaterThan(7);expect(b.callback.totalPhotonCount/a.callback.totalPhotonCount).toBeLessThan(9);
  // the base-count normalisation cancels it in the magnitude (both readings estimate the same V)
  expect(Math.abs(b.reduction!.magnitude!-a.reduction!.magnitude!)).toBeLessThan(.05);
 });
 it('a BaseMag change shifts the zero point and therefore the counts, not the reduced magnitude scale',()=>{
  const a=readings().current!,b=readings({...COMPILED_PHOTOMETER_PARAMETERS,baseMagnitude:7}).current!;
  expect(b.callback.totalPhotonCount/a.callback.totalPhotonCount).toBeGreaterThan(2.2);expect(b.callback.totalPhotonCount/a.callback.totalPhotonCount).toBeLessThan(2.8);
  expect(Math.abs(b.reduction!.magnitude!-a.reduction!.magnitude!)).toBeLessThan(.05);
 });
 it('owner 17 round trip, replay and E04 exclusion',()=>{
  const p={...COMPILED_PHOTOMETER_PARAMETERS,skyMagnitude:17},s=releasePhotometer(readings(p));
  expect(photometerJournalVersion(s.events)).toBe(17);
  const text=serializePhotometerSession(s),parsed=JSON.parse(text);
  expect(parsed.policy).toBe(INSTRUCTOR_PARAMETERS_PHOTOMETER_POLICY);
  expect(parsePhotometerSession(parsed)).toEqual(s);expect(replayPhotometer(42,s.events)).toEqual(s);
  const summary=pleiadesExerciseSummary(s,'bundled' as never);expect(summary.measuredTargets).toBe(0);
  // back to the compiled values: no parameters in the state, later readings certified
  const back=photometerEvent(readings(p),{type:'parameters',...COMPILED_PHOTOMETER_PARAMETERS});expect(back.parameters).toBeUndefined();
 });
 it('refuses a parameters event while running, before timing, and with a refused value',()=>{
  const timed=run(createPhotometer(42),[{type:'activate'},{type:'timing',secondsPerIntegration:1,integrations:1}]);
  expect(()=>photometerEvent(run(createPhotometer(42),[{type:'activate'}]),{type:'parameters',...COMPILED_PHOTOMETER_PARAMETERS,baseCount:5})).toThrow(/phase/);
  expect(()=>photometerEvent(photometerEvent(timed,{type:'start'}),{type:'parameters',...COMPILED_PHOTOMETER_PARAMETERS,baseCount:5})).toThrow(/phase/);
  expect(()=>photometerEvent(timed,{type:'parameters',...COMPILED_PHOTOMETER_PARAMETERS,baseCount:0})).toThrow(/event/);
  expect(()=>photometerEvent(timed,{type:'parameters',...COMPILED_PHOTOMETER_PARAMETERS,baseMagnitude:6.1})).toThrow(/event/);
 });
 it('refuses Start where the recomputed per-callback bound fails (a very bright zero point)',()=>{
  const timed=run(createPhotometer(42),[{type:'activate'},{type:'timing',secondsPerIntegration:1,integrations:1},{type:'parameters',...COMPILED_PHOTOMETER_PARAMETERS,baseMagnitude:30}]);
  expect(()=>photometerEvent(timed,{type:'start'})).toThrow(/parameters/);
 });
});
