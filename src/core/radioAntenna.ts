/** I06 antenna/control-panel slice: TRadioLab (VMT 0x563a08) Tracking, Slew Rate,
 * Slew ▸ Set Coordinates… with TSkyCoordsDlg (VMT 0x4f2e88), the programmed
 * SlewTimer2 slew and its stop/cancel path, recovered statically from VIREO 1.504
 * CLEA_VEO.exe (SHA-256 781bc970…c54c). Contract IDs RA-01…RA-14 are listed in
 * docs/RADIO-ANTENNA-PROVENANCE.json; docs/RADIO-ANTENNA.md lists the gates.
 *
 * Pure state only: no React, clock, RNG, catalog, beam, receiver or signal.
 * Numbers are binary64. Native Extended (x87) arithmetic, Delphi StrToFloat
 * accumulation and FloatToStrF decimal conversion are not reproduced bit for bit.
 * Coordinate entry is evaluated exactly and admitted only inside an explicit web
 * domain (SKY_COORDS_WEB_DOMAIN); entries outside it are refused, not approximated.
 * ClockTimerTimer (0x5654a8) is not modelled: while tracking is off and no slew is
 * running, the original RA readout drifts with sidereal time; here it stays fixed. */

/** Extended (80-bit) constant from its 64-bit significand and biased exponent, rounded once to binary64. */
const ext=(significand:bigint,biasedExponent:number)=>Number(significand)*2**(biasedExponent-16383-63);

/** Original operands. Addresses name the instruction or data cell; see RA-* contracts for the decoding route. */
export const RADIO_LAB_CONSTANTS=Object.freeze({
 /** TSkyCoordsDlg.OKBtnClick Single operands 0x4f3804/0x4f3808 (minutes, seconds). */
 minutesPerUnit:60,secondsPerUnit:3600,
 /** Range Singles 0x4f380c/0x4f3810 (RA hours) and 0x4f384c/0x4f3850 (Dec degrees), inclusive. */
 raMinHours:0,raMaxHours:24,decMinDegrees:-90,decMaxDegrees:90,
 /** RateSpin: Power(Single 10.0 pushed as 0x41200000, index − 3) × options rate base (0x5667bc..0x5667e9). */
 rateBase10:10,rateIndexOffset:3,
 /** Slew start 0x566f8a: Dec step = rate × Extended 0x5673fc (≈1/3600, arcsec → degrees). */
 decStepPerRate:ext(0x91a2b3c4d5e6f809n,0x3ff3),
 /** SlewTimer2 0x5674ff..0x56750f: RA step = Sign × rate × Extended 0x5678dc (≈1/3600) / Single 0x5678e8 (15). */
 raStepPerRate:ext(0x91a2b3c4d5e6f809n,0x3ff3),raStepDivisor:15,
 /** SlewTimer2 Singles 0x5678c8 (12 h half turn) and 0x5678cc (0 h window start). */
 halfTurnHours:12,arrivalWindowStartHours:0,
 /** SlewTimer2 Extended 0x5678d0 (≈1e-5 h): an initial RA separation within it finishes the axis without snapping. */
 initialRaToleranceHours:ext(0xa7c5ac471b478423n,0x3fee),
 /** FormActivate Extended 0x564d60 (≈180/π) converting the latitude option to the initial Dec. */
 radiansToDegrees:ext(0xe52ee0d31e0fbdc3n,0x4004),
 /** First FormActivate 0x5649ee: rate index 4. */
 initialRateIndex:4,
 /** RateSpinDownClick 0x566854: the index never drops below 1. */
 minRateIndex:1,
 /** DFM SlewTimer2.Interval (ms). Native Windows timer delivery is not reproduced. */
 slewTimerIntervalMs:100,
});

/** DFM captions decoded from RCDATA TRADIOLAB (SHA-256 b87302b1…8288) and TSKYCOORDSDLG
 * (SHA-256 d22f2098…76d0). Original labels; never translated. '&' marks VCL accelerators. */
export const RADIO_LAB_CAPTIONS=Object.freeze({
 form:'VIREO Radio Telescope Control Panel',slewMenu:'&Slew',setCoordinates:'Set Coordinates...',tracking:'Tracking',receiver:'Receiver',
 slewRate:'Slew Rate',ra:'Right Ascension',dec:'Declination',hours:'Hrs',minutes:'Mins',seconds:'Secs',degrees:'Degs',
 north:'N',south:'S',east:'E',west:'W',
});
export const SKY_COORDS_CAPTIONS=Object.freeze({
 form:' Enter Sky Coordinates for Slew',raGroup:'Right Ascension',hours:'Hours',minutes:'Mins',seconds:'Secs',
 decGroup:'Declination',degrees:'Degs',arcminutes:"' ",arcseconds:'" ',epochGroup:'Epoch of Input Coordinates',
 epochs:Object.freeze(['J2000.0','B1950.0'] as const),ok:'&OK',cancel:'&Cancel',
});

/** Radio options read by TRadioLab from TEnvironment1 (record copied to env+0x2e95 at 0x587a20..0x587a36). */
export type RadioLabOptions=Readonly<{
 /** env+0x37cd = 1 (record+0x938): meridian transit instrument. */
 transitTelescope:boolean;
 /** env+0x37cf ≠ 0 (record+0x93a): enforce the altitude limit 0x5668e0, which needs sidereal time. */
 limitsEnabled:boolean;
 /** env+0x37d0 byte (record+0x93b): highest slew-rate index; programmed slews raise the index to it. */
 maxRateIndex:number;
 /** env+0x37af Integer (record+0x91a): rate multiplier, arcsec per SlewTimer2 callback at index 3. */
 rateBase:number;
 /** env+0x37d5 ≠ 0 (record+0x940): jump to the target without SlewTimer2. */
 instantSlew:boolean;
 /** env+0x3793 Extended (record+0x8fe): site latitude in radians; FormActivate points Dec there. */
 latitudeRadians:number;
}>;
/** RA-03: compiled defaults 0x5a8ec4 (immediates 0x5a8f8a..0x5a90ad). Loader 0x5a802c applies them only when
 * no options file loads (0x5a829c fails on both paths); the supplied distribution contains no VEO_OPTS.INI.
 * An instructor file or TRadioOptsDlg may change every value; those owners are not recovered. */
