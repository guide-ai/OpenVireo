// Pulsar Parameters utility: TPlsrDataForm1 (VMT 0x56871c) and its Find dialog TSearchInput1 (VMT 0x5682f0), recovered
// statically from VIREO 1.504 CLEA_VEO.exe (SHA-256 781bc970…c54c); see docs/RADIO-PULSAR-PARAMETERS.md (PP-01..PP-09,
// WEB-PP-*). Pure state only: no React, file I/O, clock or catalog ownership. The record values are catalog references:
// nothing here writes a measurement, notebook, session or receiver state.
import {parseDelphiFloat,roundHalfEven,skyCoordsFieldsFor,formatFixed,SKY_COORDS_FIELD_MAX_LENGTH} from './radioAntenna';
import {formatExponent} from './pulsarRecording';
import type {PulsarCatalog,PulsarRecord} from './radioPulsarCatalog';

/** Extended (80-bit) magnitude from its 64-bit significand and biased exponent, rounded once to binary64. */
const ext=(significand:bigint,biasedExponent:number)=>Number(significand)*2**(biasedExponent-16383-63);

export const PULSAR_PARAMETERS_CONSTANTS=Object.freeze({
 /** Single 2400000 at 0x5690c0 (PEpoch display), 0x569194 (Date display) and 0x5695e8 (Update add). Not 2400000.5. */
 mjdOffset:Math.fround(2400000),
 /** Single 0x569198: days to seconds in the derived period (fmul at 0x569127). */
 secondsPerDay:Math.fround(86400),
 /** Extended {0x28f5c28f,0xf5c28f5c,0x3ff9} written to form+0x452 by FormActivate 0x568dbb..0x568dcf and Reset
  * 0x569627..0x56963b (electrons/cm³, DnstyEd hint). Its nearest binary64 is 0.03: the 11 dropped significand bits
  * (0x28f) start with 0, so there is no tie or double rounding. */
 defaultDensity:ext(0xf5c28f5c28f5c28fn,0x3ff9),
 /** Extended 0x4000:80000000:00000000 = 2.0 pushed at 0x567fad..0x567fb7 for the picker call in PulsarList1Click. */
 openLimit:2,
 /** TSearchInput1 stored query ShortString[12] at +0x37c (cl = 0xc at 0x568552 and 0x56862b). */
 queryMaxLength:12,
});

/** WEB-PP-* bounds and choices (not recovered behaviour). */
export const PULSAR_PARAMETERS_WEB_POLICY=Object.freeze({
 /** WEB-PP-FIND-01: Find draft bound; a longer edit is refused, never truncated. */
 findDraftMaxLength:64,
 /** WEB-PP-UPD-01: Date/Density edit bound, the parseDelphiFloat grammar bound. The DFM sets no MaxLength. */
 fieldMaxLength:SKY_COORDS_FIELD_MAX_LENGTH,
 /** WEB-PP-UPD-02: fixed-format echoes need |v| < 1e15; FloatToStrF(ffFixed, 18) behaviour beyond is not claimed. */
 fixedMagnitudeLimit:1e15,
 /** WEB-PP-FIND-03: env+0x37ce (identification mode read by Find FormActivate 0x5685e3) is not supplied by any web
  * owner, so the first-open mode is the explicit web choice 1 (B1950). Native maps a 0 byte to 1 (0x5685f0..0x5685f4);
  * no compiled default is claimed here. */
 webInitialFindMode:1 as 1|2,
});

