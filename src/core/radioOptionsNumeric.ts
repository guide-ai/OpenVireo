// R-RX9 Radio Simulation Options numbers (docs/RADIO-SIMULATION-OPTIONS.md). Pure TypeScript that imports nothing: the nine
// TRadiOptsDlg number fields (VMT 0x5a7c84), their recovered OK order and stores (OKBtnClick 0x5a9428), the typed constants
// and the declared web policies for text admission, rounding, storage and display (WEB-RSO-NUM-01..03, WEB-RSO-FMT-01).
// The exact-decimal BigInt rounding is a chosen web policy: it is not claimed to reproduce native StrToFloat (0x40cf60 →
// TextToFloat 0x40cdb4) accumulation, the active x87 control word or FloatToStrF (0x486268 → 0x40cf28) for every text.

/** Extended (80-bit) constant from its 64-bit significand and biased exponent, rounded once to binary64. */
const ext=(significand:bigint,biasedExponent:number)=>Number(significand)*2**(biasedExponent-16383-63);
/** IEEE Single from its stored bit pattern (a typed immediate of the defaults routine). */
const f32=(bits:number)=>{const view=new DataView(new ArrayBuffer(4));view.setUint32(0,bits>>>0);return view.getFloat32(0);};

/** Typed literals (TYPED-LITERALS.json) and compiled immediates (radio-options-defaults-bounded.asm 0x5a8fcb..0x5a90ad). */
export const RADIO_OPTIONS_NUMERIC_CONSTANTS=Object.freeze({
 /** Extended 0x5a9768, OK: degrees × it → record+0x90c radians. */
 degreesToRadians:ext(0x8efa351294e9c8aen,0x3ff9),
 /** Extended 0x5a93ec, FormActivate: record+0x90c × it → degrees. */
 radiansToDegrees:ext(0xe52ee0d31e0fbdc3n,0x4004),
 /** Extended {0x3a243ada, 0xb2b8c257, 0x3ffc} stored to +0x90c (10°). */
 compiledHorizonRadians:ext(0xb2b8c2573a243adan,0x3ffc),
 /** Single 0x5a9774 (1.0): the Sound Sync upper clamp at 0x5a960d..0x5a9626. */
 syncThreshold:f32(0x3f800000),
 /** +0x91e at 0x5a9020: 0x48c394 true stores 0x3f43d70a, false 0x3f6b851f. The runtime host cells are unknown. */
 syncHostTrue:f32(0x3f43d70a),syncHostFalse:f32(0x3f6b851f),
 /** +0x924 0x3f800000 and +0x930 0x42480000. */
 gain:f32(0x3f800000),temperature:f32(0x42480000),
});

/** [W] Longest draft text, in UTF-16 units (WEB-RSO-NUM-01); a longer edit is refused, never truncated. */
export const RADIO_OPTIONS_TEXT_MAX_LENGTH=64;