export const RADIO_COMPILED_OPTIONS:RadioLabOptions=Object.freeze({
 transitTelescope:false,limitsEnabled:false,maxRateIndex:5,rateBase:50,instantSlew:false,
 latitudeRadians:ext(0xabb4f69dea5afff7n,0x3ffe),
});
/** RA-03: compiled defaults for inputs of the main-window slice (radioControl.ts): Integer env+0x37ab
 * (record+0x916 = 100) and byte env+0x2e84 (options record A +0x27d0 = 0, written at 0x5a2afd). */
export const RADIO_COMPILED_ENVIRONMENT=Object.freeze({dishDiameterMeters:100,accessOptionByte:false});

export type RadioPointing=Readonly<{ra:number;dec:number}>;
export type SkyCoordsField='raHours'|'raMinutes'|'raSeconds'|'decDegrees'|'decMinutes'|'decSeconds';
export const SKY_COORDS_FIELDS:readonly SkyCoordsField[]=Object.freeze(['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds']);
/** Browser bound: the DFM TEdits have no MaxLength. */
export const SKY_COORDS_FIELD_MAX_LENGTH=32;
export type SkyCoordsFields=Readonly<Record<SkyCoordsField,string>>;
export type SkyCoordsDialog=Readonly<{fields:SkyCoordsFields;epochIndex:0|1;epochEnabled:boolean}>;
/** Application.MessageBox calls (wrapper 0x47e09c) and browser gates. Buttons follow the flags operand. */
export type RadioLabNotice=Readonly<
 |{kind:'ra-invalid'}            // 0x4f350d flags 0x10, OK; dialog stays open
 |{kind:'dec-invalid'}           // 0x4f367d flags 0x10, OK; dialog stays open
 |{kind:'ra-unsupported';reason:SkyCoordsUnsupportedReason}  // web domain (SKY_COORDS_WEB_DOMAIN), OK; dialog stays open
 |{kind:'dec-unsupported';reason:SkyCoordsUnsupportedReason} // web domain, OK; dialog stays open
 |{kind:'b1950-gated'}           // browser gate: precession 0x4b9f44/0x4b9f64 not recovered
 |{kind:'no-slew-needed'}        // 0x566c1e flags 0x30, OK
 |{kind:'transit-dec-only'}      // 0x566e05 flags 0x41, OK/Cancel
 |{kind:'confirm-slew';target:RadioPointing;transit:boolean} // 0x566f43 flags 0x24, Yes/No
 |{kind:'stop-slew'}             // 0x566a5c flags 0x24, Yes/No
 |{kind:'slew-complete'}         // 0x5675ce flags 0x40, OK
>;
export type RadioLabNoticeKind=RadioLabNotice['kind'];
export type NoticeAnswer='ok'|'cancel'|'yes'|'no';
export const NOTICE_BUTTONS:Readonly<Record<RadioLabNoticeKind,readonly NoticeAnswer[]>>=Object.freeze({
 'ra-invalid':['ok'],'dec-invalid':['ok'],'ra-unsupported':['ok'],'dec-unsupported':['ok'],'b1950-gated':['ok'],'no-slew-needed':['ok'],'transit-dec-only':['ok','cancel'],
 'confirm-slew':['yes','no'],'stop-slew':['yes','no'],'slew-complete':['ok'],
});
/** +0x53d: 0 Dec rising, 1 Dec falling, 2 RA rising, 3 RA falling (or transit finish). */
export type SlewPhase=0|1|2|3;
/** Status text at +0x5f3+0x28: literal 0x567410 at slew start, 0x5678f4 at the RA phase (texts not decoded). */
export type SlewStatus='none'|'slewing'|'slewing-ra';

export type RadioLabState=Readonly<{
 /** +0x4d5: first FormActivate block ran (set at 0x564bb9). */
 activated:boolean;
 /** +0x5df RA hours / +0x5e9 Dec degrees. */
 pointing:RadioPointing;
 /** SkyCoords globals 0x5bc1c0/0x5bc1cc (read here through cells 0x5b5e20/0x5b5604; zero at FormCreate 0x4f3100). */
 target:RadioPointing;
 /** +0x5d1, DriveBtn ("Tracking"). The sidereal drive itself (ClockTimerTimer) is not modelled. */
 tracking:boolean;
 /** +0x5d3. */
 slewing:boolean;
 /** SlewTimer2.Enabled. */
 slewTimerEnabled:boolean;
 /** Browser generation token: incremented per started slew so late callbacks of an earlier run are ignored. */
 slewRun:number;
 /** SlewTimer2 callbacks applied in the current run (browser counter). */
 slewTicks:number;
 phase:SlewPhase;
 /** +0x53e: the current axis reached its target. */
 axisDone:boolean;
 /** +0x525: per-callback step (degrees in Dec phases, hours in RA phases). */
 step:number;
 /** +0x539 slew-rate index and +0x52f rate (arcsec per SlewTimer2 callback). RateLbl text (table 0x5b4a80) is not decoded. */
 rateIndex:number;
 rate:number;
 /** Enabled/visible state written by 0x565140, 0x5651cc, FormActivate and the slew handlers. */
 slewMenuEnabled:boolean;
 manualButtonsEnabled:boolean;
 rateSpinEnabled:boolean;
 receiverEnabled:boolean;
 trackingVisible:boolean;
 eastWestVisible:boolean;
 /** +0x480 "Add Current Item to List..." (DFM Enabled=False; disabled again at slew start). */
 addToListEnabled:boolean;
 status:SlewStatus;
 dialog:SkyCoordsDialog|null;
 notice:RadioLabNotice|null;
}>;