/** Exact DFM captions of TPlsrDataForm1 (RCDATA TPLSRDATAFORM1, SHA-256 42e248a8…9f9b), raw with '&' accelerators. */
export const PULSAR_PARAMETERS_CAPTIONS=Object.freeze({
 form:'Pulsar Parameters',b1950:'B1950 Name:',j2000:'J2000 Name:',ra:'J2000 Right Ascension:',dec:'Declination:',
 hours:'Hrs',minutes:'Min',seconds:'Sec',degrees:'Deg',
 period:'P (Secs):',periodDot:'PDot (S/S):',epoch:'PEpoch (MJD):',sky:'Sky Bkgrnd (K):',dm:'Dispersion (pc/cm^3):',width:'Pls Width (ms):',
 flux:'Time Averaged Flux Densities (mJy):',s400:'S400:',s600:'S600:',s1400:'S1400:',
 derived:'Derived Quantities',date:'Date (MJD):',density:'Electron Density:',derivedPeriod:'Period (S):',distance:'Distance (PC):',
 next:'&Next',prev:'&Prev',update:'&Update',reset:'&Reset',file:'&File',find:'Find &Pulsar...',exit:'&Exit',help:'&Help',
 /** Hints (ShowHint=True only on these two edits). */
 dateHint:'Julian Date minus 2,400,000',densityHint:'Electrons/cm^3',
});
/** Exact DFM captions of TSearchInput1 (RCDATA TSEARCHINPUT1, SHA-256 c80e48ad…cf21). The compiled NameEd text
 * '0152-1637' is always overwritten by FormActivate 0x56868c and is never shown. */
export const PULSAR_FIND_CAPTIONS=Object.freeze({form:'Find Pulsar Data',name:'Pulsar Name:',type:'Type',b1950:'B1950 Name',j2000:'J2000 Name',ok:'&Ok',cancel:'&Cancel'});

export type PulsarFindMode=0|1|2;
/** TSearchInput1 +0x37c (query) and +0x389 (mode byte): FormCreate 0x5686bc writes '' and 0. */
export type PulsarFindMemory=Readonly<{query:string;mode:PulsarFindMode}>;
/** The open Find dialog: NameEd text and the checked radio button (J00RadBtn checked = 2). */
export type PulsarFindDraft=Readonly<{text:string;mode:1|2}>;
/** Local copy of the names the picker put at TRadioLab+0x5f7 (J2000) and +0x5f7+0xd (B1950) at Open. */
export type PulsarSeed=Readonly<{primaryName:string;legacyName:string}>;

export type PulsarSourceField='raHours'|'raMinutes'|'raSeconds'|'decDegrees'|'decMinutes'|'decSeconds'|'period'|'periodDot'|'epoch'|'sky'|'dm'|'width'|'s400'|'s600'|'s1400';
/** Display texts of 0x568e10 for one record; '' marks a field outside the web numeric domain (listed in issues). */
export type PulsarSourceTexts=Readonly<{j2000:string;b1950:string;issues:readonly PulsarSourceField[]}&Record<PulsarSourceField,string>>;
export type PulsarDerivedIssue='no-clock'|'date-domain'|'period-domain'|'density-domain'|'distance-domain';
export type PulsarDerivedTexts=Readonly<{dateText:string;periodText:string;densityText:string;distanceText:string;issues:readonly PulsarDerivedIssue[]}>;
export type PulsarParametersNotice=Readonly<{kind:'not-found';query:string;mode:1|2}|{kind:'update-error';field:'date'|'density';text:string}>;

export type PulsarParametersWindow=Readonly<{
 /** Frozen catalog reference owned by this window for its lifetime. */
 catalog:PulsarCatalog;
 /** Record index: stands for both form+0x45c and the shared list cursor (WEB-PP-OWN-01). */
 index:number;
 /** form+0x448 local JD: native Extended (fstp TBYTE 0x568db4/0x569553/0x569620), web binary64 [W] (WEB-PP-NUM-01);
  * null when no clock reading was available (WEB-PP-CLK-01). */
 localJD:number|null;
 /** form+0x452 local electron density: native Extended (10-byte literal 0x568dbb..0x568dcf, fstp TBYTE 0x569594), web binary64 [W]. */
 density:number;
 source:PulsarSourceTexts;
 /** JDEd and DnstyEd texts: written by the derived routines, edited by the learner. */
 dateText:string;
 densityText:string;
 /** PrdEd and DistEd texts from the last derived refresh; never recomputed at render time. */
 periodText:string;
 distanceText:string;
 derivedIssues:readonly PulsarDerivedIssue[];
 updateEnabled:boolean;
 seed:PulsarSeed|null;
 findMemory:PulsarFindMemory;
 find:PulsarFindDraft|null;
 notice:PulsarParametersNotice|null;
 /** WEB-PP-NAV-01: MessageBeep(0x30) at an end becomes this status. */
 boundary:'first'|'last'|null;
}>;