export type RadioOptionsNumberField='horizon90c'|'aperture916'|'baseSlew91a'|'soundSync91e'|'sampleRate922'|'gain924'|'background928'|'beamWidth92c'|'temperature930';
/** OKBtnClick store order (0x5a9563..0x5a96d2). */
export const RADIO_OPTIONS_OK_ORDER:readonly RadioOptionsNumberField[]=Object.freeze(['horizon90c','aperture916','baseSlew91a','soundSync91e','sampleRate922','gain924','background928','beamWidth92c','temperature930']);
/** DFM child order of the labels and edits (RADIO-OPTIONS-RESOURCE.json); it intentionally differs from the OK order. */
export const RADIO_OPTIONS_DFM_ORDER:readonly RadioOptionsNumberField[]=Object.freeze(['horizon90c','aperture916','baseSlew91a','background928','beamWidth92c','temperature930','gain924','soundSync91e','sampleRate922']);
export type RadioOptionsNumberKind='horizon'|'int32'|'word'|'single'|'sync';
/** Control, record offset, storage and the FloatToStrF digits FormActivate passes (null: IntToStr 0x40ac14). */
export const RADIO_OPTIONS_FIELD_SPEC:Readonly<Record<RadioOptionsNumberField,Readonly<{control:string;offset:string;kind:RadioOptionsNumberKind;digits:number|null}>>>=Object.freeze({
 horizon90c:Object.freeze({control:'HorzEd',offset:'0x90c',kind:'horizon',digits:1}),
 aperture916:Object.freeze({control:'ApertureEd',offset:'0x916',kind:'int32',digits:null}),
 baseSlew91a:Object.freeze({control:'SlwTmrEd',offset:'0x91a',kind:'int32',digits:null}),
 soundSync91e:Object.freeze({control:'SyncEd',offset:'0x91e',kind:'sync',digits:5}),
 sampleRate922:Object.freeze({control:'FreqEd',offset:'0x922',kind:'word',digits:null}),
 gain924:Object.freeze({control:'GainEd',offset:'0x924',kind:'single',digits:2}),
 background928:Object.freeze({control:'NoiseEd',offset:'0x928',kind:'int32',digits:null}),
 beamWidth92c:Object.freeze({control:'BeamEd',offset:'0x92c',kind:'single',digits:2}),
 temperature930:Object.freeze({control:'TempEd',offset:'0x930',kind:'single',digits:1}),
});

/** grammar: outside WEB-RSO-NUM-01 (shown under the recovered caption, with the note that the native grammar is not
 * recovered). web-limit: a browser domain whose native outcome is unknown. */
export type RadioOptionsParseFailure=Readonly<{kind:'grammar';reason:'grammar'}|{kind:'web-limit';reason:'int64-range'|'binary64-range'|'single-range'|'degrees-range'}>;
export type RadioOptionsParse=Readonly<{ok:true;value:number}>|(Readonly<{ok:false}>&RadioOptionsParseFailure);

/** WEB-RSO-NUM-01: ASCII decimal with optional sign, '.' separator and exponent; no whitespace, no Infinity/NaN/hex. */
const GRAMMAR=/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;
const SHAPE=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
export const isRadioOptionsNumberText=(text:string):boolean=>typeof text==='string'&&SHAPE.test(text);

const INT64_MIN=-(2n**63n),INT64_MAX=2n**63n-1n;
/** WEB-RSO-NUM-02: the exact decimal value of an admitted text rounded half to even (Delphi default control word $1332,
 * RC = 00, inferred; the runtime word is not observed), or null outside [−2^63, 2^63 − 1]. The order of magnitude is
 * decided before any BigInt power, so a large exponent costs nothing. */
export function roundRadioOptionsInteger(text:string):bigint|null{
 const m=GRAMMAR.exec(text);if(!m||!SHAPE.test(text))throw new TypeError('Not a radio options number text');
 const negative=m[1]==='-',fraction=m[3]??'',digits=(m[2]+fraction).replace(/^0+/,'');
 if(digits==='')return 0n;
 const e=BigInt(m[4]??'0')-BigInt(fraction.length),order=BigInt(digits.length)+e;// 10^(order−1) ≤ |value| < 10^order
 if(order>20n)return null;// ≥ 10^20 > 2^63
 if(order<0n)return 0n;// < 0.1
 const d=BigInt(digits);let q:bigint;
 if(e>=0n)q=d*10n**e;
 else{const p=10n**-e,r=d%p,twice=2n*r;q=d/p;if(twice>p||(twice===p&&(q&1n)===1n))q+=1n;}
 const v=negative?-q:q;
 return v<INT64_MIN||v>INT64_MAX?null:v;
}

const fail=(failure:RadioOptionsParseFailure):RadioOptionsParse=>Object.freeze({ok:false,...failure});
const ok=(value:number):RadioOptionsParse=>Object.freeze({ok:true,value});
/** One field's OK conversion under the web policies. Integer fields: exact decimal → ties-even Int64 → low 32 (signed) or
 * low 16 (Word) bits, a bit projection and not a native range check. Singles: Number → Math.fround (double rounding is
 * declared); Sound Sync then clamps values above Single 1.0 to 1.0 (no lower clamp). Horizon: degrees × the binary64 value
 * of Extended 0x5a9768 (stored as binary64, not Extended), refused when its degree display would not be finite. */