export type RadioLabOutcome=
 |'activated'|'already-activated'|'not-activated'|'modal-open'|'options-unsupported'
 |'tracking-on'|'tracking-off'|'tracking-unavailable'
 |'rate-up'|'rate-down'|'rate-at-limit'|'rate-disabled'
 |'menu-disabled'|'dialog-opened'|'stop-requested'
 |'field-edited'|'field-too-long'|'epoch-selected'|'epoch-disabled'|'dialog-closed'|'dialog-cancelled'
 |'ra-invalid'|'dec-invalid'|'ra-unsupported'|'dec-unsupported'|'b1950-gated'
 |'no-slew-needed'|'transit-notice'|'limits-require-clock'|'slew-confirm-requested'
 |'notice-dismissed'|'notice-stale'|'invalid-answer'|'transit-cancelled'|'slew-declined'
 |'slew-started'|'slew-instant'|'slew-stopped'|'slew-resumed'
 |'slew-timer-idle'|'slew-tick'|'slew-axis-ra'|'slew-complete';
export type RadioLabTransition=Readonly<{state:RadioLabState;outcome:RadioLabOutcome;changed:boolean;steps:readonly string[]}>;

const ZERO:RadioPointing=Object.freeze({ra:0,dec:0});
/** RA-01: DFM state before the first FormActivate (Slew1/N/S/RateSpin/Receiver enabled, E/W/DriveBtn hidden). */
export const INITIAL_RADIO_LAB:RadioLabState=Object.freeze({
 activated:false,pointing:ZERO,target:ZERO,tracking:false,slewing:false,slewTimerEnabled:false,slewRun:0,slewTicks:0,
 phase:0,axisDone:false,step:0,rateIndex:0,rate:0,slewMenuEnabled:true,manualButtonsEnabled:true,rateSpinEnabled:true,
 receiverEnabled:true,trackingVisible:false,eastWestVisible:false,addToListEnabled:false,status:'none',dialog:null,notice:null,
});

const isByte=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=255;
const isInt32=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)&&v>=-2147483648&&v<=2147483647;
/** Shape only: the native field widths (byte maximum index, Integer rate base, finite latitude). It does not mean
 * the browser can run the antenna with these values; see radioLabProfileIssues. */
export function isRadioLabOptions(o:unknown):o is RadioLabOptions{
 if(!o||typeof o!=='object')return false;const v=o as RadioLabOptions;
 return typeof v.transitTelescope==='boolean'&&typeof v.limitsEnabled==='boolean'&&typeof v.instantSlew==='boolean'&&isByte(v.maxRateIndex)&&isInt32(v.rateBase)&&typeof v.latitudeRadians==='number'&&Number.isFinite(v.latitudeRadians);
}
function checkOptions(o:RadioLabOptions){if(!isRadioLabOptions(o))throw new Error('Invalid radio lab options');}

/** OpenVireo web option profile (WEB-OPT-01; a browser limit, not an original options check: the options file loader
 * and TRadioOptsDlg are not recovered). A shape-valid option record is supported when the first FormActivate points
 * inside the sky and, at every slew-rate index the panel can reach, the Dec and RA steps are finite, advance every
 * in-range coordinate, and the RA step is below raStepLimitHours. Reachable indices are 1 (RateSpinDownClick floor)
 * up to max(4, maximum): the first FormActivate sets index 4 even when the options maximum is lower, and a programmed
 * slew raises the index to the maximum. Unsupported values are refused, never clamped. */
export const RADIO_WEB_OPTION_PROFILE=Object.freeze({
 /** Half the [0, 12) h SlewTimer2 crossing window. Below it, a step that carries RA past 0/24 h lands in the window on
  * the next callback, so every RA phase ends; at 6 h a slew from 0 h to a 24 h target cycles 18, 12, 6, 0 h forever. */
 raStepLimitHours:RADIO_LAB_CONSTANTS.halfTurnHours/2,
});
export type RadioLabProfileIssue=Readonly<
 |{kind:'initial-declination';declination:number}
 |{kind:'rate-not-advancing';index:number}
 |{kind:'ra-step';index:number;raStepHours:number}
>;
/** RA step of SlewTimer2 for a rate, as computed at 0x5674ff..0x56750f (magnitude). */
const raStepFor=(rate:number)=>rate*RADIO_LAB_CONSTANTS.raStepPerRate/RADIO_LAB_CONSTANTS.raStepDivisor;
function rateIssue(rate:number,index:number):RadioLabProfileIssue|null{
 const k=RADIO_LAB_CONSTANTS,dec=rate*k.decStepPerRate,ra=raStepFor(rate);
 // Adding the step to the largest coordinate magnitude must change it: then it changes every in-range coordinate.
 const advancing=Number.isFinite(rate)&&rate>0&&Number.isFinite(dec)&&Number.isFinite(ra)&&k.decMaxDegrees+dec>k.decMaxDegrees&&k.raMaxHours+ra>k.raMaxHours;
 if(!advancing)return Object.freeze({kind:'rate-not-advancing',index});
 return ra<RADIO_WEB_OPTION_PROFILE.raStepLimitHours?null:Object.freeze({kind:'ra-step',index,raStepHours:ra});
}
/** Every reason the browser does not run the antenna with these options (empty = supported). Throws on a bad shape. */
export function radioLabProfileIssues(options:RadioLabOptions):readonly RadioLabProfileIssue[]{
 checkOptions(options);
 const k=RADIO_LAB_CONSTANTS,issues:RadioLabProfileIssue[]=[];
 const declination=options.latitudeRadians*k.radiansToDegrees;
 if(!Number.isFinite(declination)||declination<k.decMinDegrees||declination>k.decMaxDegrees)issues.push(Object.freeze({kind:'initial-declination',declination}));
 for(let index=k.minRateIndex,top=Math.max(k.initialRateIndex,options.maxRateIndex);index<=top;index++){
  const issue=rateIssue(slewRateFor(index,options),index);if(issue){issues.push(issue);break;}// the lowest failing index
 }
 return Object.freeze(issues);
}
export function isSupportedRadioLabProfile(options:RadioLabOptions):boolean{return radioLabProfileIssues(options).length===0;}

