/** RC-12…RC-17: File ▸ Set Observation Date/Time, ID before radio activation, recovered statically from VIREO 1.504
 * CLEA_VEO.exe (SHA-256 781bc970…c54c); see docs/RADIO-CONTROL.md and docs/RADIO-CONTROL-PROVENANCE.json (RC-12…RC-17,
 * WEB-DATE-01…04).
 *
 * Native: TUTTimeDlg (DFM 6a68bddc…2347) opened by SetDateTime1Click 0x58b2ec; FormActivate 0x4fdc5c fills the ID from the
 * ShortString 0x5bc1e4 (zero-initialised .bss, zero at load; OKBtnClick is the only recovered writer, the pointer cell
 * 0x5b5d98 is loaded at eight other unverified sites, no indirect-alias proof) and the date/time from the shared record;
 * OKBtnClick 0x4fdf0c writes the ID first (empty →
 * ShortString 0x4fe078 'UNKNOWN', otherwise at most 18 characters), then parses the date (StrToDate 0x40e92c → ScanDate
 * 0x40e3e8) and the time (0x48647c with the tokenizer 0x48690c). A parse exception keeps the dialog open with the ID
 * already written; Cancel writes nothing. The radio hook 0x565ab0 exits while the TRadioLab activated byte (+0x4d5) is 0.
 *
 * Web (not native claims): the item is offered from exercise entry until activation (WEB-DATE-01, the bundled-resource
 * boundary instead of Run/CD-ROM; WEB-DATE-01 never reads or writes item454Enabled, which RC-08 sets after the first switch
 * On); printable ASCII only, date/time ≤ 32 and ID ≤ 18 characters refused at the field; time parts are whole numbers only
 * and the result must lie in the radio clock domain (WEB-DATE-02). The date scanner is an exact integer port; for the
 * admitted full-year path the instant is exact integer seconds. The x87 Extended path, the
 * host time zone/Now and the env+0x382b offset are not reproduced and no error bound against the native result is claimed.
 *
 * Pure state only: no React, timers or clock reads. */
import {parseDelphiFloat} from './radioAntenna';
import {RADIO_CLOCK_CONSTANTS} from './radioClock';

/** TEnvironment1 DFM (RCDATA SHA-256 3a7a6a61…e6b3) SetDateTime1.Caption; DFM Enabled=False. */
export const SET_DATE_MENU_CAPTION='Set Observation &Date/Time, ID...';
/** TUTTimeDlg DFM (RCDATA SHA-256 6a68bddc…2347) captions and hints. TimeLbl keeps its trailing space. */
export const UT_DIALOG_CAPTIONS=Object.freeze({
 form:'Set Date/Time, ID',id:'ID # of Unknown Object',idSource:'(From Lab Sheet or Instructor)',
 date:'Observation Date',dateFormat:'YYYY/MM/DD',time:'Universal Time (UTC) ',timeFormat:'HH:MM:SS',
 idHint:'Get ID from lab sheet or instructor',dateHint:'Enter full (4 digit) year',timeHint:'Use 24 hr format.',
});
/** OKBtnClick 0x4fdf95: ShortString 0x4fe078 (7 characters) copied when IDEd is empty. */
export const UNKNOWN_ID='UNKNOWN';
/** IDEd.MaxLength (DFM) and the ShortString[18] copy at 0x4fdf8c (cl = 0x12). */
export const ID_MAX_LENGTH=18;
/** WEB-DATE-02 browser bounds. */
export const RADIO_DATE_WEB_LIMITS=Object.freeze({
 /** Date and time field length (the DFM sets no MaxLength there; browser bound). */
 fieldMaxLength:32,
 /** Largest |time part| accepted (browser bound; the native path has no range check). */
 timePartMagnitude:1_000_000,
 /** The radio clock domain in whole seconds: 1900-01-01T00:00:00Z … 2099-12-31T23:59:59Z. */
 minUTMS:RADIO_CLOCK_CONSTANTS.minUTMS,
 maxUTMS:RADIO_CLOCK_CONSTANTS.maxUTMS-999,
});

/** Month lengths 0x5ae83c (common) and 0x5ae854 (leap), UInt16[12] typed-decoded (PHASE0-CALENDAR-TYPED-CELLS). */
const MONTH_DAYS=[[31,28,31,30,31,30,31,31,30,31,30,31],[31,29,31,30,31,30,31,31,30,31,30,31]] as const;
/** IsLeapYear 0x40d17c (static reading, G1): divisible by 4 and (not by 100 or by 400). */
export const isDialogLeapYear=(year:number)=>year%4===0&&(year%100!==0||year%400===0);

