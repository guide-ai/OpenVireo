import {parseDelphiFloat,roundHalfEven} from './radioAntenna';
import {delphiFixed} from './variableStars';
import {x87PhotometerCallbacksPerPeriod} from './photometerCallbackCount';
/** Front T6 (analysis/front-plans/front-teacher.md §T6; analysis/front-teacher/t6/RECOVERY.md): the instructor options dialog's
 * Photometer and Spectrometer parameter edits. CLEA_VEO.exe 781bc970…c54c, static reading only.
 * - [D] The edits and their record fields (OKBtnClick 0x5a6068, field table of TOptionsDlg's VMT, Single stores `fstp dword`,
 *   Integer stores `call 0x403700` (System.Round: FISTP with the default control word, round half to even) then `mov dword`):
 *   Photometer tab BaseMagEd (+0x3e4) → record+0x250c Single (0x5a63ff), SkyMagEd (+0x3e8) → +0x2510 Single (0x5a641f),
 *   BaseCountEd (+0x3ec) → +0x279f Integer (0x5a64a4), PhoTimerEd (+0x3f0) → +0x27a3 Integer (0x5a64f2); Spectrometer tab
 *   SpSkyEd (+0x420) → +0x2514 Single (0x5a643f), SpBaseEd (+0x424) → +0x27a7 Integer (0x5a64c8), SpTimerEd (+0x428) → +0x27ab
 *   Integer (0x5a651c). env offset = record offset + 0x6b4. FndrMagEd ("Finder Mag Limit", +0x2504) is on the General tab
 *   (DFM 0x20a647), so it belongs to Front T8, not here.
 * - [D] Every parameter edit goes through StrToFloat 0x40cf60 inside one try (0x5a62da..0x5a6968) in this order: SlwTmr,
 *   FldFctr, Horz, FndrFld, FndrMag, InstFld, BaseMag, SkyMag, SpSky, MinLmda, MaxLmda, BaseCount, SpBase, PhoTimer, SpTimer,
 *   then the CCD and IR edits. Its one handler (0x5a696a → 0x40555c, class EConvertError at 0x409c60) shows
 *   "Numeric Conversion Error!\r\n\r\nVerify Values of Numeric Parameters." (0x5a6bac) with caption "Non-Numeric Value!"
 *   (0x5a6bf0), MB_ICONHAND (0x10), sets ModalResult (+0x294) := 0 so the dialog stays open, and leaves OKBtnClick
 *   (0x5a69b5 → 0x5a6b53, skipping the Lab Table Number and password). No SetFocus: focus stays where it was.
 * - [D] The fields before the failing edit are already stored in the live record (ebx = [0x61fefc]^ + 4), but Preferences1Click
 *   copies the record into env only on OK (0x588737) and Cancel restores the dialog's snapshot dlg+0x5a0 (0x5a6d04), so after a
 *   conversion error nothing reaches the instruments unless OK later succeeds [I]. The web commits nothing on an error.
 * - [D] Display: FormActivate 0x5a56e0 writes FloatToStrF(Single, ffFixed, 18, d) through 0x486268 (d = 1 for BaseMag
 *   0x5a57cd, 2 for SkyMag 0x5a57f2 and SpSky 0x5a5817) and IntToStr 0x40ac14 for the four Integers (0x5a58c0..0x5a5914). So a Single
 *   reopened and OK'd again is stored at its display digits, in VIREO and here.
 * - [D] Compiled defaults 0x5a21d0: BaseMag 6.0 (0x5a2a00), SkyMag 16.0 (0x5a2a0a), SpSky 19.0 (0x5a2a14), BaseCount 1000
 *   (0x5a2a88), PhoTimer 100 (0x5a2a92), SpBase 50 (0x5a2a9c), SpTimer 1 (0x5a2aa6).
 * - [W] WEB-T6-01: StrToFloat is the project's web grammar parseDelphiFloat ('.' separator, exponent of at most two digits, so
 *   every accepted text is a finite binary64; VIREO parses into Extended and uses the host DecimalSeparator). A text whose Single
 *   overflows (VIREO: an unhandled EOverflow from `fstp dword`) or whose rounded Integer leaves Int32 (VIREO: the low 32 bits of
 *   the Int64, or EInvalidOp beyond 2^63) gets the same "Non-Numeric Value!" box instead.
 * Pure: no React, storage or network. */