const freezeState=(s:RadioLabState):RadioLabState=>Object.freeze({...s,pointing:Object.freeze({...s.pointing}),target:Object.freeze({...s.target}),
 dialog:s.dialog&&Object.freeze({...s.dialog,fields:Object.freeze({...s.dialog.fields})}),notice:s.notice&&Object.freeze({...s.notice})});
/** A committed transition always yields a new frozen state; the first argument documents the source state at call sites. */
const done=(_previous:RadioLabState,next:RadioLabState,outcome:RadioLabOutcome,steps:string[]):RadioLabTransition=>Object.freeze({state:freezeState(next),outcome,changed:true,steps:Object.freeze(steps)});
const same=(s:RadioLabState,outcome:RadioLabOutcome,steps:string[]=[]):RadioLabTransition=>Object.freeze({state:s,outcome,changed:false,steps:Object.freeze(steps)});
const modal=(s:RadioLabState)=>s.dialog!==null||s.notice!==null;
/** WEB-OPT-01 refusal: nothing changes (state, pointing, target, dialog draft and open box are kept). */
const unsupported=(s:RadioLabState)=>same(s,'options-unsupported');

// ----------------------------------------------------------------- numeric helpers
/** Sign(Double) 0x4272d4: −1, 0 or 1 (−0 gives 0). */
export const valueSign=(x:number):-1|0|1=>x>0?1:x<0?-1:0;
/** System.Round 0x403700 under the compiled control word 0x1332 (round to nearest, ties to even). */
export function roundHalfEven(x:number):number{const f=Math.floor(x),d=x-f;return d<0.5?f:d>0.5?f+1:f%2===0?f:f+1;}
/** 0x4bad9c through signed fractional turns, +24 for negatives; a rounded 24 is canonicalized to 0 (A06 policy). */
export function normalizeRaHours(ra:number):number{let r=ra-Math.trunc(ra/24)*24;if(r<0)r+=24;return r===24?0:r;}
/** FloatToStrF(value, ffFixed, 18, digits) via 0x486268. Number.toFixed rounds the exact binary value half away
 * from zero; a rounded zero prints without '-'. DecimalSeparator is not recovered, so '.' is used. */
export function formatFixed(value:number,digits:number):string{
 if(!Number.isFinite(value))return '';const text=value.toFixed(digits);return /^-0(?:\.0*)?$/.test(text)?text.slice(1):text;
}
export type Sexagesimal=Readonly<{sign:-1|0|1;whole:number;minutes:number;seconds:number}>;
/** 0x486bc0 (calls 0x486b20): sign := Sign(v); whole := |Trunc v|; f := |Frac v|×60; minutes := Trunc f;
 * seconds := Frac f × 60; then if Round(10^d × seconds) = 60 × 10^d the seconds carry into minutes and a
 * minute count of 60 carries into whole. The whole part does not wrap (23:59:59.999 h gives 24 0 0). */
export function splitSexagesimal(value:number,decimals:1|2):Sexagesimal{
 const sign=valueSign(value);let whole=Math.abs(Math.trunc(value));
 const f=Math.abs(value-Math.trunc(value))*60;let minutes=Math.trunc(f),seconds=(f-Math.trunc(f))*60;
 const scale=decimals===1?10:100;
 if(roundHalfEven(scale*seconds)===60*scale){seconds=0;minutes+=1;if(minutes===60){minutes=0;whole+=1;}}
 return Object.freeze({sign,whole,minutes,seconds});
}
/** RA-08 TSkyCoordsDlg.FormActivate 0x4f326f..0x4f3372 (J2000 path): IntToStr hours/minutes, ffFixed 2 seconds;
 * Dec: IntToStr(sign × degrees) — a Dec in (−1°, 0°) shows "0" and loses its minus — minutes, ffFixed 1 seconds. */
export function skyCoordsFieldsFor(target:RadioPointing):SkyCoordsFields{
 const ra=splitSexagesimal(target.ra,2),dec=splitSexagesimal(target.dec,1),degrees=dec.sign*dec.whole;
 return Object.freeze({raHours:String(ra.whole),raMinutes:String(ra.minutes),raSeconds:formatFixed(ra.seconds,2),
  decDegrees:String(degrees===0?0:degrees),decMinutes:String(dec.minutes),decSeconds:formatFixed(dec.seconds,1)});
}

/** Strict web grammar for one StrToFloat (0x40cf60) edit text: optional blanks, sign, digits with an optional '.',
 * and an exponent of at most two digits so every accepted value is finite and normal or zero in binary64. The native
 * routine accepts more spellings, accumulates in Extended and uses the host DecimalSeparator. */
