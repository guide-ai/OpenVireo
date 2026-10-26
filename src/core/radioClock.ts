/** RA-13 web radio clock scenario: the explicit UT and longitude TRadioLab.ClocktimerTimer (0x5654a8) reads, recovered
 * statically from VIREO 1.504 CLEA_VEO.exe (SHA-256 781bc970…c54c); see docs/RADIO-ANTENNA-PROVENANCE.json (RA-13, RA-15,
 * WEB-CLOCK-01, WEB-TIMER-02).
 *
 * Natively the tick reads SysUtils.Now (host LOCAL time, 0x40d47c) plus the environment offset env+0x382b, and forms
 * JD = optical time zone/24 + TDateTime + 2415018.5 (0x487b64, 0x5ac748). None of those host inputs is represented here:
 * the learner supplies a UT instant explicitly (no default, no host or observatory clock import) and the browser forms
 * JD = 2440587.5 + ms/86400000 in binary64, the policy siteClockReadingMS already uses. LST is the existing port of
 * 0x4881ac (localSiderealHours). No x87 Extended evaluation and no native error bound are claimed.
 *
 * Pure state only: no React, timers or performance clock. Callers inject the performance time. */
import {localSiderealHours,parseClockUTC} from './siteClock';

/** Extended (80-bit) magnitude from its 64-bit significand and biased exponent, rounded once to binary64. */
const ext=(significand:bigint,biasedExponent:number)=>Number(significand)*2**(biasedExponent-16383-63);

export const RADIO_CLOCK_CONSTANTS=Object.freeze({
 /** RA-03 defaults 0x5a8f55..0x5a8f83: record+0x8f4 (env+0x3789) Extended {0x7905f5c4,0xb25e34f1,0xbfff}, sign bit set.
  * East-positive radians (LST argument at 0x565562..0x56557f). Exact binary64 -1.393499963671317 (-0x1.64bc69e2f20bfp+0),
  * coordinator-verified from the PE operands. A compiled option an options file can change; no site name is claimed. */
 compiledLongitudeRadians:-ext(0xb25e34f17905f5c4n,0x3fff),
 /** 0x5ac748..0x5ac790: Extended {0,0xd2228400,0x4013} (1721424.5) plus Single 0x5ac798 (693594) on the branch where Now is
  * below Single 0x5ac794 (100000). JD of TDateTime 0. Documented only: which host branch ran is not established. */
 jdOfTDateTimeZero:ext(0xd222840000000000n,0x4013)+693594,
 /** WEB-CLOCK-01: JD of the Unix epoch, the existing explicit UTC → JD policy. */
 unixEpochJD:2440587.5,
 msPerDay:86_400_000,
 /** RA-15: TTimer constructor 0x448e6c writes Interval (+0x30) := 1000 at 0x448e8b; RTTI 0x4459b4 default 1000. Only the
  * compiled default: no WM_TIMER equivalence and no exhaustive whole-program Interval-writer proof. */
 nominalIntervalMs:1000,
 /** parseClockUTC domain: 1900-01-01T00:00:00Z … 2099-12-31T23:59:59.999Z (running milliseconds included). */
 minUTMS:Date.UTC(1900,0,1),
 maxUTMS:Date.UTC(2099,11,31,23,59,59,999),
 /** Bound for the UT draft text (the accepted form has 19 characters). */
 draftMaxLength:80,
});

export type RadioClockReading=Readonly<{utMs:number;jd:number;lstHours:number}>;

/** Whether a UT instant (ms) lies in the supported scenario domain. */
export const isRadioClockInstant=(utMs:unknown):utMs is number=>
 typeof utMs==='number'&&Number.isInteger(utMs)&&utMs>=RADIO_CLOCK_CONSTANTS.minUTMS&&utMs<=RADIO_CLOCK_CONSTANTS.maxUTMS;
export const isRadioLongitude=(lon:unknown):lon is number=>typeof lon==='number'&&Number.isFinite(lon)&&Math.abs(lon)<=Math.PI;

/** One clock reading: JD (WEB-CLOCK-01) and LST through the existing 0x4881ac port. Throws outside the domain. */
export function radioClockReading(utMs:number,longitudeRadians:number):RadioClockReading{
 if(!isRadioClockInstant(utMs))throw new Error('Unsupported radio clock instant');
 if(!isRadioLongitude(longitudeRadians))throw new Error('Unsupported radio clock longitude');
 const k=RADIO_CLOCK_CONSTANTS,jd=k.unixEpochJD+utMs/k.msPerDay;
 return Object.freeze({utMs,jd,lstHours:localSiderealHours(jd,longitudeRadians)});
}
/** Shape check for readings handed to the antenna (a refused reading changes nothing there). */
export function isRadioClockReading(r:unknown):r is RadioClockReading{
 if(!r||typeof r!=='object')return false;const v=r as RadioClockReading;
 return isRadioClockInstant(v.utMs)&&typeof v.jd==='number'&&Number.isFinite(v.jd)&&typeof v.lstHours==='number'&&Number.isFinite(v.lstHours)&&v.lstHours>=0&&v.lstHours<=24;
}