export function parseRadioOptionsField(field:RadioOptionsNumberField,text:string):RadioOptionsParse{
 const spec=RADIO_OPTIONS_FIELD_SPEC[field];if(!spec)throw new TypeError('Unknown radio options field');
 if(typeof text!=='string')throw new TypeError('Radio options text must be a string');
 if(!SHAPE.test(text))return fail({kind:'grammar',reason:'grammar'});
 if(spec.kind==='int32'||spec.kind==='word'){
  const v=roundRadioOptionsInteger(text);if(v===null)return fail({kind:'web-limit',reason:'int64-range'});
  return ok(spec.kind==='int32'?Number(BigInt.asIntN(32,v)):Number(BigInt.asUintN(16,v)));
 }
 const x=Number(text);if(!Number.isFinite(x))return fail({kind:'web-limit',reason:'binary64-range'});
 if(spec.kind==='horizon'){
  const k=RADIO_OPTIONS_NUMERIC_CONSTANTS,r=x*k.degreesToRadians;
  return Number.isFinite(r)&&Number.isFinite(r*k.radiansToDegrees)?ok(r):fail({kind:'web-limit',reason:'degrees-range'});
 }
 const v=Math.fround(x);if(!Number.isFinite(v))return fail({kind:'web-limit',reason:'single-range'});
 return ok(spec.kind==='sync'&&v>RADIO_OPTIONS_NUMERIC_CONSTANTS.syncThreshold?RADIO_OPTIONS_NUMERIC_CONSTANTS.syncThreshold:v);
}

/** Whether a stored value is admissible for its field (supplied records, WEB-RSO-AUTH-01): Int32, Word 0..65535, a finite
 * Single (fround(v) === v) or a finite horizon whose degree display is finite. Integer fields reject −0. */
export function isRadioOptionsFieldValue(field:RadioOptionsNumberField,v:unknown):v is number{
 const spec=RADIO_OPTIONS_FIELD_SPEC[field];
 if(!spec||typeof v!=='number'||!Number.isFinite(v))return false;
 switch(spec.kind){
  case 'int32':return Number.isInteger(v)&&!Object.is(v,-0)&&v>=-2147483648&&v<=2147483647;
  case 'word':return Number.isInteger(v)&&!Object.is(v,-0)&&v>=0&&v<=65535;
  case 'horizon':return Number.isFinite(v*RADIO_OPTIONS_NUMERIC_CONSTANTS.radiansToDegrees);
  default:return Math.fround(v)===v;
 }
}

/** WEB-RSO-FMT-01 fixed text: |v| < 1e18 → toFixed (ties away from zero on the exact binary value; −0 shows as 0),
 * otherwise toExponential(17), which the grammar re-parses. Not the native precision-18 FloatToStrF boundary. */
export function radioOptionsFixedText(v:number,digits:number):string{
 if(!Number.isFinite(v)||!Number.isInteger(digits)||digits<0||digits>20)throw new TypeError('Invalid radio options display value');
 if(Object.is(v,-0))return (0).toFixed(digits);
 return Math.abs(v)<1e18?v.toFixed(digits):v.toExponential(17);
}
/** The FormActivate text of a stored value: IntToStr for Int32, the unsigned Word as decimal (movzx), Singles with their
 * digits, and the horizon as radians × the binary64 value of Extended 0x5a93ec with one digit. */
export function formatRadioOptionsValue(field:RadioOptionsNumberField,value:number):string{
 const spec=RADIO_OPTIONS_FIELD_SPEC[field];
 if(!isRadioOptionsFieldValue(field,value))throw new TypeError(`Invalid radio options value: ${field}`);
 if(spec.digits===null)return String(value);
 return radioOptionsFixedText(spec.kind==='horizon'?value*RADIO_OPTIONS_NUMERIC_CONSTANTS.radiansToDegrees:value,spec.digits);
}