const FLOAT_TEXT=/^ *[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,2})? *$/;
export function parseDelphiFloat(text:unknown):number|null{
 if(typeof text!=='string'||text.length>SKY_COORDS_FIELD_MAX_LENGTH||!FLOAT_TEXT.test(text))return null;
 const value=Number(text.trim());return Number.isFinite(value)?value:null;
}
/** Exact value of one grammar-accepted field: coefficient × 10^exponent (no rounding; −0 becomes 0). */
export type ExactDecimal=Readonly<{coefficient:bigint;exponent:number}>;
const DECIMAL_PARTS=/^ *([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d{1,2}))? *$/;
export function parseExactDecimal(text:unknown):ExactDecimal|null{
 if(parseDelphiFloat(text)===null)return null;
 const [,sign,whole,fraction='',exponent='0']=DECIMAL_PARTS.exec(text as string)!;
 const digits=BigInt(whole+fraction);// the grammar guarantees at least one digit
 return Object.freeze({coefficient:sign==='-'?-digits:digits,exponent:Number(exponent)-fraction.length});
}

/** OpenVireo web domain for the OK formulas (not an original limit; see docs/RADIO-ANTENNA.md "Numeric admission").
 * S = |a| + |b|/60 + |c|/3600 over the exact field values. Any evaluation that rounds each of its at most four
 * operations (parse, divide, two adds) to 53 or more bits stays within errorBoundScale × S of the exact value. */
export const SKY_COORDS_WEB_DOMAIN=Object.freeze({
 /** Largest supported S (hours for RA, degrees for Dec): bounds that evaluation error by 2^-50 × 10^6 ≈ 8.9e-10. */
 magnitudeLimit:1_000_000,
 /** 2^-50 > γ4 = 4u/(1−4u) for binary64 (u = 2^-53); Extended (u = 2^-64) is inside it too, assuming a faithful StrToFloat. */
 errorBoundScale:2**-50,
});
export type SkyCoordsUnsupportedReason='cancellation'|'precision';
type Rational=Readonly<{n:bigint;d:bigint}>;
const rational=(x:ExactDecimal):Rational=>x.exponent>=0?{n:x.coefficient*10n**BigInt(x.exponent),d:1n}:{n:x.coefficient,d:10n**BigInt(-x.exponent)};
const bigAbs=(x:bigint)=>x<0n?-x:x;
/** Correctly rounded binary64 (ties to even) of n/d, d > 0. Callers pass in-range values, so the result is normal or 0. */
export function nearestBinary64(n:bigint,d:bigint):number{
 if(d<=0n)throw new Error('Denominator must be positive');
 if(n===0n)return 0;
 const a=bigAbs(n);let shift=53-(a.toString(2).length-d.toString(2).length);// a/d × 2^shift lies in [2^52, 2^54)
 const quotient=(k:number)=>{const num=k>=0?a<<BigInt(k):a,den=k>=0?d:d<<BigInt(-k);return {q:num/den,r:num%den,den};};
 let {q,r,den}=quotient(shift);
 if(q>=1n<<53n)({q,r,den}=quotient(--shift));
 const twice=2n*r;if(twice>den||(twice===den&&(q&1n)===1n))q+=1n;
 return (n<0n?-1:1)*Number(q)*2**-shift;
}
export type CoordinateAdmission=Readonly<{status:'ok';value:number}|{status:'out-of-range'}|{status:'unsupported';reason:SkyCoordsUnsupportedReason}>;
/** Exact a + sign×(b/60 + c/3600) checked against [min, max] inside the web domain. Out of range by more than the
 * error bound → out-of-range (every faithful evaluation agrees). Otherwise S above the limit → cancellation; still
 * out of range → precision (too close to the bound to classify). In range → the nearest binary64, never clamped. */
export function admitCoordinate(a:ExactDecimal,b:ExactDecimal,c:ExactDecimal,sign:1|-1,min:number,max:number):CoordinateAdmission{
 const k=RADIO_LAB_CONSTANTS,w=SKY_COORDS_WEB_DOMAIN,terms=[[rational(a),k.secondsPerUnit],[rational(b),k.minutesPerUnit],[rational(c),1]] as const;
 const p=terms.reduce((m,[x])=>x.d>m?x.d:m,1n),d=BigInt(k.secondsPerUnit)*p;// powers of ten: the largest is the LCM
 const scaled=terms.map(([x,weight])=>x.n*BigInt(weight)*(p/x.d));
 const n=scaled[0]+BigInt(sign)*(scaled[1]+scaled[2]),s=scaled.reduce((t,x)=>t+bigAbs(x),0n);
 const below=n<BigInt(min)*d,above=n>BigInt(max)*d;
 const distance=below?BigInt(min)*d-n:above?n-BigInt(max)*d:0n;
 if((below||above)&&distance*BigInt(1/w.errorBoundScale)>s)return Object.freeze({status:'out-of-range'});
 if(s>BigInt(w.magnitudeLimit)*d)return Object.freeze({status:'unsupported',reason:'cancellation'});
 if(below||above)return Object.freeze({status:'unsupported',reason:'precision'});
 return Object.freeze({status:'ok',value:nearestBinary64(n,d)});
}
export type SkyCoordsParse=Readonly<{status:'ok';ra:number;dec:number}|{status:'ra-invalid'}|{status:'dec-invalid'}
 |{status:'ra-unsupported';reason:SkyCoordsUnsupportedReason}|{status:'dec-unsupported';reason:SkyCoordsUnsupportedReason}>;
/** RA-09 OKBtnClick 0x4f33f4: RA = (h + m/60) + s/3600 inside one EConvertError block, then 0 ≤ RA ≤ 24.
 * Dec degrees d; sign := Sign(d) if d ≠ 0, else −1 when the degree text contains '-' (Pos 0x40640c), else +1;
 * Dec = (d + (m×sign)/60) + (s×sign)/3600, then −90 ≤ Dec ≤ 90. RA errors win; individual fields have no range.
 * Web policy: the formulas are evaluated exactly and admitted through admitCoordinate (no x87 emulation); an entry
 * outside the web domain is reported as unsupported, never approximated or clamped. */