/** Temporary web scenario owned by the radio route. Phase 1 item 1.5: Save investigation keeps its applied inputs and folded
 * time (radioClockSnapshot); a restore brings it back paused. */
export type RadioClockScenario=Readonly<{
 /** Applied UT text (parseClockUTC form) or null: nothing supplied, so no clock tick can run. */
 utc:string|null;
 draftUTC:string;
 /** Applied longitude or null: the compiled value must be chosen explicitly. */
 longitudeRadians:number|null;
 /** Scenario milliseconds elapsed after utc, folded at each pause or freeze. */
 elapsedMS:number;
 /** Start/Pause intent. */
 running:boolean;
 /** Performance time the running segment started at; null while paused or frozen by a host operation. */
 anchorPerfMS:number|null;
 /** Generation token: incremented whenever the applied inputs change, so late callbacks are ignored. */
 run:number;
 /** The running time passed maxUTMS: the scenario stopped there and refuses readings until a UT is applied again. */
 limit:'domain'|null;
}>;
export const INITIAL_RADIO_CLOCK_SCENARIO:RadioClockScenario=Object.freeze({utc:null,draftUTC:'',longitudeRadians:null,elapsedMS:0,running:false,anchorPerfMS:null,run:0,limit:null});

export type RadioClockScenarioOutcome=
 |'draft-edited'|'draft-too-long'|'utc-applied'|'utc-invalid'|'draft-cancelled'|'longitude-applied'|'longitude-unchanged'
 |'started'|'start-needs-utc'|'start-needs-longitude'|'start-domain'|'already-running'|'paused'|'not-running'|'frozen'|'thawed'|'domain-stopped'|'unchanged'
 |'utc-dialog-applied';
export type RadioClockScenarioTransition=Readonly<{scenario:RadioClockScenario;outcome:RadioClockScenarioOutcome;changed:boolean}>;
const keep=(s:RadioClockScenario,outcome:RadioClockScenarioOutcome):RadioClockScenarioTransition=>Object.freeze({scenario:s,outcome,changed:false});
const next=(s:RadioClockScenario,outcome:RadioClockScenarioOutcome):RadioClockScenarioTransition=>Object.freeze({scenario:Object.freeze({...s}),outcome,changed:true});

function checkPerf(perf:number){if(typeof perf!=='number'||!Number.isFinite(perf))throw new Error('Invalid performance time');}
/** Whole milliseconds of the running segment. A performance time before the anchor (a stale or reordered input) counts as
 * 0: scenario time never runs backwards. */
function segmentMS(s:RadioClockScenario,perf:number):number{
 checkPerf(perf);
 return s.running&&s.anchorPerfMS!==null?Math.max(0,Math.floor(perf-s.anchorPerfMS)):0;
}
/** Folds the running segment into elapsedMS (pause, freeze). */
const fold=(s:RadioClockScenario,perf:number)=>s.elapsedMS+segmentMS(s,perf);

export function editRadioClockDraft(s:RadioClockScenario,text:string):RadioClockScenarioTransition{
 if(typeof text!=='string'||text.length>RADIO_CLOCK_CONSTANTS.draftMaxLength)return keep(s,'draft-too-long');
 return text===s.draftUTC?keep(s,'draft-edited'):next({...s,draftUTC:text},'draft-edited');
}
/** Apply the draft UT: validated by parseClockUTC; pauses, restarts elapsed time at 0, clears a domain stop and starts a
 * new generation. An invalid draft changes nothing (the applied UT, if any, stays). Re-applying while running is the web
 * analogue of a host clock jump; the native date dialog 0x58b2ec is ported only before activation, through
 * applyRadioClockDialogUT (radioDateDialog.ts, WEB-DATE-03). */
export function applyRadioClockUTC(s:RadioClockScenario):RadioClockScenarioTransition{
 let ms:number;try{ms=parseClockUTC(s.draftUTC);}catch{return keep(s,'utc-invalid');}
 if(!isRadioClockInstant(ms))return keep(s,'utc-invalid');
 return next({...s,utc:s.draftUTC,elapsedMS:0,running:false,anchorPerfMS:null,run:s.run+1,limit:null},'utc-applied');
}
/** WEB-DATE-03: the UT accepted by Set Date/Time, ID OK (whole seconds, in the domain) becomes the applied UT and draft;
 * elapsed time restarts at 0, a range-end stop is cleared and a new generation starts. The Start/Pause intent is kept: a
 * running, anchored scenario re-anchors at `perf`, a frozen one (host operation) stays unanchored until the thaw. The
 * longitude is untouched. The native Now₁/Now₂ delta (0x487b4c/0x487b64) and env+0x382b offset are not modelled. Throws
 * on a fractional-second or out-of-domain instant. */
