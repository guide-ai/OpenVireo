import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 RADIO_OPTIONS_DFM_ORDER,RADIO_OPTIONS_FIELD_SPEC,RADIO_OPTIONS_NUMERIC_CONSTANTS,RADIO_OPTIONS_OK_ORDER,RADIO_OPTIONS_TEXT_MAX_LENGTH,formatRadioOptionsValue,
 isRadioOptionsFieldValue,isRadioOptionsNumberText,parseRadioOptionsField,radioOptionsFixedText,roundRadioOptionsInteger,type RadioOptionsNumberField,
} from './radioOptionsNumeric';

// Contract checks of the chosen web numeric policy (docs/RADIO-SIMULATION-OPTIONS.md, WEB-RSO-NUM-01..03, WEB-RSO-FMT-01).
// Synthetic texts only; these are not oracles for native StrToFloat, FloatToStrF or the x87 control word.
const K=RADIO_OPTIONS_NUMERIC_CONSTANTS;
/** binary64 bit pattern of a number, from a DataView (independent of the product's own conversions). */
const bits64=(v:number)=>{const d=new DataView(new ArrayBuffer(8));d.setFloat64(0,v);return d.getBigUint64(0);};
const fromBits32=(b:number)=>{const d=new DataView(new ArrayBuffer(4));d.setUint32(0,b);return d.getFloat32(0);};
const value=(field:RadioOptionsNumberField,text:string)=>{const r=parseRadioOptionsField(field,text);if(!r.ok)throw new Error(`${field} ${text}: ${r.reason}`);return r.value;};
const failure=(field:RadioOptionsNumberField,text:string)=>{const r=parseRadioOptionsField(field,text);return r.ok?null:{kind:r.kind,reason:r.reason};};

describe('typed constants (TYPED-LITERALS.json, radio-options-defaults-bounded.asm)',()=>{
 it('rounds the Extended literals once to the binary64 values the plan fixed',()=>{
  expect(bits64(K.degreesToRadians)).toBe(0x3F91DF46A2529D39n);
  expect(bits64(K.radiansToDegrees)).toBe(0x404CA5DC1A63C1F8n);
  expect(bits64(K.compiledHorizonRadians)).toBe(0x3FC657184AE74487n);
  // 10 × D2R in binary64 has the same bits, so an untouched OK keeps the compiled horizon (web policy, not native Extended).
  expect(bits64(10*K.degreesToRadians)).toBe(0x3FC657184AE74487n);
  expect(K.radiansToDegrees).toBe(57.29577951308232);expect(K.degreesToRadians).toBe(0.017453292519943295);
 });
 it('takes the Singles from their stored bits',()=>{
  expect(K.syncHostTrue).toBe(fromBits32(0x3f43d70a));expect(K.syncHostTrue).toBe(0.7649999856948853);
  expect(K.syncHostFalse).toBe(fromBits32(0x3f6b851f));expect(K.syncHostFalse).toBe(0.9200000166893005);
  expect([K.syncThreshold,K.gain,K.temperature]).toEqual([1,1,50]);
 });
 it('keeps the recovered OK order and DFM order apart and the FormActivate digits 1,int,int,5,int,2,int,2,1',()=>{
  expect(RADIO_OPTIONS_OK_ORDER).toEqual(['horizon90c','aperture916','baseSlew91a','soundSync91e','sampleRate922','gain924','background928','beamWidth92c','temperature930']);
  expect(RADIO_OPTIONS_DFM_ORDER).toEqual(['horizon90c','aperture916','baseSlew91a','background928','beamWidth92c','temperature930','gain924','soundSync91e','sampleRate922']);
  expect([...RADIO_OPTIONS_DFM_ORDER].sort()).toEqual([...RADIO_OPTIONS_OK_ORDER].sort());
  expect(RADIO_OPTIONS_OK_ORDER.map(f=>RADIO_OPTIONS_FIELD_SPEC[f].digits)).toEqual([1,null,null,5,null,2,null,2,1]);
  expect(RADIO_OPTIONS_OK_ORDER.map(f=>RADIO_OPTIONS_FIELD_SPEC[f].offset)).toEqual(['0x90c','0x916','0x91a','0x91e','0x922','0x924','0x928','0x92c','0x930']);
  expect(RADIO_OPTIONS_TEXT_MAX_LENGTH).toBe(64);
 });
});

describe('WEB-RSO-NUM-01 grammar',()=>{
 it('admits ASCII decimals with sign, "." and exponent only',()=>{
  for(const ok of ['0','+7','-1','5.','.5','-.5e-3','1.25E1','0e99999','1e-400','007'])expect(isRadioOptionsNumberText(ok),ok).toBe(true);
  for(const bad of [''," 5",'5 ','1,5','0x10','Infinity','-Infinity','NaN','1e','--1','１','.','+','e5','1e+','1_000','٣'])
   expect(failure('aperture916',bad),bad).toEqual({kind:'grammar',reason:'grammar'});
  for(const f of RADIO_OPTIONS_OK_ORDER)expect(failure(f,'1,5'),f).toEqual({kind:'grammar',reason:'grammar'});
 });
});