export function parseSkyCoords(fields:SkyCoordsFields):SkyCoordsParse{
 const k=RADIO_LAB_CONSTANTS;
 const h=parseExactDecimal(fields.raHours),m=h===null?null:parseExactDecimal(fields.raMinutes),s=m===null?null:parseExactDecimal(fields.raSeconds);
 if(h===null||m===null||s===null)return Object.freeze({status:'ra-invalid'});
 const ra=admitCoordinate(h,m,s,1,k.raMinHours,k.raMaxHours);
 if(ra.status==='out-of-range')return Object.freeze({status:'ra-invalid'});
 if(ra.status==='unsupported')return Object.freeze({status:'ra-unsupported',reason:ra.reason});
 const d=parseExactDecimal(fields.decDegrees);if(d===null)return Object.freeze({status:'dec-invalid'});
 const sign=d.coefficient!==0n?(d.coefficient<0n?-1:1):fields.decDegrees.includes('-')?-1:1;
 const dm=parseExactDecimal(fields.decMinutes);if(dm===null)return Object.freeze({status:'dec-invalid'});
 const ds=parseExactDecimal(fields.decSeconds);if(ds===null)return Object.freeze({status:'dec-invalid'});
 const dec=admitCoordinate(d,dm,ds,sign,k.decMinDegrees,k.decMaxDegrees);
 if(dec.status==='out-of-range')return Object.freeze({status:'dec-invalid'});
 if(dec.status==='unsupported')return Object.freeze({status:'dec-unsupported',reason:dec.reason});
 return Object.freeze({status:'ok',ra:ra.value,dec:dec.value});
}
/** RateSpin 0x566784/0x566838 and FormActivate 0x5649f3: Power(10, index − 3) × rate base. */
export function slewRateFor(index:number,options:RadioLabOptions):number{
 return RADIO_LAB_CONSTANTS.rateBase10**(index-RADIO_LAB_CONSTANTS.rateIndexOffset)*options.rateBase;
}

// ----------------------------------------------------------------- transitions
/** RA-04 first TRadioLab.FormActivate 0x5643fc (block guarded by +0x4d5): 0x565140 disables N/S/E/W, RateSpin,
 * labels and Receiver and sets Slew1.Enabled := transit; unless transit, DriveBtn/ClockLbl/ClockBvl/E/W become
 * visible; tracking/slewing bytes 0; rate index 4; RA := 0; Dec := latitude × 180/π; HA := 0. Catalog, hot-list,
 * sound and file loading in the same block are outside this slice. WEB-OPT-01: options outside the supported web
 * profile leave the form unactivated (no out-of-sky or non-finite Dec is ever stored). */
export function activateRadioLab(s:RadioLabState,options:RadioLabOptions):RadioLabTransition{
 checkOptions(options);
 if(s.activated)return same(s,'already-activated');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 const index=RADIO_LAB_CONSTANTS.initialRateIndex;
 return done(s,{...s,activated:true,tracking:false,slewing:false,slewTimerEnabled:false,slewTicks:0,phase:0,axisDone:false,step:0,
  rateIndex:index,rate:slewRateFor(index,options),slewMenuEnabled:options.transitTelescope,manualButtonsEnabled:false,rateSpinEnabled:false,
  receiverEnabled:false,trackingVisible:!options.transitTelescope,eastWestVisible:!options.transitTelescope,status:'none',dialog:null,notice:null,
  pointing:{ra:0,dec:options.latitudeRadians*RADIO_LAB_CONSTANTS.radiansToDegrees}},'activated',['RA-04']);
}

/** RA-05 DriveBtnClick 0x565dec. The manual-press latch +0x5d2 is always 0 here (N/S/E/W handlers not modelled).
 * On: 0x5651cc (N/S/E/W := tracking, Slew1 := tracking or transit, RateSpin/labels/Receiver enabled).
 * Off: 0x565140. ClockLbl caption literals 0x565e48/0x565e54 are not decoded. A running slew is not stopped. */
export function toggleTracking(s:RadioLabState,options:RadioLabOptions):RadioLabTransition{
 checkOptions(options);
 if(!s.activated)return same(s,'not-activated');
 if(modal(s))return same(s,'modal-open');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 if(!s.trackingVisible)return same(s,'tracking-unavailable');
 const tracking=!s.tracking;
 const next=tracking
  ?{...s,tracking,manualButtonsEnabled:true,slewMenuEnabled:true,rateSpinEnabled:true,receiverEnabled:true}
  :{...s,tracking,manualButtonsEnabled:false,slewMenuEnabled:options.transitTelescope,rateSpinEnabled:false,receiverEnabled:false};
 return done(s,next,tracking?'tracking-on':'tracking-off',['RA-05']);
}

/** RA-06 RateSpinUpClick 0x566784 (index < options maximum) and RateSpinDownClick 0x566838 (index > 1). */
export function changeSlewRate(s:RadioLabState,options:RadioLabOptions,direction:'up'|'down'):RadioLabTransition{
 checkOptions(options);
 if(!s.activated)return same(s,'not-activated');
 if(modal(s))return same(s,'modal-open');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 if(!s.rateSpinEnabled)return same(s,'rate-disabled');
 const allowed=direction==='up'?options.maxRateIndex>s.rateIndex:s.rateIndex>RADIO_LAB_CONSTANTS.minRateIndex;
 if(!allowed)return same(s,'rate-at-limit',['RA-06']);
 const rateIndex=s.rateIndex+(direction==='up'?1:-1);
 return done(s,{...s,rateIndex,rate:slewRateFor(rateIndex,options)},direction==='up'?'rate-up':'rate-down',['RA-06']);
}