export type DialogDateResult=Readonly<
 |{status:'ok';year:number;month:number;day:number}
 /** Native EConvertError (StrToDate 0x40e92c): syntax, text after the date, or TryEncodeDate 0x40d1b8 refused. */
 |{status:'error';reason:'syntax'|'trailing'|'calendar'}
 /** Two-number dates and years of ≤ 2 digits take the host year (CurrentYear 0x40d4cc, window 0x5ae838): not reproduced.
  * Refused as a whole; this also covers some forms the native scanner rejects whatever the host year (with two numbers
  * ScanDate 0x40e5c8..0x40e5f3 puts the first in Month, so '2009/06' is always an EConvertError). */
 |{status:'unsupported';reason:'host-year'}
>;
/** ScanDate 0x40e3e8 with the dialog's YMD order and '/' separator. Integer port: SkipSpace 0x40e0d8 skips ASCII 0x20 only;
 * ScanNumber 0x40e0fc reads digits while the value is below 1000 (leading zeros allowed); ScanChar 0x40e268 skips spaces
 * before the separator; after the third number one optional '/' and spaces; StrToDate requires the whole text consumed.
 * The era (0x40e724 'e') and FarEast (0x40e730 'ddd') branches do not apply to the forced format (G1). */
export function scanDialogDate(text:string):DialogDateResult{
 let pos=0;
 const skip=()=>{while(pos<text.length&&text[pos]===' ')pos++;};
 const number=():{value:number;digits:number}|null=>{
  skip();const start=pos;let value=0;
  while(pos<text.length&&text[pos]>='0'&&text[pos]<='9'&&value<1000){value=value*10+(text.charCodeAt(pos)-48);pos++;}
  return pos>start?{value,digits:pos-start}:null;
 };
 const separator=()=>{skip();if(pos<text.length&&text[pos]==='/'){pos++;return true;}return false;};
 const y=number();if(!y||!separator())return Object.freeze({status:'error',reason:'syntax'});
 const m=number();if(!m)return Object.freeze({status:'error',reason:'syntax'});
 let d:{value:number;digits:number}|null=null;
 const third=separator();
 if(third){d=number();if(!d)return Object.freeze({status:'error',reason:'syntax'});}
 separator();skip();
 // TryStrToDate 0x40e960: Length(S) < Pos, whatever the year source.
 if(pos<text.length)return Object.freeze({status:'error',reason:'trailing'});
 if(!d||y.digits<=2)return Object.freeze({status:'unsupported',reason:'host-year'});
 const year=y.value,month=m.value,day=d.value;
 if(year<1||year>9999||month<1||month>12||day<1||day>MONTH_DAYS[isDialogLeapYear(year)?1:0][month-1])return Object.freeze({status:'error',reason:'calendar'});
 return Object.freeze({status:'ok',year,month,day});
}

export type DialogTimeResult=Readonly<
 |{status:'ok';seconds:number}
 /** spelling: a token outside the existing FLOAT_TEXT grammar (parseDelphiFloat); form: not a plain integer; large: |part|
  * above the bound. Browser refusals only: whether the original accepts or rejects the text is not claimed. */
 |{status:'unsupported';reason:'spelling'|'form'|'large'}
>;
const INTEGER_TOKEN=/^ *[+-]?\d+ *$/;
/** 0x48647c with the tokenizer 0x48690c: each token strips leading spaces and separators, ends at the next separator, is
 * converted, and is deleted with one more character. Hours by ':', minutes by ':' and seconds by ' ' while text remains
 * (missing parts are 0); ((s/60)+m)/60+h, plus 12 when the remainder is exactly 'PM' (0x486588); no range check; any other
 * remainder is ignored. Here every part must be a whole number, so the total is exact integer seconds. */
export function parseDialogTime(text:string):DialogTimeResult{
 let rest=text;
 const token=(sep:string):number|DialogTimeResult=>{
  let i=0;while(i<rest.length&&(rest[i]===' '||rest[i]===sep))i++;
  rest=rest.slice(i);
  const at=rest.indexOf(sep),len=at<0?rest.length:at,part=rest.slice(0,len);
  rest=rest.slice(len+1);
  if(parseDelphiFloat(part)===null)return Object.freeze({status:'unsupported',reason:'spelling'});
  if(!INTEGER_TOKEN.test(part))return Object.freeze({status:'unsupported',reason:'form'});
  const value=Number(part.trim());
  if(Math.abs(value)>RADIO_DATE_WEB_LIMITS.timePartMagnitude)return Object.freeze({status:'unsupported',reason:'large'});
  return value===0?0:value;
 };
 const h=token(':');if(typeof h!=='number')return h;
 let m=0,s=0;
 if(rest.length>0){const v=token(':');if(typeof v!=='number')return v;m=v;}
 if(rest.length>0){const v=token(' ');if(typeof v!=='number')return v;s=v;}
 return Object.freeze({status:'ok',seconds:h*3600+m*60+s+(rest==='PM'?43200:0)});
}