export type PulsarParametersOutcome=
 |'opened'|'reopened'|'modal'|'next'|'previous'|'at-first'|'at-last'
 |'date-edited'|'density-edited'|'field-too-long'|'updated'|'update-disabled'|'date-invalid'|'density-invalid'|'reset'
 |'find-opened'|'find-edited'|'find-too-long'|'find-mode'|'found'|'not-found'|'find-cancelled'|'no-find'
 |'notice-dismissed'|'no-notice'|'exited';
export type PulsarParametersTransition=Readonly<{window:PulsarParametersWindow|null;outcome:PulsarParametersOutcome;changed:boolean}>;

// ----------------------------------------------------------------- numeric helpers (WEB-PP-NUM-01, WEB-PP-FMT-01)
/** FloatToStrF(ffFixed, 18, digits) via 0x486268 under the formatFixed policy, or null outside the web domain. */
function fixedText(value:number,digits:number):string|null{
 return Number.isFinite(value)&&Math.abs(value)<PULSAR_PARAMETERS_WEB_POLICY.fixedMagnitudeLimit?formatFixed(value,digits):null;
}
/** 0x5690c4 period: source.P + source.PDot × ((J − source.PEpoch) × Single 86400), in the listing's order. */
export function pulsarDerivedPeriod(record:PulsarRecord,localJD:number):number{
 return record.x2a+record.x34*((localJD-record.x3e)*PULSAR_PARAMETERS_CONSTANTS.secondsPerDay);
}
/** 0x56919c distance: Single DM ÷ density (fdivr at 0x5691ec), then System.Round 0x403700 (FISTP under the current
 * control word; WEB policy: ties to even, the compiled default word 0x1332), as text. null when the quotient is not
 * finite, the density is 0, or the rounded value is not a safe integer: native outcomes there depend on the runtime
 * control word and are not claimed. */
export function pulsarDerivedDistance(record:PulsarRecord,density:number):number|null{
 if(density===0||!Number.isFinite(density))return null;
 const q=record.s4c/density;if(!Number.isFinite(q))return null;
 const r=roundHalfEven(q);return Number.isSafeInteger(r)?(r===0?0:r):null;
}
/** Display 0x568e10: names, RA/Dec through 0x486bc0 (as skyCoordsFieldsFor), P fixed 12, PDot exponent (5, 2),
 * PEpoch − Single 2400000 fixed 4, Sky fixed 1, DM fixed 2, W50 fixed 1, S400/S600/S1400 fixed 1. */
