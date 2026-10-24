import {describe,it,expect} from 'vitest';
import {
 INITIAL_RADIO_CLOCK_SCENARIO,RADIO_CLOCK_CONSTANTS,applyCompiledRadioLongitude,applyRadioClockDialogUT,applyRadioClockUTC,cancelRadioClockDraft,editRadioClockDraft,freezeRadioClock,
 isRadioClockReading,pauseRadioClock,radioClockDomainWaitMS,radioClockInstant,radioClockReading,readRadioClock,startRadioClock,stopRadioClockAtDomain,stopRadioClockPastEnd,thawRadioClock,
 type RadioClockScenario,
} from './radioClock';
import {localSiderealHours} from './siteClock';
// Chosen implementation contract (WEB-CLOCK-01, WEB-TIMER-02). These are not oracles for the original runtime: no x87
// evaluation, host local time, environment offset or WM_TIMER delivery is reproduced.
const K=RADIO_CLOCK_CONSTANTS,LON=K.compiledLongitudeRadians;
const applied=(text:string):RadioClockScenario=>{const a=applyRadioClockUTC(editRadioClockDraft(INITIAL_RADIO_CLOCK_SCENARIO,text).scenario);expect(a.outcome).toBe('utc-applied');return applyCompiledRadioLongitude(a.scenario).scenario;};

describe('RA-03/RA-13 constants from their typed operands',()=>{
 it('decodes the compiled radio longitude from the Extended words, rounded once, west negative',()=>{
  // Coordinator-verified exact binary64 -1.393499963671317 = -0x1.64bc69e2f20bfp+0.
  expect(LON).toBe(-1.393499963671317);
  const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,LON);expect(view.getBigUint64(0).toString(16)).toBe('bff64bc69e2f20bf');
  expect(LON).toBe(-Number(0xb25e34f17905f5c4n)*2**-63);
 });
 it('keeps the TDateTime epoch parts, the Unix epoch policy and the 1000 ms TTimer default',()=>{
  expect(K.jdOfTDateTimeZero).toBe(2415018.5);expect(K.unixEpochJD).toBe(2440587.5);expect(K.nominalIntervalMs).toBe(1000);
  expect(new Date(K.maxUTMS).toISOString()).toBe('2099-12-31T23:59:59.999Z');expect(new Date(K.minUTMS).toISOString()).toBe('1900-01-01T00:00:00.000Z');
 });
});

describe('radioClockReading (WEB-CLOCK-01)',()=>{
 it('forms JD from UT in binary64 and LST through the existing 0x4881ac port',()=>{
  const r=radioClockReading(Date.UTC(2000,0,1,12),LON);
  expect(r.jd).toBe(2451545);expect(r.lstHours).toBe(localSiderealHours(2451545,LON));
  expect(radioClockReading(T(1234),LON).jd).toBe(2440587.5+T(1234)/86400000);
  expect(Object.isFrozen(r)).toBe(true);expect(isRadioClockReading(r)).toBe(true);
  // Pinned regression of the chosen contract (not a native witness): about 18.6974 h GMST + (−79.8417°/15) h.
  expect(r.lstHours).toBeCloseTo(13.3746,3);
 });
 it('accepts the domain bounds and refuses one millisecond outside, non-integer instants and bad longitudes',()=>{
  expect(radioClockReading(K.maxUTMS,LON).jd).toBe(K.unixEpochJD+K.maxUTMS/K.msPerDay);
  expect(radioClockReading(K.minUTMS,LON).jd).toBe(2415020.5);
  for(const ms of [K.maxUTMS+1,K.minUTMS-1,NaN,Infinity,T(0.5)])expect(()=>radioClockReading(ms,LON),String(ms)).toThrow('Unsupported radio clock instant');
  for(const lon of [NaN,Infinity,-Infinity,Math.PI+1e-12,-4])expect(()=>radioClockReading(K.minUTMS,lon),String(lon)).toThrow('Unsupported radio clock longitude');
  expect(radioClockReading(K.minUTMS,Math.PI).lstHours).toBeGreaterThanOrEqual(0);
 });
});
function T(offsetMs:number){return Date.UTC(2000,0,1,12)+offsetMs;}