/** Days from 1970-01-01 of a proleptic Gregorian date (exact integer arithmetic, any year 1…9999). */
function daysFromCivil(year:number,month:number,day:number):number{
 const y=month<=2?year-1:year,era=Math.floor(y/400),yoe=y-era*400;
 const doy=Math.floor((153*(month+(month>2?-3:9))+2)/5)+day-1,doe=yoe*365+Math.floor(yoe/4)-Math.floor(yoe/100)+doy;
 return era*146097+doe-719468;
}

export type DialogEntryFailure=Readonly<
 |{field:'date';kind:'error';reason:'syntax'|'trailing'|'calendar'}
 |{field:'date';kind:'unsupported';reason:'host-year'}
 |{field:'time';kind:'unsupported';reason:'spelling'|'form'|'large'}
 |{field:'range';kind:'unsupported';reason:'domain'}
>;
export type DialogEntryResult=Readonly<{status:'ok';utMs:number}|{status:'failed';failure:DialogEntryFailure}>;
/** Date, then time (OKBtnClick order), then the browser domain (WEB-DATE-02). The instant is UT milliseconds of whole
 * seconds: date days × 86400 + time seconds, exactly. */
export function dialogEntryInstant(dateText:string,timeText:string):DialogEntryResult{
 const fail=(failure:DialogEntryFailure):DialogEntryResult=>Object.freeze({status:'failed',failure:Object.freeze(failure)});
 const date=scanDialogDate(dateText);
 if(date.status==='error')return fail({field:'date',kind:'error',reason:date.reason});
 if(date.status==='unsupported')return fail({field:'date',kind:'unsupported',reason:date.reason});
 const time=parseDialogTime(timeText);
 if(time.status==='unsupported')return fail({field:'time',kind:'unsupported',reason:time.reason});
 const utMs=(daysFromCivil(date.year,date.month,date.day)*86400+time.seconds)*1000;
 if(utMs<RADIO_DATE_WEB_LIMITS.minUTMS||utMs>RADIO_DATE_WEB_LIMITS.maxUTMS)return fail({field:'range',kind:'unsupported',reason:'domain'});
 return Object.freeze({status:'ok',utMs});
}

const pad=(n:number,w=2)=>String(n).padStart(w,'0');
/** FormActivate 0x4fdc5c prefill: FormatDateTime of Trunc64 (0x40370c, no rounding) as YYYY/MM/DD and hh:mm:ss. UT
 * milliseconds are negative before 1970; flooring the seconds drops the fraction toward the earlier second either side. */
export function dialogPrefill(utMs:number):Readonly<{date:string;time:string}>{
 if(typeof utMs!=='number'||!Number.isFinite(utMs))throw new Error('Invalid dialog prefill instant');
 const d=new Date(Math.floor(utMs/1000)*1000);
 return Object.freeze({date:`${pad(d.getUTCFullYear(),4)}/${pad(d.getUTCMonth()+1)}/${pad(d.getUTCDate())}`,time:`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`});
}

export type RadioDateField='id'|'date'|'time';
export type RadioDateDialog=Readonly<{id:string;date:string;time:string;error:DialogEntryFailure|null}>;
export type RadioDateState=Readonly<{
 /** ShortString 0x5bc1e4 for this window only ('' = never written, the zero-initialised .bss value at load; no historical
  * or startup ID is claimed). Nothing reads it. */
 storedId:string;
 /** WEB-DATE-01 sticky latch: the antenna activated or the panel window was shown (natively that activates the form even
  * when the web refuses activation for an unsupported option profile). Never cleared in this window. */
 activationReached:boolean;
 dialog:RadioDateDialog|null;
}>;
export const INITIAL_RADIO_DATE:RadioDateState=Object.freeze({storedId:'',activationReached:false,dialog:null});

export type RadioDateGateInput=Readonly<{exerciseEntered:boolean;antennaActivated:boolean;panelShown:boolean;utMs:number|null;stoppedAtEnd:boolean}>;
export type RadioDateRefusal='exercise-required'|'activation-reached'|'ut-required'|'ut-domain';
export type RadioDateGate=Readonly<{status:'available';utMs:number}|{status:'refused';reason:RadioDateRefusal}>;
/** WEB-DATE-01: available iff the exercise is entered, activation has not been reached (latch or current state), a UT is
 * applied and it lies in the domain without a range-end stop. */