export function applyRadioClockDialogUT(s:RadioClockScenario,utMs:number,perf:number):RadioClockScenarioTransition{
 checkPerf(perf);
 if(!isRadioClockInstant(utMs)||utMs%1000!==0)throw new Error('Unsupported radio date dialog instant');
 const utc=new Date(utMs).toISOString().slice(0,19);
 return next({...s,utc,draftUTC:utc,elapsedMS:0,anchorPerfMS:s.running&&s.anchorPerfMS!==null?perf:null,run:s.run+1,limit:null},'utc-dialog-applied');
}
export function cancelRadioClockDraft(s:RadioClockScenario):RadioClockScenarioTransition{
 const draftUTC=s.utc??'';return draftUTC===s.draftUTC?keep(s,'draft-cancelled'):next({...s,draftUTC},'draft-cancelled');
}
/** Explicit action: use the compiled RA-03 longitude. */
export function applyCompiledRadioLongitude(s:RadioClockScenario):RadioClockScenarioTransition{
 const lon=RADIO_CLOCK_CONSTANTS.compiledLongitudeRadians;
 if(s.longitudeRadians===lon)return keep(s,'longitude-unchanged');
 return next({...s,longitudeRadians:lon,run:s.run+1},'longitude-applied');
}
/** Scenario UT now (ms), or null when no UT is applied. May lie beyond maxUTMS; readRadioClock reports that. */
export function radioClockInstant(s:RadioClockScenario,perf:number):number|null{
 const base=s.utc===null?null:parseClockUTC(s.utc);
 return base===null?null:base+fold(s,perf);
}
export type RadioClockRead=Readonly<
 |{status:'unsupplied'}
 |{status:'domain';utMs:number}
 |{status:'ok';reading:RadioClockReading}
>;
/** Current reading of the scenario: unsupplied without UT or longitude; domain when the time is outside the supported
 * range (or the scenario stopped there). Nothing is clamped. */
export function readRadioClock(s:RadioClockScenario,perf:number):RadioClockRead{
 const utMs=radioClockInstant(s,perf);
 if(utMs===null||s.longitudeRadians===null)return Object.freeze({status:'unsupplied'});
 if(s.limit==='domain'||!isRadioClockInstant(utMs))return Object.freeze({status:'domain',utMs});
 return Object.freeze({status:'ok',reading:radioClockReading(utMs,s.longitudeRadians)});
}
export function startRadioClock(s:RadioClockScenario,perf:number):RadioClockScenarioTransition{
 checkPerf(perf);
 if(s.running)return keep(s,'already-running');
 if(s.utc===null)return keep(s,'start-needs-utc');
 if(s.longitudeRadians===null)return keep(s,'start-needs-longitude');
 if(readRadioClock(s,perf).status!=='ok')return keep(s,'start-domain');
 return next({...s,running:true,anchorPerfMS:perf},'started');
}
/** Whether folding the running segment now would pass maxUTMS (the scenario then stops there instead). */
const foldsPastEnd=(s:RadioClockScenario,perf:number)=>s.utc!==null&&parseClockUTC(s.utc)+fold(s,perf)>RADIO_CLOCK_CONSTANTS.maxUTMS;
/** Pause; a pause past the range end stops at the domain like stopRadioClockAtDomain (nothing is clamped). */
export function pauseRadioClock(s:RadioClockScenario,perf:number):RadioClockScenarioTransition{
 checkPerf(perf);
 if(!s.running)return keep(s,'not-running');
 if(s.limit===null&&foldsPastEnd(s,perf))return stopRadioClockAtDomain(s,perf);
 return next({...s,elapsedMS:fold(s,perf),running:false,anchorPerfMS:null},'paused');
}
/** Host project operation: scenario time stops advancing; the Start intent is kept. A freeze past the range end stops at
 * the domain instead, so the later thaw changes nothing. */