export type InstrumentParameters=Readonly<{
 /** Photometer tab, BaseMagEd: record+0x250c Single (also the spectrometers' zero point, through TObsrvtry+0x6f0). */
 baseMagnitude:number;
 /** Photometer tab, SkyMagEd: record+0x2510 Single (photometer sky V). */
 skyMagnitude:number;
 /** Photometer tab, BaseCountEd: record+0x279f Integer (photometer base photon count per callback). */
 baseCount:number;
 /** Photometer tab, PhoTimerEd: record+0x27a3 Integer (photometer timer interval, ms). */
 photometerTimerMs:number;
 /** Spectrometer tab, SpSkyEd: record+0x2514 Single (spectrometer sky V). */
 spectrometerSkyMagnitude:number;
 /** Spectrometer tab, SpBaseEd: record+0x27a7 Integer (spectrometer base count, the per-ms multiplier). */
 spectrometerBaseCount:number;
 /** Spectrometer tab, SpTimerEd: record+0x27ab Integer (spectrometer timer interval, ms). */
 spectrometerTimerMs:number;
}>;
export type InstrumentParameterKey=keyof InstrumentParameters;
export type InstrumentParameterField=Readonly<{key:InstrumentParameterKey;tab:'photometer'|'spectrometer';control:string;formField:string;
 caption:string;hint:string;record:string;env:string;type:'single'|'integer';digits:1|2|null;compiled:number;
 store:string;display:string;defaults:string;dfm:string}>;
const f=(x:InstrumentParameterField)=>Object.freeze(x);
/** [D] In VIREO's OK order (0x5a63e6, 0x5a6406, 0x5a6426, 0x5a6486, 0x5a64aa, 0x5a64ce, 0x5a64f8). Captions are the TLabel
 * captions of each tab's ParmGrp, hints the edits' Hint (DFM file offsets of the edit names). */
export const INSTRUMENT_PARAMETER_FIELDS:readonly InstrumentParameterField[]=Object.freeze([
 f({key:'baseMagnitude',tab:'photometer',control:'BaseMagEd',formField:'+0x3e4',caption:'Base Magnitude (V)',hint:'Base V magnitude for photometry & spectroscopy.',record:'+0x250c',env:'+0x2bc0',type:'single',digits:1,compiled:6,store:'0x5a63ff',display:'0x5a57bd',defaults:'0x5a2a00',dfm:'0x20b52e'}),
 f({key:'skyMagnitude',tab:'photometer',control:'SkyMagEd',formField:'+0x3e8',caption:'Sky Magnitude (V)',hint:'Sky V magnitude for photometry.',record:'+0x2510',env:'+0x2bc4',type:'single',digits:2,compiled:16,store:'0x5a641f',display:'0x5a57e2',defaults:'0x5a2a0a',dfm:'0x20b5c3'}),
 f({key:'spectrometerSkyMagnitude',tab:'spectrometer',control:'SpSkyEd',formField:'+0x420',caption:'Sky Magnitude (V)',hint:'Sky V magnitude for spectroscopy.',record:'+0x2514',env:'+0x2bc8',type:'single',digits:2,compiled:19,store:'0x5a643f',display:'0x5a5807',defaults:'0x5a2a14',dfm:'0x20bc4f'}),
 f({key:'baseCount',tab:'photometer',control:'BaseCountEd',formField:'+0x3ec',caption:'Base Photon Count',hint:'Count for base magnitude.',record:'+0x279f',env:'+0x2e53',type:'integer',digits:null,compiled:1000,store:'0x5a64a4',display:'0x5a58ba',defaults:'0x5a2a88',dfm:'0x20b647'}),
 f({key:'spectrometerBaseCount',tab:'spectrometer',control:'SpBaseEd',formField:'+0x424',caption:'Base Photon Count',hint:'Count for base magnitude.',record:'+0x27a7',env:'+0x2e5b',type:'integer',digits:null,compiled:50,store:'0x5a64c8',display:'0x5a58f2',defaults:'0x5a2a9c',dfm:'0x20bcd4'}),
 f({key:'photometerTimerMs',tab:'photometer',control:'PhoTimerEd',formField:'+0x3f0',caption:'Timer Wait (ms)',hint:'Photometer time interval in milliseconds.',record:'+0x27a3',env:'+0x2e57',type:'integer',digits:null,compiled:100,store:'0x5a64f2',display:'0x5a58d6',defaults:'0x5a2a92',dfm:'0x20b6c8'}),
 f({key:'spectrometerTimerMs',tab:'spectrometer',control:'SpTimerEd',formField:'+0x428',caption:'Timer Wait (ms)',hint:'Spectrometer time interval in milliseconds.',record:'+0x27ab',env:'+0x2e5f',type:'integer',digits:null,compiled:1,store:'0x5a651c',display:'0x5a590e',defaults:'0x5a2aa6',dfm:'0x20bd52'}),
]);
export const INSTRUMENT_PARAMETER_KEYS=Object.freeze(INSTRUMENT_PARAMETER_FIELDS.map(x=>x.key));
const FIELD=new Map(INSTRUMENT_PARAMETER_FIELDS.map(x=>[x.key,x]));
export const instrumentParameterField=(k:InstrumentParameterKey)=>FIELD.get(k)!;
/** [D] The defaults routine 0x5a21d0. */
export const COMPILED_INSTRUMENT_PARAMETERS:InstrumentParameters=Object.freeze(Object.fromEntries(INSTRUMENT_PARAMETER_FIELDS.map(x=>[x.key,x.compiled])) as InstrumentParameters);
/** [D] The OK handler's box (0x5a6bac text, 0x5a6bf0 caption, flags 0x10). */
export const PARAMETER_ERROR_BOX=Object.freeze({text:'Numeric Conversion Error!\r\n\r\nVerify Values of Numeric Parameters.',caption:'Non-Numeric Value!',flags:0x10});
export const INSTRUMENT_PARAMETER_TEXT_MAX=32;