describe('WEB-RSO-NUM-02 integers: exact decimal, ties to even, Int64, low bits',()=>{
 const i32=(t:string)=>value('aperture916',t),w16=(t:string)=>value('sampleRate922',t);
 it('rounds halves to even on the exact decimal value',()=>{
  expect(['100','+7','-1'].map(i32)).toEqual([100,7,-1]);
  expect(['0.5','1.5','2.5','-1.5','-2.5','13.5','1.25E1','5.','.5'].map(i32)).toEqual([0,2,2,-2,-2,14,12,5,0]);
  expect(Object.is(i32('-0.5'),0)).toBe(true);expect(Object.is(i32('-0'),0)).toBe(true);
  expect(i32('0.5000000000000000000000000000000000000001')).toBe(1);// above the tie, decided exactly
 });
 it('stores the signed low 32 bits (a bit projection, not native range validation)',()=>{
  expect(['2147483648','4294967295','4294967296','4294967301','-2147483649'].map(i32)).toEqual([-2147483648,-1,0,5,2147483647]);
  expect(i32('9007199254740993')).toBe(1);// beyond binary64: the exact path, not Number(text)
  expect(i32('9223372036854775807')).toBe(-1);expect(i32('-9223372036854775808.5')).toBe(0);
  for(const f of ['baseSlew91a','background928'] as const)expect(value(f,'4294967301')).toBe(5);
 });
 it('refuses values outside Int64 as a web limit and decides large exponents by magnitude first',()=>{
  for(const t of ['9223372036854775807.5','9223372036854775808','9.3e18','-9223372036854775809','1e20','1e999999999999999999'])
   expect(failure('aperture916',t),t).toEqual({kind:'web-limit',reason:'int64-range'});
  expect(['1e-400','0e99999','0.0000e999999999999','0.09999'].map(i32)).toEqual([0,0,0,0]);
  expect(roundRadioOptionsInteger('-9223372036854775808')).toBe(-(2n**63n));expect(roundRadioOptionsInteger('9.223372036854775807e18')).toBe(2n**63n-1n);
  expect(()=>roundRadioOptionsInteger('x')).toThrow(TypeError);
 });
 it('stores the Word as its unsigned low 16 bits',()=>{
  expect(['65536','70000','-1','5512.5','5513.5','65535.5','5512'].map(w16)).toEqual([0,4464,65535,5512,5514,0,5512]);
 });
});

describe('WEB-RSO-NUM-03 Singles, Sound Sync and the horizon',()=>{
 const s=(t:string)=>value('gain924',t);
 it('rounds through binary64 to Single, keeping signed zero and subnormals',()=>{
  expect(s('0.1')).toBe(0.10000000149011612);expect(s('16777217')).toBe(16777216);expect(s('16777219')).toBe(16777220);
  expect(Object.is(s('-0'),-0)).toBe(true);expect(s('1e-45')).toBe(1.401298464324817e-45);expect(Object.is(s('1e-46'),0)).toBe(true);
  expect(s('3.4028234663852886e38')).toBe(fromBits32(0x7f7fffff));
  for(const t of ['3.5e38','-3.5e38'])expect(failure('beamWidth92c',t)).toEqual({kind:'web-limit',reason:'single-range'});
  expect(failure('temperature930','1e309')).toEqual({kind:'web-limit',reason:'binary64-range'});
 });
 it('clamps Sound Sync above Single 1.0 to 1.0 after the Single store; no lower clamp',()=>{
  const y=(t:string)=>value('soundSync91e',t);
  expect(['1.5','1','1.0000001','-5'].map(y)).toEqual([1,1,1,-5]);expect(Object.is(y('-0'),-0)).toBe(true);
  expect(y('1.00000001')).toBe(1);// rounds to Single 1.0 first, not clamped
  expect(failure('soundSync91e','3.5e38')).toEqual({kind:'web-limit',reason:'single-range'});
 });
 it('stores degrees × D2R in binary64; the largest finite text is admitted with fixed binary64 bits; degrees-range stays a defensive check that matters for stored values',()=>{
  expect(value('horizon90c','10')).toBe(K.compiledHorizonRadians);expect(value('horizon90c','-90')).toBe(-90*K.degreesToRadians);
  expect(failure('horizon90c','1e309')).toEqual({kind:'web-limit',reason:'binary64-range'});
  // Declared web binary64 golden from an independent IEEE binary64 computation (not the product expression), not a native
  // Extended/x87 oracle: MAX × D2R has bits 0x7F91DF46A2529D38, and its degree display is MAX − 1 ulp (0x7FEFFFFFFFFFFFFE), not MAX.
  const big='1.7976931348623157e308';expect(bits64(Number(big))).toBe(0x7FEFFFFFFFFFFFFFn);
  expect(parseRadioOptionsField('horizon90c',big)).toEqual({ok:true,value:3.1375664143845866e306});
  expect(bits64(value('horizon90c',big))).toBe(0x7F91DF46A2529D38n);expect(bits64(value('horizon90c','-'+big))).toBe(0xFF91DF46A2529D38n);
  expect(bits64(3.1375664143845866e306*K.radiansToDegrees)).toBe(0x7FEFFFFFFFFFFFFEn);
  expect(formatRadioOptionsValue('horizon90c',3.1375664143845866e306)).toBe('1.79769313486231551e+308');
  // This input does not reach degrees-range (no claim that no text does). The same finite-degrees domain refuses a stored MAX.
  expect(isRadioOptionsFieldValue('horizon90c',3.1375664143845866e306)).toBe(true);expect(isRadioOptionsFieldValue('horizon90c',Number.MAX_VALUE)).toBe(false);
 });
});