describe('radio clock scenario transitions (injected performance time)',()=>{
 it('has no default UT or longitude: nothing reads and nothing starts until both are applied explicitly',()=>{
  const s=INITIAL_RADIO_CLOCK_SCENARIO;expect(s).toMatchObject({utc:null,longitudeRadians:null,running:false});
  expect(readRadioClock(s,0)).toEqual({status:'unsupplied'});expect(startRadioClock(s,0).outcome).toBe('start-needs-utc');
  const ut=applyRadioClockUTC(editRadioClockDraft(s,'2000-01-01T12:00:00').scenario).scenario;
  expect(readRadioClock(ut,0)).toEqual({status:'unsupplied'});expect(startRadioClock(ut,0).outcome).toBe('start-needs-longitude');
  const both=applyCompiledRadioLongitude(ut);expect(both.outcome).toBe('longitude-applied');expect(both.scenario.run).toBe(ut.run+1);
  expect(applyCompiledRadioLongitude(both.scenario)).toMatchObject({outcome:'longitude-unchanged',changed:false});
  expect(readRadioClock(both.scenario,0)).toEqual({status:'ok',reading:radioClockReading(T(0),LON)});
 });
 it('validates drafts like parseClockUTC; invalid apply and cancel keep the applied UT',()=>{
  const s=applied('2000-01-01T12:00:00');
  for(const bad of ['','2000-02-30T00:00:00','2100-01-01T00:00:00','1899-12-31T23:59:59','2000-01-01 12:00:00','2000-01-01T12:00:00Z','2000-01-01T12:00']){
   const t=applyRadioClockUTC(editRadioClockDraft(s,bad).scenario);expect(t.outcome,bad).toBe('utc-invalid');expect(t.scenario.utc).toBe('2000-01-01T12:00:00');
  }
  const edited=editRadioClockDraft(s,'1999-01-01T00:00:00').scenario;expect(cancelRadioClockDraft(edited).scenario.draftUTC).toBe('2000-01-01T12:00:00');
  expect(editRadioClockDraft(s,'x'.repeat(K.draftMaxLength+1))).toMatchObject({outcome:'draft-too-long',changed:false});
  expect(applyRadioClockUTC(editRadioClockDraft(s,'2099-12-31T23:59:59').scenario).outcome).toBe('utc-applied');
 });
 it('start/pause fold whole elapsed milliseconds; a performance time before the anchor counts as zero',()=>{
  const s=applied('2000-01-01T12:00:00'),run=startRadioClock(s,1000.7).scenario;
  expect(run).toMatchObject({running:true,anchorPerfMS:1000.7});expect(startRadioClock(run,2000).outcome).toBe('already-running');
  expect(radioClockInstant(run,11000.6)).toBe(T(9999));expect(radioClockInstant(run,500)).toBe(T(0));
  const paused=pauseRadioClock(run,11000.7).scenario;expect(paused).toMatchObject({running:false,anchorPerfMS:null,elapsedMS:10000});
  expect(radioClockInstant(paused,99999)).toBe(T(10000));expect(pauseRadioClock(paused,0).outcome).toBe('not-running');
  const again=pauseRadioClock(startRadioClock(paused,50).scenario,30).scenario;expect(again.elapsedMS).toBe(10000);
  for(const bad of [NaN,Infinity])expect(()=>startRadioClock(s,bad)).toThrow('Invalid performance time');
 });
 it('re-applying a UT pauses, restarts elapsed time and starts a new generation (a host-clock-jump analogue)',()=>{
  const run=startRadioClock(applied('2000-01-01T12:00:00'),0).scenario;
  const next=applyRadioClockUTC(editRadioClockDraft(run,'2010-06-01T00:00:00').scenario).scenario;
  expect(next).toMatchObject({utc:'2010-06-01T00:00:00',running:false,anchorPerfMS:null,elapsedMS:0,run:run.run+1,limit:null});
 });
 it('host busy freezes scenario time and thaws without catch-up',()=>{
  const run=startRadioClock(applied('2000-01-01T12:00:00'),0).scenario;
  const frozen=freezeRadioClock(run,4000).scenario;expect(frozen).toMatchObject({running:true,anchorPerfMS:null,elapsedMS:4000});
  expect(radioClockInstant(frozen,60_000)).toBe(T(4000));expect(freezeRadioClock(frozen,70_000).changed).toBe(false);
  const thawed=thawRadioClock(frozen,60_000).scenario;expect(radioClockInstant(thawed,61_000)).toBe(T(5000));
  expect(thawRadioClock(INITIAL_RADIO_CLOCK_SCENARIO,0).changed).toBe(false);
 });
 it('stops at the range end without clamping; start and reads are refused until a UT is applied again',()=>{
  const run=startRadioClock(applied('2099-12-31T23:59:50'),0).scenario;
  expect(readRadioClock(run,9999.9)).toMatchObject({status:'ok'});
  expect(readRadioClock(run,10_000)).toEqual({status:'domain',utMs:K.maxUTMS+1});
  const stopped=stopRadioClockAtDomain(run,20_000).scenario;expect(stopped).toMatchObject({running:false,limit:'domain',elapsedMS:20_000});
  expect(readRadioClock(stopped,0)).toMatchObject({status:'domain'});expect(startRadioClock(stopped,0).outcome).toBe('start-domain');
  expect(stopRadioClockAtDomain(stopped,0).changed).toBe(false);
  expect(readRadioClock(applyRadioClockUTC(editRadioClockDraft(stopped,'2099-12-31T23:59:50').scenario).scenario,0)).toMatchObject({status:'ok'});
  // A pause past the end stops there (no reading is invented and nothing is clamped).
  const pausedPast=pauseRadioClock(run,15_000);
  expect(pausedPast).toMatchObject({outcome:'domain-stopped',changed:true,scenario:{running:false,anchorPerfMS:null,limit:'domain',elapsedMS:15_000}});
  expect(readRadioClock(pausedPast.scenario,0)).toEqual({status:'domain',utMs:K.maxUTMS+5001});
  expect(pauseRadioClock(run,9999.9)).toMatchObject({outcome:'paused',scenario:{limit:null,elapsedMS:9999}});
  expect(radioClockInstant(pauseRadioClock(run,9999.9).scenario,0)).toBe(K.maxUTMS);
  expect(pauseRadioClock(run,10_000)).toMatchObject({outcome:'domain-stopped',scenario:{limit:'domain',running:false}});
 });
 it('a host freeze past the range end stops there; the later thaw changes nothing; a freeze in range is unchanged',()=>{
  const run=startRadioClock(applied('2099-12-31T23:59:50'),0).scenario;
  const frozen=freezeRadioClock(run,15_000);
  expect(frozen).toMatchObject({outcome:'domain-stopped',scenario:{running:false,anchorPerfMS:null,limit:'domain',elapsedMS:15_000}});
  expect(thawRadioClock(frozen.scenario,20_000)).toMatchObject({outcome:'unchanged',changed:false});
  expect(readRadioClock(frozen.scenario,0)).toMatchObject({status:'domain'});
  expect(freezeRadioClock(run,9999.9)).toMatchObject({outcome:'frozen',scenario:{running:true,anchorPerfMS:null,limit:null,elapsedMS:9999}});
 });
 it('radioClockDomainWaitMS is 0 exactly when readRadioClock reports the domain, and null without a running anchored scenario',()=>{
  const fresh=applied('2099-12-31T23:59:50');
  const resumed=startRadioClock(pauseRadioClock(startRadioClock(fresh,1000.7).scenario,2000.2).scenario,3000.3).scenario;
  for(const s of [startRadioClock(fresh,1000.7).scenario,startRadioClock(fresh,0).scenario,resumed]){
   const anchor=s.anchorPerfMS!;
   for(const p of [anchor-500,anchor,anchor+0.3,anchor+8999.4,anchor+8999.7,anchor+9000.6,anchor+9999.2,anchor+9999.6,anchor+10_000,anchor+10_000.4,anchor+30_000]){
    const wait=radioClockDomainWaitMS(s,p)!;
    expect(Number.isInteger(wait)&&wait>=0,String(p)).toBe(true);
    expect(wait===0,String(p)).toBe(readRadioClock(s,p).status==='domain');
    // Firing after the wait finds the end reached, and not one millisecond earlier (from a time at or after the anchor;
    // before it the segment counts as 0, so the wait is an early bound and the route re-arms).
    if(wait>0&&p>=anchor){expect(readRadioClock(s,p+wait).status,String(p)).toBe('domain');expect(readRadioClock(s,p+wait-1).status,String(p)).toBe('ok');}
   }
  }
  const run=startRadioClock(fresh,0).scenario;
  expect(radioClockDomainWaitMS(run,0)).toBe(10_000);
  for(const s of [INITIAL_RADIO_CLOCK_SCENARIO,fresh,pauseRadioClock(run,10).scenario,freezeRadioClock(run,10).scenario,stopRadioClockAtDomain(run,20_000).scenario])
   expect(radioClockDomainWaitMS(s,50)).toBeNull();
  // From the domain start the wait exceeds the largest browser timeout (2^31 − 1 ms): the route caps it and re-arms.
  expect(radioClockDomainWaitMS(startRadioClock(applied('1900-01-01T00:00:00'),0).scenario,0)).toBeGreaterThan(2147483647);
  expect(()=>radioClockDomainWaitMS(run,NaN)).toThrow('Invalid performance time');
 });
 it('stopRadioClockPastEnd stops only a running scenario that has passed the end now',()=>{
  const run=startRadioClock(applied('2099-12-31T23:59:50'),0).scenario;
  expect(stopRadioClockPastEnd(run,9999.9)).toMatchObject({outcome:'unchanged',changed:false});
  expect(stopRadioClockPastEnd(run,9999.9).scenario).toBe(run);
  const paused=pauseRadioClock(run,5000).scenario;expect(stopRadioClockPastEnd(paused,1e9)).toMatchObject({outcome:'unchanged',changed:false});
  const stopped=stopRadioClockPastEnd(run,10_000);
  expect(stopped).toMatchObject({outcome:'domain-stopped',changed:true,scenario:{running:false,limit:'domain',elapsedMS:10_000}});
  expect(stopRadioClockPastEnd(stopped.scenario,1e9)).toMatchObject({outcome:'unchanged',changed:false});
 });
 it('a running scenario reads absolute time: a gap gives one reading at the current instant, never accumulated ticks',()=>{
  const run=startRadioClock(applied('2000-01-01T12:00:00'),0).scenario;
  const late=readRadioClock(run,3_600_000);expect(late).toEqual({status:'ok',reading:radioClockReading(T(3_600_000),LON)});
 });
 it('WEB-DATE-03: the date dialog UT keeps running, paused and frozen intent, clears a range-end stop and keeps the longitude',()=>{
  const ut=Date.UTC(2009,5,1,4,5,6),text='2009-06-01T04:05:06';
  // Running and anchored: re-anchored at the given performance time, elapsed restarts at 0.
  const run=startRadioClock(applied('2000-01-01T12:00:00'),100).scenario;
  const r=applyRadioClockDialogUT(run,ut,5000.5);
  expect(r).toMatchObject({outcome:'utc-dialog-applied',changed:true,scenario:{utc:text,draftUTC:text,running:true,anchorPerfMS:5000.5,elapsedMS:0,run:run.run+1,limit:null,longitudeRadians:LON}});
  expect(radioClockInstant(r.scenario,7000.5)).toBe(ut+2000);
  // Paused: stays paused at the new UT.
  const paused=pauseRadioClock(run,3000).scenario;
  const p=applyRadioClockDialogUT(paused,ut,9000).scenario;
  expect(p).toMatchObject({utc:text,running:false,anchorPerfMS:null,elapsedMS:0,run:paused.run+1});expect(radioClockInstant(p,99_999)).toBe(ut);
  // Frozen by a host operation: the intent stays running and unanchored until the thaw (no catch-up).
  const frozen=freezeRadioClock(run,4000).scenario;
  const f=applyRadioClockDialogUT(frozen,ut,8000).scenario;
  expect(f).toMatchObject({running:true,anchorPerfMS:null,elapsedMS:0});expect(radioClockInstant(f,60_000)).toBe(ut);
  expect(radioClockInstant(thawRadioClock(f,60_000).scenario,61_000)).toBe(ut+1000);
  // A range-end stop is cleared; no longitude is applied when none was.
  const stopped=stopRadioClockAtDomain(startRadioClock(applied('2099-12-31T23:59:50'),0).scenario,20_000).scenario;
  expect(applyRadioClockDialogUT(stopped,ut,0).scenario).toMatchObject({limit:null,running:false,utc:text});
  const noLon=applyRadioClockUTC(editRadioClockDraft(INITIAL_RADIO_CLOCK_SCENARIO,'2000-01-01T12:00:00').scenario).scenario;
  expect(applyRadioClockDialogUT(noLon,ut,0).scenario.longitudeRadians).toBeNull();
  // Before 1970 the instant is negative and still whole seconds.
  expect(applyRadioClockDialogUT(noLon,K.minUTMS,0).scenario.utc).toBe('1900-01-01T00:00:00');
  expect(applyRadioClockDialogUT(noLon,Date.UTC(2099,11,31,23,59,59),0).scenario.utc).toBe('2099-12-31T23:59:59');
  for(const bad of [ut+1,ut+0.5,K.minUTMS-1000,K.maxUTMS,K.maxUTMS+1,NaN])expect(()=>applyRadioClockDialogUT(run,bad,0),String(bad)).toThrow('Unsupported radio date dialog instant');
  expect(()=>applyRadioClockDialogUT(run,ut,NaN)).toThrow('Invalid performance time');
 });
 it('rejects shape-invalid readings',()=>{
  for(const r of [null,{},{utMs:T(0),jd:NaN,lstHours:1},{utMs:T(0),jd:1,lstHours:24.0001},{utMs:'1',jd:1,lstHours:1}])expect(isRadioClockReading(r)).toBe(false);
 });
});