/** Whether a value is one OK can store: a Single (finite, float32-exact) or an Int32. */
export function validParameterValue(k:InstrumentParameterKey,v:unknown):v is number{
 const x=FIELD.get(k);if(!x||typeof v!=='number'||!Number.isFinite(v))return false;
 return x.type==='single'?Object.is(Math.fround(v),v)&&!Object.is(v,-0):Number.isInteger(v)&&v>=-0x8000_0000&&v<=0x7fff_ffff&&!Object.is(v,-0);
}
export function readInstrumentParameters(value:unknown):InstrumentParameters{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid instrument parameters');
 const o=value as Record<string,unknown>;
 if(Object.keys(o).length!==INSTRUMENT_PARAMETER_KEYS.length||!INSTRUMENT_PARAMETER_KEYS.every(k=>validParameterValue(k,o[k])))throw new TypeError('Invalid instrument parameters');
 return Object.freeze(Object.fromEntries(INSTRUMENT_PARAMETER_KEYS.map(k=>[k,o[k]])) as InstrumentParameters);
}
/** FormActivate's text for one field (0x486268 ffFixed 18 / IntToStr). */
export function instrumentParameterText(k:InstrumentParameterKey,v:number):string{
 const x=FIELD.get(k);if(!x||!validParameterValue(k,v))throw new TypeError('Invalid instrument parameter');
 return x.type==='single'?delphiFixed(v,x.digits!):String(v);
}
export const instrumentParameterTexts=(p:InstrumentParameters):Readonly<Record<InstrumentParameterKey,string>>=>
 Object.freeze(Object.fromEntries(INSTRUMENT_PARAMETER_KEYS.map(k=>[k,instrumentParameterText(k,p[k])])) as Record<InstrumentParameterKey,string>);