export function freezeRadioClock(s:RadioClockScenario,perf:number):RadioClockScenarioTransition{
 checkPerf(perf);
 if(!s.running||s.anchorPerfMS===null)return keep(s,'unchanged');
 if(s.limit===null&&foldsPastEnd(s,perf))return stopRadioClockAtDomain(s,perf);
 return next({...s,elapsedMS:fold(s,perf),anchorPerfMS:null},'frozen');
}
/** End of the host operation: re-anchor now, without catching up the frozen interval. */
export function thawRadioClock(s:RadioClockScenario,perf:number):RadioClockScenarioTransition{
 checkPerf(perf);
 if(!s.running||s.anchorPerfMS!==null)return keep(s,'unchanged');
 return next({...s,anchorPerfMS:perf},'thawed');
}
/** The running time passed maxUTMS: stop and flag the scenario. The antenna keeps its last accepted tick. */
export function stopRadioClockAtDomain(s:RadioClockScenario,perf:number):RadioClockScenarioTransition{
 checkPerf(perf);
 if(s.limit==='domain'&&!s.running)return keep(s,'unchanged');
 return next({...s,elapsedMS:fold(s,perf),running:false,anchorPerfMS:null,limit:'domain'},'domain-stopped');
}
/** Milliseconds until a running, anchored scenario passes maxUTMS (0: readRadioClock reports the domain now), or null when
 * no deadline applies (no UT, paused, frozen by a host operation or already stopped). Uses the same segment as the
 * readings, so 0 is returned exactly when readRadioClock(s,perf) is 'domain': the remainder R is an integer and
 * floor(seg) ≥ R ⇔ seg ≥ R, whose sign R − seg keeps in binary64. */
export function radioClockDomainWaitMS(s:RadioClockScenario,perf:number):number|null{
 checkPerf(perf);
 if(s.utc===null||!s.running||s.anchorPerfMS===null||s.limit!==null)return null;
 const remaining=RADIO_CLOCK_CONSTANTS.maxUTMS+1-parseClockUTC(s.utc)-s.elapsedMS,seg=Math.max(0,perf-s.anchorPerfMS);
 return Math.max(0,Math.ceil(remaining-seg));
}
/** Phase 1 item 1.5 (WEB): the applied inputs and the scenario time an investigation file keeps. Drafts, the run token and
 * the performance anchor are not kept. */
export type RadioClockSnapshot=Readonly<{utc:string|null;longitudeRadians:number|null;elapsedMS:number;limit:'domain'|null}>;
/** The snapshot at `perf` without committing anything: a running (or frozen) scenario is folded exactly as Pause folds it,
 * including the range-end stop. */
export function radioClockSnapshot(s:RadioClockScenario,perf:number):RadioClockSnapshot{
 const p=s.running?pauseRadioClock(s,perf).scenario:s;
 return Object.freeze({utc:p.utc,longitudeRadians:p.longitudeRadians,elapsedMS:p.elapsedMS,limit:p.limit});
}
/** Why a snapshot cannot be restored (null: it can): the UT in the supported form and domain, the longitude, whole elapsed
 * milliseconds, and an instant still in the domain unless the scenario had stopped at the range end. */
export function radioClockSnapshotIssue(c:RadioClockSnapshot):string|null{
 if(c.limit!==null&&c.limit!=='domain')return 'limit';
 if(!Number.isSafeInteger(c.elapsedMS)||c.elapsedMS<0)return 'elapsed';
 if(c.longitudeRadians!==null&&!isRadioLongitude(c.longitudeRadians))return 'longitude';
 if(c.utc===null)return c.elapsedMS===0&&c.limit===null?null:'utc';
 let base:number;try{base=parseClockUTC(c.utc);}catch{return 'utc';}
 if(!isRadioClockInstant(base)||typeof c.utc!=='string'||c.utc.length>RADIO_CLOCK_CONSTANTS.draftMaxLength)return 'utc';
 if(c.limit===null&&base+c.elapsedMS>RADIO_CLOCK_CONSTANTS.maxUTMS)return 'elapsed';
 return null;
}
/** The restored scenario: paused at the saved instant (the Start intent is not restored, so no time runs until Start), the
 * draft equal to the applied UT, a new generation. Throws on a snapshot radioClockSnapshotIssue refuses. */
export function restoredRadioClockScenario(c:RadioClockSnapshot):RadioClockScenario{
 if(radioClockSnapshotIssue(c)!==null)throw new Error('Unsupported radio clock snapshot');
 return Object.freeze({utc:c.utc,draftUTC:c.utc??'',longitudeRadians:c.longitudeRadians,elapsedMS:c.elapsedMS,running:false,anchorPerfMS:null,run:1,limit:c.limit});
}
/** Guarded range-end stop for deadline callbacks and reads: stops only when the given scenario itself has passed the end
 * now, so a stale callback cannot stop a newer Apply, Pause or freeze. */
export function stopRadioClockPastEnd(s:RadioClockScenario,perf:number):RadioClockScenarioTransition{
 return radioClockDomainWaitMS(s,perf)===0?stopRadioClockAtDomain(s,perf):keep(s,'unchanged');
}