describe('WEB-RSO-FMT-01 display and admission',()=>{
 it('formats fixed text with ties away from zero on the binary value and an exponent form from 1e18',()=>{
  expect(radioOptionsFixedText(1,2)).toBe('1.00');expect(radioOptionsFixedText(0.125,2)).toBe('0.13');expect(radioOptionsFixedText(-0.125,2)).toBe('-0.13');
  expect(radioOptionsFixedText(-0,2)).toBe('0.00');expect(radioOptionsFixedText(1e18,2)).toBe('1.00000000000000000e+18');
  expect(radioOptionsFixedText(fromBits32(0x7f7fffff),2)).toBe('3.40282346638528860e+38');
  expect(formatRadioOptionsValue('soundSync91e',K.syncHostTrue)).toBe('0.76500');expect(formatRadioOptionsValue('soundSync91e',K.syncHostFalse)).toBe('0.92000');
  expect(formatRadioOptionsValue('sampleRate922',65535)).toBe('65535');expect(formatRadioOptionsValue('aperture916',-2147483648)).toBe('-2147483648');
  expect(formatRadioOptionsValue('horizon90c',K.compiledHorizonRadians)).toBe('10.0');
 });
 it('re-parses every compiled value to identical bits, and the exponent form re-parses too',()=>{
  const compiled:Record<RadioOptionsNumberField,number>={horizon90c:K.compiledHorizonRadians,aperture916:100,baseSlew91a:50,soundSync91e:K.syncHostTrue,sampleRate922:5512,
   gain924:1,background928:5,beamWidth92c:0,temperature930:50};
  for(const f of RADIO_OPTIONS_OK_ORDER)expect(bits64(value(f,formatRadioOptionsValue(f,compiled[f]))),f).toBe(bits64(compiled[f]));
  expect(value('soundSync91e',formatRadioOptionsValue('soundSync91e',K.syncHostFalse))).toBe(K.syncHostFalse);
  const max=fromBits32(0x7f7fffff);expect(value('gain924',formatRadioOptionsValue('gain924',max))).toBe(max);
  // A lossy round trip is the declared display policy: fround(0.123) shows as 0.12.
  expect(value('beamWidth92c',formatRadioOptionsValue('beamWidth92c',Math.fround(0.123)))).toBe(Math.fround(0.12));
 });
 it('admits stored values per storage domain',()=>{
  expect(isRadioOptionsFieldValue('aperture916',2147483647)).toBe(true);
  for(const bad of [2147483648,1.5,-0,Number.NaN,'1'])expect(isRadioOptionsFieldValue('aperture916',bad),String(bad)).toBe(false);
  expect(isRadioOptionsFieldValue('sampleRate922',65535)).toBe(true);expect(isRadioOptionsFieldValue('sampleRate922',-1)).toBe(false);
  expect(isRadioOptionsFieldValue('gain924',Math.fround(0.1))).toBe(true);expect(isRadioOptionsFieldValue('gain924',0.1)).toBe(false);
  expect(isRadioOptionsFieldValue('gain924',Infinity)).toBe(false);expect(isRadioOptionsFieldValue('horizon90c',0.1)).toBe(true);
  expect(()=>formatRadioOptionsValue('gain924',0.1)).toThrow(TypeError);
 });
});

describe('isolation',()=>{
 it('imports nothing',()=>{
  const source=readFileSync(new URL('./radioOptionsNumeric.ts',import.meta.url),'utf8');
  expect(source).not.toMatch(/^import\b/m);expect(source).not.toMatch(/\brequire\(|\bimport\(/);
  expect(source).not.toMatch(/Math\.PI/);
 });
});