/** One edit's OK conversion: StrToFloat, then `fstp dword` (Single) or Round (Integer); null where VIREO raises. */
export function convertParameterText(k:InstrumentParameterKey,text:string):number|null{
 const x=FIELD.get(k);if(!x||typeof text!=='string'||text.length>INSTRUMENT_PARAMETER_TEXT_MAX)return null;
 const v=parseDelphiFloat(text);if(v===null)return null;
 const r=x.type==='single'?Math.fround(v):roundHalfEven(v);
 const out=r===0?0:r;// -0 stores as 0 (both bit patterns read back as 0 in every consumer; the web keeps one)
 return validParameterValue(k,out)?out:null;
}
export type ParameterOk=Readonly<{ok:true;values:InstrumentParameters}|{ok:false;key:InstrumentParameterKey;box:typeof PARAMETER_ERROR_BOX}>;
/** OKBtnClick's parameter block for these seven edits, in VIREO's order; the first failure stops it (the box, no commit). */
export function applyParameterTexts(texts:Readonly<Record<InstrumentParameterKey,string>>):ParameterOk{
 const out:Partial<Record<InstrumentParameterKey,number>>={};
 for(const x of INSTRUMENT_PARAMETER_FIELDS){const v=convertParameterText(x.key,texts[x.key]);if(v===null)return Object.freeze({ok:false,key:x.key,box:PARAMETER_ERROR_BOX});out[x.key]=v;}
 return Object.freeze({ok:true,values:Object.freeze(out as InstrumentParameters)});
}

/** The fields whose value differs from the compiled one (empty: every result is the certified compiled one). */
export function uncertifiedParameterKeys(p:InstrumentParameters):readonly InstrumentParameterKey[]{
 return Object.freeze(INSTRUMENT_PARAMETER_KEYS.filter(k=>!Object.is(p[k],COMPILED_INSTRUMENT_PARAMETERS[k])));
}
export const isCompiledParameters=(p:InstrumentParameters)=>uncertifiedParameterKeys(p).length===0;

// ---- Photometer ----
/** What the photometer reads: BaseMag (TObsrvtry 0x53df4f → +0x6f0, Start 0x500976 adds 5), SkyMag (FormShow 0x4ff6aa), BaseCount
 * (callback 0x501506 / 0x501582) and Timer Wait (Start 0x500a01 / 0x500a43). */
export type PhotometerParameters=Readonly<{baseMagnitude:number;skyMagnitude:number;baseCount:number;timerMs:number}>;
export const photometerParametersOf=(p:InstrumentParameters):PhotometerParameters=>Object.freeze({baseMagnitude:p.baseMagnitude,skyMagnitude:p.skyMagnitude,baseCount:p.baseCount,timerMs:p.photometerTimerMs});
export const COMPILED_PHOTOMETER_PARAMETERS=photometerParametersOf(COMPILED_INSTRUMENT_PARAMETERS);
export const isCompiledPhotometerParameters=(p:PhotometerParameters)=>Object.is(p.baseMagnitude,6)&&Object.is(p.skyMagnitude,16)&&p.baseCount===1000&&p.timerMs===100;
/** [W] WEB-T6-02: the photometer domain the web measures with an uncertified parameter. A base count below 1 (VIREO would draw
 * from a zero or negative mean) or a timer outside 1..10000 ms (0 stops VIREO's TTimer; a negative Integer is a huge Cardinal
 * interval) is refused; so is a Single magnitude whose amplitude 10^((m − zp)/−2.5) would not be a finite positive number. */
export const PHOTOMETER_PARAMETER_DOMAIN=Object.freeze({minimumBaseCount:1,minimumTimerMs:1,maximumTimerMs:10000,maximumMagnitude:100});
export function readPhotometerParameters(value:unknown):PhotometerParameters{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid photometer parameters');
 const o=value as Record<string,unknown>,keys=['baseMagnitude','skyMagnitude','baseCount','timerMs'];
 if(Object.keys(o).length!==4||!keys.every(k=>Object.hasOwn(o,k)))throw new TypeError('Invalid photometer parameters');
 const p={baseMagnitude:o.baseMagnitude,skyMagnitude:o.skyMagnitude,baseCount:o.baseCount,timerMs:o.timerMs};
 if(!validParameterValue('baseMagnitude',p.baseMagnitude)||!validParameterValue('skyMagnitude',p.skyMagnitude)||!validParameterValue('baseCount',p.baseCount)||!validParameterValue('photometerTimerMs',p.timerMs))throw new TypeError('Invalid photometer parameters');
 return Object.freeze(p as PhotometerParameters);
}
/** Why the web cannot measure with these photometer parameters (null: it can). */
export function photometerParameterRefusal(p:PhotometerParameters):'base-count'|'timer'|'magnitude'|null{
 const d=PHOTOMETER_PARAMETER_DOMAIN;
 if(p.baseCount<d.minimumBaseCount)return 'base-count';
 if(p.timerMs<d.minimumTimerMs||p.timerMs>d.maximumTimerMs)return 'timer';
 if(Math.abs(p.baseMagnitude)>d.maximumMagnitude||Math.abs(p.skyMagnitude)>d.maximumMagnitude)return 'magnitude';
 return null;
}
/** [D] Callbacks per integration period. Start 0x500a01 stores the Extended increment Timer/1000 (Single 1000.0 at 0x500ac8); each
 * callback adds it to the period's Extended elapsed +0x48e (rounded at each add, control word 0x1332) and 0x5015cb ends the period
 * once elapsed reaches the chosen seconds. `exact` (Front PHCALLBACK, owner 18): that count, x87PhotometerCallbacksPerPeriod, which
 * is ⌈1000·seconds / Timer⌉ except at 18 tie pairs (the compiled 100 s at 100 ms among them: 1001), where it is one more
 * (data/photometry/callback-count-contract.json). Otherwise the legacy nominal count ⌈1000·seconds / Timer⌉ of owners 4–17. */