export function pulsarSourceTexts(record:PulsarRecord):PulsarSourceTexts{
 const coords=skyCoordsFieldsFor({ra:record.ra,dec:record.dec}),issues:PulsarSourceField[]=[];
 const texts={} as Record<PulsarSourceField,string>;
 const put=(field:PulsarSourceField,text:string|null)=>{if(text===null)issues.push(field);texts[field]=text??'';};
 const finite=Number.isFinite(record.ra)&&Number.isFinite(record.dec);
 for(const field of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'] as const)put(field,finite?coords[field]:null);
 put('period',fixedText(record.x2a,12));
 put('periodDot',Number.isFinite(record.x34)?formatExponent(record.x34,5,2):null);
 put('epoch',fixedText(record.x3e-PULSAR_PARAMETERS_CONSTANTS.mjdOffset,4));
 put('sky',fixedText(record.s48,1));put('dm',fixedText(record.s4c,2));put('width',fixedText(record.s50,1));
 put('s400',fixedText(record.s54,1));put('s600',fixedText(record.s58,1));put('s1400',fixedText(record.s5c,1));
 return Object.freeze({j2000:record.primaryName,b1950:record.legacyName,...texts,issues:Object.freeze(issues)});
}
/** Both derived routines, period 0x5690c4 (JDEd, PrdEd) then distance 0x56919c (DnstyEd, DistEd). */
export function pulsarDerivedTexts(record:PulsarRecord,localJD:number|null,density:number):PulsarDerivedTexts{
 const issues:PulsarDerivedIssue[]=[];let dateText='',periodText='';
 if(localJD===null)issues.push('no-clock');
 else{
  const date=fixedText(localJD-PULSAR_PARAMETERS_CONSTANTS.mjdOffset,8);if(date===null)issues.push('date-domain');else dateText=date;
  const period=fixedText(pulsarDerivedPeriod(record,localJD),12);if(period===null)issues.push('period-domain');else periodText=period;
 }
 const densityText=fixedText(density,3);if(densityText===null)issues.push('density-domain');
 const distance=pulsarDerivedDistance(record,density);if(distance===null)issues.push('distance-domain');
 return Object.freeze({dateText,periodText,densityText:densityText??'',distanceText:distance===null?'':String(distance),issues:Object.freeze(issues)});
}

// ----------------------------------------------------------------- transitions
const keep=(w:PulsarParametersWindow|null,outcome:PulsarParametersOutcome):PulsarParametersTransition=>Object.freeze({window:w,outcome,changed:false});
const done=(w:PulsarParametersWindow|null,outcome:PulsarParametersOutcome):PulsarParametersTransition=>Object.freeze({window:w===null?null:Object.freeze({...w}),outcome,changed:true});
const isModal=(w:PulsarParametersWindow)=>w.find!==null||w.notice!==null;
/** Writes the derived texts from the stored local values (the routines overwrite any pending edit). */
const refreshed=(w:PulsarParametersWindow,localJD:number|null,density:number):PulsarParametersWindow=>{
 const d=pulsarDerivedTexts(w.catalog[w.index],localJD,density);
 return {...w,localJD,density,dateText:d.dateText,densityText:d.densityText,periodText:d.periodText,distanceText:d.distanceText,derivedIssues:d.issues};
};
/** 0x568e10 for the current index: source texts, both derived routines, then Update SetEnabled(false) at 0x569094. */
const displayed=(w:PulsarParametersWindow):PulsarParametersWindow=>({...refreshed(w,w.localJD,w.density),source:pulsarSourceTexts(w.catalog[w.index]),updateEnabled:false,boundary:null});
const codePoints=(text:string,max:number)=>Array.from(text).slice(0,max).join('');
/** Pos 0x40640c as used by the callers (result > 0): literal, case-sensitive substring; an empty needle never matches. */
export const pulsarNameContains=(name:string,needle:string)=>needle!==''&&name.includes(needle);

function checkCatalog(catalog:PulsarCatalog){if(!Array.isArray(catalog)||catalog.length===0)throw new Error('Pulsar Parameters needs a non-empty catalog');}
function checkJD(jd:number|null){if(jd!==null&&!Number.isFinite(jd))throw new Error('Invalid local JD');}

/** Copy of the picker hit for the seed (PulsarList1Click 0x567fc8..0x567fd5); null on a miss (0x567fd9 clears the
 * first byte, so Activate and Find see no name). */
export const pulsarSeedFor=(record:PulsarRecord|null):PulsarSeed|null=>
 record===null||record.primaryName===''?null:Object.freeze({primaryName:record.primaryName,legacyName:record.legacyName});

/** WEB-PP-OPEN-01 Open: create the window (FormCreate: Find memory '' / 0) or keep it and its Find memory, then run
 * FormActivate 0x568c4c: with a seed name, scan from the head for the first record whose J2000 name contains it
 * (Pos(sharedName, rec.J2000) > 0 at 0x568ceb), else the head; local JD := seedJD (stands for the date getter 0x487bcc),
 * density := the compiled literal; display. A different catalog starts a fresh window. */
export function openPulsarParameters(prev:PulsarParametersWindow|null,catalog:PulsarCatalog,seed:PulsarSeed|null,seedJD:number|null):PulsarParametersTransition{
 checkCatalog(catalog);checkJD(seedJD);
 if(prev!==null&&isModal(prev))return keep(prev,'modal');
 const reuse=prev!==null&&prev.catalog===catalog;
 let index=0;
 if(seed!==null&&seed.primaryName!==''){const hit=catalog.findIndex(r=>pulsarNameContains(r.primaryName,seed.primaryName));if(hit>=0)index=hit;}
 const base:PulsarParametersWindow={catalog,index,localJD:seedJD,density:PULSAR_PARAMETERS_CONSTANTS.defaultDensity,source:pulsarSourceTexts(catalog[index]),
  dateText:'',densityText:'',periodText:'',distanceText:'',derivedIssues:[],updateEnabled:false,seed,
  findMemory:reuse&&prev!==null?prev.findMemory:Object.freeze({query:'',mode:0}),find:null,notice:null,boundary:null};
 return done(displayed(base),reuse?'reopened':'opened');
}

/** NextBtnClick 0x569274 / PrevBtnClick 0x5692b4: at the tail/head MessageBeep(0x30) and nothing moves (no wrap);
 * otherwise move and display. */
export function nextPulsar(w:PulsarParametersWindow):PulsarParametersTransition{
 if(isModal(w))return keep(w,'modal');
 if(w.index>=w.catalog.length-1)return done({...w,boundary:'last'},'at-last');
 return done(displayed({...w,index:w.index+1}),'next');
}
export function previousPulsar(w:PulsarParametersWindow):PulsarParametersTransition{
 if(isModal(w))return keep(w,'modal');
 if(w.index<=0)return done({...w,boundary:'first'},'at-first');
 return done(displayed({...w,index:w.index-1}),'previous');
}

/** JDEdChange 0x5695ec / DnstyEdChange 0x569670: Update SetEnabled(true) (and Default(true) via 0x43fb98). Edits
 * over the web bound are refused. */
function editField(w:PulsarParametersWindow,field:'dateText'|'densityText',text:string,outcome:'date-edited'|'density-edited'):PulsarParametersTransition{
 if(isModal(w))return keep(w,'modal');
 if(typeof text!=='string'||text.length>PULSAR_PARAMETERS_WEB_POLICY.fieldMaxLength)return keep(w,'field-too-long');
 return done({...w,[field]:text,updateEnabled:true,boundary:null},outcome);
}
export const editPulsarDate=(w:PulsarParametersWindow,text:string)=>editField(w,'dateText',text,'date-edited');
export const editPulsarDensity=(w:PulsarParametersWindow,text:string)=>editField(w,'densityText',text,'density-edited');

/** UpdtBtnClick 0x5694f8. A non-empty Date text is converted and stored at once (StrToFloat + Single 2400000); a
 * non-empty Density text is converted and stored separately; then both derived routines and SetEnabled(false). There
 * is no local handler: a Density failure after a stored Date keeps that Date, skips the refresh (the texts stay, the
 * derived texts are stale) and leaves Update enabled. WEB: the failure opens the update-error box. */
export function updatePulsarDerived(w:PulsarParametersWindow):PulsarParametersTransition{
 if(isModal(w))return keep(w,'modal');
 if(!w.updateEnabled)return keep(w,'update-disabled');
 let localJD=w.localJD,density=w.density;
 if(w.dateText.length>0){
  const v=parseDelphiFloat(w.dateText);
  if(v===null)return done({...w,boundary:null,notice:Object.freeze({kind:'update-error',field:'date',text:w.dateText})},'date-invalid');
  localJD=v+PULSAR_PARAMETERS_CONSTANTS.mjdOffset;
 }
 if(w.densityText.length>0){
  const v=parseDelphiFloat(w.densityText);
  if(v===null)return done({...w,localJD,boundary:null,notice:Object.freeze({kind:'update-error',field:'density',text:w.densityText})},'density-invalid');
  density=v;
 }
 return done({...refreshed(w,localJD,density),updateEnabled:false,boundary:null},'updated');
}
/** RSetBtnClick 0x56960c: local JD := clock reading, density := compiled literal, both derived routines, Update
 * SetEnabled(false) and Default(false). */
export function resetPulsarDerived(w:PulsarParametersWindow,seedJD:number|null):PulsarParametersTransition{
 checkJD(seedJD);
 if(isModal(w))return keep(w,'modal');
 return done({...refreshed(w,seedJD,PULSAR_PARAMETERS_CONSTANTS.defaultDensity),updateEnabled:false,boundary:null},'reset');
}

/** FindPulsar1Click 0x5692f4 shows the dialog; its FormActivate 0x5685bc runs: an empty stored query takes the mode
 * from env+0x37ce (web: PULSAR_PARAMETERS_WEB_POLICY.webInitialFindMode) and the seed's B1950 (mode ≠ 2) or J2000 name,
 * both written to the stored query/mode; a non-empty stored query and its mode are kept. The edit shows the stored
 * query; J2000 is checked when the mode is 2. */
export function openPulsarFind(w:PulsarParametersWindow):PulsarParametersTransition{
 if(isModal(w))return keep(w,'modal');
 let memory=w.findMemory;
 if(memory.query===''){
  const mode=PULSAR_PARAMETERS_WEB_POLICY.webInitialFindMode;
  const name=w.seed===null?'':codePoints(mode===2?w.seed.primaryName:w.seed.legacyName,PULSAR_PARAMETERS_CONSTANTS.queryMaxLength);
  memory=Object.freeze({query:name,mode});
 }
 return done({...w,findMemory:memory,boundary:null,find:Object.freeze({text:memory.query,mode:memory.mode===2?2:1})},'find-opened');
}
export function editPulsarFindQuery(w:PulsarParametersWindow,text:string):PulsarParametersTransition{
 if(w.find===null||w.notice!==null)return keep(w,'no-find');
 if(typeof text!=='string'||text.length>PULSAR_PARAMETERS_WEB_POLICY.findDraftMaxLength)return keep(w,'find-too-long');
 return done({...w,find:Object.freeze({...w.find,text})},'find-edited');
}
export function choosePulsarFindMode(w:PulsarParametersWindow,mode:1|2):PulsarParametersTransition{
 if(w.find===null||w.notice!==null)return keep(w,'no-find');
 if(mode!==1&&mode!==2)throw new Error('Invalid find mode');
 return done({...w,find:Object.freeze({...w.find,mode})},'find-mode');
}
/** OKBtnClick 0x5684f8: stored query := first 12 characters of the edit (no trim, case fold or prefix), mode := 2 when
 * J2000 is checked, else 1; ModalResult 1. The caller then saves the cursor and scans from the head with
 * Pos(query, mode = 2 ? J2000 : B1950) > 0. A hit is displayed; a miss restores the record (nothing is displayed again,
 * so pending edits stay) and shows the not-found box. */
export function confirmPulsarFind(w:PulsarParametersWindow):PulsarParametersTransition{
 if(w.find===null||w.notice!==null)return keep(w,'no-find');
 const query=codePoints(w.find.text,PULSAR_PARAMETERS_CONSTANTS.queryMaxLength),mode:1|2=w.find.mode===2?2:1;
 const memory=Object.freeze({query,mode}),closed={...w,findMemory:memory,find:null,boundary:null};
 const hit=w.catalog.findIndex(r=>pulsarNameContains(mode===2?r.primaryName:r.legacyName,query));
 if(hit>=0)return done(displayed({...closed,index:hit}),'found');
 return done({...closed,notice:Object.freeze({kind:'not-found',query,mode})},'not-found');
}
/** CnclBtnClick 0x5685b0 only sets ModalResult 2: nothing is committed or scanned. WEB: Escape does the same. */
export function cancelPulsarFind(w:PulsarParametersWindow):PulsarParametersTransition{
 if(w.find===null||w.notice!==null)return keep(w,'no-find');
 return done({...w,find:null},'find-cancelled');
}
export function dismissPulsarNotice(w:PulsarParametersWindow):PulsarParametersTransition{
 return w.notice===null?keep(w,'no-notice'):done({...w,notice:null},'notice-dismissed');
}
/** Exit1Click 0x569234 frees the Find dialog (its query and mode are lost) and closes the form. */
export function exitPulsarParameters(w:PulsarParametersWindow):PulsarParametersTransition{
 return isModal(w)?keep(w,'modal'):done(null,'exited');
}