/** RA-07 CoordBtnClick 0x566a3c (Slew ▸ Set Coordinates…). During a slew: SlewTimer2 off, then the Yes/No stop
 * question. Otherwise: when both stored coordinates equal Single 0.0 (0x566bc0) they are seeded from the current
 * pointing, EpochGrp is enabled and the dialog is shown modally with RA-08 prefill. WEB-OPT-01: under unsupported
 * options the stop question stays available, but no dialog opens (the stored coordinates are not seeded). */
export function openSetCoordinates(s:RadioLabState,options:RadioLabOptions):RadioLabTransition{
 checkOptions(options);
 if(!s.activated)return same(s,'not-activated');
 if(modal(s))return same(s,'modal-open');
 if(!s.slewMenuEnabled)return same(s,'menu-disabled');
 if(s.slewing)return done(s,{...s,slewTimerEnabled:false,notice:{kind:'stop-slew'}},'stop-requested',['RA-07']);
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 const target=s.target.ra===0&&s.target.dec===0?s.pointing:s.target;
 return done(s,{...s,target,dialog:{fields:skyCoordsFieldsFor(target),epochIndex:0,epochEnabled:true}},'dialog-opened',['RA-07','RA-08']);
}

export function editSkyCoordsField(s:RadioLabState,field:SkyCoordsField,text:string):RadioLabTransition{
 if(!s.dialog||!SKY_COORDS_FIELDS.includes(field)||typeof text!=='string')return same(s,'dialog-closed');
 if(s.notice)return same(s,'modal-open');
 if(text.length>SKY_COORDS_FIELD_MAX_LENGTH)return same(s,'field-too-long');
 if(s.dialog.fields[field]===text)return same(s,'field-edited');
 return done(s,{...s,dialog:{...s.dialog,fields:{...s.dialog.fields,[field]:text}}},'field-edited',[]);
}
export function selectSkyCoordsEpoch(s:RadioLabState,index:0|1):RadioLabTransition{
 if(!s.dialog||(index!==0&&index!==1))return same(s,'dialog-closed');
 if(s.notice)return same(s,'modal-open');
 if(!s.dialog.epochEnabled)return same(s,'epoch-disabled');
 if(s.dialog.epochIndex===index)return same(s,'epoch-selected');
 return done(s,{...s,dialog:{...s.dialog,epochIndex:index}},'epoch-selected',[]);
}
/** RA-07 CancelBtn (bkCancel, ModalResult 2 ≠ 1): nothing is committed and no slew starts. */
export function cancelSkyCoords(s:RadioLabState):RadioLabTransition{
 if(!s.dialog)return same(s,'dialog-closed');
 if(s.notice)return same(s,'modal-open');
 return done(s,{...s,dialog:null},'dialog-cancelled',['RA-07']);
}

/** RA-10 0x566bc4 after the stored target was committed: exact equality with the current pointing →
 * warning; transit → OK/Cancel note first; enforced limits need sidereal time (gated); else Yes/No confirm. */
function requestSlew(s:RadioLabState,options:RadioLabOptions,steps:string[]):RadioLabTransition{
 if(s.target.ra===s.pointing.ra&&s.target.dec===s.pointing.dec)return done(s,{...s,notice:{kind:'no-slew-needed'}},'no-slew-needed',[...steps,'RA-10']);
 if(options.transitTelescope)return done(s,{...s,notice:{kind:'transit-dec-only'}},'transit-notice',[...steps,'RA-10']);
 return confirmOrGate(s,options,[...steps,'RA-10']);
}
function confirmOrGate(s:RadioLabState,options:RadioLabOptions,steps:string[]):RadioLabTransition{
 // 0x566c40/0x566e2b compute LST (0x4881ac) and call 0x5668e0, which returns True at once when limits are off.
 if(options.limitsEnabled)return done(s,{...s,notice:null},'limits-require-clock',[...steps,'RA-12']);
 return done(s,{...s,notice:{kind:'confirm-slew',target:s.target,transit:options.transitTelescope}},'slew-confirm-requested',steps);
}

/** RA-09 OKBtnClick 0x4f33f4. A parse/range failure keeps the dialog (ModalResult := 0) under an OK message box;
 * an entry outside the web domain does the same with a browser box. B1950 is a browser gate. On success the
 * J2000 values are stored and CoordBtnClick continues with RA-10. WEB-OPT-01: under unsupported options OK stores
 * nothing and the dialog stays open (Cancel still closes it). */
export function confirmSkyCoords(s:RadioLabState,options:RadioLabOptions):RadioLabTransition{
 checkOptions(options);
 if(!s.dialog)return same(s,'dialog-closed');
 if(s.notice)return same(s,'modal-open');
 if(!isSupportedRadioLabProfile(options))return unsupported(s);
 const parsed=parseSkyCoords(s.dialog.fields);
 if(parsed.status!=='ok'){
  const notice:RadioLabNotice=parsed.status==='ra-unsupported'||parsed.status==='dec-unsupported'?{kind:parsed.status,reason:parsed.reason}:{kind:parsed.status};
  return done(s,{...s,notice},parsed.status,['RA-09']);
 }
 if(s.dialog.epochIndex===1)return done(s,{...s,notice:{kind:'b1950-gated'}},'b1950-gated',['RA-09']);
 return requestSlew({...s,dialog:null,target:{ra:parsed.ra,dec:parsed.dec}},options,['RA-09']);
}