export function photometerCallbacksPerPeriod(secondsPerIntegration:number,timerMs:number,exact=false):number{
 const ms=Math.round(secondsPerIntegration*1000);
 if(!Number.isSafeInteger(ms)||ms<=0||Math.abs(ms-secondsPerIntegration*1000)>1e-9||!Number.isSafeInteger(timerMs)||timerMs<1)throw new RangeError('photometer timing');
 return exact?x87PhotometerCallbacksPerPeriod(secondsPerIntegration,timerMs):Math.ceil(ms/timerMs);
}
/** [D] Sky colours from SkyMag (FormShow 0x4ff6aa..0x4ff706): V = Single, B = V + Single 1.0 (0x4ff864), U = B + Extended 0.33
 * (0x4ff868), R = V − 1.0, I = R − 0.33 (Front P2). `bv` and `ub` are the contract's literals. */
export function photometerSkyBands(skyMagnitude:number,bv:number,ub:number){
 const v=Math.fround(skyMagnitude);return Object.freeze({V:v,B:v+bv,U:(v+bv)+ub,R:v-bv,I:(v-bv)-ub});
}

// ---- Spectrometer ----
/** What the single-slit spectrometer reads: BaseMag (zero point, 0x50e12f/0x50e173/0x50e1b7/0x50e24c), SpSky (sky amplitude
 * 0x50e23f), SpBase (the per-ms multiplier of the timer 0x50f7b2) and SpTimer, TSpectrometer's TTimer interval (0x50f5f2 →
 * 0x449004). The counts are SpBase × the cumulative GetTickCount delta (0x50f797..0x50f7b8), so the sum of a tick's draws is one
 * Poisson of the whole interval; but the S/N pause (√(total/600) > 1000, exposure.ts) is tested once per tick, so VIREO overshoots
 * it by up to one SpTimer interval of photons (review 1 M1). The web ticks the generic route every max(100, SpTimer) ms, with the
 * test at the end of each tick (VIREO's granularity from 100 to 500 ms; [W] below 100 ms VIREO ticks at max(SpTimer, ≈15.6 ms) [I]), and records a non-default SpTimer in the policy; its domain stops at 500 ms so a tick stays within
 * the journal's 1000-ms bound (MAX_JOURNAL_TICK_MS), on which the 2³⁰ admission argument rests. */