export function radioDateGate(s:RadioDateState,input:RadioDateGateInput):RadioDateGate{
 const refuse=(reason:RadioDateRefusal):RadioDateGate=>Object.freeze({status:'refused',reason});
 if(!input.exerciseEntered)return refuse('exercise-required');
 if(s.activationReached||input.antennaActivated||input.panelShown)return refuse('activation-reached');
 if(input.utMs===null)return refuse('ut-required');
 if(input.stoppedAtEnd||!Number.isInteger(input.utMs)||input.utMs<RADIO_CLOCK_CONSTANTS.minUTMS||input.utMs>RADIO_CLOCK_CONSTANTS.maxUTMS)return refuse('ut-domain');
 return Object.freeze({status:'available',utMs:input.utMs});
}

export type RadioDateOutcome=
 |'activation-latched'|'unchanged'|'opened'|'already-open'|'refused'|'no-dialog'|'error-open'
 |'field-edited'|'field-too-long'|'field-not-ascii'|'entry-failed'|'applied'|'gate-closed'|'error-dismissed'|'cancelled';
export type RadioDateTransition=Readonly<{state:RadioDateState;outcome:RadioDateOutcome;changed:boolean;
 /** 'applied': the accepted UT instant (whole seconds). */utMs?:number;
 /** 'refused' and 'gate-closed': the gate reason. */reason?:RadioDateRefusal}>;
const keep=(s:RadioDateState,outcome:RadioDateOutcome,reason?:RadioDateRefusal):RadioDateTransition=>Object.freeze({state:s,outcome,changed:false,...(reason?{reason}:{})});
const next=(s:RadioDateState,outcome:RadioDateOutcome,extra:Partial<Pick<RadioDateTransition,'utMs'|'reason'>>={}):RadioDateTransition=>
 Object.freeze({state:Object.freeze({...s}),outcome,changed:true,...extra});

export function markRadioActivationReached(s:RadioDateState):RadioDateTransition{
 return s.activationReached?keep(s,'unchanged'):next({...s,activationReached:true},'activation-latched');
}
/** SetDateTime1Click 0x58b2ec creates a fresh form on every open: the prefill is taken from the scenario instant now and the
 * ID from the stored ShortString. */
export function openRadioDateDialog(s:RadioDateState,gate:RadioDateGate):RadioDateTransition{
 if(s.dialog)return keep(s,'already-open');
 if(gate.status==='refused')return keep(s,'refused',gate.reason);
 const prefill=dialogPrefill(gate.utMs);
 return next({...s,dialog:Object.freeze({id:s.storedId,date:prefill.date,time:prefill.time,error:null})},'opened');
}
const PRINTABLE_ASCII=/^[\x20-\x7e]*$/;
/** WEB-DATE-02: an edit outside printable ASCII or the field bound is refused and the field keeps its text. */
export function editRadioDateField(s:RadioDateState,field:RadioDateField,text:string):RadioDateTransition{
 if(!s.dialog)return keep(s,'no-dialog');
 if(s.dialog.error)return keep(s,'error-open');
 if(typeof text!=='string'||!['id','date','time'].includes(field))throw new Error('Invalid date dialog edit');
 if(text.length>(field==='id'?ID_MAX_LENGTH:RADIO_DATE_WEB_LIMITS.fieldMaxLength))return keep(s,'field-too-long');
 if(!PRINTABLE_ASCII.test(text))return keep(s,'field-not-ascii');
 if(s.dialog[field]===text)return keep(s,'field-edited');
 return next({...s,dialog:Object.freeze({...s.dialog,[field]:text})},'field-edited');
}
/** OKBtnClick 0x4fdf0c order: refused while the error box is open; the gate is checked again (refused: nothing is written
 * and the dialog closes); the ID is written; then date, time and the browser range; success closes the dialog. */
export function confirmRadioDateDialog(s:RadioDateState,gate:RadioDateGate):RadioDateTransition{
 const d=s.dialog;
 if(!d)return keep(s,'no-dialog');
 if(d.error)return keep(s,'error-open');
 if(gate.status==='refused')return next({...s,dialog:null},'gate-closed',{reason:gate.reason});
 const storedId=d.id===''?UNKNOWN_ID:d.id;
 const entry=dialogEntryInstant(d.date,d.time);
 if(entry.status==='failed')return next({...s,storedId,dialog:Object.freeze({...d,error:entry.failure})},'entry-failed');
 return next({...s,storedId,dialog:null},'applied',{utMs:entry.utMs});
}
export function dismissRadioDateError(s:RadioDateState):RadioDateTransition{
 if(!s.dialog?.error)return keep(s,'unchanged');
 return next({...s,dialog:Object.freeze({...s.dialog,error:null})},'error-dismissed');
}
/** Cancel writes nothing; while the error box is open only the box can be answered. */
export function cancelRadioDateDialog(s:RadioDateState):RadioDateTransition{
 if(!s.dialog)return keep(s,'no-dialog');
 if(s.dialog.error)return keep(s,'error-open');
 return next({...s,dialog:null},'cancelled');
}