/** RA-10 Yes branch 0x566f74..0x567181. */
function startSlew(s:RadioLabState,options:RadioLabOptions):RadioLabTransition{
 let {rateIndex,rate}=s;
 // 0x566f6b loop: RateSpinUpClick while the options maximum exceeds the index.
 while(options.maxRateIndex>rateIndex){rateIndex+=1;rate=slewRateFor(rateIndex,options);}
 const step=rate*RADIO_LAB_CONSTANTS.decStepPerRate;
 const base={...s,notice:null,rateIndex,rate,step};
 if(options.instantSlew){
  // 0x566fb3..0x5670c6: Dec := target; RA := normalized target unless transit. HA store, LED repaint and
  // the 0x561e88 beam update are not modelled.
  const pointing={dec:s.target.dec,ra:options.transitTelescope?s.pointing.ra:normalizeRaHours(s.target.ra)};
  return done(s,{...base,pointing},'slew-instant',['RA-10']);
 }
 const falling=s.pointing.dec>s.target.dec;
 return done(s,{...base,phase:falling?1:0,step:falling?-step:step,axisDone:false,slewTimerEnabled:true,slewing:true,slewRun:s.slewRun+1,slewTicks:0,
  addToListEnabled:false,manualButtonsEnabled:false,rateSpinEnabled:false,status:'slewing'},'slew-started',['RA-10']);
}

/** Answers the current message box. `kind` must name the box being answered: an answer aimed at a box of another
 * kind, or arriving when no box is open, changes nothing. Two successive boxes of the same kind are not told apart,
 * so this alone cannot reject a late answer meant for an earlier same-kind box. The panel passes the kind of the box
 * it renders and ignores auto-repeated Enter/Escape, which otherwise ran through several boxes (see the held-key specs).
 * WEB-OPT-01: under unsupported options Yes on the slew confirmation is refused and the box stays open; every other
 * answer (No, Cancel, OK, and both answers to the stop question) works as usual. */
export function answerNotice(s:RadioLabState,options:RadioLabOptions,kind:RadioLabNoticeKind,answer:NoticeAnswer):RadioLabTransition{
 checkOptions(options);
 const notice=s.notice;
 if(!notice||notice.kind!==kind)return same(s,'notice-stale');
 if(!NOTICE_BUTTONS[notice.kind].includes(answer))return same(s,'invalid-answer');
 const cleared={...s,notice:null};
 switch(notice.kind){
  case 'transit-dec-only':return answer==='ok'?confirmOrGate(cleared,options,['RA-10']):done(s,cleared,'transit-cancelled',['RA-10']);
  case 'confirm-slew':
   if(answer==='yes'&&!isSupportedRadioLabProfile(options))return unsupported(s);
   return answer==='yes'?startSlew(s,options):done(s,cleared,'slew-declined',['RA-10']);
  case 'stop-slew':
   // 0x566a79..0x566ad5 (Yes) / 0x566adf (No).
   return answer==='yes'
    ?done(s,{...cleared,slewing:false,manualButtonsEnabled:true,rateSpinEnabled:true,status:'none'},'slew-stopped',['RA-07'])
    :done(s,{...cleared,slewTimerEnabled:true},'slew-resumed',['RA-07']);
  default:return done(s,cleared,'notice-dismissed',[]);
 }
}

/** RA-11 SlewTimer2Timer 0x567430..0x5678c4, one callback. `run` must equal the current slewRun. WEB-OPT-01: the
 * callback changes nothing while the options or the state's own rate are outside the supported web profile (the
 * host may change options mid-run; the stored rate is kept, as the original only recomputes it in RateSpin). */
export function slewTimerTick(s:RadioLabState,options:RadioLabOptions,run:number):RadioLabTransition{
 checkOptions(options);
 if(!s.slewTimerEnabled||run!==s.slewRun)return same(s,'slew-timer-idle');
 if(!isSupportedRadioLabProfile(options)||rateIssue(s.rate,s.rateIndex))return unsupported(s);
 const k=RADIO_LAB_CONSTANTS,t=s.target;
 let {phase,axisDone,step,status}=s,{ra,dec}=s.pointing,outcome:RadioLabOutcome='slew-tick';
 if((phase===0||phase===1)&&axisDone){
  if(options.transitTelescope)phase=3;
  else{
   let d=t.ra-ra;if(Math.abs(d)>k.halfTurnHours)d=-d;
   phase=d>k.arrivalWindowStartHours?2:3;
   axisDone=k.initialRaToleranceHours>=Math.abs(d);
   step=valueSign(d)*s.rate*k.raStepPerRate/k.raStepDivisor;
   status='slewing-ra';outcome='slew-axis-ra';
  }
 }
 const ticks=s.slewTicks+1;
 if((phase===2||phase===3)&&axisDone){
  // 0x567560..0x5675e6: SlewTimer2 off, slewing 0, N/S/E/W and RateSpin enabled, status cleared, then the OK box.
  return done(s,{...s,phase,axisDone,step,slewTicks:ticks,slewTimerEnabled:false,slewing:false,manualButtonsEnabled:true,rateSpinEnabled:true,
   status:'none',notice:{kind:'slew-complete'}},'slew-complete',['RA-11']);
 }
 if(phase===0){dec+=step;if(!(t.dec>dec)){dec=t.dec;axisDone=true;}}
 else if(phase===1){dec+=step;if(!(t.dec<dec)){dec=t.dec;axisDone=true;}}
 else{
  ra+=step;const cross=phase===2?ra-t.ra:t.ra-ra;
  if(cross>=k.arrivalWindowStartHours&&cross<k.halfTurnHours){ra=t.ra;axisDone=true;}
  // The hour-angle update at +0x5d5 (0x567753/0x567802) belongs to the unmodelled clock.
 }
 return done(s,{...s,phase,axisDone,step,status,slewTicks:ticks,pointing:{ra:normalizeRaHours(ra),dec}},outcome,['RA-11']);
}

export function isRadioLabModal(s:RadioLabState):boolean{return modal(s);}