export type SpectrometerParameters=Readonly<{baseMagnitude:number;skyMagnitude:number;baseCount:number;timerMs:number}>;
export const spectrometerParametersOf=(p:InstrumentParameters):SpectrometerParameters=>Object.freeze({baseMagnitude:p.baseMagnitude,skyMagnitude:p.spectrometerSkyMagnitude,baseCount:p.spectrometerBaseCount,timerMs:p.spectrometerTimerMs});
export const COMPILED_SPECTROMETER_PARAMETERS=spectrometerParametersOf(COMPILED_INSTRUMENT_PARAMETERS);
export const isCompiledSpectrometerParameters=(p:SpectrometerParameters)=>Object.is(p.baseMagnitude,6)&&Object.is(p.skyMagnitude,19)&&p.baseCount===50&&p.timerMs===1;
/** The browser tick of the generic route: the compiled 1 ms keeps the web's 100 ms interval [W]; a longer SpTimer is VIREO's. */
export const spectrometerTickMs=(p:SpectrometerParameters)=>Math.max(100,p.timerMs);
/** [W] WEB-T6-03: the generic spectrometer measures with SpBase 1..2^20, SpTimer 1..500 ms and magnitudes within ±100. */
export const SPECTROMETER_PARAMETER_DOMAIN=Object.freeze({minimumBaseCount:1,maximumBaseCount:1<<20,minimumTimerMs:1,maximumTimerMs:500,maximumMagnitude:100});
export function spectrometerParameterRefusal(p:SpectrometerParameters):'base-count'|'timer'|'magnitude'|null{
 const d=SPECTROMETER_PARAMETER_DOMAIN;
 if(p.baseCount<d.minimumBaseCount||p.baseCount>d.maximumBaseCount)return 'base-count';
 if(p.timerMs<d.minimumTimerMs||p.timerMs>d.maximumTimerMs)return 'timer';
 if(Math.abs(p.baseMagnitude)>d.maximumMagnitude||Math.abs(p.skyMagnitude)>d.maximumMagnitude)return 'magnitude';
 return null;
}
/** The route-level gate. 'generic': the observatory spectrometer (FieldSpectrometer), which measures with uncertified values
 * (labelled). 'exercise': the Hubble, LSS, Object X, stellar classification and sky routes, and 'multispec': Multi-Spec, whose
 * witnesses were computed with the compiled values; any non-default value that reaches them (BaseMag, SpSky, SpBase, SpTimer: the
 * S/N pause granularity on TSpectrometer, the rate divisor 0x52728a / 0x52a526 on Multi-Spec) refuses them. */
export function spectrometerRouteRefusal(p:InstrumentParameters,route:'generic'|'exercise'|'multispec'):readonly InstrumentParameterKey[]{
 const keys:InstrumentParameterKey[]=['baseMagnitude','spectrometerSkyMagnitude','spectrometerBaseCount','spectrometerTimerMs'];
 if(route==='generic')return Object.freeze([]);
 return Object.freeze(keys.filter(k=>!Object.is(p[k],COMPILED_INSTRUMENT_PARAMETERS[k])));
}
/** The policy suffix of a generic-route exposure taken with uncertified spectrometer parameters:
 * `#P<base>,<sky>,<count>,<timer>` (the exact binary64 spellings); none for the compiled values, so every earlier policy is unchanged. */
export function spectrometerPolicySuffix(p:SpectrometerParameters):string{
 return isCompiledSpectrometerParameters(p)?'':`#P${p.baseMagnitude},${p.skyMagnitude},${p.baseCount},${p.timerMs}`;
}
export function parseSpectrometerPolicySuffix(policy:string):Readonly<{base:string;parameters:SpectrometerParameters}>|null{
 const m=/^(.*)#P([^,#]+),([^,#]+),([^,#]+),([^,#]+)$/.exec(policy);
 if(!m)return policy.includes('#P')?null:Object.freeze({base:policy,parameters:COMPILED_SPECTROMETER_PARAMETERS});
 const p=Object.freeze({baseMagnitude:Number(m[2]),skyMagnitude:Number(m[3]),baseCount:Number(m[4]),timerMs:Number(m[5])});
 if(!validParameterValue('baseMagnitude',p.baseMagnitude)||!validParameterValue('spectrometerSkyMagnitude',p.skyMagnitude)||!validParameterValue('spectrometerBaseCount',p.baseCount)||!validParameterValue('spectrometerTimerMs',p.timerMs)||isCompiledSpectrometerParameters(p)||spectrometerParameterRefusal(p))return null;
 return spectrometerPolicySuffix(p)===`#P${m[2]},${m[3]},${m[4]},${m[5]}`?Object.freeze({base:m[1],parameters:p}):null;
}
/** Review 1 L1: a field named as the dialog shows it, `<tab> › <caption>` (both tabs have a Sky Magnitude and a Timer Wait). */
export const instrumentParameterLabel=(k:InstrumentParameterKey)=>{const f=FIELD.get(k)!;return `${f.tab==='photometer'?'Photometer':'Spectrometer'} › ${f.caption}`;};
